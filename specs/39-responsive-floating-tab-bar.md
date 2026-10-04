# Spec 39: Responsive Floating Pill Navigation Bar

| Field | Value |
|---|---|
| ID | SPEC-39 |
| Title | Responsive Floating Pill Navigation Bar |
| Status | **FINAL** (2026-10-04 per user call "code this for me") |
| Owner | User (final authority) |
| Version | 1.0 |
| Scope | `app/(tabs)/_layout.tsx` |
| Non-goals | Route changes, screen renames, or altering navigation hierarchy |
| Normative source | This file. File+symbol cites are normative; `:line` numbers are hints only. |

---

## Terminology (RFC 2119)

The keywords **MUST**, **MUST NOT**, **SHOULD**, and **MAY** in this spec are
to be interpreted as described in RFC 2119. Informative prose is non-normative unless restated as a requirement.

---

## 1. Context

### 1.1 Problem

In Spec 38, the floating pill bottom navigation bar was implemented with a fixed `maxWidth: 480` and compact vertical (stacked) icon-over-label typography. On desktop / wide web browsers (`width >= 768px`), this caused the navigation bar to look disproportionately small and cramped in the middle of a large viewport.

The user requested that the floating navigation bar adapt responsively depending on the device screen size (web desktop vs. phone screen).

### 1.2 Proposed Solution

Use `useWindowDimensions()` to dynamically detect viewport width:
1. **Desktop View (`width >= 768px`):**
   - Expand the pill container width up to `760px` with generous padding.
   - Switch tab item layout to horizontal (`flexDirection: "row"`), placing the icon beside the label with an 8px gap.
   - Increase label font size from 11px to 14px and icon size to 22px for crisp readability on desktop monitors.
   - Scale the circular `+` button to 58x58px.
2. **Mobile View (`width < 768px`):**
   - Maintain the compact, thumb-friendly vertical stacked layout (`maxWidth: 480px`, 11px font, 52x52px circular button).

---

## 2. Constraints

- **CON-01 (Dynamic Dimensions):** `FloatingTabBar` MUST read live screen dimensions using `useWindowDimensions()` from `react-native`.
- **CON-02 (Desktop Breakpoint):** The desktop layout mode MUST activate when `width >= 768`.
- **CON-03 (Desktop Styling):** On desktop screens:
  - The navigation wrapper MUST have `maxWidth: 760`.
  - Tab items MUST render with `flexDirection: "row"`, aligning icon and label horizontally with `gap: 8` / `marginLeft: 8`.
  - Tab label font size MUST be `14`.
  - Circular `+` button dimensions MUST be `58x58` with `borderRadius: 29`.
- **CON-04 (Mobile Styling):** On mobile screens (`width < 768`), tab items MUST retain vertical stacked layout with `fontSize: 11` and `maxWidth: 480`.
- **CON-05 (Color Continuity):** Active tabs MUST continue to stick to `theme.colors.primary` for icon and text, with `theme.colors.primaryContainer` pill highlight background.
- **CON-06 (Test Continuity):** `utils/tabBarMetrics.test.ts` assertions MUST continue to pass without regression.

---

## 3. Goal & Acceptance Criteria

### 3.1 Interaction Matrix

| Viewport Width | Tab Item Direction | Label Font Size | Max Container Width | Circular '+' Size |
|---|---|---|---|---|
| `< 768px` (Mobile) | Vertical (Column) | `11px` | `480px` | `52x52px` |
| `>= 768px` (Desktop) | Horizontal (Row) | `14px` | `760px` | `58x58px` |

### 3.2 Acceptance Criteria

- **ACC-01 (Objective):** In `app/(tabs)/_layout.tsx`, `useWindowDimensions` is imported from `react-native` and consumed in `FloatingTabBar`.
- **ACC-02 (Objective):** `isDesktop` predicate is computed as `width >= 768`.
- **ACC-03 (Objective):** On desktop viewports, `FloatingTabBar` renders a wider container (`maxWidth: 760`), horizontal icon+label layout, and 14px font size.
- **ACC-04 (Objective):** On mobile viewports, `FloatingTabBar` renders the compact vertical layout.
- **ACC-05 (Subjective):** Reviewer visually confirms in a desktop browser that the navigation bar looks appropriately sized, spacious, and legible.

---

## 4. Platform Matrix

| Platform | Objective Checks (`ACC-01..04`) | Subjective Checks (`ACC-05`) |
|---|---|---|
| **Android** | Evaluates mobile layout when `< 768px` | Well-proportioned phone navigation |
| **iOS** | Evaluates mobile layout when `< 768px` | Well-proportioned phone navigation |
| **Web** | Responsive resize adapts from mobile column to desktop row | Sleek, dock-like desktop appearance |

---

## 5. Deliverables

- **D-01 (`app/(tabs)/_layout.tsx`):** Update `FloatingTabBar` to responsively style container width, item direction, font sizes, and button scale based on `isDesktop`.

---

## 6. Glossary

- **Responsive Floating Dock:** A navigation bar that morphs between a compact phone pill and a spacious desktop floating dock based on viewport width.
