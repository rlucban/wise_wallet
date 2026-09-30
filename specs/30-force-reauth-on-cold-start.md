# Spec 30: Force Login on Every Cold Start

| Field | Value |
|---|---|
| ID | SPEC-30 |
| Title | Force Login on Every Cold Start |
| Status | **FINAL** — v2.1 (2026-10-01, per user call). Supersedes v2.0 and the v1.0 DRAFT. Implementable. |
| Owner | User (final authority) |
| Version | 2.1 |
| Scope | Cold-start session clearing (`app/_layout.tsx`); reset-epoch guard (`app/_layout.tsx`); last-user hint + pre-login due reminders (`app/_layout.tsx`, `context/AuthContext.tsx`, `utils/notifications.ts`); logged-out connectivity (`context/NetworkContext.tsx`) |
| Non-goals | Any change to `isFirstRun` or its resolution — `context/UserProfileContext.tsx`, `app/login.tsx`, `app/register.tsx`, `DEFAULT_PROFILE`; `utils/profileMerge.ts` (never created); `/intro` and `/onboarding` routes/files; `MainLayout`'s redirect table, `session_ended` branch, passcode gate, `Stack.Screen` list; `AuthContext`'s restore effect; `PasscodeContext` persistence; the repository layer (`repositories/*`, `types/repositories.ts`); `user_{id}_*` keys, the `wallet-api` contract, dependencies |
| Normative source | This file. File+symbol cites are normative; `:line` numbers are hints only. |

> History: v1.0 (2026-09-30, DRAFT) proposed clearing the session in `AuthContext`'s mount
> effect **and** an `isFirstRun` "false wins" merge via a new `utils/profileMerge.ts`. Two
> user calls changed it: (1) the forcing MUST live in `_layout.tsx` and
> **`isFirstRun` MUST be left exactly as-is**; (2) the accepted consequences of forcing a
> login every launch MUST be mitigated where a fix exists. v2.0 therefore deletes the entire
> `isFirstRun` half (old CON-04..CON-06, ACC-03..ACC-08, D-02/D-03/D-04/D-05) and adds the
> mitigation deliverables. v2.1 (same day) reverts the D-04 connectivity posture to
> **online-first** per user call, so a signed-out startup is no longer treated as a Local-only
> account. Verified premise correction carried into v2.0: `app/login.tsx:103`
> is reached only from the "Create Offline Account" branch (`:85-112`); the normal Local
> re-login path (`:60-79`) writes no profile, so no `isFirstRun` guard is needed there.

## Terminology (RFC 2119)

The keywords **MUST**, **MUST NOT**, **SHOULD**, and **MAY** in this spec are to be
interpreted as described in RFC 2119. Informative prose is non-normative unless restated
as a requirement.

## 1. Context

### 1.1 Why Login/Register is currently skipped

`context/AuthContext.tsx:32-44` restores `activeUserId` (AsyncStorage) and `authToken`
(SecureStore) on every mount. `app/_layout.tsx:127` forces `/login` **only** when there is no
session, so an authenticated user never sees Login/Register and the app opens straight into
the dashboard (or, for `profile.isFirstRun === true`, into `/intro` at `:156-160` →
`/onboarding` via `app/intro.tsx:63-64`). The user's requirement is that **no session may
survive a cold start**, so Login/Register is always the first screen presented.

### 1.2 Why the clear is implemented in `_layout.tsx`, not in `AuthContext`

The user requires the forcing to be `_layout.tsx`'s job. Two ordering facts make a naive
mount-time `logout()` wrong and shape the implementation:

1. **Restore race.** `AuthProvider`'s restore effect resolves asynchronously and then calls
   `setActiveUserId(id)`. A descendant's mount effect runs *before* that promise settles, so
   a clear issued at mount would be overwritten by the restore and the user would stay signed
   in. The clear MUST therefore wait until `isLoading === false`.
2. **Logout loop.** The clear MUST be one-shot per process. If it were re-evaluated whenever a
   session exists, a *successful* login would immediately be cleared, making sign-in impossible.
   The latch MUST be per process, not per user.

### 1.3 Consequences of forcing a login (accepted per user call)

