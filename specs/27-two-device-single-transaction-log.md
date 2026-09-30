# Spec 27: Two-Device Single Transaction Log (Cloud)

| Field | Value |
|---|---|
| ID | SPEC-27 |
| Title | Two-Device Single Transaction Log (Cloud accounts) |
| Status | **FINAL** (2026-09-29 per user call) |
| Owner | User (final authority) |
| Version | 1.0 — FINAL: v0.6 draft + §3.1 diagram approved as-is; all DECs resolved (DEC-01 server-delete-wins, DEC-02 global-queue + idempotent, DEC-03 pull + auto-focus, DEC-04 single-session, DEC-05 freeze-entirely, DEC-06 auto-drain); implement exactly this |
| Scope | Cloud (Online) transaction log convergence across 2+ devices on same credentials; fetch/merge/write/delete sync triggers |
| Non-goals | New storage engine; new API contract version; concurrent real-time sync / push; Local-account sync (Local stays per-device by design); categories/dues/savings convergence (transactions only) |
| Normative source | This file, once marked FINAL. `AGENTS.md §4` is a pointer only. File+symbol cites are normative; `:line` numbers are hints only. |

## Terminology (RFC 2119)

The keywords **MUST**, **MUST NOT**, **SHOULD**, and **MAY** in this spec are
to be interpreted as described in RFC 2119. Informative prose (examples,
"today", "currently", "observed") is non-normative unless restated as a requirement.

## 1. Context

### 1.1 Problem (reported 2026-09-29)

> "If you are to use two devices, even if same account credentials, each device
> does not sync a single transaction log. The web has its own, and the mobile
> also follows the log made through the mobile phone."

Each device follows the log created on itself. There is no convergence to one
shared log for the same credentials. This violates the Register-screen promise
("Data synced across your devices", `app/register.tsx`) and SPEC-04 §3
(Cloud + ON + Online → "AsyncStorage + API (queue drains)").

### 1.2 Current architecture (non-normative, observed)

| Layer | Today |
|---|---|
| Identity | Cloud login sets `activeUserId = server user.id` + JWT (`app/login.tsx:190-193`, `app/register.tsx:81-87`); Local login sets random UUID + `offline_token`/`local_token` |
| Read | `TransactionsContext.fetchTransactions` loads local repo, then `GET transactions?userId={activeUserId}`, LWW-merges by `id`/`updatedAt`, `upsertBulk` locally (`context/TransactionsContext.tsx:85-137`) |
| Write | `add/update/deleteTransaction` write local repo first, then `enqueueAndTrigger` iff `!isLocal && autoBackup !== 'false'` (`TransactionsContext.tsx:160-222`) |
| Queue | Device-local `AsyncStorage('sync_queue')`, global key (not per-user), drains via `processSyncQueue` (`utils/syncQueue.ts`, `utils/syncProcessor.ts`) |
| Refresh | `fetchTransactions` runs only on `activeUserId` change (`TransactionsContext.tsx:141-144`); no focus/pull-to-refresh/manual trigger wired |
| Session | Single active session per user; Device B force-login invalidates Device A JWT → 401 → logout + "Session Ended" alert (SPEC-05) |

### 1.3 Hypotheses (repro = Mixed/unsure per user 2026-09-29 — H-1/H-5 lead)

- **H-1 (wrong account mode):** both devices are on Local accounts with the same
  username. Local IDs are random per-device UUIDs (`register.tsx:43`,
  `login.tsx:93`); same username ≠ same account. Per-device logs are *correct*
  per SPEC-04 for Local. Fix = education + diagnostics, not sync.
- **H-2 (session kill):** both on Cloud, but Device B login kills Device A
  session (SPEC-05). Device A then 401s, logs out, or its queue fails with
  "Unauthorized - session expired" and never converges.
- **H-3 (no convergence logic):** both on Cloud with same `user.id`, but:
  (a) `updateTransaction` never bumps `updatedAt` (sanitize preserves old stamp,
  `TransactionsContext.tsx:188`), so edits never win LWW;
  (b) deletes have no tombstones — a locally-deleted id missing remotely is
  re-created, and a remotely-deleted id is resurrected from remote on next fetch
  (`TransactionsContext.tsx:101-119` starts from remote set, never deletes);
  (c) no refetch trigger, so Device B never pulls Device A's creates until
  restart.
