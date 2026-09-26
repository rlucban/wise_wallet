# Spec 12: Theme Contrast Fixes for Add Allocation and Dues Screens

| Field | Value |
|---|---|
| ID | SPEC-12 |
| Title | Theme Contrast Fixes for Add Allocation and Dues Screens |
| Status | **DRAFT** |
| Owner | User (final authority) |
| Version | 2.0 — aligned to `/add-transaction` dark theme patterns |
| Scope | Hardcoded light/dark theme colors on `/add-allocation` and `/dues` screens; card backgrounds, button contrast, tab controls, list item cards, section headers, helper/muted text. `/dues` MUST match `/add-transaction` semantic token patterns. |
| Non-goals | New theme system; changing Paper theme provider; modifying global theme colors; other screens not listed |
| Normative source | This file. File+symbol cites are normative; `:line` numbers are hints only. |

> History: created 2026-09-26 per user request; v2.0 2026-09-26 aligned to `/add-transaction` working dark theme.

## Terminology (RFC 2119)

The keywords **MUST**, **MUST NOT**, **SHOULD**, and **MAY** in this spec are to be interpreted as described in RFC 2119. Informative prose (examples, "today", "currently") is non-normative unless restated as a requirement.

## 1. Context

### 1.1 Problem

Two screens contain hardcoded color values that break in dark mode:

**`app/add-allocation.tsx`:**
- Line 81: Card uses hardcoded `backgroundColor: "#F8FAFC"` (light slate) — invisible on dark backgrounds.
- Line 82: Section title uses hardcoded `color: "#1E293B"` (dark slate) — unreadable on dark backgrounds.
- Lines 116-122: Helper/muted text uses hardcoded `color: "#94A3B8"` (slate-400) — too light on light backgrounds, too dark on dark backgrounds.
- Lines 127-136: Primary button uses hardcoded `buttonColor: "#1E3A8A"` (blue-900) with no explicit `textColor` — Paper defaults may not guarantee `text-white` contrast.

**`app/dues.tsx`:**
- Line 451: Root view uses hardcoded `backgroundColor: "#f5f5f5"` (gray-100) — blinding in dark mode.
- Line 294: Upcoming due cards rely on default Paper `Card` background — may not contrast in dark mode.
- Line 321: Projection message uses hardcoded `color: "#D97706"` (amber-600) — poor contrast on both themes.
- Line 375: Completed due cards use `opacity: 0.7` with no explicit background — content becomes unreadable in dark mode.
- Line 397: Completed item title uses hardcoded `color: "gray"` — low contrast on dark backgrounds.
- Line 472: Edit modal uses hardcoded `backgroundColor: "white"` — blinding in dark mode.
- Line 422-430: `SegmentedButtons` tab switcher ("This Week", "This Month", "All") — no explicit theme adaptation; inactive tab text may be unreadable.

### 1.2 Reference Implementation: `/add-transaction` (Working Dark Theme)

`app/add-transaction.tsx` correctly uses **only semantic theme tokens** and default Paper component theming:
- Root background: `theme.colors.background` (line 182)
- `SegmentedButtons`: Default Paper theming — no custom style overrides (lines 189-201)
- Cards/Containers: Paper `Card`, `TextInput`, `Chip` — all use semantic tokens internally
- Muted text: `theme.colors.onSurfaceVariant` (line 230)
- Chips: `theme.colors.primaryContainer`, `theme.colors.surfaceVariant`, `theme.colors.outline`, `theme.colors.primary` (lines 243-244, 292-295, 310-317)
- Modal Card: `theme.colors.surface` for calendar (line 402)

**`/dues` MUST follow the same patterns.**

### 1.3 Current Theme System

The app uses **React Native Paper 5 (Material 3)** theming via `useTheme()` hook. Available semantic colors include:
- `theme.colors.background` — screen background
- `theme.colors.surface` / `theme.colors.surfaceVariant` — card/container backgrounds
- `theme.colors.onSurface` / `theme.colors.onSurfaceVariant` — primary/subtle text on surfaces
- `theme.colors.primary` / `theme.colors.onPrimary` — brand color and text on primary
- `theme.colors.primaryContainer` / `theme.colors.onPrimaryContainer` — toned primary container
- `theme.colors.outline` — divider, muted text
- `theme.colors.errorContainer` / `theme.colors.onErrorContainer` — error state containers
- `theme.colors.inverseSurface` / `theme.colors.inverseOnSurface` — for elevated surfaces

