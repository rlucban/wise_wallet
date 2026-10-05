import { SyncQueueItem } from './syncQueue';
import { Platform } from 'react-native';

type PlatformOS = 'android' | 'ios' | 'web';

const PLATFORMS: PlatformOS[] = ['android', 'ios', 'web'];

let mockOS: PlatformOS = 'ios';

jest.mock('./db', () => ({
  get API_URL() {
    return process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';
  },
  getSetting: jest.fn(),
}));

jest.mock('./apiClient', () => ({
  authFetch: jest.fn(),
}));

jest.mock('react-native', () => ({
  Platform: {
    get OS() {
      return mockOS;
    },
  },
}));

import { authFetch } from './apiClient';

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

// SPEC-41 CON-07: the verbose flag is an import-time const, so each env case
// reloads the module with a hermetic db mock (exact value, no env consulted,
// no cross-test leakage through process.env).
function loadProcessorWithEnv(apiUrl: string | undefined) {
  jest.resetModules();
  jest.doMock('./db', () => ({
    get API_URL() {
      return apiUrl;
    },
    getSetting: jest.fn(),
  }));
  return require('./syncProcessor');
}

function resolveWithStatus(status: number, error?: string) {
  const { authFetch: freshFetch } = require('./apiClient');
  (freshFetch as jest.MockedFunction<typeof authFetch>).mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    ...(error !== undefined ? { error } : {}),
    data: {},
  });
}

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

  describe.each(PLATFORMS)('sync 400/404 handling on %s', (platform) => {
      beforeEach(() => {
        mockOS = platform;
      });

      it('runs against the mocked platform', () => {
        expect(Platform.OS).toBe(platform);
      });

      // ACC-01
      it('400 with localhost API_URL logs error with payload detail and dequeues', async () => {
        queue.push({
          id: 'transactions:update:tx-1',
          entity: 'transactions',
          operation: 'update',
          entityId: 'tx-1',
          data: { id: 'tx-1', note: 'edited' },
          timestamp: Date.now(),
          retryCount: 0,
          nextRetryAt: Date.now(),
        });
        const { processSyncQueue: freshProcess } = loadProcessorWithEnv('http://localhost:3000');
        resolveWithStatus(400, 'HTTP 400');
        const errorSpy = jest.spyOn(console, 'error').mockImplementation();

        await freshProcess();

        expect(queue).toHaveLength(0);
        expect(errorSpy).toHaveBeenCalledWith(
          expect.stringContaining('400'),
          expect.objectContaining({
            entity: 'transactions',
            operation: 'update',
            entityId: 'tx-1',
            status: 400,
            data: { id: 'tx-1', note: 'edited' },
          })
        );

        errorSpy.mockRestore();
      });

      // ACC-02
      it('404 with localhost API_URL logs error with payload detail and dequeues', async () => {
        queue.push({
          id: 'transactions:update:tx-1',
          entity: 'transactions',
          operation: 'update',
          entityId: 'tx-1',
          data: { id: 'tx-1', note: 'edited' },
          timestamp: Date.now(),
          retryCount: 0,
          nextRetryAt: Date.now(),
        });
        const { processSyncQueue: freshProcess } = loadProcessorWithEnv('http://localhost:3000');
        resolveWithStatus(404, 'Not Found');
        const errorSpy = jest.spyOn(console, 'error').mockImplementation();

        await freshProcess();

        expect(queue).toHaveLength(0);
        expect(errorSpy).toHaveBeenCalledWith(
          expect.stringContaining('404'),
          expect.objectContaining({ entity: 'transactions', operation: 'update' })
        );

        errorSpy.mockRestore();
      });

      // ACC-03
      it('400 with hosted API_URL keeps warn-and-dequeue, no error', async () => {
        queue.push({
          id: 'transactions:update:tx-1',
          entity: 'transactions',
          operation: 'update',
          entityId: 'tx-1',
          data: { id: 'tx-1', note: 'edited' },
          timestamp: Date.now(),
          retryCount: 0,
          nextRetryAt: Date.now(),
        });
        const { processSyncQueue: freshProcess } = loadProcessorWithEnv('https://api.example.com');
        resolveWithStatus(400, 'HTTP 400');
        const warnSpy = jest.spyOn(console, 'warn').mockImplementation();
        const errorSpy = jest.spyOn(console, 'error').mockImplementation();

        await freshProcess();

        expect(queue).toHaveLength(0);
        expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('400'));
        expect(errorSpy).not.toHaveBeenCalled();

        warnSpy.mockRestore();
        errorSpy.mockRestore();
      });

      // ACC-03
      it('404 with hosted API_URL keeps warn-and-dequeue, no error', async () => {
        queue.push({
          id: 'transactions:update:tx-1',
          entity: 'transactions',
          operation: 'update',
          entityId: 'tx-1',
          data: { id: 'tx-1', note: 'edited' },
          timestamp: Date.now(),
          retryCount: 0,
          nextRetryAt: Date.now(),
        });
        const { processSyncQueue: freshProcess } = loadProcessorWithEnv('https://api.example.com');
        resolveWithStatus(404, 'Not Found');
        const warnSpy = jest.spyOn(console, 'warn').mockImplementation();
        const errorSpy = jest.spyOn(console, 'error').mockImplementation();

        await freshProcess();

        expect(queue).toHaveLength(0);
        expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('404'));
        expect(errorSpy).not.toHaveBeenCalled();

        warnSpy.mockRestore();
        errorSpy.mockRestore();
      });

      // ACC-04: API_URL unset ⇒ processSyncQueue early-returns, item preserved
      it('400 with API_URL unset leaves the queue untouched and stays quiet', async () => {
        queue.push({
          id: 'transactions:update:tx-1',
          entity: 'transactions',
          operation: 'update',
          entityId: 'tx-1',
          data: { id: 'tx-1', note: 'edited' },
          timestamp: Date.now(),
          retryCount: 0,
          nextRetryAt: Date.now(),
        });
        const { processSyncQueue: freshProcess } = loadProcessorWithEnv(undefined);
        resolveWithStatus(400, 'HTTP 400');
        const warnSpy = jest.spyOn(console, 'warn').mockImplementation();
        const errorSpy = jest.spyOn(console, 'error').mockImplementation();

        await freshProcess();

        expect(queue).toHaveLength(1);
        expect(warnSpy).not.toHaveBeenCalled();
        expect(errorSpy).not.toHaveBeenCalled();

        warnSpy.mockRestore();
        errorSpy.mockRestore();
      });
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
