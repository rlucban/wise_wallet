# SPEC-77 — Savings Delete/Archive Cross-Device Sync (Deletion Markers)

| Field | Value |
|---|---|
| ID | SPEC-77 |
| Title | Propagate allocation delete/archive to all devices via client-side deletion markers |
| Status | **FINAL** (v1.0, 2026-10-10 per user call) |
| Owner | User (final authority) |
| Version | 1.0 — FINAL (Option A: deletion markers + seen-remote snapshot; backend confirmed deployed) |
| Scope (this repo) | `utils/savingsDeletionMarkers.ts` (new), `hooks/useSavings.ts`, `utils/savingsDeletionMarkers.test.ts` (new), `utils/savingsArchive.test.ts`, `docs/savepoint.md`, `AGENTS.md §3` |
| Non-goals | Changing the `wallet-api` contract or DB schema; the SPEC-73 backend migration (`D-B-01..03`); `syncProcessor` retry policy (SPEC-73 CON-06); `TransactionsContext` (already API-first, SPEC-45); `useDues`/categories/profile; web behavior (already API-direct, SPEC-36); Local accounts (no sync, SPEC-04); any new dependency; changing storage keys other than the new one |
| Normative source | This file once FINAL. File+symbol cites are normative; `:line` numbers are hints only. |

## Terminology (RFC 2119)

The keywords **MUST**, **MUST NOT**, **SHOULD**, and **MAY** are interpreted as
described in RFC 2119. Informative prose (examples, "today", "currently") is
non-normative unless restated as a requirement.

## 1. Context

### 1.1 Problem

On native cloud accounts (Android/iOS), allocation **delete** and **archive**
do not propagate between devices, while transaction changes already do.

- **Deletion is resurrected.** `hooks/useSavings.ts:133-137` (native merge)
  re-creates any local item absent from the remote list:
  ```ts
  if (!remoteItem && !remoteTitleMap.has(localItem.title.toLowerCase())) {
      mergedMap.set(localItem.id, localItem);
      await enqueueAndTrigger('savingsItems', 'create', localItem.id, ...);
  }
  ```
  There is no deletion marker anywhere in the repo (grep: zero hits). When
  device A deletes an item (server row removed), device B — which still holds a
  local copy — treats the absence as "a new item" and re-POSTs it. The deletion
  is undone and rows can accumulate each sync cycle.
- **Archive does not win LWW.** `hooks/useSavings.ts:273-278` builds the native
  sync payload with `updatedAt: existing?.updatedAt || nowTimestamp()` — the
  **pre-archive** timestamp. `hooks/useSavings.ts:241` (web) likewise uses
  `current?.updatedAt || nowTimestamp()`. So an archive is never "newer" than
  the remote row and can lose the LWW comparison
  (`hooks/useSavings.ts:138-152`). The SPEC-73 field-union guard
  (`:144-150`) only rescues a field the remote **omits** (`=== undefined`); a
  server that returns `isArchived: false` (column default) defeats it.
- **Why transactions differ.** `context/TransactionsContext.tsx:143-144` treats
  the API as truth and **replaces** the list on every fetch (SPEC-45 DEC-01/03),
  so remote deletions vanish locally. Savings kept the legacy local-first
  queue + LWW-merge path; SPEC-45 explicitly deferred savings to a follow-up.

### 1.2 Definitions

- **Deletion marker (tombstone):** a persisted per-user record that an item was
  deleted on this device, keyed by item id. Prevents re-adding a row whose
  server delete has not yet been observed.
- **Seen-remote snapshot:** the set of item ids returned by the most recent
  successful `savingsItems` GET for the user. Used to distinguish "remotely
  deleted" (id was on the server, now gone) from "never synced" (id was never on
  the server).
- **Remotely deleted:** a local item whose id is in the seen-remote snapshot but
  absent from the current remote list.
- **Never-synced item:** a local item whose id has never appeared in a
  seen-remote snapshot (created offline/while auto-backup off, or imported).
- **Local-only item:** a local item absent from the current remote list.

### 1.3 Revision note

This is the first version. It implements Option A (client-side deletion
markers) selected by the user on 2026-10-10; it does **not** convert savings to
API-first (that was Option B, declined).

## 2. Constraints (normative)

