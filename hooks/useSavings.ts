import { useState, useEffect, useCallback, useRef } from "react";
import { Platform } from "react-native";
import { SavingsItem } from "../types";
import { useAuthData } from "../context/AuthContext";
import { API_URL, getSetting } from "../utils/db";
import { authFetch } from "../utils/apiClient";
import { enqueueAndTrigger, processSyncQueue } from "../utils/syncProcessor";
import { useRepositories } from "../context/RepositoryContext";
import { useIsLocalAccount } from "../utils/authMode";
import { generateUUID } from "../utils/uuid";
import { useToast } from "../context/ToastContext";
import { nowTimestamp } from "../utils/storage";

function migrateSavingsItem(item: SavingsItem): SavingsItem {
  const record = item as unknown as Record<string, unknown>;
  if (record.targetAmount !== undefined && record.balance === undefined) {
    return {
      id: item.id,
      title: item.title,
      balance: (record.currentAmount as number) || 0,
      target_amount: (record.targetAmount as number) ?? item.target_amount,
      icon: item.icon,
      color: item.color,
      updatedAt: nowTimestamp(),
    };
  }
  return item;
}

function titleDeduplicate(items: SavingsItem[]): SavingsItem[] {
  const seen = new Set<string>();
  return items.filter((g) => {
    const key = g.title.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// --- D-01 SPEC-60: module-level in-memory cache (survives navigation, cleared on user change) ---
let _savingsCache: { userId: string; items: SavingsItem[] } | null = null;

// --- D-75-01 SPEC-75: module notifier — mounted instances re-seed on shared cache writes ---
const _savingsCacheListeners = new Set<() => void>();
function notifySavingsCacheChanged(): void {
    _savingsCacheListeners.forEach((l) => l());
}

export function useSavings() {
    const [items, setItems] = useState<SavingsItem[]>([]);
    const [loading, setLoading] = useState(false);

    const itemsRef = useRef<SavingsItem[]>([]);
    useEffect(() => {
        itemsRef.current = items;
    }, [items]);

    const { activeUserId } = useAuthData();
    const isLocal = useIsLocalAccount();
    const repos = useRepositories();
    const { showToast } = useToast();

    // Seed state from module cache immediately (avoids blank flash on re-mount)
    useEffect(() => {
        if (activeUserId && _savingsCache?.userId === activeUserId && items.length === 0) {
            setItems(_savingsCache.items);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeUserId]);

    // D-75-01 SPEC-75 CON-01/CON-03: subscribed instances re-seed from the shared cache on notify
    useEffect(() => {
        if (!activeUserId) return;
        const listener = () => {
            if (_savingsCache?.userId === activeUserId) {
                itemsRef.current = _savingsCache.items;
                setItems(_savingsCache.items);
            }
        };
        _savingsCacheListeners.add(listener);
        return () => {
            _savingsCacheListeners.delete(listener);
        };
    }, [activeUserId]);

    const fetchItems = useCallback(async () => {

        setLoading(true);
        try {
            if (Platform.OS === "web") {
                // SPEC-36 CON-W-03 (v1.2): web loads API-direct — no local reads, no merge, no queue.
                if (API_URL && activeUserId) {
                    const { ok, data: remoteData } = await authFetch<SavingsItem[]>(`savingsItems?userId=${activeUserId}`);
                    if (ok && Array.isArray(remoteData)) {
                        // SPEC-73 CON-05: field-union guard — preserve local isArchived / target_amount
                        // a pre-migration server omits, so archives and goals survive the refetch.
                        const localMap = new Map(itemsRef.current.map((g) => [g.id, g]));
                        const guarded = remoteData.map((remote) => {
                            const local = localMap.get(remote.id);
                            if (!local) return remote;
                            return {
                                ...remote,
                                isArchived:
                                    remote.isArchived === undefined ? local.isArchived : remote.isArchived,
                                target_amount:
                                    remote.target_amount === undefined ? local.target_amount : remote.target_amount,
                            };
                        });
                        setItems(guarded);
                        _savingsCache = { userId: activeUserId, items: guarded }; // D-01 SPEC-60
                    }
                }
                return;
            }
            const localData = await repos.savingsItems.getAll();
            const migrated = localData.map(migrateSavingsItem);
            const deduped = titleDeduplicate(migrated);
            setItems(deduped);
            _savingsCache = { userId: activeUserId!, items: deduped }; // D-01 SPEC-60 (local fast path)

            if (!isLocal && API_URL && activeUserId) {
                const { ok, data: remoteData } = await authFetch<SavingsItem[]>(`savingsItems?userId=${activeUserId}`);
                if (ok && Array.isArray(remoteData)) {
                        const remoteTitleMap = new Map(remoteData.map(g => [g.title.toLowerCase(), g]));

                        const mergedMap = new Map<string, SavingsItem>();
                        let overwrittenCount = 0;

                        for (const remoteItem of remoteData) {
                            mergedMap.set(remoteItem.id, remoteItem);
                        }

                        for (const localItem of deduped) {
                            const remoteItem = mergedMap.get(localItem.id);
                            if (!remoteItem && !remoteTitleMap.has(localItem.title.toLowerCase())) {
                                mergedMap.set(localItem.id, localItem);
                                await enqueueAndTrigger('savingsItems', 'create', localItem.id, localItem as unknown as Record<string, unknown>);
                            } else if (remoteItem && (localItem.updatedAt || 0) > (remoteItem.updatedAt || 0)) {
                                mergedMap.set(localItem.id, localItem);
                                await enqueueAndTrigger('savingsItems', 'update', localItem.id, localItem as unknown as Record<string, unknown>);
                            } else if (remoteItem && (remoteItem.updatedAt || 0) > (localItem.updatedAt || 0)) {
                                // SPEC-73 CON-05: field-union — preserve local fields a
                                // pre-migration server omits instead of letting remote-wins revert them.
                                mergedMap.set(localItem.id, {
                                    ...remoteItem,
                                    isArchived:
                                        remoteItem.isArchived === undefined ? localItem.isArchived : remoteItem.isArchived,
                                    target_amount:
                                        remoteItem.target_amount === undefined ? localItem.target_amount : remoteItem.target_amount,
                                });
                                overwrittenCount++;
                            }
                        }

                        const merged = Array.from(mergedMap.values());
                        await repos.savingsItems.upsertBulk(merged);
                        setItems(merged);
                        _savingsCache = { userId: activeUserId, items: merged }; // D-01 SPEC-60 (merged path)

                        if (overwrittenCount > 0) {
                            showToast(`${overwrittenCount} record(s) updated from another device.`);
                        }
                    }
                }

                processSyncQueue();
        } catch (error) {
            console.error("Error fetching savings items:", error);
        } finally {
            setLoading(false);
        }
    }, [activeUserId, repos, isLocal, showToast]);

    useEffect(() => {
        if (!activeUserId) {
            _savingsCache = null; // D-01 SPEC-60: clear cache on logout/user change
            return;
        }
        fetchItems();
    }, [activeUserId, fetchItems]);

    const addItem = async (item: Omit<SavingsItem, "id">) => {
        try {
            const existing = items.find(g => g.title.toLowerCase() === item.title.toLowerCase());
            if (existing) {
                await updateItem(existing.id, item);
                return;
            }

            if (Platform.OS === "web") {
                // SPEC-36 CON-W-03 (v1.2): web writes API-direct — no local repo, no flag gate, no queue.
                const newItem = { ...item, id: generateUUID() } as SavingsItem;
                const { ok } = await authFetch("savingsItems", {
                    method: "POST",
                    body: JSON.stringify({ ...newItem, userId: activeUserId }),
                });
                if (!ok) {
                    throw new Error("Failed to save allocation. Please check your connection.");
                }
                setItems((prev) => [...prev, newItem]);
                // SPEC-74 CON-01: write through so the next mount seeds the new item.
                itemsRef.current = [...itemsRef.current, newItem];
                if (activeUserId) _savingsCache = { userId: activeUserId, items: itemsRef.current };
                // D-75-01 SPEC-75 CON-01: broadcast so mounted instances re-seed immediately.
                notifySavingsCacheChanged();
                return;
            }
            const newItem = { ...item, id: generateUUID() } as SavingsItem;

            await repos.savingsItems.upsert(newItem);
            setItems((prev) => [...prev, newItem]);
            // SPEC-74 CON-01: write through so the next mount seeds the new item.
            itemsRef.current = [...itemsRef.current, newItem];
            if (activeUserId) _savingsCache = { userId: activeUserId, items: itemsRef.current };
            // D-75-01 SPEC-75 CON-01: broadcast so mounted instances re-seed immediately.
            notifySavingsCacheChanged();

            if (!isLocal) {
                const autoBackup = await getSetting('autoBackup');
                if (API_URL && autoBackup !== 'false') {
                    const syncData = { ...newItem, userId: activeUserId };
                    await enqueueAndTrigger('savingsItems', 'create', newItem.id, syncData);
                }
            }
        } catch (error) {
            console.error("Error adding savings item:", error);
            throw error;
        }
    };

    const updateItem = async (id: string, updates: Partial<SavingsItem>) => {
        try {
            if (Platform.OS === "web") {
                // SPEC-36 CON-W-03 (v1.2): web writes API-direct.
                // SPEC-73 CON-04: full-record body so isArchived / target_amount survive the server.
                const current = itemsRef.current.find((g) => g.id === id);
                const { ok } = await authFetch(`savingsItems/${id}`, {
                    method: "PUT",
                    body: JSON.stringify({
                        ...(current as SavingsItem),
                        ...updates,
                        updatedAt: current?.updatedAt || nowTimestamp(),
                        userId: activeUserId,
                    }),
                });
                if (!ok) {
                    throw new Error("Failed to save changes. Please check your connection.");
                }
                setItems((prev) => prev.map((g) => (g.id === id ? { ...g, ...updates } : g)));
                // SPEC-74 CON-01: write through so the next mount seeds the update.
                itemsRef.current = itemsRef.current.map((g) => (g.id === id ? { ...g, ...updates } : g));
                if (activeUserId) _savingsCache = { userId: activeUserId, items: itemsRef.current };
                // D-75-01 SPEC-75 CON-01: broadcast so mounted instances re-seed immediately.
                notifySavingsCacheChanged();
                return;
            }
            const existing = await repos.savingsItems.getById(id);
            if (existing) {
                await repos.savingsItems.upsert({ ...existing, ...updates } as SavingsItem);
            }
            setItems((prev) => prev.map((g) => (g.id === id ? { ...g, ...updates } : g)));
            // SPEC-74 CON-01: write through so the next mount seeds the update.
            itemsRef.current = itemsRef.current.map((g) => (g.id === id ? { ...g, ...updates } : g));
            if (activeUserId) _savingsCache = { userId: activeUserId, items: itemsRef.current };
            // D-75-01 SPEC-75 CON-01: broadcast so mounted instances re-seed immediately.
            notifySavingsCacheChanged();

            if (!isLocal) {
                const autoBackup = await getSetting('autoBackup');
                if (API_URL && autoBackup !== 'false') {
                    // SPEC-73 CON-04: full-record sync payload (never partial { ...updates })
                    // so isArchived / target_amount / updatedAt survive the server round-trip.
                    const syncData = {
                        ...(existing as SavingsItem),
                        ...updates,
                        updatedAt: existing?.updatedAt || nowTimestamp(),
                        userId: activeUserId,
                    } as SavingsItem;
                    await enqueueAndTrigger('savingsItems', 'update', id, syncData as unknown as Record<string, unknown>);
                }
            }
        } catch (error) {
            console.error("Error updating savings item:", error);
            throw error;
        }
    };

    const deleteItem = async (id: string) => {
        try {
            if (Platform.OS === "web") {
                // SPEC-36 CON-W-03 (v1.2): web writes API-direct.
                const { ok } = await authFetch(`savingsItems/${id}`, { method: "DELETE" });
                if (!ok) {
                    throw new Error("Failed to delete allocation. Please check your connection.");
                }
                setItems((prev) => prev.filter((g) => g.id !== id));
                // SPEC-74 CON-01: write through so the next mount seeds the deletion.
                itemsRef.current = itemsRef.current.filter((g) => g.id !== id);
                if (activeUserId) _savingsCache = { userId: activeUserId, items: itemsRef.current };
                // D-75-01 SPEC-75 CON-01: broadcast so mounted instances re-seed immediately.
                notifySavingsCacheChanged();
                return;
            }
            await repos.savingsItems.deleteById(id);
            setItems((prev) => prev.filter((g) => g.id !== id));
            // SPEC-74 CON-01: write through so the next mount seeds the deletion.
            itemsRef.current = itemsRef.current.filter((g) => g.id !== id);
            if (activeUserId) _savingsCache = { userId: activeUserId, items: itemsRef.current };
            // D-75-01 SPEC-75 CON-01: broadcast so mounted instances re-seed immediately.
            notifySavingsCacheChanged();

            if (!isLocal) {
                const autoBackup = await getSetting('autoBackup');
                if (API_URL && autoBackup !== 'false') {
                    await enqueueAndTrigger('savingsItems', 'delete', id);
                }
            }
        } catch (error) {
            console.error("Error deleting savings item:", error);
            throw error;
        }
    };

    return { items, loading, refetch: fetchItems, addItem, updateItem, deleteItem };
}
