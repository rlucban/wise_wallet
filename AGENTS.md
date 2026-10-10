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
11. **Bare-minimum diffs.** Implement the smallest change that satisfies the
    FINAL spec's `ACC-*` — nothing more. No refactoring, no drive-by cleanups,
    no new files, helpers, or abstractions unless a `D-*` item names them. If
    the minimal fix exposes adjacent rot, note it in `docs/savepoint.md` and
    stop; that second fix needs its own spec.
12. **No new dependencies unless instructed.** Do not add npm packages, native
    modules, fonts, or any third-party code unless the user explicitly instructs
    it or the FINAL spec requires it by name (install command goes to the user
    to run, per §1.3). Prefer existing imports and stdlib.
13. **Plan-fix validation gate.** `/implement-fix` reads ONLY a plan file with
    `status: ready-for-implement-fix` containing decision, in-scope/out-of-scope
    paths, and calibration. Before the first slice, validate: every slice maps
    to a `D-*` in the FINAL spec; no out-of-scope path is touched; no overlap
    with another FINAL spec's scope (if two specs cover the same behavior, stop
    and ask which governs — never implement both readings); no dependency beyond
    rule 12. Any failure → stop and ask. Never re-plan inside `/implement-fix`.
14. **One home per spec and slice.** Never duplicate a spec, slice, or test
    across worktrees or files — cross-reference instead. If the same behavior is
    specified twice, treat it as an overlap: stop, ask which is canonical, and
    reconcile before writing code.

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
- **2026-09-30 — Spec 26 FINAL + implemented.** `specs/26-responsive-dialogs-and-clear-data-flow.md`:
  Responsive Dialog UI for Web/PWA and mobile, dialog dismissal fix, button styling, and centered text.
  D-01 `components/ConfirmDialog.tsx`: added `style={{ maxWidth: 480, width: "90%", alignSelf: "center" }}`.
  D-02 `app/(tabs)/settings.tsx`: added `styles.dialog` (`maxWidth: 480, width: "90%", alignSelf: "center"`)
  and applied to all 9 Dialog instances; centered titles, descriptions, and action rows in `showPinPrompt`
  and `showDeleteConfirmation`; fixed modal transition by closing `showPinPrompt` before opening
  `showDeleteConfirmation`; gated cloud clear on `!isLocal`; styled Cancel buttons as `mode="outlined"` and
  destructive buttons (`Clear Data`, `CLEAR EVERYTHING`, `Delete Permanently`) as `mode="contained"` with
  error background and white text; updated `executeClearData` to close confirmation dialog immediately,
  clear all data, and present `showMessage` success modal with "Cleared Successfully" redirecting to "/"
  on dismiss; removed unused `useToast` import. See `docs/savepoint.md`.
- **2026-09-30 — Spec 27 FINAL + implemented.** `specs/27-allocation-archive-functionality.md`:
  Allocation Archive Functionality in Savings Screen.
  D-01 `types/index.ts`: added optional `isArchived?: boolean` to `SavingsItem`.
  D-02 `app/savings.tsx`: separated active and archived allocations (`activeAllocations`, `archivedItems`);
  updated top card to display `TOTAL ACTIVE ALLOCATED`; added `handleArchiveItem` and archive buttons on
  active and completed cards; added "Archived Allocations" section with subtotal header `Total Archived: ₱X.XX`;
  enforced read-only state for archived cards by hiding Edit (pencil) and transfer buttons; added Restore
  (`handleRestoreItem`) and Delete Permanently (`delete-forever-outline` wired to `ConfirmDialog`);
- **2026-09-30 — Spec 28 FINAL + implemented.** `specs/28-dedicated-archived-allocations-screen.md`:
  Dedicated Archived Allocations Screen & Header Navigation.
  D-01 `app/savings.tsx`: added header action button `<Appbar.Action icon="archive-outline" onPress={() => router.push("/archived-allocations")} />`
  on the right side of `Appbar.Header`; removed inline archived section; simplified `ConfirmDialog`.
  D-02 `app/archived-allocations.tsx`: created dedicated Archived Allocations screen with back action header,
  top `TOTAL ARCHIVED` card, empty state, read-only cards, Restore (`archive-arrow-up-outline`), and Delete Permanently
  (`delete-forever-outline` wired to `ConfirmDialog`).
- **2026-09-30 — Spec 29 FINAL + implemented.** `specs/29-transaction-icon-vibrancy-and-archive-blue-styling.md`:
  Transaction Icon Color Vibrancy & Allocation Archive Blue Styling.
  D-01 `components/TransactionList.tsx` & `app/(tabs)/index.tsx`: updated transaction icon containers
  to use semantic `tertiaryContainer` (income) and `errorContainer` (expense) with matching vibrant icon colors.
  D-02 `app/savings.tsx`: header `<Appbar.Action icon="archive-outline" />` and card `<IconButton icon="archive-arrow-down-outline" />`
  now use system blue (`theme.colors.primary`).
- **2026-09-30 — Spec 30 FINAL + implemented.** `specs/30-fix-transaction-details-hero-icon-and-revert-dashboard-green.md`:
  Fix Transaction Details Hero Icon & Revert Dashboard Icon Container.
  D-01 `components/TransactionList.tsx` & `app/(tabs)/index.tsx`: reverted icon container `backgroundColor`
  back to `theme.colors.surfaceVariant` (green container removed).
  D-02 `app/transaction-details.tsx`: fixed invisible hero icon above `+₱500.00` by updating icon color
  from `#ffffff` to `isIncome ? "#16A34A" : "#DC2626"`.
- **2026-09-30 — Spec 31 FINAL + implemented.** `specs/31-unify-transaction-category-icon-in-details.md`:
  Unify Transaction Category Icon in Transaction Details.
  D-01 `app/transaction-details.tsx`: added `renderCategoryIcon` helper and wired hero icon
  `name` prop to match Dashboard Recent Activity dynamic icons.
  See `docs/savepoint.md`.
- **2026-09-30 — Spec 32 FINAL + implemented.** `specs/32-completed-dues-screen-and-transaction-deletion-lock.md`:
  Dedicated Completed Dues Screen & Scheduled Transaction Deletion Lock.
  D-01 `app/dues.tsx`: added top-right header action `<Appbar.Action icon="check-circle-outline" color={theme.colors.primary} onPress={() => router.push("/completed-dues")} />`;
  removed completed dues from inline list; attached `dueId: item.id` during `recordTransaction()`.
  D-02 `app/completed-dues.tsx`: created dedicated completed dues screen with back action header,
  top `TOTAL COMPLETED` summary card, filter segments ("This Week", "This Month", "All"), read-only cards,
  and `EmptyState`.
  D-03 `app/_layout.tsx`: registered `<Stack.Screen name="completed-dues" />`.
  D-04 `app/transaction-details.tsx`: locked delete action (`{!isScheduled && ( ... )}`) for transactions
  originating from scheduled dues.
  See `docs/savepoint.md`.
- **2026-09-30 — Spec 33 FINAL + implemented.** `specs/33-settings-remove-json-label.md`:
  Remove "(JSON)" Label from Settings Export & Import Buttons.
  D-01 `app/(tabs)/settings.tsx`: changed button text from "Export Data (JSON)" and
  "Import Data (JSON)" to "Export Data" and "Import Data".
  See `docs/savepoint.md`.
