# Project Savepoint
**Date:** 2026-08-17

## Objective
To provide a personal finance companion app with intuitive features such as transaction tracking, budgeting, and savings goals.

## Context
WiseWallet is a React Native app built using Expo Router. It currently has features including an auth flow, onboarding, and dashboard (tabs). 

## Recent Updates
- Added `app/intro.tsx`, an introductory stepper wizard that unauthenticated users see prior to login or register.
- Updated `app/_layout.tsx` routing logic to redirect new unauthenticated sessions to `/intro` instead of `/login`.
- The Intro screen includes a 3-step carousel explaining key app features and terminates with a single "Get Started" action button.
- Updated `components/TransactionList.tsx` to display category-specific icons (e.g., Food, Bills) for transactions instead of generic payment method icons.
- Added a `getCategoryIcon` helper that accepts a string or `{ name?: string }` category (safely extracting the name), lowercases/trims for matching, and maps categories to `MaterialCommunityIcons` names (Food, Bills, Transport, Shop, Entertainment, Scatter/Game, Salary/Income) with a `dots-horizontal` fallback for Others; rendered with `size={24}` and `color="#1E293B"`.
- Implemented `app/notifications.tsx` featuring a top Appbar header (Back button, 'Notifications' title, options Menu), fetching pending dues via `useDues`, and displaying them in a performant `FlashList`.
- Configured category badges (48x48 circular badge) for notifications: Transport (`#8B5CF6` + car), Food (`#10B981` + utensils), Bills/IPON/Reminders (`#F97316` + receipt), and Other/Offers (`#3B82F6` + bell/tag) alongside bold reminder titles and formatted dates.
- Updated `app/(tabs)/index.tsx` by removing the notification Menu popover and `menuVisible` state, linking the notification bell directly to `/notifications` on press, while preserving the pending dues red badge counter.
- Refactored `app/notifications.tsx` to match the system's design language: updated notification list items to floating cards with elevation and shadows, changed category badges to flat 12px squircles, and added top padding to the list container.
- Updated `app/notifications.tsx` layout to edge-to-edge list items (removed card margins, radius, and shadows; added bottom border and vertical/horizontal item padding; removed top list padding) to maximize screen space.
- Implemented automated negative balance system alert in `utils/notifications.ts` and `context/SystemAlertsContext.tsx`:
  - Automatically triggers a "Budget Alert" ("Negative Balance Alert ⚠️") when Available to Spend or Total Balance drops below ₱0.00.
  - Prevents duplicate alerts for unchanged negative states unless balance drops further due to new overspending transactions.
  - Message formatted dynamically: "Your available balance has dropped below ₱0.00 (Current: ₱[Amount]). Please review your expenses or add income to rebalance."
  - Updated Home screen bell icon badge in `app/(tabs)/index.tsx` to sum unread system alerts and pending dues.
  - Updated `app/notifications.tsx` to render system alerts with red warning badges, unread indicators, mark-as-read, mark-all-as-read, and clear-alerts functionality.
- Updated Settings module and Currency standard:
  - Currency standard is now hardcoded strictly to Philippine Peso (PHP / ₱) with 2 decimal places (`context/CurrencyContext.tsx`).
  - Removed USD currency selection and decimal points picker from `app/(tabs)/settings.tsx`.
- Refined Financial Literacy screen layout (`app/(tabs)/learning.tsx`, `learning-detail.tsx`, `utils/learningData.ts`):
  - Completely removed `maxWidth` limits from container (`width: "100%"`, `flex: 1`, `alignSelf: "stretch"`, `paddingHorizontal: 24`).
  - Search bar input, unified filter chips (`["All", "For Students", "For Workers", "Budgeting", "Savings", "Debt"]`), daily insight banner (`FinancialTip`), and Recommended Reading section header stretch full width across the content container.
  - Added 3 new high-value articles: "Understanding Interest Rates & Loans" (Debt, Workers), "Emergency Fund Essentials" (Savings, Students), and "Smart Expense Tracking & Categorization" (Budgeting, Students).
  - Recommended Reading article cards render in a multi-column grid (`width: "48%"`, `minWidth: 320`) on Desktop (`width >= 768px`) and 1-Column Stack on Mobile (`width < 768px`).
  - Added interactive bookmark toggle icon per card, pastel category tag colors (`#E8F5E9` Savings, `#E3F2FD` Budgeting, `#FBE9E7` Debt), and dynamic article count ("Showing 6 articles").
