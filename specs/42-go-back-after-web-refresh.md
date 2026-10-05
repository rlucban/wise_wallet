# SPEC-42 — GO_BACK Unhandled on Sub-Screens After Web Refresh

| Field     | Value                                                        |
|-----------|--------------------------------------------------------------|
| ID        | SPEC-42                                                      |
| Title     | GO_BACK unhandled on sub-screens after web refresh           |
| Status    | **FINAL** (marked by user 2026-10-05; DEC-01/DEC-02 deferred — no implementation until called) |
| Owner     | TBD (user)                                                   |
| Version   | v1.0 (FINAL; content unchanged from v0.1 except status + D-00) |
| Scope     | All `router.back()` call sites behind `Appbar.BackAction` + post-save `router.back()` calls (14 files, 19 sites — see Context) |
| Non-goals | Navigation restructuring; SPEC-30 session logic; SPEC-36 web invariants; native stack redesign; new dependencies; storage/API/route changes |
| Normative source | This file. `docs/todo-specs.md` T-01 is the diagnosis log, not normative. File+symbol cites are normative; `:line` numbers are hints only. |

## Terminology

RFC 2119 keywords: MUST, MUST NOT, SHOULD, MAY. "Back site" = any `onPress`
or post-save handler that calls `router.back()`. "Empty history" = a
navigation state in which `router.canGoBack()` returns `false` (e.g. web
refresh landed directly on a sub-screen). "Fallback" = the route used when
there is nothing to pop.

## Context

### Problem

Tapping Back on a sub-screen with an empty navigation history emits the
expo-router dev warning `The action 'GO_BACK' was not handled by any
navigator` and goes nowhere.

### Evidence (verified 2026-10-05)

- **14 files, 19 `router.back()` sites, zero guarded by `router.canGoBack()`:**
  `add-transaction.tsx` (BackAction `:231`, post-save `:213`),
  `edit-transaction.tsx` (`:173`, `:161`),
  `transaction-details.tsx` (`:76`, `:51`),
  `add-due.tsx` (`:89`, `:78`), `add-allocation.tsx` (`:80`, `:62`),
  `calendar.tsx:51`, `category-settings.tsx:43`,
  `archived-allocations.tsx:66`, `completed-dues.tsx:167`, `dues.tsx:471`,
  `help.tsx:13`, `notifications.tsx:328`, `payment-methods.tsx:90`,
  `savings.tsx:241`.
- **Known-good pattern exists:** `app/(tabs)/learning-detail.tsx:131-133`
  uses `router.push('/(tabs)/learning')` instead of `router.back()` and never
  triggers the warning.
- GitHub issue `rlucban/wise_wallet#44` (open, label `encounter`) reports this;
  `docs/todo-specs.md` T-01 logs the same diagnosis as OPEN with no spec
  written. No `specs/` file covers `GO_BACK`/`canGoBack` (only incidental
  mention in SPEC-28). This spec is the canonical home (§1.14).

### Likely trigger (hypothesis — NOT yet reproduced)

SPEC-30 v2.4 made web refresh preserve the session (previously forced login).
A refresh on a sub-screen now renders that screen with a BackAction and no
history to pop, where before the user was bounced to `/login` (no BackAction).
The v2.4 change did not create the unguarded calls but plausibly made the
empty-history state reachable. **Repro confirmation is a precondition for
FINAL:** sign in on web → navigate to `/savings` or `/dues` → F5 → tap Back.

### Notes (informative)

- Dev-only warning, explicitly "won't be shown in production" — no shipped
  breakage, but it signals an unreachable route after refresh.
- Fixing means touching up to 14 files; the helper-vs-inline decision (DEC-01)
  and fallback destination (DEC-02) need a user call before implementation.

## Constraints

- **CON-01 — Bare-minimum diff (§1.11).** Only Back sites named in Context MAY
  change. No refactoring, no copy changes, no styling changes, no new screens.
- **CON-02 — No new dependencies (§1.12).** Only `expo-router` (already
  imported at every site) and — if DEC-01 selects a helper — one new
  `utils/` module named in D-*. No npm packages, no native modules.
- **CON-03 — Cross-platform invariant (§1.5).** Android + iOS + Web MUST keep
  working. No statically-imported native-only modules; no Node-only APIs.
- **CON-04 — Vercel-deployable (§1.6).** `expo export --platform web` MUST keep
  working; no secrets in the bundle.
- **CON-05 — Expo Go safe (§1.7).** Nothing MAY crash Expo Go on import;
  degraded paths MUST NOT red-box.
- **CON-06 — Native back-stack preserved.** On Android/iOS with a non-empty
  history, Back MUST pop exactly as today (no push-duplicate, no replace).
  The fallback path MUST be reachable only when `canGoBack()` is false.
- **CON-07 — TDD with cross-platform coverage (§1.10).** `jest` tests MUST be
  parameterized by `Platform.OS` (`android`/`ios`/`web` via mock) for logic
  branches, plus user-run manual checks in Expo Go and web export for paths
  jest cannot prove. No platform-only behavior without a CON + ACC + D.
- **CON-08 — No contract changes.** No storage-key, API-contract,
  AsyncStorage-shape, route, or native-dependency change. Any migration would
  need its own spec with rollback (§1.4) — none is authorized here.

