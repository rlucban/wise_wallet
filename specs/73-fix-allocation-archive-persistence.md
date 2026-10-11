# SPEC-73 — Fix Allocation Archive Persistence (Synced `isArchived`)

| Field | Value |
|---|---|
| ID | SPEC-73 |
| Title | Fix Allocation Archive Persistence (Synced `isArchived`) |
| Status | **FINAL** (2026-10-10 per user call) |
| Owner | User (final authority) |
| Version | 0.1 |
| Scope (this repo) | `supabase/schema.sql`, `hooks/useSavings.ts`, `utils/syncProcessor.ts`, `utils/savingsArchive.test.ts`, `app/savings.tsx`, `app/archived-allocations.tsx`, `docs/savepoint.md` |
| Non-goals | Data heal/backfill of already-reverted allocations (forward-only); device-local-only archive model; changing sync error semantics for any entity other than `savingsItems`; re-pointing `updatedAt` semantics on other tables; refactoring outside the files above |
| Repo boundary | The deployed backend is the external `rlucban/wallet-api` (Express + Supabase). Its requirements are normative **D-B\*** deliverables the user implements there; this repo implements `supabase/schema.sql` (reference schema) + all client deliverables now. No code in this repo can change `wallet-api` directly. |

## Terminology (RFC 2119)

The keywords **MUST**, **MUST NOT**, **SHOULD**, and **MAY** in this spec are
to be interpreted as described in RFC 2119. Informative prose is non-normative
unless restated as a requirement.

## 1. Context

### 1.1 Problem

Archived allocations "bounce back" to Active. Root cause chain (verified in
`docs/savepoint.md` investigation):

1. `supabase/schema.sql:109-117` creates `savingsItems` with **no**
   `isArchived` column — and no `target_amount` or `updatedAt` either.
2. The client syncs archive as a **partial** body `{ isArchived: true, userId }`
   (`hooks/useSavings.ts:195`), which the server silently drops (or rejects).
3. `utils/syncProcessor.ts:118-136` treats a 400/404 as **success** and
   dequeues, so the drop never surfaces.
4. On web, refetch replaces state verbatim with server rows
   (`useSavings.ts:69` `setItems(remoteData)`) → `isArchived: undefined` →
   `app/savings.tsx:33` (`!item.isArchived`) → the item reappears as Active.
   Deterministic repro. On native Cloud it survives only because server rows
   have no `updatedAt`, so local always wins the LWW merge — the flag was never
   actually saved and is lost on another device, reinstall, or any path that
   trusts the server copy.
5. `hooks/useSavings.ts:199-201` swallows `updateItem` errors (`G5` in
   `utils/savingsArchive.test.ts` pins this), so an archive failure still shows
   the "Allocation archived" toast.

Additionally `target_amount` (the goal) is silently dropped on the same
server round-trips — latent adjacent rot the user opted to fix together with
the migration.

### 1.2 Current state (non-normative, verified)

- `types/index.ts:56-64` — `SavingsItem` already has `target_amount?`,
  `isArchived?`, and `updatedAt` (via `TimestampedEntity`).
- `hooks/useSavings.ts` — web direct-PUT (`:174-184`), native repo upsert +
  queue (`:186-198`), native LWW merge (`:82-115`), `_savingsCache` (`:41`).
- `utils/savingsArchive.test.ts` — G1..G6 guards, × android/ios/web; `G5` and
  `G6` currently **pin the defective behavior** and MUST be inverted/updated.
- `utils/syncProcessor.ts:97-137` — 404 and 400 → `{ success: true }`
  (silent dequeue).

## 2. Constraints (normative)

- **CON-01** Every change MUST remain Android + iOS + Web compatible; zero new
  `Platform.OS`-only code paths beyond what the current merge already has.
- **CON-02** No new npm packages, native modules, or fonts (§1.12).
- **CON-03** Additive schema change only: `savingsItems` gains
  `isArchived`, `target_amount`, `updatedAt`. MUST NOT rename, drop, or recast
  existing columns; storage keys (`user_{id}_*`), API routes
  (`/savingsItems`), and `SavingsItem.id` semantics MUST stay compatible (§1.4).
  Rollback = drop the three columns (documented runbook).
- **CON-04** The archive flow MUST become a **synced cloud field** (`DEC-01`):
  the sync payload for `savingsItems` create/update MUST carry the FULL item
  (id, title, balance, target_amount, icon, color, isArchived, updatedAt) —
  never the partial `{ ...updates }` shape (removes SPEC-27's backward
  compatible partial pushes).
- **CON-05** Merge guard (DEC-03): during native LWW merge AND during web
  refetch, if the **remote** record lacks a field (`isArchived`, `target_amount`)
  that the **local** record defines, the local value MUST be preserved
  (field-level union). This makes pre-migration servers unable to revert
  archives/goals while post-migration servers stay authoritative via
  real `updatedAt`.