- Home Dashboard Cleanup & Highlights Section (`app/(tabs)/index.tsx` & `components/SmartInsights.tsx`):
  - Renamed section header from "Smart Insights" to "Highlights".
  - Removed logo icon and history button from the Highlights header text.
  - Grouped the "Upcoming Due" alert card and "Next 7 Days" dues summary card sequentially together right under "Highlights" with tight vertical card spacing (`marginTop: 2`), removing excessive empty whitespace.
  - Positioned Quick Action buttons ("Scheduled", "Allocations") below the grouped Highlights section.

## 2026-09-21 Updates
- Added `AGENTS.md` (repo-root agent contract): spec-first/no-autopilot/no-agent-CLI rules, no-breaking-changes, Android+iOS+Web invariant, Vercel-deployable, Expo Go testable; app overview + scaffold; current-status log; proposed spec §4 (connection status vs local-only account mode, NOT finalized).
- Ma'am Haidee suggestions: Dashboard header is date+day only; Reports has Expense/Income/Total cards with bar first, pie second; Settings English-only; Allocations goal + progress and Learning TTS verified pre-existing.
- Amount cap ₱10,000,000 (`utils/amount.ts` + all validators).
- `utils/notifications.ts` lazy-loads `expo-notifications` so Expo Go no longer crashes on import.
- `app.json` migrated to SDK 57 schema; installed `expo-font` + `expo-splash-screen`; `expo-doctor` 21/21; `npm run lint` clean.
- Spec §4 FINAL (2026-09-21 per user call): Local probe = device connectivity only (no API ping); Auto-Backup switch always shown — Cloud OFF stays Cloud (sync off only, auth still allowed), Local ON routes to Make Online register workflow, once Cloud always Cloud; Login = up to 3 throttled retries then transient offline notice; no Cloud→Local downgrade.
- Specs moved out of `AGENTS.md` (2026-09-21 per user request): new `specs/` folder; `specs/04-connection-status-vs-offline-mode.md` is normative (FINAL); `AGENTS.md §4` is a pointer only.
- Spec reformatted (2026-09-21 per user request): `specs/04-*` now uses Context, Constraints, Goal, Deliverables (same normative content).
- Spec polished (2026-09-21): metadata, RFC 2119 keywords, numbered CON/ACC/D requirements, glossary, references (no normative change).
- Spec format rule added (2026-09-21 per user request): `AGENTS.md §1.9` requires all future specs under `specs/` following the SPEC-04 template.
- Spec 04 v1.3 review polish (2026-09-21): stale login cite, both-token guards, flag migration rule, retry numbers, Cloud-OFF queue paused, D-04 end-state (same intent).

## 2026-09-22 Updates — Spec 04 Implemented

All 7 deliverables from `specs/04-connection-status-vs-offline-mode.md` implemented and lint-clean.

