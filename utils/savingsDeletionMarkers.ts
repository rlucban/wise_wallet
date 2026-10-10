import { getPrefixedKey, getItem, setItem } from "./storage";

export type DeletionMarkerMap = Record<string, number>;

const TOMBSTONE_BASE = "savings_tombstones";
const SEEN_REMOTE_BASE = "savings_seen_remote_ids";

export async function getDeletedIds(userId: string): Promise<DeletionMarkerMap> {
  const key = await getPrefixedKey(TOMBSTONE_BASE, userId);
  return getItem<DeletionMarkerMap>(key, {});
}

export async function markDeleted(userId: string, id: string, at: number = Date.now()): Promise<void> {
  if (!userId || !id) return;
  const key = await getPrefixedKey(TOMBSTONE_BASE, userId);
  const map = await getItem<DeletionMarkerMap>(key, {});
  map[id] = at;
  await setItem(key, map);
}

export async function clearDeleted(userId: string, ids: string[]): Promise<void> {
  if (!userId || ids.length === 0) return;
  const key = await getPrefixedKey(TOMBSTONE_BASE, userId);
  const map = await getItem<DeletionMarkerMap>(key, {});
  let changed = false;
  for (const id of ids) {
    if (id in map) {
      delete map[id];
      changed = true;
    }
  }
  if (changed) await setItem(key, map);
}

export async function getSeenRemoteIds(userId: string): Promise<string[]> {
  const key = await getPrefixedKey(SEEN_REMOTE_BASE, userId);
  return getItem<string[]>(key, []);
}

export async function setSeenRemoteIds(userId: string, ids: string[]): Promise<void> {
  if (!userId) return;
  const key = await getPrefixedKey(SEEN_REMOTE_BASE, userId);
  await setItem(key, ids);
}
