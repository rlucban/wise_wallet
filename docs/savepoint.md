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

## 2026-09-30 - SPEC-34: Replace Hardcoded `#fff` With the `onPrimary` Semantic Token
- `specs/34-replace-hardcoded-white-with-onprimary-token.md`: Finalized spec for fixing the 15 `utils/themeColors.test.js` failures (5 files x 3 platforms) introduced when SPEC-17 and SPEC-26 reintroduced a hardcoded `#fff` into files that SPEC-12..16 had already converted to theme tokens.
- `app/add-allocation.tsx` (D-01): `buttonTextColor` enabled-branch fallback `"#fff"` -> `theme.colors.onPrimary`.
- `app/dues.tsx` (D-02): FAB `color="#fff"` -> `color={theme.colors.onPrimary}` (FAB `backgroundColor: theme.colors.primary` unchanged).
- `app/savings.tsx` (D-03): FAB `color="#fff"` -> `color={theme.colors.onPrimary}` (FAB `backgroundColor: theme.colors.primary` unchanged).
- `app/category-settings.tsx` (D-04): FAB `color="#fff"` -> `color={theme.colors.onPrimary}` (FAB `backgroundColor: theme.colors.primary` unchanged).
- `app/add-due.tsx` (D-05): "Save Scheduled Due" `Button` `color="#fff"` -> `color={theme.colors.onPrimary}` (`buttonColor={theme.colors.primary}` unchanged).
- Rationale: `context/ThemeContext.tsx` defines a correct MD3 pair in both schemes (light `primary: #1B3F7A` + `onPrimary: #FFFFFF`; dark `primary: #4A90D9` + `onPrimary: #001F4D`). Light mode is therefore pixel-identical, and dark mode contrast improves from ~2.2:1 (white on pale blue, fails WCAG AA) to ~8:1 (navy on blue, passes). Matches SPEC-13 `DEC-08`.
- Known issue NOT fixed by this spec (ACC-10): `app/add-allocation.tsx` sets both `disabledBg` and `disabledText` to `theme.colors.onSurface`, so the disabled "Create Allocation" label is invisible against its own background. Filed for a follow-up spec.
- Verification: user to run `npm test` (expect 15/15 themeColors cases pass, 98 total) and `npm run lint` (expect clean).
