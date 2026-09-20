import AsyncStorage from '@react-native-async-storage/async-storage';

export type SyncEntity = 'transactions' | 'categories' | 'dues' | 'savingsItems' | 'profile';
export type SyncOperation = 'create' | 'update' | 'delete';

export interface SyncQueueItem {
  id: string;
  entity: SyncEntity;
  operation: SyncOperation;
  entityId?: string;
  data?: Record<string, unknown>;
  timestamp: number;
  retryCount: number;
  lastError?: string;
  nextRetryAt?: number;
}

const QUEUE_KEY = 'sync_queue';
const LAST_SYNCED_KEY = 'last_synced_at';

export async function getSyncQueue(): Promise<SyncQueueItem[]> {
  try {
    const raw = await AsyncStorage.getItem(QUEUE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.error('Error reading sync queue:', e);
    return [];
  }
}

export async function saveSyncQueue(queue: SyncQueueItem[]): Promise<void> {
  try {
    await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  } catch (e) {
    console.error('Error saving sync queue:', e);
  }
}

export function generateQueueItemId(
  entity: SyncEntity,
  operation: SyncOperation,
  entityId?: string
): string {
  return `${entity}:${operation}:${entityId || 'batch'}`;
}

export function getRetryDelay(retryCount: number): number {
  const base = Math.min(Math.pow(2, retryCount) * 1000, 32000);
  return Math.random() * base;
}

export async function enqueueSync(
  entity: SyncEntity,
  operation: SyncOperation,
  entityId?: string,
  data?: Record<string, unknown>
): Promise<void> {
  const queue = await getSyncQueue();
  const itemId = generateQueueItemId(entity, operation, entityId);

  const existingIndex = queue.findIndex(item => item.id === itemId);
  const now = Date.now();

  const newItem: SyncQueueItem = {
    id: itemId,
    entity,
    operation,
    entityId,
    data,
    timestamp: now,
    retryCount: 0,
    nextRetryAt: now,
  };

  if (existingIndex >= 0) {
    queue[existingIndex] = newItem;
  } else {
    queue.push(newItem);
  }

  await saveSyncQueue(queue);
}

export async function dequeueSync(itemId: string): Promise<void> {
  const queue = await getSyncQueue();
  const filtered = queue.filter(item => item.id !== itemId);
  await saveSyncQueue(filtered);
}

export async function markSyncFailed(
  itemId: string,
  error: string
): Promise<SyncQueueItem | undefined> {
  const queue = await getSyncQueue();
  const item = queue.find(i => i.id === itemId);

  if (item) {
    item.retryCount++;
    item.lastError = error;
    item.nextRetryAt = Date.now() + getRetryDelay(item.retryCount);
    await saveSyncQueue(queue);
    return item;
  }

  return undefined;
}

export async function getProcessableItems(): Promise<SyncQueueItem[]> {
  const queue = await getSyncQueue();
  const now = Date.now();

  return queue.filter(item => {
    if (item.nextRetryAt === undefined) return true;
    return now >= item.nextRetryAt;
  });
}

export async function updateLastSyncedAt(): Promise<void> {
  try {
    await AsyncStorage.setItem(LAST_SYNCED_KEY, Date.now().toString());
  } catch (e) {
    console.error('Error updating last synced at:', e);
  }
}

export async function getLastSyncedAt(): Promise<number | null> {
  try {
    const raw = await AsyncStorage.getItem(LAST_SYNCED_KEY);
    return raw ? parseInt(raw, 10) : null;
  } catch (e) {
    console.error('Error reading last synced at:', e);
    return null;
  }
}

export async function getQueueStats(): Promise<{
  total: number;
  failed: number;
  pending: number;
  items: SyncQueueItem[];
}> {
  const queue = await getSyncQueue();
  const failed = queue.filter(item => item.lastError !== undefined).length;
  const pending = queue.length - failed;

  return {
    total: queue.length,
    failed,
    pending,
    items: queue,
  };
}

export async function clearSyncQueue(): Promise<void> {
  try {
    await AsyncStorage.removeItem(QUEUE_KEY);
  } catch (e) {
    console.error('Error clearing sync queue:', e);
  }
}
