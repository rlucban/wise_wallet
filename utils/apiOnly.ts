// SPEC-34 — API-only online mode shared helpers.
// Cloud+ON (and all web Cloud): memory state, direct API reads/writes, zero
// AsyncStorage entity persistence. Local-persist plane (mobile Local +
// mobile OFF) keeps today's repo/queue semantics. No static native imports.
import AsyncStorage from "@react-native-async-storage/async-storage";
import { authFetch } from "./apiClient";
import { processSyncQueue } from "./syncProcessor";
import { getItem, getPrefixedKey } from "./storage";
import { getCachedSetting } from "./cache";

export type DataPlane = "api-only" | "local-persist";

// --- CON-01 mode router (pure) ---

export function resolveDataPlane(args: {
  platformOs: string;
  isLocal: boolean;
  autoBackup: boolean;
}): DataPlane {
  if (args.isLocal) return "local-persist";
  if (args.platformOs === "web") return "api-only";
  return args.autoBackup ? "api-only" : "local-persist";
}

// Mirrors every context's established gating input (`getSetting` store value
// with profile/default fallback): store 'false' forces OFF; otherwise the
// profile flag; otherwise Cloud-default ON.
export function isAutoBackupOn(
  storeValue: string | null,
  profileValue?: boolean
): boolean {
  if (storeValue === "false") return false;
  if (typeof profileValue === "boolean") return profileValue;
  return true;
}

// Active-plane resolver used by every data layer: store flag (cache-aware,
// mirroring db.getSetting) with the live profile as fallback.
export async function resolveActivePlane(args: {
  platformOs: string;
  isLocal: boolean;
  profileAutoBackup?: boolean;
}): Promise<DataPlane> {
  let storeVal: string | null | undefined = getCachedSetting("autoBackup");
  if (storeVal === undefined) {
    try {
      const fullKey = await getPrefixedKey("settings");
      const settings = await getItem<Record<string, string>>(fullKey, {});
      storeVal = settings["autoBackup"] ?? null;
    } catch {
      storeVal = null;
    }
  }
  return resolveDataPlane({
    platformOs: args.platformOs,
    isLocal: args.isLocal,
    autoBackup: isAutoBackupOn(storeVal ?? null, args.profileAutoBackup),
  });
}

// Per-user autoBackup flag read for a KNOWN user id (login/register time,
// when the cache may belong to someone else). Missing flag defaults ON.
export async function readAutoBackupFlagFor(userId: string): Promise<boolean> {
  try {
    const fullKey = await getPrefixedKey("settings", userId);
    const settings = await getItem<Record<string, string>>(fullKey, {});
    return settings["autoBackup"] !== "false";
  } catch {
    return true;
  }
}

// --- Response-shape normalizer (absorbed SPEC-33 D-01) ---

export function normalizeUserProfileResponse(
  data: unknown,
  userId: string
): Record<string, unknown> | null {
  const rows = Array.isArray(data) ? data : data ? [data] : [];
  const records = rows.filter(
    (r): r is Record<string, unknown> =>
      !!r && typeof r === "object" && !Array.isArray(r)
  );
  if (records.length === 0) return null;
  const byUser =
    records.find((r) => String(r["userId"] ?? "") === userId) ?? null;
  const picked = byUser ?? records[0]!;
  if (picked["name"] === undefined && picked["userId"] === undefined) {
    return null;
  }
  return picked;
}

// --- Direct API entity CRUD (CON-02; never touches repos or the queue) ---

export type ApiEntity =
  | "transactions"
  | "categories"
  | "dues"
  | "savingsItems"
  | "userProfiles";

const LIST_ENDPOINT: Record<ApiEntity, (userId: string) => string> = {
  transactions: (u) => `transactions?userId=${u}`,
  categories: () => `categories`,
  dues: () => `dues`,
  savingsItems: (u) => `savingsItems?userId=${u}`,
  userProfiles: (u) => `userProfiles?userId=${u}`,
};

const COLLECTION_ENDPOINT: Record<ApiEntity, string> = {
  transactions: `transactions`,
  categories: `categories`,
  dues: `dues`,
  savingsItems: `savingsItems`,
  userProfiles: `userProfiles`,
};

export interface ApiIoResult {
  ok: boolean;
  status: number;
  data?: unknown;
}

export async function apiList(
  entity: ApiEntity,
  userId: string
): Promise<ApiIoResult> {
  const res = await authFetch<unknown>(LIST_ENDPOINT[entity](userId));
  return { ok: res.ok, status: res.status, data: res.data };
}

function toApiBody(
  entity: ApiEntity,
  item: Record<string, unknown>,
  userId: string
): Record<string, unknown> {
  if (entity === "transactions") {
    const category = item["category"] as { id?: unknown } | undefined;
    return {
      ...item,
      categoryId:
        item["categoryId"] ?? (category?.id !== undefined ? String(category.id) : null),
      userId,
    };
  }
  return { ...item, userId };
}