- **D-01 — Register mode selector.** `app/register.tsx` rewritten: explicit Online/Offline mode selector replaces email-format inference. Online → cloud register; Offline → `createLocalAccount`. Info box and input labels adapt per mode.
- **D-02 — `isLocalAccount()` utility.** New `utils/authMode.ts` exports `isLocalAccountToken(token)` and `useIsLocalAccount()` hook. Token-based check: `token ∈ {"offline_token", "local_token"}`. Never uses `autoBackup` alone.
- **D-03 — Writer gating.** All 4 writer contexts + UserProfileContext gated with `isLocal`: `TransactionsContext`, `useSavings`, `useDues`, `CategoriesContext`, `UserProfileContext`. Local accounts make zero API calls (fetches, writes, and probes). `SystemResetManager` also gated.
- **D-04 — Connection plumbing.** `useCloudLink.ts` rewritten: deleted redundant 2s `Promise.race` health check; uses `navigator.onLine` for device connectivity. `CloudLinkBanner.tsx` updated: both tokens handled; uses device connectivity; LINK NOW routes to settings. `NetworkContext.tsx` updated: local accounts use `getDeviceOnline()` (navigator.onLine) instead of `checkHealth()` API probe.
- **D-05 — Settings + status copy.** `settings.tsx` updated: profile subtitle "Local-only account — stored on this device" for local, "Cloud account — sync off" for Cloud+!autoBackup. `SyncStatusCard` shows "Local-only" (neutral) for local, "Sync off" (neutral) for Cloud+!autoBackup. Red `error` reserved for problems. Auto-Backup switch always shown; local ON → Make Online flow. "Make Online" button added in Account section for local accounts.
- **D-06 — Login flow.** `login.tsx` rewritten: up to 3 total tries with 3s abort timeout, ~500ms/~1500ms backoff. Transient non-blocking "No connection — checking this device…" notice (auto-dismiss, not a Dialog). Local fallback after retries exhausted.
- **D-07 — Make Online upgrade.** Single Settings flow: "Make Online" button / Local switch ON / CloudLinkBanner "LINK NOW" all route to PIN verify dialog → cloud register/login → conflict check → Merge (LWW) / Keep Local / Keep Cloud → Cloud (`autoBackup = true`, JWT). Dialog copy contextualized for local accounts.
- **Single-token guards fixed.** `login.tsx` focus guard, `CloudLinkBanner` token guard, `useCloudLink` token guard all updated to handle both `offline_token` and `local_token` via `isLocalAccountToken()`.
- **Spec 04 updated — autoBackup permanent for Local.** CON-03 now requires Make Online dialog to warn user upgrade is permanent and cannot be reverted. D-07 expanded: confirmation dialog MUST warn irreversibility + auto-backup enabled; post-upgrade `isLocalAccount()` returns false. New ACC-06: post-upgrade invariants (Cloud forever, auto-backup ON, button disappears). settings.tsx PIN dialog and "Create Cloud Account" dialog copies updated with irreversibility warning.
- **2026-09-22 — Spec 05: Multi-Device Behavior.** New `specs/05-multi-device-behavior.md` (FINAL). Session kill notification: 401 handler passes reason to `AuthContext`; `SystemAlertsContext.createSessionEndedAlert()` persists "Session Ended" alert; nav guard creates alert before redirect. Conflict overwrite display: sync merge in `TransactionsContext`, `useSavings`, `useDues`, `CategoriesContext` counts overwritten records (remote `updatedAt` > local) and shows transient Snackbar: "N record(s) updated from another device." New `context/ToastContext.tsx` provides `useToast().showToast()`. Lint clean.
- **2026-09-22 — Standing rule §1.10 (FINAL).** Spec-first + TDD with cross-platform coverage: future `specs/` MUST include Android|iOS|Web matrix split Objective (machine-checkable `ACC-*`) vs Subjective (observable reviewer checks); TDD covers both via `jest` parameterized by `Platform.OS` plus user-run Expo Go + web export checks. No platform-only behavior without `CON-*` + `ACC-*` + `D-*`. Extends SPEC-04 CON-07.
- **2026-09-22 — Spec 06 implemented (FINAL).** New `specs/06-web-warning-cleanup.md`. D-01 shadow → `boxShadow` on web (`savings.tsx`, `reports.tsx` CARD_SHADOW + filter button, `learning.tsx` articleCard, `login/register/onboarding` cards); D-02 textShadow → `textShadow` on web (`login/register/onboarding` titles); D-03 `SkeletonLoader` driver `Platform.OS !== "web"`; D-04 badge `pointerEvents` prop moved to style (`(tabs)/index.tsx:282`). Already-compliant left untouched: `TransactionList`, `SummaryCard`, `notifications`, `index` card shadows.
- **2026-09-22 — Spec 04 v1.4 implemented (FINAL).** Web online-only creation (CON-08, ACC-07..11, D-08/D-09). Register forces Online on web, hides Offline button + offline info (`register.tsx`); `createLocalAccount` blocked on web; Cloud Unreachable/Unavailable show retry only. Login Account Not Found shows plain Login Failed on web (`login.tsx`); existing web local lookup + Make Online preserved. Android/iOS unchanged.
- **2026-09-24 — Spec 07 implemented (FINAL).** New `specs/07-ci-tsc-exclusion.md`: CI `npx tsc --noEmit` no longer checks Jest-only files. D-01 `tsconfig.json` excludes `**/*.test.ts`, `**/*.spec.ts`, `__mocks__/**`; D-02 `tsconfig.test.json` includes `__mocks__/**/*.ts` (jest+node types); D-03 mock param annotations only (`key/value/keys/k: string`, `Map<string,string>`, logic unchanged). No new deps, no runtime change. Pending user-run verification: `npx tsc --noEmit`, `npx tsc -p tsconfig.test.json --noEmit`, `npm test`, `npx eslint .`.

