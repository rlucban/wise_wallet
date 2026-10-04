# Spec 57: Fix Raw `\u2014` in Transfer Modals

| Field | Value |
|---|---|
| ID | SPEC-57 |
| Title | Fix Raw `\u2014` in Transfer Modals |
| Status | **FINAL** (2026-10-04 per user call "final") |
| Owner | User (final authority) |
| Version | 1.0 |
| Scope | `app/savings.tsx` |
| Non-goals | Modal copy otherwise, layout, amounts |
| Normative source | This file. |

---

## 1. Context

Lines 446 and 483 of `app/savings.tsx` contain the literal text `\u2014`
inside JSX text, which renders verbatim instead of as an em-dash.

---

## 2. Constraints

- **CON-01:** Replace the literal `\u2014` sequences in both Transfer In and
  Transfer Out descriptions with a plain hyphen-based phrasing:
  `This creates an expense transaction - money leaves your main balance.`
  and
  `This creates an income transaction - money returns to your main balance.`
  (Equivalent proper `—` character is acceptable if preferred.)
- **CON-02:** No other copy/behavior changes.

---

## 3. Acceptance

- **ACC-01 (Objective):** No literal `\u2014` remains in `app/savings.tsx`.
- **ACC-02 (Subjective):** Reviewer sees a clean hyphen/dash in both modals.

---

## 4. Deliverables

- **D-01 (`app/savings.tsx`):** Apply CON-01 to both modal descriptions.

---

## 5. References

- `AGENTS.md §1.9`