## Goal

- **DEC-01 (DECIDED 2026-10-05 — user `do all` accepts recommendation):** (a) central `safeGoBack` helper in `utils/` — one testable unit, consistent fallback, 19 one-line call-site swaps. Rejected (b) inline guards (19 duplicated blocks, drift risk).
  - (a) Central `safeGoBack` helper in `utils/` (recommended) — one testable
    unit, consistent fallback, 19 one-line call-site swaps.
  - (b) Inline `if (router.canGoBack()) … else …` at each site — no new file,
    but 19 duplicated blocks with drift risk.
- **DEC-02 (DECIDED 2026-10-05 — user `do all` accepts recommendation):** `router.replace('/')` — matches the established precedent at `app/_layout.tsx:202`. Single consistent target across all sites.
  Candidates: `router.replace('/')` vs `router.replace('/(tabs)')` (dashboard).
  MUST be a single consistent target across all sites.
- **DEC-03:** Post-save `router.back()` calls (5 sites) get the SAME guard as
  BackAction sites — a refresh-on-form followed by save hits the same empty
  history.

### Acceptance

Objective (machine-checkable):

| ID | Android | iOS | Web | Check |
|----|---------|-----|-----|-------|
| ACC-01 | ✅ | ✅ | ✅ | Zero unguarded `router.back()` remain at the 19 listed sites (grep `router.back()` → every occurrence preceded by a `canGoBack` check or routed through the DEC-01 helper) |
| ACC-02 | ✅ | ✅ | ✅ | Helper (if DEC-01a): `canGoBack() === true` → calls `router.back()` exactly once, never touches fallback; verified on `android` / `ios` / `web` via `Platform.OS` mock |
| ACC-03 | ✅ | ✅ | ✅ | Helper (if DEC-01a): `canGoBack() === false` → calls `router.replace()` with the DEC-02 fallback exactly once, never calls `back()`; verified on `android` / `ios` / `web` |
| ACC-04 | ✅ | ✅ | ✅ | `npm test` 0 failed; `npm run lint` 0 errors/0 warnings; `npx tsc --noEmit` 0 errors |

Subjective (reviewer-observed):

- **ACC-S01:** Web (`expo export` build or dev): sign in → `/savings` → F5 → tap Back → lands on DEC-02 fallback, zero console `GO_BACK` warning.
- **ACC-S02:** Web: same F5-then-Back matrix on `/dues`, one add-form (e.g. `/add-transaction`), and `/transaction-details`.
- **ACC-S03:** Native (Expo Go, Android and iOS): normal drill-in → Back pops to the previous screen (CON-06 — no push-duplicate, no replace flash).
- **ACC-S00 (precondition for FINAL, not implementation):** reviewer confirms the F5-then-Back repro produces the `GO_BACK` warning on the unpatched tree.

## Deliverables

- **D-00:** FINAL marked by the user 2026-10-05; DEC-01=(a) helper, DEC-02=`/` decided via `do all` (recommendations accepted, recorded above — correctable by user). Implementation authorized via `code this for me` + `do all`.
- **D-01 (only if DEC-01a):** `utils/backNavigation.ts` — `safeGoBack(router, fallback?)` implementing the CON-06 branch (CON-02, CON-07).
- **D-02:** Call-site migration — all 19 Back sites use the DEC-01 mechanism with the DEC-02 fallback (CON-01, CON-06). No other file touched (§1.13 validation gate).
- **D-03:** `utils/backNavigation.test.ts` (only if DEC-01a; if DEC-01b, grep-based ACC-01 + manual matrix only, stated as a §1.10 gap) — ACC-01..ACC-04 across `android`/`ios`/`web`.
- **D-04:** User-run matrix ACC-S01..S03 (+ ACC-S00 pre-FINAL).
- **D-05:** `docs/savepoint.md` + `AGENTS.md` §3 entry (§1.8).

## Glossary

- **Back site:** any handler calling `router.back()`.
- **Empty history:** navigation state where `router.canGoBack()` is false.
- **Fallback:** the DEC-02 route used when there is nothing to pop.
- **GO_BACK:** the React Navigation action `router.back()` dispatches.

## References

- `rlucban/wise_wallet#44` — issue (open, `encounter`; no comments; no linked PRs; Projects item `262407361` not readable via MCP — `insufficient scopes`)
- `docs/todo-specs.md` T-01 — diagnosis log (non-normative)
- `app/(tabs)/learning-detail.tsx:131-133` — known-good push pattern
- Back sites: `app/add-transaction.tsx:213,231` · `app/edit-transaction.tsx:161,173` · `app/transaction-details.tsx:51,76` · `app/add-due.tsx:78,89` · `app/add-allocation.tsx:62,80` · `app/calendar.tsx:51` · `app/category-settings.tsx:43` · `app/archived-allocations.tsx:66` · `app/completed-dues.tsx:167` · `app/dues.tsx:471` · `app/help.tsx:13` · `app/notifications.tsx:328` · `app/payment-methods.tsx:90` · `app/savings.tsx:241`
- `specs/30-force-reauth-on-cold-start.md` v2.4 — session-preserving refresh (plausible trigger, not root cause)
- `specs/28-dedicated-archived-allocations-screen.md` — only prior spec mentioning `router.back()` (incidental, not a fix)