- **H-4 (sync gated off):** `autoBackup === 'false'` on one/both devices
  (per-device setting, never synced) → writes never leave the device, while
  fetch still pulls (current fetch ignores `autoBackup`).
- **H-5 (duplicate Cloud identity):** mobile username-fallback path
  (`register.tsx:141-172`) silently creates a Local account when the user typed
  a non-email in Online mode, while web forces email — same human, two
  different server identities.

### 1.4 Definitions

**Single transaction log** — for one Cloud `user.id`, the union of all
non-deleted transaction ids across devices + server, with per-id LWW winner by
`updatedAt`, identical on every device after sync settles. Holds ONLY when
every involved device has `autoBackup ON`. Any device with `autoBackup OFF`
is intentionally diverged (see §1.5).

**Settled** — queue empty (`pending == 0`), last fetch `ok`, no 401.

**Orphan** — a transaction id that exists on an OFF device but was never
POSTed, so the server and other devices have never seen it.

### 1.5 Edge: autoBackup-OFF then login elsewhere (added 2026-09-29)

`autoBackup` is per-device, per-`user.id`, stored in
`user_{id}_settings`, never synced, never part of the JWT. Turning it OFF on
Device A affects Device A only. A fresh login on Device B defaults to ON
(`null` reads as ON — `autoBackup !== 'false'`) unless the user explicitly
turns it OFF on Device B too.

Observed today: direct writes respect OFF (`add/update/delete` skip
`enqueueAndTrigger`), but `fetchTransactions` merge ignores OFF and still
enqueues missing locals as `create` — so OFF still leaks pushes on every
fetch. D-02 closes that leak: OFF MUST NOT enqueue from any path.

Consequences once FINAL (DEC-05/06 resolved 2026-09-29):

- A-OFF writes stay orphans on A. B (ON) never sees them. B's writes reach the
  server; A does NOT pull them while OFF (freeze-entirely per CON-11).
- Logging in on B does NOT backfill A's orphans and MUST NOT change A's setting.
  B sees server truth only.
- Turning A back ON resumes push: orphans drain via the idempotent queue, then
  A↔B converge per §3.
- Combined with single-session (DEC-04): if B's login kills A's session, A
  shows SPEC-05 "Session Ended" AND keeps its orphans locally (alert creation
  MUST NOT wipe them — SPEC-05 CON-MD-04).

## 2. Constraints (normative once FINAL)

- **CON-01 — Cloud-only scope.** This spec MUST apply to Cloud accounts
  (`!isLocalAccount()`) with `autoBackup !== 'false'` only. Local accounts
  MUST remain per-device with zero API calls (SPEC-04 CON-02/CON-05 unchanged).
  The implementation MUST NOT add any sync to Local paths.
- **CON-02 — Identity invariant.** Two devices are the "same account" iff their
  server `user.id` values are string-equal (not username/email case-insensitive
  match). Diagnostics MUST display this `user.id` (truncated) so H-1/H-5 is
  checkable. The implementation MUST NOT match accounts by username.
- **CON-03 — No silent Local fallback.** On mobile, creating a Local account
  from Online mode (username-fallback, `register.tsx:141-172`) MUST require
  explicit user confirmation dialog stating data will NOT sync. Web MUST keep
  refusing non-email input (SPEC-04 CON-08 unchanged).
- **CON-04 — Write rule.** Every Cloud `addTransaction` MUST assign a fresh
  `updatedAt = Date.now()` at creation; every `updateTransaction` MUST assign a
  fresh `updatedAt` (MUST NOT preserve the old stamp). Every queued item MUST
  carry `{ userId: activeUserId, updatedAt }` so the server can scope + order.
- **CON-05 — Fetch-before-write + read-your-writes (ON devices only; OFF
  devices skip all transaction fetching per CON-11).** `fetchTransactions` MUST
  `GET` with the JWT (server scopes by token; `userId` query is a hint only)
  and MUST merge before local display. After a local write settles (queue item
  dequeued), a subsequent fetch on *another* device with the same `user.id`
  MUST include that id.