| Consequence | Detail | Mitigation |
|---|---|---|
| Re-authentication every launch | Every cold start requires authenticating again, Local accounts included. | Accepted (user call). |
| Web refresh logs out | Every browser refresh / web page load signs the user out. | Accepted for all platforms (user call). |
| **Data loss** (new) | With no session at startup, `SystemResetManager`'s `isLocal` check is false, so `checkHealth()` runs and an advanced `reset_epoch` triggers `hardResetLocalData()` (`utils/db.ts:286-291`), which wipes `master_users` — i.e. Local accounts and their SHA-256 PINs, unrecoverably. | **Fixed by D-02.** |
| **False offline banner / silent "local-only" posture** (new) | A signed-out startup has no token, so a connectivity check based on the token would classify the app as a Local-only account and report device connectivity instead of the server's real state. | **Fixed by D-04: online-first.** The API `/health` check is the default for every non-Local session, including the signed-out one; Local is chosen only when the session's token actually is a Local token. |
| **Due reminders stop** (new) | `AuthLoader`'s scheduling effect (`:224-237`) is gated on `activeUserId`, so reminders are not scheduled at launch; a due later that day could go unnotified. | **Fixed by D-03.** |
| SPEC-05 narrows | The multi-device `session_ended` alert can now only fire **within** a live session. Alert code untouched. | Accepted; documented. |
| Passcode gate | The passcode is in-memory only (`context/PasscodeContext.tsx:18-41`), so it never gates a cold start. | Out of scope (user call). |
| Seeding timing | `AuthLoader`'s DB init (`:205-222`) only runs once a user is active, so first-launch master-data seeding can land under `default_*`. Pre-existing; unchanged by this spec. | Accepted. |
| `isFirstRun` cloud resurrection | A stale cloud `isFirstRun: true` can still bounce a signed-in cloud account into `/intro`/`/onboarding`. | Explicitly left as-is (user call). |
| Extra auth traffic | One `POST /auth/login` per launch per user. | Accepted. |

No user data is lost by the clear itself: `logout()` removes only `activeUserId` and
`authToken`; `user_{id}_*` records, sync queues, and dues survive.

### 1.4 Rollback

Revert `app/_layout.tsx`, `context/AuthContext.tsx`, `context/NetworkContext.tsx`, and
`utils/notifications.ts`; the orphaned `lastActiveUserId` AsyncStorage key is inert on any
previous build. No storage migration is involved, so rollback is a clean code revert at any
time. Nothing outside the four files changed.

## 2. Constraints (normative)

- **CON-01 — One-shot clear, forced Login.** `app/_layout.tsx` MUST contain a
  `ColdStartSessionGuard` component that, once auth has settled (`isLoading === false`) and
  once per process, calls `logout()` whenever `activeUserId` is non-null. Its latch MUST be a
  `useRef` boolean (process-scoped), and `MainLayout`'s existing `!activeUserId → /login`
  branch (`:127-148`) MUST then present Login/Register. The clear MUST NOT be re-armed or
  re-run for a session created later in the same process.
- **CON-02 — No redirect-table changes.** `app/_layout.tsx`'s redirect table (`:141-165`),
  its `session_ended` branch (`:128-139`), the passcode gate (`:168-170`), and the
  `Stack.Screen` list (`:178-189`) MUST remain byte-identical. Only the two additions in
  D-01/D-02 and the effect in D-03 are permitted in this file.
- **CON-03 — Restore effect untouched.** `context/AuthContext.tsx:32-44` MUST keep restoring
  `activeUserId`/`authToken` into state. The session is cleared by `_layout.tsx`, not by
  `AuthContext`.
- **CON-04 — Reset-epoch wipe requires a session.** `SystemResetManager`'s effect in
  `app/_layout.tsx` MUST return early when there is no `activeUserId`, and `activeUserId`
  MUST appear in that effect's dependency array. `hardResetLocalData()` MUST be unreachable
  while logged out.
- **CON-05 — Last-user hint.** `AuthContext.login()` MUST write the user id to the AsyncStorage
  key `lastActiveUserId` (device-local, **not** SecureStore: it is not a credential and must be
  readable before sign-in). `logout()` MUST NOT delete it. No other write to that key is
  permitted.
