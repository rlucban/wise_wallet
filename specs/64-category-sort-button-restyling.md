# SPEC-64 — Category Sort Button Restyling

| Field   | Value                                           |
| ------- | ----------------------------------------------- |
| ID      | SPEC-64                                         |
| Title   | Category Sort Button Restyling                  |
| Status  | **FINAL**                                       |
| Owner   | Agent                                           |
| Version | 1.0                                             |
| Scope   | `app/category-settings.tsx`                     |
| Non-goals | Transaction History sort, Dues sort, any other screens |

> **RFC 2119** — MUST, MUST NOT, SHOULD, MAY per RFC 2119.

---

## Context

The Manage Categories screen (`app/category-settings.tsx`) has a sort toggle
button below the Expenses/Income segment tabs. The current button is a tiny
36×36 rounded square with an ambiguous icon (clock icon for "Most Recent" state,
abstract alpha icons for A-Z/Z-A). It is positioned on the left side and does
not visually communicate that it is a sort control.

The user wants a clearly labeled sort button in the **header area**, styled as a
rounded pill with a descriptive icon and "Sort" text label, toggling between
two states only (A-Z and Z-A).

---

## Constraints

- **CON-01** The sort button MUST be placed in the **top-right header area**,
  inline with the "Manage Categories" screen title (inside `Appbar.Header`),
  NOT below the segment tabs.
- **CON-02** The toggle MUST be a **2-state cycle** only: A-Z (ascending) ↔
  Z-A (descending). The "Most Recent" / clock state MUST be removed.
- **CON-03** Both states MUST use a **down arrow (↓)** to indicate top-to-bottom
  list reading order:
  - **A-Z state:** icon shows `A` above `Z` with ↓ arrow (MaterialCommunityIcons
    `sort-alphabetical-ascending`).
  - **Z-A state:** icon shows `Z` above `A` with ↓ arrow (MaterialCommunityIcons
    `sort-alphabetical-descending`).
- **CON-04** The button MUST display a **"Sort" text label** beside the icon.
- **CON-05** The button MUST be styled as a clean, rounded container with
  background color `#E8EEFF` (light blue fill), no outer stroke/border,
  matching filled header action button style.
- **CON-06** Cross-platform: Android, iOS, Web MUST all render identically.
  No platform-specific code needed.
- **CON-07** The existing sort logic (`sortedCategories` useMemo) MUST remain
  functionally equivalent — only the state values and cycle change. Default
  sort on screen mount MUST be `alphabetical-asc` (A-Z).
- **CON-08** No other files or screens are affected.

---

## Goal

### Interaction

| Action                  | Current state | Next state | Icon shown                        |
| ----------------------- | ------------- | ---------- | --------------------------------- |
| Press Sort button       | A-Z (asc)     | Z-A (desc) | `sort-alphabetical-descending`    |
| Press Sort button again | Z-A (desc)    | A-Z (asc)  | `sort-alphabetical-ascending`     |

### Decisions

- **DEC-01** Remove the 3rd "most-recent" state entirely (simplify UX).
- **DEC-02** Place button as a custom right-side action in the `Appbar.Header`
  (not as `Appbar.Action` which can't hold text + icon together).
- **DEC-03** Use `#E8EEFF` background with rounded corners (`borderRadius: 16`)
  for the pill shape.

### Acceptance

- **ACC-01** Sort button is visible in the header row, right-aligned, on all
  three platforms.
- **ACC-02** Button shows icon + "Sort" text label.
- **ACC-03** Pressing toggles between A-Z ↔ Z-A (no third state).
- **ACC-04** Category list re-sorts immediately on toggle.
- **ACC-05** Default state on screen mount is A-Z (ascending).
- **ACC-06** The old sort `TouchableOpacity` + `IconButton` below the segment
  tabs is removed.

---

## Deliverables

- **D-01 `app/category-settings.tsx`** — Remove old sort button (lines 71-95).
  Change `sortBy` state type to `"alphabetical-asc" | "alphabetical-desc"`.
  Remove `"most-recent"` branch from the `sortedCategories` useMemo. Add a
  custom right-side element inside `Appbar.Header`: a `TouchableOpacity` with
  `#E8EEFF` background, `borderRadius: 16`, containing the
  `sort-alphabetical-ascending` / `sort-alphabetical-descending` icon +
  `"Sort"` text label. Toggle cycles between the two states only.

---

## Glossary

| Term       | Definition                                    |
| ---------- | --------------------------------------------- |
| A-Z (asc)  | Alphabetical ascending — A at top, Z at bottom |
| Z-A (desc) | Alphabetical descending — Z at top, A at bottom |

## References

- Reference UI: user-provided screenshot showing `Z↓A Sort` pill button style
- `app/category-settings.tsx` current implementation (lines 15, 26-40, 71-95)
