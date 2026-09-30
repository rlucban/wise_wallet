// SPEC-30 — Local creation gate + re-registration promotion helpers.
// SPEC-31 — Web never-local gate + Settings PIN-verification unification.
// Zero-network, Expo Go safe, web-safe (no static native-only imports).
import AsyncStorage from "@react-native-async-storage/async-storage";

export type AccountMode = "online" | "offline";
export type OfflineSuggestionChoice = "continue-offline" | "use-online";

// --- Device connectivity (zero API pings) ---

export function getDeviceOnline(): boolean {
  const nav = (globalThis as unknown as { navigator?: { onLine?: unknown } })
    .navigator;
  if (typeof nav !== "undefined" && typeof nav.onLine === "boolean") {
    return nav.onLine;
  }
  return true;
}

// --- D-01: once-per-visit offline suggestion ---

export function shouldShowOfflineSuggestion(args: {
  isWeb: boolean;
  deviceOnline: boolean;
  alreadyShown: boolean;
}): boolean {
  if (args.isWeb) return false;
  if (args.deviceOnline) return false;
  if (args.alreadyShown) return false;
  return true;
}

export function getInitialAccountMode(): AccountMode {
  return "online";
}

export function applyOfflineSuggestionChoice(
  choice: OfflineSuggestionChoice
): AccountMode {
  return choice === "continue-offline" ? "offline" : "online";
}

export const OFFLINE_SUGGEST_TITLE = "No Connection Detected";
export const OFFLINE_SUGGEST_MESSAGE =
  "No connection detected \u2014 Offline suggested. You can still use the app on this device only. Data will NOT sync across devices.";

// --- D-03: re-registration promotion (Local -> NEW Cloud identity) ---

export const REREGISTER_CONNECT_MESSAGE =
  "Connect to the internet to register your Online account.";

export const REREGISTER_HONESTY_TITLE = "Register Online Account";
export const REREGISTER_HONESTY_MESSAGE =
  "This creates a NEW Online account (new cloud identity).\n\n" +
  "Your current on-device data stays in this Local profile and does NOT move automatically.\n\n" +
  "To carry data over, export your Local data as JSON now (you can skip), then import it after your new Online account is ready. " +
  "The Local profile stays on this device \u2014 log out and back in with your local username + PIN to return to it.";

export const REREGISTER_EXPORT_TITLE = "Save Your Local Data?";
export const REREGISTER_EXPORT_MESSAGE =
  "Export your current Local data as JSON before switching? You can skip and do it later from Settings \u2192 Export Data (JSON).";

export const REREGISTER_FORM_TITLE = "Register Online Account";
export const REREGISTER_SUCCESS_TITLE = "Online Account Ready";
export const REREGISTER_SUCCESS_MESSAGE =
  "Your new Online account is ready with auto-backup ON.\n\n" +
  "To carry data over, use Import Data (JSON) in Settings with the file you exported \u2014 it will upload into your new Online account. " +
  "Your old Local profile is intact \u2014 log out and back in with your local username + PIN to return to it.";

export function isReregistrationAllowed(deviceOnline: boolean): boolean {
  return deviceOnline;
}

export function buildCloudRegisterPayload(
  email: string,
  pin: string
): { name: string; passcode: string; initialBalance: number } {
  return { name: email.trim(), passcode: pin.trim(), initialBalance: 0 };
}

export function isValidReregistrationEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

export function isValidReregistrationPin(pin: string): boolean {
  return /^\d{4}$/.test(pin.trim());
}

// Guard used by the Local autoBackup-ON toggle: when offline it MUST
// perform zero fetch calls and zero settings writes (ACC-05).
export function guardPromotionToggle(args: {
  deviceOnline: boolean;
  doFetch: () => void;
  doWrite: () => void;
}): { allowed: boolean; message: string | null } {
  if (!args.deviceOnline) {
    return { allowed: false, message: REREGISTER_CONNECT_MESSAGE };
  }
  args.doFetch();
  args.doWrite();
  return { allowed: true, message: null };
}

// --- SPEC-31 D-01: web never enters Local mode ---

export const WEB_LOGIN_CONNECT_MESSAGE =
  "Connect to the internet to log in to your Online account.";

export function isLocalAuthAllowed(platformOs: string): boolean {
  return platformOs !== "web";
}

