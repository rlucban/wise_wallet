# Spec 38: Session-Kick Enforcement (Client Reasons, Honest Copy, Logout Revocation)

| Field | Value |
|---|---|
| ID | SPEC-38 |
| Title | Single-session enforcement: one live session per device, sid rotation, precise 401 reasons, honest copy, logout revocation |
| Status | **FINAL** (2026-09-30 per user call) |
| Owner | User (final authority) |
| Version | 1.1 — FINAL: v1.0 + user call 2026-09-30 on (a) rotating sid per login, (b) web tabs sharing one session; adds §1.5 P-05..P-07, §1.6, CON-10, D-06. Implement exactly this. |
| Scope | `wise_wallet` client only: new `utils/sessionReason.ts`, `utils/apiClient.ts`, `context/AuthContext.tsx`, `app/_layout.tsx`, `app/login.tsx`, `app/register.tsx`, `utils/localGate.ts`, new `utils/sessionReason.test.ts` |
| Non-goals | **Any `wallet-api` change** (out of scope per user 2026-09-30 — server work is the blocking prerequisite, §1.5, not implemented here); Local/offline accounts (no shared identity — §1.7, deliberate); per-tab session isolation on web (explicitly declined — DEC-08); account-deletion re-login copy; `autoBackup`/sync-plane behavior; multi-session support (opposite of this spec); any new screen or route beyond an optional `/login` param |
| Normative source | This file, once marked FINAL. `AGENTS.md §4` is a pointer only. File+symbol cites are normative; `:line` numbers are hints only. |

## Terminology (RFC 2119)

The keywords **MUST**, **MUST NOT**, **SHOULD**, and **MAY** in this spec are
to be interpreted as described in RFC 2119. Informative prose (examples,
"today", "currently", "observed") is non-normative unless restated as a
requirement.

## 1. Context

### 1.1 Intended behavior

Single-session, per SPEC-27 (*"single-session stands"*). Logging in on a newer
device MUST end the older device's session. `users.currentSessionId`
(`supabase/schema.sql:42`) is the intended carrier of "which device holds the
live session".

The client already speaks this protocol: `app/login.tsx:88-95` mints a stable
per-install `deviceId` (`localDeviceId`), `app/login.tsx:152-171` sends
`{ name, passcode, deviceId, force }`, and `app/login.tsx:213-224` shows
*"This account is already logged in on another device. Logging in here will log
you out of the other device. Proceed?"*

### 1.2 The kick has never worked — verified server-side (read-only, `ninalamo/wallet-api` @ `cbedbc3`)

Three independent server defects compound. All are **outside this repo**.

1. **`deviceId`/`force` are stripped before the login handler runs.**
   `src/middlewares/validate.js:6` does `req.body = schema.parse(req.body)` —
   it *replaces* the body with zod's output — and `src/schemas/userSchema.js`
   declares `loginSchema = z.object({ name, passcode })` only. Zod's default
   strips unknown keys, so both fields are **deleted**.
   `authController.login` then destructures them as `undefined`, and in
   `authService.login` the conflict gate
   `if (deviceId && user.currentSessionId !== deviceId && !force)` short-circuits
   to false **unconditionally**. `newSessionId = deviceId || crypto.randomUUID()`
   therefore stores a *random UUID*, never the device id.
   → `sessionConflict` **can never be returned**; the dialog at
   `app/login.tsx:213-224` is unreachable dead code.
2. **The JWT carries no session id.** `generateToken(userId)` signs `{ id: userId }`
   only (`authService.js`), so there is nothing to compare.
3. **`protect` never checks the session.** `src/middlewares/protect.js` verifies
   the signature and loads the user, but performs **no comparison against
   `currentSessionId`** anywhere.
   → `currentSessionId` is **write-only dead state**. The older device's token
   stays valid for the full `JWT_EXPIRES_IN = '24h'`.

4. **The client never revokes on logout either.** `POST /api/auth/logout` exists
   (`src/routes/authRoutes.js`) and `authService.logout` nulls `currentSessionId`,
   but **no client code calls it** — `context/AuthContext.tsx:69-76` is purely
   local. A repo-wide grep for `/logout` in the client returns nothing.