- **CON-06** Failure surfacing (DEC-04): `updateItem` MUST rethrow after
  logging (`G5` inverted); archive/restore callers already catch and show real
  errors. For **`savingsItems` only**, `syncProcessor` MUST treat 400/404 as
  failure (`markSyncFailed`, item retained with `lastError`, retried next
  sync) instead of silent success-dequeue. Other entities' existing behavior
  MUST NOT change.
- **CON-07** Forward-only: no heal/backfill of already-bounced allocations
  (user call). Existing data settles once the migration deploys and the next
  write carries the flag.
- **CON-08** Deployment order MUST be backend-first: (1) run the DB migration,
   (2) ship `wallet-api`, (3) ship this client release. The client merge guard
   (CON-05) keeps behavior safe if the client ships early.
- **CON-09** Existing guards are updated, never deleted:
  `savingsArchive.test.ts` G5/G6 reworked to the new contract; all other files
  byte-identical where not named by a `D-*`.
- **CON-10** No code changes may run before this spec is marked FINAL (§1.1).
  No commits.

## 3. Goal

An allocation archived on any device stays archived after every refetch,
refresh, reinstall, and on every other device; goal amounts survive server
round-trips; archive/restore failures are visible instead of silently
succeeding.

### Interaction matrix

| Surface | Action | Expected |
|---|---|---|
| Savings | Archive an allocation | Card leaves Active immediately; stays gone after any refetch/refresh; toast is honest on failure |
| Archived | Restore an allocation | Card returns to Active only after `isArchived:false` actually persisted |
| Archived | Delete permanently | Unchanged (delete already full-record) |
| Savings (web) | F5 / focus refetch after archive | Item does NOT reappear (server now holds the flag) |
| Savings (native Cloud) | Refetch/other-device merge | Archived item stays archived; goal amounts preserved; LWW via server `updatedAt` |
| Any | Server rejects archive write | No false "Allocation archived" toast; visible failure + retryable sync entry |

### Decisions

- **DEC-01** `isArchived` is a synced cloud field (user call) — replicated
  across devices, not a device-local flag.
- **DEC-02** The migration also adds `target_amount` and `updatedAt`
  (user call): stops goal loss and gives the server a real `updatedAt` for
  genuine bidirectional LWW.
- **DEC-03** Client merge guard is a field-level union (CON-05), not a
  record-level override — preserves user data when a pre-migration server
  omits fields.
- **DEC-04** Failures surface: `updateItem` rethrows; `syncProcessor`
  surfaces `savingsItems` 400/404 (user call).
- **DEC-05** No heal/backfill of already-reverted allocations (user call);
  forward-only.
- **DEC-06** Backend `updatedAt` is authoritative for LWW once the migration
  ships; the client still stamps `updatedAt` on each local write for offline
  ordering.

### Acceptance

**Objective (machine-checkable — jest, parameterized by `Platform.OS`)**

- **ACC-01** `supabase/schema.sql` `savingsItems` DDL declares
  `isArchived BOOLEAN NOT NULL DEFAULT FALSE`, `target_amount NUMERIC`, and
  `updatedAt TIMESTAMPTZ NOT NULL DEFAULT NOW()`; no existing column is
  renamed/dropped.
- **ACC-02** `hooks/useSavings.ts` no longer contains the partial sync body
  `body: JSON.stringify({ ...updates, userId: activeUserId })`; create/update
  sync payloads include a full item spread with `isArchived`, `target_amount`,
  and `updatedAt`.
- **ACC-03** `hooks/useSavings.ts` `updateItem` rethrows (log + `throw error`);
  `savings.tsx`/`archived-allocations.tsx` retain their existing
  `catch { Alert.alert(...)/toast }` handlers so failures surface truthfully.
- **ACC-04** `utils/syncProcessor.ts` marks `savingsItems` 400/404 as failed
  (no silent dequeue) while 404/400 for every other `SyncEntity` keeps the
  existing success-dequeue behavior (guard scan asserts the entity branch).
- **ACC-05** Web refetch (and native merge) preserve local `isArchived` and
  `target_amount` when the remote row omits them (field-union guard present in
  both `setItems(remoteData)` web path and the native merge).
- **ACC-06** `utils/savingsArchive.test.ts` is updated: `G5` inverted to
  require the rethrow; `G6` rewritten to assert the full-body payload + merge
  guard; G1..G4 remain green; suite still runs × android/ios/web.

**Subjective (manual reviewer — Expo Go Android/iOS + `expo export --platform web`)**

- **ACC-07** Reviewer: archive an allocation on device A → it leaves Active
  and stays gone across focus refetch, app restart, and (web) page refresh.
- **ACC-08** Reviewer: on native Cloud, archive on device A, pull on device B
  → item stays archived; restore on B → Active on both after a sync.
- **ACC-09** Reviewer: goal amount (`target_amount`) still shows on native and
  web after multiple refetches; no "Goal Reached" state lost.
