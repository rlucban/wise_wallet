# SPEC-60 — Dues/savings-aware Highlights + web dues convergence

| Field   | Value                                                        |
|---------|--------------------------------------------------------------|
| ID      | SPEC-60                                                      |
| Title   | Dues/savings-aware Highlights + web dues convergence        |
| Status  | FINAL (user-marked 2026-10-07)                                      |
| Owner   | User                                                         |
| Version | v0.1                                                         |
| Scope   | Client only (`wise_wallet`): insights memo + dues fetch triggers |
| Non-goals | wallet-api change; polling/websocket/SSE; PasscodeContext; secureStorage; SPEC-59 gates; relaxing SPEC-50 flicker guarantees |

## Terminology

RFC 2119 keywords MUST, MUST NOT, SHOULD, MAY apply. "Fingerprint" = a stable string join (`id:updatedAt:…`) identifying collection contents. "Memo gate" = the `useMemo` dependency list deciding recompute. "Last-good" = SPEC-50 D-02 cached-insights rendering. "Convergence" = web showing mobile-written data after a fetch.

## Context

SPEC-50 keyed `useInsights` on `txKey` only (dues/savings via refs) to kill the Highlights flicker. Traced effect: dues/savings changes NEVER recompute insights on any platform; web amplifies it because every read is a network round-trip (SPEC-36) with no push channel and fetch-on-mount/focus only (`useDues.fetchDues`, `dues.tsx:79-82`). Result: dues appear late on web, Highlights lag them further until an unrelated transaction changes.

## Constraints

- CON-60-01: Client-only; no `wallet-api` file touched; no push/polling transport introduced.
- CON-60-02: SPEC-50 flicker guarantees KEPT — no null-flash, latest-1 cap, last-good cache. Any slice breaking them stops the run.
- CON-60-03: Memo widened minimally — string fingerprints, never object identity — so unrelated re-renders MUST NOT recompute.
- CON-60-04: SPEC-36 web API-direct untouched; no local dues/insights store on web.
- CON-60-05: No new dependencies, no storage-key changes, no migration.
- CON-60-06: No platform-only behavior without ACC-* + D-* (§1.10).

## Goal

- DEC-60-01: `duesKey` + `savingsKey` (same `id:updatedAt…` join pattern as `txKey`) join the insights memo deps; the refs pattern stays for render reads.
- DEC-60-02: Last-good/no-null-flash/latest-1 behavior MUST stay byte-identical in observable effect.
- DEC-60-03: Dues focus-refetch MUST fire on web tab switches (verify, fix wiring only if broken); pull-to-refresh added ONLY if absent on the dues web view.
- ACC-60-01 (Objective): guards assert the memo dep list includes dues + savings fingerprints — android/ios/web.
- ACC-60-02 (Objective): guards assert the dues focus effect + `refetch` wiring present — android/ios/web.
- ACC-60-03 (Objective): `pinGate`/`pinChange`/`clearGateWeb` suites green unmodified; lint + tsc clean; no new dep.
- ACC-S01 (Subjective): reviewer records a due on mobile, focuses the dues tab on web → due appears post-fetch; dashboard Highlights update with no transaction change; no flash or empty frame (Expo Go + web export).
- ACC-S02 (Subjective): native repeat — no flicker return, latest-1 cap intact.

## Deliverables

- D-60-01: This spec, marked FINAL by the user.
- D-60-02: `hooks/useInsights.ts` — memo key only (S1).
- D-60-03: `components/SmartInsights.tsx` — ONLY if last-good interplay requires (S1 contingency).
- D-60-04: `app/dues.tsx` + `hooks/useDues.ts` — fetch triggers only (S2).
- D-60-05: `utils/*insights*.test.ts` ACC guards (S3).
- D-60-06: `docs/savepoint.md` + `AGENTS.md` §3 (S4).

## Glossary

Fingerprint, memo gate, last-good — as under Terminology. Convergence = web showing mobile-written data after a fetch.

## References

- SPEC-50 D-01/D-02 (amended: D-01 only), SPEC-36 CON-W-03, SPEC-45 (API truth)
- `hooks/useInsights.ts:26-32` · `hooks/useDues.ts:42-92` · `app/dues.tsx:79-82` · `components/SmartInsights.tsx`
