# AGENTS.md — WiseWallet Agent Contract

> This file is the standing contract for any AI agent working in this repo.
> It outranks ad-hoc instructions when they conflict. If a request violates
> Section 1, stop and ask instead of proceeding.
> Companion rules: `.agents/rules/wisewallet.md`. Change journal: `docs/savepoint.md`.

---

## 1. Working agreements (must-follow, moving forward)

1. **Spec-first, no exceptions.** No code, config, or dependency changes without a
   written spec the user has explicitly marked **final/finalized**. The loop is:
   discuss → write spec → user approves spec as final → implement exactly the spec.
2. **No auto-pilot.** Never chain beyond what was approved. Finish the approved
   step, report, and stop. Ask before starting the next phase, even if it seems
   "obvious."
3. **Agent does not run CLIs — the user does.** The agent must NEVER execute
   terminal commands (`npm`/`npx`/`expo`/`git`/builds/deploys, etc.). The agent
   provides the exact commands; the user runs them and pastes back output.
   Rationale: the user owns the device, build environment, and credentials.
4. **No breaking changes unless the finalized spec requires them.** Storage keys
   (`user_{id}_*`), the API contract (`wallet-api`), AsyncStorage shapes,
   navigation routes, and native dependencies must stay compatible. Any
   migration must be in the spec with rollback noted.
5. **Cross-platform invariant.** Every change must keep **Android + iOS + Web**
   working. Use `Platform.OS` / `Platform.select` for platform code; never
   statically import a native-only module at file top-level (see the
   `expo-notifications` Expo Go crash — lazy-load with try/catch instead).
6. **Keep it Vercel-deployable.** Web output (`expo export --platform web`,
   see `vercel.json`) must keep working: no Node-only APIs in app code, no
   secrets in the bundle, `EXPO_PUBLIC_*` env only.
7. **Keep it Expo Go (latest) testable.** Nothing may crash Expo Go on import.
   Features unavailable in Go must degrade gracefully with an in-app fallback
   and a clear message — never a red-box crash. Verify mentally against this
   checklist before proposing any native dependency.
8. **Document after approved changes.** Update `docs/savepoint.md` (change
   journal) and append a `Current status` entry in Section 3 below, per
   `.agents/rules/wisewallet.md`.
9. **Spec format standard (all future specs).** Every normative spec MUST live
   as its own file under `specs/` (never inline in `AGENTS.md` — §4 is a
   pointer only) and MUST follow the `SPEC-04`
   (`specs/04-connection-status-vs-offline-mode.md`) template: metadata table
   (ID/Title/Status/Owner/Version/Scope/Non-goals) + RFC 2119 terminology +
   `Context` + `Constraints` (numbered `CON-*`, MUST/MUST NOT) + `Goal`
   (interaction matrix where applicable, decisions `DEC-*`, acceptance
   `ACC-*`) + `Deliverables` (numbered `D-*`) + `Glossary` + `References`.
   No normative change via reformat/polish alone.
