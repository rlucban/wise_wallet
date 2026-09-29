import AsyncStorage from "@react-native-async-storage/async-storage";
import type { Transaction } from "../types";

/**
 * Pure Cloud transaction-sync helpers (SPEC-27).
 *
 * Everything in this file except the `*LastServerTxIds` persistence pair is
 * side-effect free so `jest` can cover ACC-01..03/05/10/11 without pulling in
 * React contexts or native modules. `context/TransactionsContext.tsx` is the
 * only production caller of the merge path.
 */

export interface MergeInput {
    /** Current device-local transactions. */
    local: Transaction[];
    /** Last successful server snapshot (`ok === true` array body only). */
    remote: Transaction[];
    /** Ids present in the previous stored server snapshot. */
    lastServerIds: string[];
    /** Ids deleted locally this session whose `delete` has not drained yet. */
    deletedIds: string[] | Set<string>;
}

export interface MergeResult {
    /** Union after LWW + server-delete-wins. */
    merged: Transaction[];
    /** Local rows replaced by newer remote rows (SPEC-05 toast). */
    overwrittenCount: number;
    /** Local-only ids to POST (never seen on server). */
    toCreate: Transaction[];
    /** Local-newer ids to PUT. */
    toUpdate: Transaction[];
}

const idOf = (t: Transaction): string => String(t.id);
const tsOf = (t: Transaction): number =>
    typeof t.updatedAt === "number" && t.updatedAt > 0 ? t.updatedAt : 0;

/** ACC-01 — stamp a fresh `updatedAt` on add/update (never preserve stale). */
export function withFreshTimestamp<T extends { updatedAt: number }>(entity: T): T {
    return { ...entity, updatedAt: Date.now() };
}

/** CON-04 — every queued item carries `{ userId, updatedAt }`. */
export function buildTransactionSyncPayload(
    tx: Transaction,
    userId: string
): Record<string, unknown> {
    return { ...tx, userId };
}

/**
 * Gating predicate (CON-11, ACC-04/10). True ⟺ transaction sync is paused:
 * Local accounts always; Cloud accounts with `autoBackup === 'false'`.
 * `autoBackup === null` (never set) reads as ON.
 */
export function isTransactionSyncPaused(
    isLocalAccount: boolean,
    autoBackup: string | null
): boolean {
    if (isLocalAccount) return true;
    return autoBackup === "false";
}

/**
 * Union + per-id LWW (ties → remote) + server-delete-wins (CON-06).
 *
 * - Remote id in `deletedIds` → dropped (queued `delete` not yet drained).
 * - Local id absent remotely + in `lastServerIds` → remotely deleted → dropped.
 * - Local id absent remotely + NOT in `lastServerIds` → local-only → `toCreate`.
 * - Both present → higher `updatedAt` wins; remote-newer counts as overwritten.
 */
export function mergeTransactionSets(input: MergeInput): MergeResult {
    const deleted = input.deletedIds instanceof Set
        ? input.deletedIds
        : new Set(input.deletedIds);
    const lastServer = new Set(input.lastServerIds);
    const remoteById = new Map<string, Transaction>();
    for (const r of input.remote) remoteById.set(idOf(r), r);

    const merged = new Map<string, Transaction>();
    const toCreate: Transaction[] = [];
    const toUpdate: Transaction[] = [];
    let overwrittenCount = 0;

    for (const remoteTx of input.remote) {
        if (deleted.has(idOf(remoteTx))) continue;
        merged.set(idOf(remoteTx), remoteTx);
    }

    for (const localTx of input.local) {
        const id = idOf(localTx);
        const remoteTx = remoteById.get(id);

        if (!remoteTx) {
            if (lastServer.has(id)) continue; // server-delete-wins: dropped remotely
            toCreate.push(localTx);
            merged.set(id, localTx);
            continue;
        }
        if (deleted.has(id)) continue; // locally deleted, drain pending

        const localTs = tsOf(localTx);
        const remoteTs = tsOf(remoteTx);
        if (localTs > remoteTs) {
            merged.set(id, localTx);
            toUpdate.push(localTx);
        } else if (remoteTs > localTs) {
            overwrittenCount++;
        }
        // ties → remote already in map, no count
    }

    return { merged: Array.from(merged.values()), overwrittenCount, toCreate, toUpdate };
}

/** D-08 — orphans = local ids absent from the last stored server snapshot. */
export function countOrphanTransactions(
    localIds: string[],
    lastServerIds: string[]
): number {
    const server = new Set(lastServerIds);
    return localIds.filter((id) => !server.has(id)).length;
}

const lastServerIdsKey = (userId: string): string =>
    `user_${userId}_last_server_tx_ids`;

/** Ids from the last successful (`ok`) server fetch, for delete-wins + orphans. */
export async function getLastServerTxIds(userId: string): Promise<string[]> {
    try {
        const raw = await AsyncStorage.getItem(lastServerIdsKey(userId));
        const parsed: unknown = raw ? JSON.parse(raw) : [];
        return Array.isArray(parsed)
            ? (parsed as unknown[]).map((id) => String(id))
            : [];
    } catch {
        return [];
    }
}

export async function setLastServerTxIds(
    userId: string,
    ids: string[]
): Promise<void> {
    try {
        await AsyncStorage.setItem(lastServerIdsKey(userId), JSON.stringify(ids));
    } catch {
        // diagnostics only — never block sync on a cache write
    }
}

/** D-01 — short, non-secret account fingerprint for diagnostics surfaces. */
export function truncateUserId(userId: string | null): string {
    if (!userId) return "—";
    return userId.length > 8 ? `${userId.slice(0, 8)}…` : userId;
}
