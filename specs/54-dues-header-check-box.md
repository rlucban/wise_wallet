# Spec 54: Bordered Box Container for Completed Dues Header Action

| Field | Value |
|---|---|
| ID | SPEC-54 |
| Title | Bordered Box Container for Completed Dues Header Action |
| Status | **FINAL** (2026-10-04 per user call "final") |
| Owner | User (final authority) |
| Version | 1.0 |
| Scope | `app/dues.tsx` |
| Non-goals | Changing icon identity, route, or behavior; other header actions |
| Normative source | This file. |

---

## 1. Context

The completed-dues checkmark in `app/dues.tsx` currently shows as a bare
blue icon; the user wants it visibly tappable. Decision: keep the check
circle glyph and put it inside a bordered box.

---

## 2. Constraints

- **CON-01 (Icon):** Keep a check-circle icon for the action — use
  `check-circle-outline` (current value) or `checkmark-circle-outline` /
  `check-circle` per the implemented value; a recognized MDI name (no `?`
  fallback).
- **CON-02 (Box):** The action's container MUST have a visible rounded-rect
  box: `borderWidth: 1`, `borderColor: theme.colors.primary`,
  `backgroundColor: theme.colors.primaryContainer` (light tint), and
  `borderRadius` ~8–10. Implement via the `style` prop of the `Appbar.Action`
  (IconButton style) so touch area stays generous.
- **CON-03 (Icon color):** Icon color MUST remain `theme.colors.primary`.
- **CON-04 (Size):** Icon stays ~24px (SPEC-48). Touch target stays at
  least 40px (IconButton default).
- **CON-05 (Cross-Platform):** Android/iOS/Web render the box consistently.

---

## 3. Acceptance

- **ACC-01 (Objective):** The `Appbar.Action` in `app/dues.tsx` header has a
  `style` with `borderColor: theme.colors.primary`, `borderWidth: 1`,
  `borderRadius`, and `backgroundColor` set.
- **ACC-02 (Subjective):** Reviewer sees a clearly tappable bordered box
  around the check icon on the Scheduled header.

---

## 4. Platform Matrix

| Platform | Objective Checks | Subjective Checks |
|---|---|---|
| **Android** | ACC-01 | Box visible, tappable |
| **iOS** | Same | Same |
| **Web** | Same | Same |

---

## 5. Deliverables

- **D-01 (`app/dues.tsx`):** Style the completed-dues `Appbar.Action` per
  CON-01..04.

---

## 6. References

- `specs/48-header-action-icons.md`
- `AGENTS.md §1.9`
