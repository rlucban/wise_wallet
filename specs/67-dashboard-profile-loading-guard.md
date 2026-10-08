# Spec 67: Dashboard Profile Loading Guard

| Field | Value |
|---|---|
| ID | SPEC-67 |
| Title | Dashboard Profile Loading Guard |
| Status | **FINAL** (2026-10-08 per user call — "FINAL") |
| Owner | User (final authority) |
| Version | 0.1 — initial draft |
| Scope | Resolve the undefined `profile` reference and unused transaction-loading bindings in `app/(tabs)/index.tsx`. |
| Non-goals | Changing dashboard UI, loading conditions, data fetching, transaction handling, routes, storage, API behavior, or dependencies. |
| Normative source | This file. It is active because the user marked it FINAL. |

> RFC 2119 keywords **MUST**, **MUST NOT**, **SHOULD**, and **MAY** express
> normative requirements below. They are active because this spec is FINAL.

## 1. Context

`Dashboard` calls `useUserProfile()` but destructures only `isLoading` as
`profileLoading`; later, the loading guard references an undeclared `profile`,
causing `TS2304`. The same component destructures transaction `loading` as
`txLoading`, assigns it to `loading`, and never uses either binding, producing
an ESLint unused-variable warning.

## 2. Constraints

- **CON-01 — Single-file scope.** Changes MUST be limited to
  `app/(tabs)/index.tsx` plus the documentation paths named in D-02.
- **CON-02 — Preserve existing guard behavior.** The Dashboard MUST continue
  to render `DashboardSkeleton` only when no profile is loaded and the profile
  is still loading. The fix MUST use the `profile` value already returned by
  `useUserProfile()`; it MUST NOT add another state value, request, or hook.
- **CON-03 — Remove unused bindings only.** The unused transaction `loading`
  destructuring/alias MUST be removed if it has no other consumer. The
  `useTransactions()` hook call and all other returned fields MUST remain
  unchanged.
- **CON-04 — Cross-platform invariant.** Android, iOS, and Web behavior MUST
  remain identical. No platform branch, dependency, storage, API, route, or
  native-module change is allowed.
- **CON-05 — Validation.** The user runs `npx tsc --noEmit` and
  `npm run lint` and supplies output per AGENTS.md §1.3. The agent MUST NOT run
  CLIs.

## 3. Goal

| Platform | Objective (machine-checkable) | Subjective (reviewer check) |
|---|---|---|
| Android | **ACC-01:** TypeScript reports no `Cannot find name 'profile'`; ESLint reports no unused `loading`/`txLoading` binding. | **ACC-S01:** In Expo Go, confirm the dashboard skeleton appears during initial profile loading and the dashboard renders normally afterward. |
| iOS | **ACC-02:** The same `npx tsc --noEmit` and `npm run lint` checks pass with no platform-specific branch added. | **ACC-S02:** Repeat ACC-S01 on iOS Expo Go; confirm no visible dashboard change beyond the existing loading skeleton. |
| Web | **ACC-03:** The same static checks pass for the Web target; no Web-only code is added. | **ACC-S03:** Open the Web dashboard and confirm its existing initial-load and loaded states are unchanged. |

### Resolved decisions

- **DEC-01:** Reuse `profile` from `useUserProfile()`; do not invent or fetch a
  second profile value.
- **DEC-02:** Remove only unused transaction-loading bindings; retain the
  `useTransactions()` call and all other returned values.

### Acceptance criteria — Objective

- **ACC-01..03:** `npx tsc --noEmit` and `npm run lint` complete without the
  reported undefined-name error or unused-loading warning on Android, iOS,
  and Web (the same TypeScript/ESLint source is shared by all platforms).

### Acceptance criteria — Subjective

- **ACC-S01..S03:** Follow the platform matrix above. Pass only if the existing
  Dashboard skeleton and loaded UI remain behaviorally and visually unchanged.

## 4. Deliverables

- **D-01:** In `app/(tabs)/index.tsx`, destructure `profile` from
  `useUserProfile()` and remove the unused transaction-loading alias while
  preserving the existing profile loading guard and all other behavior.
- **D-02:** After user-run validation, update `docs/savepoint.md` and append a
  matching Current status entry to `AGENTS.md` §3.

## 5. Glossary

- **Profile loading guard:** The existing `if (!profile && profileLoading)`
  condition that chooses the Dashboard skeleton during initial loading.
- **Unused loading alias:** The `txLoading`/`loading` bindings that have no
  consumer in `Dashboard`.

## 6. References

- `app/(tabs)/index.tsx` (`Dashboard`, `useUserProfile`, profile loading guard)
- `context/UserProfileContext.tsx` (`useUserProfile()` return shape)
- `AGENTS.md` §1.1, §1.3, §1.5, §1.8, §1.9, §1.10, §1.11# Spec 67: Dashboard Profile Loading Guard