- **CON-06 — Pre-login reminders, no prompt.** `AuthLoader` MUST schedule due reminders once
  per process while logged out, using: the `lastActiveUserId` hint as an **explicit** user-id
  override to `getPrefixedKey('dues', …)` — never the ambient cached/`activeUserId` user — and
  only when notification permission is **already granted**. The pre-login path MUST NOT call
  `requestNotificationPermissions` and MUST NOT trigger a permission prompt. Web and Expo Go
  MUST be no-ops (guarded by `areLocalRemindersSupported()` / existing helper guards).
- **CON-07 — Permission check is check-only.** `utils/notifications.ts` MUST export
  `hasNotificationPermission(): Promise<boolean>` that resolves the current grant via
  `getPermissionsAsync()` only. It MUST NOT call `requestPermissionsAsync()` anywhere, and
  MUST return `false` on web and in Expo Go.
- **CON-08 — Reminder scheduling stays idempotent.** The pre-login pass MUST NOT weaken
  `scheduleDueNotifications`, which cancels all scheduled notifications before re-scheduling
  (`utils/notifications.ts:142-148`). The pre-login and post-login passes MAY both run in one
  process; the final scheduled set MUST equal the signed-in user's dues.
- **CON-09 — Online first; Local only by circumstance.** `context/NetworkContext.tsx` MUST
  keep the API `/health` check as the **default** connectivity source, including while signed
  out, and MUST select device connectivity only when the session's token is a Local token
  (`useIsLocalAccount()`). A missing session MUST NOT by itself select device connectivity —
  that would classify a signed-out startup as a Local-only account and report a fabricated
  connectivity state. Separately, because the offline→online transition MUST NOT trigger
  `triggerSyncProcessing`/`processSyncQueue` while there is no `activeUserId`: `sync_queue` is a
  single device-global key (`utils/syncQueue.ts:18`) and the processors have no auth guard, so
  they would POST queued items unauthenticated and mark them failed. `useIsLocalAccount`
  (`utils/authMode.ts:9-11`) and the `isOnline`/`OfflineIndicator` contract MUST NOT change.
- **CON-10 — `isFirstRun` is out of bounds.** `context/UserProfileContext.tsx`,
  `app/login.tsx`, `app/register.tsx`, `DEFAULT_PROFILE`, `app/intro.tsx`, and
  `app/onboarding.tsx` MUST be byte-identical after this spec. `utils/profileMerge.ts` MUST NOT
  exist.
- **CON-11 — Storage compatibility.** `user_{id}_*`, `activeUserId`, and `authToken` keep their
  names and shapes. `lastActiveUserId` is the only new key; no migration (AGENTS.md §1.4).
- **CON-12 — Cross-platform parity.** No new `Platform.OS` branch in `app/_layout.tsx`,
  `context/AuthContext.tsx`, or `context/NetworkContext.tsx`. The only platform guards are
  the pre-existing ones inside `utils/notifications.ts`.
- **CON-13 — Guard not weakened.** No ESLint rule change; `utils/themeColors.test.js`
  untouched; no new `any`; no dependency or `package.json` change.
- **CON-14 — Expo Go / Vercel safe.** No new native module; `expo-notifications` stays
  lazily loaded so nothing crashes Expo Go on import; no secrets in the web bundle.
- **CON-15 — Verification gates.** `npm test`, `npm run lint`, and `npx tsc --noEmit` MUST be
  clean. (Commands are run by the user.)

## 3. Goal

Every cold start lands on Login/Register — no session survives a process restart — on
Android, iOS, and Web, **without** introducing new data loss, a false offline banner, or
dropped due reminders, and **without** changing `isFirstRun` behavior at all.

### 3.1 Platform matrix

| Platform | Objective (machine-checkable) | Subjective (reviewer observation) |
|---|---|---|
| **Android** | ACC-01..ACC-11 | ACC-12, ACC-13, ACC-14, ACC-15, ACC-16, ACC-17 |
| **iOS** | ACC-01..ACC-11 | ACC-12, ACC-13, ACC-14, ACC-15, ACC-16, ACC-17 |
| **Web** | ACC-01..ACC-11 | ACC-12, ACC-13, ACC-15, ACC-16, ACC-17 |

