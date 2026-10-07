# SPEC-61 — Loading skeletons on every fetch-driven surface

| Field   | Value                                                        |
|---------|--------------------------------------------------------------|
| ID      | SPEC-61                                                      |
| Title   | Loading skeletons on every fetch-driven surface             |
| Status  | FINAL (user-marked 2026-10-07)                                      |
| Owner   | User                                                         |
| Version | v0.1                                                         |
| Scope   | Client only (`wise_wallet`): shared blocks + five first-load-empty branches |
| Non-goals | Fetch logic/timing changes; polling/push; SmartInsights last-good; dashboard branch (byte-identical); new deps; wallet-api |

## Terminology

RFC 2119 keywords MUST, MUST NOT, SHOULD, MAY apply. "Skeleton" = shimmer placeholder composed of `SkeletonLoader` blocks. "First-load-empty" = `loading && list.length === 0` (the `index.tsx:257` precedent). "Cover" = rendering a skeleton over live content (forbidden — inverts SPEC-50).

## Context

`SkeletonLoader` (web-safe pulse, SPEC-06 D-03) and `DashboardSkeleton` exist but serve only the dashboard first load. Five fetch-driven surfaces (dues, savings, reports, completed-dues, archived-allocations) render empty/stale frames during slow loads (web API-direct + cold starts). No blocker exists — the pattern was built once and never extended.

## Constraints

- CON-61-01: Compose from `SkeletonLoader` only; no new dependencies, no new animation code paths — the SPEC-06 driver guard (`Platform.OS !== "web"`) MUST be inherited, never reimplemented.
- CON-61-02: Skeleton renders on first-load-empty ONLY; refetches with content MUST keep content (SPEC-50 precedence).
- CON-61-03: Dashboard branch + `DashboardSkeleton` MUST stay byte-identical.
- CON-61-04: No fetch logic, timing, polling, storage, API, or wallet-api change.
- CON-61-05: Dark mode MUST inherit `surfaceVariant` (no hardcoded shimmer colors).
- CON-61-06: No platform-only behavior without ACC-* + D-* (§1.10).

## Goal

- DEC-61-01: Add `ListRowsSkeleton`, `CardSkeleton`, `ChartSkeleton` to `components/SkeletonLoader.tsx`, composed of `SkeletonLoader` blocks.
- DEC-61-02: Wire each of the five screens' first-load-empty branch to its matching block (rows for dues/completed-dues/archived-allocations/savings lists; card+chart for reports/savings headers as laid out).
- DEC-61-03: Dues `ListEmptyComponent` keeps the truly-empty state; the skeleton owns the empty-loading frame (no double-empty).
- ACC-61-01 (Objective): guards assert the three shared blocks exist and carry the driver guard — android/ios/web.
- ACC-61-02 (Objective): guards assert each of the five screens branches on first-load-empty to its block and never renders a block alongside content — android/ios/web.
- ACC-61-03 (Objective): dashboard branch + `pinGate`/`clearGateWeb`/`insightsDuesSavings` suites green unmodified; lint + tsc clean; no new dep.
- ACC-S01 (Subjective): reviewer cold-loads each surface on web + Expo Go (light + dark) → shimmer in content slots, then content replaces in place; no empty-frame pop, no shimmer over content, no red-box.
- ACC-S02 (Subjective): reviewer pull-to-refreshes dues with content → spinner only, content stays (no skeleton flash).

## Deliverables

- D-61-01: This spec, marked FINAL by the user.
- D-61-02: `components/SkeletonLoader.tsx` — shared blocks only (S1).
- D-61-03: Five screen branches — `app/dues.tsx`, `app/savings.tsx`, `app/(tabs)/reports.tsx`, `app/completed-dues.tsx`, `app/archived-allocations.tsx` (S2a–e).
- D-61-04: `utils/*skeleton*.test.ts` ACC guards (S3).
- D-61-05: `docs/savepoint.md` + `AGENTS.md` §3 (S4).

## Glossary

Skeleton, first-load-empty, cover — as under Terminology.

## References

- SPEC-06 D-03/DEC-03 (driver guard), SPEC-50 D-02 (last-good precedence), SPEC-36 (web API-direct)
- `components/SkeletonLoader.tsx` · `app/(tabs)/index.tsx:257-258`
