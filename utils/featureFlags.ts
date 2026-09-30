// SPEC-35 D-01 — admin feature flags (env-gated).
// EXPO_PUBLIC_ADMIN_TOGGLE === "true" (exact match) enables admin-only UI
// such as the login database-reset button. Anything else (false, absent,
// any other value) means OFF. NOTE: Metro inlines env at build time, so
// flipping the flag requires a rebuild/restart — never toggles at runtime.
// Setting it "true" in any build requires an explicit user order.

export function isAdminToggleOn(): boolean {
  // Direct member access (not via globalThis): Metro statically inlines
  // process.env.EXPO_PUBLIC_* at bundle time; indirection breaks that.
  return process.env.EXPO_PUBLIC_ADMIN_TOGGLE === "true";
}