- **CON-01 — Scope = native cloud accounts.** The behavior changes apply only
  to the native (`Platform.OS !== "web"`) `!isLocal` branch of
  `hooks/useSavings.ts`. Web (SPEC-36 API-direct) and Local accounts
  (SPEC-04 AsyncStorage-only) MUST stay byte-identical.
- **CON-02 — New additive storage keys only.** The spec introduces per-user
  keys `user_{id}_savings_tombstones` and `user_{id}_savings_seen_remote_ids`
  (via `getPrefixedKey`). No existing key (`user_{id}_*`) may change shape or
  meaning.
- **CON-03 — No resurrection of a remotely deleted item.** In the native merge,
  a local-only item whose id is in the seen-remote snapshot MUST be pruned
  (removed from result state and from the local repository) and MUST NOT be
  re-enqueued as a `create`.
- **CON-04 — Tombstoned rows are never re-added.** When seeding the merged map
  from the remote list, any remote row whose id is tombstoned MUST be skipped
  and a `savingsItems` `delete` MUST be (re-)enqueued for it.
- **CON-05 — Never-synced items are preserved.** A local-only item whose id is
  **not** in the seen-remote snapshot MUST retain today's behavior: it is kept,
  and enqueued as a `create` when not tombstoned. This preserves offline-created
  and imported items and keeps auto-backup-off items local.
- **CON-06 — `deleteItem` records a tombstone (native).** On the native path
  only, `hooks/useSavings.ts` `deleteItem` MUST call the marker writer for the
  deleted id (guarded on `activeUserId`). The web path MUST NOT write a
  tombstone. The rethrow behavior (SPEC-76 CON-02) is unchanged.
- **CON-07 — Archive/restore advance `updatedAt`.** `updateItem` MUST stamp the
  mutation with `nowTimestamp()` on both the native local upsert and the native
  sync payload, and on the web request body, so the change is LWW-newer and can
  beat the remote row. No other payload field changes.
- **CON-08 — Snapshot maintenance.** After a successful native remote GET the
  marker store MUST be updated: the seen-remote snapshot MUST be replaced with
  the current remote id set; a tombstone whose id is absent from the remote list
  on a later successful fetch (deletion confirmed server-side) SHOULD be cleared.
- **CON-09 — Backend dependency satisfied.** Archive propagation requires the
  SPEC-73 backend migration and PUT/GET pass-through (`is_archived`,
  `target_amount`, `updated_at`) in `wallet-api`. The user confirmed on
  2026-10-10 that this backend work is **already deployed**, so it is not an
  external blocker; no `wallet-api` change is in scope here. Deletion
  propagation does not require a backend change.
- **CON-10 — No collateral change.** No new dependency; no route, API-contract,
  or storage-shape change beyond CON-02; SPEC-73/74/75/76 behavior otherwise
  byte-identical except where this spec requires. `syncProcessor` 400/404
  handling and the `TransactionsContext` path are untouched.
- **CON-11 — Standing invariants (AGENTS.md §1).** Android + iOS + Web MUST keep
  working; Expo Go MUST NOT crash on import; web MUST stay Vercel-deployable
  (`EXPO_PUBLIC_*` only).
- **CON-12 — TDD + platform matrix (AGENTS.md §1.10).** Guards MUST be `jest`
  tests parameterized by `Platform.OS` (`android`/`ios`/`web`) for logic branches,
  plus user-run Expo Go + web-export manual checks. No platform-only behavior
  without a `CON-*` + `ACC-*` + `D-*`.

## 3. Goal

While keeping the local-first offline model, remember which allocations were
deleted (and which ids the server has ever returned) so the native merge stops
re-creating deleted rows and stops losing the archive to LWW. Result: a delete
or archive performed on any device converges on every device.

### 3.1 Interaction matrix

| Event | Device | Effect |
|---|---|---|
| Delete item | Native cloud (deleting device) | repo delete + enqueue `delete` + record tombstone |
| Delete item | Web | API `DELETE` (unchanged, SPEC-36) |
| Delete item | Native cloud (other device) | item in seen-remote snapshot but absent from remote → **pruned** |
| Archive `{isArchived:true}` | Native cloud | `updatedAt = now` local + sync → LWW-newer → remote takes it (backend permitting, CON-09) |
| Restore `{isArchived:false}` | Native cloud | same, with `isArchived:false` |
| Remote row tombstoned | Native cloud | skipped on merge + `delete` re-enqueued |
| Never-synced local item | Native cloud | kept + enqueued `create` (unchanged) |

