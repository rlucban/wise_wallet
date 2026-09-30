import AsyncStorage from '@react-native-async-storage/async-storage';
import { authFetch } from './apiClient';
import { API_URL } from './db';
import {
  SyncQueueItem,
  SyncEntity,
  SyncOperation,
  getProcessableItems,
  dequeueSync,
  markSyncFailed,
  updateLastSyncedAt,
  getQueueStats,
  generateQueueItemId,
  enqueueSync,
  incrementDeadLetters,
} from './syncQueue';

/** SPEC-29 D-02 — happy-path coalesce window (batches bursts, imperceptible). */
export const COALESCE_WINDOW_MS = 200;

let processingTimeout: ReturnType<typeof setTimeout> | null = null;
let isProcessing = false;

const entityEndpoints: Record<SyncEntity, string> = {
  transactions: '/transactions',
  categories: '/categories',
  dues: '/dues',
  savingsItems: '/savingsItems',
  profile: '/userProfiles',
};

interface SyncResult {
  success: boolean;
  error?: string;
}

export interface QueueStats {
  total: number;
  failed: number;
  pending: number;
}

let queueChangeListeners: (() => void)[] = [];

export function addQueueChangeListener(listener: () => void): () => void {
  queueChangeListeners.push(listener);
  return () => {
    queueChangeListeners = queueChangeListeners.filter(l => l !== listener);
  };
}

function notifyQueueChange(): void {
  queueChangeListeners.forEach(listener => listener());
}

async function processSingleItem(item: SyncQueueItem): Promise<SyncResult> {
  if (!API_URL) {
    return { success: true };
  }

  // SPEC-27 D-05 — never send one user's data under another user's session.
  // Legacy items without `userId` are treated as the active user's for one drain.
  try {
    const activeUserId = await AsyncStorage.getItem('activeUserId');
    const itemUserId = item.data && typeof item.data.userId === 'string'
      ? (item.data.userId as string)
      : null;
    if (itemUserId && activeUserId && itemUserId !== activeUserId) {
      console.warn(`[Sync] Skipping cross-user item ${item.id} (item user ${itemUserId} != active ${activeUserId}). Dequeuing.`);
      return { success: true };
    }
  } catch {
    // identity check failed — fall through and attempt the item rather than stall the queue
  }

  const endpoint = entityEndpoints[item.entity];

  try {
    const url = item.entityId
      ? `${endpoint}/${item.entityId}`
      : endpoint;

    let apiResult;

    switch (item.operation) {
      case 'create':
        apiResult = await authFetch(endpoint, {
          method: 'POST',
          body: JSON.stringify(item.data),
        });
        break;

      case 'update':
        apiResult = await authFetch(url, {
          method: 'PUT',
          body: JSON.stringify(item.data),
        });
        break;

      case 'delete':
        apiResult = await authFetch(url, {
          method: 'DELETE',
        });
        break;

      default:
        return { success: false, error: 'Unknown operation' };
    }

    if (apiResult.ok) {
      return { success: true };
    } else if (apiResult.status === 401) {
      return { success: false, error: 'Unauthorized - session expired' };
    } else if (apiResult.status === 404) {
      console.warn(`[Sync] Endpoint ${endpoint} returned 404 — server may not support ${item.entity}. Dequeuing.`);
      await incrementDeadLetters();
      return { success: true };
    } else if (apiResult.status === 400) {
      console.warn(`[Sync] ${item.entity} ${item.operation} rejected by server (400): ${apiResult.error}. Dequeuing.`);
      await incrementDeadLetters();
      return { success: true };
    } else {
      return {
        success: false,
        error: apiResult.error || `HTTP ${apiResult.status}`,
      };
    }
  } catch (error: unknown) {
    return {
      success: false,
      error: (error instanceof Error ? error.message : 'Network error'),
    };
  }
}

export async function processSyncQueue(): Promise<void> {
  if (!API_URL || isProcessing) return;

  isProcessing = true;

  try {
    let items = await getProcessableItems();

    while (items.length > 0) {
      const item = items[0];

      const result = await processSingleItem(item);

      if (result.success) {
        await dequeueSync(item.id);
        await updateLastSyncedAt();
      } else {
        await markSyncFailed(item.id, result.error || 'Unknown error');
      }

      notifyQueueChange();
      items = await getProcessableItems();
    }
  } catch (e) {
    console.error('Error processing sync queue:', e);
  } finally {
    isProcessing = false;
  }
}

export function triggerSyncProcessing(debounceMs: number = COALESCE_WINDOW_MS): void {
  if (processingTimeout) {
    clearTimeout(processingTimeout);
  }

  processingTimeout = setTimeout(() => {
    processSyncQueue();
  }, debounceMs);
}

export async function getCurrentQueueStats(): Promise<QueueStats> {
  const activeUserId = await AsyncStorage.getItem('activeUserId').catch(() => null);
  const stats = await getQueueStats(activeUserId);
  return {
    total: stats.total,
    failed: stats.failed,
    pending: stats.pending,
  };
}

export async function enqueueAndTrigger(
  entity: SyncEntity,
  operation: SyncOperation,
  entityId?: string,
  data?: Record<string, unknown>
): Promise<void> {
  if (!API_URL) return;

  const itemId = generateQueueItemId(entity, operation, entityId);

  const existingQueue = await getProcessableItems();
  const existingItem = existingQueue.find(i => i.id === itemId);

  if (existingItem && existingItem.retryCount > 0 && existingItem.lastError) {
    console.info(`[Sync] Retrying previously failed item: ${itemId}`);
  }

  await enqueueSync(entity, operation, entityId, data);

  notifyQueueChange();
  triggerSyncProcessing();
}
