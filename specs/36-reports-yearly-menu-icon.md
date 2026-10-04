# Spec 36: Fix Reports Yearly Menu Item Icon

| Field | Value |
|---|---|
| ID | SPEC-36 |
| Title | Fix Reports Yearly Menu Item Icon |
| Status | **FINAL** (2026-10-04 per user call "code this for me") |
| Owner | User (final authority) |
| Version | 1.0 |
| Scope | `app/(tabs)/reports.tsx` |
| Non-goals | Changing period definitions, date range filtering, or report charts/calculations |
| Normative source | This file. File+symbol cites are normative; `:line` numbers are hints only. |

---

## Terminology (RFC 2119)

The keywords **MUST**, **MUST NOT**, **SHOULD**, and **MAY** in this spec are
to be interpreted as described in RFC 2119. Informative prose is non-normative unless restated as a requirement.

---

## 1. Context

### 1.1 Problem

In `app/(tabs)/reports.tsx` (line 230), the Reports period selector dropdown menu defines three options:
- `Weekly` with `leadingIcon="calendar-week"`
- `Monthly` with `leadingIcon="calendar-month"`
- `Yearly` with `leadingIcon="calendar-year"`

Because `calendar-year` is not a valid icon identifier in `MaterialCommunityIcons` (the icon font utilized by React Native Paper), React Native Paper renders a fallback question mark glyph (`?`) instead of a calendar icon on the "Yearly" menu item.

The user reported this visual defect and instructed to fix the Yearly menu item icon so that it no longer shows a question mark `?`.

---

## 2. Constraints

- **CON-01 (Valid Icon):** The `leadingIcon` for the "Yearly" `Menu.Item` in `app/(tabs)/reports.tsx` MUST be set to a valid icon in `MaterialCommunityIcons`. It MUST be `"calendar-range"`.
- **CON-02 (No Question Mark Fallback):** The "Yearly" menu item MUST NOT render a question mark `?` fallback glyph.
- **CON-03 (Preserve Functionality):** The `onPress` handler, title `"Yearly"`, period state switching to `"annually"`, and date offset resets MUST remain unchanged.
- **CON-04 (Cross-Platform Parity):** The icon fix MUST render properly across Android, iOS, and Web.
- **CON-05 (Zero New Dependencies):** No new icon packs or libraries may be added; the fix MUST use existing `MaterialCommunityIcons` bundled via `@expo/vector-icons`.

---

## 3. Goal & Acceptance Criteria

### 3.1 Interaction Matrix

| Surface | Target Menu Item | Current Icon Prop | New Icon Prop | Rendered Visual |
|---|---|---|---|---|
| `app/(tabs)/reports.tsx` | "Yearly" | `"calendar-year"` | `"calendar-range"` | Valid calendar range glyph instead of `?` |

### 3.2 Acceptance Criteria

- **ACC-01 (Objective):** In `app/(tabs)/reports.tsx`, the `Menu.Item` with `title="Yearly"` has `leadingIcon="calendar-range"`.
- **ACC-02 (Objective):** No occurrences of `calendar-year` remain in the codebase.
- **ACC-03 (Subjective):** Reviewer visually confirms in the Reports screen period dropdown menu that "Yearly" displays a calendar icon rather than a question mark glyph `?`.

---

## 4. Platform Matrix

| Platform | Objective Checks (`ACC-01..02`) | Subjective Checks (`ACC-03`) |
|---|---|---|
| **Android** | `leadingIcon="calendar-range"` present | Reviewer sees calendar glyph next to Yearly, no `?` |
| **iOS** | `leadingIcon="calendar-range"` present | Reviewer sees calendar glyph next to Yearly, no `?` |
| **Web** | `leadingIcon="calendar-range"` present | Reviewer sees calendar glyph next to Yearly in web browser, no `?` |

---

## 5. Deliverables

- **D-01 (`app/(tabs)/reports.tsx`):** Replace `leadingIcon="calendar-year"` with `leadingIcon="calendar-range"` on the "Yearly" `Menu.Item`.

---

## 6. Glossary

- **MaterialCommunityIcons:** The icon glyph set provided by `@expo/vector-icons` used by React Native Paper components.
- **Period Dropdown:** The top-right menu in the Reports header allowing users to toggle between Weekly, Monthly, and Yearly report aggregation.
