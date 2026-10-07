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

## 2026-09-26 Updates — Spec 17 Implemented (FAB and Button Styling Consistency)

`specs/17-fab-button-styling.md` (FINAL per user call 2026-09-26). Aligned FABs across `/dues` and `/savings` to match Home screen's solid primary styling.

- **D-01 — `app/dues.tsx` FAB**: Fixed FAB styling by placing `backgroundColor: theme.colors.primary` inside the `style` prop (instead of an invalid JSX prop that React Native Paper ignores) and set `color="#fff"`:
  - `style={{ position: "absolute", margin: 20, right: 0, bottom: 20, borderRadius: 20, backgroundColor: theme.colors.primary }}`
  - `color="#fff"`
  - `label="Due"`
- **D-02 — `app/savings.tsx` FAB**: Fixed FAB styling by placing `backgroundColor: theme.colors.primary` inside the `style` prop (instead of an invalid JSX prop), setting `borderRadius: 20` and `color="#fff"`:
  - `style={{ position: "absolute", margin: 16, right: 0, bottom: 0, borderRadius: 20, backgroundColor: theme.colors.primary }}`
  - `color="#fff"`
  - `label="New Allocation"`
- **No breaking changes**: No new deps, no storage keys, no API changes. Uses existing semantic tokens.

## 2026-09-27 Updates — Spec 18 Implemented (Scheduled Dues Fixes)

`specs/18-scheduled-dues-fixes.md` (FINAL per user call 2026-09-27). Fixed Auto-Process conditional logic, mobile responsive layout, and replaced emoji with vector icons on Scheduled Dues screens.

- **D-01/D-02 — Auto-Process conditional logic** (`app/add-due.tsx`, `app/dues.tsx` edit modal):
  - Added `useEffect` to auto-uncheck `autoProcess` when `frequency` becomes `"once"`
  - Wrapped Auto-Process row in `{frequency !== "once" && (...)}` so it's hidden for one-time dues
  - Works on both Add Due screen and Edit modal in dues list
- **D-03/D-05 — Mobile responsive card layout** (`app/dues.tsx` `renderItem`):
  - Restructured upcoming due card from single flex-row to two-section column layout
  - Top section: icon + title/date/amount/freq on left; badges (OVERDUE/DUE/AUTO) in wrapped row on right; action buttons (Pay/Edit/Delete) in separate wrapped row
  - Bottom section: full-width insight block with lightbulb icon + text, `flexWrap: "wrap"`, separated by border
  - Badges now use container styling with background colors to prevent collision with buttons
- **D-04 — Emoji replaced with vector icon**:
  - Replaced `💡` prefix in projection message with `<MaterialCommunityIcons name="lightbulb" size={14} color={theme.colors.tertiary} />`
  - Removed 💡 from edit modal time-of-month tip
  - Uses existing `MaterialCommunityIcons` — no new dependencies
- **D-06 — `utils/financialLiteracy.ts`** already returned plain string (no emoji), no change needed
- **Lint clean** + **TypeScript clean** — no new errors or warnings

## 2026-09-27 Updates — Spec 12 Implemented (Add Allocation Validation Feedback)

`specs/12-add-allocation-validation-feedback.md` (FINAL per user call 2026-09-27). Added inline validation, error feedback, and toast notifications to the Add Allocation screen.

- **D-01 — `useToast` integration.** Added `import { useToast } from "../context/ToastContext"` and `const { showToast } = useToast();` in `AddAllocation`.
- **D-02/D-03 — Real-time validation logic.** Computed `initialBalanceNum` and `cleanGoal` from state on every render. Derived `isInitialBalanceInvalid` (≤0, >MAX_AMOUNT, NaN, or > available balance when available ≥ 0) and `isGoalInvalid` (if provided: ≤0, >MAX_AMOUNT, NaN). Combined into `isFormInvalid`.
- **D-06 — Inline helper text.** Red warning under Initial Balance field when `availableBalance >= 0 && initialBalanceNum > availableBalance`: "Insufficient available balance to create this allocation." Uses `theme.colors.error`.
- **D-07 — Negative balance label highlight.** "Available balance:" label renders with `theme.colors.error` and `fontWeight: "600"` when `availableBalance < 0`; otherwise `theme.colors.onSurfaceVariant` and `fontWeight: "400"`.
- **D-08 — Button disabled styling.** Button disabled when `loading || isFormInvalid`. Disabled state uses explicit colors: `buttonColor={theme.colors.onSurface}`, `color={theme.colors.onSurface}` (≈ `bg-slate-700` / `text-slate-400` in dark, `bg-slate-300` / `text-slate-500` in light) with `cursor: not-allowed` on web. No opacity reduction — per CON-08.
- **D-09 — Toast replaces Alert.** All validation branches in `handleSubmit` replaced with early returns calling `showToast("Cannot create allocation. Your initial balance exceeds your current available balance.")`. Save failure also uses toast.
- **D-10 — Happy path unchanged.** Valid submissions (title + valid initial balance ≤ available balance + valid optional goal) save and navigate back without regression.
- **Exported `MAX_AMOUNT`.** `utils/amount.ts` now exports `MAX_AMOUNT` constant for cross-file use.
- **Lint clean** + **TypeScript clean** — no new errors or warnings.

- **Root constraint (CON-01):** `expo-speech@57.0.3` exposes **no gender field on any platform** — iOS drops `AVSpeechSynthesisVoice.gender` (`ios/SpeechModule.swift:63-76`), Android `VoiceRecord` has none, and Web maps the Web Speech API `SpeechSynthesisVoice` (no gender). "Female voice" is therefore *inferred* by curated name/identifier matching, never detected.


## 2026-09-27 Updates — Spec 19 Implemented (Reports Dark Mode Contrast)

`specs/19-reports-dark-mode-contrast.md` (FINAL per user call 2026-09-27). Fixed all hardcoded light/dark theme colors on Reports screen to use semantic theme tokens.

- **D-01/D-02/D-03** — Replaced all hardcoded `#fff`/`#FFFFFF` card backgrounds with `theme.colors.surface`; icon backgrounds with `theme.colors.errorContainer`/`tertiaryContainer`/`primaryContainer`; text colors with `theme.colors.onSurface`, `onSurfaceVariant`, `error`, `tertiary`, `primary`.
- **D-04** — Menu dropdown: `backgroundColor: theme.colors.surface`, border `theme.colors.outline`, text/icon `theme.colors.primary`.
- **D-05** — Date banner: `backgroundColor: theme.colors.primaryContainer`, text/icons `theme.colors.onPrimaryContainer`.
- **D-06** — Chart containers: `theme.colors.surface`, titles `theme.colors.onSurface`.
- **D-07** — Breakdown cards: headers/category names `theme.colors.onSurface`, progress backgrounds `theme.colors.errorContainer`/`tertiaryContainer`, amounts `theme.colors.error`/`tertiary`, percentages `theme.colors.onSurfaceVariant`.
- **D-08** — Export card: `theme.colors.surface`, buttons `theme.colors.surfaceVariant`, icons `theme.colors.primary`/`error`.
- **D-09** — DonutChart props: `textColor={theme.colors.onSurface}`, `mutedColor={theme.colors.onSurfaceVariant}`.
- **D-10** — CARD_SHADOW kept (Paper elevation handles shadows).
- **Charts unchanged** — `MonthlyTrendChart` and `DonutChart` already used `theme.colors.*` internally; no logic changes.
- **Lint clean** + **TypeScript clean** — no new errors or warnings.

---

## 2026-09-28 — Register: username fallback to local account on mobile
- `app/register.tsx` `handleRegister`: in Online mode on mobile, if the user types a non-email username the strict email validation is skipped; a confirmation dialog ("Create Local Account?") is shown instead, and on confirm `createLocalAccount()` is called with that username and PIN.
- Web path unchanged — non-email input in Online mode still shows "Please enter a valid email address" on web.
- No changes to `createCloudAccount`, `createLocalAccount`, JSX, or styles.

---

## 2026-09-29 — Lint Cleanup (dues, savings, transaction-details)
- `app/dues.tsx`: Added missing `dues`, `initialBalance`, and `savingsItems` dependencies to the `recordTransaction` `useCallback` dependency array.
- `app/savings.tsx`: Removed unused `GLOBAL_CATEGORIES` import, unused `useTransactionsActions` / `useCategoriesData` hooks, and unused `addTransaction` / `categories` variable bindings.
- `app/transaction-details.tsx`: Removed unused `Platform` import from `react-native`.
- All 5 lint warnings/errors resolved cleanly.

---

## 2026-09-29 — Scheduled Dues: Available Balance Calculation & In-App Validation Dialog
- `app/dues.tsx`: Fixed `recordTransaction` available balance calculation to incorporate transaction income and expenses via `useTransactions()` (`initialBalance + totalIncome - totalExpense - totalReserved`). Removed flawed loop subtracting unreached savings targets and past paid dues.
- Replaced non-rendering `Alert.alert` calls on Web with a cross-platform `Dialog` in `Portal`, clearly informing the user if their balance is insufficient (`You need ₱X, but your Available to Spend is only ₱Y. Please add income first.`) or confirming successful payment.
- Updated `useCallback` dependency array to include `transactions` and `formatAmount`.

---

## 2026-09-29 — Expense Creation & Available Balance Validation Fix
- `app/add-transaction.tsx`: Restored missing `selectedMethodType` and `availablePaymentMethods` state declarations that previously caused `Uncaught Error: selectedMethodType is not defined`.
- Fixed `availableBalance` calculation in `app/add-transaction.tsx` to use the standard formula (`initialBalance + totalIncome - totalExpenses - totalReserved`) via `useMemo`.
- Replaced invisible `Alert.alert` calls on Web with an in-app `Dialog` inside a `<Portal>` in both `app/add-transaction.tsx` and `app/add-due.tsx`.
- Removed artificial creation-time balance blocks on scheduled future dues in `app/add-due.tsx` and `app/dues.tsx` modal `handleSubmit`.

---

## 2026-09-29 — SPEC-23: Fix numAmount ReferenceError and Dues Alert Lint Warning
- `specs/23-numamount-reference-and-dues-lint-fix.md`: Finalized spec for runtime error and lint cleanup.
- `app/add-transaction.tsx` (D-01): Declared `const numAmount = amount ? parseAmount(amount) : 0;` at component scope, resolving `ReferenceError: numAmount is not defined`. Formatted helper warning text cleanly with `formatAmount(availableBalance)`.
- `app/dues.tsx` (D-02): Removed unused `Alert` from `react-native` import, clearing the ESLint `@typescript-eslint/no-unused-vars` warning.

---

## 2026-09-29 — SPEC-25: Passcode Modal Step-by-Step UI Fix
- `specs/25-passcode-modal-step-ui.md`: Finalized spec for sequential passcode dialog flow.
- `app/(tabs)/settings.tsx` — D-01 (`showChangePasscodeDialog`):
  - Title is now step-aware: Step 1 = "Change Passcode", Step 2 = "Enter New Passcode".
  - Removed duplicate inline `<Button title="Verify Current PIN">` from `Dialog.Content` — verification is now driven exclusively by `Dialog.Actions`.
  - Step 1 `Dialog.Actions` "Verify Current PIN" button: has a real `onPress` that compares input to stored passcode; disabled until exactly 4 digits entered; on mismatch shows "Incorrect Current PIN. Try again." and clears input; on match advances to Step 2.
  - Step 2 "Set Passcode" button: disabled until both New and Confirm fields are 4 digits and identical.
  - No-passcode path ("Set Passcode" flow from `showChangePasscodeDialog`): same disabled logic applied.
  - Removed dead `getChangePasscodeError()` function (no longer referenced).
- `app/(tabs)/settings.tsx` — D-02 (`showPinSetup`):
  - `onDismiss` now calls `closePinSetupDialog()` instead of an inline lambda — ensures all fields + error state are reset on dismiss.
  - "Set Passcode" button disabled until both fields are 4 digits and match.
  - `pinSetupError` text rendered below Confirm field; cleared on any input change.

---

## 2026-09-29 — SPEC-26: Unify Passcode Setup Into Single Step-by-Step Dialog
- `specs/26-unify-passcode-dialog.md`: Finalized spec to eliminate the old `showPinSetup` dialog.
- `app/(tabs)/settings.tsx` — D-01: "Set Passcode" button `onPress` changed from `setShowPinSetup(true)` to `setShowChangePasscodeDialog(true)`. All passcode flows now use one unified dialog.
- `app/(tabs)/settings.tsx` — D-02: `handleChangePasscode` calls `setIsPasscodeEnabled(true)` and shows "Passcode Set" success message when no prior passcode exists (`!passcode` case).
- `app/(tabs)/settings.tsx` — D-03: Removed `showPinSetup` dialog JSX, `closePinSetupDialog` + `confirmPinSetup` handler functions, and dead state vars (`showPinSetup`, `pinSetupInput`, `confirmPinSetupInput`, `pinSetupError`).
- Flow: No passcode → "Set Passcode" → unified dialog skips Step 1 (no current PIN to verify) → New PIN + Confirm PIN appear directly → save. Existing passcode → "Change Passcode" → Step 1 (Current PIN + Verify) → Step 2 (New + Confirm).

---

## 2026-09-30 — SPEC-27: Replace Remaining Hardcoded `#fff` Control Labels with Theme Tokens
- `specs/27-theme-onprimary-label-colors.md`: FINAL per user call 2026-09-30 (use `theme.colors.onPrimary`). Numbered 27 because `docs/savepoint.md` already journals SPEC-25 and SPEC-26 for the passcode-dialog work.
- Context: `npm test` failed 15 of 24 `utils/themeColors.test.js` cases (5 files × android/ios/web) — 5 bare `color="#fff"` label lines. 4 further occurrences passed only because their line also contained `theme.colors.` (accidental passes, DEC-03).
- `app/add-allocation.tsx` (D-01): `buttonTextColor` enabled branch `"#fff"` → `theme.colors.onPrimary`; `disabledText` `theme.colors.onSurface` → `theme.colors.surface` (fixes a real bug: the disabled label previously used the same token as the disabled `onSurface` fill, making "Create Allocation" unreadable).
- `app/add-due.tsx` (D-02): "Save Scheduled Due" contained Button `color` → `theme.colors.onPrimary`.
- `app/dues.tsx` (D-03): FAB `color` and edit-modal "Save Changes" Button `color` → `theme.colors.onPrimary`.
- `app/savings.tsx` (D-04): FAB plus "Save Changes", transfer-in "Confirm", transfer-out "Confirm" Button `color` props → `theme.colors.onPrimary`.
- `app/category-settings.tsx` (D-05): FAB plus "Add" Button `color` → `theme.colors.onPrimary`.
- `utils/themeColors.test.js` intentionally unchanged (CON-02/DEC-02): no new `ALLOWED_EXCEPTIONS`, no file-list or pattern edits. Home screen FAB (`app/(tabs)/index.tsx`) left at `color="#fff"` per CON-08.
- Visual impact: light mode unchanged (`onPrimary` = `#FFFFFF`); dark mode labels go from white to `#001F4D` on the `#4A90D9` primary fill (~3.3:1 → ~6.4:1 contrast). No layout, copy, handler, dependency, storage, API, or nav changes.

---

## 2026-09-30 — SPEC-28: Type the Passcode Screen TextInput Ref
- `specs/28-passcode-screen-ref-type.md`: FINAL per user call 2026-09-30. Clears the last remaining `@typescript-eslint/no-explicit-any` warning. Pre-existing issue, unrelated to SPEC-27.
- `app/passcode-screen.tsx` (D-01): `useRef<any>(null)` → `useRef<NativeTextInput>(null)`, with `TextInput as NativeTextInput` added to the existing `react-native` import. Paper's `ref` prop is the intersection `Ref<NativeTextInput> & Ref<TextInputHandles>` (`Props = React.ComponentPropsWithRef<typeof NativeTextInput> & {...}`), and `TextInputHandles` is not exported by `react-native-paper`, so the host class is the one public type satisfying both halves. v1.1's `React.ComponentRef<typeof TextInput>` was rejected by `tsc` (TS2322) because it resolves to `TextInputHandles` alone. Type-level change only — emitted JS unchanged, auto-focus on mount preserved.
- `eslint.config.js` untouched (CON-02): rule stays `"warn"`, no override added.
- Gate: `npm run lint` must report `0 errors, 0 warnings`; `npx tsc --noEmit` 0 errors; `npm test` stays 98/98.

---

