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


