# Spec 14: Theme Contrast Fixes for Allocations Screens (Savings & Add Allocation)

| Field | Value |
|---|---|
| ID | SPEC-14 |
| Title | Theme Contrast Fixes for Allocations Screens (Savings & Add Allocation) |
| Status | **DRAFT** |
| Owner | User (final authority) |
| Version | 1.0 — aligned to `/add-transaction` dark theme patterns |
| Scope | Hardcoded light/dark theme colors on `/savings` and `/add-allocation` screens; page backgrounds, cards, FAB, modals, progress bars, text colors |
| Non-goals | New theme system; changing Paper theme provider; modifying global theme colors; other screens not listed |
| Normative source | This file. File+symbol cites are normative; `:line` numbers are hints only. |

> History: created 2026-09-26 per user request.

## Terminology (RFC 2119)

The keywords **MUST**, **MUST NOT**, **SHOULD**, and **MAY** in this spec are to be interpreted as described in RFC 2119. Informative prose (examples, "today", "currently") is non-normative unless restated as a requirement.

## 1. Context

### 1.1 Problem

The `/savings` and `/add-allocation` screens contain hardcoded color values that break in dark mode:

**`app/savings.tsx`:**
- Line 286: Root view uses hardcoded `backgroundColor: "#f5f5f5"` (gray-100) — blinding in dark mode.
- Line 294: Total Allocated card uses hardcoded `backgroundColor: "#1E3A8A"` with hardcoded text colors `#93C5FD` and `#fff`.
- Lines 311, 410: Section headers ("Active", "Completed") use default text color — may not contrast in dark mode.
- Lines 324, 424: Active/Completed item titles use hardcoded `color: "#1E293B"` and `color: "#64748B"` — unreadable on dark backgrounds.
- Lines 327, 345, 440: Subtext uses hardcoded `color: "#64748B"`, `#94A3B8` — poor contrast in dark mode.
- Lines 337, 370, 444: Progress bar backgrounds use hardcoded `#E2E8F0` — invisible on dark backgrounds.
- Lines 341, 448: Progress bar fills use hardcoded `#1E3A8A`, `#16A34A` — no semantic meaning.
- Lines 358, 432, 459: Circular indicators use hardcoded `#F1F5F9`, `#DCFCE7` backgrounds — blinding in dark mode.
- Lines 377, 464: Circular indicator text/icon colors use hardcoded `#FFFFFF`/`#1E293B`, `#16A34A` — poor contrast.
- Lines 282, 283: Modal containers use hardcoded `#FFFFFF` and `white` — blinding in dark mode.
- Lines 486, 497, 503, 533, 547: Modal text uses hardcoded `#1E293B`, `#94A3B8`, `#64748B`, `#EF4444` — poor contrast in dark mode.
- Lines 489, 521, 551: Modal buttons use hardcoded `buttonColor: "#1E3A8A"` — no semantic token.
- Line 572: FAB uses hardcoded `backgroundColor: "#1E3A8A"` and `color: "#fff"`.

**`app/add-allocation.tsx`:**
- Line 81: Card uses `theme.colors.surfaceVariant` — correct (already fixed in SPEC-12).
- Lines 116-122: Helper text uses `theme.colors.onSurfaceVariant` — correct (already fixed).
- Line 132: Button uses `theme.colors.primary` — correct (already fixed).

Wait, `/add-allocation` was already fixed in SPEC-12. The user's request mentions additional fixes:
- "Container Card: Use standard dark surface styling (`bg-slate-900 border border-slate-800 rounded-xl`)" — but we're using Paper semantic tokens, not Tailwind classes
- "Action Button: Ensure the text inside the blue button uses high-contrast dark or white bold text" — Paper handles this via `onPrimary`
- "Field Subtext & Hints: Update 'Available balance' and helper text colors to readable light gray" — already uses `onSurfaceVariant`

Actually, the user's request seems to be using Tailwind class names as descriptive examples, but the actual implementation uses Paper semantic tokens. The `/add-allocation` screen was already fixed in SPEC-12. The main work is on `/savings`.

### 1.2 Reference Implementation: `/add-transaction` (Working Dark Theme)

`app/add-transaction.tsx` correctly uses **only semantic theme tokens** and default Paper component theming:
- Root background: `theme.colors.background` (line 182)
- `SegmentedButtons`: Default Paper theming — no custom style overrides (lines 189-201)
- Cards/Containers: Paper `Card`, `TextInput`, `Chip` — all use semantic tokens internally
- Muted text: `theme.colors.onSurfaceVariant` (line 230)
- Chips: `theme.colors.primaryContainer`, `theme.colors.surfaceVariant`, `theme.colors.outline`, `theme.colors.primary` (lines 243-244, 292-295, 310-317)
- Modal Card: `theme.colors.surface` for calendar (line 402)

