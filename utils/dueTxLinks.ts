import { getPrefixedKey, getItem, setItem } from "./storage";
import type { Transaction } from "../types";

type DueLinkMap = Record<string, string>;

async function readMap(userId: string): Promise<DueLinkMap> {
  const key = await getPrefixedKey("due_tx_links", userId);
  return getItem<DueLinkMap>(key, {});
}

async function writeMap(map: DueLinkMap, userId: string): Promise<void> {
  const key = await getPrefixedKey("due_tx_links", userId);
  await setItem(key, map);
}

export async function recordDueLink(txId: string, dueId: string | undefined, userId: string): Promise<void> {
  if (!dueId || !txId || !userId) return;
  const map = await readMap(userId);
  map[txId] = dueId;
  await writeMap(map, userId);
}

export async function pruneDueLinks(txId: string, userId: string): Promise<void> {
  const map = await readMap(userId);
  if (txId in map) {
    delete map[txId];
    await writeMap(map, userId);
  }
}

export async function remapDueLink(fromId: string, toId: string, userId: string): Promise<void> {
  if (!fromId || !toId || !userId || fromId === toId) return;
  const map = await readMap(userId);
  if (!(fromId in map)) return;
  map[toId] = map[fromId];
  delete map[fromId];
  await writeMap(map, userId);
}

export async function pruneDueLinksByDue(dueId: string, userId: string): Promise<void> {
  const map = await readMap(userId);
  const keys = Object.entries(map).filter(([, value]) => value === dueId).map(([key]) => key);
  if (keys.length) {
    keys.forEach((key) => delete map[key]);
    await writeMap(map, userId);
  }
}

export async function attachDueLinks(rows: Transaction[], userId: string): Promise<Transaction[]> {
  const map = await readMap(userId);
  return rows.map((row) => {
    if (row.dueId) return row;
    const mapped = map[row.id];
    return mapped ? { ...row, dueId: mapped } : row;
  });
}
