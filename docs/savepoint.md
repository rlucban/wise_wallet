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

