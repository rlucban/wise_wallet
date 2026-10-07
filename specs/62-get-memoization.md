# SPEC-62 — GET memoization (60s TTL cache in authFetch)

| Field   | Value                                                        |
|---------|--------------------------------------------------------------|
| ID      | SPEC-62                                                      |
| Title   | GET memoization (60s TTL cache in authFetch)                |
| Status  | FINAL (user-marked 2026-10-07)                                      |
| Owner   | User                                                         |
| Version | v0.1                                                         |
| Scope   | Client only (`wise_wallet`): read-through cache + bypass threading |
| Non-goals | 401/unwrap changes; `?id=` sync reads; polling/push/revalidate; server; new deps; storage persistence |

## Terminology

RFC 2119 keywords MUST, MUST NOT, SHOULD, MAY apply. "Heavy" = collection GETs (`transactions`, `dues`, `savingsItems` first segments). "Bypass" = skip-cache read that re-stores. "Wipe" = clear all entries (auth change). "Invalidate" = drop entries sharing a first-segment prefix (mutation).

## Context

SPEC-36 web API-direct makes every read pay full latency + cold starts; repeat mount/focus fetches burn the shared 20/15min budget. `authFetch` (`utils/apiClient.ts:61-129`) is the single choke point with centralized unwrap + 401 handling. A1 (FINAL user call, amended 2026-10-07): 60s TTL, heavy collections, manual-only bypass, memory-only, endpoint keys, invalidate-on-mutation, wipe on auth change. Amends SPEC-45 fetch-through semantics for ≤60s windows.

## Constraints

- CON-62-01: GET-only; mutations (POST/PUT/DELETE) MUST pass through and invalidate their collection prefix.
- CON-62-02: Only `ok` responses populate; 401s MUST NEVER populate and MUST wipe.
- CON-62-03: Keys MUST be endpoint-alone (SPEC-59 rotates tokens; token keys would never hit); single live session + wipe-on-auth-change makes this safe.
- CON-62-04: Expiry MUST be lazy (`Date.now` on read) — no timers (open-handle leak class).
- CON-62-05: Memory-only `Map`; entry cap 50, drop-oldest; no AsyncStorage (SPEC-36).
- CON-62-06: 401 handling + envelope unwrap MUST stay byte-identical in behavior.
- CON-62-07: No platform-only behavior without ACC-* + D-* (§1.10).

## Goal

- DEC-62-01: Third param `opts?: { skipCache?: boolean }` (additive, backward compatible); manual refresh (pull-to-refresh, explicit retry) passes `skipCache: true`, then re-stores. Focus-refetch serves cache (amended 2026-10-07 per user call: focus-bypass would refetch on every tab switch, erasing the latency win the cache exists for; ≤60s staleness already accepted).
- DEC-62-02: Heavy matcher = first path segment of {`transactions`, `dues`, `savingsItems`}; everything else (incl. `?id=` checks, profiles, categories) passes through uncached.
- DEC-62-03: `invalidateGetCache(prefix)` exported; called on every local mutation path with the collection segment.
- DEC-62-04: Wipe wired into the 401 branch, `login`, and `logout` (AuthContext).
- ACC-62-01 (Objective): guards assert TTL const 60s, endpoint-alone keys, ok-only store, lazy expiry, cap-50 — android/ios/web.
- ACC-62-02 (Objective): guards assert mutation methods invalidate, 401/login/logout wipe, skip flag bypasses + re-stores — android/ios/web.
- ACC-62-03 (Objective): `apiClient` unwrap/401 suites green unmodified; lint + tsc clean; no new dep.
- ACC-S01 (Subjective): reviewer remounts dues within 60s → instant paint, zero network (HAR: no second GET); pull-to-refresh → fresh GET fires.
- ACC-S02 (Subjective): reviewer writes on mobile, checks web after >60s (or pull) → appears; logout/login → no cross-session rows.

## Deliverables

- D-62-01: This spec, marked FINAL by the user.
- D-62-02: `utils/apiClient.ts` — cache layer only (S1).
- D-62-03: Bypass threading at manual-refresh call sites only — `hooks/useDues.ts` opts param + `app/dues.tsx` pull-to-refresh (the only pull surface) (S2).
- D-62-04: `utils/*cache*.test.ts` ACC guards (S3).
- D-62-05: `docs/savepoint.md` + `AGENTS.md` §3 (S4).

## Glossary

Heavy, bypass, wipe, invalidate — as under Terminology.

## References

- SPEC-45 (amended: fetch-through), SPEC-36 CON-W-03, SPEC-59 (token rotation), SPEC-44 (401 latch)
- `utils/apiClient.ts:61-129` · `hooks/useDues.ts:48` · `context/TransactionsContext.tsx:129`
