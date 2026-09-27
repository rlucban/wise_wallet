# Spec 16: Theme Contrast Fixes for Learning Screens

| Field | Value |
|---|---|
| ID | SPEC-16 |
| Title | Theme Contrast Fixes for Learning and Learning Detail Screens |
| Status | **DRAFT** |
| Owner | User (final authority) |
| Version | 1.0 — aligned to `/add-transaction` dark theme patterns |
| Scope | Hardcoded light/dark theme colors on `/learning`, `/learning-detail`, and `FinancialTip` component; article titles, daily insight card, article cards, audio controls, badges |
| Non-goals | New theme system; changing Paper theme provider; modifying global theme colors; other screens not listed |
| Normative source | This file. File+symbol cites are normative; `:line` numbers are hints only. |

> History: created 2026-09-26 per user request.

## Terminology (RFC 2119)

The keywords **MUST**, **MUST NOT**, **SHOULD**, and **MAY** in this spec are to be interpreted as described in RFC 2119. Informative prose (examples, "today", "currently") is non-normative unless restated as a requirement.

## 1. Context

### 1.1 Problem

The `/learning`, `/learning-detail`, and `FinancialTip` component contain hardcoded color values that break in dark mode:

**`app/(tabs)/learning.tsx`:**
- Lines 80-91: `getPastelTagStyle()` returns hardcoded light backgrounds (`#E8F5E9`, `#E3F2FD`, `#FBE9E7`, `#F3E5F5`) and dark texts (`#2E7D32`, `#1565C0`, `#C62828`, `#6A1B9A`) — invisible/unreadable in dark mode.
- Lines 193-197: Audience badge uses hardcoded `#F5F5F5` background and `#616161` text.
- Lines 202-208: Audio play button uses hardcoded `#1E3A8A` icon color and `#DBEAFE` background when active.

**`app/(tabs)/learning-detail.tsx`:**
- Line 193: Article title uses hardcoded `#1B3F7A` (dark blue) — invisible on dark background.
- Lines 194-202: Audio control bar uses hardcoded `#F1F5F9` background.
- Lines 203-207: Audio status text uses hardcoded `#475569` (slate-600) — low contrast in dark mode.
- Line 165: Play/pause icon uses hardcoded `#1E3A8A`.
- Line 174: Stop icon uses hardcoded `#64748B`.
- Line 208: Body text uses `opacity: 0.85` — reduces contrast in both themes.

**`components/FinancialTip.tsx`:**
- Line 54: Card uses hardcoded `#e3f2fd` background, `#1976d2` border.
- Line 57: Title text uses hardcoded `#1976d2`.
- Line 65: Footer text uses hardcoded `#90a4ae`.

### 1.2 Reference Implementation: `/add-transaction` (Working Dark Theme)

`app/add-transaction.tsx` correctly uses **only semantic theme tokens** and default Paper component theming:
- Root background: `theme.colors.background`
- Cards: Paper `Card` (semantic `surface`)
- Text: `theme.colors.onSurface`, `theme.colors.onSurfaceVariant`
- Chips: `theme.colors.primaryContainer`, `theme.colors.surfaceVariant`, `theme.colors.outline`, `theme.colors.primary`
- Accent containers: `theme.colors.primaryContainer` with `theme.colors.onPrimaryContainer`

**Learning screens MUST follow the same patterns.**

### 1.3 Current Theme System

The app uses **React Native Paper 5 (Material 3)** theming via `useTheme()` hook. Available semantic colors include:
- `theme.colors.background` — screen background
- `theme.colors.surface` / `theme.colors.surfaceVariant` — card/container backgrounds
- `theme.colors.onSurface` / `theme.colors.onSurfaceVariant` — primary/subtle text on surfaces
- `theme.colors.primary` / `theme.colors.onPrimary` — brand color and text on primary
- `theme.colors.primaryContainer` / `theme.colors.onPrimaryContainer` — toned primary container
- `theme.colors.secondaryContainer` / `theme.colors.onSecondaryContainer` — toned secondary container
- `theme.colors.tertiaryContainer` / `theme.colors.onTertiaryContainer` — toned tertiary container
- `theme.colors.outline` — divider, muted text, icon colors

All fixes MUST use these semantic tokens — no hardcoded hex values.

## 2. Constraints (normative)

- **CON-01 — Semantic tokens only.** Every color value on these screens/components MUST come from `theme.colors.*` (or `theme.colors.*` via `StyleSheet`/`style` prop). No hardcoded hex, named CSS colors, or `rgb()/rgba()` literals.
- **CON-02 — Cross-platform parity.** Fixes MUST work identically on Android, iOS, and Web (`expo export --platform web`). No platform-specific color branches unless `Platform.OS` is required for a non-color reason.
- **CON-03 — Expo Go safe.** Changes MUST NOT crash Expo Go on import. No new native deps.
- **CON-04 — No global theme changes.** The Paper theme provider (`app/_layout.tsx`) is out of scope. Only the named screens/components are modified.
- **CON-05 — Contrast ratios.** All text/background combinations MUST meet WCAG AA (4.5:1 for normal text, 3:1 for large text) in both light and dark modes.
- **CON-06 — No breaking storage/API/nav changes.** This is purely visual.
- **CON-07 — Learning screens match `/add-transaction` patterns.** Use semantic tokens: root background = `theme.colors.background`; cards = Paper `Card` (semantic `surface`); text = `onSurface`/`onSurfaceVariant`; badges/chips = `primaryContainer`/`secondaryContainer`/`tertiaryContainer` with corresponding `on*` tokens; audio bar = `surfaceVariant` with `onSurfaceVariant` text.

## 3. Goal

Replace all hardcoded colors on `/learning`, `/learning-detail`, and `FinancialTip` with semantic theme tokens so screens render correctly in light and dark modes with proper contrast.

