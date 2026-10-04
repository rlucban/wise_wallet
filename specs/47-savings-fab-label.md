# Spec 47: Shorten Savings FAB Label

| Field | Value |
|---|---|
| ID | SPEC-47 |
| Title | Shorten Savings FAB Label to "+ Allocation" |
| Status | **FINAL** (2026-10-04 per user call "final") |
| Owner | User (final authority) |
| Version | 1.0 |
| Scope | `app/savings.tsx` |
| Non-goals | FAB position/style, icon, route, other FAB labels |
| Normative source | This file. |

---

## 1. Context

`app/savings.tsx` FAB currently: `icon="plus"`, `label="New Allocation"`.
User wants the compact label `+ Allocation`. Because the FAB already renders
the `+` via its `icon` prop, the equivalent change is `label="Allocation"`.

---

## 2. Constraints

- **CON-01:** The FAB label MUST read `Allocation` (icon remains `plus`, so
  the rendered text is `+ Allocation`).
- **CON-02:** Icon (`plus`), route (`/add-allocation`), position, and styling
  MUST remain unchanged.

---

## 3. Acceptance

- **ACC-01 (Objective):** `app/savings.tsx` FAB has `label="Allocation"`.
- **ACC-02 (Subjective):** Reviewer sees `+ Allocation` on the savings screen FAB.

---

## 4. Deliverables

- **D-01 (`app/savings.tsx`):** Change FAB `label` to `"Allocation"`.

---

## 5. References

- `AGENTS.md §1.9`