Net: the dialog's promise *"will log you out of the other device"* is false, and
device B force-logging-in silently *coexists* with device A rather than replacing it.

### 1.3 Consequence the client can fix today: the app lies about *why* it logged out

`utils/apiClient.ts:57-63` maps **every** 401 from **every** endpoint to a single
reason `'session_ended'`. That drives `context/AuthContext.tsx:46-54` and
`app/_layout.tsx:169-179`, which persists an alert
(`utils/notifications.ts:313-335`) reading:

> **"Session Ended"** — *"Your session was ended on another device. Please log
> in again."*

Since §1.2 means no session is ever actually revoked, that alert can **only**
ever fire for a genuinely **expired** or **invalid** token — i.e. it is
essentially always **false information**.

The server *does* already distinguish these cases in the message text, but the
client cannot see it: `utils/apiClient.ts:83` reads `body?.error`, while the
server's error handler (`src/app.js`) returns
`{ status, message, errorDetails, stack }` — **there is no `error` key**. So the
reason text is discarded and the client falls back to `` `HTTP ${status}` ``.

Server messages already available today:

| Server `message` | Real cause |
|---|---|
| `Your token has expired, please log in again` | expiry (`TokenExpiredError`) |
| `Invalid token, please log in again` | bad signature (`JsonWebTokenError`) |
| `The user belonging to this token no longer exists.` | account deleted (SPEC-28) |

### 1.4 Scope boundary (user call, 2026-09-30)

Client-only spec. The server fixes are recorded here as normative `CON-*`
**prerequisites** the server MUST satisfy to make the user-visible kick real —
they are **not implemented by this spec** and this repo cannot substitute for
them (§1.5). Everything this spec implements is either correct today or
backward-compatible with an unfixed server.

### 1.5 Blocking prerequisite — required server behavior (NOT implemented here)

For reference and so the server work is unambiguous. All in `ninalamo/wallet-api`.

The model is **one live session per `deviceId`, newest login wins, session id
rotates on every login**. That requires **two** stored values, because a single
rotating value would break the "is this me?" check:

- `users.currentSessionId` — the **`deviceId` that owns** the live session.
  Existing column, existing semantics, unchanged. This is what the conflict gate
  compares.
- `users.sessionToken` — the **rotating `sid`** the current JWT must carry.
  New nullable column. This is what `protect` compares.

