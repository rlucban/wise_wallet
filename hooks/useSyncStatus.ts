import { useState, useEffect, useCallback } from "react";
import {
  getQueueStats,
  getLastSyncedAt,
  getSyncQueue,
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
      });
      return;
    }

    const [stats, lastSynced, items] = await Promise.all([
      getQueueStats(),
      getLastSyncedAt(),
      getSyncQueue(),
    ]);

    setStatus({
      total: stats.total,
      failed: stats.failed,
      pending: stats.pending,
      lastSyncedAt: lastSynced,
      isSyncing: false,
      hasFailed: stats.failed > 0,
      hasPending: stats.pending > 0,
      items,
      backupDisabled: false,
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
