# Spec 13: Theme Contrast Fixes for Add Scheduled Due Screen

| Field | Value |
|---|---|
| ID | SPEC-13 |
| Title | Theme Contrast Fixes for Add Scheduled Due Screen |
| Status | **DRAFT** |
| Owner | User (final authority) |
| Version | 1.0 — aligned to `/add-transaction` dark theme patterns |
| Scope | Hardcoded light/dark theme colors on `/add-due` screen; card backgrounds, button contrast, segmented buttons, labels/hints, input fields, category pills, date picker modal |
| Non-goals | New theme system; changing Paper theme provider; modifying global theme colors; other screens not listed |
| Normative source | This file. File+symbol cites are normative; `:line` numbers are hints only. |

> History: created 2026-09-26 per user request.

## Terminology (RFC 2119)

The keywords **MUST**, **MUST NOT**, **SHOULD**, and **MAY** in this spec are to be interpreted as described in RFC 2119. Informative prose (examples, "today", "currently") is non-normative unless restated as a requirement.

## 1. Context

### 1.1 Problem

The `/add-due` screen contains hardcoded color values that break in dark mode:

- Line 83: Card uses hardcoded `backgroundColor: "#F8FAFC"` (light slate) — invisible on dark backgrounds.
- Line 84: Section title uses hardcoded `color: "#1E293B"` (dark slate) — unreadable on dark backgrounds.
- Line 174: Primary button uses hardcoded `buttonColor: "#1E3A8A"` (blue-900) with no explicit `textColor` — Paper defaults may not guarantee `text-white` contrast.
- Line 211: Calendar `selectedDayTextColor: "#ffffff"` — hardcoded white.
- Line 216: Calendar `selectedDotColor: "#ffffff"` — hardcoded white.

Other elements (SegmentedButtons, Chips, TextInputs) use Paper's default theming via `mode="outlined"` which is correct but should be verified.

### 1.2 Reference Implementation: `/add-transaction` (Working Dark Theme)

`app/add-transaction.tsx` correctly uses **only semantic theme tokens** and default Paper component theming:
- Root background: `theme.colors.background` (line 182)
- `SegmentedButtons`: Default Paper theming — no custom style overrides (lines 189-201)
- Cards/Containers: Paper `Card`, `TextInput`, `Chip` — all use semantic tokens internally
- Muted text: `theme.colors.onSurfaceVariant` (line 230)
- Chips: `theme.colors.primaryContainer`, `theme.colors.surfaceVariant`, `theme.colors.outline`, `theme.colors.primary` (lines 243-244, 292-295, 310-317)
- Modal Card: `theme.colors.surface` for calendar (line 402)

**`/add-due` MUST follow the same patterns.**

### 1.3 Current Theme System

The app uses **React Native Paper 5 (Material 3)** theming via `useTheme()` hook. Available semantic colors include:
- `theme.colors.background` — screen background
- `theme.colors.surface` / `theme.colors.surfaceVariant` — card/container backgrounds
- `theme.colors.onSurface` / `theme.colors.onSurfaceVariant` — primary/subtle text on surfaces
- `theme.colors.primary` / `theme.colors.onPrimary` — brand color and text on primary
- `theme.colors.primaryContainer` / `theme.colors.onPrimaryContainer` — toned primary container
- `theme.colors.outline` — divider, muted text
- `theme.colors.errorContainer` / `theme.colors.onErrorContainer` — error state containers

All fixes MUST use these semantic tokens — no hardcoded hex values.

## 2. Constraints (normative)

- **CON-01 — Semantic tokens only.** Every color value on this screen MUST come from `theme.colors.*` (or `theme.colors.*` via `StyleSheet`/`style` prop). No hardcoded hex, named CSS colors, or `rgb()/rgba()` literals.
- **CON-02 — Cross-platform parity.** Fixes MUST work identically on Android, iOS, and Web (`expo export --platform web`). No platform-specific color branches unless `Platform.OS` is required for a non-color reason.
- **CON-03 — Expo Go safe.** Changes MUST NOT crash Expo Go on import. No new native deps.
- **CON-04 — No global theme changes.** The Paper theme provider (`app/_layout.tsx`) is out of scope. Only the `/add-due` screen is modified.
- **CON-05 — Contrast ratios.** All text/background combinations MUST meet WCAG AA (4.5:1 for normal text, 3:1 for large text) in both light and dark modes. Primary action buttons MUST use `onPrimary` for text (white on brand blue).
- **CON-06 — No breaking storage/API/nav changes.** This is purely visual.
- **CON-07 — `/add-due` matches `/add-transaction` patterns.** The add-due screen MUST use the same semantic token approach as `add-transaction.tsx`: root background = `theme.colors.background`; `SegmentedButtons` = default Paper theming (no custom container style); cards = Paper `Card` (semantic `surface`/`surfaceVariant`); text = `onSurface`/`onSurfaceVariant`; modal = `theme.colors.surface`; button = `theme.colors.primary`.

## 3. Goal

Replace all hardcoded colors on `/add-due` with semantic theme tokens so the screen renders correctly in light and dark modes with proper contrast. `/add-due` MUST visually and structurally align with `/add-transaction`'s working dark theme.