- **P-01** `loginSchema` MUST declare `deviceId: z.string().min(1).optional()` and
  `force: z.boolean().optional()` so `validate` stops stripping them (§1.2 #1).
- **P-02** `registerSchema` MUST accept `deviceId` the same way, **and `register`
  MUST persist it into `currentSessionId`** instead of `crypto.randomUUID()`.
  Rationale in §1.6. Without this, every account's *first* re-login is falsely
  reported as "logged in on another device" — a bug that is currently masked
  only by P-01 being absent.
- **P-03** `register` **and** `login` MUST mint a fresh `sessionToken`
  (`crypto.randomUUID()`), write it to `users.sessionToken`, and sign the JWT as
  `{ id, sid }` using that value. The sid MUST be minted **before** signing.
- **P-04** `protect` MUST compare `decoded.sid` against
  `currentUser.sessionToken` and, on mismatch, reject with HTTP 401 and the
  message **`Session ended on another device`** (`protect` already loads the user
  row, so the field is available with no extra query).
- **P-05** `protect` MUST reject a token with **no `sid`** with 401
  (`Invalid token, please log in again`). Cost: every signed-in device re-logs in
  exactly once after deploy. Benefit: the revocation hole closes immediately
  instead of lingering for up to 24h. *(Alternative considered and rejected:
  accept until natural expiry — zero disruption but a 24h write window.)*
- **P-06** `users.sessionToken` MUST be added as a **nullable `TEXT`** column.
  Purely additive DDL — `currentSessionId` keeps its type and meaning, so this is
  not a breaking schema change (§1.4 of `AGENTS.md` respected).
- **P-07** `logout` MUST null **both** `currentSessionId` and `sessionToken`, so a
  signed-out token fails the `sid` comparison on its next use.

Consequence after P-01..P-07, all four cases behave correctly:

| Case | Result |
|---|---|
| Same device re-login | `currentSessionId === deviceId` → **no prompt**; sid rotates, previous token 401s, new token works |
| Different device logs in | Conflict prompt; on `force`, sid rotates → **older device kicked on its next request** |
| Same device, two web tabs | Same `deviceId` → tab 2's login rotates the sid and **invalidates tab 1's token** (DEC-08, accepted) |
| Pre-deploy token | No `sid` → 401, re-login once (P-05) |

Until P-01..P-07 ship, this spec's changes are safe and correct but the *kick*
remains absent.

### 1.6 The register-path bug that P-01 alone would expose

`authService.register` stores `currentSessionId = crypto.randomUUID()` — a random
value that is **never** any device's id — and the client **never sends
`deviceId` on register** at all (`app/register.tsx:100-113` and `:180-184` post
only `{ name, passcode, initialBalance }`).

So the moment P-01 lands and the server can actually see a `deviceId`:

> Register on device A → `currentSessionId = R1` (random). Re-login on **the same
> device A** → sends `deviceId = D_A` → server sees `R1 !== D_A` → returns
> *"already logged in on another device"* **on your own device.**

This is why P-02 exists, and why **D-06 (send `deviceId` on register)** is a real
client-side deliverable in this spec rather than a server-only note.

### 1.7 Definitions

**Revoked** — the token's session no longer matches the live `sessionToken`
because a newer login rotated it. Only meaningful after P-03/P-04.

**Expired / invalid** — token TTL elapsed, or signature/identity check failed.
Never a "kick".

**Sid-less token** — issued before P-03; carries no session binding.

**Local/offline account** — mobile-Local or Cloud+OFF. Two Local accounts on two
devices are **two unrelated accounts with separate data and no shared identity**;
there is no session to kick and no channel that does not contradict Local being
device-only and offline. Deliberately untouched (CON-09).

**`sid`** — the rotating session id carried in the JWT (`{ id, sid }`). Rotates on
**every** login, so exactly one issued token is ever live per account.

**Owner device** — the `deviceId` stored in `currentSessionId`; identifies *which
device* holds the session, which is a different question from *which token* is
live (`sessionToken`). Keeping the two separate is what lets a same-device
re-login be silent instead of tripping the conflict check.

## 2. Constraints (normative once FINAL)

- **CON-01 — Client-only.** This spec MUST NOT require, assume, or depend on any
  `wallet-api` change in order to be *implemented and shipped*; §1.5 is a
  prerequisite for the *kick*, not for this code. Every behavior introduced MUST
  be correct against an unfixed server and MUST NOT regress when P-01..P-07 land.
- **CON-02 — Precise 401 classification.** `utils/apiClient.ts` MUST classify a
  401 by the server `message` into exactly one of
  `session_revoked | token_expired | token_invalid | auth_failed`, and MUST stop
  collapsing every 401 into `'session_ended'`. The mapping MUST be pure and
  unit-testable, living in the new `utils/sessionReason.ts`.
- **CON-03 — Never claim a cause we don't know.** An unrecognized or missing
  message MUST classify as `auth_failed` and MUST NOT be reported as
  `session_revoked`. The classifier MUST be **fail-safe**: a message it cannot
  match downgrades to "no claim", never upgrades to "another device". This is the
  specific lie being fixed.
- **CON-04 — Honest copy.** The persistent "Session Ended" system alert
  (`utils/notifications.ts:313-335`, title *"Session Ended"*, SPEC-05) MUST be
  created **only** for `session_revoked`. `token_expired`, `token_invalid` and
  `auth_failed` MUST NOT create it, and MUST NOT display "another device" text.
  `session_revoked` keeps the existing alert title, message and 60s dedupe
  byte-identical (SPEC-05 contract preserved).
- **CON-05 — Read the real error field.** `utils/apiClient.ts` MUST read the
  server's `message` key (its current `body?.error` read is dead against this
  server) while remaining tolerant of a body that has `error` or neither.
