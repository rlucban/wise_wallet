import type { Repository } from '../types/repositories';
import type { TimestampedEntity } from '../types';
import { getPrefixedKey, getItem, setItem, deduplicate, nowTimestamp, ensureAllTimestamps } from '../utils/storage';

export abstract class BaseAsyncStorageRepository<T extends { id: string }> implements Repository<T> {
  constructor(protected storageKey: string) {}

  async getAll(): Promise<T[]> {
    const key = await getPrefixedKey(this.storageKey);
    const items = await getItem<T[]>(key, []);
    return deduplicate(this.ensureTimestamps(items));
  }

  protected ensureTimestamps(items: T[]): T[] {
    if (items.length > 0 && 'updatedAt' in items[0]) {
      return ensureAllTimestamps(items as unknown as TimestampedEntity[]) as unknown as T[];
    }
    return items;
  }

  async getById(id: string): Promise<T | undefined> {
    const key = await getPrefixedKey(this.storageKey);
    const items = await getItem<T[]>(key, []);
    return items.find(x => String(x.id) === String(id));
  }

  async upsert(entity: T): Promise<void> {
    const key = await getPrefixedKey(this.storageKey);
    const items = await getItem<T[]>(key, []);
    const index = items.findIndex(x => String(x.id) === String(entity.id));
    const withTimestamp = { ...entity, updatedAt: nowTimestamp() };
    if (index >= 0) {
      items[index] = withTimestamp;
    } else {
      items.push(withTimestamp);
    }
    await setItem(key, items);
  }

  async upsertBulk(entities: T[]): Promise<void> {
    const key = await getPrefixedKey(this.storageKey);
    const items = await getItem<T[]>(key, []);
    for (const entity of entities) {
      const index = items.findIndex(x => String(x.id) === String(entity.id));
      const withTimestamp = { ...entity, updatedAt: nowTimestamp() };
      if (index >= 0) {
        items[index] = withTimestamp;
      } else {
        items.push(withTimestamp);
      }
    }
    await setItem(key, items);
  }

  async deleteById(id: string): Promise<void> {
    const key = await getPrefixedKey(this.storageKey);
    const items = await getItem<T[]>(key, []);
    const filtered = items.filter(x => String(x.id) !== String(id));
    await setItem(key, filtered);
  }
}