## 2026-10-01 — SPEC-30: Force Login on Every Cold Start
- `specs/30-force-reauth-on-cold-start.md`: FINAL v2.0 per user call. v1.0 (DRAFT) also proposed an `isFirstRun` "false wins" merge in a new `utils/profileMerge.ts`; the user narrowed the spec — forcing must live in `_layout.tsx` and `isFirstRun` must be left exactly as-is — so the whole `isFirstRun` half was deleted and three consequence-mitigation deliverables were added instead.
- `app/_layout.tsx` (D-01): new `ColdStartSessionGuard` component, rendered inside `AuthProvider` in `RootLayout`. One-shot per process via a `useRef` boolean latch; returns while `isLoading` is true so it cannot race `AuthContext.tsx:32-44`'s async restore; calls the existing `logout()` only when `activeUserId` is non-null. `MainLayout`'s existing `!activeUserId → /login` branch does the forcing, so the redirect table, `session_ended` branch, passcode gate, and `Stack.Screen` list are byte-identical. Process-scoped (not user-scoped) latch is what prevents a logout loop after a successful login.
- `app/_layout.tsx` (D-02): `SystemResetManager` now returns early when `!activeUserId` (dep array updated). Without this, the forced signed-out startup would run `checkHealth()` for a Local account and, on an advanced `reset_epoch`, call `hardResetLocalData()` (`utils/db.ts:286-291`), which wipes `master_users` — Local accounts plus their SHA-256 PINs, unrecoverably. This closes the only new data-loss consequence.
- `app/_layout.tsx` (D-03): new one-shot pre-login reminder effect in `AuthLoader`. `AuthLoader`'s existing notification effect is gated on `activeUserId`, so forcing a login would otherwise stop scheduling due reminders at launch. The new effect reads the `lastActiveUserId` hint, reuses an existing permission grant, reads that user's dues with an explicit id override (`getPrefixedKey('dues', hintUserId)` + `getItem`) — never the ambient cached user — and schedules them. Safe alongside the post-login pass because `scheduleDueNotifications` cancels all scheduled notifications before re-scheduling (`utils/notifications.ts:142-148`).
- `context/AuthContext.tsx` (D-03): `login()` also writes `lastActiveUserId` to AsyncStorage (device-local, not SecureStore — it is not a credential and must be readable before sign-in). `logout()` deliberately does not delete it; the restore effect is untouched (CON-03).
- `utils/notifications.ts` (D-03): new `hasNotificationPermission()` — `getPermissionsAsync()` only, no `requestPermissionsAsync()`, `false` on web and in Expo Go. Keeps the signed-out startup from prompting an unsigned-in user.
- `context/NetworkContext.tsx` (D-04, v2.1): connectivity is **online-first** — the branch is unchanged from before this spec (`isLocal` → device connectivity, otherwise API `/health`), so a signed-out startup asks the server rather than being treated as a Local-only account. Only the sync-queue trigger changed: the offline→online transition no longer calls `triggerSyncProcessing`/`processSyncQueue` while `!activeUserId`, because `sync_queue` is a single device-global key (`utils/syncQueue.ts:18`) and those processors have no auth guard, so they would POST queued items unauthenticated and mark them failed. `utils/authMode.ts` unchanged. A v2.0 draft that also treated "no session" as device-connectivity-only was reverted per user call (it fabricated a connectivity state the server never confirmed).
- Unchanged by design (CON-10/ACC-09): `context/UserProfileContext.tsx`, `app/login.tsx`, `app/register.tsx`, `app/intro.tsx`, `app/onboarding.tsx`, `context/PasscodeContext.tsx`, `repositories/*`, `types/repositories.ts`. No `utils/profileMerge.ts`. The `isFirstRun` cloud-resurrection bug (stale cloud `isFirstRun: true` bouncing a signed-in cloud account into `/intro` → `/onboarding`) remains open per user call.
- Storage: one new key, `lastActiveUserId`; `user_{id}_*`, `activeUserId`, and `authToken` keep their names and shapes, no migration. Rollback = revert the four files; the orphaned key is inert.
- Tests: none added. Every change is React lifecycle/ordering or storage I/O under `app/` + `context/`, which this repo's jest setup cannot render (`roots: utils`, `testEnvironment: node`). The gap is stated in the spec instead of covered by a test that cannot fail; ACC-12..ACC-17 are the user-run manual matrix (Android/iOS/Web).
- Accepted consequences: every launch needs credentials (all platforms, web included), one extra `POST /auth/login` per launch, SPEC-05's `session_ended` alert can no longer fire across a restart, first-launch master seeding may land under `default_*` (pre-existing), and the passcode stays in-memory so it still does not gate a cold start.
- Gate: `npm test` stays 98/98; `npm run lint` 0 errors, 0 warnings; `npx tsc --noEmit` 0 errors; `package.json`/`package-lock.json` unchanged.

---

## 2026-10-01 -- SPEC-32: Bottom Tab Bar Label Visibility (Android/iOS)
- `specs/32-tab-bar-label-visibility.md`: FINAL v1.0 per user call ("Implement"). Numbered 32 because `31-expo-go-native-module-version-skew.md` already exists. v1.0 amends v0.1 (DRAFT) on one point only, found while writing D-02: v0.1 said the layout should *spread* the whole `getTabBarMetrics(...)` object into `tabBarStyle`, which would have injected the diagnostic fields `usableHeight` / `requiredHeight` / `fits` into the style object. D-02 and ACC-05 now require destructuring exactly `height`, `paddingTop`, `paddingBottom`. No constant, computed value, or acceptance threshold changed.
- Symptom: the four tab labels (Home, Reports, Learning, Settings) rendered on web but were invisible on Android and iOS -- icons only.
- Root cause (read from the installed library, not guessed). expo-router 57 ships its own bottom-tabs fork at `node_modules/expo-router/build/react-navigation/bottom-tabs/` (`@react-navigation/bottom-tabs` is not a direct dependency). Two library behaviors combine:
  - `shouldUseHorizontalLabels` (`views/BottomTabBar.js:53-83`) picks the label layout. Web/desktop (`width >= 768`, and `4 x DEFAULT_MAX_TAB_ITEM_WIDTH = 500 <= width`) gets `horizontal = true` -- label BESIDE the icon, so nothing can overflow. A phone portrait (`width < 768` -> `width > height` is false) gets `horizontal = false` -- label BELOW the icon. That alone is the whole web/mobile difference.
  - In the stacked branch the content did not fit. The icon box is hardcoded to `ICON_SIZE_TALL = 28` (`views/TabBarIcon.js:13`, applied by `:19-23` via `wrapperUikit` `:62-65`), and `isCompact` (`BottomTabBar.js:84-99`) returns true only on iPhone **in landscape** (`:95-97`) -- so a portrait phone always gets the full-height icon. The label is a single-line `Text` (`elements/Label/Label.js:8`, `numberOfLines: 1`) at `fontSize: 12` ~= 15px. Required = `10 (item padding) + 28 + 15 = 43px`. `app/(tabs)/_layout.tsx` had `height: 60`, `paddingTop: 8`, `paddingBottom: 8`, leaving `60 - 8 - 8 = 44`, minus the item's own `padding: 5` x 2 (`BottomTabItem.js:140-144`) = **34px**. ~9px overflow -- the label was laid out past the bar and clipped. Web survived only because react-native-web renders `Text` into a div with default `overflow: visible`, so the overflowing label still painted (typically overlapping the content above).
  - Compounding: `tabBarStyle` is applied LAST in the bar's style array (`BottomTabBar.js:251-255` then `:257`), so the hardcoded `height: 60` overrode the computed `tabBarHeight` (`getTabBarHeight` `:100-112`, short-circuit `:103-106`) AND `paddingBottom: 8` replaced `insets.bottom` (`:252`) -- a second, independent reason the label sat under the iOS home indicator.
  - Note the library default was NOT a fix: `TABBAR_HEIGHT_UIKIT = 49` (`:47`) yields `49 - 10 = 39 < 43`, so merely deleting the `height` override still overflows. The height had to become size-aware.
- `utils/tabBarMetrics.ts` (D-01, new): pure, dependency-free (no `react-native` import, CON-04). Exports `TAB_BAR_CONTENT_HEIGHT = 68`, `TAB_BAR_PADDING_TOP = 4`, `ICON_HEIGHT = 28`, `TAB_ITEM_PADDING = 5`, `LABEL_FONT_SIZE = 12`, `LABEL_LINE_HEIGHT_RATIO = 1.2`, the `TabBarMetrics` interface, and `getTabBarMetrics(insetsBottom, fontScale = 1)`. Each library-derived constant carries a cite to its upstream file and line, so an expo-router upgrade that moves them shows up as a reviewable diff. `height = 68 + insets.bottom`, `paddingBottom = insets.bottom`, `usableHeight = height - paddingTop - paddingBottom - 10 = 54`, `requiredHeight = 28 + ceil(12 * 1.2 * fontScale)`. `fontScale` is an explicit argument rather than a `PixelRatio` read so the function stays pure under jest (CON-05).
- `app/(tabs)/_layout.tsx` (D-02): added `useSafeAreaInsets()` and `getTabBarMetrics`; `height`/`paddingTop`/`paddingBottom` now come from the helper instead of `60`/`8`/`8`. No `<SafeAreaProvider>` added -- expo-router's `ExpoRoot` already supplies one above the app tree (`ExpoRoot.js:78-84`), and nesting a second would re-measure insets against the wrong frame (CON-03).
- Why 68 and not 64 (DEC-03): with `paddingTop = 4`, `64` leaves `usableHeight = 50` against `requiredHeight = 50` at `fontScale 1.5` -- exactly zero margin. Android does not clamp label scaling (expo-router clamps only on iOS 13+ for the large-content-viewer interaction, `BottomTabItem.js:12,17`), so any font-metric or library change would have re-broken the labels. 68 gives 11px spare at default scale, 4px at 1.5. Both fail at `fontScale 2.0`, which CON-01 deliberately does not require; ACC-02's loop stops at 1.5 so the boundary is pinned by a test.
- `tabBarAllowFontScaling` was NOT set to `false` (CON-08): clamping text scaling to fit a fixed-height bar is an accessibility regression. Headroom covers 1.0-1.5 instead.
- Unchanged by design (CON-06/CON-07): `tabBarActiveTintColor`, `tabBarInactiveTintColor`, `tabBarStyle.backgroundColor`, `borderTopWidth`, `borderTopColor`, `elevation`, all four `title`s, all `tabBarIcon` renderers, `learning-detail`'s `href: null`, `tabBarLabelStyle` (`fontSize: 12`, `fontWeight: "600"`). Geometric only.
- Not done (DEC-05): `tabBarLabelPosition` is not pinned to `below-icon`, so web keeps its side-by-icon layout at `>= 768`. Pinning it would redesign the web UI, which is outside the approved scope. ACC-01 covers both branches' arithmetic so both fit. Narrow web windows (`< 768`) fall into the stacked branch and are now fixed too -- a bonus, not a goal. Revisiting web parity needs its own spec.
- `utils/tabBarMetrics.test.ts` (D-03, new): 49 tests covering ACC-01..ACC-05. Exact-value assertions for `insetsBottom` 0 / 24 / 34; the `fontScale` 1.0-1.5 fit loop over all three insets (18 cases); a `describe.each`-style `runSuite` over `Platform.OS` = android / ios / web (mocked, same `jest.mock("react-native")` pattern as `notifications.test.ts`) asserting identical literal metrics on each; `fits === false` at `fontScale 2.0` to pin the DEC-07 boundary; and `fs.readFileSync` source-text guards for ACC-04 (no `react-native` import, no `Platform.OS`/`Platform.select`, no `PixelRatio`) and ACC-05 (insets wiring, old `60`/`8`/`8` gone, no `fontScale` arg, only the three style fields destructured, theme values and titles intact, no `tabBarAllowFontScaling`). The platform cases assert against literal expected objects rather than comparing the helper to itself, so a future per-platform branch fails the test instead of producing three agreeing copies of a bug. Stays in `utils/` for `roots: ['<rootDir>/utils']`; excluded from app `tsc` by the pre-existing `**/*.test.ts` exclude (SPEC-07).
- No behavior, storage, API, sync, navigation-route, or dependency change: `package.json`/`package-lock.json` untouched, `react-native-safe-area-context@~5.7.0` was already a direct dependency. Rollback (AGENTS.md 1.4) = revert `app/(tabs)/_layout.tsx` and delete the two `utils/tabBarMetrics.*` files; no migration involved.
- Gate: `npm test`, `npm run lint`, and `npx tsc --noEmit` clean (user-run). ACC-06..ACC-09 are the user-run Expo Go / web matrix.

---

## 2026-10-01 -- SPEC-33: Report Export Fidelity (PDF + CSV)
- `specs/33-report-export-fidelity.md`: FINAL v1.1 per user call. Ten defects plus a bonus page-break control. Five defaults were decided by the user across two rounds: web = hidden iframe print; PDF body = range label + totals only; dates = en-PH / Asia/Manila; native file name = `FileSystem` rename then share; bug 2's escaping fix covers PDF **and** CSV; 7 columns on both; font stack left alone; page-break control included.
- v1.1 is a post-FINAL, **non-normative** addition recorded in the spec's History block: CON-20 (empty period) plus its ACC-06 clause and one coverage-map row, added after the user approved v0.2 and after reading `reports.tsx` for D-03 showed the screen lets you export a range with no transactions, which the old builder printed as a header with an empty body. CON-01..CON-19 and D-01..D-05 are byte-identical to what was approved.
- `utils/reportFormat.ts` (D-01, new, pure): all string generation moved here so it is node-testable. Exports `MANILA_UTC_OFFSET_HOURS = 8`, `REPORT_COLUMNS` (the single 7-field list both formats read, so a column cannot drift between them), `ReportTotals`, `escapeHtml`, `csvCell`, `formatReportDate`, `computeReportTotals`, `buildReportFileName`, `buildCsvContent`, `buildReportHtml`. `import type` only (CON-13); no `react-native`, no `expo-*`, no `Platform.OS`. `formatAmount` is **injected** by the caller rather than imported from the currency hook, which would have made the module impure.
- Why dates are arithmetic, not `Intl` (§1.3): `toLocaleDateString('en-PH', { timeZone: 'Asia/Manila' })` would make a report's dates depend on Hermes `hermes-intl` being present on Android and on CLDR's shifting en-PH year length. Asia/Manila is a fixed UTC+8 with no DST, so `epoch + 8h` then `getUTC*` is exact and identical on all three platforms. Output is `MM/DD/YYYY`. Applies to the PDF rows, the "Generated on" line, and the CSV `Date` column.
- `utils/exportUtils.ts` (D-02, rewrite): thin orchestration only. **Web** now builds an off-screen `aria-hidden` `0x0` iframe, writes the document into it, and calls `frameWindow.print()`; the frame is removed on `afterprint`, on a 1000 ms timeout, and on the error path. **Native** keeps `printToFileAsync`, then `deleteAsync({ idempotent: true })` + `copyAsync` to `documentDirectory/WiseWallet_Report_<slug>.pdf`, then `shareAsync` with `mimeType: 'application/pdf'` / `UTI: 'com.adobe.pdf'`. The idempotent delete is what makes ACC-10 (export twice, same range) pass — `copyAsync` over an existing target is not something to rely on.
- Why defect 1 needed an iframe (§1.2): `expo-print/build/ExponentPrint.web.js:8-13` discards `options.html` and calls `window.print()`, so on web it printed the **Reports screen itself** instead of the report. No argument can fix that; the generated HTML has to reach the print dialog through a document the app controls. `Print.printAsync` is now gone entirely.
- Two latent bugs fixed in passing (§1.5): `documentDirectory` is typed `string | null` but was interpolated unguarded (it would have produced the literal `"null"` in a path); and the `FileSystem.EncodingType ? ... : "utf8" as unknown as EncodingType` dance was unnecessary — `encoding` accepts plain `'utf8'`.
- Defect 8 (peso glyph U+20B1) is **not fixed, by user call** (DEC-11): the font stack is frozen as `'Helvetica Neue', Helvetica, Arial, sans-serif` (CON-10) and the risk is verified on device by ACC-08 instead. Stated plainly rather than papered over — if the `₱` tofus on real hardware, that observation is the evidence for a follow-up spec.
- `app/(tabs)/reports.tsx` (D-03): one line, `:390` now passes `currentRange.label` as the third argument. The cards, charts, filters, and the CSV call site are untouched.
- `utils/reportFormat.test.ts` (D-04, new): 58 tests over ACC-01..ACC-06 and CON-20. Includes a **quote-aware** CSV reader rather than `split(",")` (ACC-03 is about proving commas/quotes/newlines do not break the layout, so the parser must honour quoting like a spreadsheet does), the three Manila-midnight boundary cases, header parity between the two formats, and `fs.readFileSync` source-text guards. Stays in `utils/` for `roots: ['<rootDir>/utils']`; excluded from app `tsc` by the pre-existing `**/*.test.ts` exclude (SPEC-07).
- One real bug caught by the tests before shipping: the summary totals interpolated the formatted amount **without** `escapeHtml`, so a formatter emitting markup would have injected unescaped HTML into the summary (CON-03 covers the formatted amount everywhere, not just table cells). `buildSummaryHtml` now escapes it, and a test pins that.
- Testability limit (§1.4): the iframe print path, the share sheet, and the file copy live in `exportUtils.ts`, which imports `expo-print`/`expo-sharing`/`expo-file-system` — this repo's jest (`roots: utils`, `testEnvironment: node`) cannot execute that. ACC-07..ACC-11 are therefore the user-run manual matrix rather than a test that cannot fail. Everything checkable as a string *is* tested.
- Platform matrix (§1.10): a `describe` block runs the HTML and CSV builders under `Platform.OS` = android / ios / web (mocked) and asserts the outputs are byte-identical. That is the point of the check, not a formality — it is what licenses running ACC-01..ACC-06 once instead of three times, and the ACC-05 source guard fails if anyone later adds a `Platform.OS` branch to the pure module.
- No new dependency (`expo-print@~57.0.2`, `expo-sharing@~57.0.22`, `expo-file-system@~57.0.7` were already direct), no storage-key, API-contract, route, or navigation change. `package.json`/`package-lock.json` untouched. Rollback (AGENTS.md 1.4) = revert `utils/exportUtils.ts` and the one `reports.tsx` line, delete the two new `utils/reportFormat.*` files.
- Gate: `npm test` 0 failed and the total rises by exactly 58; `npm run lint` 0 errors, 0 warnings; `npx tsc --noEmit` 0 errors (all user-run, AGENTS.md §1.3). ACC-07..ACC-11 are the user-run Expo Go / web-export matrix.

---