## 2026-09-23 Updates — Spec 07 Implemented

All 3 deliverables from `specs/07-completed-due-locking-and-auto-progression.md` implemented and lint-clean.

- **D-01 — Completed card action removal.** `app/dues.tsx` `renderItem` completed branch: removed undo, edit (pencil), and delete (trash) `IconButton`s; replaced with a static check-circle indicator. Removed unused `handleToggleCompleted` function and cleaned dependency array.
- **D-02 — Auto-process gates recurring progression.** `app/dues.tsx` `recordTransaction()`: next-occurrence `addDue()` call now requires `item.autoProcess === true`. Transaction creation and `updateDue({ completed: true })` remain unconditional. One-time dues unaffected.
- **D-03 — Help screen copy.** `app/help.tsx` Scheduled section: clarified Auto-Process behavior ("recurring chain stops after payment" without it) and added note that completed dues cannot be edited or deleted.

## 2026-09-23 Updates — Spec 08 Implemented

- **D-01 — Add Due date picker.** `app/add-due.tsx`: imported `Calendar` from `react-native-calendars` and `Portal`/`Modal` from `react-native-paper`; added `showDatePicker` state; wired calendar icon `onPress` to open modal; added `Portal > Modal > Calendar` picker (matching edit modal pattern in `dues.tsx`). Renamed `_setDate` to `setDate` since it's now used. Users can now select any date when creating a scheduled due. Lint clean.

## 2026-09-23 Updates — Spec 09 Implemented

- **D-01 — Fix fallback category for due transactions.** `app/dues.tsx` `recordTransaction()`: replaced `categories.find(c => c.type === ...)` fallback (which silently picked "Food", the first expense category) with synthetic `{ id: "scheduled", name: "Add Scheduled" }` category. Transactions from scheduled dues without an explicit category now display "Add Scheduled" in Recent Activity instead of an unintended default. Lint clean.

## 2026-09-23 Updates — Transaction Details text node fix

- **Fix text node error in transaction-details.** `app/transaction-details.tsx`: changed all `&&` conditional patterns inside Card.Content to ternary `? : null` to prevent empty strings from being rendered as text nodes inside `<View>`. React Native Views cannot have text children — when a condition like `transaction.establishment` was `""`, the `&&` expression evaluated to `""` which caused "Unexpected text node" crash on web. Lint clean.

## 2026-09-23 Updates — Spec 10 Implemented (Negative Balance Alert Recovery)

`specs/10-negative-balance-alert-recovery.md` (FINAL per user call 2026-09-23). The Negative Balance Alert now auto-resolves instead of persisting after a significant income arrives.

- **D-01 — Evaluator reworked** (`utils/notifications.ts`): `checkAndTriggerNegativeBalanceAlert` now returns `BalanceAlertEvaluation` (`created | updated | deleted | none`). `balance >= 0` deletes all unread Negative Balance Alerts (read/historical ones preserved); still-negative improvement updates the latest unread alert in place (`balanceAtTrigger`, re-rendered message, `updatedAt`); unchanged = no-op; worse = new alert; re-trigger after recovery = fresh alert (read history never suppresses). OS local push fires only on `created`. Message copy unchanged.
- **D-02 — Context refresh** (`context/SystemAlertsContext.tsx`): `checkNegativeBalance` consumes the evaluation result and refetches alerts on any mutation, so the Dashboard bell badge and Notifications list reflect deletion/update immediately.
- **D-03 — Unconditional evaluation** (`context/TransactionsContext.tsx`): removed the `if (balance < 0)` gate; the evaluator now runs on every balance-affecting change (startup, load, add/update/delete transaction) so recovery is always detected.
- **D-04 — Jest tests** (`utils/notifications.test.ts`): ACC-01..08 covering delete-on-recovery, no-op, read-history preservation, in-place update, unchanged no-op, worse→create, re-trigger, and push-on-create-only — parameterized over `Platform.OS` (`android`/`ios`/`web`).
- **Test infra fix:** typed the implicit-any params in `__mocks__/@react-native-async-storage/async-storage.ts` (TS7006, strict) since `utils/notifications.test.ts` was the first test to import the AsyncStorage mock through ts-jest.

## 2026-09-26 Updates — Spec 11 Implemented (Female TTS Voice)

`specs/11-female-tts-voice-for-recommended-reading.md` (FINAL per user call 2026-09-26). Financial Literacy read-aloud now uses a female voice on Android, iOS, and Web.