Web is exempt from ACC-14 (no local notifications; `scheduleDueNotifications` no-ops on web)
and ACC-16's notification half, but MUST satisfy the rest, including ACC-13 (refresh signs out).

### 3.2 Acceptance criteria (Objective — machine-checkable)

| ID | Criterion |
|---|---|
| **ACC-01** | `app/_layout.tsx` defines `ColdStartSessionGuard`, which uses a `useRef` boolean latch, returns while `isLoading` is true, calls `logout()` only when `activeUserId` is non-null, and sets the latch before/with the call so it fires at most once per process. |
| **ACC-02** | `ColdStartSessionGuard` is rendered inside `AuthProvider` in `RootLayout`'s tree (a sibling position that mounts for every screen, including `/login`). |
| **ACC-03** | `app/_layout.tsx`'s redirect table (`:141-165`), `session_ended` branch (`:128-139`), passcode gate (`:168-170`), and `Stack.Screen` list (`:178-189`) are byte-identical to the pre-change file. |
| **ACC-04** | `SystemResetManager`'s effect returns early when `!activeUserId` and lists `activeUserId` in its dependency array, so `hardResetLocalData()` is unreachable while logged out. |
| **ACC-05** | `AuthContext.login()` writes `lastActiveUserId` to AsyncStorage; `logout()` does not remove it; `AuthContext.tsx:32-44` still restores `activeUserId`/`authToken`. |
| **ACC-06** | `utils/notifications.ts` exports `hasNotificationPermission(): Promise<boolean>` that calls `getPermissionsAsync()` only, contains no `requestPermissionsAsync()` call, and returns `false` for web and Expo Go. |
| **ACC-07** | `AuthLoader`'s pre-login effect is gated on `!activeUserId`, fires at most once per process, calls `getPrefixedKey('dues', hintId)` with the hint id as an explicit override, and calls neither `requestNotificationPermissions` nor `repos.dues.getAll()`. |
| **ACC-08** | `context/NetworkContext.tsx` selects device connectivity **only** when `isLocal` is true (its original condition), i.e. `!activeUserId` does not appear in the branch; the offline→online transition calls neither `triggerSyncProcessing` nor `processSyncQueue` while `!activeUserId`; `utils/authMode.ts` is unchanged. |
| **ACC-09** | `context/UserProfileContext.tsx`, `app/login.tsx`, `app/register.tsx`, `app/intro.tsx`, `app/onboarding.tsx`, `context/PasscodeContext.tsx`, `repositories/*`, and `types/repositories.ts` are byte-identical to the pre-change files; `utils/profileMerge.ts` does not exist. |
| **ACC-10** | No new `Platform.OS` branch exists in `app/_layout.tsx`, `context/AuthContext.tsx`, or `context/NetworkContext.tsx`; the only platform guards remain the pre-existing ones in `utils/notifications.ts`. |
| **ACC-11** | `npm test` reports `98 passed, 98 total`, 0 failed (no test files added or removed); `npm run lint` reports 0 errors and 0 warnings; `npx tsc --noEmit` reports 0 errors; `package.json` and `package-lock.json` have no change from this spec. |

> Note (AGENTS.md §1.10 coverage limit): this spec adds **no** jest tests. Every change is
> React lifecycle/ordering or storage I/O in files under `app/` and `context/`, which the
> repo's jest setup cannot render (`roots: utils`, `testEnvironment: node`). ACC-01..ACC-11
> are therefore verified by grep/code-shape plus the ACC-12..ACC-17 manual matrix, and the
> coverage gap is stated here rather than papered over with a test that cannot fail.

### 3.3 Acceptance criteria (Subjective — reviewer observation, per platform)

