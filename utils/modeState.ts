// SPEC-36 — Token-only mode truth helpers.
// Pure, zero-network, Expo Go/web-safe (no static native-only imports).
const LOCAL_TOKENS = new Set(["offline_token", "local_token"]);

function isLocalAccountToken(token: string | null): boolean {
  return token !== null && LOCAL_TOKENS.has(token);
}

export interface ModeState {
  isLocal: boolean;
  autoBackup: boolean;
}

export interface ModeStateInput {
  token: string | null;
  profileName?: string;
  profileAutoBackup?: boolean;
}

export function resolveModeState(input: ModeStateInput): ModeState {
  const isLocal = isLocalAccountToken(input.token);
  const autoBackup = isLocal ? false : input.profileAutoBackup ?? true;
  return { isLocal, autoBackup };
}

export function resolveDataPlane(
  isLocal: boolean,
  autoBackup: boolean,
  platform: string
): boolean {
  return !isLocal && (platform === "web" || autoBackup);
}

export type ToggleRoute = "reregister" | "pin-verify" | "disable" | "noop";

export function resolveToggleRoute(isLocal: boolean, val: boolean): ToggleRoute {
  if (isLocal) {
    return val ? "reregister" : "noop";
  }
  return val ? "pin-verify" : "disable";
}

// --- SPEC-39 — web auto-backup is a hard rule, not a preference ---
// `autoBackup` is mobile intent: it is only consulted on native. Web is
// unconditionally live (see resolveDataPlane in utils/apiOnly.ts), so the value
// the switch displays MUST equal the value that actually governs behavior, and
// web MUST never write the shared profile flag (CON-01).

export const WEB_AUTOBACKUP_ALWAYS_ON =
  "Always on for web. The browser app has no local-only mode, so every change is saved to your cloud account as you make it. Manage this setting from the mobile app.";

export const WEB_AUTOBACKUP_DEVICE_NOTE =
  "Your mobile device has auto-backup off, so its data stays on that phone. Using this browser did not change that.";

// --- SPEC-40 — the control is a data-plane selector, and says so ---

export const SYNC_ROW_LABEL = "Cloud sync";

export const SYNC_STATE_LIVE =
  "Live — every change is saved to your cloud account as you make it.";

export const SYNC_STATE_OFF =
  "Off — this device keeps its own copy and syncing is paused.";

// Mirrors `isAutoBackupOn` in utils/apiOnly.ts: a PRESENT per-device value wins
// outright, the profile is only a seed for a device with no stored value, and
// Cloud-default ON is the last resort. ACC-05 pins the two implementations
// together so the Settings display can never drift from the plane the data
// layers actually use; ACC-08 pins the legacy store='true' + profile=false case.
function resolveEffectiveAutoBackup(
  storeValue: string | null | undefined,
  profileValue?: boolean
): boolean {
  if (storeValue === "true") return true;
  if (storeValue === "false") return false;
  if (typeof profileValue === "boolean") return profileValue;
  return true;
}

export interface AutoBackupControl {
  /** What the switch shows. MUST equal the value that actually governs behavior. */
  effective: boolean;
  /** Whether the user may change it. */
  writable: boolean;
  /** Web is live while the PROFILE says false (set on another device). */
  deviceDiffers: boolean;
  lockedCopy: string | null;
}

export interface AutoBackupControlInput {
  token: string | null;
  profileName?: string;
  profileAutoBackup?: boolean;
  /** Raw per-device settings value: 'true' | 'false' | null | undefined. */
  deviceSettingValue?: string | null;
  platformOs: string;
}

export function resolveAutoBackupControl(input: AutoBackupControlInput): AutoBackupControl {
  const { isLocal } = resolveModeState(input);

  if (isLocal) {
    // SPEC-30 D-03 — Local stays off and writable; ON routes to the
    // re-registration flow. Unchanged on every platform (CON-06). The switch row
    // is not rendered for Local at all (SPEC-40 CON-06).
    return { effective: false, writable: true, deviceDiffers: false, lockedCopy: null };
  }

  if (input.platformOs === "web") {
    // SPEC-39 — always live, never writable, and the divergence note describes
    // the OTHER device, so it tests the profile, not this device's store.
    return {
      effective: true,
      writable: false,
      deviceDiffers: input.profileAutoBackup === false,
      lockedCopy: WEB_AUTOBACKUP_ALWAYS_ON,
    };
  }

  return {
    effective: resolveEffectiveAutoBackup(input.deviceSettingValue, input.profileAutoBackup),
    writable: true,
    deviceDiffers: false,
    lockedCopy: null,
  };
}
