# SPEC-50 — Dashboard Highlights Stability + Recent-Five by UpdatedAt

| Field    | Value                                                                                          |
|----------|------------------------------------------------------------------------------------------------|
| ID       | SPEC-50                                                                                        |
| Title    | Highlights no longer flicker across refetch; Recent shows the 5 latest-updated transactions     |
| Status   | **DRAFT v0.1** (FINAL only on explicit user mark; zero code before that, per AGENTS §1.1)      |
| Owner    | TBD (user)                                                                                     |
| Version  | v0.1                                                                                           |
| Scope    | Dashboard display only: Highlights stability (memoize + no null-flash) + Recent-5-by-updatedAt rule (pure helper + wiring), tests under `utils/`, journal |
| Non-goals | Insight content/copy changes; other screens' lists; server change; routes; dependencies |

## Terminology

RFC 2119 keywords: MUST, MUST NOT, SHOULD, MAY. "Flicker" = visible mount/unmount or content swap of the Highlights section across refetch cycles unrelated to data change. "Last-good" = the previously computed insight list, held during transient empty states. "Updated-desc" = sort by `updatedAt` descending (latest first).

## Context

### Problem

Two dashboard display defects (user-reported): (1) the Highlights section flickers — it visibly appears/disappears on navigation and data refresh; (2) Recent transactions should show (at least) 5 ordered by last-updated (latest), but today show 6 ordered by transaction date.

### Evidence (read-only, static, 2026-10-06)

- Highlights = `components/SmartInsights.tsx` (header :63), driven by `hooks/useInsights.ts` which builds a FRESH array on EVERY render (no memo) from transactions/savings/dues.
- Dashboard refetches everything on every focus (`app/(tabs)/index.tsx:67-76`) with intermediate states (local-then-remote in dues/savings paths) — each intermediate snapshot recomputes a different list.
- Empty list unmounts the whole section (`SmartInsights.tsx:11,24` `return null`) — empty→populated pop-in across every refetch cycle is the flicker mechanism. Stable per-content ids already exist (`allocations-total`, `due-near-<id>`).
- Recent = `transactionData` (`app/(tabs)/index.tsx:108-111`): date-desc + `slice(0, 6)`.
- Ordering hazard: server rows omit `updatedAt` (SPEC-43) and SPEC-45 forbids re-stamping — a naive missing=0 sort would sink exactly the server rows. Fallback to transaction date is required.

### User decisions

- Outcome-normed flicker fix (memoize + last-good/skeleton + stable keys); no content/copy change.
- Recent = top 5 by updatedAt desc (fewer iff fewer exist); missing `updatedAt` falls back to transaction date. The "at least 5" reading is proposed here — FINAL confirms (alternative reading: minimum-5-with-more-context, rejected as unbounded).

## Constraints

- **CON-01 — Bare-minimum (§1.11).** Only D-* files MAY change.
- **CON-02 — No new dependencies (§1.12).**
- **CON-03 — Cross-platform (§1.5).** No native-only imports; no Node APIs in app code.
- **CON-04 — Vercel-deployable + Expo Go safe (§1.6/§1.7).**
- **CON-05 — Content frozen.** Insight titles/messages/copy unchanged; only stability of rendering.
- **CON-06 — Dashboard-only (§1.4 scope discipline).** No other screen's list changes.
- **CON-07 — TDD cross-platform (§1.10).** jest parameterized android/ios/web + user-run Expo Go + web-export matrix.
- **CON-08 — One home (§1.14).** SPEC-43 (missing updatedAt), SPEC-45 (no re-stamp) cross-referenced, never re-normed.
- **CON-09 — Ordering.** D-01..D-03 land only after D-00 (FINAL).

## Goal

- **DEC-01 — Stability.** `useInsights` memoized on its inputs; transient-empty renders last-good (or skeleton), never a null-flash unmount; keys stay the existing stable ids.
- **DEC-02 — Recent rule.** New pure `selectRecentTransactions` helper in `utils/`: sort key `updatedAt`-desc with transaction-date fallback when absent, take 5 (all if fewer). Dashboard wires it, replacing the inline date-sort + `slice(0, 6)`.

### Interaction matrix

| # | Platform | Behavior |
|---|----------|----------|
| 1 | android/ios/web | Highlights stable across focus/refetch; Recent = 5 latest-updated |

### Acceptance

Objective (jest, `Platform.OS` = android/ios/web):

| ID     | Check                                                                                          |
|--------|------------------------------------------------------------------------------------------------|
| ACC-01 | `useInsights` memoized on [transactions, savingsItems, dues] (source-text guard)               |
| ACC-02 | No null-flash path: loading/transient-empty renders last-good or skeleton (source-text guard)  |
| ACC-03 | Helper: updated-desc ordering; missing-updatedAt date fallback; top-5 cap; fewer-if-fewer (pure asserts) |
| ACC-04 | Dashboard uses the helper; inline date-sort + `slice(0, 6)` gone (source-text guards)           |
| ACC-05 | `npm test` 0 failed; `npm run lint` clean; `npx tsc --noEmit` clean (user-run per §1.3)        |

Subjective (reviewer-observed, Expo Go + web export):

- **ACC-S01:** Tab-switch / focus storm → Highlights stable, no blink or content swap.
- **ACC-S02:** Fresh launch → skeleton-or-content, never a flash of absent section.
- **ACC-S03:** Recent shows the 5 latest-updated transactions (latest first).
- **ACC-S04:** Web mirrors S01–S03; `expo export --platform web` clean.

## Deliverables

- **D-00:** User marks this spec FINAL (status flip v1.0; confirms the top-5 reading). Gates D-01..D-03.
- **D-01:** Flicker (`hooks/useInsights.ts` memo + `components/SmartInsights.tsx` no-flash render). Nothing else in those files.
- **D-02:** Recent rule (new pure helper in `utils/` + `app/(tabs)/index.tsx` wiring). Nothing else.
- **D-03:** `utils/` tests (ACC-03 pure asserts + ACC-01/02/04 guards; SPEC-07 tsc exclusion respected). Helper test file named here at implementation.
- **D-04:** Journal — `docs/savepoint.md` + `AGENTS.md` §3 entry.

## Glossary

- Flicker / Last-good / Updated-desc — see Terminology.
- Null-flash — the empty→`return null`→populated cycle that reads as flicker.

## References

- `components/SmartInsights.tsx:11,24,63-69` (null-flash + header + keys) · `hooks/useInsights.ts:14-56` (fresh array per render) · `app/(tabs)/index.tsx:67-76,108-111` (focus refetch + date-sort slice-6) · `specs/43-onboarding-opening-balance-once-only.md` (server omits updatedAt) · `specs/45-api-source-of-truth.md` (no re-stamp).