| ID | Criterion | Pass condition |
|---|---|---|
| **ACC-12** | Android/iOS/Web: sign in, then kill the app (or refresh the web tab) and relaunch. | Login/Register is the first screen presented. The app never opens on the dashboard, `/intro`, or `/onboarding`. |
| **ACC-13** | After the relaunch, authenticate (Online account: email+password; Local account: name+PIN). | The dashboard opens. There is **no** logout loop — the session survives at least 30 s without bouncing back to Login. A Local account opens with its stored name and opening balance intact. |
| **ACC-14** | Android/iOS only: grant notification permission, create a due inside the next 24 h, force-kill the app, relaunch, and **do not** sign in. | No permission prompt appears on the login screen. Once the device time passes the due's 09:00 trigger, the reminder still fires with that due's title and amount. |
| **ACC-15** | With the API reachable, cold start on each platform while signed out. | The startup performs an API `/health` check (online-first): the log shows the cloud branch, and **no** "You're offline. Changes will sync automatically…" banner appears. Sign in with a Local account and cold start again with the device online but the server unreachable: the log then shows the Local branch, connectivity follows the device, and no banner appears. |
| **ACC-16** | Android/iOS: run in Expo Go; also enable a passcode and cold start. | No red box at any point. With a passcode enabled, the passcode screen still gates first, then Login is presented. |
| **ACC-17** | Android/iOS/Web: cold start while logged out with a previously advanced `reset_epoch` (server-driven reset), then sign in. | No "A system reset was requested" alert appears at startup. Local accounts and their PINs still work after sign-in, and all `user_{id}_*` data is intact. |

### 3.4 Decisions

- **DEC-01:** The one-shot clear lives in a new `ColdStartSessionGuard` in `app/_layout.tsx`
  (user call: `_layout.tsx` forces login), and it calls the existing `logout()` action rather
  than clearing storage directly, so there is exactly one code path that removes the session.
- **DEC-02:** The clear waits for `isLoading === false` and latches per process (§1.2). A clear
  in `AuthContext`'s mount effect was rejected: it contradicts the user's `_layout.tsx`
  requirement and is inherently racy with the restore it replaces.
- **DEC-03:** `SystemResetManager` gets the no-session early return (D-02) rather than a check
  inside `checkReset`, so the wipe is unreachable rather than merely unlikely, and the
  `reset_epoch` bookkeeping still advances after sign-in.
- **DEC-04:** The last-user id is stored in AsyncStorage, not SecureStore (CON-05), so the
  pre-login read needs no `expo-secure-store` availability probe on the startup path.
- **DEC-05:** The pre-login read uses `getItem(getPrefixedKey('dues', hintId), [])` instead of
  threading an `overrideUserId` through `Repository.getAll` (user call): it matches the
  existing `getSystemAlerts(userId?)` precedent in `utils/notifications.ts:199-223` and leaves
  the repository layer and its interfaces untouched.
- **DEC-06:** The pre-login path reuses an existing grant and never prompts (CON-06/CON-07,
  user call): a signed-out user must not be asked for notification permission.
- **DEC-07:** Pre-login scheduling of another account's dues is accepted as the cost of
  keeping reminders alive. It only reads `user_{id}_dues` for the id this device last signed
  in as, only when permission was already granted, and it writes no storage.
- **DEC-08:** The forcing applies to **all** platforms, including Web, so every refresh signs
  the user out (user call). No `Platform.OS` branch is introduced (CON-12).
- **DEC-09:** Connectivity is **online-first** (user call): the API `/health` check is the
  default for every session that is not Local, and Local is selected only when the token says
  so. A v2.0 draft that also treated "no session" as device-connectivity-only was rejected — it
  made a signed-out startup masquerade as a Local-only account and reported connectivity the
  server never confirmed. The one thing that stays gated on `activeUserId` is the sync-queue
  trigger, because `sync_queue` is device-global and its processors have no auth guard;
  connectivity posture and authenticated writes are separate concerns.

## 4. Deliverables

- **D-01 — `app/_layout.tsx`**: add `ColdStartSessionGuard` (CON-01) and render it inside
  `AuthProvider` in `RootLayout` (ACC-02). `SystemResetManager` and `MainLayout` are otherwise
  untouched, as is the `Stack` tree (CON-02).
- **D-02 — `app/_layout.tsx`**: `SystemResetManager` early-returns when there is no
  `activeUserId` (CON-04), with `activeUserId` added to its effect dependencies.
