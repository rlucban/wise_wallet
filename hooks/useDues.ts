import { useState, useEffect, useCallback } from "react";
import { Due } from "../types";
import { useAuthData } from "../context/AuthContext";
import { API_URL, getSetting } from "../utils/db";
import { authFetch } from "../utils/apiClient";
import { enqueueAndTrigger, processSyncQueue } from "../utils/syncProcessor";
import { useRepositories } from "../context/RepositoryContext";
import { generateUUID } from "../utils/uuid";
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
  const repos = useRepositories();

  const fetchDues = useCallback(async () => {
    setLoading(true);
    try {
      const localData = await repos.dues.getAll();
      const migrated = localData.map(migrateDue);
      setDues(migrated);

      if (API_URL && activeUserId) {
        const { ok, data: remoteData } = await authFetch(`dues`);
        if (ok && Array.isArray(remoteData)) {
            await repos.dues.upsertBulk(remoteData);
            const merged = await repos.dues.getAll();
            setDues(merged.map(migrateDue));
          }
        }

        processSyncQueue();
    } catch (error) {
      console.error("Error fetching dues:", error);
    } finally {
      setLoading(false);
    }
  }, [activeUserId, repos]);

  useEffect(() => {
    if (!activeUserId) return;
    fetchDues();
  }, [activeUserId, fetchDues]);

  const addDue = async (due: Omit<Due, "id">) => {
    try {
      const newDue = { ...due, id: generateUUID() } as Due;
      await repos.dues.upsert(newDue);
      setDues((prev) => [...prev, newDue]);

      const autoBackup = await getSetting('autoBackup');
      if (API_URL && autoBackup !== 'false') {
        const syncData = { ...newDue, userId: activeUserId };
        await enqueueAndTrigger('dues', 'create', newDue.id, syncData);
      }
    } catch (error) {
      console.error("Error adding due:", error);
      throw error;
    }
  };

  const updateDue = async (id: string, updates: Partial<Due>) => {
    try {
      const existing = await repos.dues.getById(id);
      if (existing) {
        await repos.dues.upsert({ ...existing, ...updates } as Due);
      }
      setDues((prev) => prev.map((d) => (d.id === id ? { ...d, ...updates } : d)));

      const autoBackup = await getSetting('autoBackup');
      if (API_URL && autoBackup !== 'false') {
        const syncData = { ...updates, userId: activeUserId };
        await enqueueAndTrigger('dues', 'update', id, syncData);
      }
    } catch (error) {
      console.error("Error updating due:", error);
    }
  };

  const deleteDue = async (id: string) => {
    try {
      await repos.dues.deleteById(id);
      setDues((prev) => prev.filter((d) => d.id !== id));

      const autoBackup = await getSetting('autoBackup');
      if (API_URL && autoBackup !== 'false') {
        await enqueueAndTrigger('dues', 'delete', id);
      }
    } catch (error) {
      console.error("Error deleting due:", error);
    }
  };

  return { dues, loading, refetch: fetchDues, addDue, updateDue, deleteDue };
}
