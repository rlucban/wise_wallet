# SPEC-49 — Scheduled-Transaction Deletion Lock Persistence (dueId link map)

| Field    | Value                                                                                          |
|----------|------------------------------------------------------------------------------------------------|
| ID       | SPEC-49                                                                                        |
| Title    | Paid-due transactions keep their due link across refetch so the SPEC-32 deletion lock holds    |
| Status   | **DRAFT v0.1** (FINAL only on explicit user mark; zero code before that, per AGENTS §1.1)      |
| Owner    | TBD (user)                                                                                     |
| Version  | v0.1                                                                                           |
| Scope    | Client-side due-link persistence only: write-time id map, read-time re-attach, prune on delete, pure helpers + tests under `utils/`, journal |
| Non-goals | Server change (wallet-api out of tree); Due/Transaction type change; re-linking history already unlinked; transactions writer behavior; routes; dependencies |

## Terminology

RFC 2119 keywords: MUST, MUST NOT, SHOULD, MAY. "Link" = transaction-id → due-id association. "Server id" = the minted id returned by POST 201. "Scheduled row" = a transaction born from a due (`recordTransaction`). "Mirror" = SPEC-45 verbatim AsyncStorage copy (must stay server-exact).

## Context

### Problem

SPEC-32 D-04 hides Delete for scheduled-dues transactions — but the server echoes `dueId: null`, and online reads replace state wholesale, so after any refetch the link is gone and Delete reappears on exactly the rows it protects. Holds only for Local accounts and the seconds between pay and refetch.

### Evidence (read-only, static + HAR, 2026-10-06)

- Lock site reads the link (`app/transaction-details.tsx`, SPEC-32 D-04 `{!isScheduled && …}` on `transaction.dueId`).
- Pay path sends it (`app/dues.tsx:295` `dueId: item.id`); POST 201 and all GET rows return `"dueId": null` (localhost.har — same field-dropping class as title/category).
- Online reads replace state (SPEC-45 DEC-01; web API-direct; native `refreshFromApi` replace) — nothing re-attaches the link.
- Local rows keep it (AsyncStorage round-trip) — the bug is online-only. History already unlinked is unrecoverable (same class as pre-fix `categoryId: null`).

### User decisions

- Mechanism (recommended in this draft; FINAL confirms): client-side id map (server id → due id) written from the POST 201 response, re-attached on read. Server-side persist is the architecturally right fix but needs backend access — parked alternative, not pursued here.

## Constraints

- **CON-01 — Bare-minimum (§1.11).** Only D-* files MAY change.
- **CON-02 — No new dependencies (§1.12).**
- **CON-03 — Cross-platform (§1.5).** No native-only imports; no Node APIs in app code.
- **CON-04 — Vercel-deployable + Expo Go safe (§1.6/§1.7).**
- **CON-05 — Local parity.** Map maintained on all paths (client UUIDs link the same way); harmless where the field already survives.
- **CON-06 — Additive only (§1.4).** One NEW AsyncStorage key; Due/Transaction types, existing keys, routes, native deps unchanged. Mirror stays verbatim — re-attach applies to UI state only, never into the mirror.
- **CON-07 — TDD cross-platform (§1.10).** jest parameterized android/ios/web + user-run Expo Go + web-export matrix.
- **CON-08 — One home (§1.14).** SPEC-32 (lock ref only), SPEC-45 (verbatim mirror), SPEC-46 (U1-class live proof pattern) cross-referenced, never re-normed.
- **CON-09 — Ordering.** D-01..D-04 land only after D-00 (FINAL).
- **CON-10 — No history repair.** Rows already unlinked stay unlinked.

## Goal

- **DEC-01 — Write-time map.** On successful online POST carrying `dueId`, persist `{serverTxId: dueId}` to new key `user_{id}_due_tx_links`. Precedence on read: server-echoed `dueId` wins if ever present, else map, else absent.
- **DEC-02 — Read-time re-attach.** `refreshFromApi` + web fetch spread re-attached rows for UI state; mirror write happens BEFORE attach (verbatim preserved).
- **DEC-03 — Prune.** Mapping entries drop on `deleteTransaction` success and when their due is deleted (filter by value).
- **DEC-04 — Lock site untouched.** `transaction-details.tsx` keeps reading `transaction.dueId` — now re-attached upstream. No edit there.

### Interaction matrix

| # | Account | Platform | Behavior |
|---|---------|----------|----------|
| 1 | Online  | mobile/web | Link mapped on write, re-attached on read; Delete stays hidden for scheduled rows |
| 2 | Local   | mobile   | Field survives natively; map maintained uniformly (no-op effect) |
| 3 | Offline | —        | Existing hard-error behavior (unchanged) |

### Acceptance

Objective (jest, `Platform.OS` = android/ios/web):

| ID     | Check                                                                                          |
|--------|------------------------------------------------------------------------------------------------|
| ACC-01 | POST-response id → map write (source-text guard)                                               |
| ACC-02 | Read paths re-attach with echo-wins precedence; mirror written before attach (source-text guards) |
| ACC-03 | Prune on transaction delete + due delete (source-text guards)                                  |
| ACC-04 | Lock site (`transaction-details.tsx`) byte-identical (diff-empty guard)                        |
| ACC-05 | New storage key additive only; Due/Transaction types untouched (source-text guards)             |
| ACC-06 | `npm test` 0 failed; `npm run lint` clean; `npx tsc --noEmit` clean (user-run per §1.3)        |

Subjective (reviewer-observed, Expo Go + web export):

- **ACC-S01:** Pay a due → refetch/tab-switch → details still hides Delete for that row.
- **ACC-S02:** Ordinary (non-scheduled) rows remain deletable.
- **ACC-S03:** Web mirrors S01–S02; `expo export --platform web` clean.

## Deliverables

- **D-00:** User marks this spec FINAL (status flip v1.0). Gates D-01..D-04.
- **D-01:** Write-path map (`context/TransactionsContext.tsx` add flow + new storage key). Nothing else.
- **D-02:** Read re-attach (same file `refreshFromApi` + web fetch; mirror order per DEC-02). Nothing else.
- **D-03:** Prune wiring (delete paths). Nothing else.
- **D-04:** `utils/` pure helpers (`attachDueLinks`, `pruneLinks`) + tests (ACC pure + guards; SPEC-07 tsc exclusion respected). Helper file named here at implementation.
- **D-05:** Journal — `docs/savepoint.md` + `AGENTS.md` §3 entry (incl. live POST proof + HAR verdicts).

## Glossary

- Link / Server id / Scheduled row / Mirror — see Terminology.
- Echo-wins — a server-echoed `dueId`, if ever present, beats the local map.

## References

- `specs/32-completed-dues-screen-and-transaction-deletion-lock.md` (D-04 lock) · `specs/45-api-source-of-truth.md` (verbatim mirror) · `specs/46-transaction-category-persistence.md` (U1-class probe pattern; same field-dropping class) · `app/dues.tsx:295` (dueId sent) · `app/transaction-details.tsx` (lock site) · localhost.har (201 + GETs echo `dueId:null`).
