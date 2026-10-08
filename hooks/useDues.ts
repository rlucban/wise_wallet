import { useState, useEffect, useCallback } from "react";
import { Platform } from "react-native";
import { Due } from "../types";
import { useAuthData } from "../context/AuthContext";
import { API_URL, getSetting } from "../utils/db";
import { authFetch } from "../utils/apiClient";
import { enqueueAndTrigger, processSyncQueue } from "../utils/syncProcessor";
import { useRepositories } from "../context/RepositoryContext";
import { useIsLocalAccount } from "../utils/authMode";
import { generateUUID } from "../utils/uuid";
import { useToast } from "../context/ToastContext";
import { nowTimestamp } from "../utils/storage";

function migrateDue(item: Due): Due {
  const record = item as unknown as Record<string, unknown>;
  if (record.isRecurring !== undefined && record.frequency === undefined) {
    return {
      id: item.id,
      title: item.title,
      amount: item.amount || 0,
      date: item.date,
      frequency: record.isRecurring ? "monthly" : "once",
      type: item.type || "expense",
      categoryId: item.categoryId,
      categoryName: item.categoryName,
      autoProcess: false,
      completed: item.completed || false,
      updatedAt: nowTimestamp(),
    };
  }
  return item;
}

// --- D-02 SPEC-60: module-level in-memory cache (survives navigation, cleared on user change) ---
let _duesCache: { userId: string; dues: Due[] } | null = null;

export function useDues() {
  const [dues, setDues] = useState<Due[]>([]);
  const [loading, setLoading] = useState(false);
  const { activeUserId } = useAuthData();
  const isLocal = useIsLocalAccount();
  const repos = useRepositories();
  const { showToast } = useToast();

  // Seed state from module cache immediately (avoids blank flash on re-mount)
  useEffect(() => {
    if (activeUserId && _duesCache?.userId === activeUserId && dues.length === 0) {
      setDues(_duesCache.dues);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeUserId]);

  const fetchDues = useCallback(async (opts: { skipCache?: boolean } = {}) => {
    setLoading(true);
    try {
      if (Platform.OS === "web") {
        // SPEC-36 CON-W-03 (v1.2): web loads API-direct — no local reads, no merge, no queue.
        if (API_URL && activeUserId) {
          const { ok, data: remoteData } = await authFetch(`dues`, {}, opts);
          if (ok && Array.isArray(remoteData)) {
            setDues(remoteData);
            _duesCache = { userId: activeUserId, dues: remoteData as Due[] }; // D-02 SPEC-60
          }
        }
        return;
      }
      const localData = await repos.dues.getAll();
      const migrated = localData.map(migrateDue);
      setDues(migrated);
      _duesCache = { userId: activeUserId!, dues: migrated }; // D-02 SPEC-60 (local fast path)

      if (!isLocal && API_URL && activeUserId) {
        const { ok, data: remoteData } = await authFetch(`dues`);
        if (ok && Array.isArray(remoteData)) {
            let overwrittenCount = 0;
            for (const remoteDue of remoteData) {
              const localDue = migrated.find(d => d.id === remoteDue.id);
              if (localDue && (localDue.updatedAt || 0) > (remoteDue.updatedAt || 0)) {
                await repos.dues.upsert(localDue);
              } else if (localDue && (remoteDue.updatedAt || 0) > (localDue.updatedAt || 0)) {
                overwrittenCount++;
              } else {
                await repos.dues.upsert(remoteDue);
              }
            }
            const merged = await repos.dues.getAll();
            const mergedMigrated = merged.map(migrateDue);
            setDues(mergedMigrated);
            _duesCache = { userId: activeUserId, dues: mergedMigrated }; // D-02 SPEC-60 (merged path)
            if (overwrittenCount > 0) {
              showToast(`${overwrittenCount} record(s) updated from another device.`);
            }
          }
        }

        processSyncQueue();
    } catch (error) {
      console.error("Error fetching dues:", error);
    } finally {
      setLoading(false);
    }
  }, [activeUserId, repos, isLocal, showToast]);

  useEffect(() => {
    if (!activeUserId) {
      _duesCache = null; // D-02 SPEC-60: clear cache on logout/user change
      return;
    }
    fetchDues();
  }, [activeUserId, fetchDues]);

  const addDue = async (due: Omit<Due, "id">) => {
    try {
      if (Platform.OS === "web") {
        // SPEC-36 CON-W-03 (v1.2): web writes API-direct — no local repo, no flag gate, no queue.
        const newDue = { ...due, id: generateUUID() } as Due;
        const { ok } = await authFetch("dues", {
          method: "POST",
          body: JSON.stringify({ ...newDue, userId: activeUserId }),
        });
        if (!ok) {
          throw new Error("Failed to save due. Please check your connection.");
        }
        setDues((prev) => [...prev, newDue]);
        return;
      }
      const newDue = { ...due, id: generateUUID() } as Due;
      await repos.dues.upsert(newDue);
      setDues((prev) => [...prev, newDue]);

      if (!isLocal) {
        const autoBackup = await getSetting('autoBackup');
        if (API_URL && autoBackup !== 'false') {
          const syncData = { ...newDue, userId: activeUserId };
          await enqueueAndTrigger('dues', 'create', newDue.id, syncData);
        }
      }
    } catch (error) {
      console.error("Error adding due:", error);
      throw error;
    }
  };

  const updateDue = async (id: string, updates: Partial<Due>) => {
    try {
      if (Platform.OS === "web") {
        // SPEC-36 CON-W-03 (v1.2): web writes API-direct.
        const { ok } = await authFetch(`dues/${id}`, {
          method: "PUT",
          body: JSON.stringify({ ...updates, userId: activeUserId }),
        });
        if (!ok) {
          throw new Error("Failed to save changes. Please check your connection.");
        }
        setDues((prev) => prev.map((d) => (d.id === id ? { ...d, ...updates } : d)));
        return;
      }
      const existing = await repos.dues.getById(id);
      if (existing) {
        await repos.dues.upsert({ ...existing, ...updates } as Due);
      }
      setDues((prev) => prev.map((d) => (d.id === id ? { ...d, ...updates } : d)));

      if (!isLocal) {
        const autoBackup = await getSetting('autoBackup');
        if (API_URL && autoBackup !== 'false') {
          const syncData = { ...updates, userId: activeUserId };
          await enqueueAndTrigger('dues', 'update', id, syncData);
        }
      }
    } catch (error) {
      console.error("Error updating due:", error);
    }
  };

  const deleteDue = async (id: string) => {
    try {
      if (Platform.OS === "web") {
        // SPEC-36 CON-W-03 (v1.2): web writes API-direct.
        const { ok } = await authFetch(`dues/${id}`, { method: "DELETE" });
        if (!ok) {
          throw new Error("Failed to delete due. Please check your connection.");
        }
        setDues((prev) => prev.filter((d) => d.id !== id));
        return;
      }
      await repos.dues.deleteById(id);
      setDues((prev) => prev.filter((d) => d.id !== id));

      if (!isLocal) {
        const autoBackup = await getSetting('autoBackup');
        if (API_URL && autoBackup !== 'false') {
          await enqueueAndTrigger('dues', 'delete', id);
        }
      }
    } catch (error) {
      console.error("Error deleting due:", error);
    }
  };

  return { dues, loading, refetch: fetchDues, addDue, updateDue, deleteDue };
}
