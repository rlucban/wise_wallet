# Spec 31: Web Never-Local + Logout Session Hygiene

| Field | Value |
|---|---|
| ID | SPEC-31 |
| Title | Web never enters Local mode; logout clears session + caches, preserves stored data |
| Status | **FINAL** (2026-09-30 per user call) |
| Owner | User (final authority) |
| Version | 1.0 — FINAL: v0.3 draft approved as-is; implement exactly this |
| Scope | Web auth paths (`app/login.tsx`, `app/register.tsx`) + logout (`context/AuthContext.tsx`, caches) + Settings PIN verification (`verifyPinForSync`, `verifyAccountPin`, clear-data PIN check) on all platforms |
| Non-goals | Sync engine changes (SPEC-27/29 stand); delete flow (SPEC-28 stands); server changes; email-taken re-register dialog (pending SPEC-30 v1.1, separate) |
| Normative source | This file, once marked FINAL. `AGENTS.md §4` is a pointer only. File+symbol cites are normative; `:line` numbers are hints only. |

## Terminology (RFC 2119)

The keywords **MUST**, **MUST NOT**, **SHOULD**, and **MAY** in this spec are
to be interpreted as described in RFC 2119. Informative prose (examples,
"observed", "incident") is non-normative unless restated as a requirement.

## 1. Context

### 1.1 Incident (reported 2026-09-30, non-normative)

A user registered + logged in on web, then logged in on Android with the same
email + PIN. Web Settings showed "Local-only account" with one dataset;
Android showed "Cloud Sync Enabled" with another. Logging web out and back in
resolved it: web was sitting in a stale `local_token` session while Android
held the Cloud JWT — two modes, two datasets, by design.

### 1.2 Root causes (non-normative, observed)

1. `app/login.tsx` `attemptLocalLogin` matches **any** `master_users` row by
   name (including cloud rows written at register time) and issues
   `"local_token"`. On web it runs when the API is unreachable (retry
   exhaustion → transient notice → local lookup) or `API_URL` is unset —
   a spec-compliant fallback per SPEC-30 D-02, but it puts web into Local mode.
2. `app/(tabs)/settings.tsx:233-236` `isUsernameOnly` forces the Local display
   even for non-local tokens when `profile.name` is not email-shaped.
3. Logout clears only `activeUserId` + token; `cachedUserId`
   (`utils/cache.ts`) and the settings cache persist, so stale session state
   can leak into the next session.

### 1.3 User decisions (2026-09-30)

- **Web MUST NEVER be Local.** No `local_token`/`offline_token` sessions on
  web, no fallback lookup, no grandfathered exception (SPEC-04 ACC-10 retired).
- **Logout clears session + caches only.** Stored per-user keys, `master_users`,
  and queues are preserved; Local accounts survive logout (SPEC-30 CON-03
  recovery path intact).
- **Settings PIN checks MUST match login.** Auto-backup-ON verify, delete
  verify, and clear-data PIN check carry the same `deviceId` as login and
  report session-conflict honestly (approved for spec 2026-09-30).

### 1.4 PIN verification failures (reported 2026-09-30, non-normative)

Online account, auto-backup OFF → ON, correct PIN → "PIN Doesn't Match"
dialog. Same false "Invalid PIN" in Delete Account with the known-good PIN.
Observed cause: `verifyPinForSync`, `verifyAccountPin`, and the clear-data
PIN check POST `/auth/login` **without** `deviceId` (login sends
`{ name, passcode, deviceId, force }`), so the server rejects a call the
client then misreports as a wrong PIN. `verifyPinForSync` also ignores the
`sessionConflict` flag that `handleLogin` handles, and the delete local
fallback matches `master_users` by `id` only.

## 2. Constraints (normative once FINAL)

- **CON-01 — Web never local.** On `Platform.OS === "web"`, auth paths MUST
  NEVER issue `offline_token`/`local_token` and MUST NEVER consult
  `master_users` for login. `attemptLocalLogin` (or its successor) MUST early-
  out on web with zero `AsyncStorage` writes and zero session change.
  Unreachable API on web → "Connect to the internet…" notice, no session.
  Unknown user on web → plain "Login Failed" + Register route (unchanged).
  `app/register.tsx` web behavior unchanged (Online only, offline submit shows
  connectivity-blocked copy, zero Offline path).
