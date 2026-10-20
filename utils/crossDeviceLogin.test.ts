import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  setPendingLogin,
  getPendingLogin,
  clearPendingLogin,
  approvePendingLogin,
  rejectPendingLogin,
  getPendingLoginKey,
} from './isSameDeviceSession';

describe('Cross-Device Login Confirmation (Spec 109)', () => {
  const userId = 'user_test_123';
  const deviceId = 'Mobile 2';

  beforeEach(async () => {
    await AsyncStorage.clear();
    jest.clearAllMocks();
  });

  describe.each(['android', 'ios', 'web'] as const)('Platform: %s', (_platform) => {
    beforeEach(() => {
      jest.resetModules();
    });

    it('creates and retrieves a pending login request (ACC-01 / D-01)', async () => {
      const created = await setPendingLogin(userId, deviceId);
      expect(created.userId).toBe(userId);
      expect(created.deviceId).toBe(deviceId);
      expect(created.status).toBe('pending');

      const retrieved = await getPendingLogin(userId);
      expect(retrieved).not.toBeNull();
      expect(retrieved?.userId).toBe(userId);
      expect(retrieved?.deviceId).toBe(deviceId);
      expect(retrieved?.status).toBe('pending');
    });

    it('approves a pending login request (ACC-04)', async () => {
      await setPendingLogin(userId, deviceId);
      await approvePendingLogin(userId);

      const retrieved = await getPendingLogin(userId);
      expect(retrieved?.status).toBe('approved');
    });

    it('rejects a pending login request (ACC-03)', async () => {
      await setPendingLogin(userId, deviceId);
      await rejectPendingLogin(userId);

      const retrieved = await getPendingLogin(userId);
      expect(retrieved?.status).toBe('rejected');
    });

    it('clears pending login on completion or logout', async () => {
      await setPendingLogin(userId, deviceId);
      await clearPendingLogin(userId);

      const retrieved = await getPendingLogin(userId);
      expect(retrieved).toBeNull();
    });

    it('constructs correct storage key prefix without collisions', () => {
      const key = getPendingLoginKey(userId);
      expect(key).toBe(`user_pending_login_${userId}`);
    });
  });
});