### Acceptance criteria (Objective — machine-checkable)

| ID | Criterion |
|---|---|
| **ACC-01** | `app/(tabs)/learning.tsx` contains zero hardcoded color literals (hex, named, `rgb()`). |
| **ACC-02** | `app/(tabs)/learning-detail.tsx` contains zero hardcoded color literals (hex, named, `rgb()`). |
| **ACC-03** | `components/FinancialTip.tsx` contains zero hardcoded color literals (hex, named, `rgb()`). |
| **ACC-04** | Root backgrounds use `theme.colors.background` (already correct). |
| **ACC-05** | Article cards use Paper `Card` (semantic `surface`); title = `onSurface`; description = `onSurfaceVariant`. |
| **ACC-06** | Topic badges (Savings, Budgeting, Debt) use semantic containers: `primaryContainer`/`secondaryContainer`/`tertiaryContainer` with corresponding `on*` text. |
| **ACC-07** | Audience badge uses `theme.colors.surfaceVariant` background with `theme.colors.onSurfaceVariant` text. |
| **ACC-08** | Audio play button: icon = `theme.colors.primary`; active background = `theme.colors.primaryContainer`. |
| **ACC-09** | Bookmark icon: active = `theme.colors.primary`; inactive = `theme.colors.outline` (already correct). |
| **ACC-10** | FinancialTip card: `theme.colors.primaryContainer` background with `theme.colors.onPrimaryContainer` text; border = `theme.colors.primary`. |
| **ACC-11** | FinancialTip title: `theme.colors.onPrimaryContainer`; tip title = `theme.colors.onPrimaryContainer`; tip message = `theme.colors.onPrimaryContainer`; footer = `theme.colors.onSurfaceVariant`. |
| **ACC-12** | Learning Detail article title: `theme.colors.onSurface` (bold). |
| **ACC-13** | Learning Detail audio bar: `theme.colors.surfaceVariant` background; text = `theme.colors.onSurfaceVariant`. |
| **ACC-14** | Learning Detail audio icons: play/pause = `theme.colors.primary`; stop = `theme.colors.onSurfaceVariant`. |
| **ACC-15** | Learning Detail body text: `theme.colors.onSurface` (no opacity reduction). |
| **ACC-16** | `jest` string-scan test (parameterized by `Platform.OS` mock) verifies no hardcoded color strings remain in the three files. |

### Acceptance criteria (Subjective — human-judged UX)

| ID | Criterion |
|---|---|
| **ACC-17** | Reviewer confirms in Expo Go (Android + iOS) and `expo export --platform web` that screens show no unreadable text, no blinding light cards in dark mode. |
| **ACC-18** | Reviewer confirms article titles, descriptions, and badges are readable in both themes. |
| **ACC-19** | Reviewer confirms Daily Insight card (FinancialTip) is readable with proper contrast in both themes. |
| **ACC-20** | Reviewer confirms audio controls are clearly visible in both themes. |
| **ACC-21** | Reviewer confirms visual parity with `/add-transaction` dark theme: same background depth, same card feel, same text hierarchy. |

### Decisions

- **DEC-01:** Topic badges: use `primaryContainer`/`onPrimaryContainer` for Savings, `secondaryContainer`/`onSecondaryContainer` for Budgeting, `tertiaryContainer`/`onTertiaryContainer` for Debt, `surfaceVariant`/`onSurfaceVariant` for default.
- **DEC-02:** Audience badge: `surfaceVariant` background + `onSurfaceVariant` text.
- **DEC-03:** Audio play button: icon = `primary`; active background = `primaryContainer`.
- **DEC-04:** FinancialTip: `primaryContainer` background + `onPrimaryContainer` text + `primary` left border (matching accent pattern).
- **DEC-05:** Learning Detail audio bar: `surfaceVariant` background; text = `onSurfaceVariant`.
- **DEC-06:** Learning Detail audio icons: play/pause = `primary`; stop = `onSurfaceVariant`.
- **DEC-07:** Learning Detail body: `onSurface` with normal opacity (no 0.85).
- **DEC-08:** Article title in learning-detail: `onSurface` with `fontWeight: "700"`.

## 4. Deliverables

- **D-01 — `app/(tabs)/learning.tsx`**: Replace all hardcoded colors per CON-01, ACC-01, ACC-05..09.
- **D-02 — `app/(tabs)/learning-detail.tsx`**: Replace all hardcoded colors per CON-01, ACC-02, ACC-12..15.
- **D-03 — `components/FinancialTip.tsx`**: Replace all hardcoded colors per CON-01, ACC-03, ACC-10..11.
- **D-04 — Tests**: Extend `utils/themeColors.test.js` to include all three files in `FILES_TO_CHECK`.
- **D-05 — Manual verification steps**: Documented in ACC-17..21 for user-run Expo Go + web export checks.

## Glossary

| Term | Meaning |
|---|---|
| Semantic token | A `theme.colors.*` value (e.g., `surface`, `onSurfaceVariant`, `primary`) that adapts to light/dark mode automatically. |
| Hardcoded color | A literal hex string (`#fff`, `#1E3A8A`), named CSS color (`white`, `gray`), or `rgb()/rgba()` function call in style props. |

## References

- `app/(tabs)/learning.tsx` (lines 1-359)
- `app/(tabs)/learning-detail.tsx` (lines 1-209)
- `components/FinancialTip.tsx` (lines 1-74)
- `app/add-transaction.tsx` (lines 1-437) — **reference implementation for dark theme patterns**
- `app/_layout.tsx` — Paper theme provider (out of scope)
- React Native Paper 5 theming docs: `useTheme()`, `DefaultTheme`, `DarkTheme`