### Acceptance criteria (Objective — machine-checkable)

| ID | Criterion |
|---|---|
| **ACC-01** | `app/add-due.tsx` contains zero hardcoded color literals (hex, named, `rgb()`). |
| **ACC-02** | Root view background uses `theme.colors.background` (matching `add-transaction.tsx:182`). |
| **ACC-03** | Main container Card uses `theme.colors.surfaceVariant` (matching `add-allocation.tsx` pattern). |
| **ACC-04** | Section title ("Due Details") uses `theme.colors.onSurface`. |
| **ACC-05** | `SegmentedButtons` (Expense/Income) uses **default Paper theming only** — no custom container style (matching `add-transaction.tsx:189-201`). |
| **ACC-06** | Frequency/Category Chips use default Paper `mode="outlined"` theming (no inline color overrides). |
| **ACC-07** | Labels ("Frequency", "Auto-Process", "Category (Optional)", "Due Date") use `theme.colors.onSurface` or `onSurfaceVariant`. |
| **ACC-08** | Hint text (month-end review) uses `theme.colors.onSurfaceVariant` (already correct at line 137-138). |
| **ACC-09** | TextInputs (Title, Amount, Due Date) use default Paper `mode="outlined"` theming. |
| **ACC-10** | Primary button ("Save Scheduled Due") uses `buttonColor: theme.colors.primary` + implicit `onPrimary` text. |
| **ACC-11** | Date picker modal Card uses `theme.colors.surface` background (matching `add-transaction.tsx:388,402`). |
| **ACC-12** | Calendar theme: `selectedDayTextColor` = `theme.colors.onPrimary`, `selectedDotColor` = `theme.colors.onPrimary` (no hardcoded `#ffffff`). |
| **ACC-13** | `jest` string-scan test (parameterized by `Platform.OS` mock) verifies no hardcoded color strings remain. |

### Acceptance criteria (Subjective — human-judged UX)

| ID | Criterion |
|---|---|
| **ACC-14** | Reviewer confirms in Expo Go (Android + iOS) and `expo export --platform web` that the screen shows no unreadable text, no blinding white cards in dark mode, no invisible text in light mode. |
| **ACC-15** | Reviewer confirms primary button text ("Save Scheduled Due") is white with high contrast against the button background in both themes. |
| **ACC-16** | Reviewer confirms Expense/Income toggle has clearly readable inactive tab labels in both themes (matching `add-transaction`). |
| **ACC-17** | Reviewer confirms all labels, hints, and field text are readable in both themes. |
| **ACC-18** | Reviewer confirms `/add-due` visual parity with `/add-transaction` in dark mode: same background depth, same card elevation feel, same text contrast hierarchy. |

### Decisions

- **DEC-01:** Use `theme.colors.surfaceVariant` for the main container Card (elevated/accented container), matching `add-allocation.tsx` pattern.
- **DEC-02:** Use `theme.colors.onSurface` for primary text (section titles, labels), `theme.colors.onSurfaceVariant` for secondary/muted text (hints).
- **DEC-03:** Primary contained button: `buttonColor: theme.colors.primary` + implicit `onPrimary` text (Paper handles this).
- **DEC-04:** SegmentedButtons: **rely entirely on Paper's built-in theming** — remove any inline `style` prop that overrides colors/container (matching `add-transaction.tsx`).
- **DEC-05:** Chips: use default `mode="outlined"` — Paper handles `surfaceVariant`/`outline`/`onSurface`/`primary` automatically.
- **DEC-06:** TextInputs: use default `mode="outlined"` — Paper handles `surface`/`outline`/`onSurface` automatically.
- **DEC-07:** Date picker modal: wrap in Paper `Card` with `theme.colors.surface` (matching `add-transaction.tsx:388` calendar modal).
- **DEC-08:** Calendar theme: use `theme.colors.onPrimary` for `selectedDayTextColor` and `selectedDotColor` (not hardcoded white).

## 4. Deliverables

- **D-01 — `app/add-due.tsx`**: Replace all hardcoded colors per CON-01, ACC-01..12. Align structure to `add-transaction.tsx` patterns per CON-07.
- **D-02 — Tests**: Extend `utils/themeColors.test.js` to include `app/add-due.tsx` in `FILES_TO_CHECK`.
- **D-03 — Manual verification steps**: Documented in ACC-14..18 for user-run Expo Go + web export checks.

## Glossary

| Term | Meaning |
|---|---|
| Semantic token | A `theme.colors.*` value (e.g., `surface`, `onSurfaceVariant`, `primary`) that adapts to light/dark mode automatically. |
| Hardcoded color | A literal hex string (`#fff`, `#1E3A8A`), named CSS color (`white`, `gray`), or `rgb()/rgba()` function call in style props. |

## References

- `app/add-due.tsx` (lines 1-230)
- `app/add-transaction.tsx` (lines 1-437) — **reference implementation for dark theme patterns**
- `app/add-allocation.tsx` (lines 74-141) — reference for Card `surfaceVariant` pattern
- `app/_layout.tsx` — Paper theme provider (out of scope)
- React Native Paper 5 theming docs: `useTheme()`, `DefaultTheme`, `DarkTheme`