- **ACC-10** Reviewer: with the wallet-api unreachable, archiving surfaces a
  real failure (web dialog / native toast), never a false success.

### Platform matrix

| Acc | Android | iOS | Web |
|---|---|---|---|
| ACC-01..06 (Objective) | jest mock | jest mock | jest mock |
| ACC-07 | Expo Go | Expo Go | web export |
| ACC-08 | Expo Go ×2 | Expo Go ×2 | n/a (single-user browser) |
| ACC-09 | Expo Go | Expo Go | web export |
| ACC-10 | Expo Go | Expo Go | web export |

## 4. Deliverables

### This repo (implementable now)

- **D-01** `supabase/schema.sql` — add the three columns to the `savingsItems`
  CREATE TABLE. Also append a **Migration runbook** section (non-SQL prose)
  with the live-DB `ALTER TABLE ... ADD COLUMN` statements + `UPDATE
  savingsItems SET "updatedAt" = NOW() WHERE "updatedAt" IS NULL;` backfill +
  rollback (`ALTER TABLE ... DROP COLUMN isArchived, DROP COLUMN
  target_amount, DROP COLUMN updatedAt;`).
- **D-02** `hooks/useSavings.ts` — (a) full-record sync payloads (CON-04):
  `syncData = { ...existing, ...updates, updatedAt: existing.updatedAt || nowTimestamp(), userId }` on native update, full `newItem` on create/merge re-create (already full — unchanged); (b) `updateItem` rethrows (CON-06); (c) web refetch applies the field-union guard (CON-05) before `setItems(remoteData)`; (d) native merge applies the field-union guard, preserving local `isArchived`/`target_amount` when the remote row omits them (both directions: remote-wins and local-wins branches).
- **D-03** `utils/syncProcessor.ts` — in the 400/404 branches, when
  `item.entity === 'savingsItems'` return `{ success: false, error }`
  (surfaces + retries) instead of the silent `success: true` dequeue; all
  other entities keep current behavior (CON-06). No other sync semantics change.
- **D-04** `utils/savingsArchive.test.ts` — update `G5` (require rethrow) and
  `G6` (full body + field-union guard on web refetch); keep G1..G4; add a
  source-scan for the syncProcessor `savingsItems` 400/404 branch (ACC-04) and
  the native merge field-union (ACC-05). Remain × android/ios/web.
- **D-05** `app/savings.tsx` + `app/archived-allocations.tsx` —
  byte-identical except: no changes required beyond what exists (the handlers'
  `catch` blocks already alert on the now-thrown errors). If ACC verification
  finds broken copy, only the toast/Alert strings in these two files may change.
- **D-06** `docs/savepoint.md` journal + `AGENTS.md` §3 status line (this
  DRAFT, then FINAL + implement + verify).

### wallet-api (user-implemented, normative contract — `D-B\*`)

- **D-B-01** Run the D-01 migration runbook on the live Supabase instance.
- **D-B-02** `savingsItems` GET rows MUST include `isArchived`, `target_amount`,
  `updatedAt`; PUT `/savingsItems/:id` MUST upsert the full record from the
  body and bump `updatedAt`; POST `/savingsItems` MUST store those fields;
  rejections MUST return a non-20x status with a message (never a silent 200
  drop).
- **D-B-03** Deploy `wallet-api` with D-B-02 (CON-08 ordering) and confirm
  `GET /savingsItems?userId=...` echoes the flags/`updatedAt` round-trip (curl
  runbook).

## 5. Glossary

- **Field-union merge guard:** where a local record defines a field the remote
  record omits, the local value wins; where both define it, the later
  `updatedAt` wins.
- **Silent dequeue:** `syncProcessor` returning success on 400/404 so the queue
  item is removed with no visible failure.
- **Full-record sync:** create/update payloads carry the entire `SavingsItem`
  (all client fields), not `{ ...updates }`.

## 6. References

- `AGENTS.md` (§1.1, §1.4, §1.9–§1.12)
- `specs/27-allocation-archive-functionality.md`, `specs/28-dedicated-archived-allocations-screen.md`
- `docs/savepoint.md` (investigation record), `utils/savingsArchive.test.ts`
- `supabase/schema.sql`, `hooks/useSavings.ts`, `utils/syncProcessor.ts`

## History

- **0.1 (2026-10-10)** — DRAFT. Investigation: archiving "bounces back" because
  `savingsItems` has no `isArchived` column (no `target_amount`/`updatedAt`
  either), partial-body sync drops the flag server-side, syncProcessor silently
  dequeues 400/404, web refetch overwrites state verbatim, and `updateItem`
  swallows errors. User call (4 decisions): synced cloud field; include
  `target_amount`/`updatedAt`; surface errors; forward-only no heal.
  No implementation until FINAL.
- **1.0 (2026-10-10)** — FINAL per user call. Implement exactly
  `D-01..D-06` (this repo) now; `D-B-01..D-B-03` (wallet-api) are
  user-implemented per §1.3.