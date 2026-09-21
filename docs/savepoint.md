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




