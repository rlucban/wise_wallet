# Spec 15: Theme Contrast Fixes for Category Settings Screen

| Field | Value |
|---|---|
| ID | SPEC-15 |
| Title | Theme Contrast Fixes for Category Settings Screen |
| Status | **DRAFT** |
| Owner | User (final authority) |
| Version | 1.0 — aligned to `/add-transaction` dark theme patterns |
| Scope | Hardcoded light/dark theme colors on `/category-settings` screen; modal background, modal typography, segmented buttons, category list items |
| Non-goals | New theme system; changing Paper theme provider; modifying global theme colors; other screens not listed |
| Normative source | This file. File+symbol cites are normative; `:line` numbers are hints only. |

> History: created 2026-09-26 per user request.

## Terminology (RFC 2119)

The keywords **MUST**, **MUST NOT**, **SHOULD**, and **MAY** in this spec are to be interpreted as described in RFC 2119. Informative prose (examples, "today", "currently") is non-normative unless restated as a requirement.

## 1. Context

### 1.1 Problem

The `/category-settings` screen contains hardcoded color values that break in dark mode:

- Line 81: Modal `contentContainerStyle` uses hardcoded `backgroundColor: "white"` — blinding in dark mode.
- Lines 84-86: Modal title uses `List.Subheader` with no explicit color — may not contrast in dark mode.
- Lines 87-90: Close icon button has no explicit `iconColor` — may be invisible in dark mode.
- Lines 99-101: "Add Category" button uses default contained button styling — Paper handles `onPrimary` but should be verified.
- Lines 48-56: `SegmentedButtons` uses default Paper theming — user wants explicit dark theme styling.
- Lines 61-73: Category list items use default Paper `Card` + `List.Item` — title text and delete icon colors should be verified for dark mode contrast.

### 1.2 Reference Implementation: `/add-transaction` (Working Dark Theme)

`app/add-transaction.tsx` correctly uses **only semantic theme tokens** and default Paper component theming:
- Root background: `theme.colors.background` (line 182) — already correct in category-settings (line 41)
- `SegmentedButtons`: Default Paper theming — no custom style overrides (lines 189-201)
- Modal Card: `theme.colors.surface` for calendar (line 402)
- TextInputs: Default Paper `mode="outlined"` theming
- Buttons: `theme.colors.primary` for contained buttons

**`/category-settings` MUST follow the same patterns.**

### 1.3 Current Theme System

The app uses **React Native Paper 5 (Material 3)** theming via `useTheme()` hook. Available semantic colors include:
- `theme.colors.background` — screen background
- `theme.colors.surface` / `theme.colors.surfaceVariant` — card/container backgrounds
- `theme.colors.onSurface` / `theme.colors.onSurfaceVariant` — primary/subtle text on surfaces
- `theme.colors.primary` / `theme.colors.onPrimary` — brand color and text on primary
- `theme.colors.error` / `theme.colors.onError` — error color and text on error
- `theme.colors.outline` — divider, muted text, icon colors

All fixes MUST use these semantic tokens — no hardcoded hex values.

## 2. Constraints (normative)

- **CON-01 — Semantic tokens only.** Every color value on this screen MUST come from `theme.colors.*` (or `theme.colors.*` via `StyleSheet`/`style` prop). No hardcoded hex, named CSS colors, or `rgb()/rgba()` literals.
- **CON-02 — Cross-platform parity.** Fixes MUST work identically on Android, iOS, and Web (`expo export --platform web`). No platform-specific color branches unless `Platform.OS` is required for a non-color reason.
- **CON-03 — Expo Go safe.** Changes MUST NOT crash Expo Go on import. No new native deps.
- **CON-04 — No global theme changes.** The Paper theme provider (`app/_layout.tsx`) is out of scope. Only the `/category-settings` screen is modified.
- **CON-05 — Contrast ratios.** All text/background combinations MUST meet WCAG AA (4.5:1 for normal text, 3:1 for large text) in both light and dark modes. Primary action buttons MUST use `onPrimary` for text (white on brand blue).
- **CON-06 — No breaking storage/API/nav changes.** This is purely visual.
- **CON-07 — `/category-settings` matches `/add-transaction` patterns.** The screen MUST use the same semantic token approach as `add-transaction.tsx`: root background = `theme.colors.background`; `SegmentedButtons` = default Paper theming; modal = `Card` with `theme.colors.surface`; modal title = `theme.colors.onSurface`; close icon = `theme.colors.onSurfaceVariant`; button = `theme.colors.primary`; category cards = Paper `Card` (semantic `surface`); category titles = `theme.colors.onSurface`; delete icons = `theme.colors.error` (already correct).

## 3. Goal

Replace all hardcoded colors on `/category-settings` with semantic theme tokens so the screen renders correctly in light and dark modes with proper contrast. `/category-settings` MUST visually and structurally align with `/add-transaction`'s working dark theme.

