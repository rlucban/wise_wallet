import { useState, useEffect, useCallback } from "react";
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
import { useUserProfileData } from "../context/UserProfileContext";
import { nowTimestamp } from "../utils/storage";
import {
  resolveActivePlane,
  apiList,
  apiCreate,
  apiUpdate,
  apiDelete,
} from "../utils/apiOnly";

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

export function useSavings() {
    const [items, setItems] = useState<SavingsItem[]>([]);
    const [loading, setLoading] = useState(false);

    const { activeUserId } = useAuthData();
    const isLocal = useIsLocalAccount();
    const repos = useRepositories();
    const { showToast } = useToast();
    const { profile } = useUserProfileData();

    const fetchItems = useCallback(async () => {
        setLoading(true);
        try {
            // SPEC-34 CON-01/CON-02 — API-only plane reads live, zero repo I/O.
            const plane = await resolveActivePlane({
                platformOs: Platform.OS,
                isLocal,
                profileAutoBackup: profile?.autoBackup,
            });
            if (plane === "api-only") {
                if (API_URL && activeUserId) {
                    const { ok, data: remoteData } = await apiList("savingsItems", activeUserId);
                    if (ok && Array.isArray(remoteData)) {
                        setItems((remoteData as SavingsItem[]).map(migrateSavingsItem));
                    }
                } else {
                    setItems([]);
                }
                return;
            }

            const localData = await repos.savingsItems.getAll();
            const migrated = localData.map(migrateSavingsItem);
            const deduped = titleDeduplicate(migrated);
            setItems(deduped);

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
                                overwrittenCount++;
                            }
                        }

                        const merged = Array.from(mergedMap.values());
                        await repos.savingsItems.upsertBulk(merged);
                        setItems(merged);

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
    }, [activeUserId, repos, isLocal, showToast, profile?.autoBackup]);

    useEffect(() => {
        if (!activeUserId) return;
        fetchItems();
    }, [activeUserId, fetchItems]);

    const addItem = async (item: Omit<SavingsItem, "id">) => {
        try {
            const existing = items.find(g => g.title.toLowerCase() === item.title.toLowerCase());
            if (existing) {
                await updateItem(existing.id, item);
                return;
            }

            const newItem = { ...item, id: generateUUID() } as SavingsItem;

            // SPEC-34 CON-02 — API-only writes straight through.
            const plane = await resolveActivePlane({
                platformOs: Platform.OS,
                isLocal,
                profileAutoBackup: profile?.autoBackup,
            });
            if (plane === "api-only") {
                if (!API_URL || !activeUserId) {
                    throw new Error("Cloud unavailable — check your connection.");
                }
                const res = await apiCreate(
                    "savingsItems",
                    newItem as unknown as Record<string, unknown>,
                    activeUserId
                );
                if (!res.ok) {
                    showToast("Couldn't save to cloud. Check your connection and retry.");
                    throw new Error(`Cloud create failed (status ${res.status})`);
                }
                const created = (res.data && typeof res.data === "object"
                    ? res.data as SavingsItem
                    : newItem);
                setItems((prev) => [...prev, created]);
                return;
            }

            await repos.savingsItems.upsert(newItem);
            setItems((prev) => [...prev, newItem]);

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
            // SPEC-34 CON-02 — API-only PUT straight through.
            const plane = await resolveActivePlane({
                platformOs: Platform.OS,
                isLocal,
                profileAutoBackup: profile?.autoBackup,
            });
            if (plane === "api-only") {
                if (API_URL && activeUserId) {
                    const res = await apiUpdate(
                        "savingsItems",
                        id,
                        { ...updates, userId: activeUserId } as unknown as Record<string, unknown>,
                        activeUserId
                    );
                    if (!res.ok) {
                        showToast("Couldn't save to cloud. Check your connection and retry.");
                    }
                } else {
                    showToast("Couldn't save to cloud. Check your connection and retry.");
                }
                setItems((prev) => prev.map((g) => (g.id === id ? { ...g, ...updates } : g)));
                return;
            }

            const existing = await repos.savingsItems.getById(id);
            if (existing) {
                await repos.savingsItems.upsert({ ...existing, ...updates } as SavingsItem);
            }
            setItems((prev) => prev.map((g) => (g.id === id ? { ...g, ...updates } : g)));

            if (!isLocal) {
                const autoBackup = await getSetting('autoBackup');
                if (API_URL && autoBackup !== 'false') {
                    const syncData = { ...updates, userId: activeUserId };
                    await enqueueAndTrigger('savingsItems', 'update', id, syncData);
                }
            }
        } catch (error) {
            console.error("Error updating savings item:", error);
        }
    };

    const deleteItem = async (id: string) => {
        try {
            // SPEC-34 CON-02 — API-only DELETE straight through.
            const plane = await resolveActivePlane({
                platformOs: Platform.OS,
                isLocal,
                profileAutoBackup: profile?.autoBackup,
            });
            if (plane === "api-only") {
                if (API_URL && activeUserId) {
                    const res = await apiDelete("savingsItems", id);
                    if (!res.ok) {
                        showToast("Couldn't delete from cloud. Check your connection and retry.");
                        return;
                    }
                }
                setItems((prev) => prev.filter((g) => g.id !== id));
                return;
            }

            await repos.savingsItems.deleteById(id);
            setItems((prev) => prev.filter((g) => g.id !== id));

            if (!isLocal) {
                const autoBackup = await getSetting('autoBackup');
                if (API_URL && autoBackup !== 'false') {
                    await enqueueAndTrigger('savingsItems', 'delete', id);
                }
            }
        } catch (error) {
            console.error("Error deleting savings item:", error);
        }
    };

    return { items, loading, refetch: fetchItems, addItem, updateItem, deleteItem };
}