| Field | Value |
|---|---|
| ID | SPEC-67 |
| Title | Dashboard Profile Loading Guard |
| Status | **FINAL** (2026-10-08 per user call — "FINAL") |
| Owner | User (final authority) |
| Version | 0.1 — initial draft |
| Scope | Resolve the undefined `profile` reference and unused transaction-loading bindings in `app/(tabs)/index.tsx`. |
| Non-goals | Changing dashboard UI, loading conditions, data fetching, transaction handling, routes, storage, API behavior, or dependencies. |
| Normative source | This file. It is active because the user marked it FINAL. |

> RFC 2119 keywords **MUST**, **MUST NOT**, **SHOULD**, and **MAY** express
> normative requirements below. They are active because this spec is FINAL.

## 1. Context

`Dashboard` calls `useUserProfile()` but destructures only `isLoading` as
`profileLoading`; later, the loading guard references an undeclared `profile`,
causing `TS2304`. The same component destructures transaction `loading` as
`txLoading`, assigns it to `loading`, and never uses either binding, producing
an ESLint unused-variable warning.

## 2. Constraints

- **CON-01 — Single-file scope.** Changes MUST be limited to
  `app/(tabs)/index.tsx` plus the documentation paths named in D-02.
- **CON-02 — Preserve existing guard behavior.** The Dashboard MUST continue
  to render `DashboardSkeleton` only when no profile is loaded and the profile
  is still loading. The fix MUST use the `profile` value already returned by
  `useUserProfile()`; it MUST NOT add another state value, request, or hook.
- **CON-03 — Remove unused bindings only.** The unused transaction `loading`
  destructuring/alias MUST be removed if it has no other consumer. The
  `useTransactions()` hook call and all other returned fields MUST remain
  unchanged.
- **CON-04 — Cross-platform invariant.** Android, iOS, and Web behavior MUST
  remain identical. No platform branch, dependency, storage, API, route, or
  native-module change is allowed.
- **CON-05 — Validation.** The user runs `npx tsc --noEmit` and
  `npm run lint` and supplies output per AGENTS.md §1.3. The agent MUST NOT run
  CLIs.

## 3. Goal

| Platform | Objective (machine-checkable) | Subjective (reviewer check) |
|---|---|---|
| Android | **ACC-01:** TypeScript reports no `Cannot find name 'profile'`; ESLint reports no unused `loading`/`txLoading` binding. | **ACC-S01:** In Expo Go, confirm the dashboard skeleton appears during initial profile loading and the dashboard renders normally afterward. |
| iOS | **ACC-02:** The same `npx tsc --noEmit` and `npm run lint` checks pass with no platform-specific branch added. | **ACC-S02:** Repeat ACC-S01 on iOS Expo Go; confirm no visible dashboard change beyond the existing loading skeleton. |
| Web | **ACC-03:** The same static checks pass for the Web target; no Web-only code is added. | **ACC-S03:** Open the Web dashboard and confirm its existing initial-load and loaded states are unchanged. |

### Resolved decisions

- **DEC-01:** Reuse `profile` from `useUserProfile()`; do not invent or fetch a
  second profile value.
- **DEC-02:** Remove only unused transaction-loading bindings; retain the
  `useTransactions()` call and all other returned values.

### Acceptance criteria — Objective

- **ACC-01..03:** `npx tsc --noEmit` and `npm run lint` complete without the
  reported undefined-name error or unused-loading warning on Android, iOS,
  and Web (the same TypeScript/ESLint source is shared by all platforms).

### Acceptance criteria — Subjective

- **ACC-S01..S03:** Follow the platform matrix above. Pass only if the existing
  Dashboard skeleton and loaded UI remain behaviorally and visually unchanged.

## 4. Deliverables

- **D-01:** In `app/(tabs)/index.tsx`, destructure `profile` from
  `useUserProfile()` and remove the unused transaction-loading alias while
  preserving the existing profile loading guard and all other behavior.
- **D-02:** After user-run validation, update `docs/savepoint.md` and append a
  matching Current status entry to `AGENTS.md` §3.

## 5. Glossary

- **Profile loading guard:** The existing `if (!profile && profileLoading)`
  condition that chooses the Dashboard skeleton during initial loading.
- **Unused loading alias:** The `txLoading`/`loading` bindings that have no
  consumer in `Dashboard`.

## 6. References

- `app/(tabs)/index.tsx` (`Dashboard`, `useUserProfile`, profile loading guard)
- `context/UserProfileContext.tsx` (`useUserProfile()` return shape)
- `AGENTS.md` §1.1, §1.3, §1.5, §1.8, §1.9, §1.10, §1.11