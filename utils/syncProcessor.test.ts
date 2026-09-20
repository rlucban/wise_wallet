import { SyncQueueItem } from './syncQueue';

jest.mock('./db', () => ({
  get API_URL() {
    return process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';
  },
  getSetting: jest.fn(),
}));

jest.mock('./apiClient', () => ({
  authFetch: jest.fn(),
}));

import { authFetch } from './apiClient';
import { API_URL } from './db';

const mockAuthFetch = authFetch as jest.MockedFunction<typeof authFetch>;

let queue: SyncQueueItem[] = [];

jest.mock('./syncQueue', () => ({
  getProcessableItems: jest.fn(async () => queue.filter((item) => {
    if (item.nextRetryAt === undefined) return true;
    return Date.now() >= item.nextRetryAt;
  })),
  dequeueSync: jest.fn(async (id: string) => {
    queue = queue.filter((item) => item.id !== id);
  }),
  markSyncFailed: jest.fn(async (id: string, error: string) => {
    const item = queue.find((i) => i.id === id);
    if (item) {
      item.retryCount++;
      item.lastError = error;
      item.nextRetryAt = Date.now() + 1000;
    }
    return item;
  }),
  updateLastSyncedAt: jest.fn(async () => {}),
  getQueueStats: jest.fn(async () => ({
    total: queue.length,
    failed: queue.filter((i) => i.lastError !== undefined).length,
    pending: queue.length - queue.filter((i) => i.lastError !== undefined).length,
  })),
  generateQueueItemId: jest.fn(
    (entity: string, operation: string, entityId?: string) =>
      `${entity}:${operation}:${entityId || 'batch'}`
  ),
  enqueueSync: jest.fn(async (entity: string, operation: string, entityId?: string, data?: Record<string, unknown>) => {
    const item: SyncQueueItem = {
      id: `${entity}:${operation}:${entityId || 'batch'}`,
      entity: entity as SyncQueueItem['entity'],
      operation: operation as SyncQueueItem['operation'],
      entityId,
      data,
      timestamp: Date.now(),
      retryCount: 0,
      nextRetryAt: Date.now(),
    };
    const existingIndex = queue.findIndex((i) => i.id === item.id);
    if (existingIndex >= 0) {
      queue[existingIndex] = item;
    } else {
      queue.push(item);
    }
  }),
}));

import {
  processSyncQueue,
  enqueueAndTrigger,
  addQueueChangeListener,
} from './syncProcessor';