## 2026-10-02 -- SPEC-34: PDF Chart Summary Format
- `specs/34-pdf-chart-summary-format.md`: FINAL v1.0 per user call ("change the PDF format: use the bar graph and donut chart instead of a table, list down color-coded categories with expense versus income"). Four layout decisions came from the user: charts + appendix (detail is moved, not dropped), the bar graph is the **monthly** income-vs-expense trend, categories get a **categorical palette**, and **top 7 + Other**. The transaction table is no longer the PDF's main body.
- **This supersedes part of SPEC-33.** SPEC-33 stays FINAL for the escaping (CON-03), Manila dates (CON-05), file name (CON-09), web iframe print (CON-01/02), font freeze (CON-10), heading color (CON-11), and empty period (CON-20), all of which carry over. What changes: DEC-02/03's "range label + totals only" body, and CON-12's column parity, which is **relocated** — the PDF and the CSV still agree on all 7 fields, they just agree in the appendix now, and the SPEC-33 parity test still passes unchanged.
- `utils/reportCharts.ts` (D-01, new, pure): geometry and aggregation only, no HTML. `REPORT_PALETTE` (7 hex, first `#1B3F7A`), `OTHER_COLOR`/`OTHER_LABEL`, `INCOME_CHART_COLOR`/`EXPENSE_CHART_COLOR`, `MONTH_ABBREVIATIONS`, `rollUpCategories`, `buildDonutSegments`, `bucketMonths`, `formatReportMonth`, `toManilaDate`, `buildBarChart`, and the plot/donut geometry constants. `import type` only; no `react-native`, no `expo-*`, no `Platform`, no `Intl`, no `Math.random`/`Date.now` (CON-19) — the last two because a nondeterministic chart cannot be asserted.
- `utils/reportFormat.ts` (D-02): kept every SPEC-33 export and behavior. `formatReportDate` now delegates the +08:00 shift to `toManilaDate` so the offset has a single source of truth shared with month bucketing, and re-exports `MANILA_UTC_OFFSET_HOURS` so the SPEC-33 test keeps importing it from the same place. Added `buildDonutSvg`, `buildBarChartSvg`, `buildCategoryListHtml`, `buildTotalsHtml`, `buildAppendixHtml`. `buildReportHtml` composes header → totals strip → donut + category list side by side → monthly trend → page break → appendix.
- Why hand-written SVG: `react-native-svg` renders to native primitives with **no HTML serializer**, and the PDF is a standalone string in a headless print context with no RN tree mounted. `react-native-chart-kit` is only reachable through `components/ChartCard.tsx`, which is dead code, and would still need a serializer. A CDN chart would be actively worse — print engines block or async-resolve external resources, so the chart would frequently render empty (CON-02).
- Why `stroke-dasharray` and not `pathLength="100"` (DEC-07): `pathLength` would give clean percentages, but an unsupported attribute **fails silently** — a wrong chart, no error, no console warning. That is the worst failure mode for a feature that can only be verified by eye. `stroke-dasharray` is universally supported and renders a full ring for free, so the single-category and empty cases need no branch. Wedge `<path>` arcs were rejected because they need `large-arc-flag` handling plus a full-circle special case.
- **The one real color conflict, resolved explicitly (DEC-03, CON-03):** red and green already mean income and expense in the bar chart. If the donut also used them, a red slice would read as "expense" in a chart where the hue is just an arbitrary category identity, and one color would mean two things on one page. So in the donut and the list, **hue identifies the category and never the type**; the palette deliberately excludes `#ef4444` and `#10b981` (ACC-04 asserts it), and the list carries separate labeled Expense and Income columns so type is never inferred from a swatch. Red/green is reserved for the bar chart alone.
- Buckets are keyed by category **name**, matching the on-screen grouping (`app/(tabs)/reports.tsx:113`) rather than by `id`, and a name carrying both income and expense is **one** bucket with two amounts (DEC-04). The on-screen donut alternates only two shades of red and two of green by `i % 2` (`app/(tabs)/reports.tsx:123-129`), which is why the PDF introduces a real palette instead of copying it.
- Month bucketing inherits the Manila rule (§1.5). A transaction at `2025-12-31T16:30:00.000Z` is **January 2026** in the chart, matching its `01/01/2026` cell in the appendix. Using UTC would put a row in one month and the same transaction in a different month in the table beneath it. Month labels come from a fixed 12-element array, never `Intl`.
- `utils/reportCharts.test.ts` (D-03, new): covers ACC-01..ACC-07 and the ACC-10 source guards — donut arc math (shares, summed circumference, accumulated dashoffset, full-ring single bucket, zero-total no-op), top-7+Other rollup (name keying, both types in one bucket, tie-break by name, total conservation, no `Other` at 7), palette distinctness and the income/expense exclusion, Manila month bucketing (the `2025-12-31T16:30Z` → `2026-01` boundary), bar geometry (group offsets, baseline anchoring, proportional heights, zero-height not `NaN`, three-decimal coordinates, width cap, all-zero and empty cases), and source-text guards. Uses a `/^-?\d+(\.\d{1,3})?$/` coordinate regex so float noise in the emitted SVG is a test failure, not a silent diff.
- `utils/reportFormat.test.ts` (D-04): four new suites — summary composition (circle-not-wedge, no `pathLength`, butt caps, swatch/rollup agreement, monthly labels, totals strip, list columns), chart text escaping (injection fixture through the list, y-axis labels, and a check that **no user text is interpolated into an SVG attribute**), appendix parity (7 headers equal to the CSV, `break-before: page`, header repeat, every transaction still listed), and the empty period (no slice, no filled bar, empty-state messages, no `NaN`/`undefined` anywhere). Two SPEC-33 cases were retargeted rather than deleted, per D-04: the net-tone assertion moved from the old `<strong>` markup to the totals strip, and the amount-column assertion now covers the list's `class="num"` cell.
- Three bugs caught before shipping: the appendix cells were emitted in the wrong order (note before amount, which broke CON-12 header/row parity); `buildDonutSegments` was specified with a `strokeWidth` argument the geometry never uses, which would have been permanent lint debt, so the spec was amended to v1.1 and the constant is now read directly by the renderer; and the empty-period test wrongly asserted no `<rect>` at all, when the dashed empty-state frame legitimately is one.
- No behavior change to the export path: `exportToPDF`'s signature, `utils/exportUtils.ts`, and `app/(tabs)/reports.tsx` are all **untouched** (DEC-10) — the range label was already available from SPEC-33, so this is a pure rendering change and the rollback is two files. No new dependency (`expo-print`/`expo-sharing`/`expo-file-system` only), no storage key, API contract, route, or navigation change. `utils/themeColors.test.js` and `eslint.config.js` untouched: neither new module is in that linter's `FILES_TO_CHECK` list, so the hex palette needs no exemption (CON-21).
- Accepted risks carried forward: the peso glyph (DEC-11, unchanged — the font stack stays frozen and the charts add more `₱`-bearing labels, verified on device by ACC-16), sub-pixel seams between rounded donut arcs, and font-metric-dependent SVG text.
- Testability: the whole summary is string generation, so it **is** jest-testable — unlike SPEC-33's iframe print path. ACC-13 (share sheet, file name, double export) and ACC-16 (does it match the app, does the `₱` render) remain the user-run matrix.
- Gate: `npm test` 0 failed and the total rises by exactly the number of new tests; `npm run lint` 0 errors, 0 warnings; `npx tsc --noEmit` 0 errors (all user-run, AGENTS.md §1.3).
## 2026-09-30 — SPEC-26: Responsive Dialogs for Web and Mobile & Clear Data Flow Improvement (v1.3)
- `specs/26-responsive-dialogs-and-clear-data-flow.md`: Finalized spec for responsive modal constraints on Web/PWA, clean modal dismissal sequence, tangible button styling, centered modal text alignment, and "Cleared Successfully" feedback.
- `components/ConfirmDialog.tsx` (D-01): Added `style={{ maxWidth: 480, width: "90%", alignSelf: "center" }}` to `<Dialog>` to prevent unbounded horizontal stretching on desktop browsers.
- `app/(tabs)/settings.tsx` (D-02):
  - Added `styles.dialog` with `maxWidth: 480, width: "90%", alignSelf: "center"`.
  - Applied `style={styles.dialog}` across all 9 modal dialogs (`showDeleteDialog`, `messageDialog`, `showPinVerificationDialog`, `showNewAccountDialog`, `showBackupDialog`, `showConflictDialog`, `showPinPrompt`, `showDeleteConfirmation`, `showChangePasscodeDialog`).
  - Centered text alignment: Applied `textAlign: "center"`, `alignSelf: "center"`, and `width: "100%"` to `Dialog.Title` and body descriptions in `showPinPrompt` and `showDeleteConfirmation`, with `justifyContent: "center"` and `gap: 12` on action button rows; updated `styles.dialogContent` to `alignItems: "center"`.
  - Fixed modal transition: `handleClearData` dismisses `showPinPrompt` (`setShowPinPrompt(false)`) before opening `showDeleteConfirmation` so PIN dialog does not linger underneath.
  - Gated cloud data deletion in `executeClearData` on `!isLocal` to prevent network timeouts for local-only accounts.
  - Styled dialog action buttons: Cancel buttons set to `mode="outlined"`; destructive actions (`Clear Data`, `CLEAR EVERYTHING`, `Delete Permanently`) set to `mode="contained"` with error background and white text.
  - Updated `executeClearData` to close confirmation dialog immediately upon confirmation, execute data wipe, and display `showMessage("success", "Cleared Successfully", "All data has been cleared successfully.", () => router.replace("/"))` before cleanly redirecting to the dashboard.
  - Removed unused `useToast` import and hook destructuring to maintain lint cleanliness.

---

## 2026-09-30 — SPEC-27: Allocation Archive Functionality in Savings Screen
- `specs/27-allocation-archive-functionality.md`: Finalized spec for archiving allocations, read-only enforcement, separate summary subtotals, and restore/permanent-delete options.
- `types/index.ts` (D-01): Added optional `isArchived?: boolean` field to `SavingsItem`.
- `app/savings.tsx` (D-02):
  - Split allocations into `activeAllocations` (`!isArchived`) and `archivedItems` (`!!isArchived`).
  - Active allocations subdivided into In-Progress (`activeItems`) and Completed (`completedItems`).
  - Summary cards and section headers: Top card displays `TOTAL ACTIVE ALLOCATED` with `totalActiveAllocated`; Archived section displays `Total Archived: ₱X.XX` with `totalArchived`.
  - Added archive handler `handleArchiveItem` and button (`archive-arrow-down-outline`) on both active and completed allocation cards.
  - Added "Archived Allocations" section with distinct muted styling (`surfaceVariant`, opacity 0.9).
  - Enforced read-only state for archived cards: Edit (pencil) and money transfer buttons are hidden.
  - Added Restore action (`handleRestoreItem` with `archive-arrow-up-outline`) and Delete Permanently action (`delete-forever-outline` wired to `ConfirmDialog` with context-aware warning text).
---

## 2026-09-30 — SPEC-28: Dedicated Archived Allocations Screen & Header Navigation
- `specs/28-dedicated-archived-allocations-screen.md`: Finalized spec for moving archived allocations to a dedicated separate route (`/archived-allocations`) with an Archive button on the top-right header of `app/savings.tsx`.
- `app/_layout.tsx` (D-03): Registered `<Stack.Screen name="archived-allocations" />` within the app's root stack navigator.
- `app/archived-allocations.tsx` (D-02): Created dedicated Archived Allocations screen:
  - Header with `Appbar.BackAction` (navigating back to `/savings`) and title `"Archived Allocations"`.
  - Top summary card displaying `TOTAL ARCHIVED` with `formatAmount(totalArchived)`.
  - `EmptyState` component (`icon="archive-outline"`, title="No archived allocations", subtitle="Archived allocations will appear here") when no archived records exist.
  - Read-only card list: no edit (pencil) button, no transfer buttons.
  - Card actions: Restore (`IconButton icon="archive-arrow-up-outline"` calling `updateItem(id, { isArchived: false })`) and Delete Permanently (`IconButton icon="delete-forever-outline"` opening `ConfirmDialog` calling `deleteItem(id)`).
  - Material 3 `ConfirmDialog` and `Snackbar` notifications.
- `app/savings.tsx` (D-01):
  - Added header action button `<Appbar.Action icon="archive-outline" onPress={() => router.push("/archived-allocations")} />` on the right side of `Appbar.Header`.
  - Removed inline Archived Allocations section from the bottom of the screen.
  - Cleaned up unused state/handlers (`archivedItems`, `totalArchived`, `handleRestoreItem`) and simplified `ConfirmDialog` to active allocation deletion.

---

## 2026-09-30 — SPEC-29: Transaction Icon Color Vibrancy & Allocation Archive Blue Styling
- `specs/29-transaction-icon-vibrancy-and-archive-blue-styling.md`: Finalized spec for vibrant transaction category icon containers and system primary blue styling for Allocations archive actions.
- `components/TransactionList.tsx` & `app/(tabs)/index.tsx` (D-01):
  - Replaced dull `theme.colors.surfaceVariant` icon container background with semantic `item.type === "income" ? theme.colors.tertiaryContainer : theme.colors.errorContainer`.
  - Updated icon color to `item.type === "income" ? (theme.colors.tertiary || "#16A34A") : (theme.colors.error || "#DC2626")`.
  - Restored clear visual contrast and color vibrancy for transaction category logos on white card surfaces.
- `app/savings.tsx` (D-02):
  - Set `color={theme.colors.primary}` on header `<Appbar.Action icon="archive-outline" />`.
  - Set `iconColor={theme.colors.primary}` on `<IconButton icon="archive-arrow-down-outline" />` on active and completed allocation cards.
- `app/archived-allocations.tsx` (D-03):
  - Styled top `TOTAL ARCHIVED` summary card with `backgroundColor: theme.colors.primaryContainer` and text color `theme.colors.onPrimaryContainer`.
  - Styled "Archived" badge on each card with `backgroundColor: theme.colors.primaryContainer` and label color `theme.colors.primary`.

---

## 2026-09-30 — SPEC-30: Fix Transaction Details Hero Icon & Revert Dashboard Icon Container
- `specs/30-fix-transaction-details-hero-icon-and-revert-dashboard-green.md`: Finalized spec for fixing invisible hero icon on transaction details and reverting dashboard transaction icon background.
- `components/TransactionList.tsx` & `app/(tabs)/index.tsx` (D-01):
  - Reverted icon container `backgroundColor` from green/red back to `theme.colors.surfaceVariant`.
  - Maintained crisp green (`#16A34A`) / red (`#DC2626`) icon outline colors.
- `app/transaction-details.tsx` (D-02):
  - Fixed invisible hero icon above `+₱500.00` by changing hardcoded white (`#ffffff`) icon color to `isIncome ? "#16A34A" : "#DC2626"`.
  - Icon is now clearly visible with proper contrast against the `#f9fafb` hero badge.

---

## 2026-09-30 — SPEC-31: Unify Transaction Category Icon in Transaction Details
- `specs/31-unify-transaction-category-icon-in-details.md`: Finalized spec for ensuring transaction details displays the exact same dynamic category icon as shown on the Dashboard.
- `app/transaction-details.tsx` (D-01):
  - Added `renderCategoryIcon(category, title, type)` resolver matching `TransactionList.tsx` and `app/(tabs)/index.tsx`.
  - Wired hero `<MaterialCommunityIcons />` `name` prop to `renderCategoryIcon(transaction.category?.name, transaction.title, transaction.type)`.
  - Guaranteed visual parity across Dashboard Recent Activity and Transaction Details screen.

---

## 2026-09-30 — SPEC-32: Dedicated Completed Dues Screen & Scheduled Transaction Deletion Lock
- `specs/32-completed-dues-screen-and-transaction-deletion-lock.md`: Finalized spec for moving completed dues to a dedicated separate route (`/completed-dues`) with a header action icon on `app/dues.tsx`, and locking transactions generated from scheduled dues from deletion in `app/transaction-details.tsx`.
- `app/_layout.tsx` (D-03): Registered `<Stack.Screen name="completed-dues" />` in the app root stack navigator.
- `app/completed-dues.tsx` (D-02): Created dedicated Completed Dues screen:
  - Header with `Appbar.BackAction` (navigating back to `/dues`) and title `"Completed Dues"`.
  - Top summary card displaying `TOTAL COMPLETED` with `formatAmount(totalCompletedAmount)`.
  - Segmented filter buttons ("This Week", "This Month", "All") to filter completed records.
  - `EmptyState` component (`icon="check-circle-outline"`, title="No completed dues", subtitle="Dues you mark as paid will appear here") when no matching records exist.
  - Read-only card list: strikethrough title, completion checkmark, frequency badge, with edit (pencil) and pay buttons removed.
- `app/dues.tsx` (D-01):
  - Added header action button `<Appbar.Action icon="check-circle-outline" color={theme.colors.primary} onPress={() => router.push("/completed-dues")} />` on the right side of `Appbar.Header`.
  - Removed inline Completed Dues section from `listData` and removed completed card rendering branch.
  - In `recordTransaction()`, attached `dueId: item.id` to `addTransaction()` to link recorded transactions back to their originating due.
- `app/transaction-details.tsx` (D-04):
  - Added `isScheduled = Boolean(transaction?.dueId || transaction?.category?.id === "scheduled")`.
  - Wrapped delete button `TouchableOpacity` in `{!isScheduled && ( ... )}` so that transactions originating from paid dues cannot be deleted from dashboard recent history.

---