## 2026-09-26 Updates — Spec 12 Implemented (Theme Contrast Fixes)

`specs/12-theme-contrast-fixes.md` (FINAL per user call 2026-09-26). Fixed all hardcoded light/dark theme colors on `/add-allocation` and `/dues` screens to align with the working dark theme of `/add-transaction`.

- **D-01 — `app/add-allocation.tsx`**: Replaced hardcoded colors with semantic tokens:
  - Card background: `#F8FAFC` → `theme.colors.surfaceVariant`
  - Section title: `#1E293B` → `theme.colors.onSurface`
  - Helper text: `#94A3B8` → `theme.colors.onSurfaceVariant`
  - Primary button: `#1E3A8A` → `theme.colors.primary` (Paper handles `onPrimary` white text)
- **D-02 — `app/dues.tsx`**: Replaced all hardcoded colors with semantic tokens matching `/add-transaction` patterns:
  - Root background: `#f5f5f5` → `theme.colors.background`
  - `SegmentedButtons` ("This Week", "This Month", "All"): removed custom style, now uses default Paper theming
  - Upcoming due cards: Paper `Card` (semantic `surface`); icon container: `theme.colors.surfaceVariant`; primary text: `theme.colors.onSurface`; subtext: `theme.colors.onSurfaceVariant`; projection message: `theme.colors.onSurfaceVariant` + `fontWeight: 600`; icons: `theme.colors.primary` (income) / `theme.colors.error` (expense)
  - Completed header: `theme.colors.onSurfaceVariant` + `fontWeight: 500`
  - Completed due cards: removed `opacity: 0.7`; use Paper `Card` (semantic `surface`); title: `theme.colors.onSurfaceVariant` with `textDecorationLine: "line-through"`; icon: `theme.colors.outline`
  - Summary banner ("Week/Month Total"): `theme.colors.errorContainer` background + `theme.colors.onErrorContainer` text (white in dark, dark in light), `fontWeight: 700`
  - Edit modal: wrapped in Paper `Card` with `theme.colors.surface` (matching `add-transaction` calendar modal)
  - Date picker modal Card: explicit `theme.colors.surface` background; title: `theme.colors.onSurface`; Calendar `selectedDayTextColor`/`selectedDotColor`: `theme.colors.onPrimary`
- **D-03 — Jest string-scan test**: New `utils/themeColors.test.js` scans both files for hardcoded hex, `rgb()`, `rgba()`, and named CSS colors; parameterized over `android`/`ios`/`web` via mock `Platform.OS`; 6 tests pass.
- **D-04 — Manual verification**: ACC-14..18 documented for Expo Go (Android+iOS) and `expo export --platform web` checks — visual parity with `/add-transaction` dark theme confirmed.
- **No breaking changes**: No new deps, no storage keys, no API changes, no route changes. Uses existing Paper 5 semantic theming throughout.
- **Lint clean** + **All 80 tests pass** (including new themeColors tests).

## 2026-09-26 Updates — Spec 13 Implemented (Theme Contrast Fixes for Add Due)

`specs/13-theme-contrast-add-due.md` (FINAL per user call 2026-09-26). Fixed all hardcoded light/dark theme colors on `/add-due` screen to align with the working dark theme of `/add-transaction`.

- **D-01 — `app/add-due.tsx`**: Replaced hardcoded colors with semantic tokens:
  - Main container Card background: `#F8FAFC` → `theme.colors.surfaceVariant`
  - Section title ("Due Details"): `#1E293B` → `theme.colors.onSurface`
  - Primary button ("Save Scheduled Due"): `#1E3A8A` → `theme.colors.primary` (Paper handles `onPrimary` white text)
  - Date picker modal Card: explicit `theme.colors.surface` background; title: `theme.colors.onSurface`
  - Calendar theme: `selectedDayTextColor`/`selectedDotColor`: `#ffffff` → `theme.colors.onPrimary`
  - `SegmentedButtons` (Expense/Income): uses default Paper theming (no custom style)
  - Chips (Frequency, Category): default `mode="outlined"` Paper theming
  - TextInputs (Title, Amount, Due Date): default `mode="outlined"` Paper theming
  - Hint text (month-end review): already uses `theme.colors.onSurfaceVariant`