**`/savings` MUST follow the same patterns.**

### 1.3 Current Theme System

The app uses **React Native Paper 5 (Material 3)** theming via `useTheme()` hook. Available semantic colors include:
- `theme.colors.background` — screen background
- `theme.colors.surface` / `theme.colors.surfaceVariant` — card/container backgrounds
- `theme.colors.onSurface` / `theme.colors.onSurfaceVariant` — primary/subtle text on surfaces
- `theme.colors.primary` / `theme.colors.onPrimary` — brand color and text on primary
- `theme.colors.primaryContainer` / `theme.colors.onPrimaryContainer` — toned primary container
- `theme.colors.secondaryContainer` / `theme.colors.onSecondaryContainer` — toned secondary container
- `theme.colors.tertiaryContainer` / `theme.colors.onTertiaryContainer` — toned tertiary container
- `theme.colors.errorContainer` / `theme.colors.onErrorContainer` — error state containers
- `theme.colors.successContainer` / `theme.colors.onSuccessContainer` — success state containers (if available)
- `theme.colors.outline` — divider, muted text

All fixes MUST use these semantic tokens — no hardcoded hex values.

## 2. Constraints (normative)

- **CON-01 — Semantic tokens only.** Every color value on these screens MUST come from `theme.colors.*` (or `theme.colors.*` via `StyleSheet`/`style` prop). No hardcoded hex, named CSS colors, or `rgb()/rgba()` literals.
- **CON-02 — Cross-platform parity.** Fixes MUST work identically on Android, iOS, and Web (`expo export --platform web`). No platform-specific color branches unless `Platform.OS` is required for a non-color reason.
- **CON-03 — Expo Go safe.** Changes MUST NOT crash Expo Go on import. No new native deps.
- **CON-04 — No global theme changes.** The Paper theme provider (`app/_layout.tsx`) is out of scope. Only the named screens are modified.
- **CON-05 — Contrast ratios.** All text/background combinations MUST meet WCAG AA (4.5:1 for normal text, 3:1 for large text) in both light and dark modes. Primary action buttons MUST use `onPrimary` for text (white on brand blue).
- **CON-06 — No breaking storage/API/nav changes.** This is purely visual.
- **CON-07 — `/savings` matches `/add-transaction` patterns.** The savings screen MUST use the same semantic token approach as `add-transaction.tsx`: root background = `theme.colors.background`; cards = Paper `Card` (semantic `surface`/`surfaceVariant`/`primaryContainer`/`errorContainer`/`successContainer`); text = `onSurface`/`onSurfaceVariant`/`onPrimaryContainer`/`onErrorContainer`/`onSuccessContainer`; modal = `theme.colors.surface`; button = `theme.colors.primary`.

## 3. Goal

Replace all hardcoded colors on `/savings` (and verify `/add-allocation`) with semantic theme tokens so both screens render correctly in light and dark modes with proper contrast. `/savings` MUST visually and structurally align with `/add-transaction`'s working dark theme.

### Acceptance criteria (Objective — machine-checkable)

| ID | Criterion |
|---|---|
| **ACC-01** | `app/savings.tsx` contains zero hardcoded color literals (hex, named, `rgb()`). |
| **ACC-02** | Root view background uses `theme.colors.background` (matching `add-transaction.tsx:182`). |
| **ACC-03** | Total Allocated card uses `theme.colors.primaryContainer` background with `theme.colors.onPrimaryContainer` text (matching `add-transaction` Chip selected pattern). |
| **ACC-04** | Section headers ("Active", "Completed") use `theme.colors.onSurface`. |
| **ACC-05** | Active item titles use `theme.colors.onSurface`; subtext uses `theme.colors.onSurfaceVariant`. |
| **ACC-06** | Progress bar background uses `theme.colors.surfaceVariant`; fill uses `theme.colors.primary`. |
| **ACC-07** | Progress percentage text uses `theme.colors.onSurfaceVariant`. |
| **ACC-08** | Circular indicator background uses `theme.colors.surfaceVariant`; fill uses `theme.colors.primaryContainer` (or `primary`); text uses `theme.colors.onPrimaryContainer` (or `onPrimary`). |
| **ACC-09** | Completed item titles use `theme.colors.onSurfaceVariant`; "Goal Reached" badge uses `theme.colors.successContainer` background with `theme.colors.onSuccessContainer` text (or `tertiaryContainer`/`onTertiaryContainer`). |
| **ACC-10** | Completed progress bar background uses `theme.colors.surfaceVariant`; fill uses `theme.colors.success` (or `tertiary`); 100% indicator uses `theme.colors.successContainer`/`onSuccessContainer`. |
| **ACC-11** | Checkmark circle background uses `theme.colors.successContainer`; icon uses `theme.colors.onSuccessContainer`. |
| **ACC-12** | Modal containers use `theme.colors.surface` background (matching `add-transaction.tsx:388` calendar modal). |
| **ACC-13** | Modal text uses `theme.colors.onSurface` for titles, `theme.colors.onSurfaceVariant` for hints, `theme.colors.error` for errors. |
| **ACC-14** | Modal buttons use `buttonColor: theme.colors.primary`. |
| **ACC-15** | FAB uses `backgroundColor: theme.colors.primary` (Paper FAB handles `onPrimary` for icon/label). |
| **ACC-16** | `jest` string-scan test (parameterized by `Platform.OS` mock) verifies no hardcoded color strings remain in `app/savings.tsx`. |