- **D-03 — reminders survive a signed-out start**: `context/AuthContext.tsx` `login()` writes
  `lastActiveUserId` (CON-05); `utils/notifications.ts` gains `hasNotificationPermission()`
  (CON-07); `app/_layout.tsx` `AuthLoader` gains a one-shot pre-login reminder effect that
  reuses an existing grant and reads the hint user's dues with an explicit id override
  (CON-06, CON-08). The existing post-login effect (`:224-237`) is unchanged.
- **D-04 — `context/NetworkContext.tsx`**: keep the connectivity branch exactly as it was
  (`isLocal` → device connectivity, otherwise API `/health`) so startup is online-first
  (CON-09); gate the offline→online **sync-queue trigger** on `activeUserId`;
  `useIsLocalAccount` untouched.
- **D-05 — Documentation**: append the implementation entry to `docs/savepoint.md` and a
  `Current status` bullet to `AGENTS.md` §3 (AGENTS.md §1.8), including the §1.4 note that
  this is an intentional behavior change with the rollback in §1.4.
- **D-06 — Verification**: report the user's `npm test`, `npm run lint`, and
  `npx tsc --noEmit` output against ACC-11; ACC-12..ACC-17 are user-run.

## Glossary

| Term | Meaning |
|---|---|
| Cold start | A fresh app launch / process start (not a resume from background). |
| Session | The pair (`activeUserId` in AsyncStorage, `authToken` in SecureStore) restored by `AuthContext`. |
| One-shot / latch | A per-process `useRef` guard so an effect body runs at most once, regardless of re-renders or later state changes. |
| `lastActiveUserId` | New AsyncStorage key holding the id this device last authenticated as; used only for pre-login reminder scheduling. |
| Device connectivity | `navigator.onLine` (`getDeviceOnline()`), used for Local accounts and logged-out state; never an API ping. |
| Reminder scheduling | `scheduleDueNotifications`, which cancels all scheduled notifications and re-schedules from the given dues, at 09:00 local within 30 days. |

## References

- `app/_layout.tsx:65-111` — `SystemResetManager` (D-02); `:113-194` — `MainLayout`, guard `:127-148`, redirect table `:141-165`, passcode gate `:168-170`, `Stack` `:178-189` (D-01, CON-02); `:196-250` — `AuthLoader`, DB init `:205-222`, notification effect `:224-237` (D-03); `:252-296` — `RootLayout` tree (ACC-02)
- `context/AuthContext.tsx:32-44` — restore effect (CON-03, untouched); `:58-64` `login()` (D-03); `:66-72` `logout()` (CON-05)
- `utils/notifications.ts:90-94` — `areLocalRemindersSupported()`; `:96-114` — `requestNotificationPermissions` (unchanged); `:142-188` — `scheduleDueNotifications` (idempotent, CON-08); `:199-223` — `userId?` override precedent (DEC-05)
- `utils/storage.ts:28-31` — `getPrefixedKey(baseKey, overrideUserId)`; `utils/db.ts:257-291` — `master_users` wipe in `hardResetLocalData` (§1.3 data loss)
- `context/NetworkContext.tsx:101-106` — `getDeviceOnline()`; `:108-129` — connectivity branch (D-04); `utils/authMode.ts:9-11` — `useIsLocalAccount` (unchanged)
- `context/UserProfileContext.tsx`, `app/login.tsx`, `app/register.tsx`, `app/intro.tsx`, `app/onboarding.tsx` — `isFirstRun` surface, byte-identical (CON-10, ACC-09)
- `context/PasscodeContext.tsx:18-41` — in-memory passcode (§1.3, out of scope)
- `jest.config.js` — `roots: utils`; `utils/notifications.test.ts` — existing 98-test baseline (ACC-11)
- `specs/04-connection-status-vs-offline-mode.md` — Local/offline accounts; `specs/05-multi-device-behavior.md` — `session_ended` alert (§1.3)
- `AGENTS.md` §1.1 (spec-first), §1.4 (breaking changes + rollback), §1.5 (cross-platform), §1.7 (Expo Go), §1.8 (docs), §1.10 (spec-first + TDD platform matrix)