- **CON-02 — Retirement list.** The following FINAL-spec statements are RETIRED
  for web (native behavior in each stands unchanged):
  (a) SPEC-04 ACC-10 (grandfathered web locals keep PIN login), DEC-04
  grandfather clause, D-09 web-lookup clause ("lookup for pre-existing locals
  stays"), and D-06 web applicability (unreachable → `attemptLocalLogin` →
  `local_token`);
  (b) SPEC-28 CON-04 web parenthetical (ACC-10 preserved), CON-05 web clause
  (web + non-email + 401 → local lookup MAY proceed), the §3 goal-table row
  "Web grandfathered local, server unreachable → still works", and ACC-09
  (grandfathered web offline login succeeds — rewritten as a refusal check);
  (c) SPEC-30 §1.3 preservation sentence ("ACC-10 … is PRESERVED, promotion
  path per DEC-02") and CON-05 DEC-02 web-promotion clause (a web Local that
  cannot log in cannot promote; currently-logged-in web locals keep the
  promotion button until logout).
  Pre-existing `user_*` keys on web browsers are left byte-identical on device
  (MUST NOT be deleted by this change) but become unreachable via UI.
  Rollback = revert this spec's login gating. `docs/savepoint.md` +
  `AGENTS.md §3` MUST record each retirement.
- **CON-03 — Logout hygiene (all platforms).** `logout()` MUST clear:
  `activeUserId` (AsyncStorage), auth token (SecureStore **and** the
  AsyncStorage fallback — `secureStorage.removeSecureItem` deletes only one
  branch today), `cachedUserId`, and the settings cache. It MUST NOT delete
  `master_users`, any `user_{id}_*` keys, `sync_queue`, or dead-letter
  counters. Post-logout, profile/contexts MUST read as signed-out (existing
  null-`activeUserId` flows), and the next login MUST NOT observe the previous
  session's cached id or settings.
- **CON-04 — Standing repo invariants (AGENTS.md §1).** MUST keep Android + iOS
  + Web working (`Platform.OS` branches; no static native-only imports; Expo Go
  MUST NOT crash); MUST keep web Vercel-deployable; MUST NOT change storage
  keys, the `wallet-api` contract, AsyncStorage shapes, routes, or native deps
  except the CON-02 retirement noted above.
- **CON-05 — Settings PIN verification matches login.** Every Settings
  `/auth/login` call (`verifyPinForSync`, `verifyAccountPin`, clear-data PIN
  check) MUST send the same `deviceId` scheme as `app/login.tsx`
  (read-or-generate `localDeviceId`). A `sessionConflict` response MUST surface
  as an explicit session notice (or the login-screen conflict path), MUST NOT
  be reported as a wrong PIN. The local fallback MUST match `master_users` by
  `id` **or** case-insensitive `name`. Passcode hashing/storage MUST NOT
  change; wrong PINs MUST still be rejected.

## 3. Goal

| Scenario | After (FINAL) |
|---|---|
| Web login, API unreachable | "Connect to the internet…" notice; no session change; zero local writes |
| Web login, unknown user | Plain "Login Failed" + Register route; no local lookup |
| Web login, known cloud user, online | JWT session (unchanged) |
| Native login, API unreachable | Existing local lookup for EXISTING accounts (unchanged, SPEC-30 D-02) |
| Logout, any platform | Session + caches cleared; stored data intact; next login starts clean |
| Old web Local rows | Left on device, unreachable via UI (CON-02) |
| Settings PIN verify, correct PIN, online | Proceeds (sync enables / delete arms); `deviceId` sent (CON-05) |
| Settings PIN verify, wrong PIN | Still rejected as invalid PIN (unchanged) |
| Settings PIN verify, session conflict | Explicit session notice, never "wrong PIN" (CON-05) |

Open decisions: none — DEC-01 (never-local on web, no exceptions), DEC-02
(session + caches scope), and DEC-03 (PIN checks match login, §1.3) resolved
per user 2026-09-30.

### Acceptance criteria

Objective (machine-checkable, `jest` parameterized by `Platform.OS` =
`android`/`ios`/`web` via mock):

- **ACC-01:** web login-attempt helper performs zero `fetch` and zero
  `AsyncStorage.setItem` when offline/misconfigured, and never returns a
  local token (unit test of the gate per platform: web blocked, native
  allowed).
- **ACC-02:** `login.tsx` web branch contains no local-token issuance path
  (string-scan: the web early-out precedes any `local_token`/`getUsers`
  reference in the login flow).
