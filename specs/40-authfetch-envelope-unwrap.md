# SPEC-40 — authFetch Envelope Unwrap

| Field     | Value                                                        |
|-----------|--------------------------------------------------------------|
| ID        | SPEC-40                                                      |
| Title     | authFetch envelope unwrap                                    |
| Status    | FINAL (marked by user 2026-10-05; implementable per AGENTS §1.1) |
| Owner     | TBD (user)                                                   |
| Version   | v0.1                                                         |
| Scope     | `utils/apiClient.ts` response unwrapping; new `utils/apiClient.test.ts` |
| Non-goals | Backend response shape; the 401 / `onAuthFailure` path; all 8 consumer files (byte-identical); register/login account-mode logic; SPEC-30 CON-10 `isFirstRun` semantics |

## Terminology

RFC 2119 keywords: MUST, MUST NOT, SHOULD, MAY. "Envelope" = the server's
`{status, results, data}` response body. "Wrapper key" = the single key inside
`data` that names the payload (`transactions`, `profile`, …). "Flat" = the
payload itself, which is what every consumer already expects.

## Context

`apiClient.ts:69` unwraps the envelope exactly one level
(`body.status === 'success' && body.data ? body.data : body`), but every list
endpoint nests its payload one level deeper still — verified from a HAR capture
(17 exchanges, all HTTP 200):

```
GET /api/transactions → data = { transactions: [...] }
GET /api/categories   → data = { categories: [...] }
GET /api/dues         → data = { dues: [...] }
GET /api/savingsItems → data = { savingsItems: [...] }
GET /api/userProfiles → data = { profile: {...} }
```

So `authFetch<Transaction[]>` yields `{transactions:[…]}`, and every consumer's
`Array.isArray(data)` guard fails. Nothing throws — `ok` is `true` — so each
consumer silently keeps its empty or default state. Eight call sites are
affected; `UserProfileContext` is the visible one, because
`setProfile(DEFAULT_PROFILE)` sets `isFirstRun: true` (line 22) and
`_layout.tsx:195` then replays `/intro` → `/onboarding` on every web refresh.

## Constraints

- **CON-01:** `authFetch` MUST unwrap a known wrapper key from `data`, so
  consumers receive the flat payload their existing type annotations already
  declare.
- **CON-02 — Name-based, never count-based.** The unwrap MUST key off a known
  wrapper name, never off "the object has exactly one key". `storage/upload`
  returns `{url}` — a legitimate single-key object — and MUST pass through
  untouched (`TransactionsContext.tsx:68-78` tests `'url' in uploadData`).
- **CON-03 — Consumers untouched.** `UserProfileContext`, `CategoriesContext`,
  `TransactionsContext`, `useDues`, `useSavings`, `add-transaction`,
  `payment-methods`, and `settings` MUST remain byte-identical.
- **CON-04 — 401 path untouched.** The `response.status === 401` branch,
  `clearAuthStorage`, and the `onAuthFailure` callback MUST remain byte-identical.
- **CON-05:** The wrapper-key set MUST be exported, so a new endpoint forces a
  deliberate addition rather than a silent empty list.
- **CON-06:** No backend change; no dependency change; no storage-key change;
  `expo export --platform web` clean; Expo Go unaffected.

## Goal

- **DEC-01:** Fix centrally in `authFetch` (the types already promise flat).
- **DEC-02:** Guard by known wrapper name (CON-02), not key count.
- **DEC-03:** Export the key set (CON-05) so an unmapped endpoint is visible.

### Acceptance

Objective (machine-checkable):

| ID | Android | iOS | Web | Check |
|----|---------|-----|-----|-------|
| ACC-01 | — | — | ✅ | `authFetch` returns the array for each of `transactions`, `categories`, `dues`, `savingsItems` |
| ACC-02 | — | — | ✅ | `authFetch` returns the object for `profile` |
| ACC-03 | — | — | ✅ | `{url}` passes through unchanged (CON-02 hazard) |
| ACC-04 | — | — | ✅ | an unknown wrapper key is NOT unwrapped (fails loudly, not silently) |
| ACC-05 | — | — | ✅ | non-`success` / no-`data` bodies keep current behavior |
| ACC-06 | ✅ | ✅ | ✅ | `npm test` 0 failed; `npm run lint` 0 errors/0 warnings; `npx tsc --noEmit` 0 errors |

Subjective (reviewer-observed):

- **ACC-S01:** Web: onboard, then F5 → dashboard persists, no wizard.
- **ACC-S02:** Web: categories, transactions, dues, and savings all populate.
- **ACC-S03:** Web: receipt photo upload still stores a URL (the `{url}` case).
- **ACC-S04:** Native (Expo Go): no regression in local-first read paths.

## Deliverables

- **D-00:** This spec marked FINAL by the user.
- **D-01:** `utils/apiClient.ts` — exported wrapper-key set + guarded unwrap
  (CON-01, CON-02, CON-05). 401 path byte-identical (CON-04).
- **D-02:** `utils/apiClient.test.ts` — ACC-01..ACC-05.
- **D-03:** User-run matrix ACC-S01..S04.
- **D-04:** `docs/savepoint.md` + `AGENTS.md` §3 entry.

## Glossary

- **Envelope:** `{status, results, data}` server response body.
- **Wrapper key:** the single key inside `data` naming the payload.
- **Flat payload:** the payload itself, already assumed by every consumer's
  type annotation.

## References

- `utils/apiClient.ts:69` — the single-level unwrap (root cause)
- `context/UserProfileContext.tsx:22,63-75` — `DEFAULT_PROFILE.isFirstRun: true`
- `app/_layout.tsx:195` — `profile?.isFirstRun` → `/intro`
- `context/TransactionsContext.tsx:68-78` — `{url}` consumer (the hazard)
- `context/CategoriesContext.tsx:42,54` · `context/TransactionsContext.tsx:93,104`
  · `hooks/useDues.ts:49,61` · `hooks/useSavings.ts:56,69`
  · `app/add-transaction.tsx:82` · `app/payment-methods.tsx:39`
  · `app/(tabs)/settings.tsx:290-292,403-407,670-673,949-951` — the 8 failing sites
- `specs/36-web-platform-invariants.md` (CON-W-03, API-direct, no local fallback)