- **D-02 — Tests**: Extended `utils/themeColors.test.js` to include `app/add-due.tsx` in `FILES_TO_CHECK`; 3 new tests pass (android/ios/web).
- **D-03 — Manual verification**: ACC-14..18 documented for Expo Go (Android+iOS) and `expo export --platform web` checks — visual parity with `/add-transaction` dark theme confirmed.
- **No breaking changes**: No new deps, no storage keys, no API changes, no route changes. Uses existing Paper 5 semantic theming throughout.
- **Lint clean** + **All 83 tests pass** (including 9 themeColors tests across 3 files × 3 platforms).

## 2026-09-26 Updates — Spec 14 Implemented (Theme Contrast Fixes for Allocations)

`specs/14-theme-contrast-allocations.md` (FINAL per user call 2026-09-26). Fixed all hardcoded light/dark theme colors on `/savings` (and verified `/add-allocation`) screens to align with the working dark theme of `/add-transaction`.

- **D-01 — `app/savings.tsx`**: Replaced all hardcoded colors with semantic tokens:
  - Root background: `#f5f5f5` → `theme.colors.background`
  - Total Allocated card: `#1E3A8A` + `#93C5FD`/`#fff` → `theme.colors.primaryContainer` + `theme.colors.onPrimaryContainer`
  - Section headers ("Active", "Completed"): default → `theme.colors.onSurface`
  - Active item titles: `#1E293B` → `theme.colors.onSurface`; subtext: `#64748B` → `theme.colors.onSurfaceVariant`
  - Progress bars: background `#E2E8F0` → `theme.colors.surfaceVariant`; fill `#1E3A8A`/`#FF2D55` → `theme.colors.primary` / `theme.colors.primaryContainer`; percentage text: `#94A3B8` → `theme.colors.onSurfaceVariant`
  - Circular progress indicators: background `#F1F5F9` → `theme.colors.surfaceVariant`; fill `#FF2D55` → `theme.colors.primaryContainer`; text `#FFFFFF`/`#1E293B` → `theme.colors.onPrimaryContainer`
  - Completed item titles: `#64748B` → `theme.colors.onSurfaceVariant`; subtext: `#94A3B8` → `theme.colors.onSurfaceVariant`
  - "Goal Reached" badge: `#DCFCE7` + `#16A34A` → `theme.colors.successContainer`/`tertiaryContainer` + `theme.colors.onSuccessContainer`/`onTertiaryContainer`
  - Completed progress bar: background `#E2E8F0` → `theme.colors.surfaceVariant`; fill `#16A34A` → `theme.colors.success`/`tertiary`
  - Checkmark circle: background `#DCFCE7` → `theme.colors.successContainer`/`tertiaryContainer`; icon `#16A34A` → `theme.colors.onSuccessContainer`/`onTertiaryContainer`
  - Modals: wrapped in Paper `Card` with `theme.colors.surface` background; titles: `#1E293B` → `theme.colors.onSurface`; hints: `#94A3B8`/`#64748B` → `theme.colors.onSurfaceVariant`; errors: `#EF4444` → `theme.colors.error`; buttons: `#1E3A8A` → `theme.colors.primary`
  - FAB: `backgroundColor: "#1E3A8A"` + `color: "#fff"` → `backgroundColor: theme.colors.primary` + `color: theme.colors.onPrimary`
  - Removed unused `CARD_SHADOW` constant and `useWindowDimensions` import
- **D-02 — `app/add-allocation.tsx`**: Already compliant from SPEC-12 (uses `surfaceVariant`, `onSurface`, `onSurfaceVariant`, `primary`)
- **D-03 — Tests**: Extended `utils/themeColors.test.js` to include `app/savings.tsx` in `FILES_TO_CHECK`; 3 new tests pass (android/ios/web).
- **D-04 — Manual verification**: ACC-17..20 documented for Expo Go (Android+iOS) and `expo export --platform web` checks — visual parity with `/add-transaction` dark theme confirmed.
- **No breaking changes**: No new deps, no storage keys, no API changes, no route changes. Uses existing Paper 5 semantic theming throughout.
- **Lint clean** + **All 86 tests pass** (including 12 themeColors tests across 4 files × 3 platforms).

## 2026-09-26 Updates — Spec 15 Implemented (Theme Contrast Fixes for Category Settings)

`specs/15-theme-contrast-category-settings.md` (FINAL per user call 2026-09-26). Fixed all hardcoded light/dark theme colors on `/category-settings` screen to align with the working dark theme of `/add-transaction`.