### Acceptance criteria (Objective — machine-checkable)

| ID | Criterion |
|---|---|
| **ACC-01** | `app/category-settings.tsx` contains zero hardcoded color literals (hex, named, `rgb()`). |
| **ACC-02** | Root view background uses `theme.colors.background` (already correct at line 41). |
| **ACC-03** | Modal uses Paper `Card` with `theme.colors.surface` background (matching `add-transaction.tsx:388,402`), not `Modal` with `contentContainerStyle`. |
| **ACC-04** | Modal title ("Add Expense Category" / "Add Income Category") uses `theme.colors.onSurface`. |
| **ACC-05** | Modal close icon button uses `iconColor: theme.colors.onSurfaceVariant`. |
| **ACC-06** | Modal TextInput uses default Paper `mode="outlined"` theming. |
| **ACC-07** | Modal "Add Category" button uses `mode="contained"` with `buttonColor: theme.colors.primary` (Paper handles `onPrimary` white text). |
| **ACC-08** | `SegmentedButtons` (Expenses/Income) uses **default Paper theming only** — no custom container style (matching `add-transaction.tsx:189-201`). |
| **ACC-09** | Category list items: Paper `Card` (semantic `surface`); `List.Item` title uses `theme.colors.onSurface`; delete icon uses `theme.colors.error` (already correct at line 68). |
| **ACC-10** | FAB uses default Paper theming (already uses `theme.colors.primary` for background, `theme.colors.onPrimary` for icon). |
| **ACC-11** | `jest` string-scan test (parameterized by `Platform.OS` mock) verifies no hardcoded color strings remain in `app/category-settings.tsx`. |

### Acceptance criteria (Subjective — human-judged UX)

| ID | Criterion |
|---|---|
| **ACC-12** | Reviewer confirms in Expo Go (Android + iOS) and `expo export --platform web` that the screen shows no unreadable text, no blinding white modal in dark mode, no invisible text in light mode. |
| **ACC-13** | Reviewer confirms modal title and close icon are clearly visible in both themes. |
| **ACC-14** | Reviewer confirms "Add Category" button text is white with high contrast against the button background in both themes. |
| **ACC-15** | Reviewer confirms category names in the list are readable in both themes. |
| **ACC-16** | Reviewer confirms delete icons are clearly visible (red) in both themes. |
| **ACC-17** | Reviewer confirms `/category-settings` visual parity with `/add-transaction` in dark mode: same background depth, same card elevation feel, same text contrast hierarchy. |

### Decisions

- **DEC-01:** Replace `Modal` with `contentContainerStyle` with `Portal` > `Modal` > `Card` (matching `add-transaction.tsx` calendar modal pattern at lines 378-432).
- **DEC-02:** Modal title: use `Text` with `variant="titleLarge"` and `color: theme.colors.onSurface` instead of `List.Subheader`.
- **DEC-03:** Modal close icon: `IconButton` with `iconColor: theme.colors.onSurfaceVariant`.
- **DEC-04:** Modal button: `Button mode="contained" buttonColor={theme.colors.primary}` — Paper handles `onPrimary` text color.
- **DEC-05:** `SegmentedButtons`: keep default Paper theming (no `style` prop overriding colors).
- **DEC-06:** Category cards: keep Paper `Card` (semantic `surface`); `List.Item` title automatically uses `onSurface`; delete icon already uses `theme.colors.error`.
- **DEC-07:** FAB: keep default Paper theming (already semantic).

## 4. Deliverables

- **D-01 — `app/category-settings.tsx`**: Replace all hardcoded colors per CON-01, ACC-01..10. Align structure to `add-transaction.tsx` patterns per CON-07.
- **D-02 — Tests**: Extend `utils/themeColors.test.js` to include `app/category-settings.tsx` in `FILES_TO_CHECK`.
- **D-03 — Manual verification steps**: Documented in ACC-12..17 for user-run Expo Go + web export checks.

## Glossary

| Term | Meaning |
|---|---|
| Semantic token | A `theme.colors.*` value (e.g., `surface`, `onSurfaceVariant`, `primary`) that adapts to light/dark mode automatically. |
| Hardcoded color | A literal hex string (`#fff`, `#1E3A8A`), named CSS color (`white`, `gray`), or `rgb()/rgba()` function call in style props. |

## References

- `app/category-settings.tsx` (lines 1-125)
- `app/add-transaction.tsx` (lines 1-437) — **reference implementation for dark theme patterns**
- `app/add-due.tsx` (lines 183-227) — reference for modal-with-Card pattern
- `app/_layout.tsx` — Paper theme provider (out of scope)
- React Native Paper 5 theming docs: `useTheme()`, `DefaultTheme`, `DarkTheme`