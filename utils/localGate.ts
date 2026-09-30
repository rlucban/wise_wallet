// SPEC-30 — Local creation gate + re-registration promotion helpers.
// Pure, zero-network, Expo Go safe, web-safe (no native imports).

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
  "To carry data over, use Import Data (JSON) in Settings with the file you exported. " +
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