// --- SPEC-31 D-05: Settings PIN verification matches login ---

export interface AuthLoginPayload {
  name: string;
  passcode: string;
  deviceId: string;
  force: boolean;
}

export function buildAuthLoginPayload(args: {
  name: string;
  passcode: string;
  deviceId: string;
  force: boolean;
}): AuthLoginPayload {
  return {
    name: args.name.trim(),
    passcode: args.passcode.trim(),
    deviceId: args.deviceId,
    force: args.force,
  };
}

// --- SPEC-38 D-06: register carries the device id (CON-10) ---
// Without it the server cannot attribute a session at creation time, and the
// account's first re-login is falsely reported as "another device" (spec §1.6).
// Purely additive: an unfixed server strips the unknown key and nothing changes.

export interface AuthRegisterPayload {
  name: string;
  passcode: string;
  initialBalance: number;
  deviceId: string;
}

export function buildAuthRegisterPayload(args: {
  name: string;
  passcode: string;
  initialBalance: number;
  deviceId: string;
}): AuthRegisterPayload {
  return {
    name: args.name.trim(),
    passcode: args.passcode.trim(),
    initialBalance: args.initialBalance,
    deviceId: args.deviceId,
  };
}

// Same read-or-generate scheme as app/login.tsx getDeviceId (stable per
// device; uuid loaded lazily so this module keeps zero static native imports).
export async function getOrCreateDeviceId(): Promise<string> {
  let deviceId = await AsyncStorage.getItem("localDeviceId");
  if (!deviceId) {
    const { generateUUID } = require("./uuid");
    deviceId = generateUUID() as string;
    await AsyncStorage.setItem("localDeviceId", deviceId);
  }
  return deviceId;
}

export type AuthLoginOutcome =
  | { outcome: "authenticated"; userId: string; token: string }
  | { outcome: "conflict" }
  | { outcome: "rejected" }
  | { outcome: "unreachable" };

// Mirrors app/login.tsx handleLogin semantics: ok + sessionConflict flag
// (same truthiness) routes to the conflict path, never to wrong-PIN copy.
export function classifyAuthLoginResult(args: {
  ok: boolean;
  status: number;
  body: unknown;
}): AuthLoginOutcome {
  if (!args.ok && args.status === 0) {
    return { outcome: "unreachable" };
  }
  const inner = (args.body as {
    data?: { sessionConflict?: unknown; user?: { id?: unknown }; token?: unknown };
  } | null)?.data;
  if (args.ok && inner?.sessionConflict) {
    return { outcome: "conflict" };
  }
  if (args.ok) {
    const userId = String(inner?.user?.id ?? "");
    const token = String(inner?.token ?? "");
    if (userId && token) {
      return { outcome: "authenticated", userId, token };
    }
  }
  return { outcome: "rejected" };
}

// All-optional so generic DB rows (Record<string, unknown>) satisfy it
// under strict mode; the matcher coerces with String() at runtime.
export interface StoredUserRow {
  id?: unknown;
  name?: unknown;
  passcode?: unknown;
}

// Local fallback matcher: exact id first, then case-insensitive name
// (a stale session id MUST NOT lock out the legitimate row owner).
export function findAuthUserRow<T extends StoredUserRow>(
  users: T[],
  args: { id: string; name: string }
): T | undefined {
  const byId = users.find((u) => String(u.id) === args.id);
  if (byId) return byId;
  const wanted = args.name.trim().toLowerCase();
  if (!wanted) return undefined;
  return users.find((u) => String(u.name ?? "").toLowerCase() === wanted);
}

// ACC-04 invariant checker: new cloud id differs + old keys byte-identical.
export function verifyReregistrationInvariants(args: {
  oldUserId: string;
  newUserId: string;
  beforeSnapshot: Record<string, string | null>;
  afterSnapshot: Record<string, string | null>;
}): { activeChanged: boolean; oldIntact: boolean } {
  const activeChanged =
    args.oldUserId !== args.newUserId && args.newUserId.length > 0;
  const oldKeys = Object.keys(args.beforeSnapshot).filter((k) =>
    k.startsWith(`user_${args.oldUserId}_`)
  );
  const oldIntact =
    oldKeys.length > 0 &&
    oldKeys.every((k) => args.afterSnapshot[k] === args.beforeSnapshot[k]);
  return { activeChanged, oldIntact };
}
