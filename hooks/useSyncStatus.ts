import { useState, useEffect, useCallback } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  getQueueStats,
  getLastSyncedAt,
  getSyncQueue,
  getDeadLetterCount,
  queueItemUserId,
  SyncQueueItem,
} from "../utils/syncQueue";
import {
  addQueueChangeListener,
  QueueStats,
} from "../utils/syncProcessor";
import { API_URL, getSetting } from "../utils/db";

export interface SyncStatus extends QueueStats {
  lastSyncedAt: number | null;
  isSyncing: boolean;
  hasFailed: boolean;
  hasPending: boolean;
  items: SyncQueueItem[];
  backupDisabled: boolean;
  deadLetters: number;
}

export function useSyncStatus() {
  const [status, setStatus] = useState<SyncStatus>({
    total: 0,
    failed: 0,
    pending: 0,
    lastSyncedAt: null,
    isSyncing: false,
    hasFailed: false,
    hasPending: false,
    items: [],
    backupDisabled: false,
    deadLetters: 0,
  });

  const refresh = useCallback(async () => {
    const autoBackup = await getSetting('autoBackup');
    const isAutoBackupEnabled = autoBackup !== 'false';

    if (!API_URL) {
      setStatus({
        total: 0,
        failed: 0,
        pending: 0,
        lastSyncedAt: null,
        isSyncing: false,
        hasFailed: false,
        hasPending: false,
        items: [],
        backupDisabled: false,
        deadLetters: 0,
      });
      return;
    }

    if (!isAutoBackupEnabled) {
      const lastSynced = await getLastSyncedAt();
      setStatus({
        total: 0,
        failed: 0,
        pending: 0,
        lastSyncedAt: lastSynced,
        isSyncing: false,
        hasFailed: false,
        hasPending: false,
        items: [],
        backupDisabled: true,
        deadLetters: await getDeadLetterCount(),
      });
      return;
    }

    const activeUserId = await AsyncStorage.getItem('activeUserId').catch(() => null);
    const [stats, lastSynced, items, deadLetters] = await Promise.all([
      getQueueStats(activeUserId),
      getLastSyncedAt(),
      getSyncQueue(),
      getDeadLetterCount(),
    ]);

    const scopedItems = activeUserId
      ? items.filter(item => {
          const owner = queueItemUserId(item);
          return owner === null || owner === activeUserId;
        })
      : items;

    setStatus({
      total: stats.total,
      failed: stats.failed,
      pending: stats.pending,
      lastSyncedAt: lastSynced,
      isSyncing: false,
      hasFailed: stats.failed > 0,
      hasPending: stats.pending > 0,
      items: scopedItems,
      backupDisabled: false,
      deadLetters,
    });
  }, []);

  useEffect(() => {
    refresh();

    const unsubscribe = addQueueChangeListener(() => {
      refresh();
    });

    return unsubscribe;
  }, [refresh]);

  return { ...status, refresh };
}

export function formatLastSynced(timestamp: number | null): string {
  if (!timestamp) return "Never";

  const now = Date.now();
  const diffMs = now - timestamp;
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSecs < 60) return "Just now";
  if (diffMins < 60) return `${diffMins} min ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${diffDays}d ago`;
}