- **2026-09-30 — Spec 27 FINAL + implemented.** `specs/27-theme-onprimary-label-colors.md`:
  D-01 `app/add-allocation.tsx` `buttonTextColor` enabled branch → `theme.colors.onPrimary` and
  `disabledText` → `theme.colors.surface` (fixes an invisible disabled label that shared the
  disabled `onSurface` fill); D-02 `app/add-due.tsx`, D-03 `app/dues.tsx` (FAB + edit-modal
  Button), D-04 `app/savings.tsx` (FAB + 3 modal Buttons), D-05 `app/category-settings.tsx`
  (FAB + Add Button) — all 9 remaining `#fff` labels → `theme.colors.onPrimary`.
  `utils/themeColors.test.js` unchanged by design (guard not weakened); Home FAB
  (`app/(tabs)/index.tsx`) left at `#fff` (out of scope). Light mode visually identical;
  dark mode label contrast improved. See `docs/savepoint.md`.
- **2026-09-30 — Spec 28 FINAL + implemented.** `specs/28-passcode-screen-ref-type.md`:
  D-01 `app/passcode-screen.tsx:11` `useRef<any>(null)` → `useRef<NativeTextInput>(null)` (host `TextInput`
  imported as `NativeTextInput`; Paper's `ref` needs `Ref<NativeTextInput> & Ref<TextInputHandles>` and
  `TextInputHandles` is not exported by `react-native-paper`). Clears the last
  `@typescript-eslint/no-explicit-any` warning (pre-existing, unrelated to Spec 27);
  `eslint.config.js` untouched. Type-level only — auto-focus on mount preserved, no runtime change.
  See `docs/savepoint.md`.
- **2026-10-01 — Spec 30 FINAL v2.1 + implemented.** `specs/30-force-reauth-on-cold-start.md`:
  every cold start now lands on Login/Register (Android + iOS + Web). v1.0's `isFirstRun`/`profileMerge`
  half was deleted by user call — `UserProfileContext.tsx`, `login.tsx`, `register.tsx`,
  `DEFAULT_PROFILE` byte-identical. D-01 `ColdStartSessionGuard` in `app/_layout.tsx`
  (one-shot per process via `useRef`, gated on `isLoading` so it cannot race the restore in
  `AuthContext.tsx:32-44`); D-02 `SystemResetManager` returns early with no `activeUserId`
  (prevents `hardResetLocalData()` from wiping `master_users`/Local PINs); D-03 `lastActiveUserId`
  key + one-shot pre-login reminder effect + check-only `hasNotificationPermission()` (no prompt
  pre-login); D-04 stays **online-first** (branch unchanged; only the sync-queue trigger is gated
  on `activeUserId`, since `sync_queue` is device-global and has no auth guard) — a signed-out
  startup is never treated as a Local-only account. No jest tests added — lifecycle/storage code
  the `roots: utils` setup can't render; stated as a §1.10 gap with a manual matrix.
  See `docs/savepoint.md`.
