# SPEC-96 — Make-Online Migration Without the Logout/Login Navigation Bounce

| Field | Value |
|---|---|
| ID | SPEC-96 |
| Title | Swap the migrated cloud identity without nulling the session, so `(tabs)` is never removed and re-added |
| Status | **FINAL v1.0** (marked FINAL by user 2026-10-11 — implementable) |
| Owner | User (final authority) |
| Version | 1.0 FINAL |
| Scope | `context/AuthContext.tsx` (additive swap action ONLY) + `app/(tabs)/settings.tsx` `createNewAccountAndMigrate` block ONLY + one new guard file `utils/migrationIdentitySwap.test.ts` |
| Non-goals | No nav-guard change (`app/_layout.tsx` byte-identical); no `login`/`logout` body change; no migration-step change (register/upload/addUser/profile/initDb/autoBackup/authName/refetch order intact); no `usePreventRemove`/`headerBackButtonMenuEnabled` adoption; no new deps |

RFC 2119 terminology (MUST/MUST NOT/SHOULD/MAY) applies. Informative prose ("today", "currently") is non-normative unless restated as a requirement.

## Context

User call 2026-10-11 with phone screenshot + dev console dump: after tapping Create New & Migrate, the success alert ("New cloud account created and data migrated successfully!") appears, but a console error fires underneath:

> The screen '(tabs)' was removed natively but didn't get removed from JS state … (`useDismissedRouteError.js:49`)

Root cause (source-traced): `createNewAccountAndMigrate` (`settings.tsx:441-515`) ends the migration with `await logout()` (`:493`) followed by `await login(newUserId, newToken)` (`:500`). `logout()` runs `setActiveUserId(null)` (`AuthContext.tsx:72`), which trips the signed-out branch of the nav guard (`_layout.tsx:166`) → `setTimeout(() => router.replace('/login'), 0)` (`:186`) → the native-stack removes `(tabs)` natively. `login()` then runs `setActiveUserId(...)` (`AuthContext.tsx:62`), which trips the signed-in branch (`_layout.tsx:188`) → `setTimeout(() => router.replace('/'), 0)` (`:202`) → JS re-adds `(tabs)` while native already removed it. The two `setTimeout(0)` replaces race — the classic native/JS desync this error reports. The migration itself succeeds (data lands, alert shows); the defect is the navigation churn around it. Dev-only surface (LogBox/console error), but it signals a real state race on the exact screen the user is looking at.

## Constraints

- **CON-01** Every change MUST keep Android + iOS + Web working, stay Expo Go (latest) import-safe, and stay Vercel-deployable.
- **CON-02** No new npm packages, native modules, fonts, images, or third-party code (AGENTS §1.12). No new imports beyond what the touched files already hold.
- **CON-03** Bare-minimum diff (AGENTS §1.11). ONLY: one additive swap action in `AuthContext.tsx` + the two-line swap-in inside `createNewAccountAndMigrate` (the `await logout()` / `await login(...)` lines) + the new guard file. The nav guard, `login`/`logout` bodies, and every migration step between register and refetch stay byte-identical.
- **CON-04** The swap MUST perform every storage write `login()` performs (`authToken`=new token, `activeUserId`=new id, `lastActiveUserId`=new id, `setCachedUserId`, latch reset, GET-cache wipe — SPEC-44/SPEC-62 semantics) and MUST NEVER pass through a null `activeUserId` (no `setActiveUserId(null)` in its path), so the guard's `!activeUserId` branch never fires and zero navigation occurs.
- **CON-05** Identical on Android, iOS, and Web — no new `Platform.OS` branch. Any platform branch needs its own amendment first (§1.10).
- **CON-06** No code, config, or dependency change before this spec is marked FINAL by the user (AGENTS §1.1).

## Goal

Make-Online migration lands on the dashboard as the new cloud user with no navigation churn and no console error; everything else identical.

### Interaction matrix

| Surface | Today | After (FINAL) |
|---|---|---|
| Post-migrate navigation | logout→`/login` replace, then login→`/` replace (race → `(tabs)` desync error) | No navigation at all (session never nulls; user stays on Settings, data refetches) |
| Migration result | New cloud id + token, data uploaded, autoBackup on | Byte-identical |
| Console | `useDismissedRouteError` error | Silent |
| login/logout/guard | As today | Byte-identical |

### Decisions (FINAL — user marked final 2026-10-11 with DEC-01(a); DRAFT text adopted as-is)