- **CON-06 — Delete propagation = server-delete-wins (DEC-01 resolved).**
  The implementation MUST NOT resurrect deleted records: a locally deleted id
  MUST enqueue `delete` AND be excluded from the "missing remotely → re-create"
  branch; a remotely deleted id (absent from an `ok` `GET` after having been
  seen locally) MUST be removed locally on merge. No tombstone table ships.
  Flaky-fetch guard: delete-wins applies ONLY on `ok === true` fetches with an
  array body — failed/empty fetches MUST NOT delete anything. Rollback =
  cache clear + refetch.
- **CON-07 — No auto-pilot background polling.** No interval polling. Refetch
  triggers are limited to: app foreground/focus, manual pull-to-refresh, and
  post-write settle on the *writing* device. No new buttons.
  Push/websocket is out of scope.
- **CON-08 — Standing repo invariants (AGENTS.md §1).** MUST keep
  Android + iOS + Web working (`Platform.OS`/`select`; MUST NOT statically
  import a native-only module at file top level — Expo Go MUST NOT crash on
  import); MUST keep web Vercel-deployable (`EXPO_PUBLIC_*` only, no Node APIs
  in app code, no secrets in bundle); MUST NOT change storage keys
  (`user_{id}_*`), the `wallet-api` contract shape, AsyncStorage shapes, routes,
  or native deps unless this spec requires them (any migration MUST note
  rollback). Queue key change (e.g. per-user namespacing) MUST be migration +
  rollback noted or it MUST NOT ship.
- **CON-09 — Session coexistence disclosure.** While the API enforces a single
  active session (SPEC-05), two devices on the same Cloud credentials MUST
  either both stay synced (if server allows) or the killed device MUST show the
  SPEC-05 "Session Ended" path. Silent split-brain (both logged in, each with
  its own log, no warning) MUST NOT occur.
- **CON-10 — autoBackup is per-device, never synced.** Toggling
  `autoBackup` on Device A MUST NOT affect Device B. Fresh login on a new
  device MUST default to ON (`null` → ON). Diagnostics (D-01) MUST show the
  per-device value so "I turned it off, why does my other phone still sync?"
  is answerable on-screen.
- **CON-11 — OFF means fully isolated for transactions (RESOLVED DEC-05
  2026-09-29: freeze entirely).** A Cloud device with `autoBackup === 'false'`
  MUST NOT issue transaction data calls in either direction: no POST/PUT/DELETE
  AND no transaction `GET` merge — local list stays exactly as it was, queue MUST
  NOT grow from any path (direct writes already gated; fetch-merge leak in
  `TransactionsContext.tsx:101-119` MUST be closed). Auth/session calls and
  the `checkHealth()` probe MAY continue (SPEC-04 CON-02).

## 3. Goal

After sync settles, two devices logged into the same Cloud `user.id` with
`autoBackup ON` MUST display the identical transaction set.

### 3.1 Sync-flow diagram (informative — normative rules are in §2)

