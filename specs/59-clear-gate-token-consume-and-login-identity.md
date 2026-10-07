# SPEC-59 — Clear/Delete PIN gates: consume fresh token + login identity

| Field   | Value                                                        |
|---------|--------------------------------------------------------------|
| ID      | SPEC-59                                                      |
| Title   | Clear/Delete PIN gates: consume fresh token + login identity |
| Status  | FINAL (user-marked 2026-10-07)                                      |
| Owner   | User                                                         |
| Version | v0.1                                                         |
| Scope   | Client only (`wise_wallet`): Settings gates + identity source |
| Non-goals | wallet-api change; PasscodeContext; secureStorage; master_users shape/hash; Change-passcode + Verify-&-Sync success paths (byte-identical) |

## Terminology

RFC 2119 keywords MUST, MUST NOT, SHOULD, MAY apply. "Oracle" = the `auth/login` call used only to check a PIN. "Consume" = persisting the returned session via `login(id, token)`. "Login identity" = the exact `name` string the server registered (`users.name`). "Leg 1 / leg 2" = server check / local `verifyLocalPin` fallback.

## Context

SPEC-51 made `auth/login` the converged PIN oracle for all three Settings gates. Traced against `wallet_API` source: every successful login rotates `currentSessionId` even with no `deviceId` (`authService.js:92`) and mints a sid-bound JWT; `protect.js:28` rejects any older sid. The Clear/Delete paths discard the fresh token, so their follow-up deletes 401 (guaranteed "Partial Clear" + spurious session-kill). All three gates send `profile?.name` while the server matches `users.name`. On web leg 2 is unseeded by SPEC-36 design, so any leg-1 failure rejects.

## Constraints

- CON-59-01: The change MUST be client-only; no `wallet-api` file is touched.
- CON-59-02: Offline behavior MUST stay fail-closed with the exact SPEC-51 copies ("Incorrect PIN. Please try again.", "Connect to enable cloud sync.").
- CON-59-03: SPEC-36 no-seeding MUST NOT be weakened — the persisted identity string is not an auth row and MUST NOT carry any credential.
- CON-59-04: Change-passcode and Verify-&-Sync success paths MUST stay byte-identical.
- CON-59-05: No new dependencies, no storage-key renames, no migration of existing keys/rows.
- CON-59-06: No platform-only behavior without ACC-* + D-* coverage (AGENTS §1.10).

## Goal

- DEC-59-01: On leg-1 success, Clear and Delete gates MUST consume the token via `login(activeUserId, freshToken)` — the `settings.tsx:212` pattern — before opening the confirm step.
- DEC-59-02: All three gates MUST send the login identity. Source: `authName` persisted at login/register/Make-Online on all platforms (new additive AsyncStorage key `authName`, device-global, non-secret; rollback = delete the key). Fallback when absent: empty string (server 401s → existing leg-2/fail-closed path, copies unchanged).
- ACC-59-01 (Objective): `utils/clearGateWeb.test.ts` guards assert `handleClearData` and `verifyAccountPin` call `login(` with the response token on ok — android/ios/web.
- ACC-59-02 (Objective): guards assert none of the three gates sends `profile?.name` — android/ios/web.
- ACC-59-03 (Objective): `pinGate.test.ts` + `pinChange.test.ts` stay green unmodified (fallback + Change untouched).
- ACC-59-04 (Objective): `npm run lint`, `npx tsc --noEmit` clean; no new dependency.
- ACC-S01 (Subjective): reviewer enters the correct PIN in the Clear gate on web — gate passes, cloud deletes succeed, no session-ended alert, no "Partial Clear."
- ACC-S02 (Subjective): reviewer repeats on native + offline — native regression-free, offline fail-closed copy exact.

## Deliverables

- D-59-01: This spec, marked FINAL by the user.
- D-59-02: `app/(tabs)/settings.tsx` — `handleClearData` consumes the token (S1).
- D-59-03: `app/(tabs)/settings.tsx` — `verifyAccountPin` consumes the token (S2).
- D-59-04: login identity persistence (`app/login.tsx`, `app/register.tsx`, Make-Online at `settings.tsx:473`) + all three gates send it (S3).
- D-59-05: `utils/clearGateWeb.test.ts` ACC-01/02 (S4).
- D-59-06: `docs/savepoint.md` + `AGENTS.md` §3 entries (S5).

## Glossary

Oracle, consume, login identity, leg 1, leg 2 — as under Terminology. sid = server session id bound into post-API-02 JWTs.

## References

- SPEC-51 (gates), SPEC-36 CON-W-03 (no-seeding), SPEC-35 (PasscodeContext frozen), SPEC-05 D-MD-01 (session-ended flow)
- `app/(tabs)/settings.tsx:324, :798, :1029` · `app/login.tsx:204-209` · `app/register.tsx:83-90`
- `D:\hobby\wallet_API\src\services\authService.js:68-110` · `src\middlewares\protect.js:24-30`