All fixes MUST use these semantic tokens — no hardcoded hex values.

## 2. Constraints (normative)

- **CON-01 — Semantic tokens only.** Every color value on these two screens MUST come from `theme.colors.*` (or `theme.colors.*` via `StyleSheet`/`style` prop). No hardcoded hex, named CSS colors, or `rgb()/rgba()` literals.
- **CON-02 — Cross-platform parity.** Fixes MUST work identically on Android, iOS, and Web (`expo export --platform web`). No platform-specific color branches unless `Platform.OS` is required for a non-color reason.
- **CON-03 — Expo Go safe.** Changes MUST NOT crash Expo Go on import. No new native deps.
- **CON-04 — No global theme changes.** The Paper theme provider (`app/_layout.tsx`) is out of scope. Only the two named screens are modified.
- **CON-05 — Contrast ratios.** All text/background combinations MUST meet WCAG AA (4.5:1 for normal text, 3:1 for large text) in both light and dark modes. Primary action buttons MUST use `onPrimary` for text (white on brand blue).
- **CON-06 — No breaking storage/API/nav changes.** This is purely visual.
- **CON-07 — `/dues` matches `/add-transaction` patterns.** The dues screen MUST use the same semantic token approach as `add-transaction.tsx`: root background = `theme.colors.background`; `SegmentedButtons` = default Paper theming (no custom container style); cards = Paper `Card` (semantic `surface`); text = `onSurface`/`onSurfaceVariant`; modal = `theme.colors.surface`.

## 3. Goal

Replace all hardcoded colors on `/add-allocation` and `/dues` with semantic theme tokens so both screens render correctly in light and dark modes with proper contrast. `/dues` MUST visually and structurally align with `/add-transaction`'s working dark theme.

### Acceptance criteria (Objective — machine-checkable)

| ID | Criterion |
|---|---|
| **ACC-01** | `app/add-allocation.tsx` contains zero hardcoded color literals (hex, named, `rgb()`). |
| **ACC-02** | `app/dues.tsx` contains zero hardcoded color literals (hex, named, `rgb()`). |
| **ACC-03** | Primary button on Add Allocation uses `buttonColor: theme.colors.primary` (or `theme.colors.primaryContainer` with `textColor: theme.colors.onPrimaryContainer`) and text is `theme.colors.onPrimary` (white). |
| **ACC-04** | Root view background on Dues uses `theme.colors.background` (matching `add-transaction.tsx:182`). |
| **ACC-05** | All Card containers use `theme.colors.surface` or `theme.colors.surfaceVariant` via Paper `Card` component (not hardcoded). |
| **ACC-06** | Section headers ("Upcoming", "Completed") use `theme.colors.onSurface` (or `onSurfaceVariant` for subdued). |
| **ACC-07** | Helper/muted text ("Available balance", "Setting a goal…", projection message, date/amount subtext) uses `theme.colors.onSurfaceVariant`. |
| **ACC-08** | Completed due cards use `theme.colors.surface` with `theme.colors.onSurface` text (no `opacity` hack). Strikethrough style preserved via `textDecorationLine`. |
| **ACC-09** | `SegmentedButtons` tab switcher uses **default Paper theming only** — no custom container style, no inline color overrides (matching `add-transaction.tsx:189-201`). |
| **ACC-10** | Edit modal on Dues uses `theme.colors.surface` for its container (matching `add-transaction.tsx:388,402`). |
| **ACC-11** | Summary banner ("Month Total" card) uses `theme.colors.errorContainer` background with `theme.colors.onErrorContainer` text (matching `add-transaction` Chip selected pattern). Text MUST be `text-white` equivalent via `onErrorContainer`. |
| **ACC-12** | Due item cards (upcoming) use Paper `Card` with default theming; inner icon container uses `theme.colors.surfaceVariant` (matching `add-transaction` Chip `surfaceVariant` pattern). Primary text = `theme.colors.onSurface`; subtext = `theme.colors.onSurfaceVariant`. |
| **ACC-13** | `jest` tests (parameterized by `Platform.OS` mock) verify no hardcoded color strings remain in the two files (string scan). |

### Acceptance criteria (Subjective — human-judged UX)

