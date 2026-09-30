# Spec 28: Account Deletion 401 + Web Login Fallback

| Field | Value |
|---|---|
| ID | SPEC-28 |
| Title | Account Deletion 401 (Android) + Web Login Fallback After Delete |
| Status | **FINAL** (2026-09-29 per user call) |
| Owner | User (final authority) |
| Version | 1.0 — FINAL: v0.3 approved as-is (DEC-01 allow+warn, DEC-02 email-shape rule, DEC-03 clear-data deferred); implement exactly this |
| Scope | Delete-account flow (`settings.tsx` PIN-verify → `DELETE auth/account` → local wipe → logout); login fallback after a delete (`login.tsx` 401 vs offline paths, web Local-session guard) |
| Non-goals | New API endpoints; changing single-session enforcement (SPEC-05 stands); `handleClearData` rewrite (flagged, decision DEC-03); server-side changes |
| Normative source | This file, once marked FINAL. `AGENTS.md §4` is a pointer only. File+symbol cites are normative; `:line` numbers are hints only. |

## Terminology (RFC 2119)

The keywords **MUST**, **MUST NOT**, **SHOULD**, and **MAY** in this spec are
to be interpreted as described in RFC 2119. Informative prose (examples,
"today", "currently", "observed") is non-normative unless restated as a requirement.

## 1. Context

### 1.1 Problem (reported 2026-09-29)

Two symptoms, one area:

1. **Android — delete blows up with 401.** User tries to delete account and is
   met with `401 Unauthorized - clearing auth credentials` (`utils/apiClient.ts:50`).
   Session is wiped, user is bounced to login with a "Session Ended" alert for
   an action they initiated themselves; the server account is NOT deleted.