10. **Spec-first + TDD with cross-platform coverage.** Every future `specs/`
    file MUST include a platform matrix (Android | iOS | Web) separating:
    - **Objective** — deterministic, machine-checkable (`ACC-*`): return values,
      copy strings, counts, timeouts/retries, zero-API-call gating,
      `Platform.OS` branches.
    - **Subjective** — human-judged UX stated as observable reviewer checks
      (e.g. "reviewer confirms banner is non-blocking, neutral color, no
      red-box in Expo Go"): still written as `ACC-*` with explicit pass/fail
      observation steps.
    TDD MUST cover both: `jest` tests parameterized by `Platform.OS`
    (`android`/`ios`/`web` via mock) for logic branches, plus user-run manual
    checks in Expo Go and `expo export --platform web` for native/UI paths
    that jest cannot prove. No platform-only behavior without a `CON-*` +
    `ACC-*` + `D-*`. This extends `SPEC-04 CON-07`.

---

## 2. App overview and scaffold

**What it is:** WiseWallet — personal finance management, Expo SDK 57 +
React Native + TypeScript (strict) + React Native Paper 5 (Material 3) +
Expo Router (file-based routing). **Offline-first**: AsyncStorage is the
single source of truth; cloud sync via `wallet-api` (Express + Supabase/Postgres,
base URL in `.env` as `EXPO_PUBLIC_API_URL`) is optional per account.

**Features:** Dashboard (balance, dues, recent activity) · Transactions
(add/edit/delete, receipt photo, payment method, establishment) · Reports
(Income-vs-Expense donut, monthly bar trend, category breakdowns, CSV/PDF
export) · Scheduled dues (recurring/one-time) · Allocations/Savings (goal
amount + progress) · Calendar · Financial Literacy (articles + TTS read-aloud)
· Cloud sync (auto-backup toggle, LWW merge / keep-local / keep-cloud,
manual backup/restore) · JSON export/import · 4-digit passcode lock ·
Dark mode · English UI · PHP currency · Custom categories · Payment methods.

**Scaffold:**

```
wise-wallet/
├── app/                    # Expo Router screens (17 routes)
│   ├── (tabs)/             # Tab navigator: index (Dashboard), reports,
│   │                       # learning, learning-detail, settings
│   ├── _layout.tsx         # Root layout + full provider tree + nav guards
│   ├── add/edit/transaction, transaction-details, dues, add-due,
│   ├── savings, add-allocation, calendar, category-settings,
│   ├── payment-methods, login, register, onboarding, intro,
│   ├── passcode-screen, notifications, help
├── components/             # TransactionList, SummaryCard, DonutChart,
│                           # MonthlyTrendChart, SmartInsights, CloudLinkBanner,
│                           # FinancialTip, EmptyState, ConfirmDialog, …
├── context/ (11)           # Data/Actions split per provider: Auth, UserProfile,
│                           # Transactions, Categories, Theme, Language, Passcode,
│                           # Currency, Network, SystemAlerts, DbRecovery, Repository
├── hooks/                  # useTransactions, useSavings, useDues, useInsights,
│                           # useCloudLink, useSyncStatus
├── repositories/           # AsyncStorage repos (transactions, categories, dues,
│                           # savings-items, profiles) + base + interfaces
├── utils/                  # db, storage (user_{id}_ keys), cache, secureStorage,
│                           # apiClient (authFetch), syncQueue/syncProcessor,
│                           # notifications (Expo-Go-safe lazy load), exportUtils,
│                           # amount (MAX 10,000,000), uuid, learningData,
│                           # speechVoice (SPEC-11 female TTS voice, web-safe)
├── types/                  # Transaction, Category, Due, SavingsItem
│                           # (has target_amount), UserProfile, SystemAlert, …
├── assets/  app.json  vercel.json  .env (EXPO_PUBLIC_API_URL)
├── specs/                  # Normative specs (FINAL = implementable)
│   └── 04-connection-status-vs-offline-mode.md
└── docs/savepoint.md  .agents/rules/wisewallet.md
```

**Architecture notes:** context split pattern (separate Data/Actions contexts to
limit re-renders) · repository pattern over AsyncStorage · dual sync
(transactions inline-merge, others queue-based) · LWW conflict resolution via
`updatedAt` · `AuthLoader` per-user DB init + nav guards in `MainLayout` ·
local notifications lazy-loaded so Expo Go never evaluates the native module.

---

## 3. Current status (historical tracking — append newest at bottom)

- **2026-09-21 — Ma'am Haidee suggestions implemented.** Dashboard header is
  date+day only (`app/(tabs)/index.tsx`); Reports has Expense/Income/Total top
  cards with bar chart first, pie second (`app/(tabs)/reports.tsx`); Settings
  is English-only, language toggle removed (`app/(tabs)/settings.tsx`);
  Allocations goal amount + progress bar and Learning TTS read-aloud verified
  pre-existing and preserved.
- **2026-09-21 — Amount cap ₱10,000,000.** `utils/amount.ts` `MAX_AMOUNT` plus
  all validators/messages in add/edit-transaction, add-due, dues, onboarding,
  add-allocation, savings. Lint clean.
- **2026-09-21 — Expo Go crash fixed.** `utils/notifications.ts` lazy-loads
  `expo-notifications` (SDK 53+ throws on static import in Go); local reminders
  no-op in Go, in-app SystemAlerts unaffected.
- **2026-09-21 — Config health.** `app.json` migrated to SDK 57 schema
  (removed `newArchEnabled`/`splash`/`edgeToEdgeEnabled`; splash moved to
  `expo-splash-screen` plugin); installed `expo-font` + `expo-splash-screen`;
  `expo-doctor` 21/21; `npm run lint` clean.
- **2026-09-21 — Spec §4 proposed (NOT finalized).** Connection status vs
  offline (local-only) account mode. Open decisions pending user call; no
  implementation until finalized.
- **2026-09-21 — Spec §4 revised per user call.** Mode is an explicit
  Online/Offline choice at registration (replaces email-format inference);
  "auto-backup" is not user-facing vocabulary for Local accounts —
  `autoBackup = false` is automatic, the switch is hidden, Settings shows
  "Make Online" instead. Login-no-network review deferred.
- **2026-09-21 — Spec §4 FINAL per user call.** Local probe = device
  connectivity only (no API ping); Auto-Backup switch always shown — Cloud
  OFF stays Cloud (sync off only, auth still allowed), Local ON routes to
  Make Online register workflow, once Cloud always Cloud; Login = up to 3
  throttled retries then transient offline notice; no Cloud→Local downgrade.
- **2026-09-21 — Specs moved out of AGENTS.md.** New `specs/` folder;
  `specs/04-connection-status-vs-offline-mode.md` is now normative (FINAL).
  `AGENTS.md §4` is a pointer only.
- **2026-09-21 — Spec reformatted.** `specs/04-*` now uses Context,
  Constraints, Goal, Deliverables (same normative content).
- **2026-09-21 — Spec polished.** `specs/04-*` adds metadata, RFC 2119
  keywords, numbered CON/ACC/D requirements, glossary, references (no
  normative change).
- **2026-09-21 — Spec format rule added.** `AGENTS.md §1.9`: all future
  specs MUST live under `specs/` and follow the SPEC-04 template
  (metadata + RFC 2119 + Context/Constraints/Goal/Deliverables +
  CON/ACC/D + Glossary + References).
- **2026-09-21 — Spec 04 v1.3 review polish.** Fixed stale login cite
  (188-193), both-token guards, flag migration rule, retry numbers
  (3s/500ms/1500ms, non-blocking notice), Cloud-OFF queue paused,
  D-04 end-state (same normative intent).
- **2026-09-22 — Spec 04 implemented (all 7 deliverables).** D-01 register
  mode selector (Online/Offline explicit choice); D-02 `isLocalAccount()`
  utility + hook; D-03 writer gating (all contexts + UserProfile gate API
  calls for local accounts); D-04 connection plumbing (useCloudLink 2s
  check deleted, CloudLinkBanner both-token + device connectivity,
  NetworkContext device-only for local); D-05 settings/status copy
  ("Local-only account", "Sync off", neutral colors, Make Online button);
  D-06 login retry (3 tries, 3s abort, backoff, transient notice); D-07
  Make Online upgrade flow (PIN → register → conflict → merge). Lint clean.
- **2026-09-22 — Spec 04 updated.** autoBackup permanent false for Local
  accounts (CON-03, D-07, ACC-06 added). Make Online dialog warns
  irreversibility + auto-backup enabled. settings.tsx copies updated.
- **2026-09-22 — Spec 05: Multi-Device Behavior.** New
  `specs/05-multi-device-behavior.md` (FINAL). D-MD-01: session kill
  notification — 401 handler passes reason to AuthContext;
  SystemAlertsContext.createSessionEndedAlert() persists "Session Ended"
  alert; nav guard creates alert before redirect. D-MD-02: conflict
  overwrite display — sync merge in TransactionsContext, useSavings,
  useDues, CategoriesContext counts overwritten records (remote updatedAt
  > local) and shows transient Snackbar. New context/ToastContext.tsx.
  Lint clean.
- **2026-09-22 — Standing rule §1.10 (FINAL).** Spec-first + TDD with
  cross-platform coverage: future `specs/` MUST include Android|iOS|Web
  matrix split Objective (machine-checkable `ACC-*`) vs Subjective
  (observable reviewer checks); TDD covers both via `jest` parameterized
  by `Platform.OS` plus user-run Expo Go + web export checks.
- **2026-09-22 — Spec 06 implemented (FINAL).** `specs/06-web-warning-cleanup.md`:
  shadow/boxShadow, textShadow, `useNativeDriver`, `pointerEvents` web WARN
  cleanup with native parity. See `docs/savepoint.md`.
- **2026-09-22 — Spec 04 v1.4 implemented (FINAL).** Web online-only creation:
  register/login offer no new Offline accounts on web; existing web locals
  keep login + Make Online. Android/iOS unchanged.
- **2026-09-23 — Spec 07 implemented (FINAL).** `specs/07-completed-due-locking-and-auto-progression.md`:
  D-01 completed dues locked (no edit/delete/undo buttons); D-02
  `recordTransaction()` gates next-occurrence creation on `autoProcess === true`;
  D-03 help screen copy updated. Lint clean.
- **2026-09-23 — Spec 08 implemented (FINAL).** `specs/08-enable-date-selection-on-add-due.md`:
  D-01 Add Due screen now has a working `Calendar` date picker (was no-op);
  users can select any date when creating a scheduled due. Lint clean.
- **2026-09-23 — Spec 09 implemented (FINAL).** `specs/09-fix-default-category-for-scheduled-due-transactions.md`:
  D-01 `recordTransaction()` fallback category changed from silent "Food"
  default to synthetic "Add Scheduled" label. Lint clean.
- **2026-09-23 — Transaction details text node fix.** `app/transaction-details.tsx`:
  changed `&&` conditional patterns to ternary `? : null` inside Card.Content
  to prevent empty-string text nodes inside `<View>`. Lint clean.
- **2026-09-23 — Spec 10 FINAL + implemented.** `specs/10-negative-balance-alert-recovery.md`:
  negative-balance alert auto-resolves. D-01 `checkAndTriggerNegativeBalanceAlert`
  returns `BalanceAlertEvaluation` — balance ≥ ₱0 deletes unread Negative
  Balance Alerts; improvement-while-negative updates the existing alert's
  amount/message in place (no duplicate); unchanged = no-op; worse or
  re-trigger = new unread alert (OS push only on create) (`utils/notifications.ts`);
  D-02 `SystemAlertsContext.checkNegativeBalance` refreshes on any mutation
  (`context/SystemAlertsContext.tsx`); D-03 evaluator runs unconditionally,
  removed the `balance < 0` gate (`context/TransactionsContext.tsx`); D-04
  `utils/notifications.test.ts` ACC-01..08 across android/ios/web
  (jest parameterized by `Platform.OS`); AsyncStorage jest mock typed
  (strict-clean implicit-any params). See `docs/savepoint.md`.
- **2026-09-24 — Spec 07 implemented (FINAL).** `specs/07-ci-tsc-exclusion.md`:
  app `tsc` excludes Jest-only files (`*.test.ts`, `*.spec.ts`, `__mocks__/**`);
  `tsconfig.test.json` covers `__mocks__`; mock annotations only, logic
  unchanged. No new deps, zero runtime change. See `docs/savepoint.md`.
- **2026-09-26 — Spec 11 FINAL + implemented.** Female TTS voice for
  Financial Literacy read-aloud (`specs/11-female-tts-voice-for-recommended-reading.md`).
  `expo-speech` exposes no gender on any platform, so D-01 new
  `utils/speechVoice.ts` infers it: en-locale filter + Tier 0 male-name
  exclusion + Tier 1 gender words + Tier 2 known female names, memoized once
  per session, `pitch 1.15` / `rate 0.9` / `en-US`. 2000 ms lookup cap and a
  silent default-voice fallback keep read-aloud from ever blocking; `Speech.speak`
  try/catch retries once without `voice` (iOS throws on a bad identifier).
  D-02/D-03 both surfaces use `speakWithFemaleVoice` (no inline `Speech.speak`
  left, no UI/copy change); D-04 `utils/speechVoice.test.ts` ACC-01..10 across
- **2026-09-26 — Spec 17 FINAL + implemented.** `specs/17-fab-button-styling.md`:
  FAB styling alignment across `/dues` and `/savings` to match Home screen
  (`app/(tabs)/index.tsx`). D-01: `app/dues.tsx` FAB moves
  `backgroundColor: theme.colors.primary` into `style` and sets `color="#fff"`.
  D-02: `app/savings.tsx` FAB moves `backgroundColor: theme.colors.primary` into
  `style`, sets `borderRadius: 20` and `color="#fff"`. Eliminates faint/invisible
  washed-out buttons caused by passing `backgroundColor` as a direct component prop.
  See `docs/savepoint.md`.
- **2026-09-29 — Spec 23 FINAL + implemented.** `specs/23-numamount-reference-and-dues-lint-fix.md`:
  D-01 `app/add-transaction.tsx` declares `const numAmount = amount ? parseAmount(amount) : 0;`
  at component scope, fixing the `ReferenceError: numAmount is not defined` runtime crash and
  formatting warning text with `formatAmount(availableBalance)`.
  D-02 `app/dues.tsx` removes unused `Alert` from `react-native` import, clearing the ESLint
  `@typescript-eslint/no-unused-vars` warning. See `docs/savepoint.md`.
- **2026-09-29 — Spec 25 FINAL + implemented.** `specs/25-passcode-modal-step-ui.md`:
  Sequential step-by-step passcode dialog in `app/(tabs)/settings.tsx`. D-01 `showChangePasscodeDialog`:
  title is step-aware ("Change Passcode" → "Enter New Passcode"); Step 1 Dialog.Actions "Verify Current PIN"
  button has real onPress (was no-op), disabled until 4 digits, shows "Incorrect Current PIN. Try again."
  on mismatch; Step 2 "Set Passcode" disabled until new fields match and are 4 digits; removed dead
  `getChangePasscodeError()`. D-02 `showPinSetup`: `onDismiss` calls `closePinSetupDialog()`;
  "Set Passcode" disabled until both fields match; `pinSetupError` displayed below Confirm field.
  See `docs/savepoint.md`.
- **2026-09-29 — Spec 27 FINAL (spec only, not implemented).** `specs/27-two-device-single-transaction-log.md`
  v1.0: same Cloud `user.id` + all devices ON → one shared transaction log after settle.
  Fresh `updatedAt` on add/update, server-delete-wins, OFF = fully isolated (zero transaction calls),
  autoBackup per-device never synced, global `sync_queue` + idempotent items, foreground/focus +
  pull-to-refresh only, single-session stands. OFF-edge: orphans stay local, re-enable auto-drains.
  D-01..D-08 pending implementation — awaiting explicit order. See `docs/savepoint.md`.
- **2026-09-29 — Spec 27 implemented.** Branch `spec-27-two-device-single-log` (from `main`).
  `utils/transactionSync.ts` new (pure merge/LWW/delete-wins/orphan helpers + last-server-id snapshot);
  `TransactionsContext` fresh `updatedAt` + OFF early-out + merge + awaited queue drain;
  queue drain asserts `userId`, stats scoped to active user; Dashboard pull-to-refresh (native);
  `SyncStatusCard` diagnostics + orphan copy, re-enable toasts; `transactionSync.test.ts` new
  (ACC-01..05/10..11 × android/ios/web) + 2 drain-guard tests in `syncProcessor.test.ts`.
  User-run verification pending: tsc, `npm test`, eslint, Expo Go + web export. See `docs/savepoint.md`.
- **2026-09-29 — Spec 28 + 29 FINAL + implemented.** Branch `spec-28-29-delete-and-queue`
  (stacked on spec-27 branch). SPEC-28: `authFetch` 401 opt-out; verify-login stores fresh JWT
  (self-kill fix); delete branches on result with honest copy; email+401 hard-fails login;
  full device purge (ghosts, U-only queue items, caches, receipts). SPEC-29: enqueue coalescing,
  200 ms trigger window, dead-letter counter + diagnostics. New `utils/accountDelete.ts`,
  `apiClient.test.ts`, `accountDelete.test.ts`, `syncQueue.test.ts`; +5 in `syncProcessor.test.ts`.
  User-run verification pending. See `docs/savepoint.md`.
- **2026-09-29 — Spec 30 FINAL (spec only, not implemented).** `specs/30-local-creation-gate-and-reregistration-promotion.md`
  v1.0: Local creation at registration only (login dialog removed everywhere); offline register shows
  once-per-visit Offline suggestion modal; Local autoBackup ON → re-registration (new Cloud identity,
  guided skippable export, old Local intact, no merge). Supersedes SPEC-04 D-06/D-07/D-09 parts + ACC-06
  on implementation day. D-01..D-06 pending — queued behind SPEC-28/29. See `docs/savepoint.md`.
- **2026-09-30 — Spec 30 implemented.** `utils/localGate.ts` new (device-online gate, suggestion resolver,
  reregistration guards/payload/validators/invariants + copy constants) + `utils/localGate.test.ts`
  (ACC-01..05 × android/ios/web); `app/register.tsx` once-per-visit Offline suggestion modal + explicit
  local-fallback confirm (no silent fallback); `app/login.tsx` Create Offline Account removed everywhere
  (plain failure + Register route); `app/(tabs)/settings.tsx` Local promotion = honesty → skippable export →
  email+PIN re-register → new Cloud session, old Local intact, no merge (button renamed to
  "Register Online Account", switch enabled for Local, offline guard zero fetch/write);
  `hooks/useCloudLink.ts` Alert → settings routing (web-safe). SPEC-04 D-06/D-07/ACC-06/D-09-mobile-note/CON-03
  retired per CON-07; ACC-10 preserved. User-run verification pending: tsc, `npm test`, eslint, Expo Go + web export.
  See `docs/savepoint.md`.
- **2026-09-30 — Spec 31 FINAL + implemented.** `specs/31-web-never-local-and-logout-hygiene.md` v1.0.
  D-01 web never local (`isLocalAuthAllowed` gate + `attemptLocalLogin` early-out: unreachable → Connect notice,
  unknown/401 → plain failure + Register route, zero local reads/writes on web). D-02 logout hygiene
  (`clearSessionCaches`, both token stores cleared, session-kill reuses helper; stored data preserved).
  D-05 Settings PIN unification (shared `deviceId` on all three auth calls, explicit session-conflict notice
  never reported as wrong PIN, fallback matches id-or-name). Retired: SPEC-04 ACC-10/DEC-04/D-09-web/D-06-web;
  SPEC-28 CON-04/05-web-clauses/goal-row/ACC-09; SPEC-30 §1.3/DEC-02-web. `utils/localGate.test.ts` extended
  (ACC-01..04 + ACC-07..09 × android/ios/web). User-run verification pending: tsc, `npm test`, eslint,
  Expo Go + web export (ACC-05/06/10). See `docs/savepoint.md`.
- **2026-09-30 — Spec 32 FINAL + implemented.** `specs/32-keyboard-visibility-for-text-inputs.md` v1.0.
  New `components/KeyboardAwareDialog.tsx` (KAV + ScrollView, web passthrough, built-ins only);
  5 Settings PIN dialogs wrapped; `passcode-screen` + 4 form screens + learning get `KeyboardAvoidingView`;
  dues/savings/category/payment modals wrapped; `keyboardShouldPersistTaps` on every ScrollView.
  New `utils/keyboardVisibility.test.js` (ACC-01..03 × android/ios/web). User-run verification pending:
  tsc, `npm test`, eslint, Expo Go (ACC-04/05) + web export (ACC-06). See `docs/savepoint.md`.
- **2026-09-30 — Spec 34 FINAL + implemented.** `specs/34-api-only-online-mode.md` v1.0: Cloud+ON is
  API-only (memory state, direct reads/writes, zero entity persistence); AsyncStorage persists mobile-Local
  and mobile-OFF only. New `utils/apiOnly.ts` (mode router, normalizer, direct CRUD, ensure-exists,
  fetch→push→purge migration, OFF-while-offline guard) + `utils/apiOnly.test.ts`
  (ACC-01..04/09/10 × android/ios/web); all 5 data layers branched; new `components/ApiOfflineBanner.tsx`
  (banner + gate, generic banner suppressed in API-only); register/login skip entity writes (registry kept);
  OFF→ON = PIN → explanation → migration, ON→OFF = verified snapshot seed; merge/conflict OFF→ON path deleted;
  export/import follow the mode; SyncStatusCard shows Live. CON-09 scopes SPEC-04/22/27/29 to the
  local-persist plane; SPEC-33 draft absorbed. Known limitation: due-reminder scheduling reads local repos
  (no-op in API-only). User-run verification pending: tsc, `npm test`, eslint, Expo Go + web export
  (ACC-05..08). See `docs/savepoint.md`.
- **2026-09-30 — Spec 35 FINAL + implemented (flag ships OFF).**
  `specs/35-login-database-reset-flagged.md` v1.0: `EXPO_PUBLIC_ADMIN_TOGGLE=true`
  (exact match; false/absent = off; rebuild to flip) gates a subtle "Reset all data"
  button on login (`.env` + `.env.example` pinned to `false` locally). Two-step confirm
  (warning → checkbox) then `utils/deviceReset.ts` wipes AsyncStorage (minus
  `system_reset_epoch`), token (both stores), caches, and all users' receipt files;
  preserves `localDeviceId`/epoch/user files; never calls the API; lands clean on
  `/login`. New `utils/featureFlags.ts` + `utils/deviceReset.test.ts`
  (ACC-01..04 × android/ios/web). No enablement — separate order required.
  User-run verification pending: tsc, `npm test`, eslint, Expo Go + web export
  (ACC-05/06 need a temporary local flag flip only). See `docs/savepoint.md`.

---

## 4. Spec: Connection Status vs Offline (Local-Only) Account Mode

**Status: FINAL (2026-09-21 per user call) — normative text lives in
`specs/04-connection-status-vs-offline-mode.md`; implement exactly that. No
Cloud→Local downgrade.**

> Specs moved out of `AGENTS.md` on 2026-09-21 per user request. This section
> is a pointer only — see `specs/04-connection-status-vs-offline-mode.md`
> (Context, Constraints, Goal, Deliverables).
