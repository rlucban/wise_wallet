// SPEC-38 — Precise 401 cause classification.
// SPEC-05 collapsed every 401 into one alert claiming "another device". The
// server never actually revoked a session (§1.5 P-01..P-07 pending), so that
// claim was almost always false — a plain expiry told the user another device
// had kicked them. Fail-safe by design (CON-03): a message we cannot match
// downgrades to `auth_failed` and never upgrades to a claim.
export type AuthFailureReason =
  | "session_revoked"
  | "token_expired"
  | "token_invalid"
  | "auth_failed";

// Messages the server returns today (src/middlewares/protect.js), plus the P-04
// one it will return once session revocation is enforced.
export const SESSION_REVOKED_MESSAGE = "Session ended on another device";
export const TOKEN_EXPIRED_MESSAGE = "Your token has expired, please log in again";
export const TOKEN_INVALID_MESSAGE = "Invalid token, please log in again";
export const TOKEN_GONE_MESSAGE = "The user belonging to this token no longer exists.";

// `session_revoked` is announced by the persistent "Session Ended" system alert
// (CON-04), so it needs no transient notice. `auth_failed` claims nothing because
// nothing is known (CON-03).
export const AUTH_FAILURE_NOTICES: Record<AuthFailureReason, string | null> = {
  session_revoked: null,
  token_expired: "Your session expired. Please log in again.",
  token_invalid: "Your session is no longer valid. Please log in again.",
  auth_failed: null,
};

// Matched case-sensitively after trimming (ACC-03 "exact message only"). Both
// sides of this contract are ours: P-04 fixes the server string and the three
// existing messages are literals in protect.js. If server casing ever changes we
// silently degrade to `auth_failed` — which asserts nothing — rather than risk
// matching the wrong thing.
const normalize = (message: string): string => message.trim();

// CON-05: the server's error handler returns `message` (there is no `error` key);
// `error` stays supported as a fallback. Non-object bodies are never inspected.
export function extractErrorMessage(body: unknown): string | null {
  if (!body || typeof body !== "object" || Array.isArray(body)) return null;
  const record = body as Record<string, unknown>;
  for (const key of ["message", "error"]) {
    const value = record[key];
    if (typeof value === "string" && value.trim().length > 0) return value.trim();
  }
  return null;
}

export function classifyAuthFailure(input: {
  status: number;
  body?: unknown;
}): AuthFailureReason {
  if (input.status !== 401) return "auth_failed";
  const message = extractErrorMessage(input.body);
  if (!message) return "auth_failed";

  const normalized = normalize(message);
  if (normalized === normalize(SESSION_REVOKED_MESSAGE)) return "session_revoked";
  if (normalized === normalize(TOKEN_EXPIRED_MESSAGE)) return "token_expired";
  if (normalized === normalize(TOKEN_INVALID_MESSAGE)) return "token_invalid";
  if (normalized === normalize(TOKEN_GONE_MESSAGE)) return "token_invalid";
  return "auth_failed";
}

// CON-04: the SPEC-05 alert is created for revocation ONLY.
export function shouldPersistSessionEndedAlert(reason: AuthFailureReason): boolean {
  return reason === "session_revoked";
}

export function getAuthFailureNotice(reason: AuthFailureReason): string | null {
  return AUTH_FAILURE_NOTICES[reason] ?? null;
}