2. **Web — login after delete says offline/local.** After deleting from web and
   logging in again, the app shows offline ("No connection — checking this
   device…") or lands in a Local session — but Local accounts are banned on web
   (SPEC-04 CON-08).

### 1.2 Root causes (read-only investigation, non-normative)

**R-1 — Delete flow kills its own token (Android 401).** `verifyAccountPin`
(`app/(tabs)/settings.tsx:876-912`) verifies the PIN via
`POST {API_URL}/auth/login` with `force: true` and **discards the response**
(`verified = res.ok`). Under single-session enforcement (SPEC-05), that login
issues a NEW JWT and invalidates the current one — even though it came from the
same device (`verifyAccountPin` sends no `deviceId`, so the server treats it as
a new device). `executeDelete` (`settings.tsx:951-971`) then calls
`authFetch(DELETE auth/account)` with the now-dead token → 401 → the global
401 handler (`apiClient.ts:49-55`) wipes credentials and fires
`onAuthFailure('session_ended')` → nav guard (`_layout.tsx:128-139`) creates a
"Session Ended" alert and redirects. The user-initiated delete ends in a
session-kill UX and the server delete never applies.

**R-2 — `executeDelete` never inspects the DELETE result.** `authFetch` returns
`{ ok, status }`, it never throws for HTTP errors — so the `try` block ALWAYS
falls through to `clearAllLocalData + deleteUser + logout` and shows
"Account Deleted" SUCCESS even when the server returned 401/0. Success and
failure are indistinguishable, and the spurious `session_ended` race (R-1) runs
concurrently with the success dialog.

**R-3 — Web 401 path logs into a Local session with no guard.**
`attemptLocalLogin` (`app/login.tsx:61-114`) is web-guarded for the not-found
case only. The 401 path (`login.tsx:195-224`) does `login(localUser.id,
"local_token")` with **no `Platform.OS` check**: server reachable + explicitly
rejected (wrong PIN / deleted account) + any stale local `master_users` entry
with the same name → silent Local session, including on web where Local is
banned. `users.find(name match)` also picks the FIRST name match, so a stale
local UUID entry can shadow the Cloud identity.

**R-4 — Offline web login misleads.** `!API_URL` (`login.tsx:153-158`) and the
status-0 path (retries → transient notice → `attemptLocalLogin`) funnel web
users into local-only login with the generic "Local accounts use username +
PIN" info-box copy, so a deleted Cloud user on a broken connection reads
"offline or local" instead of "this account no longer exists / server
unreachable".

### 1.3 Purge audit (read-only investigation 2026-09-29 — what delete leaves today)

`executeDelete` runs `clearAllLocalData()` + `deleteUser(activeUserId)` + `logout()`.
`deleteUser` removes all `user_{U}_*` keys, so per-user AsyncStorage IS covered —
but the following survive and MUST be purged per CON-09:

| Survivor | Why it matters |
|---|---|
| Global `sync_queue` (`utils/syncQueue.ts:18`) | Queued items carrying the deleted user's `userId` persist; next login (any user) inherits a stale queue and stale pending counts |
| Global `last_synced_at` | Stale "Last sync" timestamp shown to the next user |
| In-memory `settingsCache` (`utils/cache.ts`) | `clearAllLocalData` never clears it and `logout()` only nulls `cachedUserId` — the next login in the same session reads the deleted user's settings |
| Receipt image files (`receipt_{txid}.jpg` in `documentDirectory`, plus `file://` originals in `receiptUrl`) | Never deleted — deleted account's receipt photos persist on disk (privacy leak + stale data) |
| `master_users` ghost rows | Covered by CON-06, restated in the purge for audit completeness |

MUST survive the purge: `localDeviceId` (device identity for future logins),
other users' `master_users` rows + `user_{other}_*` keys (shared device),
SecureStore (holds only `authToken`, removed by `logout()`), and user-created
export/backup files (`WiseWallet_Backup_*.json`, CSVs — explicit user artifacts,
not account data).

### 1.4 Definitions

**Self-killed token** — the current JWT invalidated by the app's own
`force: true` verify-login, discarded instead of stored.

**Ghost entry** — a `master_users` row surviving a delete (or a stale local
UUID row sharing a Cloud email's name) that a later login can match.

**Server-authoritative rejection** — HTTP 401 from a reachable server: the
server knows who you are and says no. MUST NOT be treated as "try local".

## 2. Constraints (normative once FINAL)

- **CON-01 — Verify-then-store.** The delete PIN verification MUST capture the
  fresh JWT from its own `force: true` login and store it via `login(userId,
  token)` BEFORE issuing `DELETE auth/account`. The implementation MUST NOT
  send an authenticated request with a token its own verify call just killed.
  (Fixes R-1 at the source rather than papering over the 401.)
- **CON-02 — No session-kill UX for user-initiated delete.** A 401 occurring
  inside the delete flow MUST NOT produce a "Session Ended" alert, MUST NOT
  redirect via the `session_ended` path, and MUST NOT wipe credentials ahead of
  the flow's own logout. Mechanism: `authFetch` MUST gain an opt-out for the
  global 401 side-effects (e.g. per-call `suppressAuthFailure`), used by the
  delete call; the flow then handles the result locally per CON-03.
- **CON-03 — Honest delete outcomes.** `executeDelete` MUST branch on the
  DELETE result: `ok` → "Account Deleted" (server + local gone);
  401/0/failure → local wipe + logout PLUS "Deleted from this device only —
  your cloud data may still exist. Log in again when online to retry the
  server delete." (or DEC-01 alternative). The word "Partial Deletion" MUST be
  replaced by copy that names which side survived. Success copy MUST NOT show
  unless the server confirmed.
- **CON-04 — Email names are server-authoritative on 401.** When cloud login
  returns 401 (reachable server, explicit rejection), an email-shaped name
  MUST hard-fail with "Login Failed — invalid email or PIN." and MUST NOT
  `login(..., "local_token")` on ANY platform. Local fallback on 401 is allowed
  ONLY for non-email (username) names, preserving offline-account auto-detect.
  (Fixes R-3; grandfathered web locals use non-email names, so SPEC-04 ACC-10
  is preserved.)
- **CON-05 — Web Local-session ban extended.** On `Platform.OS === "web"`, the
  app MUST NOT start a `local_token`/`offline_token` session from the 401 path.
  Combined with CON-04: web + email + 401 → hard fail; web + non-email + 401 →
  local lookup MAY proceed ONLY if a matching local entry exists (grandfathered
  PIN login), else hard fail; the "Create Offline Account" offer stays hidden
  on web (SPEC-04 CON-08/D-09 unchanged).
- **CON-06 — Ghost cleanup on delete.** After ANY delete completion (server-ok
  or local-only), `deleteUser(activeUserId)` MUST have removed the local
  identity row(s) so a later login cannot match a ghost. Where one human name
  maps to two rows (Cloud id + local UUID), BOTH rows for that name MUST be
  removed on delete. (Fixes R-3 shadowing.)
- **CON-07 — Offline-delete rule per DEC-01.** Default proposed: deleting while
  the server is unreachable (status 0 / no API_URL) is ALLOWED as local-only
  wipe but REQUIRES an explicit pre-confirm dialog stating "Server unreachable
  — your cloud data will REMAIN until you log in and delete again." Alternative
  (user call): block delete until online. Either way the pre-delete dialog copy
  MUST state the offline consequence before the user confirms.
- **CON-08 — Standing repo invariants (AGENTS.md §1).** MUST keep Android + iOS
  + Web working; MUST keep web Vercel-deployable; MUST NOT change storage keys,
  the `wallet-api` contract, AsyncStorage shapes, routes, or native deps unless
  this spec requires them.
- **CON-09 — Full device purge on delete (added per user 2026-09-29).** After
  ANY delete completion (server-ok or local-only), the app MUST remove every
  trace of the deleted user `U` from the device: all `user_{U}_*` keys (via
  `deleteUser`, as today); `sync_queue` items with `data.userId === U` (items
  of OTHER users on a shared device MUST be preserved); `last_synced_at`
  (display-only, reset); in-memory `settingsCache` via `clearSettingsCache()`
  (`cachedUserId` already nulled by `logout()` — purge MUST run before or with
  logout, never after a new login); receipt image files referenced by U's
  transactions (`file://` `receiptUrl`s + `receipt_{txid}.jpg`), collected
  BEFORE the repo wipe, each deletion individually try/caught so one missing
  file never aborts the purge. MUST PRESERVE: `localDeviceId`, other users'
  rows/keys, SecureStore contents (only `authToken`, handled by `logout()`),
  user-created export/backup files. Web: same AsyncStorage keys apply
  (localStorage-backed); file deletion is best-effort guarded.

## 3. Goal

| Scenario | Before (today) | After (FINAL) |
|---|---|---|
| Android Cloud delete, online, correct PIN | 401 → credentials wiped → "Session Ended" → server account SURVIVES, local wiped, "Account Deleted" lie | Fresh token stored → DELETE ok → "Account Deleted", clean logout to `/login`, no session alert |
| Android Cloud delete, token already dead (401) | Same as above | Suppressed 401 handling → local wipe + "Deleted from this device only…" + clean logout, no session alert |
| Web delete then login (account gone server-side) | Offline notice and/or silent Local session | Email + 401 → "Login Failed — invalid email or PIN." No local session, no offline upsell |
| Web grandfathered local (non-email), server unreachable | PIN login works (ACC-10) | Unchanged — still works |
| Mobile Offline account "john", server reachable (401 unknown user) | Falls back to local login | Unchanged — still works (non-email rule) |
| Delete while offline | Silent "Partial Deletion" | Explicit pre-confirm (DEC-01) + honest outcome copy |

Open decisions (RESOLVED per user 2026-09-29):

- **DEC-01: RESOLVED → allow + warn.** Offline delete wipes local-only after an
  explicit pre-confirm stating cloud data REMAINS; CON-07 default stands.
- **DEC-02: RESOLVED → email-shape rule accepted.** CON-04/CON-05 stand as written.
- **DEC-03: RESOLVED → follow-up spec.** `handleClearData` keeps its current
  behavior; a later spec addresses its force-login pattern. This spec MUST NOT
  touch it.

### Acceptance criteria

Objective (machine-checkable, `jest` parameterized by `Platform.OS` =
`android`/`ios`/`web` via mock):

- **ACC-01:** delete PIN-verify stores the fresh token (mock `POST /auth/login
  force:true` → captures `login(userId, token)` call) before `DELETE
  auth/account` is issued; the DELETE carries the NEW token, not the old one.
- **ACC-02:** `DELETE` returning 401 with suppression opted in does NOT invoke
  `onAuthFailure` and does NOT clear stored credentials ahead of flow logout.
- **ACC-03:** `DELETE ok:false` (any status) never shows the success copy;
  outcome copy names the surviving side.
- **ACC-04:** email-shaped name + cloud 401 → no `login()` call with any local
  token, on all three platforms.
- **ACC-05:** non-email name + cloud 401 + matching local entry → local login
  still occurs (all platforms); without a matching entry → hard fail.
- **ACC-06:** after delete completion, `getUsers()` contains no row with the
  deleted id AND no row with the deleted name.
- **ACC-11 (objective):** post-delete storage audit — `sync_queue` contains no
  item with `data.userId === U` (other users' items intact); `settingsCache`
  empty; `getItem(user_{U}_*)` null for all U keys; receipt-file collector
  returns exactly U's referenced files (parameterized android/ios/web).
- **ACC-12 (subjective):** reviewer deletes an account with receipts + queued
  offline writes, then checks: re-login shows no stale pending counts, no old
  "Last sync" time, no ghost name match, and the receipt photos are gone from
  the device — while a second account on the same device is untouched.

Subjective (human-judged, observable reviewer checks):

- **ACC-07:** reviewer deletes a Cloud account on Android (Expo Go): no 401 in
  logs, "Account Deleted" shows, lands on `/login` with NO "Session Ended"
  notification.
- **ACC-08:** reviewer deletes from web export, then logs in with the same
  email+PIN: sees "Login Failed — invalid email or PIN.", never an offline
  banner, never a local session, no red-box.
- **ACC-09:** reviewer with a grandfathered web local (non-email) logs in with
  PIN while offline: still succeeds (SPEC-04 ACC-10 preserved).
- **ACC-10:** reviewer attempts delete with airplane mode ON: pre-confirm
  states the cloud-data consequence (wording per DEC-01 outcome).

## 4. Deliverables

- **D-01 — Verify stores token (`settings.tsx verifyAccountPin`).** Parse
  `user.id` + `token` from the verify-login response and `login()` immediately;
  return `{ verified }` as today otherwise. iOS/Android/Web identical.
- **D-02 — Honest `executeDelete`.** Branch on the DELETE `ApiResult`
  (`ok` / 401 / 0): server-ok → success copy; else local wipe + surviving-side
  copy (CON-03); both paths end in explicit `logout()` + `/login`. No success
  copy without server confirmation.
- **D-03 — `authFetch` 401 opt-out (`utils/apiClient.ts`).** Per-call flag
  (e.g. `suppressAuthFailure`) skipping `clearAuthStorage` + `onAuthFailure`;
  result still returned normally. Used by the delete call only (plus DEC-03
  scope if accepted). Zero behavior change for all other callers.
- **D-04 — Login 401 arbiter (`app/login.tsx`).** Email regex (same as
  register) gates the 401 local-fallback: email → hard "Login Failed";
  non-email → local lookup as today. Web additionally never mints local_token
  from this path (CON-05). Offline (status-0) path untouched.
- **D-05 — Ghost cleanup.** Delete removes all `master_users` rows for the id
  AND the name (Cloud id + local UUID duplicates); covered by ACC-06.
- **D-06 — Tests + manual proof.** `jest` file(s) for ACC-01..06 + ACC-11
  parameterized over `android`/`ios`/`web`; user-run Expo Go (Android+iOS) +
  `expo export --platform web` for ACC-07..10 + ACC-12. No platform-only
  behavior without its `CON-*` + `ACC-*` + `D-*`.
- **D-08 — Device purge on delete (added per user 2026-09-29).** New testable
  helpers (e.g. in `utils/`): queue filter removing only U's items; receipt-file
  collector from U's transactions (run BEFORE repo wipe); purge sequence wired
  into BOTH `executeDelete` outcomes (server-ok and local-only): deleteUser →
  queue filter → `last_synced_at` reset → `clearSettingsCache()` → receipt
  deletions (each try/caught) → `logout()`. `localDeviceId`, other users, and
  export/backup files MUST be untouched (asserted in ACC-11/12).
- **D-07 — Docs.** Append `docs/savepoint.md` + `AGENTS.md §3` after FINAL
  implementation. No normative change via docs alone.

## Glossary

| Term | Meaning |
|---|---|
| Self-killed token | Current JWT invalidated by the app's own discarded `force: true` login |
| Ghost entry | Local identity row surviving a delete that a later login can wrongly match |
| Server-authoritative rejection | Reachable-server 401: the server knows and says no — never fall back to local |
| Suppressed 401 | `authFetch` call opting out of global credential wipe + session alert |

## References

- `AGENTS.md §1` — working agreements (spec-first, no CLI, invariants, docs).
- `specs/04-connection-status-vs-offline-mode.md` — CON-08, D-09, ACC-10
  (web local rules, grandfathered PIN login).
- `specs/05-multi-device-behavior.md` — session-kill alert path reused by R-1.
- `app/(tabs)/settings.tsx` — `verifyAccountPin` (:876), `executeDelete`
  (:951), `handleClearData` (:602, same pattern, DEC-03).
- `utils/apiClient.ts` — 401 handler (:49-55); `app/_layout.tsx` — session
  nav guard (:128-139); `app/login.tsx` — 401 path (:195-224), offline path
  (:225-230), `attemptLocalLogin` (:61-114).
