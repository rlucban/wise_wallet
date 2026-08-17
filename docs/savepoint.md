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
- Restructured bottom tab bar in `app/(tabs)/_layout.tsx` to a 5-slot layout: Home, Reports, central "+", Learning, Settings.
- Persistent central circular "+" FAB in the tab bar is positioned in the center across all tabs, providing a direct shortcut to `/add-transaction`.
- Removed standalone `<FAB>` from `app/(tabs)/index.tsx` (dashboard).
- Created `app/(tabs)/add.tsx` as a minimal placeholder screen for the center tab slot.
- Updated tab icons to outlined variants (`home-variant-outline`, `chart-box-outline`, `cog-outline`, `school-outline`) with filled versions on active state; active tint color set to dark navy blue `#1B3F7A`.
- Updated Allocations screen (`app/savings.tsx`) FAB to be a clean circular `+` button without the text label.
- Harmonized Recent Activity item styling across `app/(tabs)/index.tsx` and `components/TransactionList.tsx` using `getCategoryBadge` with category-specific icons (Food, Bills, Transport, Shopping, Entertainment, Salary/Income) and soft color-tinted 12px squircle backgrounds to blend seamlessly with the system design language.
- Changed the dashboard banner section title from "Reminders" to "Highlights" in `app/(tabs)/index.tsx`.
- Removed the "Next 7 Days" upcoming dues banner card from the Dashboard screen (`app/(tabs)/index.tsx`).
