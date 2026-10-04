# Spec 48: Enlarge & Make Header Action Icons Prominent

| Field | Value |
|---|---|
| ID | SPEC-48 |
| Title | Enlarge & Make Header Action Icons Prominent |
| Status | **FINAL** (2026-10-04 per user call "final") |
| Owner | User (final authority) |
| Version | 1.0 |
| Scope | `app/savings.tsx`, `app/dues.tsx` |
| Non-goals | Route changes, behavior changes, new icons, header title changes |
| Normative source | This file. |

---

## 1. Context

The archive-box `Appbar.Action` in `app/savings.tsx` (line ~242) and the
checkmark `Appbar.Action` in `app/dues.tsx` (line ~474) already use
`color={theme.colors.primary}` (`#1B3F7A` light / `#4A90D9` dark) but render
at the default small size, so they read as decoration rather than tappable
navigation.

---

## 2. Constraints

- **CON-01 (Size):** Both actions MUST set `size={24}`.
- **CON-02 (Color):** Both MUST keep `color={theme.colors.primary}`.
- **CON-03 (Routes):** Navigation targets (`/archived-allocations`,
  `/completed-dues`) MUST be unchanged.

---

## 3. Acceptance

- **ACC-01 (Objective):** Both `Appbar.Action` renders include `size={24}`
  and `color={theme.colors.primary}`.
- **ACC-02 (Subjective):** Reviewer finds both icons clearly tappable and
  more prominent against the header on Android/iOS/Web.

---

## 4. Deliverables

- **D-01 (`app/savings.tsx`, `app/dues.tsx`):** Add `size={24}` to each
  header `Appbar.Action`.

---

## 5. References

- `specs/29-transaction-icon-vibrancy-and-archive-blue-styling.md`
- `specs/32-completed-dues-screen-and-transaction-deletion-lock.md`
- `AGENTS.md §1.9`