- **DEC-01 (FINAL)** Silent identity swap: new additive `AuthContext` action (DRAFT name `switchIdentity(userId, token)`) with login-identical writes and no null transition; the migrate block calls it in place of the logout/login pair (rejected: serializing the bounce with delays — timing-fragile, keeps two route transitions; rejected: `LogBox.ignoreLogs` suppression — masks a real desync, churn remains; rejected: `usePreventRemove` adoption — fights the guard instead of removing the cause).
- **DEC-02 (FINAL)** No success-path navigation added (today the flow already stays put after `login()` re-lands on `/`; rejected: explicit `router.replace('/')` after the swap — redundant, reintroduces a transition).

### Acceptance

Platform matrix (§1.10): every Objective guard holds on `android` / `ios` / `web` (jest `Platform.OS` mock); every Subjective check is user-run on Expo Go (Android/iOS) + `expo export --platform web` (agent never runs CLIs per AGENTS §1.3).

Objective — deterministic, machine-checkable (jest source-scan guards; auth lifecycle is not jest-renderable under the `roots: utils` setup — SPEC-30 precedent — so guards pin the contract, devices prove it):

- **ACC-01** `AuthContext.tsx` exports a swap action performing the login-equivalent writes (secure `authToken`, `activeUserId`, `lastActiveUserId`, cached user id, latch reset, GET-cache wipe) with zero `setActiveUserId(null)` in its path. Holds on android/ios/web.
- **ACC-02** The `createNewAccountAndMigrate` block calls the swap with `(newUserId, newToken)`, contains no `logout()` call, and keeps every other step (register POST, bulk uploads, profile POST, addUser, authName, saveUserProfile, initDb, autoBackup, success alert, refetch trio, catch/finally) byte-identical. Holds on android/ios/web.
- **ACC-03** Scope: `login`/`logout` bodies, the nav guard (`_layout.tsx:163-205`), and all other Settings flows byte-identical; no new imports/deps/`Platform` branch. Holds on android/ios/web.

Subjective — human-judged UX as observable reviewer checks (explicit pass/fail, user-run):

- **ACC-S01** Reviewer on iOS (Expo Go, phone, Local account → Make Online → Create New & Migrate) confirms: success alert shows, dashboard data is the migrated cloud data, and NO console error appears (LogBox clean). FAIL = any `(tabs)`/desync error or landing off-dashboard.
- **ACC-S02** Reviewer on Android + Web confirms ACC-S01 identically with no console error. FAIL = any platform-only deviation.

TDD coverage (§1.10): `utils/migrationIdentitySwap.test.ts` covers ACC-01..ACC-03 parameterized by `Platform.OS` (android/ios/web); ACC-S01/S02 are user-run manual checks exactly as written (navigation races are not jest-renderable — guards pin the contract).

## Deliverables

- **D-01** `context/AuthContext.tsx` ONLY: additive swap action per CON-04 (interface slot + memoized callback + actions memo entry). `login`/`logout`/restore/failure paths byte-identical.
- **D-02** `app/(tabs)/settings.tsx` ONLY: `createNewAccountAndMigrate` calls the swap in place of the `await logout()` … `await login(newUserId, newToken)` pair. All lines between and around byte-identical.
- **D-03** `utils/migrationIdentitySwap.test.ts` (new file, named here per §1.11): guards for ACC-01..ACC-03 × android/ios/web.
- **D-04** Docs after implementation (AGENTS §1.8, post-FINAL only): `docs/savepoint.md` entry + `AGENTS.md` §3 status line. NOT part of the spec-writing step; no doc edit ships with the DRAFT.

## Glossary

- **Bounce:** the logout-then-login pair that nulls `activeUserId` between two guard-driven replaces.
- **Swap:** the new null-free identity transition — same stored outcome as logout+login, with no intermediate signed-out state.

## References

- `AGENTS.md` (§1.9 spec format, §1.10 TDD/platform matrix, §1.11 bare-minimum, §1.12 no new deps, §1.14 one home)
- `specs/04-connection-status-vs-offline-mode.md` (template)
- `specs/42-go-back-after-web-refresh.md` (navigation-robustness family — related, NOT amended)
- `app/(tabs)/settings.tsx:441-515` (`createNewAccountAndMigrate` block)
- `context/AuthContext.tsx:58-77` (`login`/`logout` bodies — the swap's write template)
- `app/_layout.tsx:163-205` (nav guard — byte-identical under this spec)