- **ACC-03:** `logout()` clears `activeUserId`, both token stores,
  `cachedUserId`, and the settings cache, while `master_users` +
  `user_{id}_*` keys + `sync_queue` are byte-identical before/after.
- **ACC-04:** post-logout `getPrefixedKey` resolves from the *next* login's id
  (no stale cached id): set cache to A, logout, login as B, assert keys scope
  to B.
- **ACC-07:** every Settings `/auth/login` payload builder includes a
  non-empty `deviceId` (unit test of the shared helper per platform).
- **ACC-08:** session-conflict input routes to the conflict notice, never to
  the wrong-PIN copy (unit test of the response classifier per platform).
- **ACC-09:** local fallback verifies a row matched by case-insensitive name
  when the id lookup misses, and still rejects a wrong PIN.

Subjective (human-judged, observable reviewer checks):

- **ACC-05:** reviewer on web (Vercel export) with API blocked: login
  shows the Connect notice, stays signed out, no Local UI ever appears; with
  API online, same credentials reach the Cloud session; no red-box.
- **ACC-06:** reviewer on Android with a Local account logs out and back in
  with username + PIN: Local data intact, still Local-only display.
- **ACC-10:** reviewer with an Online account, auto-backup OFF → ON, enters
  the correct PIN: sync enables (no "PIN Doesn't Match"); wrong PIN is still
  rejected; Delete Account arms with the correct PIN.

## 4. Deliverables

- **D-01 — Web gate (`app/login.tsx`, helper in `utils/localGate.ts`).**
  `isLocalAuthAllowed(platform)` (web → false) + early-out at the top of the
  local-fallback path; web copy per §3 table; native paths untouched.
- **D-02 — Logout hygiene (`context/AuthContext.tsx`, `utils/secureStorage.ts`,
  `utils/cache.ts`).** `logout()` clears both token stores + `cachedUserId` +
  settings cache; add `clearSessionCaches()` helper if needed; stored data
  untouched. The SPEC-05 session-kill path (`handleAuthFailure`) MUST reuse the
  same helper (it nulls id/token today but leaves the caches).
- **D-03 — Tests.** `jest` for ACC-01..04 + ACC-07..09 parameterized over
  `android`/`ios`/`web`; user-run Expo Go + web export for ACC-05/06/10.
- **D-04 — Docs + retirements.** `docs/savepoint.md` + `AGENTS.md §3` record
  implementation AND the SPEC-04 ACC-10 retirement per CON-02.
- **D-05 — PIN verification unification (`app/(tabs)/settings.tsx`, helper in
  `utils/localGate.ts`).** Shared `deviceId` helper (read-or-generate
  `localDeviceId`, same scheme as login) used by all three Settings auth
  calls; explicit session-conflict branch; local fallback matches by id or
  case-insensitive name; hashing/storage unchanged.

## Glossary

| Term | Meaning |
|---|---|
| Never-local | Web auth never issues or holds `offline_token`/`local_token` |
| Session hygiene | Clearing session identifiers + in-memory caches on logout |
| Stored data | `master_users`, `user_{id}_*` keys, `sync_queue` — preserved across logout |

## References

- `AGENTS.md §1` — working agreements (spec-first, no CLI, invariants, docs).
- `specs/04-connection-status-vs-offline-mode.md` — CON-08, DEC-04, D-06/D-09 (web clauses), ACC-10 (retired by CON-02).
- `specs/28-account-deletion-401-and-web-login-fallback.md` — CON-04/CON-05 (web clauses), §3 web-grandfathered row, ACC-09 (retired/superseded by CON-02); R-3/R-4 motivate this change.
- `specs/30-local-creation-gate-and-reregistration-promotion.md` — §1.3 preservation sentence, CON-05 DEC-02 web-promotion clause (superseded by CON-02).
- `specs/05-multi-device-behavior.md` — session-kill path reuses the D-02 hygiene helper.
- `specs/30-local-creation-gate-and-reregistration-promotion.md` — D-02 (lookup preserved on native), CON-03 (old Local reachable via re-login — preserved).
- `app/login.tsx` (`attemptLocalLogin`, `handleLogin`, `getDeviceId`),
  `app/register.tsx`,
  `app/(tabs)/settings.tsx:233-236` (`verifyPinForSync`, `verifyAccountPin`,
  clear-data PIN check), `context/AuthContext.tsx` (`logout`),
  `utils/secureStorage.ts`, `utils/cache.ts`, `utils/localGate.ts`.
