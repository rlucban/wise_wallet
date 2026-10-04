# Spec 40: Floating Tab Bar Sizing & Legibility

| Field | Value |
|---|---|
| ID | SPEC-40 |
| Title | Floating Tab Bar Sizing & Legibility |
| Status | **FINAL** (2026-10-04 per user call "final") |
| Owner | User (final authority) |
| Version | 1.0 |
| Scope | `app/(tabs)/_layout.tsx`, `utils/tabBarMetrics.ts`, `utils/tabBarMetrics.test.ts` |
| Non-goals | Route changes, color/theme changes, new tabs, safe-area model changes, `tabBarMetrics` height formula for the underlying hidden system tab bar |
| Normative source | This file. File+symbol cites are normative; `:line` numbers are hints only. |

---

## Terminology (RFC 2119)

The keywords **MUST**, **MUST NOT**, **SHOULD**, and **MAY** in this spec are
to be interpreted as described in RFC 2119. Informative prose is non-normative unless restated as a requirement.

---

## 1. Context

### 1.1 Problem

The floating pill tab bar (Spec 38/39) looks thin/squished: mobile pill uses
`paddingVertical: 6`, labels at 11px / weight 500, icons at 20px, and the `+`
button at 52x52 — legibility and tap targets are below a comfortable standard
on phones, desktops, and tablets.

### 1.2 Goal

Enlarge the floating navigation chrome for legibility and tappability while
preserving the responsive split (Spec 39) and safe-area behavior (Spec 32):

- Pill container total height ~64–68px (via padding + content), never squished.
- Tab label font size 15px, semi-bold (`600`, highlighted tab `700`).
- Tab icons 24px on both mobile and desktop.
- Circular `+` button 56x56px on mobile, proportionally matched on desktop
  (`58x58` is acceptable — MUST visually align vertically with the pill).
- Pill-shaped `borderRadius` preserved (`>= 32`), balanced elevation/shadow.

---

## 2. Constraints

- **CON-01 (Pill Height):** The floating pill container MUST render with a
  vertical extent of ~64–68px on mobile (`width < 768`), achieved via
  `paddingVertical: 12` (or an equivalent content-driven height of 64–68px).
- **CON-02 (Label Style):** Tab labels MUST render at `fontSize: 15` with
  `fontWeight: "600"` (inactive) and `fontWeight: "700"` (focused tab).
- **CON-03 (Icon Size):** Tab icons MUST render at `size: 24` on both mobile
  and desktop viewports.
- **CON-04 (Plus Button):** The detached circular `+` button MUST be
  `56x56` with `borderRadius: 28` on mobile; on desktop (`width >= 768`) it
  MUST be `58x58` (`borderRadius: 29`) or larger, vertically centered with the
  pill container. Its plus icon MUST be >= `26px`.
- **CON-05 (Pill Shape & Elevation):** The pill container MUST keep a
  fully-rounded capsule radius (`borderRadius >= 32`) and its existing shadow
  model on native (`shadowOpacity: 0.10`, `elevation: 6`) and
  `boxShadow: "0px 4px 20px rgba(0, 0, 0, 0.08)"` on web.
- **CON-06 (Responsive Split Preserved):** `isDesktop = width >= 768`, desktop
  `maxWidth: 760`, mobile `maxWidth: 480`, desktop row layout / mobile column
  layout MUST be preserved from Spec 39. Only sizes/weights change here.
- **CON-07 (Color Continuity):** Active tabs MUST keep `theme.colors.primary`
  icon/text on `theme.colors.primaryContainer` pill; inactive tabs MUST keep
  `theme.colors.outline`. No color changes.
- **CON-08 (Tests):** `utils/tabBarMetrics.test.ts` MUST pass after adding
  new assertions for the sizing constants via a pure helper (e.g. a new
  `getTabBarSizing(isDesktop)` export in `utils/tabBarMetrics.ts`) parameterized
  by `Platform.OS` (`android`/`ios`/`web` via mock) per §1.10.
- **CON-09 (Cross-Platform):** Android, iOS, and Web MUST all render without
  clipping; no new native modules, no Node APIs in app code.

---

## 3. Goal & Acceptance Criteria

### 3.1 Interaction Matrix

| Element | Viewport | New Metric |
|---|---|---|
| Pill container paddingVertical | Mobile | `12` (total height ~64–68px) |
| Pill container paddingVertical | Desktop | `12`–`14` |
| Tab label fontSize / weight | Both | `15` / `600` (`700` focused) |
| Tab icon size | Both | `24` |
| `+` button | Mobile | `56x56`, `borderRadius: 28` |
| `+` button | Desktop | `58x58`, `borderRadius: 29` |
| `+` plus-icon size | Both | `>= 26` |

### 3.2 Acceptance Criteria

- **ACC-01 (Objective):** `FloatingTabBar` uses the new sizing constants
  (pill padding, 15px/600 label, 24px icon, 56/58px plus button).
- **ACC-02 (Objective):** The focused tab label uses weight `700`; inactive
  `600`.
- **ACC-03 (Objective):** The `+` button navigates to `/add-transaction`
  (unchanged behavior).
- **ACC-04 (Objective):** Jest: a new parameterized test over
  `Platform.OS` ∈ {android, ios, web} asserts the sizing constants returned by
  the pure helper, and the full existing `tabBarMetrics.test.ts` suite passes.
- **ACC-05 (Subjective):** Reviewer confirms on Expo Go (Android/iOS) and
  `expo export --platform web` that the pill no longer looks squished — it
  reads as a prominent floating capsule, labels and icons are legible, and the
  `+` button aligns flush with the pill vertically.

---

## 4. Platform Matrix

| Platform | Objective Checks (`ACC-01..04`) | Subjective Checks (`ACC-05`) |
|---|---|---|
| **Android** | Jest branches pass; styles applied | Pill floats cleanly, legible at typical phone width |
| **iOS** | Jest branches pass; styles applied | Pill respects home-indicator inset, not cramped |
| **Web** | Jest branches pass; `boxShadow` retained | Desktop and mobile viewports both legible |

---

## 5. Deliverables

- **D-01 (`utils/tabBarMetrics.ts`):** Add a pure, exported
  `getTabBarSizing(isDesktop: boolean)` helper returning
  `{ paddingVertical, labelFontSize, labelFontWeight, focusedLabelFontWeight, iconSize, actionButtonSize, actionButtonRadius, actionIconSize }`
  with the values in §3.1. No `react-native` import (keep it pure per Spec 32).
- **D-02 (`app/(tabs)/_layout.tsx`):** Consume `getTabBarSizing` in
  `FloatingTabBar` for the pill container, tab item label/icon, and the `+`
  button. Keep route logic, colors, shadow model, and safe-area math unchanged.
- **D-03 (`utils/tabBarMetrics.test.ts`):** Add `Platform.OS`-parameterized
  assertions for every field in §3.1 across android/ios/web.

---

## 6. Glossary

- **Pill Container:** The floating rounded surface holding the four tab items.
- **Detached Circular Button:** The floating `+` button to the right of the pill.

---

## 7. References

- `specs/32-tab-bar-label-visibility.md` (safe-area metrics)
- `specs/38-floating-pill-tab-bar.md` (pill design origin)
- `specs/39-responsive-floating-tab-bar.md` (desktop/mobile split)
- `AGENTS.md §1.9`, `§1.10` (spec format; TDD platform matrix)
