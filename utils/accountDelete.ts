import { deleteUser, getUsers } from "./db";
import {
  getSyncQueue,
  saveSyncQueue,
  clearLastSyncedAt,
  queueItemUserId,
  type SyncQueueItem,
} from "./syncQueue";
import { getPrefixedKey, getItem, setItem } from "./storage";
import { clearSettingsCache } from "./cache";

/**
 * Account-deletion helpers (SPEC-28).
 * Pure predicates/collectors are jest-covered; `purgeUserDeviceData` wires
 * them to storage with per-file/per-step guards so one failure never aborts
 * the purge. No UI imports — settings.tsx is the only production caller.
 */

/** Same email rule as register/login: emails are server-authoritative. */
export function isEmailShapedName(name: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(name.trim());
}

interface VerifyLoginPayload {
  userId: string;
  token: string;
}

/** Extract `{ userId, token }` from a verify-login JSON body, else null. */
export function parseVerifyLoginResponse(body: unknown): VerifyLoginPayload | null {
  if (!body || typeof body !== "object") return null;
  const data = (body as { data?: unknown }).data;
  if (!data || typeof data !== "object") return null;
  const user = (data as { user?: unknown }).user;
  const token = (data as { token?: unknown }).token;
  if (!user || typeof user !== "object") return null;
  const id = (user as { id?: unknown }).id;
  if (typeof id !== "string" || id.length === 0) return null;
  if (typeof token !== "string" || token.length === 0) return null;
  return { userId: id, token };
}

export type DeleteOutcome = "server" | "local-only";

/** ACC-03 — success copy ONLY on server confirmation. */
export function resolveDeleteOutcome(ok: boolean): DeleteOutcome {
  return ok ? "server" : "local-only";
}

export interface ReceiptRef {
  id: string;
  receiptUrl?: string;
}

/**
 * Files owned by the deleted user's transactions: `file://` originals plus
 * the `receipt_{id}.jpg` import copies. Export/backup files are never included.
 */
export function collectReceiptFiles(
  txs: ReceiptRef[],
  documentDirectory: string | null
): string[] {
  const files: string[] = [];
  for (const t of txs) {
    if (typeof t.receiptUrl === "string" && t.receiptUrl.startsWith("file://")) {
      files.push(t.receiptUrl);
    }
    if (documentDirectory) {
      files.push(`${documentDirectory}receipt_${t.id}.jpg`);
    }
  }
  return [...new Set(files)];
}

/** Keep legacy (unattributed) items and other users' items; drop U's. */
export function filterQueueKeepOthers(
  queue: SyncQueueItem[],
  userId: string
): SyncQueueItem[] {
  return queue.filter((item) => {
    const owner = queueItemUserId(item);
    return owner === null || owner !== userId;
  });
}

function getFileSystem(): {
  deleteAsync: (uri: string, options?: Record<string, unknown>) => Promise<unknown>;
} | null {
  try {
    // Lazy so jest (node) and import-time evaluation never touch native code.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require("expo-file-system/legacy") as {
      deleteAsync: (uri: string, options?: Record<string, unknown>) => Promise<unknown>;
    };
  } catch {
    return null;
  }
}

export interface PurgeResult {
  deletedFiles: number;
}

/**
 * SPEC-28 D-08 / CON-09 — full device purge for deleted user U.
 * Preserves: `localDeviceId`, other users' rows/keys/queue items,
 * user-created export/backup files. Caller performs `logout()` after.
 */
export async function purgeUserDeviceData(
  userId: string,
  localTxs: ReceiptRef[],
  documentDirectory: string | null
): Promise<PurgeResult> {
  // Ghost cleanup (CON-06/D-05): capture the display name BEFORE deleteUser,
  // then drop every master_users row for the id AND the name.
  let displayName: string | null = null;
  try {
    const profileKey = await getPrefixedKey("profile", userId);
    const prof = await getItem<{ name?: unknown } | null>(profileKey, null);
    if (prof && typeof prof.name === "string" && prof.name.trim().length > 0) {
      displayName = prof.name;
    }
  } catch {
    displayName = null;
  }

  try {
    await deleteUser(userId);
  } catch (e) {
    console.error("[Purge] deleteUser failed:", e);
  }

  if (displayName) {
    try {
      const users = await getUsers();
      const lowered = displayName.toLowerCase();
      const kept = users.filter(
        (u) =>
          String((u as { name?: unknown }).name ?? "").toLowerCase() !== lowered
      );
      if (kept.length !== users.length) {
        await setItem("master_users", kept);
      }
    } catch (e) {
      console.error("[Purge] ghost-row cleanup failed:", e);
    }
  }

  try {
    const queue = await getSyncQueue();
    await saveSyncQueue(filterQueueKeepOthers(queue, userId));
  } catch (e) {
    console.error("[Purge] queue filter failed:", e);
  }

  try {
    await clearLastSyncedAt();
  } catch (e) {
    console.error("[Purge] last-synced reset failed:", e);
  }

  try {
    clearSettingsCache();
  } catch (e) {
    console.error("[Purge] settings-cache clear failed:", e);
  }

  let deletedFiles = 0;
  const fs = getFileSystem();
  if (fs) {
    for (const uri of collectReceiptFiles(localTxs, documentDirectory)) {
      try {
        await fs.deleteAsync(uri, { idempotent: true });
        deletedFiles++;
      } catch {
        // one missing file never aborts the purge
      }
    }
  }

  return { deletedFiles };
}
