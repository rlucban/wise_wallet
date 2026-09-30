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