```text
BOTH ON (same Cloud user.id) — create converges via foreground refetch:

 Device A (ON)              Server (wallet-api)              Device B (ON)
     |                                |                                |
     | addTransaction(T1)             |                                |
     | local write + queue POST       |                                |
     | ── POST /transactions ───────▶ |                                |
     |                                | ◀── user opens / pulls ── refetch
     |                                | ── GET /transactions ───────▶ |
     |                                |     (now includes T1)          |
     |                                |                          merge + display T1
     |
     | updateTransaction(T1)          |
     | fresh updatedAt + queue PUT    |
     | ── PUT /transactions/T1 ─────▶ |
     |                                | ◀── foreground ── refetch ──▶ |
     |                                |     higher updatedAt wins (LWW)|
     |
     | deleteTransaction(T1)          |
     | local delete + queue DELETE    |
     | ── DELETE /transactions/T1 ──▶ |
     |                                | ◀── foreground ── refetch ──▶ |
     |                                |     T1 absent → dropped locally
     |                                |     (server-delete-wins, CON-06)|

A-OFF, B-ON (same Cloud user.id) — OFF is frozen, orphans stay local:

 Device A (OFF)             Server                       Device B (ON)
     |                          |                              |
     | addTransaction(T-off)    |                              |
     | local ONLY, no queue     |                              |
     | (CON-11: zero tx calls)  | ── B creates T-b ── POST ──▶ |
     |                          |                              |
     | foreground / pull:       |                              |
     | NO transaction GET       | ◀── B logs in fresh ── GET ─▶|
     | list frozen, T-b absent  |     (T-off never POSTed,      |
     | "Sync off + N local-only"|      so B never sees it)     |
     |                          |                              |
     | ── user turns ON ── auto-drain orphans (DEC-06) ──▶    |
     | ── POST T-off (idempotent queue, D-05) ─────────▶      |
     | ◀── refetch ── A and B converge (LWW + delete-wins) ─▶|

SESSION KILL (single-session, SPEC-05) — never a silent split-brain:

 Device A (ON)              Server                       Device B
     |                          |                              |
     | synced                   | ◀── login same credentials ──|
     |                          |     force: true → A's JWT dead |
     | next call → 401          |                              |
     | "Session Ended" alert    |                              |
     | (keeps local orphans,    |                              |
     |  CON-09 / D-08)          |                              |
```

| Device A action | Device B state before | Device B after foreground refetch (settled) | Writes go to | Cloud calls |
|---|---|---|---|---|
| Create T1 (Online, both ON) | old list | list + T1 | AsyncStorage + queue → POST | data (auth ok) |
| Update T1 (Online, both ON) | stale T1 | updated T1 (higher `updatedAt` wins) | AsyncStorage + queue → PUT | data |
| Delete T1 (Online, both ON) | has T1 | T1 gone, NOT resurrected on next fetch | AsyncStorage delete + queue → DELETE | data |
| Create T2 while Offline | old list | old list (no change until A reconnects + B refetches) | AsyncStorage; queue grows | none attempted; banner per SPEC-04 |
| Local account creates Tx | own list | unaffected (different `user.id`, zero API) | AsyncStorage only | none (zero API) |
| A-OFF creates T-off, then B-ON logs in fresh | B has server truth only | B does NOT see T-off (orphan, never POSTed); A keeps T-off locally | A: AsyncStorage only, queue MUST NOT grow; B: normal sync | A: auth + probe only, zero transaction calls; B: data |
| A-OFF while B-ON creates T-b | A frozen at pre-off list | A still frozen per CON-11 | B: AsyncStorage + queue → POST | A: none for transactions; B: data |
| A-OFF turned back ON | diverged | orphans drain idempotently, then A↔B converge per LWW + delete-wins | AsyncStorage + queue drains | data |

Open decisions (user answers 2026-09-29, applied in v0.2; v0.3 adds DEC-05/06):

- **DEC-01: RESOLVED → server-delete-wins.** Remotely-absent ids (after first-seen)
  are dropped locally; locally-deleted ids MUST NOT be re-created on merge.
  No tombstone table.
- **DEC-02: RESOLVED → keep global `sync_queue`, idempotent, no true push.**
  User asked "real time and idempotent": idempotent YES (existing
  `generateQueueItemId(entity:operation:entityId)` dedupe + per-item `userId` +
  `updatedAt` ordering). True real-time push (websocket/push) stays OUT of scope
  per Non-goals — "real time" in this spec means foreground/focus + manual
  pull-to-refresh only, no interval polling. A push-based spec MAY follow later.
- **DEC-03: RESOLVED → pull + auto-focus only.** No new Sync-now button, no new
  timestamp widget beyond the read-only diagnostics in D-01.
- **DEC-04: RESOLVED → single-session stands.** Force-login-kills-other is
  intended; the killed device MUST show the SPEC-05 "Session Ended" path, never
  a silent separate log (CON-09).
- **Repro mode: Mixed/unsure.** D-01 diagnostics (truncated Cloud `user.id` on
  both devices) is therefore the mandatory first check — same `user.id` =
  real sync bug (H-2/H-3/H-4); different `user.id` = H-1/H-5 account-mode
  confusion, fixed by UX copy, not sync.
