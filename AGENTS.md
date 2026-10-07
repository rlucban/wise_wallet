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
- **2026-10-06 — Spec 51 FINAL v1.0 + implemented (D-01).** `specs/51-category-settings-alphabetical-sorting.md`: Manage Categories A-Z / Z-A toggle. D-01 `app/category-settings.tsx` only — `sortOrder` state (`"asc"` default) + `toggleSortOrder` + `sortedCategories` via `localeCompare` (`sensitivity: "base"`, non-destructive copy) + `<Appbar.Action>` (`sort-alphabetical-ascending` / `sort-alphabetical-descending`) + `ScrollView` maps `sortedCategories`. No `accessibilityLabel` per user call (spec-only). No storage/API/route/dep change. Open: user-run lint/jest/tsc + ACC-01..05 matrix. See `docs/savepoint.md`.
- **2026-10-06 — Spec 52 FINAL v1.0 + implemented (D-01..D-03).** `specs/52-reports-yearly-icon-validity.md`: Reports Yearly menu icon `calendar-year` (invalid) → `calendar-outline` (valid MCI). D-01 `app/(tabs)/reports.tsx:230` one line only; D-02 `utils/reportsPeriodIcon.test.ts` (ACC-01..03 × android/ios/web); D-03 journal. No storage/API/route/dep change. Open: user-run lint/jest/tsc + ACC-S01..S03 matrix. See `docs/savepoint.md`.
- **2026-10-06 — Spec 54 FINAL v1.0 + implemented (D-01..D-05).** `specs/54-learning-app-guide-sections.md`: Learning split into `WiseWallet App Guide` + `Recommended Reading`. D-01 `utils/learningData.ts` (`App Guide` topic + 3 rows); D-02 `app/(tabs)/learning.tsx` (split filters, two sections, per-section counts); D-03 `app/(tabs)/learning-detail.tsx` (3 guide bodies); D-04 `utils/learningSections.test.ts` (ACC-01..04 × android/ios/web). No storage/API/route/dep change. Open: user-run lint/jest/tsc + ACC-S01..S03 matrix. See `docs/savepoint.md`.
- **2026-10-06 — Spec 55 FINAL v1.0 + implemented (D-01..D-03).** `specs/55-hide-app-guide-audience-chip.md`: App Guide cards show `App Guide` tag only (no Students/Workers chip). D-01 `app/(tabs)/learning.tsx` 2-line gate (`item.topic !== "App Guide"`); D-02 `utils/learningSections.test.ts` extended (SPEC-55 ACC-01..03 × android/ios/web). Filtering/rows/detail unchanged. Open: user-run lint/jest/tsc + ACC-S01..S02 matrix. See `docs/savepoint.md`.
- **2026-10-06 — Spec 56 FINAL v1.0 + implemented (D-01..D-05).** `specs/56-transaction-history-screen.md`: See All → new `/transactions` history screen. D-01 `index.tsx:250` retarget; D-02 `app/transactions.tsx` (full newest-first list + `safeGoBack` header); D-03 Stack registration; D-04 `utils/transactionHistory.test.ts` (ACC-01..04 × android/ios/web). Open: user-run lint/jest/tsc + ACC-S01..S02 matrix. See `docs/savepoint.md`.
- **2026-10-06 — Spec 56 FINAL v1.1 + implemented (D-06..D-09).** GCash-style read-only statement (SPEC-57 retired as pointer, one home). D-06 `utils/transactionGroups.ts` (month grouping); D-07 `app/transactions.tsx` rebuild (month cards, statement rows, receipt `Dialog` Close-only, zero writer affordances); D-08 `utils/transactionGroups.test.ts` (ACC-06..09 × android/ios/web). Home rows + details screen untouched. Open: user-run lint/jest/tsc + ACC-S03..S04 matrix. See `docs/savepoint.md`.
- **2026-10-06 — Spec 56 FINAL v1.2 + implemented (D-10..D-12).** Receipt modal deleted, rows fully static. D-10 `app/transactions.tsx` (no `Dialog`/`TouchableOpacity`/`Pressable`/`onPress` except header back); D-11 `transactionGroups.test.ts` absence guards (ACC-10 × android/ios/web). Grouping/fields/header untouched. Open: user-run lint/jest/tsc + ACC-S05 matrix. See `docs/savepoint.md`.
- **2026-10-06 — Spec 53 FINAL v1.0 + implemented (D-01..D-05).** `specs/53-floating-pill-tab-bar.md`: floating pill tab bar + standalone circular `+` (OD-02..05 closed on defaults DD-01..05 per owner waiver; DEC-05 fallback dropped). D-01 `components/FloatingTabBar.tsx` (new); D-02 `_layout.tsx` `tabBar` prop (SPEC-32 wiring retained); D-04 Home `FAB` deleted from `index.tsx`; D-03 `utils/floatingTabBar.test.ts` (ACC-01..05+07 × android/ios/web). Open: user-run lint/jest/tsc + ACC-S01..S03 matrix (tsc prop-typing verdict pending). See `docs/savepoint.md`.
- **2026-10-07 — Spec 58 FINAL v1.0 + implemented (D-01..D-03).** `specs/58-floating-tab-bar-centering.md`: wide-web bar left-docked (`left: 16/right: 16` + dead `alignSelf: center` on absolute shell). D-01 `components/FloatingTabBar.tsx` only — outer shell → `left: 0, right: 0 + alignItems: center`, inner row `width 100% + maxWidth 560 + paddingHorizontal 16` (mobile fluid, desktop centered-cap); D-02 `utils/floatingTabBar.test.ts` +9 guards (SPEC-58 ACC-01..03 × android/ios/web). Tokens/routes/SPEC-32 untouched. Open: user-run lint/jest/tsc + ACC-S01..S03 matrix. See `docs/savepoint.md`.
- **2026-10-07 — Spec 60 FINAL v1.0 + implemented (D-01..D-02).** `specs/60-transaction-history-test-sync.md`: stale ACC-03 (expected v1.1 `"Transaction Receipt"` modal; v1.2 DEC-08 deleted it — 3 failing × android/ios/web). D-01 `utils/transactionHistory.test.ts` ACC-03 rewritten as ACC-10 mirror (presence `groupTransactionsByMonth` + 9 absence checks). App code untouched. Open: user-run lint/jest/tsc. See `docs/savepoint.md`.
- **2026-10-07 — Spec 59 FINAL v1.0 + implemented (D-01..D-03).** `specs/59-docked-tab-bar.md`: floating look rejected (user "pangit ... lutang", call A); OD-01 b / OD-02 a / OD-03 full-bleed. D-01 `FloatingTabBar.tsx` in-place docked rewrite (`bottom: 0`, top border, SPEC-32 height; flat tab row, `Platform`/radius const removed; pill + `+` wire intact + `marginRight: 8`); D-02 test guards swapped to SPEC-59 ACC-01..03 (SPEC-53 retained). SPEC-53/58 superseded for layout only. Open: user-run lint/jest/tsc + ACC-S01..S02 matrix. See `docs/savepoint.md`.
- **2026-10-07 — Spec 61 FINAL v1.0 + implemented (D-01..D-03).** `specs/61-docked-tab-bar-in-flow.md`: SPEC-59 bar stayed `absolute` (overlay — content scrolled under it, end-of-list covered). D-01 outer shell drops `position/left/right/bottom` (in-flow, navigator reserves space); D-02 ACC-01 swapped to overlay-absence (zero `position:`/`"absolute"`/`bottom:`) × android/ios/web. Visuals/tabs/`+`/SPEC-32 untouched. Open: user-run lint/jest/tsc + ACC-S01..S02 scroll matrix. See `docs/savepoint.md`.
- **2026-10-07 — Spec 32 v1.1 FINAL + implemented (D-06..D-09).** Completed Dues → history-style month groups, segments removed (OD-01 a: total card deleted too). D-07 new pure `utils/groupDuesByMonth.ts` (mirrors `groupTransactionsByMonth`); D-06 `app/completed-dues.tsx` rebuild (no `SegmentedButtons`/filter/total; month cards + unchanged rows/header/empty state); D-08 `utils/groupDuesByMonth.test.ts` (12 tests × android/ios/web). Open: user-run lint/jest/tsc + ACC-S03/S04 matrix. SPEC-53 v1.1 still DRAFT (pending). See `docs/savepoint.md`.
- **2026-10-07 — Spec 32 v1.2 FINAL + implemented (D-10..D-12).** Row-title strikethrough removed (history parity; weight/color/layout untouched). D-10 one-key delete; D-11 ACC-10 guards (×3 OS). Open: user-run lint/jest/tsc + ACC-S05. See `docs/savepoint.md`. (Savepoint stale "SPEC-53 DRAFT" note corrected — v1.1 is FINAL + implemented.)
- **2026-10-07 — Spec 53 v1.1 FINAL + implemented (D-13..D-16).** Canonical home per owner order + §1.14 (no new numbers): floating pill + centered 560 + in-flow. D-13 removed leftover `+` `marginRight: 8`; D-14 guards → ACC-11 (+2 consequential stale-assertion fixes); D-15 deleted `specs/62-*.md` (user-ordered, verified gone). SPEC-58 folded in; SPEC-59/61 superseded for layout. Open: user-run lint/jest/tsc + ACC-S05/S06 matrix. See `docs/savepoint.md`.
- **2026-10-07 — Spec 36 v1.3 FINAL + implemented (D-W-07..D-W-09).** Web same-session rows 404'd on edit/delete (client-UUID append, no repull; server mints ids). D-W-07 web add re-GETs after POST and replaces state (context categories, zero local writes); OD-W4 (a), OD-W5 deferred (delete copy untouched, still open). D-W-08 `utils/webTransactionRepull.test.ts` (6 guards × android/ios/web). Open: user-run lint/jest/tsc + ACC-W-09 web add→edit→delete matrix. See `docs/savepoint.md`.
- **2026-10-07 — Spec 36 v1.4 FINAL + implemented (D-W-10..D-W-12).** OD-W6 (a) + OD-W7 (a): delete success toast + in-app failure (no red box); context delete prefers server message (web + native). F5 result recorded (new rows OK, old rows fail — old-row cause open, surfaced text will identify it). D-W-11 `utils/transactionDeleteFeedback.test.ts` (6 guards × android/ios/web). Open: user-run lint/jest/tsc + ACC-W-12 matrix. See `docs/savepoint.md`.
- **2026-10-07 — Spec 36 v1.5 FINAL + implemented (D-W-13..D-W-16).** OD-W8 (a) + OD-W9 (a): pasted logs proved DELETE 204-empty was thrown as failure (row actually deleted) — D-W-13 `authFetch` returns ok:true on 2xx-empty (web + native; 401/envelope/non-2xx untouched); D-W-14 edit-save success toast + resolved-message Alert. OD-W10 open (old-row 404 title not supplied, no code). D-W-15 apiClient 204/404 cases + `transactionEditFeedback.test.ts`. Open: user-run lint/jest/tsc + ACC-W-15. See `docs/savepoint.md`.
- **2026-10-07 — Spec 46 v1.2 FINAL + implemented (D-06..D-08).** Pay-due 500 (`uuid: "scheduled"` — SPEC-09 fallback id forwarded into the server UUID cast). D-06 gates the 3 online `categoryId` derivations on `isUUID` (null otherwise → Others; nested kept; CON-03 superseded for these lines; duplicate PUT line collapsed). D-07 rewrites ACC-01/01b/03 + new ACC-08 (×3 OS; heals `"8"/"9"` edit writes too). Open: user-run lint/jest/tsc + ACC-S06 pay matrix. See `docs/savepoint.md`.
- **2026-10-07 — Spec 26 v1.4 FINAL + implemented (D-04..D-05).** Dues Pay + alert dialogs full-bleed on desktop (no responsive cap). D-04 `app/dues.tsx` — new `styles.dialog` (CON-01 tokens verbatim) + 2 style props; chips/logic/copy untouched. Open: user-run lint/jest/tsc + ACC-S07 matrix. Pay flow itself = SPEC-46 v1.2 (ACC-S06 still awaiting user). See `docs/savepoint.md`.
- **2026-10-07 — Spec 63 FINAL v1.0 + implemented (D-01..D-04).** Dashboard calculator + floating bell pill (new number: no existing home; OD-01 a standalone modal, OD-02 a bar-pill tokens). D-02 `utils/calculator.ts` (pure) + `components/CalculatorModal.tsx` (3×5 grid, immediate-exec); D-01 header pill (`calculator` glyph verified — no `calculator-outline` in MCI) + untouched bell/badge; D-03 `utils/calculator.test.ts` (16 tests × android/ios/web). Open: user-run lint/jest/tsc + ACC-S01/S02 matrix. See `docs/savepoint.md`.
- **2026-10-07 — Spec 63 v1.1 FINAL + implemented (D-05..D-07).** Fresh-entry wipe fixed (`5+3=` now computes; display-only replace, reset solely from Error/C) + larger keys (card 400, displaySmall, 56/18). D-06 ACC-05/ACC-06 guards. Open: user-run lint/jest/tsc + ACC-S03 matrix. See `docs/savepoint.md`.
- **2026-10-07 — Spec 53 v1.2 FINAL + implemented (D-17..D-19).** Taller floating bar (phone height vs reference mock): pill + tab `paddingVertical` 8 → 12 (≈ +8px; icons/labels/colors/`+`/centering/in-flow untouched). D-18 ACC-12 (×3 OS). Open: user-run lint/jest/tsc + ACC-S07 matrix. See `docs/savepoint.md`.
- **2026-10-07 — Spec 05 §5 + Spec 45 §7 FINAL + implemented.** Toast centered + quarantine for the `"9"` legacy id (PG uuid-cast failure — server-side row, unaddressable by API; true heal = backend repair, out of tree). D-MD-03 `ToastContext` (`wrapperStyle` full-height centering verified in Paper 5.13 source, inverse pair, maxWidth 480); D-45A `isUUID` + message + tests (native/ESM hazards mocked); D-45B context short-circuits; D-45C details/edit gating + explainer. Open: user-run lint/jest/tsc + ACC-MD-07/ACC-45D matrix. See `docs/savepoint.md`.
- **2026-10-07 — Spec 05 §6 FINAL + implemented (D-MD-06..D-MD-08).** Toast skin → navy system (`primary` + r16; text/action = verified Paper defaults; centering/timing/callers untouched). OD-MD-7 (a). D-MD-07 guards → ACC-MD-08 (×3 OS). Open: user-run lint/jest/tsc + ACC-MD-10 (phone + web, light + dark). See `docs/savepoint.md`.
- **2026-10-07 — Spec 53 v1.4 FINAL + implemented (D-23..D-25).** `specs/53-floating-pill-tab-bar.md` §8: v1.3 navy reverted per user screenshots — bar `primary → surface` (white light / dark `#161B22`), pill `primaryContainer → transparent` (no fill), inactive `onPrimary → onSurfaceVariant` (gray both modes), focused stays `primary`, `+` untouched (`containerColor primary` / `iconColor onPrimary`). D-24 test ACC-14 → ACC-16 (×3 OS). Padding/centering/in-flow/SPEC-32 untouched. Open: user-run lint/jest/tsc + ACC-S09 matrix. See `docs/savepoint.md`.
- **2026-10-07 — Spec 63 v1.2 FINAL + implemented (D-08..D-10).** `specs/63-dashboard-quick-calculator.md` §6: calculator card off-center on phone (`gitna` order). D-08 `components/CalculatorModal.tsx` one line (`alignSelf: "center"`; `90%`/`400` retained); D-09 `utils/calculator.test.ts` ACC-08 guards (×3 OS). Arithmetic/keys/display/header/bell untouched. Open: user-run lint/jest/tsc + ACC-S04 matrix. See `docs/savepoint.md`.
- **2026-10-07 — Spec 63 v1.3 FINAL + implemented (D-11..D-13).** `specs/63-dashboard-quick-calculator.md` §7: v1.2 was a redundant no-op (admitted); fresh bundle still off-center both axes. Root cause from Paper source (`Modal.tsx` wrap-only `Surface`). D-11 `CalculatorModal.tsx` one key (`flex: 1` in `contentContainerStyle` — transparent surface fills wrapper, true screen-centering, card flexible `90%`/`400` untouched); D-12 `calculator.test.ts` ACC-10 guards (×3 OS). Open: user-run lint/jest/tsc + ACC-S05 matrix. See `docs/savepoint.md`.
- **2026-10-07 — Spec 63 v1.4 FINAL + implemented (D-14..D-16).** `specs/63-dashboard-quick-calculator.md` §8: v1.3 still bottom-stuck (7:15 screenshot) — iOS `SurfaceIOS` splits styles, no Paper-`Modal` combo can guarantee centering; user chose (a) RN rewrite. D-14 `CalculatorModal.tsx` shell-only (RN `Modal` + backdrop/tap-swallow `Pressable`s; card/keys/arithmetic/props identical); D-15 `calculator.test.ts` ACC-12 guards (×3 OS). SPEC-26 dialogs untouched. Open: user-run lint/jest/tsc + ACC-S06 matrix. See `docs/savepoint.md`.
- **2026-10-07 — Spec 64 v1.0 FINAL + implemented (D-01..D-06).** `specs/64-transaction-details-polish.md` (new number; SPEC-30/31/42/45 retained): desktop stretch fixed — `scrollContainer` capped `600` centered; hero `elevation: 2`, icon box 80 + glyph 40; rows right-aligned + last-row divider dropped; new pure `utils/formatMethod.ts` (`bank_transfer → Bank Transfer`, `Cash` fallback kept). D-05 `utils/transactionDetails.test.ts` (ACC-01..04 ×3 OS). Open: user-run lint/jest/tsc + ACC-S01 matrix. See `docs/savepoint.md`.
- **2026-10-07 — Spec 05 §7 FINAL + implemented (D-MD-09..D-MD-11).** SPEC-64 §1.13 overlap gate → user called OD-T1 (a) "Global to bottom" (knowingly supersedes §5 centering). `ToastContext` `wrapperStyle` → bottom-docked (`bottom: 24`, `flex-end`); navy/maxWidth/timing/action untouched. `toastLegibility.test.ts` ACC-MD-08 → ACC-MD-11 (×3 OS). Open: user-run lint/jest/tsc + ACC-MD-13 matrix. See `docs/savepoint.md`.
- **2026-10-07 — Spec 65 v1.0 FINAL + implemented (D-01..D-05).** `specs/65-success-dialog-pattern.md` (new number; option A): delete/edit success = white centered dialog, not toast. D-01 `ConfirmDialog` optional `tone` (danger default byte-identical; success = check icon + primary OK, no Cancel); D-02 details + D-03 edit wiring (dismiss → back; failures untouched); D-04 `utils/successDialog.test.ts` + 2 consequential SPEC-36 success-assertion rewrites. Open: user-run lint/jest/tsc + ACC-S01 matrix. See `docs/savepoint.md`.

---

## 4. Spec: Connection Status vs Offline (Local-Only) Account Mode

**Status: FINAL (2026-09-21 per user call) — normative text lives in
`specs/04-connection-status-vs-offline-mode.md`; implement exactly that. No
Cloud→Local downgrade.**

> Specs moved out of `AGENTS.md` on 2026-09-21 per user request. This section
> is a pointer only — see `specs/04-connection-status-vs-offline-mode.md`
> (Context, Constraints, Goal, Deliverables).