- **CON-06 — Logout revokes server-side, best-effort.** `context/AuthContext.tsx`
  `logout()` MUST issue `POST auth/logout` with the stored token, using
  `suppressAuthFailure: true` so a 401 during logout can never re-enter the
  session-kill path. It MUST be best-effort: offline, a server error, or a missing
  `API_URL` MUST NOT block, delay, or fail the local logout, and MUST NOT throw.
  Local data and session-cache clearing (SPEC-31 D-02/CON-03) MUST be unchanged
  and MUST still complete first.
- **CON-07 — The conflict dialog stays, and its copy must remain true.** The
  `sessionConflict` handling in `app/login.tsx:210-224` and its mirror
  `classifyAuthLoginResult` (`utils/localGate.ts:156-178`) MUST be preserved
  unchanged — they become reachable only after P-01. No copy change: after
  P-01..P-07 the promise becomes accurate, and changing it now would be premature.
- **CON-08 — Not-found requests are never kicked.** `utils/apiClient.ts`
  `authFetch` returns `status: 0` for network failure; that path MUST NOT produce
  any session-kill effect, and no new one may be introduced.
- **CON-09 — Local/offline accounts are out of scope, deliberately.** No new
  network call, no device coordination, and no behavior change may be introduced
  for mobile-Local accounts. Rationale in §1.7.
- **CON-10 — Register MUST send the device id.** Both Cloud register calls
  (`app/register.tsx:100-113` and `:180-184`) MUST include the same stable
  `deviceId` used by login (`localGate.ts:138-146`). Without it the server cannot
  attribute a session to a device at creation time, and §1.6 turns the first
  re-login into a false "another device" prompt. The payload MUST be built by a
  single shared, pure helper so the two call sites cannot drift.
- **CON-11 — Standing repo invariants (AGENTS.md §1.5–§1.7).** Android + iOS + Web
  keep working; web stays Vercel-deployable (the classifier is plain TS, no
  Node-only API); Expo Go does not crash on import.
- **CON-12 — No breaking changes outside the reason string.** Storage keys
  (`user_{id}_*`), AsyncStorage shapes, the API contract, native dependencies and
  navigation routes MUST stay compatible. The `/login` notice is delivered as an
  **optional** route param, so `/login` with no param behaves as today. The
  persisted alert title/message MUST be byte-identical (CON-04).

## 3. Goal

