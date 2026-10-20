import AsyncStorage from '@react-native-async-storage/async-storage';
import { PendingLoginRequest } from '../types';
const API_URL = process.env.EXPO_PUBLIC_API_URL;

export const PENDING_LOGIN_KEY_PREFIX = 'user_pending_login_';

export const getPendingLoginKey = (userId: string) => `${PENDING_LOGIN_KEY_PREFIX}${userId}`;

export async function setPendingLogin(
  userId: string,
  deviceId: string = 'Device 2',
  tempToken?: string
): Promise<PendingLoginRequest> {
  const request: PendingLoginRequest = {
    userId,
    deviceId,
    timestamp: Date.now(),
    status: 'pending',
  };
  await AsyncStorage.setItem(getPendingLoginKey(userId), JSON.stringify(request));

  // Sync to server profile if API_URL and tempToken are available
  if (API_URL && tempToken) {
    try {
      await fetch(`${API_URL}/userProfiles?userId=${userId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${tempToken}`,
        },
        body: JSON.stringify({ pendingLogin: request }),
      });
    } catch (e) {
      console.warn('Failed to sync pending login to server:', e);
    }
  }

  return request;
}

export async function getPendingLogin(userId: string, token?: string | null): Promise<PendingLoginRequest | null> {
  // If token is available, check server state first for cross-device visibility
  if (API_URL && token && token !== 'offline_token' && token !== 'local_token') {
    try {
      const res = await fetch(`${API_URL}/userProfiles?userId=${userId}`, {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });
      if (res.ok) {
        const body = await res.json();
        const profile = body?.data?.profile || body?.data || body;
        if (profile?.pendingLogin) {
          const req = profile.pendingLogin as PendingLoginRequest;
          await AsyncStorage.setItem(getPendingLoginKey(userId), JSON.stringify(req));
          return req;
        }
      }
    } catch {
      // fallback to local storage
    }
  }

  try {
    const data = await AsyncStorage.getItem(getPendingLoginKey(userId));
    if (!data) return null;
    return JSON.parse(data) as PendingLoginRequest;
  } catch (err) {
    console.error('Failed to read pending login request:', err);
    return null;
  }
}

export async function clearPendingLogin(userId: string, token?: string | null): Promise<void> {
  try {
    await AsyncStorage.removeItem(getPendingLoginKey(userId));
  } catch (err) {
    console.error('Failed to clear pending login request:', err);
  }

  if (API_URL && token && token !== 'offline_token' && token !== 'local_token') {
    try {
      await fetch(`${API_URL}/userProfiles?userId=${userId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ pendingLogin: null }),
      });
    } catch (e) {
      console.warn('Failed to clear pending login on server:', e);
    }
  }
}

export async function approvePendingLogin(userId: string, token?: string | null): Promise<void> {
  const current = await getPendingLogin(userId, token);
  const updated: PendingLoginRequest = {
    userId,
    deviceId: current?.deviceId || 'Device 2',
    timestamp: Date.now(),
    status: 'approved',
  };

  await AsyncStorage.setItem(getPendingLoginKey(userId), JSON.stringify(updated));

  if (API_URL && token && token !== 'offline_token' && token !== 'local_token') {
    try {
      await fetch(`${API_URL}/userProfiles?userId=${userId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ pendingLogin: updated }),
      });
    } catch (e) {
      console.warn('Failed to update approved pending login on server:', e);
    }
  }
}

export async function rejectPendingLogin(userId: string, token?: string | null): Promise<void> {
  const current = await getPendingLogin(userId, token);
  const updated: PendingLoginRequest = {
    userId,
    deviceId: current?.deviceId || 'Device 2',
    timestamp: Date.now(),
    status: 'rejected',
  };

  await AsyncStorage.setItem(getPendingLoginKey(userId), JSON.stringify(updated));

  if (API_URL && token && token !== 'offline_token' && token !== 'local_token') {
    try {
      await fetch(`${API_URL}/userProfiles?userId=${userId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ pendingLogin: updated }),
      });
    } catch (e) {
      console.warn('Failed to update rejected pending login on server:', e);
    }
  }
}