- **DEC-05: RESOLVED 2026-09-29 → freeze entirely.** OFF = fully isolated
  (no transaction GET either — frozen log).
- **DEC-06: RESOLVED 2026-09-29 → auto-drain.** Turning back ON drains orphans
  automatically (idempotent re-upload) with a transient "Syncing N local-only
  change(s)…" notice; no Keep-vs-Upload dialog.

### Acceptance criteria

Platform matrix (§1.10): every Objective ACC has `jest` coverage parameterized
by `Platform.OS` (`android` / `ios` / `web` via mock); every Subjective ACC has
a user-run check in Expo Go (Android + iOS) and `expo export --platform web`.

Objective (machine-checkable, `jest` parameterized by `Platform.OS` =
`android`/`ios`/`web` via mock):

- **ACC-01:** `updateTransaction` bumps `updatedAt` past the prior value
  (mock `Date.now`, assert `next.updatedAt > prev.updatedAt`).
- **ACC-02:** merge never resurrects: local-delete + remote-present → merged
  excludes id AND queue holds `delete`; remote-absent-after-seen → merged
  excludes id (no re-`create` enqueued for it).
- **ACC-03:** local-only id (absent remotely, not locally deleted) is enqueued
  as `create` with `{ userId, updatedAt }` exactly once (no duplicate queue
  items on repeated fetches).
- **ACC-04:** `isLocalAccount() === true` paths issue zero `fetch`/`authFetch`
  (assert via mocked `apiClient`, all three platforms).
- **ACC-05:** two-device simulation (in-memory repos A/B + fake server):
  A-create → B-fetch includes A id; A-update → B-fetch shows new `updatedAt`
  content; A-delete → B-fetch excludes id and B does not re-upload it.
- **ACC-10:** OFF never enqueues from any path — direct `add/update/delete`
  AND fetch-merge with local-only ids, `autoBackup === 'false'`,
  `Platform.OS ∈ {android,ios,web}` → queue stays empty, zero `authFetch`
  for transactions (mocked `apiClient`).
- **ACC-11:** orphan isolation — A-OFF creates T-off, B-ON (same `user.id`,
  fake server) fetches → T-off absent on B and server; B-ON creates T-b →
  A-OFF after refetch still lacks T-b (freeze-entirely).

Subjective (human-judged, observable reviewer checks):

- **ACC-06:** reviewer logs the same Cloud email+PIN on Android (Expo Go) and
  Web export, creates a transaction on one, foregrounds/pulls on the other, and
  confirms it appears within one manual refresh with no red-box on either.
- **ACC-07:** reviewer confirms Diagnostics (Settings or Sync card) shows the
  same truncated Cloud `user.id` on both devices, plus queue pending count and
  last-synced time; Local accounts show "Local-only — stored on this device"
  (SPEC-04 copy unchanged).
- **ACC-08:** reviewer confirms delete on Device A disappears on Device B after
  refresh and never reappears after restart of either device.
- **ACC-09:** reviewer confirms no silent split-brain: if Device B force-login
  kills Device A, Device A shows the SPEC-05 "Session Ended" notice (not a
  silent separate log).
- **ACC-12 (subjective):** reviewer sets A-OFF, creates a transaction,
  logs in on B (web or second mobile): B does NOT show A's orphan; A shows
  "Sync off" + local-only count; turning A back ON drains and both converge
  within one foreground refetch each, no red-box, no duplicate ids.

## 4. Deliverables

- **D-01 — Diagnostics surface.** Show truncated Cloud `user.id`, `autoBackup`
  state, queue pending/failed counts, last-synced-at on Settings/Sync card
  (read-only, no new secrets in bundle). Lets any future report instantly
  distinguish H-1/H-4/H-5 from real sync failure.
- **D-02 — Writer fixes (`context/TransactionsContext.tsx`).**
  Fresh `updatedAt` on add + update; queued payloads include `userId` +
  `updatedAt`; `deleteTransaction` MUST record the deleted id in a
  session-scoped excluded set (in-memory only — NOT a persisted tombstone
  table, per DEC-01) so fetch-merge MUST NOT re-create it before the queued
  `delete` drains; Cloud+OFF MUST NOT enqueue from any path (already true for
  direct writes — extend to the fetch-merge enqueue branch which today ignores
  `autoBackup`).
