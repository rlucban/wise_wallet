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

---

## 4. Spec: Connection Status vs Offline (Local-Only) Account Mode

**Status: FINAL (2026-09-21 per user call) — normative text lives in
`specs/04-connection-status-vs-offline-mode.md`; implement exactly that. No
Cloud→Local downgrade.**

> Specs moved out of `AGENTS.md` on 2026-09-21 per user request. This section
> is a pointer only — see `specs/04-connection-status-vs-offline-mode.md`
> (Context, Constraints, Goal, Deliverables).
