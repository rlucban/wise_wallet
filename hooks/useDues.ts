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
import { useUserProfileData } from "../context/UserProfileContext";
import { nowTimestamp } from "../utils/storage";
import {
  resolveActivePlane,
  apiList,
  apiCreate,
  apiUpdate,
  apiDelete,
} from "../utils/apiOnly";

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

export function useDues() {
  const [dues, setDues] = useState<Due[]>([]);
  const [loading, setLoading] = useState(false);
    const { activeUserId } = useAuthData();
    const isLocal = useIsLocalAccount();
    const repos = useRepositories();
    const { showToast } = useToast();
    const { profile } = useUserProfileData();

    const fetchDues = useCallback(async () => {
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
          const { ok, data: remoteData } = await apiList("dues", activeUserId);
          if (ok && Array.isArray(remoteData)) {
            setDues((remoteData as Due[]).map(migrateDue));
          }
        } else {
          setDues([]);
        }
        return;
      }

      const localData = await repos.dues.getAll();
      const migrated = localData.map(migrateDue);
      setDues(migrated);

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
            setDues(merged.map(migrateDue));
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
  }, [activeUserId, repos, isLocal, showToast, profile?.autoBackup]);

  useEffect(() => {
    if (!activeUserId) return;
    fetchDues();
  }, [activeUserId, fetchDues]);

    const addDue = async (due: Omit<Due, "id">) => {
    try {
      const newDue = { ...due, id: generateUUID() } as Due;
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
          "dues",
          newDue as unknown as Record<string, unknown>,
          activeUserId
        );
        if (!res.ok) {
          showToast("Couldn't save to cloud. Check your connection and retry.");
          throw new Error(`Cloud create failed (status ${res.status})`);
        }
        const created = (res.data && typeof res.data === "object"
          ? res.data as Due
          : newDue);
        setDues((prev) => [...prev, created]);
        return;
      }

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
      // SPEC-34 CON-02 — API-only PUT straight through.
      const plane = await resolveActivePlane({
        platformOs: Platform.OS,
        isLocal,
        profileAutoBackup: profile?.autoBackup,
      });
      if (plane === "api-only") {
        if (API_URL && activeUserId) {
          const res = await apiUpdate(
            "dues",
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
      // SPEC-34 CON-02 — API-only DELETE straight through.
      const plane = await resolveActivePlane({
        platformOs: Platform.OS,
        isLocal,
        profileAutoBackup: profile?.autoBackup,
      });
      if (plane === "api-only") {
        if (API_URL && activeUserId) {
          const res = await apiDelete("dues", id);
          if (!res.ok) {
            showToast("Couldn't delete from cloud. Check your connection and retry.");
            return;
          }
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