- **D-03 — Merge fixes (`fetchTransactions`).** Union + per-id LWW (higher
  `updatedAt` wins, ties → remote wins, documented); server-delete-wins per
  CON-06 (only on `ok` array fetches; no resurrection); `overwrittenCount` toast
  (SPEC-05) preserved; `processSyncQueue` awaited; fetch honors offline (no attempt
  when device offline, banner per SPEC-04).
- **D-04 — Refetch triggers: foreground/focus + pull-to-refresh (DEC-03 resolved,
  no polling, no Sync-now button).** No `setInterval`.
- **D-05 — Queue scoping: keep global key, idempotent items.** No key migration.
  Every queue item MUST assert `userId === activeUserId` at enqueue AND at drain
  (skip + dequeue-with-warning on mismatch, never send cross-user data;
  legacy items without `userId` are treated as the active user's for one drain,
  then re-enqueued items carry `userId`).
  Idempotency via existing `generateQueueItemId(entity:operation:entityId)`
  overwrite-on-reenqueue + `updatedAt` ordering; repeated fetches MUST NOT
  duplicate queue items (ACC-03). `getQueueStats`/diagnostics MUST filter to the
  active user.
- **D-06 — Tests + manual proof.** `jest` file(s) covering ACC-01..05 + ACC-10..11
  parameterized over `android`/`ios`/`web`; user-run Expo Go (Android+iOS) +
  `expo export --platform web` checks for ACC-06..09 + ACC-12. No platform-only behavior
  without its `CON-*` + `ACC-*` + `D-*`.
- **D-07 — Docs.** Append `docs/savepoint.md` change journal + `AGENTS.md §3`
  status entry per `.agents/rules/wisewallet.md` after FINAL implementation.
  No normative change via docs alone.
- **D-08 — OFF-edge UX + copy (DEC-05/06 resolved).** Sync card on an
  OFF device MUST read "Sync off" (SPEC-04 copy, neutral) + "N local-only
  change(s) on this device — not on other devices" when orphans exist
  (orphan count = local ids absent from the last stored ok-server id set,
  persisted on the last successful ON fetch, compared locally with zero network
  while OFF). Fresh login on a new device MUST NOT explain
  orphans it cannot see; the OFF device MUST keep them through session-kill
  logout (no wipe on 401). Re-enable auto-drains with transient "Syncing…" notice.

## Glossary

| Term | Meaning |
|---|---|
| Single transaction log | Same Cloud `user.id` + all devices ON → same transaction id set on all devices after settle (union + LWW, deletes excluded) |
| Settled | Queue pending == 0, last fetch ok, no 401 |
| Tombstone | Persisted deleted-id table — NOT shipped (server-delete-wins chosen); D-02 uses an in-memory session-scoped excluded set instead |
| Orphan | Transaction id on an OFF device never POSTed; invisible to server + other devices until re-enable drains it |
| Split-brain | Two devices same credentials, both logged in, logs diverge with no warning |
| Foreground refetch | `fetchTransactions` triggered by app focus/foreground or manual refresh, never interval polling |

## References

- `AGENTS.md §1` — working agreements (spec-first, no CLI, invariants, docs).
- `specs/04-connection-status-vs-offline-mode.md` — Cloud vs Local, gating, copy.
- `specs/05-multi-device-behavior.md` — session kill + overwrite toast.
- `context/TransactionsContext.tsx` — fetch/merge/writers (bugs: stale
  `updatedAt` on update, no tombstones, fetch-merge ignores `autoBackup`).
- `utils/syncQueue.ts` (`sync_queue` global key), `utils/syncProcessor.ts`,
  `utils/apiClient.ts` (`authFetch` 401), `utils/db.ts` (`API_URL`, `mergeLWW`).
- `app/register.tsx` (Online/Offline selector + mobile username fallback),
  `app/login.tsx` (retry + local fallback + session-conflict dialog).