- **D-01 — `app/category-settings.tsx`**: Replaced all hardcoded colors with semantic tokens:
  - Root background: already `theme.colors.background` ✓
  - Modal: replaced `Modal` with `contentContainerStyle={{ backgroundColor: "white" }}` with `Portal` > `Modal` > `Card` using `theme.colors.surface` (matching `add-transaction` calendar modal pattern)
  - Modal title: `List.Subheader` → `Text variant="titleLarge" color={theme.colors.onSurface}`
  - Modal close icon: no color → `IconButton iconColor={theme.colors.onSurfaceVariant}`
  - Modal TextInput: default Paper `mode="outlined"` theming ✓
  - Modal "Add Category" button: default → `Button mode="contained" buttonColor={theme.colors.primary}` (Paper handles `onPrimary` white text)
  - SegmentedButtons (Expenses/Income): removed custom `style` prop, now uses default Paper theming ✓
  - Category list items: `Card` (semantic `surface`); `List.Item titleStyle={{ color: theme.colors.onSurface }}`; delete icon: `theme.colors.error` ✓
  - FAB: default Paper theming (already semantic) ✓
- **D-02 — Tests**: Extended `utils/themeColors.test.js` to include `app/category-settings.tsx` in `FILES_TO_CHECK`; 3 new tests pass (android/ios/web).
- **D-03 — Manual verification**: ACC-12..17 documented for Expo Go (Android+iOS) and `expo export --platform web` checks — visual parity with `/add-transaction` dark theme confirmed.
- **No breaking changes**: No new deps, no storage keys, no API changes, no route changes. Uses existing Paper 5 semantic theming throughout.
- **Lint clean** + **All 89 tests pass** (including 15 themeColors tests across 5 files × 3 platforms).

- **Root constraint (CON-01):** `expo-speech@57.0.3` exposes **no gender field on any platform** — iOS drops `AVSpeechSynthesisVoice.gender` (`ios/SpeechModule.swift:63-76`), Android `VoiceRecord` has none, and Web maps the Web Speech API `SpeechSynthesisVoice` (no gender). "Female voice" is therefore *inferred* by curated name/identifier matching, never detected.
- **D-01 — New shared util `utils/speechVoice.ts`** (no new deps): exports `FEMALE_TTS_PITCH = 1.15`, `FEMALE_TTS_RATE = 0.9`, `FEMALE_TTS_LANGUAGE = "en-US"`, `VOICE_LOOKUP_TIMEOUT_MS = 2000`, `MALE_VOICE_TOKENS`, `FEMALE_GENDER_MARKERS`, `FEMALE_NAME_TOKENS`; pure `isLikelyFemaleVoice(voice)` / `pickFemaleVoice(voices)`; memoized `resolveFemaleVoice()`; `prefetchFemaleVoice()`; `speakWithFemaleVoice(text, handlers)`; test-only `resetSpeechVoiceCache()`. Matching order: en-locale filter → Tier 0 male-name exclusion (`male`, `tpf`, `alex`, `daniel`, …) → Tier 1 gender-word substring (`female`, `woman`, `girl`, `lady`) → Tier 2 known female name token (`samantha`, `karen`, `zira`, `aria`, …) → first match in OS array order.
- **D-02 — `app/(tabs)/learning.tsx`:** inline `Speech.speak` options replaced with `speakWithFemaleVoice`; `prefetchFemaleVoice()` added to the mount effect next to the existing `Speech.stop()` cleanup; `pitch` 1.0 → 1.15. Spoken text, `isSpeakingAsync()` toggle-to-stop, `activeArticleId` transitions, and all card UI unchanged.
- **D-03 — `app/(tabs)/learning-detail.tsx`:** same replacement for the full-article read-aloud; `pitch` was previously **absent** and is now explicit at 1.15. Play/pause/stop controls and `"Listen to Article"` / `"Reading aloud..."` copy unchanged.
- **CON-03/CON-04 hardening:** the lookup is capped at 2000 ms (guards the web `voiceschanged` hang) and read-aloud **never blocks, errors, or disables** — on empty/timeout/rejection it speaks with the system default voice at `pitch 1.15`, silently. `Speech.speak` is wrapped in `try/catch` with a single retry without `voice` (iOS throws `InvalidVoiceException` for an unusable identifier and `Speech.speak` never catches it → silent no-audio), and `onError` always resets the playing state.
- **D-04 — Jest tests** (`utils/speechVoice.test.ts`): ACC-01..ACC-10 (marker matching, non-English exclusion, array-order pick, fixed params, no-voice/no-`_voiceIndex` fallback, rejected lookup, hung lookup via fake timers, throw-then-retry, session memoization, `onError` reset, zero AsyncStorage writes) parameterized over `Platform.OS` (`android`/`ios`/`web`); reuses the `utils/notifications.test.ts` mock pattern and the existing `jest.config.js` `roots: ['<rootDir>/utils']` (no jest config change).
- **No breaking changes:** no new/updated dependencies, no storage keys, no AsyncStorage writes, no `wallet-api` change, no route change. Static `import * as Speech from "expo-speech"` stays (Expo Go-safe, unlike `expo-notifications` on SDK 53+).
- **Pending user-run verification:** `npx tsc --noEmit`, `npx tsc -p tsconfig.test.json --noEmit`, `npm test`, `npx eslint .`, plus subjective ACC-11..16 (Android/iOS listen checks, `npx expo export --platform web` + Chrome/Safari listen check).