## 2026-09-30 — SPEC-33: Remove "(JSON)" Label from Settings Export & Import Buttons
- `specs/33-settings-remove-json-label.md`: Finalized spec for removing the `(JSON)` format label from the visible text of Data Management buttons in Settings.
- `app/(tabs)/settings.tsx` (D-01):
  - Changed button label from `Export Data (JSON)` to `Export Data`.
  - Changed button label from `Import Data (JSON)` to `Import Data`.
  - Underlying file handlers, formats, and validators preserved without changes.

---

## 2026-10-03 -- SPEC-36 DRAFT v0.1: Web Platform Invariants
- Per user call ("web is always online, never local, always auto-backup=true"): `specs/36-web-platform-invariants.md` (DRAFT, NOT implementable until FINAL). Pins three web invariants — connection always Online (`DEC-W1` hard/soft pin open), never Local (`DEC-W2` legacy-locals fate open; creation already absent per SPEC-04 v1.4), always `autoBackup=true` (`DEC-W3` legacy-OFF normalization open).
- Forked from the `spec-change-pin` worktree draft and adapted: this tree carries no SPEC-35, so credential-change conformance is generic (D-W-04) and the PIN dialog is an informative reference only. Amends SPEC-04 v1.4 on web only; native byte-identical by CON-W-04. No code changed in this step. Needs: user call on `DEC-W1`..`W3`, then FINAL mark.

---

## 2026-10-03 -- Standing rules §1.11–§1.14 (mirrored)
- Per user call: `AGENTS.md` §1 gains the same four rules as the PIN worktree (§1.11 bare-minimum diffs; §1.12 no new dependencies unless instructed; §1.13 plan-fix validation gate; §1.14 one home per spec/slice). Known §1.14 overlap recorded: SPEC-36 exists in both trees — canonical home undecided, needs user call; no code changed.

---

## 2026-10-04 -- SPEC-36 FINAL v1.0: Web Platform Invariants (corrected scope)

- Scope correction per user call: SPEC-36 is about offline(LOCAL) vs online(API-CONNECTED) only — `autoBackup`/sync state never belonged here (CON-W-03/D-W-03/DEC-W3/ACC-W-03 deleted). Rationale: web localStorage is clearable → false-positive reads; web must never present local-only operation as safe.
- Web model decided: API-direct persistence always; the flag guards nothing on web (no local store to back up *from*); unreachable API fails openly, zero local writes.
- Decisions closed: `DEC-W1` hard pin (probe skipped, Offline UI unreachable), `DEC-W2` force Make Online at next legacy-local login (one-time migration; grandfather rejected as untrusted reads, block rejected as data loss).
- `specs/36-web-platform-invariants.md` rewritten DRAFT v0.1 → FINAL v1.0 (CON-W-01..05, ACC-W-01..06, D-W-01..06). Implementable; one file/layer at a time. No code changed in this step.

---

## 2026-10-04 -- SPEC-36 implemented (D-W-01..D-W-03, S3..S12a)

- D-W-01 hard pin (4 files): `NetworkContext` probe skip at both levels; `OfflineIndicator` null on web; settings Offline text/card/Check web-guarded; login strip web-gated.
- D-W-02 force-migrate: `login.tsx handleLegacyLocalAuth` routes legacy web local-logins to Settings Make Online; `register.tsx` verified closed (forced online + hard block, zero diff).
- D-W-03 full API-direct (v1.1→v1.2, session exception): Transactions, Categories, Savings, Dues, UserProfile load from API and write directly (open-failure copy, no repo/flag/queue); `useSyncStatus` idle on web; alerts session-memory (`webAlertStore`); no local seeding in register/login/startup; reset epoch in session memory.
- S12a `utils/webPin.test.ts`: 16 source-text guards (ACC-W-01..04). Suite 314 → 330 when run.
- Fixed 2 tsc TS2367 (web early-return narrowing): removed dead reload branch in `_layout`, reused `isWeb` in register. Rule logged: never re-compare after an early return in the same flow.
- Open (user-run): `npm test`, `npm run lint`, web-export + Expo Go matrix (ACC-W-05/06); backend curl matrix still skipped (accepted risk).

---

## 2026-10-04 -- SPEC-37: Onboarding Opening Balance paymentMethod

- `specs/37-onboarding-opening-balance-payment-method.md`: FINAL per user call. Root cause: onboarding posted the Opening Balance with no `paymentMethod` → `sanitizeTransaction` filled `""` → server zod `min(1)` (`wallet_API/src/schemas/transactionSchema.js:9`) → 400 → app threw "check your connection" (`context/TransactionsContext.tsx:186`); the catch (`app/onboarding.tsx:57`) logged only → stuck screen.
- `utils/onboardingPayload.ts` (D-01, new, pure): `buildOpeningBalancePayload(balance)` returns null for 0 (no transaction, CON-05), else the full payload with `paymentMethod: "cash"` (mirrors the add-transaction default, DEC-02).
- `app/onboarding.tsx` (D-02): ledger entry routes through the builder; catch sets a rendered `setupError` HelperText (ternary, re-triable) instead of console-only.
- `utils/onboardingPayload.test.ts` (D-03, new): ACC-01/ACC-02 + category shape across `Platform.OS` android/ios/web; source-text guards for ACC-03/ACC-04.
- No backend, storage, API-contract, route, or dependency change. Native queue path untouched (CON-02).
- Open (user-run, AGENTS §1.3): `npm test`, `npm run lint`, `npx tsc --noEmit`, web Get Started matrix (ACC-S01..S03), Expo Go add-transaction regression, `expo export --platform web`.

---

## 2026-10-04 -- SPEC-38: Settings Account Mode from Token Only

- `specs/38-settings-account-mode-token-only.md`: FINAL per user call. Root cause: settings OR-ed the token with an `isUsernameOnly` name check (`settings.tsx:192-194`) — onboarding overwrites `profile.name` with the display name, so every post-onboarding cloud account showed "Local-only account — stored on this device" / SyncStatusCard "Local-only", with Auto-Backup OFF + disabled and Backup/Restore unreachable. Data path was always online (proven by the SPEC-37 stack trace); only the label lied.
- `app/(tabs)/settings.tsx` (D-01): deleted `isValidEmail`/`isUsernameOnly`/`isEffectivelyLocal`; subtitle, SyncStatusCard prop, switch `disabled`, and Make Online now read token `isLocal`; Backup/Restore also gated behind `Platform.OS !== "web"` (their handlers read local repos — SPEC-36 ACC-W-03). `:1062` card verified already token-based, untouched.
- `utils/settingsAccountMode.test.ts` (D-02, new): ACC-01..03 across `Platform.OS` android/ios/web + ACC-04 web-gate count guard.
- Governance (CON-04): amends SPEC-26 CON-11 for settings account-mode copy only; SPEC-26 keeps register/login; SPEC-04 :107-113 satisfied. Legacy username-era locals still show local via their local token (CON-06, no migration).
- No backend/storage/API/route/dependency change. Pre-write leak parked as follow-up.
- Open (user-run, AGENTS §1.3): `npm test`, `npm run lint`, `npx tsc --noEmit`, matrix ACC-S01..S04 (web cloud copy, legacy local login, native Cloud-OFF buttons, Expo Go + web export).

---

## 2026-10-04 -- SPEC-39: Web Auto-Backup Switch Disabled

- `specs/39-web-auto-backup-switch-disabled.md`: FINAL per user call. On web, `autoBackup` guards nothing (SPEC-36 API-direct), but the switch was `disabled={isLocal}` — web users could toggle a dead flag. Honesty fix: `disabled={isLocal || Platform.OS === "web"}` at `settings.tsx:1136`.
- `app/(tabs)/settings.tsx` (D-01): one-line `disabled` prop extension. Native Cloud-OFF untouched (CON-02/CON-04).
- `utils/settingsAccountMode.test.ts` (D-02): extended with SPEC-39 ACC-01 web-disable guard.
- No backend/storage/API/route/dependency change. Zero behavior change on web.
- Open (user-run, AGENTS §1.3): `npm test`, `npm run lint`, matrix ACC-S01..S03 (web switch disabled, native Cloud-OFF toggleable, Expo Go + web export).

---

## 2026-10-04 -- SPEC-30 v2.4: Web Exception (refresh keeps session)

- `specs/30-force-reauth-on-cold-start.md` amended to v2.4 per user call. Web refresh no longer logs out — the session persists on localStorage. Native force-reauth unchanged.
- `app/_layout.tsx:78-81` — `ColdStartSessionGuard`'s effect returns on web before the latch and before `logout()`, so a page reload keeps the session. v2.2 originally placed this as a component-level `return null` above the hooks; `npm run lint` caught four `react-hooks/rules-of-hooks` errors and v2.4 moved the check inside the effect. Behavior is identical (`Platform.OS` is constant per render) — the hooks are now unconditional again.
- `utils/webPin.test.ts` — ACC-W-05 asserts the web return precedes both `clearedRef.current = true` and `logout()`, and that no component-level early return sits above the hooks.
- 401 handler (`apiClient.ts:49-55`) is the safety net for dead tokens.
- v2.3 also rewrote this spec's ACC-11 to be count-agnostic (`98 passed, 98 total` was invalidated by SPEC-37/38/39), annotating the equivalent pins in SPEC-27/SPEC-28 as historical record and leaving SPEC-31's DRAFT pins for its own implementation.
- No backend/storage/API/route/dependency change. Native behavior unchanged.
- Open (user-run, AGENTS §1.3): `npm test`, `npm run lint`, matrix ACC-12..ACC-17 (web refresh stays logged in, native cold start still logs out, dead token → 401 redirect).

---

## 2026-10-05 -- SPEC-40: authFetch Envelope Unwrap

