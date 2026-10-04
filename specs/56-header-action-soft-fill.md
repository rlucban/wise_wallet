# Spec 56: Refine Header Action Boxes (No Border, Soft Fill)

| Field | Value |
|---|---|
| ID | SPEC-56 |
| Title | Refine Header Action Boxes (No Border, Soft Fill) |
| Status | **FINAL** (2026-10-04 per user call "final") |
| Owner | User (final authority) |
| Version | 1.0 |
| Scope | `app/dues.tsx`, `app/savings.tsx` |
| Non-goals | Behavior, icon names/sizes (24px kept), routes |
| Normative source | This file. |

---

## 1. Context

Specs 54/55 added a bordered box around each header action icon. The double
outline (border + primaryContainer fill) looks cluttered. Refine to borderless
soft-filled rounded squares with primary-blue icons.

---

## 2. Constraints

- **CON-01 (No border):** Both header action containers MUST remove
  `borderWidth`/`borderColor` (or set `borderWidth: 0`).
- **CON-02 (Soft fill):** Both MUST use `backgroundColor: "#E8EEFF"` (light
  blue tint; ties to theme but must read as a soft fill on light and dark
  headers — acceptable per user call).
- **CON-03 (Icon):** Keep `theme.colors.primary` icon color and `size={24}`.
- **CON-04 (Radius):** Keep `borderRadius: 10`, IconButton touch target ≥40px.
- **CON-05 (Cross-Platform):** Same on Android/iOS/Web.

---

## 3. Acceptance

- **ACC-01 (Objective):** Both `Appbar.Action` styles contain
  `backgroundColor: "#E8EEFF"` and no `borderColor`/`borderWidth` (or
  `borderWidth: 0`).
- **ACC-02 (Subjective):** Reviewer confirms borderless soft-blue rounded
  squares with blue icons on both screens.

---

## 4. Platform Matrix

| Platform | Objective Checks | Subjective Checks |
|---|---|---|
| **Android** | ACC-01 | Clean, modern look |
| **iOS** | Same | Same |
| **Web** | Same | Same |

---

## 5. Deliverables

- **D-01 (`app/dues.tsx`, `app/savings.tsx`):** Replace the bordered box
  style with `{ borderRadius: 10, backgroundColor: "#E8EEFF" }`.

---

## 6. References

- `specs/54-dues-header-check-box.md`, `specs/55-savings-header-archive-box.md`