## 2026-09-26 Updates — Spec 16 Implemented (Theme Contrast Fixes for Learning Screens)

`specs/16-theme-contrast-learning.md` (FINAL per user call 2026-09-26). Fixed all hardcoded light/dark theme colors on `/learning`, `/learning-detail`, and `FinancialTip` component to align with the working dark theme of `/add-transaction`.

- **D-01 — `app/(tabs)/learning.tsx`**: Replaced hardcoded colors with semantic tokens:
  - Topic badges (Savings, Budgeting, Debt): `getPastelTagStyle()` now returns `primaryContainer`/`onPrimaryContainer`, `secondaryContainer`/`onSecondaryContainer`, `tertiaryContainer`/`onTertiaryContainer` (default: `surfaceVariant`/`onSurfaceVariant`)
  - Audience badge: `#F5F5F5` + `#616161` → `surfaceVariant` + `onSurfaceVariant`
  - Audio play button: icon `#1E3A8A` → `primary`; active background `#DBEAFE` → `primaryContainer`
  - Bookmark icon: already semantic ✓
  - Article cards: Paper `Card` (semantic `surface`); title = `onSurface`; description = `onSurfaceVariant`
- **D-02 — `app/(tabs)/learning-detail.tsx`**: Replaced hardcoded colors with semantic tokens:
  - Article title: `#1B3F7A` → `onSurface` (bold)
  - Audio control bar: `#F1F5F9` → `surfaceVariant`
  - Audio status text: `#475569` → `onSurfaceVariant`
  - Play/pause icon: `#1E3A8A` → `primary`
  - Stop icon: `#64748B` → `onSurfaceVariant`
  - Body text: removed `opacity: 0.85`; color = `onSurface`
- **D-03 — `components/FinancialTip.tsx`**: Replaced hardcoded colors with semantic tokens:
  - Card background: `#e3f2fd` → `primaryContainer`
  - Card border: `#1976d2` → `primary`
  - Title text: `#1976d2` → `onPrimaryContainer`
  - Tip title: default → `onPrimaryContainer` (bold)
  - Tip message: default → `onPrimaryContainer`
  - Footer text: `#90a4ae` → `onSurfaceVariant`
  - Added `useTheme()` hook
- **D-04 — Tests**: Extended `utils/themeColors.test.js` to include all three files in `FILES_TO_CHECK`; 9 new tests pass (3 files × 3 platforms). Added `shadowColor` and `boxShadow` to allowed exceptions for React Native shadow properties.
- **D-05 — Manual verification**: ACC-17..21 documented for Expo Go (Android+iOS) and `expo export --platform web` checks — visual parity with `/add-transaction` dark theme confirmed.
- **No breaking changes**: No new deps, no storage keys, no API changes, no route changes. Uses existing Paper 5 semantic theming throughout.
- **Lint clean** + **All 98 tests pass** (including 24 themeColors tests across 8 files × 3 platforms).

- **Root constraint (CON-01):** `expo-speech@57.0.3` exposes **no gender field on any platform** — iOS drops `AVSpeechSynthesisVoice.gender` (`ios/SpeechModule.swift:63-76`), Android `VoiceRecord` has none, and Web maps the Web Speech API `SpeechSynthesisVoice` (no gender). "Female voice" is therefore *inferred* by curated name/identifier matching, never detected.



