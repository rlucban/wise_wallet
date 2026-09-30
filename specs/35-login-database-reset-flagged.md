# Spec 35: Login-Screen Database Reset (Feature-Flagged, Off by Default)

| Field | Value |
|---|---|
| ID | SPEC-35 |
| Title | "Reset all data" button on login behind a disabled-by-default feature flag |
| Status | **FINAL** (2026-09-30 per user call) |
| Owner | User (final authority) |
| Version | 1.1 — FINAL: v1.0 + server account-delete attempt (stored token only, no DDL); implement exactly this (flag ships OFF) |
| Scope | One button + two-step confirm on `app/login.tsx` that deletes the stored-token account server-side (if any) AND wipes device-local data; flag definition (env `EXPO_PUBLIC_ADMIN_TOGGLE`, default off) |
| Non-goals | Server endpoint changes (reuses existing `DELETE auth/account`); automatic/stale-session wipes; enabling the flag (separate explicit order); login or credential prompts |
| Normative source | This file, once marked FINAL. `AGENTS.md §4` is a pointer only. File+symbol cites are normative; `:line` numbers are hints only. |

## Terminology (RFC 2119)

The keywords **MUST**, **MUST NOT**, **SHOULD**, and **MAY** in this spec are
to be interpreted as described in RFC 2119. Informative prose (examples,
"today", "observed") is non-normative unless restated as a requirement.

## 1. Context

### 1.1 Request (2026-09-30)

Add a button on the login page that resets and deletes all files in the
database. It MUST be feature-flagged, and the flag MUST stay off for now —
spec only, no implementation, no enablement.

### 1.2 Current state (non-normative, observed)

- `utils/db.ts` `hardResetLocalData()` wipes every AsyncStorage key except
  `system_reset_epoch` and clears the settings cache. It does NOT delete
  receipt image files, the SecureStore token, or in-memory `cachedUserId`.
- SPEC-28's purge (`collectReceiptFiles`, per-user key removal) covers
  receipt files and ghost rows but assumes an authenticated delete flow.
- The login screen has no destructive action today; its dialogs are
  failure/notice/register routing only.

## 2. Constraints (normative once FINAL)