### Acceptance criteria (Subjective — human-judged UX)

| ID | Criterion |
|---|---|
| **ACC-17** | Reviewer confirms in Expo Go (Android + iOS) and `expo export --platform web` that the screen shows no unreadable text, no blinding white cards in dark mode, no invisible text in light mode. |
| **ACC-18** | Reviewer confirms FAB text ("New Allocation") is white with high contrast against the button background in both themes. |
| **ACC-19** | Reviewer confirms all section headers, item titles, subtext, progress bars, and badges are readable in both themes. |
| **ACC-20** | Reviewer confirms `/savings` visual parity with `/add-transaction` in dark mode: same background depth, same card elevation feel, same text contrast hierarchy. |

### Decisions

- **DEC-01:** Use `theme.colors.background` for root view.
- **DEC-02:** Total Allocated card: `theme.colors.primaryContainer` background + `theme.colors.onPrimaryContainer` text (matching `add-transaction` selected Chip pattern).
- **DEC-03:** Section headers: `theme.colors.onSurface`.
- **DEC-04:** Active item cards: Paper `Card` (semantic `surface`); title = `onSurface`; subtext = `onSurfaceVariant`.
- **DEC-05:** Progress bar: background = `theme.colors.surfaceVariant`; fill = `theme.colors.primary`; percentage text = `onSurfaceVariant`.
- **DEC-06:** Circular progress indicator: container background = `theme.colors.surfaceVariant`; fill = `theme.colors.primaryContainer`; text = `theme.colors.onPrimaryContainer` (auto-contrast).
- **DEC-07:** Completed item cards: Paper `Card` (semantic `surface`); title = `onSurfaceVariant`; subtext = `onSurfaceVariant`.
- **DEC-08:** "Goal Reached" badge: `theme.colors.successContainer` background + `theme.colors.onSuccessContainer` text. If `successContainer` not available, use `tertiaryContainer`/`onTertiaryContainer`.
- **DEC-09:** Completed progress bar: background = `surfaceVariant`; fill = `theme.colors.success` (or `tertiary`); 100% text = `onSuccessContainer` (or `onTertiaryContainer`).
- **DEC-10:** Checkmark circle: background = `successContainer`; icon = `onSuccessContainer`.
- **DEC-11:** Modals: wrap in Paper `Card` with `theme.colors.surface` background (matching `add-transaction.tsx:388`).
- **DEC-12:** Modal text: titles = `onSurface`; hints = `onSurfaceVariant`; errors = `error`.
- **DEC-13:** Modal buttons: `buttonColor: theme.colors.primary`.
- **DEC-14:** FAB: `backgroundColor: theme.colors.primary`; `color: theme.colors.onPrimary` (explicit for clarity).

## 4. Deliverables

- **D-01 — `app/savings.tsx`**: Replace all hardcoded colors per CON-01, ACC-01..15. Align structure to `add-transaction.tsx` patterns per CON-07.
- **D-02 — `app/add-allocation.tsx`**: Verify already compliant (SPEC-12). No changes needed if already using semantic tokens.
- **D-03 — Tests**: Extend `utils/themeColors.test.js` to include `app/savings.tsx` in `FILES_TO_CHECK`.
- **D-04 — Manual verification steps**: Documented in ACC-17..20 for user-run Expo Go + web export checks.

## Glossary

| Term | Meaning |
|---|---|
| Semantic token | A `theme.colors.*` value (e.g., `surface`, `onSurfaceVariant`, `primary`) that adapts to light/dark mode automatically. |
| Hardcoded color | A literal hex string (`#fff`, `#1E3A8A`), named CSS color (`white`, `gray`), or `rgb()/rgba()` function call in style props. |

## References

- `app/savings.tsx` (lines 1-586)
- `app/add-allocation.tsx` (lines 1-142) — already fixed in SPEC-12
- `app/add-transaction.tsx` (lines 1-437) — **reference implementation for dark theme patterns**
- `app/_layout.tsx` — Paper theme provider (out of scope)
- React Native Paper 5 theming docs: `useTheme()`, `DefaultTheme`, `DarkTheme`