export async function apiCreate(
  entity: ApiEntity,
  item: Record<string, unknown>,
  userId: string
): Promise<ApiIoResult> {
  const res = await authFetch<unknown>(COLLECTION_ENDPOINT[entity], {
    method: "POST",
    body: JSON.stringify(toApiBody(entity, item, userId)),
  });
  return { ok: res.ok, status: res.status, data: res.data };
}

export async function apiUpdate(
  entity: ApiEntity,
  id: string | number,
  item: Record<string, unknown>,
  userId: string
): Promise<ApiIoResult> {
  const res = await authFetch<unknown>(`${COLLECTION_ENDPOINT[entity]}/${id}`, {
    method: "PUT",
    body: JSON.stringify(toApiBody(entity, item, userId)),
  });
  return { ok: res.ok, status: res.status, data: res.data };
}

export async function apiDelete(
  entity: ApiEntity,
  id: string | number
): Promise<ApiIoResult> {
  const res = await authFetch<unknown>(`${COLLECTION_ENDPOINT[entity]}/${id}`, {
    method: "DELETE",
  });
  return { ok: res.ok, status: res.status, data: res.data };
}

// Profile ensure-exists (CON-02c): GET → POST if missing → else PUT.
export async function ensureCloudProfile(
  userId: string,
  profile: Record<string, unknown>
): Promise<boolean> {
  const found = normalizeUserProfileResponse(
    (await apiList("userProfiles", userId)).data,
    userId
  );
  if (!found) {
    const created = await apiCreate("userProfiles", profile, userId);
    return created.ok;
  }
  const updated = await apiUpdate(
    "userProfiles",
    String((found["id"] as string | number | undefined) ?? userId),
    { ...found, ...profile },
    userId
  );
  return updated.ok;
}

// --- CON-04 fetch-then-push migration (deps injected for tests) ---

export interface LocalPlaneSnapshot {
  transactions: Record<string, unknown>[];
  categories: Record<string, unknown>[];
  dues: Record<string, unknown>[];
  savingsItems: Record<string, unknown>[];
  profile: Record<string, unknown> | null;
}

export interface MigrationDeps {
  readLocalSnapshot: () => Promise<LocalPlaneSnapshot>;
  drainOutbox: () => Promise<void>;
  fetchRemote: () => Promise<{ ok: boolean; remote: LocalPlaneSnapshot }>;
  uploadEntry: (
    entity: "transactions" | "categories" | "dues" | "savingsItems",
    item: Record<string, unknown>
  ) => Promise<boolean>;
  uploadProfile: (profile: Record<string, unknown>) => Promise<boolean>;
  purgeLocal: () => Promise<void>;
  logOp?: (op: string) => void;
}

export interface MigrationResult {
  ok: boolean;
  reason?: string;
}

const MIGRATABLE: Array<"transactions" | "categories" | "dues" | "savingsItems"> = [
  "transactions",
  "categories",
  "dues",
  "savingsItems",
];

export async function migrateToApiOnly(
  deps: MigrationDeps
): Promise<MigrationResult> {
  const log = deps.logOp ?? (() => {});
  try {
    log("readLocal");
    const local = await deps.readLocalSnapshot();
    await deps.drainOutbox();
    log("fetchRemote");
    const fetched = await deps.fetchRemote();
    if (!fetched.ok) {
      return { ok: false, reason: "fetch-failed" };
    }
    const remoteIds = new Map<string, Set<string>>();
    for (const entity of MIGRATABLE) {
      remoteIds.set(
        entity,
        new Set(fetched.remote[entity].map((r) => String(r["id"])))
      );
    }
    for (const entity of MIGRATABLE) {
      for (const item of local[entity]) {
        if (!remoteIds.get(entity)!.has(String(item["id"]))) {
          log(`post:${entity}:${String(item["id"])}`);
          const uploaded = await deps.uploadEntry(entity, item);
          if (!uploaded) {
            return { ok: false, reason: `upload-failed:${entity}` };
          }
        }
      }
    }
    if (local.profile) {
      log("put:profile");
      const profileOk = await deps.uploadProfile(local.profile);
      if (!profileOk) {
        return { ok: false, reason: "upload-failed:profile" };
      }
    }
    log("purge");
    await deps.purgeLocal();
    return { ok: true };
  } catch {
    return { ok: false, reason: "threw" };
  }
}

// Deletes ONLY this user's entity keys (transactions, categories, dues,
// savingsItems, profile, settings, sync snapshots). Registry (master_users),
// localDeviceId, other users, and export files are never matched. Receipt
// image FILES (FileSystem, not AsyncStorage) are left alone.
export async function purgeUserEntityKeys(userId: string): Promise<void> {
  const keys = await AsyncStorage.getAllKeys();
  const mine = keys.filter((k) => k.startsWith(`user_${userId}_`));
  if (mine.length > 0) {
    await AsyncStorage.multiRemove(mine);
  }
}