- **CON-01 — Env-gated, default off.** The button is gated on the
  environment variable `EXPO_PUBLIC_ADMIN_TOGGLE === "true"` (exact,
  case-sensitive string match), read through a `utils/featureFlags.ts`
  helper (e.g. `isAdminToggleOn()`). `false`, absent, or any other value
  means OFF: login renders EXACTLY as today — no button, no placeholder, no
  layout gap. The `EXPO_PUBLIC_` prefix is REQUIRED (only such vars are
  inlined into app code by Expo/Metro, including Vercel builds). The wipe
  implementation MUST exist but be unreachable from UI while the flag is
  off. NOTE: Metro inlines env at build time, so flipping the flag requires
  a rebuild/restart — it MUST NOT be expected to toggle at runtime.
  Setting the flag `true` in any build is a separate explicit user order
  (not part of this spec's deliverables).
- **CON-02 — Server account delete, then local wipe. No DDL, ever.** The
  reset MUST first attempt `DELETE auth/account` (the existing SPEC-28
  endpoint — row/account deletion only; no table drop exists or is added)
  using ONLY the token already stored on the device, with 401 side-effects
  suppressed (no session-kill UX, no credential wipe ahead of the flow, no
  login, no credential prompts — the flag is the authorization, per user
  2026-09-30). No stored token, unreachable server, or non-ok result MUST
  NOT block the reset: the flow ALWAYS continues to the device wipe. Then
  it MUST delete device-local state: all AsyncStorage keys (reuse
  `hardResetLocalData()`), the SecureStore `authToken`, in-memory
  `cachedUserId` + settings cache, and receipt image files (reuse the
  SPEC-28 collector: `file://` originals + `receipt_{txid}.jpg` copies,
  each deletion individually try/caught). MUST PRESERVE: `localDeviceId`,
  `system_reset_epoch`, and user-created export/backup files
  (`WiseWallet_Backup_*.json`, CSVs). LIMIT DISCLOSED: without credentials
  the server can only delete the account tied to the stored token — if the
  token belongs to user A, user A's cloud account is deleted; with no token
  nothing server-side happens. The confirm copy MUST state this.
- **CON-03 — Two-step confirm with honest copy.** Step 1 dialog (destructive
  styling): "Reset all data on this device?" stating (a) EVERYTHING on this
  device is deleted including Local-only accounts (permanent, no recovery),
  (b) it ALSO attempts to delete the cloud account tied to this device's
  stored session (if any) — no login needed, no choosing which account — and
  (c) with no usable session, or if the server call fails, cloud data
  REMAINS and only the device is wiped. Step 2 requires an explicit checkbox
  ("I understand all device data will be permanently deleted") before
  [Delete Everything] enables. Either step cancellable with zero side effects.
- **CON-04 — Clean landing with honest outcome.** After wipe: name/PIN
  inputs cleared, no session started, user stays on `/login`. Server DELETE
  ok → success notice ("Account and device data deleted."). Otherwise →
  error-styled notice ("Deleted From This Device Only — cloud data may still
  exist."). The next login MUST NOT observe any previous session (ties to
  SPEC-31 hygiene).
- **CON-05 — All platforms identical.** Android, iOS, Web (localStorage).
  Receipt-file deletion is best-effort guarded where files don't exist
  (web). No new native deps; Expo Go MUST NOT crash.
- **CON-06 — Standing repo invariants (AGENTS.md §1).** MUST keep Android +
  iOS + Web working; MUST keep web Vercel-deployable; MUST NOT change
  storage keys, the `wallet-api` contract, routes, or native deps.

## 3. Goal

| Scenario | After (FINAL, flag still OFF) |
|---|---|
| Login screen, flag off (default) | Pixel-identical to today; no reset affordance anywhere |
| Login screen, flag on (future order) | Subtle "Reset all data" text-button below the info box |
| Reset step 1 → Cancel | Zero writes/deletes, zero API calls, back to login |
| Reset step 2 confirmed, stored token + server ok | Cloud account deleted AND device wiped; inputs cleared; success notice; stay on login |
| Reset step 2 confirmed, no token / offline / rejected | Device wiped only; "Deleted From This Device Only" notice; inputs cleared; stay on login |
| Reset with Local-only data on device | Destroyed permanently (stated in copy — no recovery path by design) |
| Reset then login with cloud email (server delete succeeded) | Login Failed (account gone) — proves the server delete landed |

Open decisions: none proposed — DEC-01: env flag `EXPO_PUBLIC_ADMIN_TOGGLE`
(read via helper, not remote, not code const); DEC-02: local-only, honest
copy; DEC-03: two-step with checkbox (no type-to-confirm); DEC-04: preserve
device id, reset epoch, user files.

### Acceptance criteria

Objective (machine-checkable, `jest` parameterized by `Platform.OS` =
`android`/`ios`/`web` via mock):

- **ACC-01:** flag helper returns `false` when `EXPO_PUBLIC_ADMIN_TOGGLE`
  is unset, `"false"`, or any non-`"true"` value, and `true` only for exact
  `"true"` (unit test manipulating `process.env` per platform).
- **ACC-02:** `login.tsx` gates the reset button block on the flag helper
  identifier (string-scan), so all default builds render no reset UI.
- **ACC-03:** wipe helper deletes all AsyncStorage keys except
  `localDeviceId`/`system_reset_epoch`, clears both token stores +
  `cachedUserId` + settings cache, attempts every collected receipt file,
  attempts at most one `DELETE auth/account` (suppressed 401 handling, no
  `/auth/login` call ever), and makes no other `fetch` calls (fetch spy +
  storage snapshot diff).
- **ACC-04:** cancelling at either step performs zero `setItem`/`removeItem`
  calls (dialog dismissal only).

Subjective (human-judged, observable reviewer checks; run only under a
temporary local flag flip, reverted before merge):

- **ACC-05:** reviewer on Android Expo Go with the flag temporarily on:
  button visible below info box; step 1 states device-destroyed +
  stored-session-account-deleted + no-token-means-device-only; checkbox gates
  [Delete Everything]; confirm with a live session deletes the server
  account (verified: re-login with that email fails) AND wipes the device,
  clears inputs, stays on login; airplane-mode run wipes device only with
  the honest notice; no red-box.
- **ACC-06:** reviewer on web export (flag off): login pixel-identical to
  today, no gap where the button would be.

## 4. Deliverables

- **D-01 — Flag module.** `utils/featureFlags.ts` (or equivalent single
  home) exporting `isAdminToggleOn()` reading
  `process.env.EXPO_PUBLIC_ADMIN_TOGGLE === "true"`, with a comment that
  setting it `true` in any build requires an explicit user order and a
  rebuild.
- **D-02 — Wipe helper.** Tested unit attempting one suppressed
  `DELETE auth/account` with the stored token (skip when absent) reusing
  `hardResetLocalData()` + `removeSecureItem('authToken')` +
  `clearSessionCaches()` + SPEC-28 receipt collection, with the CON-02
  preserve list and honest outcome branching.
- **D-03 — Login UI.** Flag-gated subtle button + two-step confirm dialogs
  per CON-03/CON-04 (keyboard-safe per SPEC-32, web-safe copy).
- **D-04 — Tests.** `jest` for ACC-01..04 parameterized over
  `android`/`ios`/`web`; manual ACC-05/06 run against a temporary local
  flag flip only (flag ships `false`).
- **D-05 — Docs.** `docs/savepoint.md` + `AGENTS.md §3` record spec +
  implementation, explicitly noting the flag ships OFF.

## Glossary

| Term | Meaning |
|---|---|
| Database reset | Deleting all device-local app state (AsyncStorage, token, caches, receipt files) |
| Feature flag | Env `EXPO_PUBLIC_ADMIN_TOGGLE === "true"` (else off) read via helper; UI unreachable while off; rebuild required to flip |

## References

- `AGENTS.md §1` — working agreements (spec-first, no CLI, invariants, docs).
- `app/login.tsx` (host screen; dialogs, info box, keyboard-safe layout).
- `utils/db.ts` (`hardResetLocalData`), `utils/secureStorage.ts`,
  `utils/cache.ts`, `utils/accountDelete.ts` (receipt collection),
  `specs/28-account-deletion-401-and-web-login-fallback.md` (honest-outcome
  copy precedent, preserve list), `specs/31-*` (post-wipe session hygiene),
  `specs/32-*` (dialog keyboard safety).