- **2026-10-01 — Spec 32 FINAL v1.0 + implemented.** `specs/32-tab-bar-label-visibility.md`:
  bottom tab labels were invisible on Android/iOS (web-only). Root cause traced to
  expo-router 57's bundled bottom-tabs fork: `shouldUseHorizontalLabels` gives web
  `horizontal = true` (label beside icon, cannot overflow) but a portrait phone
  `false` (label below icon), where the hardcoded 28px icon box (`TabBarIcon.js:13`;
  `isCompact` is iPhone-landscape-only) plus a 15px label needs 43px against the 34px the
  old `height: 60` / `paddingTop/Bottom: 8` left — and `tabBarStyle` is applied last
  (`BottomTabBar.js:257`), so `paddingBottom: 8` also clobbered `insets.bottom`.
  D-01 new `utils/tabBarMetrics.ts` (pure, no `react-native` import, library constants
  cited to upstream lines; `height = 68 + insets.bottom`, `usableHeight = 54`,
  `requiredHeight = 28 + ceil(12 * 1.2 * fontScale)`); D-02 `app/(tabs)/_layout.tsx` uses
  `useSafeAreaInsets()` + destructures `height`/`paddingTop`/`paddingBottom` (no nested
  `SafeAreaProvider` — expo-router's `ExpoRoot` supplies one); D-03
  `utils/tabBarMetrics.test.ts` 49 tests, ACC-01..05 with `Platform.OS` android/ios/web
  cases asserting literal metrics; D-04 docs. v1.0 amended v0.1 to destructure instead of
  spread, keeping diagnostics out of `tabBarStyle`. `tabBarAllowFontScaling` deliberately
  NOT locked (CON-08); `tabBarLabelPosition` not pinned, so web keeps its side-by-icon
  layout (DEC-05). No dependency, storage, API, or route change.
  See `docs/savepoint.md`.
- **2026-10-01 — Spec 33 FINAL v1.1 + implemented.** `specs/33-report-export-fidelity.md`:
  ten defects in the Reports PDF/CSV export. D-01 new `utils/reportFormat.ts` (pure, all string
  generation, `import type` only) exporting `escapeHtml`, `csvCell`, `formatReportDate`
  (arithmetic UTC+8, **not** `Intl` — §1.3), `computeReportTotals`, `buildReportFileName`,
  `buildCsvContent`, `buildReportHtml`, and the shared 7-field `REPORT_COLUMNS`; D-02
  `utils/exportUtils.ts` reduced to orchestration — web prints via an off-screen `aria-hidden`
  iframe (`ExponentPrint.web.js:8-13` ignores `options.html`, so web was printing the Reports
  screen), native does `printToFileAsync` → idempotent `deleteAsync` + `copyAsync` to
  `WiseWallet_Report_<slug>.pdf` → `shareAsync` with mime/UTI; D-03 one line in
  `app/(tabs)/reports.tsx:390` passes `currentRange.label`; D-04
  `utils/reportFormat.test.ts` 58 tests, ACC-01..06 + CON-20, incl. a quote-aware CSV reader
  and a byte-identical-output check across `Platform.OS` android/ios/web; D-05 docs. v1.1
  added CON-20 (empty period prints one `colspan="7"` row, header-only CSV) — a non-normative
  post-FINAL addition recorded in the spec's History. Defect 8 (₱ U+20B1) is an **accepted
  risk**, not a fix: font stack frozen (CON-10), verified on device via ACC-08 (DEC-11). Also
  fixed the latent `documentDirectory` null interpolation and dropped a needless
  `as unknown as` cast. No dependency, storage, API, or route change.
  See `docs/savepoint.md`.
- **2026-10-02 — Spec 34 FINAL v1.1 + implemented.** `specs/34-pdf-chart-summary-format.md`:
  the PDF's main body is now a chart summary instead of a table. **Supersedes part of Spec
  33** — its escaping, Manila dates, file name, web iframe print, font freeze, heading color,
  and empty-period rules all carry over, but its "range label + totals only" body and its
  column parity are **relocated** to the appendix (the PDF and CSV still agree on all 7
  fields). User decisions: charts + appendix (detail moved, not dropped), bar graph =
  **monthly** income-vs-expense trend, **categorical palette**, **top 7 + Other**. D-01 new
  `utils/reportCharts.ts` (pure geometry/aggregation, no HTML) — `rollUpCategories`,
  `buildDonutSegments` (`stroke-dasharray`, deliberately **not** `pathLength`, which fails
  silently when unsupported), `bucketMonths`/`formatReportMonth` (Manila, so
  `2025-12-31T16:30Z` is Jan 2026 in the chart and `01/01/2026` in the appendix), and
  `buildBarChart`; D-02 `utils/reportFormat.ts` adds `buildDonutSvg`, `buildBarChartSvg`,
  `buildCategoryListHtml`, `buildTotalsHtml`, `buildAppendixHtml`; D-03
  `utils/reportCharts.test.ts`; D-04 four new `reportFormat.test.ts` suites. **Color
  decision (DEC-03/CON-03):** in the donut and list, hue identifies the *category* and never
  the type — the palette excludes `#ef4444`/`#10b981` so red/green means income/expense in
  the bar chart only, and the list carries separate labeled Expense/Income columns. Charts are
  hand-written inline SVG because `react-native-svg` has no HTML serializer and a CDN chart
  renders empty under print. `exportToPDF`'s signature, `exportUtils.ts`, and `reports.tsx`
  are **untouched** — rollback is two files. v1.1 dropped a never-read `strokeWidth`
  parameter (recorded in the spec's History). Peso risk carried forward (DEC-11, ACC-16).
  See `docs/savepoint.md`.
- **2026-10-03 — Spec 36 DRAFT v0.1 (not yet FINAL).** `specs/36-web-platform-invariants.md`:
  web always-Online, never-Local, always-`autoBackup=true` (open: `DEC-W1` pin
  hardness, `DEC-W2` legacy web locals, `DEC-W3` legacy Cloud-OFF normalization).
  Amends SPEC-04 v1.4 on web only (no SPEC-35 in this tree — caller conformance
  is generic); native untouched. Needs user call + FINAL mark. See `docs/savepoint.md`.
- **2026-10-03 — Standing rules §1.11–§1.14 (mirrored per user call).** Same
  four rules as the PIN worktree: bare-minimum diffs; no new dependencies
  unless instructed or FINAL-spec-named; plan-fix validation gate; one home
  per spec/slice (the SPEC-36 copy in `spec-change-pin` is the known §1.14
  overlap — canonical home undecided). See `docs/savepoint.md`.
- **2026-10-04 — Spec 36 FINAL v1.0.** `specs/36-web-platform-invariants.md` rewritten to FINAL: scope corrected to Local-vs-API-connected only (`autoBackup` excised); web persists API-direct, flag ignored, fail-open; `DEC-W1` hard pin, `DEC-W2` force-migrate legacy web locals. Implementable one slice at a time. See `docs/savepoint.md`.
- **2026-10-04 — Spec 36 implemented (D-W-01..D-W-03, S3..S12a).** Hard pin, force-migrate routing, and full API-direct web paths across 12 files; session-memory alerts; `utils/webPin.test.ts` (16 guards, ACC-W-01..04). Fixed 2 TS2367 via narrowing rule. Open: user-run jest/lint + web-export/Expo Go matrix. See `docs/savepoint.md`.
- **2026-10-04 — Spec 37 FINAL + implemented.** `specs/37-onboarding-opening-balance-payment-method.md`: onboarding Opening Balance omitted `paymentMethod` → sanitize `""` → server zod 400, masked as "connection" error with console-only catch (stuck screen). D-01 new `utils/onboardingPayload.ts` (`"cash"`, null for 0); D-02 `app/onboarding.tsx` routes through builder + rendered re-triable error; D-03 `utils/onboardingPayload.test.ts` (ACC-01..04, android/ios/web). No backend/storage/API/route/dep change. Open: user-run jest/lint/tsc + web Get Started matrix. See `docs/savepoint.md`.
- **2026-10-04 — Spec 38 FINAL + implemented.** `specs/38-settings-account-mode-token-only.md`: settings OR-ed the token with an `isUsernameOnly` name check — onboarding writes display names, so every cloud account showed "Local-only" with Auto-Backup OFF + disabled. D-01 `app/(tabs)/settings.tsx` derives mode from `useIsLocalAccount()` only, Backup/Restore hidden on web (SPEC-36 ACC-W-03); D-02 `utils/settingsAccountMode.test.ts` (ACC-01..04, android/ios/web). Amends SPEC-26 CON-11 for settings copy only. No backend/storage/API/route/dep change. Open: user-run jest/lint/tsc + ACC-S01..S04 matrix. See `docs/savepoint.md`.
- **2026-10-04 — Spec 39 FINAL + implemented.** `specs/39-web-auto-backup-switch-disabled.md`: web `autoBackup` guards nothing (SPEC-36 API-direct) but the switch was `disabled={isLocal}` — web users could toggle a dead flag. D-01 `app/(tabs)/settings.tsx:1136` → `disabled={isLocal || Platform.OS === "web"}`; D-02 `utils/settingsAccountMode.test.ts` extended. Native Cloud-OFF untouched. Zero behavior change on web. Open: user-run jest/lint + ACC-S01..S03 matrix. See `docs/savepoint.md`.
- **2026-10-04 — SPEC-30 v2.4 (web exception).** `specs/30-force-reauth-on-cold-start.md` amended: web refresh no longer logs out — session persists on localStorage. D-01 `app/_layout.tsx:78-81` — `ColdStartSessionGuard`'s effect returns on web before the latch and `logout()`. v2.2 put that check as a component-level `return null` above the hooks; lint reported 4 `react-hooks/rules-of-hooks` errors, so v2.4 moved it inside the effect (same behavior, hooks unconditional again). D-02 `utils/webPin.test.ts` ACC-W-05 asserts that ordering + no early return above hooks. v2.3: ACC-11 made count-agnostic (98/98 invalidated by SPEC-37/38/39); SPEC-27/SPEC-28 pins annotated, SPEC-31's DRAFT pins deferred. Native force-reauth unchanged; 401 handler catches dead tokens. Open: user-run jest/lint + ACC-12..ACC-17 matrix. See `docs/savepoint.md`.
- **2026-10-05 — Spec 40 FINAL + implemented.** `specs/40-authfetch-envelope-unwrap.md`: server nests its payload one level deeper than `authFetch` unwrapped, so every consumer's `Array.isArray(data)` guard failed *silently* (`ok` was true) — 8 sites read empty, and `UserProfileContext` reset to `DEFAULT_PROFILE` (`isFirstRun: true`), replaying `/intro` → `/onboarding` on every web refresh. D-01 `utils/apiClient.ts` — exported `RESPONSE_WRAPPER_KEYS` + `unwrapEnvelope`, keyed on known names never key count (`{url}` from `storage/upload` must survive); unknown key passes through so a future endpoint fails loudly. Also widened `body` to `unknown` + local narrow (TS2322 surfaced by ts-jest; `Record<string, unknown>` was a false assertion). All 8 consumers + the 401 path byte-identical. D-02 `utils/apiClient.test.ts` ACC-01..05. No backend/storage-key/dep/native change. Verified: `npx jest` 361/361, 12 suites. Open: lint/tsc + ACC-S01..S04. Deferred → `docs/todo-specs.md` (T-01 GO_BACK, T-02 txRepo pre-writes, T-03 stale 98/98, T-04 rotate pasted JWT). See `docs/savepoint.md`.
- **2026-10-05 — Spec 42 FINAL (user call; DEC-01/DEC-02 deferred).** `specs/42-go-back-after-web-refresh.md`: 19 unguarded `router.back()` sites across 14 sub-screens emit unhandled `GO_BACK` on empty history (web F5-then-Back; dev-only warning, no prod breakage). Canonical home for `rlucban/wise_wallet#44` + `docs/todo-specs.md` T-01. Persistence accepted on static evidence (zero `canGoBack` in `app/`); dynamic ACC-S00 waived by user. Implementation BLOCKED until user calls DEC-01 (helper vs inline) and DEC-02 (`/` vs `/(tabs)` fallback). No code written. See `docs/savepoint.md`.
- **2026-10-05 — Spec 42 implemented (D-01..D-03).** User `code this for me` + `do all` = DEC-01 (a) helper, DEC-02 `/` (precedent `_layout.tsx:202`). New `utils/backNavigation.ts` (pure, no native imports) + `utils/backNavigation.test.ts` (ACC-01 repo-wide zero-`router.back()` scan; ACC-02/03/03b branch tests; android/ios/web). 14 files / 19 sites migrated, nothing else touched. Verified user-run: lint clean, jest 13 suites / 390 passed / 0 failed, tsc clean. Open: ACC-S01..S03 manual matrix. See `docs/savepoint.md`.
- **2026-10-05 — Spec 43 FINAL (implemented, verification pending).** `specs/43-onboarding-opening-balance-once-only.md`: D-01 applied (guard + marker export); D-02 applied (`utils/onboardingGuard.test.ts`, 10 tests); diagnostic slices 3–4 (`apiClient` message fallback + 4 tests; slice-3 user-run passed). Open: ACC-S01..S04 matrix + mobile 400 line (machine side verified: jest 14/404, lint + tsc clean). Pipeline blocked after slice 4 (PUT field, POST shape, heal/filter). See `docs/savepoint.md`.
- **2026-10-06 — Spec 35 FINAL v1.0 + implemented (D-01..D-04).** `specs/35-pin-change-persistence-and-promotion-safety.md`: Settings Change Passcode wrote in-memory state only — new PIN worked this session while `master_users` hash + server bcrypt still expected the old PIN (user-confirmed repro). D-01 `context/PasscodeContext.tsx` hashed per-user persist (`user_{id}_passcode` via `getPrefixedKey`, SHA256, never plaintext) + hydrate-before-gate (tree held until first attempt) + clear on sign-out + `verifyPasscode` helper; `app/passcode-screen.tsx` 5-line read-half wiring (without it D-01 alone would ship permanent-lockout — documented scope stretch, write path stays D-03). D-02 `utils/db.ts` additive `updateUserPasscode` (same SHA256 as `addUser`, no-op when row absent, zero callers by design). D-03 `app/(tabs)/settings.tsx` dialog only: Cloud online-gated `authFetch("auth/change-passcode")` + mirror re-hash + `login(id, freshToken)` (SPEC-API-02 joint, changer stays in) with exact 401/429/CON-09 copies, Local fully offline, single-source `isPasscodeEnabled` branching, Step-2 disable parity (late-caught: `replaceAll` hit one of two save buttons, test caught it, fixed). D-04 `utils/pinChange.test.ts` (21 tests, ACC-01..06 android/ios/web). Verified user-run: lint clean, jest 15 suites / 425 passed / 0 failed, tsc clean. D-05 device matrix PASSED per user 2026-10-06. SPEC-API-03 (8h fixed JWT) + `passcodeUpdatedAt` grace-gap closure DECLINED per user call 2026-10-06. See `docs/savepoint.md`.
- **2026-10-06 — Spec 44 FINAL v1.0 + implemented (D-01..D-04).** `specs/44-401-warning-dedupe.md`: the "flashing" after a remote session-kill was Expo's LogBox yellow box re-popped by `console.warn('401 Unauthorized - clearing auth credentials')` firing on EVERY rejected 401 while a stale session kept issuing protected calls — not a page-render bug. D-01 `utils/apiClient.ts` latches the warn per invalidation episode (side effects — credential clear + `onAuthFailure('session_ended')` — unchanged per call); D-02 `context/AuthContext.tsx` resets the latch on login/logout; D-03 `utils/apiClient.test.ts` ACC-01..03 × android/ios/web (mock-accumulator false positive fixed via block-level `mockClear`). Verified: lint clean, jest 15/434, tsc silent. Amended v1.1 per user call: warn shown only when `EXPO_PUBLIC_ADMIN_TOGGLE === "true"` (CON-06/ACC-04); silent otherwise; committed `3cb7e6e`.
- **2026-10-06 — Spec 45 implemented (D-01..D-05).** `specs/45-api-source-of-truth.md`: Online-mobile transactions API-first (fetch GET-replace + mirror, writes API-then-repull, offline hard-error no-op); balance sums onto note/category-id marker (4 sites, zero title-filters left); `Local backup` reframe in settings + mirror populate/clear; Repair-duplicates runbook (NOT YET RUN — Export-first); 15 new guard tests. 10 slices via plan-fix run `20261006-session.md`. Verified user-run lint/jest/tsc green per slice. Open: ACC-S01..S04 matrix + Repair run. Dues/savings/categories/profile deferred as referencing follow-ups. See `docs/savepoint.md`.
- **2026-10-06 — Spec 46 FINAL v1.0 + implemented (D-01..D-05).** `specs/46-transaction-category-persistence.md`: online transactions always displayed 'Others' — client POSTed nested `category`, which wallet-api drops (`categoryId: null`, HAR-proven); SPEC-45 replace-on-fetch then fallback-stamped every row. D-01 `context/TransactionsContext.tsx` online POST/PUT carry flat `categoryId` (PUT conditional on partial updates); D-02 read rehydrates via new pure `utils/transactionCategory.ts` (echo-wins → id-lookup → Others; mirror verbatim); D-03 `utils/transactionCategory.test.ts` (30 tests, ACC-01..04 × android/ios/web); D-05 `scripts/verify-category-roundtrip.mjs` probe (one-time authorized run: login ok, b16 round-tripped, nested absent, row deleted, zero residue). 6 slices + 1 lint-driven repair (misplaced hunk caught by exhaustive-deps, read-back verified) via plan-fix run `20261006-add-transaction-category.md`. Verified user-run: lint clean, jest 17/482, tsc silent. Open: ACC-S01..S04 device matrix. Adjacent rot noted: edit-transaction `"8"/"9"` fallback IDs (own spec). See `docs/savepoint.md`.
- **2026-10-06 — Spec 46 v1.1 FINAL + implemented (web read).** Re-opened per user call (both surfaces wrong; v1.0 left web read byte-identical): web fetch rehydrates via CategoriesContext state (ancestry verified, no cycle; catRepo not used per SPEC-36). Slice A `context/TransactionsContext.tsx` 4 hunks (read-back verified); Slice B +9 tests (ACC-07a/b/c, 30 → 39). Verified user-run: lint/jest/tsc green. Open: ACC-S05 web matrix + native re-confirmation (new rows only). See `docs/savepoint.md`.
- **2026-10-06 — Spec 47 FINAL v1.0 + implemented (D-01..D-04).** `specs/47-due-payment-method-picker.md`: paying a due POSTed `paymentMethod: ""` → server 400 behind a generic connection copy (HAR-proven ×2). D-01 `app/dues.tsx` picker dialog (API list + hardcoded Cash/"Unknown" fallback) with pass-through + surfaced-message dialog; D-02 throw prefers server message on HTTP !ok (transport frozen); D-03 `utils/duePayment.test.ts` (27 guards + 18 REG, ACC-01..05 × android/ios/web; guards-only deviation disclosed). 4 slices + 1 investigated repair via plan-fix run `20261006-due-payment-400.md`. Verified user-run: lint clean, jest 45/45, tsc silent. Open: ACC-S01..S05 pay matrix. Adjacent: PUT-400, edit-screen rot (own specs). See `docs/savepoint.md`.
- **2026-10-06 — Spec 48 FINAL v1.0 + implemented (D-01/D-02/D-04/D-05; D-03 HAR-parked).** `specs/48-paid-due-visibility.md`: paid dues reappeared in Upcoming after navigation (stale next-date anchor + unproven completed persistence + unguarded taps). D-01 anchor on max(today, scheduled) + busy-guarded Pay/Confirm; D-02 Auto-renew copy (switches, AUTO-RENEW badge, help); D-04 `utils/dueVisibility.test.ts` (21 tests × android/ios/web); D-03 `useDues` parked on user HAR gate. 4 slices + 1 lint repair via plan-fix run `20261006-paid-due-reappears.md`. Verified user-run: lint clean, jest 19/557, tsc silent. Open: ACC-S01..S04 matrix + HAR verdict. See `docs/savepoint.md`.

- **2026-10-06 — Spec 50 FINAL + implemented.** `specs/50-dashboard-highlights-and-recent.md`: Highlights no longer flicker; Recent shows 5 latest-updated. D-01 `hooks/useInsights.ts` memoized on txKey; D-02 `components/SmartInsights.tsx` last-good + no null-flash + latest-1 cap; D-03 `utils/selectRecentTransactions.ts` + wiring in `app/(tabs)/index.tsx`; D-04 tests; D-05 journal. See `docs/savepoint.md`.

- **2026-10-06 — Spec 49 FINAL + implemented (Option A).** `specs/49-scheduled-tx-link-persistence.md`: deletion lock for due-generated transactions persisted via client-side `user_{id}_due_tx_links` map. D-01 `context/TransactionsContext.tsx`: attach links on web/native/local reads, record on POST success, prune on delete. D-02 new `utils/dueTxLinks.ts`: record/prune/attach with echo-wins. D-03 `utils/dueTxLinks.test.ts`. D-04 docs. Server-side persist parked.

- **2026-10-07 — Spec 53 FINAL + implemented.** `specs/53-auth-button-label-contrast.md`: white labels on indigo auth buttons. D-01 `app/login.tsx` + D-02 `app/register.tsx` shared `containedLabel: #fff` on primaries, dialog contained/OK, active-only mode buttons; outlined/text buttons untouched. D-03 `utils/authButtonLabels.test.ts` (ACC-01 × android/ios/web; 1 count repair, screens were correct). D-04 docs. Verified user-run lint/jest/tsc green. Open: ACC-S01..S03 visual matrix. See `docs/savepoint.md`.

- **2026-10-07 — Spec 51 FINAL + implemented.** `specs/51-pin-gate-verification-parity.md`: Clear/Backup PIN gates converged on server → `verifyLocalPin` (hash-or-plaintext, Delete parity). D-51-01/02/03 `app/(tabs)/settings.tsx` (offline fail-closed, PIN preserved for migrate, corrected copy; Change-PIN byte-identical); D-51-04 `utils/pinGate.ts`; D-51-05 tests ACC-01..05 (1 ESM-mock repair). Verified user-run lint/jest/tsc green. Open: device matrix. See `docs/savepoint.md`.

- **2026-10-07 — Spec 52 FINAL + implemented.** `specs/52-floating-tab-bar.md`: in-flow floating pill via `tabBarStyle` only (16/12/24, platform shadow, web flat); SPEC-32 metrics/labels intact (CON-06 amended in 3 named values). D-52-01 `_layout.tsx`; D-52-02 `utils/tabBarFloat.test.ts`. Open: lint/jest/tsc + ACC-S01..S04. See `docs/savepoint.md`.

- **2026-10-07 — Spec 52 v1.1 FINAL + implemented.** `specs/52-floating-tab-bar.md` v1.1: deeper shadow (iOS 0.25/16/h6, Android 8, web flat), dark pill `surfaceContainerHigh` tonal lift, `borderRadius: height / 2` capsule, eased press (0.85/120ms in, 1/180ms out, JS driver to dodge the SPEC-06 web WARN class). D-52-11 `_layout.tsx` (inline `AnimatedTabButton`, a11y/testID pass-through, `ThemeContext.tsx` untouched); D-52-12 tests ACC-11..13 × android/ios/web; D-52-13 docs. Open: lint/jest/tsc + ACC-S11..S14. See `docs/savepoint.md`.

- **2026-10-07 — Spec 54 FINAL + implemented.** `specs/54-tab-bar-soft-edge-and-float.md`: zero-dep "blurred edge" veil (rejected `expo-blur`, §1.12) + float higher. D-54-01 `_layout.tsx`: `TabBarVeil` via `tabBarBackground` (`LinearGradient` transparent→surface + `blur`/`blur-off` glyphs at 0.18, `pointerEvents="none"`, pill-clipped), `marginBottom` 12→20; deviation disclosed — library renders `tabBarBackground` in `absoluteFill`, so the veil sits inside the pill face (an outside bleed would be Android-clipped, platform-only per §1.10). D-54-02 `utils/tabBarVeil.test.ts` ACC-01..03 × android/ios/web; D-54-04 docs. Open: lint/jest/tsc + ACC-S01..S04. See `docs/savepoint.md`.

- **2026-10-07 — Spec 55 FINAL + implemented.** `specs/55-remove-veil-raise-enlarge-tab-bar.md`: veil deleted, pill 68→78, float 20→32. D-55-01 `_layout.tsx` (veil/background/imports removed); D-55-02 `TAB_BAR_CONTENT_HEIGHT` 78 (SPEC-32 amended, one value); D-55-03 test literals + boundary re-pinned 2.0→3.0, veil test deleted (guards folded into float suite). Open: lint/jest/tsc + ACC-S01..S03. See `docs/savepoint.md`.

- **2026-10-07 — Spec 56 FINAL + implemented.** `specs/56-overlay-tab-bar-and-clearance.md`: absolute overlay kills the white rectangle (in-flow margins showed the un-themed root bg; content can now scroll behind the pill). D-56-01 one key `position: "absolute"` (reverses SPEC-52 CON-52-03, declared); D-56-02 `paddingBottom: 160` on all five tab tails + Home FAB `bottom: 160` (static worst-case 112+32+16; dues/savings untouched). D-56-03 guards × android/ios/web. Open: lint/jest/tsc + ACC-S01..S03. See `docs/savepoint.md`.

- **2026-10-07 — Spec 58 FINAL + implemented.** `specs/58-web-lock-store-and-dialog-order.md`: web app-lock store + Settings dialog paint order. D-58-01 `utils/secureStorage.ts` explicit web branch (empty-module SecureStore probe was throwing → accidental AsyncStorage fallback; `verifyPasscode` false-when-empty rejected every PIN after web refresh); D-58-02 `utils/secureStoreWeb.test.ts` round-trip guard; D-58-03 settings.tsx messageDialog → last Portal child; D-58-04 paint-order guard. SPEC-36 CON-W-03 amended with second exception (`user_{id}_passcode` lock hash MAY persist on web; unlock gate only, real auth = API JWT). Open: lint/jest/tsc + ACC-S01..S03. See `docs/savepoint.md`.

- **2026-10-07 — Spec 59 FINAL + implemented.** `specs/59-clear-gate-token-consume-and-login-identity.md`: Clear/Delete gates consume the fresh token on verify success (leg-1 rotates server sid, discarded token guaranteed post-gate 401); all three gates send persisted `authName` login identity instead of display name (web leg-2 unseeded by SPEC-36, so any leg-1 failure rejected). D-59-02/03 settings.tsx consume; D-59-04 identity persistence (login/register/Make-Online) + gates; D-59-05 `utils/clearGateWeb.test.ts` guards × android/ios/web. No wallet-api change; Change + Sync-success byte-identical. Open: lint/jest/tsc + ACC-S01/S02. See `docs/savepoint.md`.

- **2026-10-07 — Spec 60 FINAL + implemented.** `specs/60-dues-savings-aware-highlights.md`: dues/savings-aware insights memo + dues pull-to-refresh. D-60-02 `useInsights.ts` fingerprints join memo gate (SPEC-50 D-01 amended, last-good/no-flash/latest-1 kept); D-60-04 `dues.tsx` pull-to-refresh (focus wiring verified, FlashList, no new dep); SmartInsights + useDues untouched; D-60-05 `utils/insightsDuesSavings.test.ts` × android/ios/web. No wallet-api change. Open: lint/jest/tsc + ACC-S01/S02 (incl. no-flicker re-proof). See `docs/savepoint.md`.

- **2026-10-07 — Spec 61 FINAL + implemented.** `specs/61-loading-skeletons.md`: shimmer on every fetch-driven surface. D-61-02 `SkeletonLoader.tsx` shared blocks (composed of pulse, driver guard kept, one animation); D-61-03 five first-load-empty branches (dues/completed rows; savings/archived card+rows; reports card+chart+rows; empty states kept, refetch untouched). D-61-04 `utils/loadingSkeletons.test.ts` × android/ios/web. No fetch/deps/API change; dashboard byte-identical. Open: lint/jest/tsc + ACC-S01/S02 visual matrix. See `docs/savepoint.md`.

- **2026-10-07 — Spec 62 FINAL + implemented.** `specs/62-get-memoization.md`: 60s TTL read-through cache in `authFetch` (heavy collections only, manual-only bypass per same-day amendment). D-62-02 apiClient layer (endpoint keys, ok-only, lazy expiry, cap-50, invalidate-on-mutation, wipe on 401); AuthContext login/logout wipe; `fetchDues` skip threading + dues pull bypass; `utils/getCache.test.ts` × android/ios/web. 401/unwrap identical; no server/deps/storage change. Open: lint/jest/tsc + ACC-S01/S02. See `docs/savepoint.md`.

- **2026-10-07 — Spec 63 FINAL + implemented.** `specs/63-ui-batch-settings-reports-literacy-dashboard-scheduled-dark-mode.md`: D-01 category sort control + helper/tests; D-02 Reports invalid icon fixed; D-03/D-04 App Guide literacy article/filter; D-05 circle add FAB beside pill; D-06 pay loading + completed-dues refresh/total; D-07 dark surface alignment. Open: lint/jest/tsc + ACC-S01..S07 manual matrix. Follow-up 3: shared `+` has an 8px x-gap from the tab pill. Follow-up 4: tab buttons horizontally padded by 8px. See `docs/savepoint.md`.

- **2026-10-08 — Transaction-delete 204 false negative fixed.** Web HAR showed HTTP 204 success; `authFetch` now treats empty-body 204 as success and `deleteTransaction` surfaces real server errors. Regression test added. Verified lint/Jest/tsc clean. See `docs/savepoint.md`.
- **2026-10-08 — Notifications initial-load skeleton + iOS-style rows.** Initial load shows skeleton rows; pull-to-refresh wired; theme-backed grouped surfaces/pill badges/CTA. Verified lint/Jest/tsc clean. See `docs/savepoint.md`.
- **2026-10-08 — Add-transaction saving indicator.** `app/add-transaction.tsx` shows a non-dismissable “Saving transaction…” dialog while saving; Save/back are disabled until it finishes. Verified lint/tsc clean. See `docs/savepoint.md`.
- **2026-10-08 — Spec 64 FINAL + implemented (verification pending).** `specs/64-stop-learning-voice-on-navigation-away.md`: both Learning screens stop speech and reset the playing state on Expo Router focus loss; `utils/learningSpeechLifecycle.test.ts` adds Android/iOS/Web regression guards. Editor diagnostics clean. User-run Jest/lint/tsc + Expo Go/web-export matrix pending per §1.3. See `docs/savepoint.md`.
- **2026-10-08 — Spec 65 FINAL + implemented (vertical issue still open).** `specs/65-dialog-width-overflow-and-centering-diagnosis.md`: user-reported "dialogs are not centered on iPhone" split into two findings. **A (fixed):** Paper adds `marginHorizontal: Math.max(left, right, 26)` to the same Surface SPEC-26 styles target (`Dialog.tsx:121`), so `width:"90%"` overflowed a 390pt box by 13pt and clipped both edges — D-01 `app/(tabs)/settings.tsx` `styles.dialog` + D-02 `components/ConfirmDialog.tsx` now add `marginHorizontal: 0` (merge-order override; `maxWidth: 480`/`width: "90%"`/`alignSelf: "center"` untouched, SPEC-26 CON-01 amended, §1.14); the 8 non-percent-width Paper dialogs were reviewed and deliberately left byte-identical (§1.11), `CalculatorDialog.tsx` out of scope. **B (OPEN, no speculative fix):** dialogs still render in the lower part of an iPhone screen; Paper's wrapper is `absoluteFill` + `justifyContent:'center'` (`Modal.tsx:237-241`) so no root cause is established and no `contentContainerStyle`/inset/`Platform` branch was added (CON-03). Blocked on CON-04 evidence: uncropped full-screen iOS screenshot showing the tab bar, web (`npm run web`) repro result, iPhone model + Expo Go version. D-03 `utils/dialogSurfaceWidth.test.ts` ACC-01..03 × android/ios/web (percent-width+margin guard, repo-wide `<Dialog>`/`<Modal>` scan, overflow arithmetic); D-04/D-05 docs. Editor diagnostics clean; user-run jest/lint/tsc + ACC-S01..S03 pending per §1.3. See `docs/savepoint.md`.
- **2026-10-08 — Spec 60 FINAL + implemented.** `specs/60-instant-display-in-memory-caching.md`: D-01 `hooks/useSavings.ts` module-level `_savingsCache` — seeds state instantly on re-mount, written at all three fetch paths (web/native-local/native-merged), cleared on logout; D-02 `hooks/useDues.ts` same pattern with `_duesCache`; D-03 `app/(tabs)/index.tsx` `DashboardSkeleton` gate relaxed from `profileLoading || (loading && transactions.length === 0)` to `!profile && profileLoading` (no skeleton flash on focus refetches); D-04 `savings.tsx`/`archived-allocations.tsx` EmptyState guards already correct, no change. Editor diagnostics clean; user-run jest/lint/tsc + Expo Go/web-export pending per §1.3. See `docs/savepoint.md`.
- **2026-10-08 — Reports selected-range captions.** `app/(tabs)/reports.tsx` shows `For selected period: <range>` on summary, trend, donut, breakdown, and export sections. Verified lint/Jest/tsc clean. See `docs/savepoint.md`.


- **2026-10-08 — Spec 69 FINAL + implemented.** `specs/69-custom-floating-tab-bar.md`: D-01..D-04 `paddingBottom: 110` on all four tab screens; D-05 new `components/FloatingTabBar.tsx` (pill `paddingHorizontal:10/paddingVertical:8/gap:4`, active tab `#E8DEF8` pill `borderRadius:20/paddingHorizontal:4/paddingVertical:8`, FAB docked beside the pill in a `row`/`alignItems:center`/`gap:12` wrapper); D-06 `_layout.tsx` delegates via `tabBar={(props) => <FloatingTabBar ...` and drops `tabBarStyle`/`tabBarButton`/absolute FAB; D-07 `utils/tabBarFloat.test.ts` rewritten + `tabBarMetrics.test.ts` ACC-05 repointed. Old `_layout` tabBarMetrics pins (SPEC-32/52/55/56/68) superseded. See `docs/savepoint.md`.

- **2026-10-10 — Spec 70 FINAL v1.0 (not yet implemented).** `specs/70-pdf-auto-download-to-default-directory.md`: PDF/CSV silent-first delivery, SPEC-34 format frozen. Web blob+anchor download; native `documentDirectory` silent-save with share/print fallback-only; no new deps; awaited errors. D-01..D-06 pending user go-ahead per §1.2. See `docs/savepoint.md`.

- **2026-10-10 — Spec 70 v1.1 + implemented (D-01..D-06, verification pending).** Plan-fix run `20261010-1200-spec70-pdf-auto-download.md`: v1.1 amendment (web blob+anchor withdrawn — no dep-free way to mint real PDF bytes, so iframe print-to-PDF retained; native success dialog with filename + user-invoked Share; return-widening) + implementation. Native PDF/CSV silent-save to `documentDirectory` (share/print fallback-only; total failure → dialog), web PDF path byte-identical, `reports.tsx` CSV awaited + success dialogs, new `utils/exportDownload.test.ts` (ACC-01..05 × android/ios/web). No deps/routes/storage change; SPEC-34 frozen. Open: user-run jest/lint/tsc + ACC-S01..S03. See `docs/savepoint.md`.

- **2026-10-10 — Spec 71 FINAL v1.0 + implemented.** `specs/71-financial-literacy-app-guide-redo.md` on branch `fix/pdf-multiplatform-download`: redo of SPEC-63's Financial Literacy App Guide (supersedes D-03/D-04 in this branch only). Single existing article expanded into an 11-section docked outline (`utils/learningGuideContent.ts`, structure first, rich prose = deferred D-02); list order/chips/UI byte-identical; full TTS + bookmark parity; `Platform.OS`-parameterized jest guard (`learningGuideContent.test.ts`) + Expo Go/web-export matrix. Open: user-run jest/lint/tsc + ACC-S01..S03 manual. See `docs/savepoint.md`.

- **2026-10-10 — Spec 72 FINAL v1.0 + implemented (verification pending).** `specs/72-app-guide-audience-tag-removed.md`: the WiseWallet App Guide card no longer shows a Students/Workers audience badge and appears only under `All` + `App Guide` (it was wrongly tagged `audience: "Students"`). `learningData.ts` `audience` now optional + tag dropped from `wisewallet_app_guide` only; `learning.tsx` byte-identical (badge/filters degrade safely); existing 6 articles unchanged; SPEC-71   body/intact; new SPEC-72 ACC-01..03 guards × android/ios/web. Open: user-run jest/lint/tsc + ACC-05 visual. See `docs/savepoint.md`.

- **2026-10-10 — Spec 73 FINAL + implemented (verification pending).** `specs/73-fix-allocation-archive-persistence.md`: archived allocations "bounced back" because `savingsItems` had no `isArchived`/`target_amount`/`updatedAt` columns, archive PUTs sent a partial body the server dropped, syncProcessor silently dequeued 400/404, the web refetch replaced the state verbatim, and `updateItem` swallowed errors. D-01 `supabase/schema.sql`: 3 additive columns + live-DB migration runbook with rollback; D-02 `hooks/useSavings.ts`: full-record sync payloads (web PUT + native queue), `updateItem` rethrows, web + native field-union merge guards via new `itemsRef` (no fetch dep loop); D-03 `utils/syncProcessor.ts`: `savingsItems` 400/404 surface + retry, other entities unchanged; D-04 `utils/savingsArchive.test.ts` G5 inverted/G6 rewritten + G7–G9 (native merge union, web `setItems(guarded)`); D-05 screens byte-identical (handlers were already try/catch'd). Backend `D-B-01..03` (migration + PUT/GET pass-through) user-implemented in external `rlucban/wallet-api`, deployed before the client. Open: user-run jest/lint/tsc + backend deploy + ACC-07..10 matrix. See `docs/savepoint.md`.

- **2026-10-10 — Spec 74 FINAL + implemented (verification pending).** `specs/74-savings-cache-write-through.md`: saved changes "didn't show immediately" because `_savingsCache` (SPEC-60/66) is written only by `fetchItems`; `addItem`/`updateItem`/`deleteItem` updated React state but never the module cache, so the next mount (e.g. Archived screen after archiving) seeded stale state and relied on the focus refetch — on web only a reload (cache wipe) showed the truth. D-74-01 `hooks/useSavings.ts`: write-through at all six mutation sites (`itemsRef` recompute + `_savingsCache` replace, `activeUserId`-guarded); lifecycle/seed/refetch/SPEC-73 guards byte-identical. D-74-02 `utils/savingsArchive.test.ts` `G10` guard (6 cache-write lines + 2 concat/2 map/2 filter) × android/ios/web. Adjacent rot noted: same gap in `useDues` (own spec). Open: user-run jest/lint/tsc + ACC-04/05 visual. See `docs/savepoint.md`.

- **2026-10-10 — Spec 75 FINAL + implemented (verification pending).** `specs/75-savings-instances-react-to-cache-writes.md`: SPEC-74 write-through still didn't reach already-mounted instances — the Active list on the Savings screen (and the Dashboard summary) stayed stale until reload/refetch. D-75-01 `hooks/useSavings.ts`: module notifier (`_savingsCacheListeners` Set + `notifySavingsCacheChanged()`), an `activeUserId`-guarded per-instance subscription effect re-seeding `items`/`itemsRef` from `_savingsCache` on notify with unmount cleanup, and the notify emitted as the final line of all six SPEC-74 write-through blocks; fetch/seed/focus-refetch/SPEC-73 guards byte-identical. D-75-02 `utils/savingsArchive.test.ts` `G11` (ACC-01/02) × android/ios/web. D-75-03 journals. Open: user-run jest/lint/tsc + ACC-04..06 matrix (restore/add/archive reflect immediately across Savings + Dashboard). See `docs/savepoint.md`.

- **2026-10-10 — Spec 76 FINAL v1.1 + implemented (verification pending).** `specs/76-allocation-mutation-success-validation.md`: allocation delete/archive/restore gave untrustworthy feedback — active delete had no success message, and `deleteItem` swallowed failures so the Archived screen showed a false success. D-76-01 `hooks/useSavings.ts`: `deleteItem` catch now logs + `throw error` (mirrors `updateItem`); async queued sync rejections stay unsurfaced. v1.1 (user call — "change the validation appearance instead of a snackbar"): validation now uses a **modal dialog**, not a Snackbar, for all four operations. D-76-04 `components/ConfirmDialog.tsx`: additive `hideCancel?` (default `false`) + `confirmColor?` (default `theme.colors.error`); SPEC-26/65 `<Dialog>` style byte-identical, existing callers unchanged. D-76-02 `app/savings.tsx`: `feedback` state + single-action feedback `ConfirmDialog` for active delete + archive (Success/Error; Snackbar kept for unrelated messages). D-76-03 `app/archived-allocations.tsx`: feedback dialog for delete + restore; `<Snackbar>`/`toastMessage`/import removed. D-76-04 `utils/savingsArchive.test.ts` `G12`–`G16` × android/ios/web. D-76-05 journals. Open: user-run jest/lint/tsc + ACC-S01..S04 matrix (web failed-delete Error dialog; native Success dialog; outside/OK dismisses; no red-box). See `docs/savepoint.md`.

- **2026-10-10 — Spec 77 FINAL v1.0 + implemented (verification pending).** `specs/77-savings-delete-archive-cross-device-sync.md`: native savings delete/archive didn't propagate because the local-first LWW merge re-created local-only items (`hooks/useSavings.ts:133-137`, no deletion marker anywhere) and the archive sync payload kept the pre-archive `updatedAt`. Option A (user): client-side deletion **tombstones** (`user_{id}_savings_tombstones`) + a **seen-remote snapshot** (`user_{id}_savings_seen_remote_ids`) so a row once on the server and now absent is pruned, not re-uploaded; `updateItem` stamps `updatedAt: nowTimestamp()` so archives win LWW. No backend change (SPEC-73 migration user-confirmed deployed). Web/Local untouched. D-77-01 `utils/savingsDeletionMarkers.ts` (per-user tombstones + seen-remote snapshot); D-77-02 `hooks/useSavings.ts` (native delete tombstone; merge prunes seen-remote-absent items + skips/re-enqueues tombstoned rows + keeps never-synced creates; `setSeenRemoteIds`/`clearDeleted`; `updateItem` stamps `updatedAt: nowTimestamp()`); D-77-03 `utils/savingsDeletionMarkers.test.ts`; D-77-04 `utils/savingsArchive.test.ts` (G6 updated + G17..G22); D-77-05 journals. Open: user-run jest/lint/tsc + ACC-S01..S04 two-device matrix. See `docs/savepoint.md`.

- **2026-10-10 — Spec 78 FINAL v1.0 + implemented (verification pending).** `specs/78-add-allocation-goal-below-initial.md`: Add Allocation accepted a Goal Amount lower than the Initial Balance (already-complete allocation). User decisions: strictly `<` (equal allowed), blocks submit, copy `Goal amount is too low.`, Add-Allocation-only scope. D-01 new `utils/allocationGoal.ts` `isGoalBelowInitial(goalAmount, initialBalance)` (empty ⇒ false; `parseFloat` of digit/dot-stripped `|| 0`; strict `<`); D-02 `app/add-allocation.tsx` derives `goalBelowInitial` and folds it into `isGoalInvalid`/`isFormInvalid`; D-03 conditional red `<Text>` below the Goal Amount input (`theme.colors.error`); D-04 `utils/allocationGoal.test.ts` (ACC-01..05 × android/ios/web + wiring guards); D-05/D-06 journals + manual checklist. No dependency/storage/API/route change; available-balance formula (SPEC-12 CON-04) and edit modal untouched. Open: user-run jest/lint/tsc + ACC-06 matrix. See `docs/savepoint.md`.

- **2026-10-11 — Spec 79 FINAL v1.0 + implemented (verification pending).** `specs/79-onboarding-skip-to-dashboard.md`: onboarding required a name, so users could not reach the dashboard without one. User decisions: skip discards both fields (`completeSetup("", 0)`, no Opening Balance transaction), permanent `isFirstRun = false`, confirm dialog first ("Skip setup?"), onboarding-only (Intro untouched), Android/iOS/Web, keep "Wise User" blank-name fallback, same persistence/error path as Get Started. D-01 `app/onboarding.tsx` (text "Skip" button under Get Started + `handleSkip` sharing `busyRef`/`loading`/`setupError` + reused `ConfirmDialog`); D-02 `utils/onboardingSkip.test.ts` (ACC-01..07 × android/ios/web); D-03/D-04 journals + manual checklist. No storage/API/route/dep change. Open: user-run jest/lint/tsc + ACC-S01..S05 matrix. See `docs/savepoint.md`.

- **2026-10-11 — Spec 80 FINAL v1.0 + implemented (verification pending).** `specs/80-settings-rename-display-name.md`: Settings had no way to change the display name. User decisions: display name only (login identity untouched), Cloud-only visibility, reuse `updateProfile` (web surfaces errors, native best-effort, no queue), pencil `IconButton` + inline dialog with `showMessage` feedback. D-01 `app/(tabs)/settings.tsx` (pencil gated `!isLocal`; `Dialog` with prefilled `TextInput` max 50 + Cancel/Save; `handleSaveRename` trims/guards empty/`await updateProfile({ name })` in try/catch + message); D-02 `utils/profileRename.test.ts` (ACC-01..06 × android/ios/web); D-03/D-04 journals + manual checklist. No context/storage/API/route/dep change; message dialog stays last Portal child. Open: user-run jest/lint/tsc + ACC-S01..S05 matrix. See `docs/savepoint.md`.

---

## 4. Spec: Connection Status vs Offline (Local-Only) Account Mode

**Status: FINAL (2026-09-21 per user call) — normative text lives in
`specs/04-connection-status-vs-offline-mode.md`; implement exactly that. No
Cloud→Local downgrade.**

> Specs moved out of `AGENTS.md` on 2026-09-21 per user request. This section
> is a pointer only — see `specs/04-connection-status-vs-offline-mode.md`
> (Context, Constraints, Goal, Deliverables).
