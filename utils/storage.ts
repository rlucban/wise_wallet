import AsyncStorage from '@react-native-async-storage/async-storage';
import type { TimestampedEntity } from '../types';
import { getCachedUserId } from './cache';

export function nowTimestamp(): number {
  return Date.now();
}

export function ensureTimestamp<T extends TimestampedEntity>(entity: T | Record<string, unknown>): T {
  if (!entity) return entity as T;
  if (typeof entity.updatedAt !== 'number' || entity.updatedAt <= 0) {
    return { ...entity, updatedAt: nowTimestamp() } as T;
  }
  return entity as T;
}

export function ensureAllTimestamps<T extends TimestampedEntity>(entities: (T | Record<string, unknown>)[]): T[] {
  return entities.map(e => ensureTimestamp(e)) as T[];
}

export function getUpdatedAt(item: Record<string, unknown>): number {
  if (typeof item.updatedAt === 'number' && item.updatedAt > 0) {
    return item.updatedAt;
  }
  return 0;
}

export const getPrefixedKey = async (baseKey: string, overrideUserId?: string): Promise<string> => {
  const userId = overrideUserId || getCachedUserId() || await AsyncStorage.getItem('activeUserId');
  return userId ? `user_${userId}_${baseKey}` : `default_${baseKey}`;
};

export async function getItem<T>(key: string, defaultValue: T): Promise<T> {
  try {
    const val = await AsyncStorage.getItem(key);
    return val ? JSON.parse(val) : defaultValue;
  } catch (e) {
    console.error(`Error reading key ${key}:`, e);
    return defaultValue;
  }
}

export async function setItem<T>(key: string, value: T): Promise<void> {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.error(`Error writing key ${key}:`, e);
  }
}

export function deduplicate<T extends { id: string | number }>(items: T[]): T[] {
  const seen = new Set();
  return items.filter(item => {
    const id = String(item.id);
    if (seen.has(id)) return false;
    seen.add(id);
    return true;
  });
}