export async function hasLegacyEntityKeys(userId: string): Promise<boolean> {
  const keys = await AsyncStorage.getAllKeys();
  return keys.some((k) => k.startsWith(`user_${userId}_`));
}

// --- CON-04 entry + CON-06 seeding (real deps wired by callers) ---

function emptySnapshot(): LocalPlaneSnapshot {
  return { transactions: [], categories: [], dues: [], savingsItems: [], profile: null };
}

function asRecordArray(data: unknown): Record<string, unknown>[] {
  return Array.isArray(data)
    ? (data as Record<string, unknown>[]).filter(
        (r): r is Record<string, unknown> => !!r && typeof r === "object"
      )
    : [];
}

// Drain legacy outbox → verified GET → push missing → PUT profile → purge.
// Used by Cloud+ON login, OFF→ON toggle (post-explanation), and first run
// after upgrade with a pre-existing cache. Fresh identities trivially
// converge (empty local snapshot, same code path, no special case).
export async function enterApiOnlyMode(args: {
  userId: string;
  readLocalSnapshot: () => Promise<LocalPlaneSnapshot>;
}): Promise<MigrationResult> {
  return migrateToApiOnly({
    readLocalSnapshot: args.readLocalSnapshot,
    drainOutbox: () => processSyncQueue(),
    fetchRemote: async () => {
      const [tx, cat, due, sav, prof] = await Promise.all([
        apiList("transactions", args.userId),
        apiList("categories", args.userId),
        apiList("dues", args.userId),
        apiList("savingsItems", args.userId),
        apiList("userProfiles", args.userId),
      ]);
      if (!tx.ok || !cat.ok || !due.ok || !sav.ok || !prof.ok) {
        return { ok: false, remote: emptySnapshot() };
      }
      return {
        ok: true,
        remote: {
          transactions: asRecordArray(tx.data),
          categories: asRecordArray(cat.data),
          dues: asRecordArray(due.data),
          savingsItems: asRecordArray(sav.data),
          profile: normalizeUserProfileResponse(prof.data, args.userId),
        },
      };
    },
    uploadEntry: async (entity, item) =>
      (await apiCreate(entity, item, args.userId)).ok,
    uploadProfile: async (profile) =>
      ensureCloudProfile(args.userId, profile),
    purgeLocal: () => purgeUserEntityKeys(args.userId),
  });
}

// Verified server snapshot for ON→OFF seeding. Null when not ok.
// Read-only: never purges, never uploads.
export async function fetchServerSnapshot(
  userId: string
): Promise<LocalPlaneSnapshot | null> {
  const [tx, cat, due, sav, prof] = await Promise.all([
    apiList("transactions", userId),
    apiList("categories", userId),
    apiList("dues", userId),
    apiList("savingsItems", userId),
    apiList("userProfiles", userId),
  ]);
  if (!tx.ok || !cat.ok || !due.ok || !sav.ok || !prof.ok) return null;
  return {
    transactions: asRecordArray(tx.data),
    categories: asRecordArray(cat.data),
    dues: asRecordArray(due.data),
    savingsItems: asRecordArray(sav.data),
    profile: normalizeUserProfileResponse(prof.data, userId),
  };
}

// Snapshot reader over the repository layer (CON-04 local side). Callers
// pass their repos; concrete entity arrays widen to unknown[] cleanly.
export async function readReposSnapshot(repos: {
  transactions: { getAll(): Promise<unknown[]> };
  categories: { getAll(): Promise<unknown[]> };
  dues: { getAll(): Promise<unknown[]> };
  savingsItems: { getAll(): Promise<unknown[]> };
  profiles: { getAll(): Promise<unknown[]> };
}): Promise<LocalPlaneSnapshot> {
  const [txs, cats, dues, savs, profs] = await Promise.all([
    repos.transactions.getAll(),
    repos.categories.getAll(),
    repos.dues.getAll(),
    repos.savingsItems.getAll(),
    repos.profiles.getAll(),
  ]);
  const rec = (a: unknown[]): Record<string, unknown>[] =>
    a.filter(
      (r): r is Record<string, unknown> =>
        !!r && typeof r === "object" && !Array.isArray(r)
    );
  const profiles = rec(profs);
  return {
    transactions: rec(txs),
    categories: rec(cats),
    dues: rec(dues),
    savingsItems: rec(savs),
    profile: profiles[0] ?? null,
  };
}

// --- CON-03 OFF-while-offline guard (zero fetch by construction) ---

export async function switchToOfflineMode(deps: {
  setProfileFlag: (values: { autoBackup: boolean }) => Promise<void>;
  setStoredFlag: (value: string) => Promise<void>;
}): Promise<void> {
  await deps.setProfileFlag({ autoBackup: false });
  await deps.setStoredFlag("false");
}