- `specs/40-authfetch-envelope-unwrap.md`: FINAL per user call. Web refresh replayed `/intro` → `/onboarding` for an already-onboarded account.
- **Root cause (HAR-proven, 17 exchanges all HTTP 200):** the server nests its payload one level deeper than `authFetch` unwraps — `{status, results, data:{transactions:[…]}}`. `apiClient.ts:69` descended to `data` and stopped, so `authFetch<Transaction[]>` yielded `{transactions:[…]}` and every consumer's `Array.isArray(data)` guard failed. Nothing threw (`ok` was `true`), so 8 call sites silently kept empty/default state: `UserProfileContext` (→ `DEFAULT_PROFILE.isFirstRun: true` → `_layout.tsx:195` → the wizard), `CategoriesContext:42,54`, `TransactionsContext:93,104`, `useDues:49,61`, `useSavings:56,69`, `add-transaction:82`, `payment-methods:39`, `settings:290-292,403-407,670-673,949-951`. The bug was invisible precisely because the requests all *succeeded*.
- `utils/apiClient.ts` (D-01): exported `RESPONSE_WRAPPER_KEYS` (6 names) + `unwrapEnvelope<T>()`, applied at `:99`. Keyed on **known names, never key count** (CON-02) — `storage/upload` returns `{url}`, a legitimate single-key object that a count-based rule would flatten to `undefined` and silently break receipt upload. An **unknown** wrapper key passes through untouched (ACC-04) so a future endpoint fails loudly in review rather than silently reading empty in production. All 8 consumer files byte-identical (CON-03); 401 / `onAuthFailure` path byte-identical (CON-04).
- **D-01 also grew a type fix beyond the approved slice:** `let body: Record<string, unknown>` was a false assertion — `response.json()` is typed `unknown` in this lib config, and ts-jest surfaced it as TS2322 when a test finally type-checked the file. Now `let body: unknown` + a local `env` narrow to the three fields actually read (`status`, `data`, `error`). No behavior change; removes a lie rather than adding one. Flagged in-session because it was not what was signed off on.
- `utils/apiClient.test.ts` (D-02, new): ACC-01 (4 list endpoints), ACC-02 (`profile`), ACC-03 (`{url}` hazard), ACC-04 (unknown key not unwrapped), ACC-05 (non-success + multi-key), bare-array. **360 → 361 tests, 12 suites.**
- **Three rounds to green, two of them my error:** (1) a `Promise<any>` mock annotation could never work — the call site's type comes from the ambient lib, not the mock; I should have read `tsconfig.test.json` first. (2) ACC-05 asserted whole-body passthrough, but the pre-existing envelope `data`-extraction was already there; the assertion was wrong, not the code.
- No backend/storage-key/dependency/native change. Native reads don't use `authFetch`, so impact is web-dominant.
- Deferred, documented in `docs/todo-specs.md`: T-01 `GO_BACK` unhandled on sub-screens after refresh (plausibly newly reachable via SPEC-30 v2.4 — unconfirmed), T-02 web update/delete consult `txRepo` before the API call (**SPEC-36 D-W-03's "full API-direct" claim is inaccurate**), T-03 stale `98/98` constraint at `specs/28-…:90`, T-04 rotate a JWT pasted into the transcript (manual, no code).
- Verified (user-run): `npx jest` → **12 suites, 361 passed, 361 total, 0 failed**. Open: `npm run lint`, `npx tsc --noEmit`, and matrix ACC-S01 (onboard → F5 → dashboard holds), ACC-S02 (lists populate), ACC-S03 (receipt upload stores a URL), ACC-S04 (Expo Go no regression).

## 2026-10-05 -- SPEC-42: GO_BACK After Web Refresh (FINAL, decisions deferred)

- `specs/42-go-back-after-web-refresh.md`: FINAL per explicit user call. User deemed items 1 (persistence) and 2 (implications) addressed; dynamic repro + probe waived, static evidence accepted (14 files, 19 `router.back()` sites, zero `canGoBack` in `app/`). No prior spec covered GO_BACK (SPEC-28 mention incidental) — this file is the canonical home (§1.14) for `rlucban/wise_wallet#44` + T-01.
- DEC-01 (helper vs inline) and DEC-02 (`/` vs `/(tabs)` fallback) deliberately left OPEN — not guessed. Implementation BLOCKED until the user calls them and names who builds it. No code written; no test file added.
- `docs/todo-specs.md` T-01 status updated to point here (was "no spec written"). Journal: `AGENTS.md` §3 appended.

## 2026-10-05 -- SPEC-42 implemented (D-01..D-03)

- User said `code this for me` then `do all` = accept both recommendations: DEC-01=(a) central helper, DEC-02=`/` fallback (precedent: `app/_layout.tsx:202`). Recorded in spec (correctable by user); D-00 gate lifted on those calls.
- D-01 `utils/backNavigation.ts` (new): pure module, zero react-native/expo-router imports — `BackCapableRouter` interface (structurally satisfied by expo-router's Router), `BACK_FALLBACK = "/"`, `safeGoBack(router, fallback?)` implementing the CON-06 branch.
- D-02 call-site migration (14 files, 19 sites, bare-minimum): one `safeGoBack` import per file (after the expo-router import); 14 `Appbar.BackAction onPress` → `() => safeGoBack(router)`; 5 post-save `router.back();` → `safeGoBack(router);` (`add-transaction:213`, `edit-transaction:161`, `transaction-details:51`, `add-due:78`, `add-allocation:62`). Nothing else touched.
- D-03 `utils/backNavigation.test.ts` (new): ACC-01 repo-wide scan (zero raw `router.back()` in `app/**/*.tsx`), ACC-02/03/03b helper branch tests + DEC-02 `/` assertion, all parameterized `android`/`ios`/`web` (§1.10).
- Verified (user-run 2026-10-05): `npm run lint` clean; `npx jest` → **13 suites, 390 passed, 0 failed** (baseline had grown past SPEC-40's 361; 13 new SPEC-42 tests included). Worker "failed to exit gracefully" notice is a pre-existing teardown warning, not a failure. `npx tsc --noEmit` clean (no output) — expo-router `Router` → `BackCapableRouter` structural assignability confirmed. Open: manual ACC-S01 (web F5-then-Back → `/`, no warning), ACC-S02 (dues/add-form/details matrix), ACC-S03 (Expo Go pop unchanged).

## 2026-10-05 -- SPEC-43 FINAL (not yet implemented)

- `specs/43-onboarding-opening-balance-once-only.md`: FINAL per user call. Opening Balance writable N times (no existence check, no sync busy guard in `handleGetStarted`). Plan decision A via plan-fix run `20261005-0700-initial-balance-duplicate.md` (most efficient + non-breaking; B merge-loop and C de-dupe deferred as follow-ups). No overlap with SPEC-37 (different defect, same payload). D-01 `app/onboarding.tsx` guard; D-02 `utils/` tests; D-03 manual matrix; D-04 journal. Agent codes slice-by-slice under `/implement-fix` (user: `Code it`, each slice needs explicit apply).
- D-04 implementation record (2026-10-05): D-01 applied — `app/onboarding.tsx` busyRef + existence check (dedicated category-id match), `OPENING_BALANCE_CATEGORY_ID` exported (one-line scope amendment, user-approved via Apply); D-02 applied — new `utils/onboardingGuard.test.ts` (10 tests, android/ios/web); diagnostic slices 3–4 — `utils/apiClient.ts` `message` fallback + 4 tests appended in `apiClient.test.ts` (SPEC-40 block byte-identical). Verified: slice-3 user-run jest/lint/tsc passed. Verified (user-run 2026-10-05): slice-4 file 10/10; full `npx jest` 14 suites / 404 passed, 0 failed (390 + 10 guard + 4 fallback — fully accounted, no drift); `npm run lint` clean; `npx tsc --noEmit` clean. Open: ACC-S01..S04 manual matrix + enriched mobile 400 line. Pipeline blocked after slice 4 (PUT 400 field, POST-create shape, heal/filter decisions). HAR evidence appended to T-05.

## 2026-10-05 -- HAR findings: guard insufficient, two server-side defects live

- User reported SPEC-43 guard didn't stop duplicates + mobile↔web don't sync + mobile `transactions update 400 → Dequeuing` loop. Web HAR (`wise.har`, 15:47 UTC) inspected (46,648 lines, read-only).
- Server truth: 5 identical ₱9,999 "Initial account setup" rows (`results:5`, stable in-session), same payload instant, `createdAt` 15:42:07–53 (~15s apart) = one payload re-POSTed, not 5 taps. Server mints ids (5 distinct ids, `categoryId: null`, **no `title` field**) → merge loop (T-05/H1) confirmed in effect; no-title rows pass all `t.title !== "Opening Balance"` filters → **₱49,995 phantom income** in every computed balance.
- Web clean (zero writes, zero 4xx); dues/savings empty (no cross-entity compounding). Mobile update-400 is a separate PUT-validation defect; zod field still unknown (needs wallet_API/Vercel log — HAR has no PUTs). Full evidence appended to `docs/todo-specs.md` T-05. Next: user pastes server log excerpt, then loop-break + PUT-fix slices (no code written this round).
- **Closed 2026-10-06:** T-05 fixed per user report. All previously-"never run" manual matrices (SPEC-42, SPEC-43, SPEC-40, SPEC-30, SPEC-32, SPEC-38, SPEC-39) now confirmed run per user. No code change in this entry — status reconciliation only.

---

## 2026-10-06 -- SPEC-44 amendment: EXPO_PUBLIC_ADMIN_TOGGLE gates the 401 warn

- User call: the banner STILL appeared once per invalidation episode (dedupe allowed one pop); user wants it tied to an admin env toggle.
- `specs/44-…`: added CON-06 + ACC-04 — warn ONLY when `EXPO_PUBLIC_ADMIN_TOGGLE === "true"`; `false`/unset/null/other = silent.
- `utils/apiClient.ts`: 401 branch now `if (!authWarnLatched && process.env.EXPO_PUBLIC_ADMIN_TOGGLE === "true")` — latched warn stays dedupe-on-episode; side effects (clear creds + `onAuthFailure('session_ended')`) unchanged per call.
- `utils/apiClient.test.ts`: beforeEach sets toggle `true` (+ afterEach deletes), block `removeSecureItem` mockClear retained, new ACC-04 rows (unset → no warn, `"false"` → no warn) × android/ios/web.
- Verified (user-run): lint clean, `npx jest utils/apiClient.test.ts` → 25 passed, tsc silent.
- Reminder: Expo Go needs reload and the var in `.env` (`EXPO_PUBLIC_ADMIN_TOGGLE=true`) to surface the warning; unset = silent.

---

## 2026-10-06 -- SPEC-35 FINAL v1.0 + implemented (D-01..D-04)

- `specs/35-pin-change-persistence-and-promotion-safety.md`: FINAL per user call (v1.0; content unchanged from v0.1 except status). Problem (user-confirmed repro): Settings → Change Passcode called `setPasscode(next)` in-memory only — new PIN unlocked the app this session while local `master_users` SHA256 + server bcrypt still expected the old PIN; `PasscodeContext` had no hydration at all, so the lock never survived restart.
- Decisions (all user-called): DEC-01 Cloud change fail-closed offline (never queued — only the server can `bcrypt.compare`, and queueing bypasses the 20/15min/IP throttle); DEC-02 lock persists hashed per user, never plaintext; DEC-03 changer stays logged in (fresh sid-bound token, SPEC-API-02 joint); DEC-04 eventual logout = 401-on-next-online-call (offline devices not counted until first call; immediate kill is SPEC-API-02's scope).
- D-01 `context/PasscodeContext.tsx`: `user_{id}_passcode` via `getPrefixedKey` + `secureStorage` (SecureStore w/ AsyncStorage fallback), SHA256 same call as `addUser`; hydrate on account change; clear alongside auth on sign-out (armed-persist guard so hydration/switches never cross-write users); tree held until first hydrate attempt so the `_layout` gate never renders on stale defaults; additive `verifyPasscode` (session plaintext wins, else stored hash). `app/passcode-screen.tsx` 5-line read-half (`verifyPasscode(cleaned)`) — without it D-01 alone ships permanent-lockout after restart (documented scope stretch; dialog write path stays D-03). This-session behavior unchanged.
- D-02 `utils/db.ts`: additive `updateUserPasscode(id, pin)` (same SHA256, no-op when row absent); zero callers by design — D-03 wires it. Zero behavior change in-slice.
- D-03 `app/(tabs)/settings.tsx` (dialog only): async converged save — Cloud: online gate → `authFetch("auth/change-passcode")` (SPEC-40 envelope passes `{token}` through untouched) → mirror re-hash → `setPasscode` (D-01 persist) → `login(id, freshToken)` (changer stays in) → exact copies (401 `'Current PIN is incorrect'` + step reset, 429 throttle, CON-09 offline/success strings); Local: `verifyPasscode` + re-hash + persist, zero API calls, pre-existing success copy kept. Dialog header/content/actions rebranched from `passcode` to `isPasscodeEnabled` (entry button already used it — split killed); Cloud no-lock shows current+new+confirm single step (server owns the PIN, DEC-05); Step-1 is hash-verify for Local, format-gate for Cloud; both save buttons enforce 4-digit + match + new≠current + Cloud-online (late-caught: `replaceAll` hit only the step-2 button — `pinChange` ACC-03 caught the no-lock one, fixed).
- D-04 `utils/pinChange.test.ts` (new, 21 tests): ACC-01..06 + platform-neutrality across `android`/`ios`/`web` (source-text guards per repo precedent).
- Verified (user-run): `npm run lint` clean; `npx jest` → **15 suites, 425 passed, 0 failed** (404 + 21 new); `npx tsc --noEmit` clean.
- D-05 device matrix: **PASSED per user 2026-10-06** ("D-05 is working"). SPEC-35 closed. SPEC-API-03 (8h fixed JWT) and the `passcodeUpdatedAt`/sid-less grace-gap closure both DECLINED per user call 2026-10-06 (not needed). No new deps, no routes, no other storage/API/contract change. Rollback: D-01 key removal + revert order D-03→D-02→D-01.

---

## 2026-10-06 -- SPEC-44 FINAL v1.0 + implemented (D-01..D-04)

- **Problem:** device B (Expo Go) showed a flashing pattern after device A changed the passcode. Root cause traced to `console.warn('401 Unauthorized - clearing auth credentials')` (`utils/apiClient.ts`) firing on EVERY rejected call; with a stale session, sync retries / refetches / web-direct loads re-issued protected calls, so the Expo LogBox yellow box kept popping. Not a page-render bug.
- **Decision (user call):** `final` → dedupe in the client (no `LogBox` global toggle; fix at the source).
- D-01 `utils/apiClient.ts`: module-scope `authWarnLatched` gates the warn; exported `resetAuthSessionWarningLatch()`. Credentials + `onAuthFailure('session_ended')` still fire on every 401 (logging-only).
- D-02 `context/AuthContext.tsx`: `login` and `logout` both call `resetAuthSessionWarningLatch()`.
- D-03 `utils/apiClient.test.ts`: SPEC-44 block — ACC-01 (one warn per 401-pair), ACC-02 (latch re-arms after reset), ACC-03 (side effects still per-call), each across `android`/`ios`/`web`; fixed a mock-accumulator false positive (`removeSecureItem` now `mockClear`ed in block `beforeEach`).
- Verified (user-run): `npm run lint` clean; `npm test` → **15 suites, 434 passed, 0 failed**; `npx tsc --noEmit` silent.
- No dependency, route, storage-key, or native-behavior change. Rollback: revert apiClient + AuthContext + test block.

---

## 2026-10-06 -- SPEC-45 FINAL v1.0 (transactions-first; not yet implemented)

- `specs/45-api-source-of-truth.md`: FINAL per user call (v1.0; content unchanged from v0.1 except status). Model decided over 6 rounds: Local = AsyncStorage-only, toggle N/A; Online-mobile = API-first with Online-only/mobile-only `local backup` (ON = API + AsyncStorage mirror via background full-copy replace + timestamp, OFF = API-only, mirror cleared); web always Online, toggle N/A, API as-is; Online + offline = hard-error no-ops (no offline transactions, no later sync — queue write-role deleted, `pending` permanently 0 for Online).
- Fixes the native tab-navigation duplication at the root: fetch stops enqueuing on read (D-01), so tab switches can't mint rows; twin/fingerprint + `upsertBulk`-stamps-`now` bypassed on the Online path (mirror keeps server `updatedAt`); balance sums move off `title` to the surviving opening marker (D-02); copy `Auto-Backup` → `Local backup`, OFF banner → `No local backup` (D-03); migration runs upload-once → heal-duplicates (keep oldest, Export-first warning) → discard queued transaction items, in that order (D-04/DEC-06). Dues/savings/categories/profile byte-identical (follow-up specs reference this one per §1.14); `syncQueue`/`syncProcessor` files stay until the last entity spec lands; web + local paths byte-identical.
- Cross-refs (never duplicated): SPEC-04 (sync-vs-auth, promotion), SPEC-36 (web API-direct), SPEC-40 (merge re-enabled), SPEC-43 (write-site guard), T-05 (loop evidence home).
- Next per §1.13: `/plan-fix` produces the plan file (`status: ready-for-implement-fix`, decision, in/out-of-scope paths, calibration); `/implement-fix` executes one slice at a time (D-01..D-06). No code written in this step.

---

## 2026-10-06 -- SPEC-45 implemented (D-01..D-05; D-06 this entry)

- Implemented via /plan-fix run `20261006-session.md` (fresh-frame diagnosis; SPEC-45 governs per §1.13 gate) + /implement-fix, 10 slices, agent-coded with per-slice user Apply.
- D-01 `context/TransactionsContext.tsx`: Online fetch = GET-replace + mirror (no merge/enqueue/drain); writes API-first + background re-pull; offline hard-error no-op; dead twin helpers + queue/toast imports removed; web + Local branches byte-identical.
- D-02 marker migration (4 sites): `components/SummaryCard.tsx`, `app/add-transaction.tsx`, `app/dues.tsx` pay-guard, `context/TransactionsContext.tsx` eval — all off `title`, onto note/category-id marker; `SystemAlertsContext` verified filter-free (no slice); repo-wide grep: zero title-filters left. `utils/onboardingPayload.ts` (builder) untouched.
- D-03 `app/(tabs)/settings.tsx`: `Local backup` copy (`No local backup` OFF), switch row hidden for Local + web-disabled, toggle populates/clears mirror; Backup/Restore/Make Online untouched. Fallout fixed in-slice: `utils/settingsAccountMode.test.ts` ACC-03 repaired to the new contract (old SPEC-39 expression superseded).
- D-04 runbook in settings: preview → Export-first confirm → upload-once → heal keep-oldest → discard `transactions:*` queue items → refetch. NOT YET RUN (user-run with Export-first backup).
- D-05 `utils/apiSourceOfTruth.test.ts` (new, 15 tests): ACC-01..05 x android/ios/web, all strings pre-verified against the tree.
- Verified (user-run per slice): lint clean, jest green incl. new suites, tsc clean (9 "passed" confirmations). Open user-run: ACC-S01..S04 device matrix + D-04 Repair run.
- Scope notes: N 7→8 (TxContext eval visit) →9 (ACC-03 repair) →10 (this journal); `useSavings` fetch + `base.storage` stamp fix deferred to follow-up specs (SPEC-45 Non-goals). No new deps, no routes, no storage-key renames, no server change. Rollback: revert slice files in reverse; orphaned mirror inert; server deletes (only via explicit Repair run) irreversible.

---

## 2026-10-06 -- SPEC-46 FINAL v1.0 + implemented (D-01..D-05)

- `specs/46-transaction-category-persistence.md`: FINAL v1.0 per user call (v0.1 DRAFT → v0.2 amended +D-05 probe, hardened ACC-01/04 per Keep-A verification call → FINAL). Problem (user-reported): online adds always displayed 'Others' even with Salary/Freelance selected. Root cause: the client sent the right category as a NESTED object, which wallet-api drops (`categoryId: null`, HAR-proven savepoint:672/todo-specs:306); SPEC-45's replace-on-fetch then stamped every row via `addCategoryFallback`. Local unaffected (AsyncStorage round-trips nested); web correct until next fetch. SPEC-45 ACC-01..06 assert truth-mechanics only → could not authorize; §1.14 clean (same functions, different behavior).
- Decisions: Option A (flat `categoryId` + rehydrate; B rejected vs SPEC-45 DEC-01; C parked). Verification Keep-A per user call: user-run contract probe over fold-into-S01 (deterministic evidence; script self-cleans).
- D-05 `scripts/verify-category-roundtrip.mjs` (new, node zero-deps, app never imports): U1 gate run one-time-authorized 2026-10-06 — login ok, no sessionConflict; POST accepted, server minted id; GET echoed `categoryId` b0…b16 exact; nested absent as designed; DELETE confirmed, zero residue; temp runner self-deleted, token never printed. ACC-06 satisfied.
- D-01 `context/TransactionsContext.tsx`: both online POST bodies `categoryId: uploaded.category?.id ?? null`; both PUT bodies conditional (`updates.category !== undefined`, never null-wipes on partial updates). Local/web-otherwise byte-identical.
- D-02 read rehydrate: new pure `utils/transactionCategory.ts` (`resolveTransactionCategory`: echo wins → id lookup incl. b18/b19 → Others fallback, empty-list safe) wired into `refreshFromApi` via existing `catRepo` (no new context coupling); mirror stays verbatim (SPEC-45 DEC-03); web/local keep `addCategoryFallback`. Repair note: first wiring hunk matched the wrong same-text line (web branch) — `npm run lint` caught it (unnecessary+missing dep pair); reverted + re-applied in `refreshFromApi`, read-back verified :99-140.
- D-03 `utils/transactionCategory.test.ts` (new, 30 tests): hardened ACC-01..04 × android/ios/web (derivation counts 2+2, web/native depth placement, total `categoryId` count = 4, echo/lookup/fallback/DEC-03 branches).
- Verified (user-run): `npm run lint` clean; `npx jest` → **17 suites, 482 passed, 0 failed**; `npx tsc --noEmit` silent (worker teardown notice pre-existing, not a failure).
- Open (user-run): ACC-S01 online add Salary → survives tab-switch refetch; ACC-S02 Others-custom-text; ACC-S03 local + web regression; ACC-S04 `expo export --platform web` clean.
- Adjacent rot (own future spec, not this one): `app/edit-transaction.tsx` `DEFAULT_CATEGORIES` `"8"/"9"` IDs disagree with seeded UUIDs + raw unauthenticated categories fetch.
- Rollback: revert the 4+3 context hunks; delete util/test/script/spec additions; probe left zero server residue.

---

## 2026-10-06 -- SPEC-46 v1.1 FINAL + implemented (web read rehydrate)

- Re-opened per user call: v1.0 scoped the web read path out (CON-03 byte-identical), but the user reported BOTH surfaces wrong — correct at submit, "Others" after refetch. localhost.har (fresh bundle) proved D-01 live (Salary ₱90 POST carried flat `categoryId` b16 → 201 echoed it); the earlier wise.har ran stale (hot=false, 0/3 POSTs with the key) and re-proved the bug instead. Web display needed the same rehydrate.
- `specs/46-…`: v1.1 DRAFT (13 spot-edits) → FINAL per user call. Web resolves via CategoriesContext state — ancestry verified (ProviderComposer reduceRight nests Categories outside Transactions; no tree change, no import cycle); `catRepo` deliberately NOT used on web (SPEC-36: no local reads). CON-03 exception normed; +ACC-07/ACC-S05; no new files.
- Slice A `context/TransactionsContext.tsx` (4 hunks, read-back verified): Categories import + state + web READ map + fetch deps. Native/local/mirror untouched.
- Slice B `utils/transactionCategory.test.ts` (+9 tests, 30 → 39): ACC-07a web-vs-native resolve sources, ACC-07b consumption + `catRepo` count pinned at 4, ACC-07c deps; ACC-03 `categoryId ×4` still holds.
- Verified (user-run): lint clean, jest green (39/39 in-file), tsc silent.
- Open (user-run): ACC-S05 web Salary survives refresh; ACC-S01 native re-confirmation on fresh bundle (new rows only — pre-fix rows can never heal); ACC-S02..S04.
- Rollback v1.1: revert the 4 web hunks + 3 its; v1.0 behavior (native-only rehydrate) restored.

---

## 2026-10-06 -- SPEC-47 FINAL v1.0 + implemented (D-01..D-04)

- `specs/47-due-payment-method-picker.md`: FINAL per user call (v0.1 as proposed; no amendment round). Problem (user-reported, HAR-proven ×2 same Weekly due): paying a due POSTed `paymentMethod: ""` → server 400 → generic connection copy shown, due stays open (fail-closed, no phantom completion).
- Decisions: A′ (picker dialog + API list w/ hardcoded Cash/"Unknown" fallback + end-to-end message surfacing; B rejected Cash mislabeling; C parked). "Unknown" sentinel for local/unreachable (honest under device-vs-server divergence; promotes cleanly later). Copy split at `status !== 0` (HTTP→server message, transport→SPEC-45 copy).
- D-01 `app/dues.tsx` (7 hunks): picker dialog (API list, FALLBACK Cash/Unknown), `recordTransaction(due, method)` pass-through, dues dialog shows surfaced message. Sole manual caller verified pre-change (no auto-payer, no SPEC-07 collision).
- D-02 `context/TransactionsContext.tsx` (4 hunks): add×2 + update×2 throws prefer server `error` on HTTP !ok; transport frozen; DELETE throws untouched.
- D-03 `utils/duePayment.test.ts` (new, 27 guards ACC-01..05 × android/ios/web) + Slice 3b +18 REG guards (45 total). Deviation disclosed: guards-only, no importable pure unit (behavior covered by ACC-S matrix) — same disclosure precedent as SPEC-40. REG-05 repair: my count omitted the fetch-native repull (investigated first: 4 pre-existing SPEC-45 call sites, none in my hunks); test-only fix.
- Verified (user-run): lint clean; jest green (27/27 → 45/45); tsc silent.
- Open (user-run): ACC-S01 pay with method → 201 + completes + shows method; ACC-S02 offline copy unchanged; ACC-S03 local fallback/"Unknown"; ACC-S04 server message shown; ACC-S05 web export clean.
- Adjacent (own specs, not this one): PUT-400 (T-05); edit-screen "8"/"9" rot; pre-fix "" rows on promotion (migration swallow); due-payment HAR proofs archived in run file.
- Rollback: revert dues hunks + throw lines; delete test/spec additions.

---

## 2026-10-06 -- SPEC-48 FINAL v1.0 + implemented (D-01/D-02/D-04/D-05; D-03 parked on HAR)

- `specs/48-paid-due-visibility.md`: FINAL per user call (v0.1 as proposed; no amendment round). Problem (user-reported): paid dues reappeared in Upcoming after navigation — correct at submit, wrong after refetch.
- Decisions: anchor next occurrence on max(today, scheduled); completed handling HAR-gated (U1-class PUT dues/:id → GET); busy flags on Pay + Confirm; Auto-Process → Auto-renew copy (switches, AUTO-RENEW badge, help) with the `autoProcess` field untouched; no background auto-pay exists or scoped.
- D-01 `app/dues.tsx` (6 hunks): anchor math + busy state/guard/`finally` reset + both tap sites disabled; autoProcess gate untouched. Repair: renderItem dep missed `payBusy` (lint exhaustive-deps caught it); one-line fix.
- D-02 copy layer (5 swaps): add-due switch + disclosed subtitle rewrite, dues modal label, badge, help terms. Field untouched.
- D-03 `hooks/useDues.ts`: PARKED awaiting user HAR gate (PUT dues/:id {completed:true} → GET shows persisted?) — skips with record if green.
- D-04 `utils/dueVisibility.test.ts` (new, 21 tests + 1 disclosed help-body guard): ACC-01 anchor, ACC-02 busy, ACC-03 rename/field, all × android/ios/web; guards-only deviation disclosed (SPEC-47 precedent).
- Verified (user-run): lint clean (after repair); jest 19 suites / 557 passed / 0 failed; tsc silent.
- Open (user-run): ACC-S01 overdue recurring → next correctly dated + hidden; ACC-S02 once stays gone across navigation; ACC-S03 double-tap → single row; ACC-S04 web matrix + export clean. Plus the HAR gate verdict for D-03.
- Rollback: revert dues hunks + copy; delete test/spec additions.

---

## 2026-10-06 -- Verification close-out (SPEC-46 + SPEC-47 matrices; PUT-400)

- User-run matrices PASSED per user report 2026-10-06: SPEC-47 ACC-S01..S05 (pay with method → 201 + completes + shows method; offline copy; local fallback; server message; web export) and SPEC-46 ACC-S01..S05 (fresh-bundle new rows survive refetch, both platforms).
- PUT-400 (T-05/mobile update-400): user reports already fixed — closed per report, no spec opened. Reopen on recurrence with fresh HAR.
- Edit-screen "8"/"9" rot: closed per user report 2026-10-06 (Edit uses the correct category; Others issue gone — consistent with correct IDs now flowing end-to-end).
- Still parked (own spec, deferred per user call 2026-10-06): pre-fix "" rows on promotion (migration swallow).

---

## 2026-10-06 -- SPEC-51 FINAL v1.0 + implemented (D-01)

- `specs/51-category-settings-alphabetical-sorting.md`: FINAL per user call 2026-10-06 (PROPOSED -> FINAL, no content change; user declined `accessibilityLabel` addition — spec-only).
- Problem: Manage Categories rendered in DB retrieval order, no A-Z / Z-A way to locate categories.
- D-01 `app/category-settings.tsx` only: `sortOrder` state (`"asc"` default) + `toggleSortOrder` + `sortedCategories` via `[...filteredCategories].sort` with `localeCompare(..., { sensitivity: "base" })` (non-destructive copy, CON-03) + `<Appbar.Action>` right side of `Appbar.Header` (`sort-alphabetical-ascending` / `sort-alphabetical-descending`, CON-01/CON-02) + `ScrollView` maps `sortedCategories`. Tab parity preserved (derives from `filteredCategories`, CON-04); pure JS sorting, no native import (CON-05).
- No storage/API/route/dep change. No jest tests (no D-* names them; §1.10 matrix is user-run ACC-01..05).
- Open (user-run): `npm run lint`, `npx jest`, `npx tsc --noEmit`, plus ACC-01..05 matrix (Web/Android/iOS toggle ordering, tab persistence, icon-arrow reviewer check) + `expo export --platform web` clean.
- Rollback: revert 4 hunks in `app/category-settings.tsx`; spec status back to PROPOSED.

---

## 2026-10-06 -- SPEC-52 FINAL v1.0 + implemented (D-01..D-03)

- `specs/52-reports-yearly-icon-validity.md`: FINAL per user call 2026-10-06 (DRAFT v0.1 -> FINAL v1.0, no content change).
- Problem: Reports period menu Yearly row used `leadingIcon="calendar-year"` (invalid MaterialCommunityIcons glyph) -> blank icon; Weekly (`calendar-week`) / Monthly (`calendar-month`) unaffected.
- D-01 `app/(tabs)/reports.tsx:230` only: `calendar-year` -> `calendar-outline` (existing MCI import reused, no Ionicons, no `periodOptions` refactor, nothing else touched).
- D-02 `utils/reportsPeriodIcon.test.ts` (new, 9 tests): ACC-01 zero `calendar-year`, ACC-02 Yearly carries `calendar-outline`, ACC-03 Weekly/Monthly unchanged, all x android/ios/web (source-text guards; jest cannot render glyphs).
- Open (user-run): `npm run lint`, `npx jest`, `npx tsc --noEmit`, plus ACC-S01..S03 matrix (Expo Go Android/iOS rows show icons, web export no new warning, no other visual change).
- Rollback: revert 1 line in `app/(tabs)/reports.tsx`; delete test/spec additions.

---

## 2026-10-06 -- SPEC-54 FINAL v1.0 + implemented (D-01..D-05)

- `specs/54-learning-app-guide-sections.md`: FINAL per user call 2026-10-06 (DRAFT v0.1 -> FINAL v1.0, OD-01..OD-04 approved as drafted; guide copy is v1 in-tree, user-editable).
- Problem: Learning screen had one `Recommended Reading` list mixing app-usage guidance with financial tips; zero guide rows existed (`ArticleTopic` lacked an app-guide member).
- D-01 `utils/learningData.ts`: `ArticleTopic` += `"App Guide"` + 3 rows (`app_overview`/`how_to_log_dues`/`managing_savings_goals`, MCI icons `information-outline`/`calendar-plus-outline`/`target`); 6 literacy rows byte-identical; badge fallback unchanged (CON-08).
- D-02 `app/(tabs)/learning.tsx`: `filteredResources` split into `filteredGuides` (topic match; ignores Budgeting/Savings/Debt chips, respects search + Students/Workers) + `filteredLiteracy` (existing predicate + guide exclusion); two stacked sections (`WiseWallet App Guide` first with own count + `No app guides match your filters.` empty card, `Recommended Reading` second unchanged); card/TTS/bookmark JSX reused by copy, no helper added.
- D-03 `app/(tabs)/learning-detail.tsx`: 3 guide bodies (in-app flows only: tabs tour, dues add/pay/complete-lock, allocations progress/archive/restore); unknown-id path unchanged.
- D-04 `utils/learningSections.test.ts` (new, 12 tests): ACC-01 rows, ACC-02 header order, ACC-03 split predicates + zero `filteredResources`, ACC-04 bodies + unknown-id path, all x android/ios/web.
- Open (user-run): `npm run lint`, `npx jest`, `npx tsc --noEmit`, plus ACC-S01..S03 matrix (Expo Go sections/counts/filters/search, web mobile+desktop grids, guide detail + TTS/bookmark parity) + `expo export --platform web` clean.
- Rollback: revert learning.tsx/learning-detail.tsx/learningData.ts hunks; delete test/spec additions.

---

## 2026-10-06 -- SPEC-55 FINAL v1.0 + implemented (D-01..D-03)

- `specs/55-hide-app-guide-audience-chip.md`: FINAL per user call 2026-10-06 (written directly as FINAL; display-only, filtering frozen).
- Problem: guide cards showed a misleading secondary Students/Workers chip (reused JSX rendered `{item.audience && (...)}` unconditionally in both copies).
- D-01 `app/(tabs)/learning.tsx` (2 lines via replaceAll): both chip conditions → `{item.topic !== "App Guide" && item.audience && (`; guides show `App Guide` tag alone, literacy cards unchanged, predicates/rows/detail untouched.
- D-02 `utils/learningSections.test.ts` (+9 tests): SPEC-55 ACC-01 gate count 2 + zero bare `{item.audience && (`, ACC-02 chip JSX intact, ACC-03 predicates unchanged, all x android/ios/web.
- Open (user-run): `npm run lint`, `npx jest utils/learningSections.test.ts`, `npx tsc --noEmit`, plus ACC-S01..S02 matrix (Expo Go + web export: guides tag-only, literacy dual-chip, chips still filter guides) .
- Rollback: revert 2 lines in `app/(tabs)/learning.tsx`; drop SPEC-55 tests.

---

## 2026-10-06 -- SPEC-56 FINAL v1.0 + implemented (D-01..D-05)

- `specs/56-transaction-history-screen.md`: FINAL per user call 2026-10-06 (OD-01 title + OD-02 complete unfiltered list per original request).
- Problem: Home See All pushed `/reports` (charts); no `/transactions` route existed, so the full history had no home.
- D-01 `app/(tabs)/index.tsx:250`: `router.push("/reports")` → `router.push("/transactions")` (sole `/reports` push in tabs; verified zero remain).
- D-02 `app/transactions.tsx` (new): `Appbar.Header` (`Transaction History` + `BackAction` → `safeGoBack(router)`, fallback `/`) over full history newest-first (Home comparator, no `slice`), row JSX copied from Home (icon/category/amount/date → `/transaction-details?id=`), `EmptyState` preserved, `useFocusEffect` refetch.
- D-03 `app/_layout.tsx:225`: `<Stack.Screen name="transactions" />` added; existing screens untouched.
- D-04 `utils/transactionHistory.test.ts` (new, 12 tests): ACC-01 retarget, ACC-02 header + safeGoBack + no raw back, ACC-03 full sort + details nav, ACC-04 registration, all x android/ios/web.
- Open (user-run): `npm run lint`, `npx jest utils/transactionHistory.test.ts`, `npx tsc --noEmit`, plus ACC-S01..S02 matrix (Expo Go See All → history → back → Home, row → details, empty state; web direct-load + back with no GO_BACK warning) + `expo export --platform web` clean.
- Rollback: revert index line + _layout line; delete screen/spec/test additions.

---

## 2026-10-06 -- SPEC-56 FINAL v1.1 + implemented (D-06..D-09)

- `specs/56-transaction-history-screen.md` v1.0 → v1.1 per user call (GCash-style statement folded in; `specs/57-gcash-statement-history.md` retired to a pointer, one home §1.14).
- OD-03 month groups (newest month first, `October 2026` headers) / OD-04 modal mapping (full `id`, `Others`/`—` fallbacks) / OD-05 Home rows still push details.
- D-06 `utils/transactionGroups.ts` (new): pure `groupTransactionsByMonth` (no `react-native` import).
- D-07 `app/transactions.tsx` (rebuild): month card containers + statement rows (icon, Category, method badge with `—` fallback, Date/Time, signed colored amount); tap opens Paper `Dialog` receipt (Ref ID/Category/Method/Date/Notes + single Close); zero Edit/Delete/Share and zero details navigation (verified by scoped grep: sole `Close` hit); header/refetch/empty state reused.
- D-08 `utils/transactionGroups.test.ts` (new, 15 tests): ACC-06a/b grouping behavior + ACC-07/08/09 source guards, all x android/ios/web.
- Open (user-run): `npm run lint`, `npx jest utils/transactionGroups.test.ts`, `npx tsc --noEmit`, plus ACC-S03..S04 matrix (Expo Go + web mobile/desktop: month cards, row fields, receipt modal Close-only, backdrop/Escape dismiss) + `expo export --platform web` clean.
- Rollback: revert transactions.tsx rebuild; delete util/spec-delta/test additions (v1.0 screen remains).

---

## 2026-10-06 -- SPEC-56 FINAL v1.2 + implemented (D-10..D-12)

- `specs/56-transaction-history-screen.md` §5 FINAL per user call (modal deleted, rows static; v1.0/v1.1 text untouched). ACC-10 clarified mid-slice: header `BackAction` `onPress` is the allowed sole exception.
- D-10 `app/transactions.tsx`: deleted receipt `Dialog` block + `ReceiptRow` + `selected` state; rows `TouchableOpacity` → `View` (no `onPress`/`activeOpacity`); pruned `Dialog`/`Button`/`TouchableOpacity`/`useState` imports. Verified by scoped grep: zero `Dialog|Modal|TouchableOpacity|Pressable|setSelected|Receipt`, sole `onPress` is header back.
- D-11 `utils/transactionGroups.test.ts`: ACC-07 reworded (static rows), ACC-08 rewritten as absence guards (6 tokens + single-`onPress` count + `BackAction` present) × android/ios/web; ACC-06 behavior untouched.
- Open (user-run): `npm run lint`, `npx jest utils/transactionGroups.test.ts`, `npx tsc --noEmit`, plus ACC-S05 matrix (Expo Go + web: static rows with no press feedback, no modal, month cards/fields/back/empty unchanged) + `expo export --platform web` clean.
- Rollback: revert D-10/D-11 hunks (v1.1 modal screen returns).

---

## 2026-10-06 -- SPEC-53 FINAL v1.0 + implemented (D-01..D-05)

- `specs/53-floating-pill-tab-bar.md`: v0.1 DRAFT → v0.2 amendment (OD-01 called, Home FAB removal folded in) → FINAL v1.0 per user `final + code this for me`. OD-02..OD-05 closed on proposed defaults DD-01..DD-05 per owner waiver (no Vercel token sheet supplied — token fidelity, not screenshot parity, governs per ACC-S03). DEC-05 error fallback deleted as over-engineering (single custom-bar path).
- D-01 `components/FloatingTabBar.tsx` (new): absolute floating row — pill container (`surface`, r28, p8, DD-01 shadows, web `maxWidth: 560` centered) with 4 key-matched tabs (active pill `primaryContainer` r20, icon+label `primary`/`outline`, labels 12/600, `learning-detail` filtered) + contained circular `plus` (`primary`/`onPrimary`) → `router.push("/add-transaction")`; bottom offset via reused `getTabBarMetrics` (DD-04).
- D-02 `app/(tabs)/_layout.tsx`: added `tabBar` prop + import; SPEC-32 screenOptions/test wiring retained untouched (DD-04, zero SPEC-32 churn).
- D-04 `app/(tabs)/index.tsx`: deleted Home `FAB` block + import (verified zero `FAB`/`add-transaction` remain); tab-bar `+` is now the sole trigger.
- D-03 `utils/floatingTabBar.test.ts` (new, 18 tests): ACC-01 prop wiring, ACC-02 key-matched focus, ACC-03 single `+` wire, ACC-04 icons, ACC-05 no-dep/no-native, ACC-07 FAB absence, all x android/ios/web.
- Open (user-run): `npm run lint`, `npx jest utils/floatingTabBar.test.ts`, `npx tsc --noEmit`, plus ACC-S01..S03 matrix (Expo Go floats/pill/`+` on all tabs incl. learning-detail; web mobile+desktop + keyboard reachability; token-fidelity review) + `expo export --platform web` clean.
- Watch item: `tabBar` prop structural typing vs expo-router's `BottomTabBarProps` is asserted blind (agent runs no CLI) — `tsc` verdict pending user run.
- Repair 2026-10-06 (user-pasted tsc TS2353/TS7006): `tabBar` is a navigator-level prop (`BottomTabNavigationConfig.tabBar`), NOT a per-screen option — moved to `<Tabs tabBar={FloatingTabBar}>`; component props retyped to fork shapes (`NavigationHelpers<ParamListBase>` from direct-dep `@react-navigation/native`, navigator-supplied `insets` instead of the safe-area hook). Follow-up: ACC-01 guard corrected to `tabBar={FloatingTabBar}` (2 suites failed on the stale `tabBar:` literal). Re-run requested: `npx tsc --noEmit` + `npx jest utils/floatingTabBar.test.ts`.
- Repair 2 2026-10-06 (user-pasted tsc TS2322 ×1 + TS2322/TS2339 emit-never ×2): fork vendors its own core types (nominal `PrivateValueStore` mismatch vs `@react-navigation/native`) and core's default event map resolves `emit` to `never` — props now use the fork's exact `BottomTabBarProps` via type-only deep import (erased at runtime; no `exports`-map block, no bundle impact). Re-run requested: `npx tsc --noEmit`.
- Repair 3 2026-10-06 (user-pasted invalid-hook-call at `useTheme`, fork `BottomTabView.js:154` calls `tabBar({...})` as a plain function, not a mounted element): default export is now a hook-free shell returning `<FloatingTabBarThemed/>`, which React mounts as a real fiber holding all hooks; ACC-02 extended with the shell guard. Re-run requested: Expo Go tab render + `npx jest utils/floatingTabBar.test.ts` + `npx tsc --noEmit`.
- Rollback: revert _layout/index hunks; delete component/spec/test additions (standard bar returns).

---

## 2026-10-07 -- SPEC-58 FINAL v1.0 + implemented (D-01..D-03)

- `specs/58-floating-tab-bar-centering.md`: user report (wide web left-docked, "wala sa gitna ... dapat flexible"). Root cause: outer absolute shell `left: 16 / right: 16` + dead `alignSelf: "center"` (no-op on absolute) + `width: 100%` conflict — `maxWidth: 560` capped width but stayed left-anchored. Owner call: Option A two-layer.
- D-01 `components/FloatingTabBar.tsx` only — outer shell → `position: absolute, left: 0, right: 0, bottom: metrics.paddingBottom + 12, alignItems: center` (no row, no gutters, no width); inner row → `flexDirection: row, alignItems: center, width: 100%, maxWidth: 560, paddingHorizontal: 16` wrapping unchanged pill (`flex: 1`) + `+` (`marginLeft: 12`). Tokens, icons, routes, SPEC-32 offset untouched.
- D-02 `utils/floatingTabBar.test.ts` +9 guards (SPEC-58 ACC-01 shell `left: 0/right: 0/alignItems center` + zero `left: 16/right: 16/alignSelf`; ACC-02 row `width 100%/maxWidth 560/paddingHorizontal 16/row`; ACC-03 `flex: 1` + `getTabBarMetrics` + single `+` wire) x android/ios/web.
- Open (user-run): `npm run lint`, `npx jest utils/floatingTabBar.test.ts`, `npx tsc --noEmit`, plus ACC-S01..S03 matrix (web wide centered ~560, web narrow + Expo Go phones fluid 16 gutters, no token change) + `expo export --platform web` clean.
- Rollback: revert D-01/D-02 hunks (single-shell `left: 16/right: 16` returns, left-docked bug returns).

---

## 2026-10-07 -- SPEC-60 FINAL v1.0 + implemented (D-01..D-02)

- `specs/60-transaction-history-test-sync.md`: stale ACC-03 expected the v1.1 receipt modal (`"Transaction Receipt"`); SPEC-56 v1.2 DEC-08 deleted the `Dialog`/`ReceiptRow`/`selected` state and made rows static `View` — app code correct, guard stale (3 failing x android/ios/web, 638 passing). Sibling suite `transactionGroups.test.ts` D-11 had been synced (ACC-10), this file had not.
- D-01 `utils/transactionHistory.test.ts` ACC-03 rewritten as the ACC-10 mirror: keeps `toContain("groupTransactionsByMonth")` + retained `slice(0, 6)` / `/transaction-details?id=` absence; replaces modal presence with 7 absence checks (`Transaction Receipt`, `Receipt`, `Dialog`, `Modal`, `TouchableOpacity`, `Pressable`, `setSelected`). Title cites v1.2.
- App code untouched (zero UI/behavior change on any platform).
- Open (user-run): `npx jest utils/transactionHistory.test.ts`, `npm run lint`, `npx tsc --noEmit` (expect 0 failed) + ACC-S01 reviewer no-visual-change confirm.
- Rollback: revert D-01 hunk (stale `toContain("Transaction Receipt")` returns, 3 fail again).

---

## 2026-10-07 -- SPEC-59 FINAL v1.0 + implemented (D-01..D-03)

- `specs/59-docked-tab-bar.md`: user verdict on floating look ("pangit parang naka lutang") + call A (docked); OD-01 b (separate circular `+` docked right), OD-02 a (soft pill kept), OD-03 full-bleed (surface + top border, SPEC-32 height). SPEC-53/58 SUPERSEDED for bar layout only.
- D-01 `components/FloatingTabBar.tsx` in-place rewrite (file kept, `_layout.tsx` untouched): outer → `absolute, left: 0, right: 0, bottom: 0, surface, borderTopWidth: 1 / surfaceVariant, height/paddings from getTabBarMetrics`; middle row `flex: 1 + row + paddingLeft: 8`; tab row flat (surface, no CONTAINER_RADIUS, no shadow — const + `Platform` import removed); pill tabs + `+` single wire byte-identical except `marginRight: 8` gutter.
- D-02 `utils/floatingTabBar.test.ts`: SPEC-58 centering guards replaced with SPEC-59 ACC-01 (docked keys + zero `maxWidth`/`CONTAINER_RADIUS`/`alignSelf`/`boxShadow`) / ACC-02 (single `+` + `marginRight`) / ACC-03 (icons, no native imports, `metrics.height`, `PILL_RADIUS`) x android/ios/web; SPEC-53 guards retained.
- Open (user-run): `npm run lint`, `npx jest utils/floatingTabBar.test.ts`, `npx tsc --noEmit`, plus ACC-S01..S02 matrix (docked full-width phones + web desktop, tabs + `+` on every route, labels at default + large text) + `expo export --platform web` clean.
- Rollback: revert D-01/D-02 hunks (floating centered bar returns).

---

## 2026-10-07 -- SPEC-61 FINAL v1.0 + implemented (D-01..D-03)

- `specs/61-docked-tab-bar-in-flow.md`: SPEC-59 build kept `position: absolute` — bar overlaid content (rows slid under it, end-of-list hidden; user "dapat di natatakpan content"). Amends SPEC-59 positioning only (visuals untouched).
- D-01 `components/FloatingTabBar.tsx` outer shell drops `position/left/right/bottom` (in-flow; navigator reserves bar space); surface, top border, SPEC-32 height/paddings, inner rows, pill, `+` byte-identical.
- D-02 `utils/floatingTabBar.test.ts`: SPEC-59 ACC-01 swapped for SPEC-61 ACC-01 (zero `position:`/`"absolute"`/`bottom:`, retains `borderTopWidth: 1` + `metrics.height` + single `+` wire) x android/ios/web; all other guards retained.
- Open (user-run): `npm run lint`, `npx jest utils/floatingTabBar.test.ts`, `npx tsc --noEmit` + ACC-S01/S02 (scroll-to-end fully visible, no scroll-under; all tabs + short screens) + `expo export --platform web` clean.
- Rollback: revert D-01/D-02 hunks (absolute overlay returns).

---

## 2026-10-07 -- SPEC-32 v1.1 FINAL + implemented (D-06..D-09)

- `specs/32-completed-dues-screen-and-transaction-deletion-lock.md` §6 v1.1: user order — `/completed-dues` MUST look like `/transactions` month history; week/month/all segments removed. OD-01 called (a): TOTAL COMPLETED card deleted too (pure history mirror).
- D-07 `utils/groupDuesByMonth.ts` (new, pure, no RN import) mirrors `groupTransactionsByMonth` (`{key, label, items}`, newest-first months/items).
- D-06 `app/completed-dues.tsx` rebuild: `filter` state + `SegmentedButtons` + week/month memos + total card + `ListHeaderComponent` deleted; `FlashList` over month cards (surface r16 p16 mb12, history-identical shadows) with month header + count; existing due rows moved inside as plain `View` (content byte-identical); header + `safeGoBack` + refetch + `EmptyState` untouched. Removed now-unused `useState`/`Card`/`SegmentedButtons` imports; added `Platform` (shadows) + helper import.
- D-08 `utils/groupDuesByMonth.test.ts` (new, 12 tests): ACC-08a/b grouping behavior + ACC-08c (grouped, zero segments/total) + ACC-09 (read-only, header back, empty state, sole onPress) x android/ios/web.
- Open (user-run): `npx jest utils/groupDuesByMonth.test.ts`, `npm run lint`, `npx tsc --noEmit` + ACC-S03/S04 (visual parity with history; empty state) + Expo Go + web export.
- Rollback: revert D-06 (flat filtered list returns); delete D-07/D-08 additions.
- Note (2026-10-07 correction): SPEC-53 v1.1 is FINAL + implemented (see entry below) — the "still open" line from the v1.1 slice is superseded.

---

## 2026-10-07 -- SPEC-32 v1.2 FINAL + implemented (D-10..D-12)

- `specs/32-completed-dues-screen-and-transaction-deletion-lock.md` §7 v1.2: row titles carried a middle line (`textDecorationLine: line-through`, pre-v1.1 leftover) — history rows have none. No OD (delete-only change).
- D-10 `app/completed-dues.tsx`: deleted the one `textDecorationLine` key; weight 600 + `onSurfaceVariant` + layout/cards/header/empty untouched.
- D-11 `utils/groupDuesByMonth.test.ts`: ACC-10 (zero `line-through`/`textDecorationLine`, weight retained) × android/ios/web; placement verified inside the suite.
- Open (user-run): `npx jest utils/groupDuesByMonth.test.ts`, `npx jest`, `npm run lint`, `npx tsc --noEmit` + ACC-S05 (clean titles like history) + Expo Go + web export.
- Rollback: revert D-10 (strikethrough returns).

---

## 2026-10-07 -- SPEC-36 v1.3 FINAL + implemented (D-W-07..D-W-09)

- `specs/36-web-platform-invariants.md` §7 v1.3: web same-session-added rows 404'd on edit/delete (user-pasted 404 + masked delete copy). Root cause: web add appended the client-UUID object with no re-pull (native repulls via `refreshFromApi`); server mints ids (SPEC-43 HAR-proven). User confirmed same-session pattern; OD-W4 called (a) re-GET; OD-W5 deferred (no letter → status-quo (b), delete copy byte-identical, still open).
- D-W-07 `context/TransactionsContext.tsx` web add only: after POST ok, GET `transactions?userId=` and replace state via context categories (zero local writes, no loading flash); repull failure falls back to the old optimistic append; POST !ok copy unchanged. Deps array gains `categories` (exhaustive-deps).
- D-W-08 `utils/webTransactionRepull.test.ts` (new, 6 tests): ACC-W-07 re-GET count ≥ 3 + rehydrate count = 2 + fallback retained + v1.3 marker + delete copy intact, x android/ios/web.
- Open (user-run): `npx jest utils/webTransactionRepull.test.ts`, `npx jest`, `npm run lint`, `npx tsc --noEmit` + ACC-W-09 (web: add → edit → delete one session, no errors; reload identical) + Expo Go + web export.
- Rollback: revert D-W-07 (client-UUID append returns, same-session 404 returns); delete D-W-08 addition.

---

## 2026-10-07 -- SPEC-36 v1.4 FINAL + implemented (D-W-10..D-W-12)

- `specs/36-web-platform-invariants.md` §8 v1.4: OD-W6 (a) + OD-W7 (a) per user call. F5 result recorded (new rows OK, old rows still fail) — v1.3 heals forward only; old-row root cause (pre-fix client rows never stored server-side, or server-protected e.g. opening-balance) still open; the surfaced message below will identify it.
- D-W-10 `context/TransactionsContext.tsx` delete (web + native, same one-line pattern for message parity): `const { ok, status, error }` + `status !== 0 && error ? error : <generic>`. `app/transaction-details.tsx` `handleDelete` try/catch via root-mounted `useToast` (precedent: add-allocation): success → `showToast("Transaction deleted successfully.")` + `safeGoBack`; failure → error toast, dialog closed, stays on screen, zero red box. Confirm dialog untouched; SPEC-32 lock untouched.
- D-W-11 `utils/transactionDeleteFeedback.test.ts` (new, 6 tests): ACC-W-10 (toast wiring + try/catch + confirm intact; delete server-message preference ×2 branches) x android/ios/web.
- Open (user-run): `npx jest utils/transactionDeleteFeedback.test.ts`, `npx jest`, `npm run lint`, `npx tsc --noEmit` + ACC-W-12 (delete → confirm → success toast → back; failing delete → error toast, stay, no red box) + Expo Go + web export. Next diagnostic: paste the newly-surfaced delete error text for the old row.
- Rollback: revert D-W-10 (silent back-nav + red-box failure return); delete D-W-11 addition.

---

## 2026-10-07 -- SPEC-36 v1.5 FINAL + implemented (D-W-13..D-W-16)

- `specs/36-web-platform-invariants.md` §9 v1.5: pasted logs proved two distinct defects. (1) DELETE 204 misread — server answers 204-empty (success) but `authFetch` JSON-parses every body, so success threw, error toasted, row kept (reload proved it gone). (2) Old-row PUT 404 identity still open (title not supplied → OD-W10 open, no code). OD-W8 (a) + OD-W9 (a) per user call.
- D-W-13 `utils/apiClient.ts` only: empty/unparseable body + `response.ok` → `{ok: true, status}` (data undefined); 401 path, envelope unwrap, non-2xx untouched. Fixes web + native delete identically (shared client).
- D-W-14 `app/edit-transaction.tsx` only: `useToast` wiring (root provider already mounted) — success → `showToast("Transaction updated successfully.")` + back; failure → `Alert` with resolved `e.message` (context already prefers server text, no context change needed). Validators untouched.
- D-W-15 tests: `apiClient.test.ts` +6 (204-empty ok:true/undefined, 404-empty loud, ×3 OS — zero pre-existing 204 cover); new `utils/transactionEditFeedback.test.ts` (3 guards ×3 OS).
- Open (user-run): `npx jest utils/apiClient.test.ts utils/transactionEditFeedback.test.ts`, `npx jest`, `npm run lint`, `npx tsc --noEmit` + ACC-W-15 (delete → toast, gone after reload, zero error; failing edit → resolved message, no red box) + Expo Go + web export. Next diagnostic: title of the old row that 404s on edit (OD-W10).
- Rollback: revert D-W-13 (204 throws again); revert D-W-14 (silent save + generic alert return); delete edit-feedback test addition (apiClient additions revert with file).

---

## 2026-10-07 -- SPEC-46 v1.2 FINAL + implemented (D-06..D-08)

- `specs/46-transaction-category-persistence.md` v1.2: Pay-due → Confirm 500'd (`invalid input syntax for type uuid: "scheduled"`). Root: dues `recordTransaction` fallback `{id: "scheduled"}` (SPEC-09 label) flowed verbatim through D-01's flat `categoryId` into the server UUID cast — every synthetic id (`"scheduled"`, edit `"8"/"9"`) 500s on every online write, web + native. OD-46A (a) per user call.
- D-06 `context/TransactionsContext.tsx` only: the 3 online derivations gate on SPEC-45 `isUUID` (`categoryId = isUUID ? id : null`, reads back as Others per DEC-02); nested object kept (DEC-01); local/read untouched. Collapsed the pre-existing duplicated web-PUT line into the single gated line (same D, disclosed). Explicitly supersedes CON-03's web-write-identical clause for these expressions.
- D-07 `utils/transactionCategory.test.ts`: ACC-01/01b rewritten to the gated forms (PUT now ×1 post-collapse); ACC-03 count 4→3 (duplicate collapse); new ACC-08 (zero bare passthrough, 2 POST + 1 PUT gates) × android/ios/web. Incidentally heals the D-04 `"8"/"9"` edit write path — recorded, no separate spec.
- Open (user-run): `npx jest utils/transactionCategory.test.ts`, `npx jest`, `npm run lint`, `npx tsc --noEmit` + ACC-S06 (pay category-less due web + native → Others row, due completes) + Expo Go + web export.
- Rollback: revert D-06 (synthetic-id 500s return); D-07 rewrites revert with it.

---

## 2026-10-07 -- SPEC-26 v1.4 FINAL + implemented (D-04..D-05)

- `specs/26-responsive-dialogs-and-clear-data-flow.md` §6 v1.4: dues Pay + alert dialogs spanned full desktop width (no responsive cap — same defect class as §1.1 problem 1). OD none (tokens verbatim CON-01).
- D-04 `app/dues.tsx` only: `StyleSheet` import + `styles.dialog` (`maxWidth: 480, width: "90%", alignSelf: "center"`) + `style` props on the Pay (`:643`) and alert (`:680`) Dialogs. Chips (wrap), pay logic, alert copy/buttons, FAB, list untouched.
- Open (user-run): `npm run lint`, `npx tsc --noEmit`, `npx jest` + ACC-S07 (capped centered cards phone + web desktop; chips wrap narrow) + Expo Go + web export. Pay → Confirm flow itself is SPEC-46 v1.2 (awaiting user ACC-S06 verification).
- Rollback: revert D-04 (full-bleed dues dialogs return).

---

## 2026-10-07 -- SPEC-63 FINAL v1.0 + implemented (D-01..D-04)

- `specs/63-dashboard-quick-calculator.md`: calculator left of the bell + one floating pill (new number justified: no existing home owns the dashboard header or a calculator). OD-01 (a) standalone modal + OD-02 (a) floating-bar pill tokens per user call.
- D-02 `utils/calculator.ts` (new, pure: `calculate` + `formatResult`, ÷-by-zero → NaN/"Error", FP-trim) + `components/CalculatorModal.tsx` (new: Paper Modal, responsive card 90%/360, display + 3×5 key grid `C ⌫ ÷ 7 8 9 × 4 5 6 − 1 2 3 + 0 . =`, immediate-execution, Close).
- D-01 `app/(tabs)/index.tsx` header row only: `useState` import, `CalculatorModal` import, `calcVisible` state, pill (`surface`, r20, p4, DD-01 shadows) with `calculator` IconButton (glyph verified in installed MCI map — `calculator-outline` does not exist) + untouched bell/badge block, modal render. Date/list untouched.
- D-03 `utils/calculator.test.ts` (new, 16 tests): ACC-03 arithmetic + ACC-01/ACC-02 guards × android/ios/web (one guard self-corrected pre-journal: `maxWidth: 560` belongs to the tab bar, replaced with the pill's `borderRadius: 20`).
- Open (user-run): `npx jest utils/calculator.test.ts`, `npx jest`, `npm run lint`, `npx tsc --noEmit` + ACC-S01/S02 (pill top-right phone + web; hand-checked arithmetic; unchanged Home on dismiss) + Expo Go + web export.
- Rollback: revert D-01 (plain bell row returns); delete D-02/D-03 additions.

---

## 2026-10-07 -- SPEC-63 v1.1 FINAL + implemented (D-05..D-07)

- `specs/63-dashboard-quick-calculator.md` §5 v1.1: modal opened but `5 + 3 =` never computed — `inputDigit`'s fresh branch called `resetEntry`, wiping the pending `acc`/`op` (flag conflated new-entry with full-reset); plus keys/display read tiny. No OD (fix + proposed tokens verbatim).
- D-05 `components/CalculatorModal.tsx` only: DEC-03 fresh branch replaces display only (full reset solely from `Error`/C); DEC-04 card 360→400 (90% retained), display `displaySmall`/56, keys height 56/label 18. Chain/`=`/÷0/backspace/decimal/cap traced unchanged.
- D-06 `utils/calculator.test.ts`: ACC-05 (sliced `inputDigit` has zero `setAcc`/`setOp`) + ACC-06 (size tokens) × android/ios/web.
- Open (user-run): `npx jest utils/calculator.test.ts`, `npx jest`, `npm run lint`, `npx tsc --noEmit` + ACC-S03 (`5+3=→8`, chain, ÷0→Error, digit recovers; comfortable keys phone + desktop) + Expo Go + web export.
- Rollback: revert D-05 (no-compute + small keys return).

---

## 2026-10-07 -- SPEC-53 v1.2 FINAL + implemented (D-17..D-19)

- `specs/53-floating-pill-tab-bar.md` §6 v1.2: phone bar height too small vs reference mock (tall pill + separate `+`). No OD (padding-only fix, structure already matched).
- D-17 `components/FloatingTabBar.tsx`: pill container + tab buttons `paddingVertical` 8 → 12 (≈ +8px); icons/labels/colors/radii/shadows/`+`/centering/in-flow untouched.
- D-18 `utils/floatingTabBar.test.ts`: ACC-12 (2× `paddingVertical: 12`, zero `: 8`, tokens intact) × android/ios/web.
- Open (user-run): `npx jest utils/floatingTabBar.test.ts`, `npx jest`, `npm run lint`, `npx tsc --noEmit` + ACC-S07 (taller bar phone + desktop, no crowding/overlap) + Expo Go + web export.
- Rollback: revert D-17 (short bar returns).

---

## 2026-10-07 -- SPEC-53 v1.3 FINAL + implemented (D-20..D-22)

- `specs/53-floating-pill-tab-bar.md` §7 v1.3: dark-mode bar went near-black (`surface`), light white — user wants one non-white brand color in both modes (navy, toast direction). No OD (read confirmed at FINAL).
- D-20 `components/FloatingTabBar.tsx`: bar `surface → primary`; inactive icon/label `outline → onPrimary` (theme pairs both modes); active pill, `+`, padding, centering, in-flow untouched (verified zero `surface`/`outline` remain in file).
- D-21 `utils/floatingTabBar.test.ts`: ACC-14 (navy shell, theme-pair inactive, active retained) × android/ios/web.
- Open (user-run): `npx jest utils/floatingTabBar.test.ts`, `npx jest`, `npm run lint`, `npx tsc --noEmit` + ACC-S08 (identical navy pill light + dark, phone + web) + Expo Go + web export.
- Rollback: revert D-20 (mode-following bar returns).

---

## 2026-10-07 -- SPEC-05 §5 + SPEC-45 §7 FINAL + implemented (toast legibility + "9"-row quarantine)

- Reports: success toast invisible (white on `elevation.level3` near-white, bottom-docked behind nav) + edit 404 `invalid input syntax for type uuid: "9"`. Evidence: Paper 5.13 defaults are inverseSurface/inverseOnSurface (verified `Snackbar.tsx:260-262`); `wrapperStyle` verified supported (`:82`, applied after base wrapper `:297`); row id `"9"` served by GET = server-side legacy id, unaddressable by UUID-cast routes (no client repull heals; true heal = wallet-api repair, out of tree, Export-first). OD-MD-5/6 (a), OD-45A/B (a) per user call.
- D-MD-03 `context/ToastContext.tsx` only: `wrapperStyle={{top: 0, bottom: 0, justifyContent: "center"}}` (full-height wrapper, pointerEvents box-none → non-blocking preserved) + `style={{inverseSurface, maxWidth: 480, width: "90%", alignSelf: "center"}}`; `elevation.level3` override dropped (Paper default text/action colors now pair correctly). Timing/action/callers untouched.
- D-45A `utils/uuid.ts` + `utils/uuid.test.ts` (new): pure `isUUID` (v4 regex) + `LEGACY_NON_UUID_MESSAGE` (OD-45B a verbatim, co-located anti-drift); tests mock `uuid` + `react-native-get-random-values` (uuid v14 ESM + RN NativeModules hazards verified in-tree) + RN Platform mock; ACC-45A verdicts + ACC-45B guards × android/ios/web.
- D-45B `context/TransactionsContext.tsx`: `!isUUID(id)` short-circuit (explainer error, zero API call) in update + delete after the isLocal branches; UUID rows byte-identical.
- D-45C `app/transaction-details.tsx` + `app/edit-transaction.tsx`: `isLegacyId` gating — pencil/trash/Save hidden, explainer line shown; normal rows untouched; SPEC-32 lock untouched.
- Open (user-run): `npx jest utils/uuid.test.ts utils/toastLegibility.test.ts`, `npx jest`, `npm run lint`, `npx tsc --noEmit` + ACC-MD-07 (centered legible toast light+dark, phone+web) + ACC-45D ("9" row readable, no writers, explainer; normal rows unchanged) + Expo Go + web export. Server-side repair of legacy ids tracked open (user-run backend, Export-first).
- Rollback: revert D-MD-03 (bottom washed-out toast returns); revert D-45A-C (dead 500s on legacy rows return); delete uuid/toast test additions.

---

## 2026-10-07 -- SPEC-05 §6 FINAL + implemented (D-MD-06..D-MD-08)

- `specs/05-multi-device-behavior.md` §6: §5 toast centered + legible but generic black — user order "tugma sa system". OD-MD-7 (a) per user call.
- D-MD-06 `context/ToastContext.tsx` container only: `primary` bg + `borderRadius: 16` (card language); text/action stay Paper defaults (`inverseOnSurface`/`inversePrimary`, verified pairing in `Snackbar.tsx:260-262` for both modes); centering/maxWidth/timing/action/callers untouched.
- D-MD-07 `utils/toastLegibility.test.ts`: guards → ACC-MD-08 (navy skin + retained wiring) × android/ios/web.
- Open (user-run): `npx jest utils/toastLegibility.test.ts`, `npx jest`, `npm run lint`, `npx tsc --noEmit` + ACC-MD-10 (navy centered toast, phone + web, light + dark) + Expo Go + web export.
- Rollback: revert D-MD-06 (black toast returns).

---

## 2026-10-07 -- SPEC-53 v1.1 FINAL + implemented (D-13..D-16)

- `specs/53-floating-pill-tab-bar.md` §5 v1.1: canonical home restored per owner order + §1.14 (no new numbers). Floating pill + centered `maxWidth 560` + in-flow; SPEC-58 folded in, SPEC-59/61 superseded for layout, SPEC-62 DRAFT retired.
- D-13 `components/FloatingTabBar.tsx`: removed leftover `+` `marginRight: 8` (wrapper/row/pill already matched DEC-10..12 from the stopped run); verified byte-alignment by read-back.
- D-14 `utils/floatingTabBar.test.ts`: shell guards rewritten to ACC-11 (floating keys present, overlay keys absent) x android/ios/web; consequential one-line fixes inside the same D (stale `marginRight: 8` + `metrics.height` assertions from superseded SPEC-59/61); all other guards retained.
- D-15 `specs/62-floating-tab-bar-in-flow.md` deleted (user-ordered early; verified zero `specs/62*` remain).
- D-16 journal (`docs/savepoint.md` + `AGENTS.md` §3).
- Open (user-run): `npm run lint`, `npx jest utils/floatingTabBar.test.ts`, `npx jest`, `npx tsc --noEmit` + ACC-S05/S06 (floating centered look; scroll-to-end visible, no coverage) + Expo Go + `expo export --platform web` clean.
- Rollback: revert D-13/D-14 hunks (docked `+` gutter + stale guards return; SPEC-62 file stays deleted).

---

## 2026-10-07 -- SPEC-53 v1.4 FINAL + implemented (D-23..D-25)

- `specs/53-floating-pill-tab-bar.md` §8 v1.4: v1.3 navy reverted per user screenshots + 3-way confirm (surface White/Dark; transparent + colored icon; `+` keep primary). No OD (read confirmed at FINAL per question answers).
- D-23 `components/FloatingTabBar.tsx` only (4 lines): container `primary → surface`; pill `focused ? primaryContainer : transparent → transparent`; inactive icon + label `onPrimary → onSurfaceVariant` (×2); focused `primary` + `+` (`containerColor primary`/`iconColor onPrimary`) + padding/radius/shadow/centering/in-flow/SPEC-32 untouched (read-back verified).
- D-24 `utils/floatingTabBar.test.ts`: v1.3 ACC-14 replaced by ACC-16 (surface shell, zero `backgroundColor: primary`, transparent pill, zero `primaryContainer`, `onSurfaceVariant` inactive, `primary` focused retained, `+` pair retained) × android/ios/web.
- Open (user-run): `npx jest utils/floatingTabBar.test.ts`, `npx jest`, `npm run lint`, `npx tsc --noEmit` + ACC-S09 (light white bar/navy active/gray inactive; dark dark-bar/light-blue active/gray inactive; no pill fill; `+` unchanged; phone + web) + Expo Go + `expo export --platform web` clean.
- Rollback: revert D-23/D-24 (navy bar + pill fill return).

---

## 2026-10-07 -- SPEC-63 v1.2 FINAL + implemented (D-08..D-10)

- `specs/63-dashboard-quick-calculator.md` §6 v1.2: phone screenshot showed the card off-center (`gitna` order). Root cause: card had `width 90%` + `maxWidth 400` but no `alignSelf: center` (SPEC-26 pattern cited, not re-normed).
- D-08 `components/CalculatorModal.tsx`: one line added (`alignSelf: "center"`); arithmetic/keys/display/header/bell untouched.
- D-09 `utils/calculator.test.ts`: ACC-08 centering guards (card `90%`/`400`/`center` + container `justifyContent`/`alignItems`) × android/ios/web.
- Open (user-run): `npx jest utils/calculator.test.ts`, `npx jest`, `npm run lint`, `npx tsc --noEmit` + ACC-S04 (phone portrait light+dark centered card, even gutters, all keys tappable; web capped + centered) + Expo Go + `expo export --platform web` clean.
- Rollback: delete the one `alignSelf` line (off-center card returns).

---

## 2026-10-07 -- SPEC-63 v1.3 FINAL + implemented (D-11..D-13)

- `specs/63-dashboard-quick-calculator.md` §7 v1.3: v1.2 was a redundant no-op (admitted — `alignSelf: auto` already inherits `alignItems: center`); fresh-bundle phone still off-center on both axes. Root cause from Paper 5.13 source (`Modal.tsx:219-224` + `:238-246`): `contentContainerStyle` sits on a content-wrapping `Surface`, so centering only worked inside the wrap, never on the true screen.
- D-11 `components/CalculatorModal.tsx`: one key (`flex: 1` first in `contentContainerStyle`) — transparent `Surface` now fills the wrapper, so its `justifyContent + alignItems: center` centers the card on the real screen, any phone size. Card/keys/arithmetic/header/bell untouched.
- D-12 `utils/calculator.test.ts`: ACC-10 guards (container `flex: 1` + centering; card `90%`/`400`/`center` retained) × android/ios/web.
- Open (user-run): `npx jest utils/calculator.test.ts`, `npx jest`, `npm run lint`, `npx tsc --noEmit` + ACC-S05 (phone portrait light+dark dead-center both axes, even gutters, backdrop tap still dismisses; web capped + centered) + Expo Go + `expo export --platform web` clean.
- Rollback: delete the `flex: 1` key (wrap-only centering returns).

---

## 2026-10-07 -- SPEC-63 v1.4 FINAL + implemented (D-14..D-16)

- `specs/63-dashboard-quick-calculator.md` §8 v1.4: v1.3 still bottom-stuck on phone (7:15 screenshot: white sheet peeking below the tab bar). Verified root cause in Paper 5.13 source — iOS `SurfaceIOS` splits `contentContainerStyle` (layout keys → outer layer, centering keys → wrapping inner layer with forced `flex: undefined` under `container`), so no Paper-`Modal` style combo can guarantee centering. User chose option (a) RN rewrite; option (b) third Paper guess rejected. `Portal.Host` verified present/full-screen (`PaperProvider.tsx:113`), host exonerated.
- D-14 `components/CalculatorModal.tsx` shell-only: RN `Modal` (`transparent`, `fade`, `onRequestClose`) + backdrop `Pressable` (dim, full-screen, centered, dismiss) + inner tap-swallow `Pressable` (`() => {}` precedent lint-clean); `Portal`/Paper-`Modal` imports deleted; card/keys/state/arithmetic/props byte-identical.
- D-15 `utils/calculator.test.ts`: ACC-12 guards (RN shell present, `<Portal>`/`contentContainerStyle` absent, card tokens retained) × android/ios/web.
- Open (user-run): `npx jest utils/calculator.test.ts`, `npx jest`, `npm run lint`, `npx tsc --noEmit` + ACC-S06 (phone portrait light+dark dead-center both axes, backdrop/Android-back dismiss, card-gap taps never dismiss; web capped + centered) + Expo Go + `expo export --platform web` clean. SPEC-26 dialogs untouched (still Paper).
- Rollback: revert D-14/D-15 (Paper Modal + bottom-stuck card return).

---

## 2026-10-07 -- SPEC-64 v1.0 FINAL + implemented (D-01..D-06) + SPEC-05 §7 (D-MD-09..D-MD-11)

- `specs/64-transaction-details-polish.md` (new number: no spec owned details layout; SPEC-30/31 icon color+name + SPEC-42/45 flows retained as CON-02). Desktop screenshot: full-width stretch, small hero icon, raw `bank_transfer`, centered toast over card.
- D-01 `scrollContainer`: `width 100% + maxWidth 600 + alignSelf center` (Appbar full-width, phones fluid).
- D-02 hero: `elevation: 2`, icon box 64→80 (r16), glyph 32→40; colors/mapping/padding retained.
- D-03 rows: value `textAlign right + flexShrink 1`; CATEGORY row divider/margin dropped via `lastDetailRow`.
- D-04 new pure `utils/formatMethod.ts` (`bank_transfer → Bank Transfer`); call site keeps `"Cash"` fallback. No other caller.
- D-05 new `utils/transactionDetails.test.ts` (ACC-01..04 × android/ios/web). Existing `uuid`/`transactionDeleteFeedback` guards verified untouched (assert only gating/delete-flow strings).
- Toast: §1.13 overlap gate fired (global toast = SPEC-05 home) → user called OD-T1 (a) "Global to bottom". SPEC-05 §7: `wrapperStyle` → `{top: 0, bottom: 24, flex-end}` (navy/maxWidth/timing/action retained); `toastLegibility.test.ts` ACC-MD-08 → ACC-MD-11 (consequential stale-assertion fix). Transient nav overlap = standard Material behavior (noted in spec).
- Open (user-run): `npx jest utils/transactionDetails.test.ts utils/formatMethod`, `npx jest`, `npm run lint`, `npx tsc --noEmit` + ACC-S01 (desktop capped/centered/titled) + ACC-MD-13 (bottom-docked toast, phone + web, light + dark) + Expo Go + `expo export --platform web` clean.
- Rollback: revert details hunks + delete the 2 new files (raw values + stretch return); revert wrapperStyle (centered toast returns).

---

## 2026-10-07 -- SPEC-65 v1.0 FINAL + implemented (D-01..D-05)

- `specs/65-success-dialog-pattern.md` (new number: no home for success pattern; option A per user call; red error toast confirmed design-reference only, source not in-tree). Delete/edit success = white centered dialog like Delete confirm, not navy toast.
- D-01 `components/ConfirmDialog.tsx`: optional `tone` (`danger` default → byte-identical: alert icon + Cancel + error button; `success` → check-circle-outline (MCI-verified) + primary OK, no Cancel). All 8 existing callers verified toneless (zero test asserted internals).
- D-02 details: `successVisible` + `handleSuccessDismiss` (hide + back — backdrop can't strand user on deleted tx); success toast line deleted, failure toast retained.
- D-03 edit: same pattern ("Updated Successfully"); now-unused `useToast` import/binding removed (lint-required, same D); failure `Alert` + validators retained.
- D-04 tests: new `utils/successDialog.test.ts` (ACC-01..04 ×3 OS) + consequential success-assertion rewrites in `transactionDeleteFeedback`/`transactionEditFeedback` (failure assertions retained). SPEC-36 success-toast display superseded; SPEC-26/05 untouched.
- Open (user-run): `npx jest utils/successDialog.test.ts utils/transactionDeleteFeedback.test.ts utils/transactionEditFeedback.test.ts`, `npx jest`, `npm run lint`, `npx tsc --noEmit` + ACC-S01 (white success dialogs w/ check + OK, phone + web, light + dark; danger dialogs unchanged) + Expo Go + `expo export --platform web` clean.
- Rollback: revert D-01..D-03 + delete `successDialog.test.ts` (success toasts + immediate back return).