| Scenario | After (FINAL) |
|---|---|
| 401, server says `Session ended on another device` (post P-04) | `session_revoked`; existing "Session Ended" alert + redirect — unchanged UX |
| 401, server says `Your token has expired…` | `token_expired`; **no** system alert, **no** "another device" claim; honest notice on `/login` |
| 401, server says `Invalid token…` / account gone | `token_invalid`; no system alert; honest notice on `/login` |
| 401 with unknown/absent message | `auth_failed`; no system alert, no reason claimed; redirect only |
| User taps Logout | `POST auth/logout` fired best-effort **and** local logout completes identically; offline/server-error never blocks it |
| Logout while offline or with a stale token | Local logout still completes; no session-kill recursion; no crash |
| Network failure (no response) | No session-kill, unchanged from today (CON-08) |
| Cloud register | Body carries the stable `deviceId` (CON-10) — the server can attribute the session from the start |
| Second device logs in, server fixed | Older device is actually revoked — **requires P-01..P-07** |
| **Same** device re-logs in, server fixed | **No** conflict prompt; sid rotates so its own previous token dies (DEC-07) |
| First re-login after register, server fixed | **No** false "another device" prompt (P-02 + D-06) |
| Two web tabs, second logs in | Tab 2's login rotates the sid and **logs tab 1 out** (DEC-08, accepted) |
| Second device logs in, server NOT yet fixed | Coexistence (today's behavior), and the older device is **not** falsely told it was kicked |
| Local/offline account | Byte-identical behavior (CON-09) |

Open decisions: none outstanding.

### 3.1 Decisions

- **DEC-01 — Client-only scope** (user, 2026-09-30). The server is a separate
  repo and the blocker is there; this spec implements everything that is
  implementable and correct here, and states the server requirements as §1.5
  rather than silently assuming them.
- **DEC-02 — Reject `sid`-less tokens** (user, 2026-09-30) as P-05. One
  re-login per device buys immediate closure of the revocation hole.
- **DEC-03 — Fail-safe classifier** (CON-03): unknown → `auth_failed`. Chosen
  over guessing "expired", because the whole defect is the app asserting a cause
  it cannot verify.
- **DEC-04 — No `session_revoked` before P-04.** The string can only come from the
  server, so today no device is falsely told it was kicked. Correct-by-default
  rather than optimistic.
- **DEC-05 — Notice via optional `/login` param, not a new screen.** Reuses the
  existing redirect in `app/_layout.tsx`; no new route, no provider, no dialog
  stack (rules: no over-engineering).
- **DEC-06 — Keep `settings.tsx` force-logins untouched.** The PIN-verify and
  re-registration calls already send `force: true`
  (`app/(tabs)/settings.tsx:460-482`, `:667-676`, `:972-992`); after P-03/P-04 they
  legitimately evict other devices, which is the intent.
- **DEC-07 — Rotate `sid` on every login; same-device re-login self-replaces**
  (user, 2026-09-30). Exactly one issued token is ever live, so there is no
  accumulation of parallel valid tokens and no stale-token window. Chosen over
  idempotent re-login, which leaves multiple live tokens for the same person.
- **DEC-08 — Web tabs share one session** (user, 2026-09-30). `localDeviceId`
  lives in plain AsyncStorage → `localStorage` on web, which is per-origin and
  shared across tabs, so two tabs are genuinely "one device". Tab 2's login
  therefore logs tab 1 out. Rejected alternatives: per-tab session ids (needs the
  server to hold a *set* of live sessions — a breaking schema change), and
  native-only rotation (leaves `deviceId` and session identity diverging across
  platforms). The cost is accepted as predictable.
- **DEC-09 — Two stored values, not one** (`currentSessionId` = owner device,
  `sessionToken` = rotating sid). A single rotating value would make
  `currentSessionId !== deviceId` true on *every* login and prompt on every
  login, including the user's own device. Splitting them keeps the existing
  conflict gate semantics intact and makes P-06 purely additive.

### 3.2 Platform matrix — Objective (machine-checkable, `jest` × `Platform.OS`)

The classifier is pure with no `Platform.OS` branch, so the matrix asserts
*identical* classification on all three platforms — that identity is the §1.5
guarantee, asserted rather than assumed.

| # | Android | iOS | Web |
|---|---|---|---|
| ACC-01 | pass | pass | pass |
| ACC-02 | pass | pass | pass |
| ACC-03 | pass | pass | pass |
| ACC-04 | pass | pass | pass |
| ACC-05 | pass | pass | pass |
| ACC-06 | pass | pass | pass |
| ACC-07 | pass | pass | pass |
| ACC-08 | pass | pass | pass |

- **ACC-01 — Each cause maps to its own reason.** The three messages the server
  already returns today (`Your token has expired, please log in again` →
  `token_expired`; `Invalid token, please log in again` → `token_invalid`;
  `The user belonging to this token no longer exists.` → `token_invalid`) and the
  P-04 message `Session ended on another device` → `session_revoked`.
- **ACC-02 — The regression this spec exists for.** A `token_expired` response
  MUST classify as `token_expired` and MUST NOT be `session_revoked`, and MUST
  NOT request the persistent alert — i.e. the current false
  *"ended on another device"* claim is impossible.
- **ACC-03 — Fail-safe (CON-03).** Unknown message, empty message, absent message,
  non-string message, and non-401 status all yield `auth_failed`, never
  `session_revoked`; only the exact P-04 message may produce `session_revoked`.
- **ACC-04 — Alert gating (CON-04).** `shouldPersistSessionEndedAlert` is true for
  `session_revoked` and false for the other three.
- **ACC-05 — Field extraction (CON-05).** `extractErrorMessage` reads `message`
  first, falls back to `error`, then to `null`, across `{message}`,
  `{error}`, `{message, error}`, `{}`, `null`, and non-object bodies.
- **ACC-06 — Notice copy.** A notice string is produced for `token_expired` and
  `token_invalid`, is `null` for `session_revoked` (the alert carries that copy)
  and for `auth_failed` (nothing is known), and never contains the words
  "another device" except in the `session_revoked` path.
- **ACC-07 — Source scan.** `utils/apiClient.ts` no longer hardcodes the literal
  `'session_ended'` as its sole 401 reason; `context/AuthContext.tsx` `logout`
  calls the auth logout endpoint with `suppressAuthFailure: true`;
  `utils/notifications.ts` alert copy is unchanged; `app/login.tsx` conflict
  handling and `utils/localGate.ts` `classifyAuthLoginResult` are unchanged
  (CON-07).
- **ACC-08 — Register payload (CON-10, §1.6).** The shared register payload
  builder trims `name`/`passcode`, always includes a non-empty `deviceId`, and
  preserves `initialBalance` exactly (including `0`). A source scan asserts
  **both** Cloud register call sites in `app/register.tsx` use that builder, so
  the device id cannot drift out of one of them.

### 3.3 Platform matrix — Subjective (human-judged, observable reviewer checks)

| # | Android (Expo Go) | iOS (Expo Go) | Web (`expo export --platform web`) |
|---|---|---|---|
| ACC-09 | pass | pass | pass |
| ACC-10 | pass | pass | pass |
| ACC-11 | pass | pass | pass |

- **ACC-09 — Honest expiry (the user-visible fix).** Reviewer on each platform:
  sign in, then have the token expire (or wait it out), then background/refresh
  the app. The reviewer confirms the user is returned to `/login` with copy
  stating the session **expired**, that **no** "Session Ended" system alert
  claiming another device appears in Notifications, and that logging back in works.
  (Today this scenario produces the false "ended on another device" alert.)
- **ACC-10 — Logout is clean and non-blocking.** Reviewer on each platform signs
  out with the network on and then **in airplane mode**, and confirms: logout
  completes immediately both times, lands on `/login` with no red-box, stored data
  is intact, and no "Session Ended" alert is created. On web, repeat with the
  developer network panel: one `POST auth/logout` is attempted and its failure is
  invisible to the user. Reviewer confirms a Local account logs out with zero
  network activity (CON-09).
- **ACC-11 — Register still works against the unfixed server.** Reviewer on each
  platform registers a Cloud account and completes onboarding, confirming the
  added `deviceId` field is **ignored** by the current server (it is stripped by
  zod) and the flow is byte-identical to today (CON-01). Reviewer then signs out
  and back in on the **same** device and confirms no behavioral surprise pre-P-01.

## 4. Deliverables

- **D-01 — new `utils/sessionReason.ts`** (pure, no I/O / React / `Platform`):
  `AuthFailureReason` union; `extractErrorMessage(body)` (CON-05);
  `classifyAuthFailure({ status, body })` → reason (CON-02/CON-03);
  `shouldPersistSessionEndedAlert(reason)` (CON-04); notice-copy constants and
  `getAuthFailureNotice(reason)` (ACC-06). Fail-safe default `auth_failed`.
- **D-02 — `utils/apiClient.ts`:** on a non-suppressed 401, classify via
  `classifyAuthFailure` and pass that precise reason to `onAuthFailure` instead of
  the blanket `'session_ended'`; populate `ApiResult.error` from the server
  `message` (CON-05). Credential wipe and the `status: 0` path stay exactly as
  they are (CON-08).
- **D-03 — `context/AuthContext.tsx`:** `logout()` fires a best-effort
  `POST auth/logout` with `suppressAuthFailure: true` **after** local state and
  caches are already cleared (CON-06); `handleAuthFailure` stores the precise
  reason unchanged in `authFailureReason` (no new state field).
- **D-04 — `app/_layout.tsx` + `app/login.tsx`:** create the "Session Ended"
  alert **only** for `session_revoked` (CON-04); otherwise redirect to `/login`
  with the reason as an **optional** param (DEC-05), and `app/login.tsx` renders
  the honest notice for `token_expired` / `token_invalid`, nothing for
  `auth_failed`. `/login` with no param must behave exactly as today (CON-12).
- **D-05 — new `utils/sessionReason.test.ts`:** ACC-01..08 × `android`/`ios`/`web`
  using the repo's `describe.each([...])` + `jest.mock("react-native")` pattern
  (`utils/modeState.test.ts:8-27`), including the ACC-07/ACC-08 source scans.
  Lives under `utils/` (`jest.config.js` `roots`).
- **D-06 — register sends the device id (CON-10, §1.6).** Add a pure
  `buildAuthRegisterPayload({ name, passcode, initialBalance, deviceId })` beside
  the existing `buildAuthLoginPayload` in `utils/localGate.ts`, and use it in
  **both** Cloud register call sites in `app/register.tsx` (`:100-113`,
  `:180-184`), sourcing `deviceId` from the existing `getOrCreateDeviceId()`
  (`localGate.ts:138-146`). Must be **additive** to the request body: the
  unfixed server strips the unknown key and the flow is unchanged (ACC-11).
- **D-07 — Docs.** `docs/savepoint.md` implementation entry including the §1.5
  prerequisite list (P-01..P-07) as an explicit "the kick requires the server
  fix" note, plus the DEC-08 web-tab consequence; `AGENTS.md §3` append entry;
  this file's Status → FINAL with the approval date.
- **D-08 — User-run verification** (§1.3 — the agent does not run these):
  `npx tsc --noEmit`, `npx tsc -p tsconfig.test.json --noEmit`, `npm test`,
  `npx eslint .`, then Expo Go Android + iOS (ACC-09/10/11) and
  `expo export --platform web` (ACC-09/10/11).

## Glossary

| Term | Meaning |
|---|---|
| Revoked | Token's `sid` ≠ live `sessionToken` because a newer login rotated it; only real after P-03/P-04 |
| Expired / invalid | Token TTL elapsed, or signature/identity check failed — never a kick |
| Sid-less token | Issued before P-03; no `sid` in the JWT; MUST be rejected (P-05) |
| Owner device | The `deviceId` in `currentSessionId`; *which device*, distinct from *which token* |
| `sid` / `sessionToken` | The rotating session id carried in the JWT (`{ id, sid }`); exactly one issued token is ever live |
| Session conflict | Server answering login with `sessionConflict: true` (unreachable until P-01) |
| Fail-safe | Unknown cause → `auth_failed`; never an upgrade to a claim |
| Local/offline account | mobile-Local or Cloud+OFF; two devices = two unrelated accounts, no kick (§1.7) |

## References

- `AGENTS.md §1` — spec-first, no-CLI, invariants, docs; §1.4 no breaking
  changes; §1.9 spec format; §1.10 platform matrix + TDD.
- `specs/05-multi-device-behavior.md` — session-kill alert contract preserved
  (CON-04, title/message byte-identical).
- `specs/27-two-device-single-transaction-log.md` — "single-session stands"
  decision this spec completes.
- `specs/28-account-deletion-401-and-web-login-fallback.md` — 401 opt-out
  (`suppressAuthFailure`) reused by D-03.
- `specs/31-web-never-local-and-logout-hygiene.md` — D-02 logout hygiene
  (`clearSessionCaches`, both token stores) that D-03 MUST NOT alter.
- **Server (read-only, `ninalamo/wallet-api` @ `cbedbc3`):**
  `src/middlewares/validate.js:6`; `src/schemas/userSchema.js`
  (`loginSchema`/`registerSchema`); `src/controllers/authController.js`
  (`register`, `login`, `logout`); `src/services/authService.js`
  (`generateToken`, `register`'s `crypto.randomUUID()` session, `login` conflict
  gate, `logout`); `src/middlewares/protect.js`; `src/routes/authRoutes.js`
  (`POST /logout`); `src/app.js` (error handler shape — `message`, no `error`).
- Client: `utils/apiClient.ts:57-63,83`; `context/AuthContext.tsx:46-54,57-58,69-76`;
  `app/_layout.tsx:165-180`; `utils/notifications.ts:313-335`;
  `app/login.tsx:88-95,152-171,210-224`;
  `app/register.tsx:100-113,180-184`; `utils/localGate.ts:122-134,138-146,156-178`;
  `app/(tabs)/settings.tsx:460-482,667-676,972-992`;
  `supabase/schema.sql:38-45`; `jest.config.js`; `utils/modeState.test.ts:8-27`.