| ID | Criterion |
|---|---|
| **ACC-14** | Reviewer confirms in Expo Go (Android + iOS) and `expo export --platform web` (Chrome devtools device toolbar) that both screens show no unreadable text, no blinding white cards in dark mode, no invisible text in light mode. |
| **ACC-15** | Reviewer confirms primary button text ("Create Allocation", "Save Changes") is white with high contrast against the button background in both themes. |
| **ACC-16** | Reviewer confirms tab switcher ("This Week", "This Month", "All") has clearly readable inactive tab labels in both themes (matching `add-transaction` Expense/Income toggle). |
| **ACC-17** | Reviewer confirms "Completed" header and completed-item text are readable (not gray-on-dark-gray) in dark mode. |
| **ACC-18** | Reviewer confirms `/dues` visual parity with `/add-transaction` in dark mode: same background depth, same card elevation feel, same text contrast hierarchy. |

### Decisions

- **DEC-01:** Use `theme.colors.surface` for standard cards (Paper `Card` default), `theme.colors.surfaceVariant` for elevated/accented containers (e.g., the Allocation Details card, icon backgrounds in due items).
- **DEC-02:** Use `theme.colors.onSurface` for primary text, `theme.colors.onSurfaceVariant` for secondary/muted text.
- **DEC-03:** Primary contained buttons: `buttonColor: theme.colors.primary` + implicit `onPrimary` text (Paper handles this). If explicit `textColor` needed, use `theme.colors.onPrimary`.
- **DEC-04:** Completed due cards: remove `opacity: 0.7`; use Paper `Card` (semantic `surface`) with `theme.colors.onSurface` text + `textDecorationLine: "line-through"`.
- **DEC-05:** Projection message (accent): use `theme.colors.onSurfaceVariant` with `fontWeight: "600"` — no hardcoded amber.
- **DEC-06:** SegmentedButtons: **rely entirely on Paper's built-in theming** — remove any inline `style` prop that overrides colors/container (matching `add-transaction.tsx`).
- **DEC-07:** Summary banner ("Week/Month Total"): use `theme.colors.errorContainer` background + `theme.colors.onErrorContainer` for text (white in dark mode, dark in light mode). Bold via `fontWeight: "700"`.
- **DEC-08:** Due item icon container: `theme.colors.surfaceVariant` background (matching `add-transaction` Chip `surfaceVariant` pattern), icon color = `theme.colors.primary` for income, `theme.colors.error` for expense.
- **DEC-09:** Edit modal: wrap in Paper `Card` with `theme.colors.surface` (matching `add-transaction.tsx:388` calendar modal).

## 4. Deliverables

- **D-01 — `app/add-allocation.tsx`**: Replace all hardcoded colors per CON-01, ACC-01, ACC-03, ACC-05, ACC-07.
- **D-02 — `app/dues.tsx`**: Replace all hardcoded colors per CON-01, ACC-02, ACC-04, ACC-05, ACC-06, ACC-07, ACC-08, ACC-09, ACC-10, ACC-11, ACC-12. Align structure to `add-transaction.tsx` patterns per CON-07.
- **D-03 — Tests**: Add `utils/themeColors.test.ts` (or extend existing test file) with a string-scan test parameterized by `Platform.OS` (`android`/`ios`/`web` via mock) that fails if any of the two files contain hex color literals (`/#([0-9a-fA-F]{3,8})/`), named CSS colors, or `rgb(`/`rgba(` literals.
- **D-04 — Manual verification steps**: Documented in ACC-14..18 for user-run Expo Go + web export checks.

## Glossary

| Term | Meaning |
|---|---|
| Semantic token | A `theme.colors.*` value (e.g., `surface`, `onSurfaceVariant`, `primary`) that adapts to light/dark mode automatically. |
| Hardcoded color | A literal hex string (`#fff`, `#1E3A8A`), named CSS color (`white`, `gray`), or `rgb()/rgba()` function call in style props. |

## References

- `app/add-allocation.tsx` (lines 74-141)
- `app/dues.tsx` (lines 1-627)
- `app/add-transaction.tsx` (lines 1-437) — **reference implementation for dark theme patterns**
- `app/_layout.tsx` — Paper theme provider (out of scope)
- React Native Paper 5 theming docs: `useTheme()`, `DefaultTheme`, `DarkTheme`