describe('syncProcessor', () => {
  beforeEach(() => {
    queue = [];
    mockAuthFetch.mockReset();
    jest.clearAllMocks();
  });

  describe('processSyncQueue', () => {
    it('dequeues item on 200 OK', async () => {
      const item: SyncQueueItem = {
        id: 'transactions:create:tx-1',
        entity: 'transactions',
        operation: 'create',
        entityId: 'tx-1',
        data: { id: 'tx-1', amount: 100 },
        timestamp: Date.now(),
        retryCount: 0,
        nextRetryAt: Date.now(),
      };
      queue.push(item);

      mockAuthFetch.mockResolvedValue({ ok: true, status: 200, data: {} });

      await processSyncQueue();

      expect(queue).toHaveLength(0);
      expect(mockAuthFetch).toHaveBeenCalledWith('/transactions', {
        method: 'POST',
        body: JSON.stringify({ id: 'tx-1', amount: 100 }),
      });
    });

    it('dequeues item on 404 — BUG: silently drops item', async () => {
      const item: SyncQueueItem = {
        id: 'transactions:create:tx-1',
        entity: 'transactions',
        operation: 'create',
        entityId: 'tx-1',
        data: { id: 'tx-1', amount: 100 },
        timestamp: Date.now(),
        retryCount: 0,
        nextRetryAt: Date.now(),
      };
      queue.push(item);

      mockAuthFetch.mockResolvedValue({
        ok: false,
        status: 404,
        error: 'Not Found',
      });

      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      await processSyncQueue();

      // BUG: item is dequeued even though it was never synced
      expect(queue).toHaveLength(0);
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('404')
      );

      consoleSpy.mockRestore();
    });

    it('dequeues item on 400 — BUG: silently drops item', async () => {
      const item: SyncQueueItem = {
        id: 'transactions:create:tx-1',
        entity: 'transactions',
        operation: 'create',
        entityId: 'tx-1',
        data: { id: 'tx-1', amount: 100 },
        timestamp: Date.now(),
        retryCount: 0,
        nextRetryAt: Date.now(),
      };
      queue.push(item);

      mockAuthFetch.mockResolvedValue({
        ok: false,
        status: 400,
        error: 'Invalid data',
      });

      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      await processSyncQueue();

      // BUG: item is dequeued even though server rejected the data
      expect(queue).toHaveLength(0);
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('400')
      );

      consoleSpy.mockRestore();
    });

    it('marks item as failed on 401 (does NOT dequeue)', async () => {
      const item: SyncQueueItem = {
        id: 'transactions:create:tx-1',
        entity: 'transactions',
        operation: 'create',
        entityId: 'tx-1',
        data: { id: 'tx-1', amount: 100 },
        timestamp: Date.now(),
        retryCount: 0,
        nextRetryAt: Date.now(),
      };
      queue.push(item);

      mockAuthFetch.mockResolvedValue({
        ok: false,
        status: 401,
        error: 'Unauthorized',
      });

      await processSyncQueue();

      // 401 correctly keeps item in queue (marked as failed)
      expect(queue).toHaveLength(1);
      expect(queue[0].retryCount).toBe(1);
      expect(queue[0].lastError).toBe('Unauthorized - session expired');
    });

    it('marks item as failed on 500 (does NOT dequeue)', async () => {
      const item: SyncQueueItem = {
        id: 'transactions:create:tx-1',
        entity: 'transactions',
        operation: 'create',
        entityId: 'tx-1',
        data: { id: 'tx-1', amount: 100 },
        timestamp: Date.now(),
        retryCount: 0,
        nextRetryAt: Date.now(),
      };
      queue.push(item);

      mockAuthFetch.mockResolvedValue({
        ok: false,
        status: 500,
        error: 'Internal Server Error',
      });

      await processSyncQueue();

      // 500 correctly keeps item in queue (marked as failed)
      expect(queue).toHaveLength(1);
      expect(queue[0].retryCount).toBe(1);
      expect(queue[0].lastError).toBe('Internal Server Error');
    });

    it('marks item as failed on network error (does NOT dequeue)', async () => {
      const item: SyncQueueItem = {
        id: 'transactions:create:tx-1',
        entity: 'transactions',
        operation: 'create',
        entityId: 'tx-1',
        data: { id: 'tx-1', amount: 100 },
        timestamp: Date.now(),
        retryCount: 0,
        nextRetryAt: Date.now(),
      };
      queue.push(item);

      mockAuthFetch.mockRejectedValue(new Error('Network request failed'));

      await processSyncQueue();

      expect(queue).toHaveLength(1);
      expect(queue[0].retryCount).toBe(1);
      expect(queue[0].lastError).toBe('Network request failed');
    });

    it('processes multiple items sequentially', async () => {
      queue.push(
        {
          id: 'transactions:create:tx-1',
          entity: 'transactions',
          operation: 'create',
          entityId: 'tx-1',
          data: { amount: 100 },
          timestamp: Date.now(),
          retryCount: 0,
          nextRetryAt: Date.now(),
        },
        {
          id: 'categories:create:cat-1',
          entity: 'categories',
          operation: 'create',
          entityId: 'cat-1',
          data: { name: 'Food' },
          timestamp: Date.now(),
          retryCount: 0,
          nextRetryAt: Date.now(),
        }
      );

      mockAuthFetch.mockResolvedValue({ ok: true, status: 200, data: {} });

      await processSyncQueue();

      expect(queue).toHaveLength(0);
      expect(mockAuthFetch).toHaveBeenCalledTimes(2);
    });

    it('continues processing after a failure, marks failed item for retry', async () => {
      queue.push(
        {
          id: 'transactions:create:tx-1',
          entity: 'transactions',
          operation: 'create',
          entityId: 'tx-1',
          data: { amount: 100 },
          timestamp: Date.now(),
          retryCount: 0,
          nextRetryAt: Date.now(),
        },
        {
          id: 'categories:create:cat-1',
          entity: 'categories',
          operation: 'create',
          entityId: 'cat-1',
          data: { name: 'Food' },
          timestamp: Date.now(),
          retryCount: 0,
          nextRetryAt: Date.now(),
        }
      );

      mockAuthFetch
        .mockResolvedValueOnce({ ok: false, status: 500, error: 'Server Error' })
        .mockResolvedValueOnce({ ok: true, status: 200, data: {} });

      await processSyncQueue();

      // Both items processed: first failed (kept for retry), second succeeded (dequeued)
      expect(mockAuthFetch).toHaveBeenCalledTimes(2);
      expect(queue).toHaveLength(1);
      expect(queue[0].id).toBe('transactions:create:tx-1');
      expect(queue[0].retryCount).toBe(1);
      expect(queue[0].lastError).toBe('Server Error');
    });
  });

  describe('enqueueAndTrigger', () => {
    it('does nothing when API_URL is not set', async () => {
      const original = process.env.EXPO_PUBLIC_API_URL;
      process.env.EXPO_PUBLIC_API_URL = '';

      // Re-mock API_URL to be empty
      jest.resetModules();
      jest.mock('./db', () => ({
        get API_URL() {
          return '';
        },
        getSetting: jest.fn(),
      }));

      const { enqueueAndTrigger: freshEnqueue } = require('./syncProcessor');
      await freshEnqueue('transactions', 'create', 'tx-1', { amount: 100 });

      expect(queue).toHaveLength(0);

      process.env.EXPO_PUBLIC_API_URL = original;
    });

    it('enqueues item and triggers processing', async () => {
      mockAuthFetch.mockResolvedValue({ ok: true, status: 200, data: {} });

      await enqueueAndTrigger('transactions', 'create', 'tx-1', {
        amount: 100,
      });

      expect(queue).toHaveLength(1);
      expect(queue[0].entity).toBe('transactions');
      expect(queue[0].operation).toBe('create');
      expect(queue[0].entityId).toBe('tx-1');
      expect(queue[0].data).toEqual({ amount: 100 });
    });
  });

  describe('queue change listeners', () => {
    it('notifies listeners on queue changes', async () => {
      const listener = jest.fn();
      const unsubscribe = addQueueChangeListener(listener);

      const item: SyncQueueItem = {
        id: 'transactions:create:tx-1',
        entity: 'transactions',
        operation: 'create',
        entityId: 'tx-1',
        data: { amount: 100 },
        timestamp: Date.now(),
        retryCount: 0,
        nextRetryAt: Date.now(),
      };
      queue.push(item);

      mockAuthFetch.mockResolvedValue({ ok: true, status: 200, data: {} });

      await processSyncQueue();

      expect(listener).toHaveBeenCalled();
      unsubscribe();
    });
  });
});