### 3.2 Decisions

- **DEC-01** (user, 2026-10-10) — Approach = **Option A**: client-side deletion
  markers; no backend change for deletion.
- **DEC-02** — Cross-device deletion is inferred by comparing the current remote
  id set against the stored **seen-remote snapshot** (CON-03); a local item that
  was once on the server and is now gone is pruned.
- **DEC-03** — A **tombstone** (CON-04/CON-06) covers the window where the
  deleting device's `DELETE` has not yet reached the server, so the remote copy
  cannot re-add the row.
- **DEC-04** — Archive fix is the `updatedAt` advance (CON-07) on top of the
  SPEC-73 field-union guard; server persistence of `is_archived` remains the
  SPEC-73 external dependency (CON-09).
- **DEC-05** — Web and Local accounts are out of scope (CON-01).
- **DEC-06** — One new util file and one new test file, both named by a `D-*`
  (AGENTS.md §1.11/§1.12); no new dependency.
- **DEC-07** (user, 2026-10-10) — CON-03 pruning rule confirmed as drafted; the
  SPEC-73 `wallet-api` migration is **already deployed**, so SPEC-77 is
  client-only with no external backend blocker (CON-09).

### 3.3 Acceptance criteria

**Objective (machine-checkable — jest, parameterized by `Platform.OS`
`android`/`ios`/`web`)**

- **ACC-01** `utils/savingsDeletionMarkers.ts` exports async `getDeletedIds`,
  `markDeleted`, `clearDeleted`, `getSeenRemoteIds`, `setSeenRemoteIds`; the
  tombstones persist under a `getPrefixedKey`-derived `user_{id}_savings_tombstones`
  key and the snapshot under `user_{id}_savings_seen_remote_ids`; round-trip
  works against the AsyncStorage mock (`utils/savingsDeletionMarkers.test.ts`).
- **ACC-02** `hooks/useSavings.ts` `deleteItem`'s **native** branch calls
  `markDeleted(activeUserId, id)` (guarded on `activeUserId`); the web branch
  does not reference any marker function.
- **ACC-03** In `fetchItems`' native merge, a local-only item that is in the
  seen-remote snapshot is **not** added to `mergedMap` and `enqueueAndTrigger(…,
  'create', …)` is **not** called for it; `repos.savingsItems.deleteById` is
  invoked for it (source guard).
- **ACC-04** In the native merge, seeding from `remoteData` skips ids present in
  the tombstone map and enqueues `savingsItems` `delete` for them (source guard).
- **ACC-05** A local-only item **not** in the seen-remote snapshot and not
  tombstoned still follows the existing keep + `enqueueAndTrigger(…, 'create',
  …)` path (source guard).
- **ACC-06** After a successful native remote GET, `setSeenRemoteIds(activeUserId,
  remoteIds)` is called, and confirmed tombstones are cleared via `clearDeleted`
  (source guard).
- **ACC-07** `updateItem` stamps `updatedAt: nowTimestamp()` in the native local
  upsert, the native sync payload, and the web request body; the pre-change
  `existing?.updatedAt || nowTimestamp()` / `current?.updatedAt || nowTimestamp()`
  expressions no longer appear (source guard). SPEC-73 G6 is updated accordingly.
- **ACC-08** No new entry appears in `package.json` dependencies; the only new
  storage keys are those in CON-02.

**Subjective (manual reviewer — Expo Go Android/iOS + web export)**

- **ACC-S01** Sign in to the same cloud account on two devices. Delete an
  allocation on device 1; open Savings on device 2 → the item does not reappear
  after a pull-to-refresh/refocus (no re-upload).
- **ACC-S02** Archive an allocation on device 1; device 2 shows it under
  Archived after refresh (backend already deployed — CON-09), and it stays
  archived (does not bounce back to Active).
- **ACC-S03** Create an allocation while offline, then go online → it uploads
  once and remains; it is not pruned.
- **ACC-S04** No red-box in Expo Go, no new web console errors; web delete still
  works as before.

### 3.4 Platform matrix

| Acc | Android | iOS | Web |
|---|---|---|---|
| ACC-01..ACC-08 (Objective) | jest | jest | jest |
| ACC-S01 | Expo Go | Expo Go | — |
| ACC-S02 | Expo Go | Expo Go | web export (read-only parity) |
| ACC-S03 | Expo Go | Expo Go | — |
| ACC-S04 | Expo Go | Expo Go | web export |

