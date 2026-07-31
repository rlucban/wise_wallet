import type { UserProfile } from '../types';
import type { ProfileRepository } from '../types/repositories';
import { getPrefixedKey, getItem, setItem, nowTimestamp } from '../utils/storage';

const PROFILE_ID = 'default';

export class AsyncStorageProfileRepository implements ProfileRepository {
  async getAll(): Promise<UserProfile[]> {
    const profile = await this.getById(PROFILE_ID);
    return profile ? [profile] : [];
  }

  async getById(_id: string): Promise<UserProfile | undefined> {
    const key = await getPrefixedKey('profile');
    const profile = await getItem<Record<string, unknown> | null>(key, null);
    if (profile) {
      return {
        ...profile,
        isFirstRun: profile.isFirstRun === true || profile.isFirstRun === 1,
      } as UserProfile;
    }
    return undefined;
  }

  async upsert(entity: UserProfile): Promise<void> {
    const key = await getPrefixedKey('profile');
    const current = await this.getById(PROFILE_ID) || {} as UserProfile;
    const updated = { ...current, ...entity, updatedAt: nowTimestamp() };
    await setItem(key, updated);
  }

  async upsertBulk(entities: UserProfile[]): Promise<void> {
    for (const entity of entities) {
      await this.upsert(entity);
    }
  }

  async deleteById(_id: string): Promise<void> {
    const key = await getPrefixedKey('profile');
    await setItem(key, undefined);
  }
}
