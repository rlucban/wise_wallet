# Spec 29: Startup Order — Auth Before Onboarding

| Field | Value |
|---|---|
| ID | SPEC-29 |
| Title | Startup Order — Auth Before Onboarding |
| Status | **FINAL** (approved 2026-09-30) |
| Owner | User (final authority) |
| Version | 1.0 |
| Scope | The startup/onboarding navigation guard in `app/_layout.tsx` (`MainLayout` effect); new pure resolver `utils/startupRoute.ts` + `utils/startupRoute.test.ts` |
| Non-goals | Deleting `app/intro.tsx` or its `Stack.Screen` entry; editing any screen UI/copy; the passcode gate (`app/_layout.tsx:168`); the SPEC-05 session-ended alert flow; storage keys, API contract, or route names |
| Normative source | This file. File+symbol cites are normative; `:line` numbers are hints only. |

> History: created 2026-09-30 per user request ("fix the startup, login/register
> first, not onboarding"). Three user calls are baked in: (1) the startup order is
> **auth first, then onboarding**; (2) the 3-step `/intro` carousel is **dropped from
> the automatic flow**; (3) `/onboarding` **stays reachable for already-onboarded
> users** (the current bounce to the dashboard is removed).

## Terminology (RFC 2119)

The keywords **MUST**, **MUST NOT**, **SHOULD**, and **MAY** in this spec are to be
interpreted as described in RFC 2119. Informative prose (examples, "today", "currently")
is non-normative unless restated as a requirement.

## 1. Context

### 1.1 Current guard

`app/_layout.tsx:124-166` (`MainLayout`) owns all startup navigation. It early-returns
while `authLoading || profileLoading || !navigationState?.key`, then resolves a redirect:

- **No `activeUserId`** (`:127-148`) — `session_ended` shows the SPEC-05 alert and redirects
  to `/login`; otherwise, any path other than `login`/`register` is replaced with `/login`.
- **With `activeUserId`** (`:149-165`):
  - `profile.isFirstRun === true` → if not on `/intro` or `/onboarding`, `router.replace('/intro')`;
  - `profile.isFirstRun === false` → if on `login`, `register`, `intro`, or `onboarding`,
    `router.replace('/')`.

### 1.2 Resulting sequences today

| Trigger | Today | Requested |
|---|---|---|
| Fresh install, no session | `/login` | `/login` (unchanged) |
| Register (Online or Local) | `/intro` carousel → `/onboarding` → `/` | **`/onboarding` → `/`** |
| Login into a new account (`isFirstRun: true`) | `/intro` → `/onboarding` → `/` | **`/onboarding` → `/`** |
| Startup, onboarded account | `/` | `/` (unchanged) |
| Onboarded user opens `/onboarding` | bounced to `/` | **stays on `/onboarding`** |

`register.tsx` (`:54`, `:83`, `:153`) and `login.tsx` (`:103`, `:192`) write
`isFirstRun: true` and perform no navigation themselves — the guard decides. `onboarding.tsx:41`
calls `completeSetup(...)` (sets `isFirstRun: false`) then `router.replace("/")` (`:56`).

`app/intro.tsx` has **no inbound links** anywhere in the app (repo-wide search for `/intro`
finds only the guard and the file itself); today it is reachable solely through the
guard's automatic redirect.

### 1.3 Why a pure resolver

AGENTS.md §1.10 requires objective criteria to be covered by `jest` tests parameterized by
`Platform.OS`. The guard is bound to `useSegments`/`useRouter` React hooks, and the jest setup
only collects `utils/` (`jest.config.js` `roots: ['<rootDir>/utils']`) with a `node`
environment. Extracting the decision into a pure, dependency-free function makes the branch
table above machine-checkable without a rendering harness, and removes the risk of the layout
and the tests drifting apart.

## 2. Constraints (normative)

- **CON-01 — Pure resolver.** `utils/startupRoute.ts` MUST export
  `resolveStartupRoute(input: StartupRouteInput): StartupRoute` and MUST NOT import
  `react`, `react-native`, `expo-*`, AsyncStorage, or any other runtime module. No I/O, no
  clock, no randomness; the same input MUST always yield the same output.
- **CON-02 — Types.** `StartupRoute` MUST be exactly `"/login" | "/onboarding" | "/" | null`,
  where `null` means "stay where you are". `StartupRouteInput` MUST be exactly
  `{ hasActiveUser: boolean; isFirstRun: boolean; segments: readonly string[] }`.
- **CON-03 — Single source of truth.** The `MainLayout` effect MUST navigate **only** from the
  resolver's return value. The inline `inAuthGroup` / `inIntro` / `inOnboarding` conditions
  for the three redirect targets MUST be removed from `app/_layout.tsx` (no duplicated
  navigation logic). The `session_ended` alert branch, the `SystemResetManager` logout, and
  the early-return guards stay in the layout.
- **CON-04 — `/intro` is not an automatic target.** No `router.replace("/intro")` (any quote
  style) may remain anywhere under `app/`. The `intro` route, its `Stack.Screen` entry
  (`app/_layout.tsx:178`), and `app/intro.tsx` MUST be kept as-is (no deletion, no edit);
  the screen remains deep-linkable and its own internal redirects are untouched.
- **CON-05 — Unauthenticated behavior unchanged.** With no `activeUserId`: stay on `/login`
  and `/register`; every other path resolves to `/login`. The SPEC-05 `session_ended` alert
  MUST still be created and the redirect MUST still skip when already inside the auth group.
- **CON-06 — First run resolves to `/onboarding`.** With `activeUserId` and
  `isFirstRun === true`, the result MUST be `null` only when already on `/onboarding`;
  otherwise `/onboarding`.
- **CON-07 — Onboarded behavior.** With `activeUserId` and `isFirstRun === false`: `"/"` when
  on `/login`, `/register`, or `/intro`; `null` on `/onboarding` (**behavior change**: the
  current bounce is removed, CON: "keep onboarding reachable"); `null` everywhere else.
- **CON-08 — No platform branch.** The resolver MUST NOT read `Platform.OS` or any other
  platform API, so all three platforms MUST resolve identically. The test suite MUST run its
  assertions once per `android` / `ios` / `web` to prove it (mirroring
  `utils/notifications.test.ts:9-18,56-60`).
- **CON-09 — Redirect mechanics preserved.** Navigation MUST stay
  `setTimeout(() => router.replace(route), 0)`, and the effect MUST keep its
  `authLoading || profileLoading || !navigationState?.key` early return and dependency array
  so no redirect loop or race is introduced (ACC-04).
- **CON-10 — Untouched surfaces.** The passcode gate (`app/_layout.tsx:168-170`), the
  `SystemResetManager`, `AuthLoader` DB init, provider order, and every route name MUST be
  unchanged. No storage key, `wallet-api` call, or AsyncStorage shape may change (purely a
  navigation-decision change).
- **CON-11 — Expo Go / Vercel safe.** No new dependency and no new native module; nothing may
  crash Expo Go on import, and `expo export --platform web` MUST keep working.
- **CON-12 — Verification gates.** `npm test`, `npm run lint`, and `npx tsc --noEmit` MUST be
  clean. (Commands are run by the user.)

## 3. Goal

A new user meets the auth screens first and the setup screen immediately after: `/login` →
register/login → `/onboarding` → `/`. The `/intro` carousel is no longer inserted into the
automatic flow, and `/onboarding` is reachable for already-onboarded users.

### 3.1 Platform matrix

| Platform | Objective (machine-checkable) | Subjective (reviewer observation) |
|---|---|---|
| **Android** | ACC-01..ACC-12 | ACC-13..ACC-19 |
| **iOS** | ACC-01..ACC-12 | ACC-13..ACC-19 |
| **Web** (`expo export --platform web`) | ACC-01..ACC-12 | ACC-13, ACC-16..ACC-19 |

### 3.2 Acceptance criteria (Objective — machine-checkable)

| ID | Criterion |
|---|---|
| **ACC-01** | `resolveStartupRoute({ hasActiveUser: false, isFirstRun: false, segments: ["login"] })` and the same with `["register"]` both return `null`. |
| **ACC-02** | With `hasActiveUser: false`, every other segment set returns `"/login"` — covering `[]`, `["(tabs)"]`, `["onboarding"]`, `["intro"]`, `["dues"]`, `["add-transaction"]`. |
| **ACC-03** | With `hasActiveUser: true, isFirstRun: true`, the result is `"/onboarding"` for `["(tabs)"]`, `["login"]`, `["register"]`, `["intro"]`, `["dues"]`, `[]`. |
| **ACC-04** | With `hasActiveUser: true, isFirstRun: true, segments: ["onboarding"]` the result is `null` (no redirect loop). |
| **ACC-05** | With `hasActiveUser: true, isFirstRun: false`, `["login"]`, `["register"]`, and `["intro"]` each return `"/"`. |
| **ACC-06** | With `hasActiveUser: true, isFirstRun: false, segments: ["onboarding"]` the result is `null` — the bounce to `/` is gone. |
| **ACC-07** | With `hasActiveUser: true, isFirstRun: false`, `[]`, `["(tabs)"]`, `["dues"]`, `["settings"]`, `["reports"]` each return `null`. |
| **ACC-08** | ACC-01..ACC-07 are asserted 3× (android, ios, web) and yield identical results on all three: the new suite contributes exactly 27 passing tests and `npm test` reports `125 passed, 125 total`, 0 failed (98 pre-existing + 27). |
| **ACC-09** | A search under `app/` for `replace('/intro')` / `replace("/intro")` returns no match; `app/intro.tsx` and its `Stack.Screen` entry still exist unmodified. |
| **ACC-10** | `app/_layout.tsx` navigation is driven only by the resolver: the effect contains a `resolveStartupRoute({ hasActiveUser: ..., isFirstRun: ..., segments })` call and a `router.replace(route)` inside `setTimeout(..., 0)`; no inline `inAuthGroup` / `inIntro` / `inOnboarding` redirect conditions remain. |
| **ACC-11** | `npm run lint` reports 0 errors and 0 warnings; `npx tsc --noEmit` reports 0 errors (app config excludes `*.test.ts` per SPEC-07; `tsconfig.test.json` type-checks the new test). No dependency change in `package.json`. |
| **ACC-12** | `git diff` touches only `app/_layout.tsx`, the new `utils/startupRoute.ts` + `utils/startupRoute.test.ts`, the spec, `docs/savepoint.md`, and `AGENTS.md` §3. No screen file, theme, context, or repository changes. |

### 3.3 Acceptance criteria (Subjective — reviewer observation, per platform)

| ID | Criterion | Pass condition |
|---|---|---|
| **ACC-13** | Fresh install (app data cleared) on Android, iOS, Web: launch the app. | The first screen is **Login**; the "Register" action is reachable; neither `/intro` nor `/onboarding` flashes first. |
| **ACC-14** | Register a new account (check both **Online** and **Offline/Local** mode) on the same three platforms. | The app lands **directly on `/onboarding`** ("Welcome! Let's get you set up.") with no intro carousel step; completing it goes to the dashboard. |
| **ACC-15** | Log in with an account that has never been onboarded. | Lands directly on `/onboarding`, no intro carousel. |
| **ACC-16** | Start the app with an existing, already-onboarded account. | Lands on the dashboard as before (no regression). |
| **ACC-17** | Log out, or trigger a multi-device session kill (SPEC-05). | Lands on **Login** and the "Session Ended" alert still appears in Notifications; no onboarding screen. |
| **ACC-18** | With a passcode enabled, start the app logged out. | The passcode screen still gates first (unchanged behavior). |
| **ACC-19** | Signed in and already onboarded, open `/onboarding` (deep link / manual navigation, plus a browser reload of `/onboarding` on web). | The setup screen **stays visible and is editable** (name, initial balance) instead of bouncing to the dashboard; no red box. |

### 3.4 Decisions

- **DEC-01:** Target sequence is `/login` → register/login → `/onboarding` → `/`; `/intro`
  is removed from the automatic flow rather than reordered after onboarding (user call).
- **DEC-02:** `/intro` is kept in the codebase (file, route, `Stack.Screen`) — only its
  automatic redirect is removed (CON-04). Deleting a screen is a separate, larger decision.
- **DEC-03:** Keep the onboarding bounce removal: an onboarded user may revisit
  `/onboarding` (user call). The only remaining bounce for onboarded users is from
  `/login`, `/register`, and `/intro`.
- **DEC-04:** Extract `resolveStartupRoute` rather than testing the layout through React
  hooks — the repo's jest setup (`roots: utils`, `node` env) cannot render Expo Router, and a
  pure table function keeps ACC-01..ACC-08 machine-checkable (§1.10).
- **DEC-05:** The resolver returns a route (or `null`), not a side effect; the layout keeps
  ownership of `router.replace` and the `setTimeout(0)` deferral (CON-09).
- **DEC-06:** No new jest test touches storage, network, or React; the suite is a pure
  decision table run 3× by `Platform.OS` mock.

## 4. Deliverables

- **D-01 — `utils/startupRoute.ts`** (new): `StartupRoute`, `StartupRouteInput`, and
  `resolveStartupRoute` implementing CON-01, CON-02, CON-05..CON-07.
- **D-02 — `app/_layout.tsx`**: replace the inline redirect branching in the `MainLayout`
  effect with the resolver call (CON-03, CON-09); keep the session-ended alert branch, early
  returns, dependency array, passcode gate, `Stack.Screen` list, and `SystemResetManager`
  untouched. No `router.replace('/intro')` may remain (CON-04).
- **D-03 — `utils/startupRoute.test.ts`** (new): jest suite mirroring
  `utils/notifications.test.ts` — `jest.mock("react-native")` with a mutable `mockOS`, a
  `runSuite(os)` wrapper, and exactly 9 `it()` blocks per platform covering ACC-01..ACC-08
  (27 tests total).
- **D-04 — Documentation**: append the implementation entry to `docs/savepoint.md` and a
  `Current status` bullet to `AGENTS.md` §3 (AGENTS.md §1.8).
- **D-05 — Verification**: report the user's `npm test`, `npm run lint`, and
  `npx tsc --noEmit` output against ACC-08 and ACC-11; ACC-13..ACC-19 are user-run.

## Glossary

| Term | Meaning |
|---|---|
| Guard | The `useEffect` in `app/_layout.tsx` `MainLayout` that decides the startup redirect. |
| `segments` | `useSegments()` output; `segments[0]` is the current top-level route. |
| First run | `profile.isFirstRun === true` — set by `login.tsx`/`register.tsx`, cleared by `onboarding.tsx` `completeSetup`. |
| Resolver | `resolveStartupRoute`, the pure function extracted from the guard. |
| Auth group | The `/login` and `/register` routes. |

## References

- `app/_layout.tsx:124-166` — the guard being replaced; `:168-170` passcode gate (untouched); `:178` `intro` Stack.Screen (kept); `:65-111` `SystemResetManager` (untouched)
- `app/login.tsx:103,192`, `app/register.tsx:54,83,153` — `isFirstRun: true` writers
- `app/onboarding.tsx:34-62` — `completeSetup(...)` then `router.replace("/")`
- `app/intro.tsx:63-64` — its own `"/onboarding"` / `"/login"` targets (left as-is)
- `utils/notifications.test.ts:9-18,56-60` — the `Platform.OS`-parameterized jest pattern to mirror
- `jest.config.js` — `roots: ['<rootDir>/utils']`, `testMatch: ['**/*.test.ts']`
- `tsconfig.test.json` / SPEC-07 (`specs/07-ci-tsc-exclusion.md`) — app `tsc` excludes `*.test.ts`
- `specs/05-multi-device-behavior.md` — D-MD-01 `session_ended` alert flow (preserved)
- `specs/04-connection-status-vs-offline-mode.md` — Register screen's Online/Offline choice (unchanged)
- `AGENTS.md` §1.1 (spec-first), §1.2 (no auto-pilot), §1.4 (no breaking changes), §1.5 (cross-platform), §1.7 (Expo Go), §1.8 (docs), §1.10 (spec-first + TDD platform matrix)