## 4. Deliverables

- **D-77-01** New `utils/savingsDeletionMarkers.ts` — pure data functions over
  `utils/storage.ts` (`getPrefixedKey`, `getItem`, `setItem`):
  `getDeletedIds(userId): Promise<Record<string, number>>`,
  `markDeleted(userId, id, at?)`, `clearDeleted(userId, ids)`,
  `getSeenRemoteIds(userId): Promise<string[]>`,
  `setSeenRemoteIds(userId, ids)`. No `react-native` import at top level; no new
  dependency.
- **D-77-02** `hooks/useSavings.ts` —
  (a) `deleteItem` native branch records a tombstone (`markDeleted`) guarded on
  `activeUserId`; web branch untouched (CON-05/CON-06);
  (b) `fetchItems` native merge: load tombstones + seen-remote snapshot; skip +
  re-enqueue `delete` for tombstoned remote rows (CON-04); prune
  seen-remote-but-absent local items via `deleteById` with no `create`
  re-enqueue (CON-03); keep never-synced local items as today (CON-05); after the
  GET, `setSeenRemoteIds(...)` and `clearDeleted(...)` for confirmed tombstones
  (CON-08);
  (c) `updateItem` stamps `updatedAt: nowTimestamp()` on web body, native local
  upsert, and native sync payload (CON-07);
  (d) no other hook behavior, cache write-through (SPEC-74), or notifier
  (SPEC-75) changes.
- **D-77-03** `utils/savingsDeletionMarkers.test.ts` — unit tests (ACC-01) with
  the AsyncStorage mock, run × android/ios/web.
- **D-77-04** `utils/savingsArchive.test.ts` — extend the existing `runSuite`
  with guards for ACC-02..ACC-07; update SPEC-73 G6 (D-77-02c). No new test file
  beyond D-77-03 (§1.14).
- **D-77-05** Journals — `docs/savepoint.md` entry and `AGENTS.md §3` status
  line (AGENTS.md §1.8), including the CON-09 backend confirmation and the
  unmodified `syncProcessor` retry note.

## 5. Glossary

| Term | Meaning |
|---|---|
| Deletion marker / tombstone | Persisted per-user record that an item was deleted on this device |
| Seen-remote snapshot | Ids the server returned on the last successful GET |
| Remotely deleted | Local item in the seen-remote snapshot now absent from remote |
| Never-synced item | Local item never seen on the server (offline/import); preserved |
| LWW | Last-write-wins by `updatedAt` (existing merge rule) |

## 6. References

- `hooks/useSavings.ts` (`deleteItem`, `updateItem`, `fetchItems` native merge),
  `utils/syncQueue.ts`, `utils/syncProcessor.ts` (`savingsItems` 400/404 —
  SPEC-73 CON-06), `utils/storage.ts` (`getPrefixedKey`/`getItem`/`setItem`).
- `context/TransactionsContext.tsx:143-144` — the API-first replace contract
  this spec deliberately does **not** copy (Option B).
- `specs/73-fix-allocation-archive-persistence.md` — `isArchived` field,
  field-union guard, backend migration dependency, 400/404 surfacing.
- `specs/74-*`, `specs/75-*`, `specs/76-*` — same hook/guard family.
- `specs/45-api-source-of-truth.md` — transactions API-first, savings deferred.
- `specs/04-connection-status-vs-offline-mode.md` (Local accounts),
  `specs/36-web-platform-invariants.md` (web API-direct).
- `AGENTS.md §1.1`, §1.9, §1.10, §1.11, §1.12, §1.14.

## History

- **0.1 (2026-10-10)** — DRAFT. Root cause: native savings merge re-creates
  local-only items (no deletion marker) + archive payload keeps the old
  `updatedAt`. Option A (deletion markers + seen-remote snapshot), no backend
  change for deletion; archive depends on SPEC-73 backend.
- **0.2 (2026-10-10)** — User confirmed the CON-03 seen-remote pruning rule and
  that the SPEC-73 `wallet-api` migration is already deployed (CON-09, DEC-07).
- **1.0 (2026-10-10)** — FINAL per user call. Implementable as drafted; no
  normative change from 0.2.
