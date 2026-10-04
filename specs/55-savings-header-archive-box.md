# Spec 55: Bordered Box Container for Archive Header Action

| Field | Value |
|---|---|
| ID | SPEC-55 |
| Title | Bordered Box Container for Archive Header Action |
| Status | **FINAL** (2026-10-04 per user call "final") |
| Owner | User (final authority) |
| Version | 1.0 |
| Scope | `app/savings.tsx` |
| Non-goals | Route/behavior changes, styling of other elements, dues.tsx (Spec 54) |
| Normative source | This file. |

---

## 1. Context

The archive `Appbar.Action` in `app/savings.tsx` is a bare blue icon. Per
user call, it gets the same bordered box treatment as the dues checkmark
(Spec 54) for cross-screen consistency.

---

## 2. Constraints

- **CON-01 (Icon):** Keep `archive-outline`, primary color, 24px (SPEC-48).
- **CON-02 (Box):** Same box as Spec 54: `borderWidth: 1`,
  `borderColor: theme.colors.primary`, `borderRadius: 10`,
  `backgroundColor: theme.colors.primaryContainer`, applied via the action's
  `style` prop.
- **CON-03 (Route):** `/archived-allocations` unchanged.
- **CON-04 (Cross-Platform):** Consistent on Android/iOS/Web.

---

## 3. Acceptance

- **ACC-01 (Objective):** The archive `Appbar.Action` in `app/savings.tsx`
  carries the same style object shape as the dues checkmark per CON-02.
- **ACC-02 (Subjective):** Reviewer sees matching boxed header actions on both
  Allocations and Scheduled screens.

---

## 4. Platform Matrix

| Platform | Objective Checks | Subjective Checks |
|---|---|---|
| **Android** | ACC-01 | Boxes match |
| **iOS** | Same | Same |
| **Web** | Same | Same |

---

## 5. Deliverables

- **D-01 (`app/savings.tsx`):** Style the archive `Appbar.Action` per CON-02.

---

## 6. References

- `specs/54-dues-header-check-box.md`, `specs/48-header-action-icons.md`
