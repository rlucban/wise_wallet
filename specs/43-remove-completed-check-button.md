# Spec 43: Remove Completed-Goal Check Button from Savings Cards

| Field | Value |
|---|---|
| ID | SPEC-43 |
| Title | Remove Completed-Goal Check Button from Savings Cards |
| Status | **FINAL** (2026-10-04 per user call "final") |
| Owner | User (final authority) |
| Version | 1.0 |
| Scope | `app/savings.tsx` |
| Non-goals | Changing active-allocation cards, archive/delete behavior, the `Goal Reached` badge, or the full progress bar |
| Normative source | This file. File+symbol cites are normative; `:line` numbers are hints only. |

---

## Terminology (RFC 2119)

The keywords **MUST**, **MUST NOT**, **SHOULD**, and **MAY** in this spec are
to be interpreted as described in RFC 2119.

---

## 1. Context

Per user call, the green checkmark-circle button on completed allocation
cards (`app/savings.tsx`) reads as a tappable control and is oversized next
to the 18px archive/delete icons. The card already carries a `Goal Reached`
badge, so the indicator is redundant. Decision: remove it entirely.

---

## 2. Constraints

- **CON-01 (Removal):** The 48px green circle wrapper View and its
  `MaterialCommunityIcons name="check-circle"` MUST be removed from the
  completed-items card.
- **CON-02 (Actions Kept):** Only the archive (`archive-arrow-down-outline`)
  and delete (`delete-outline`) `IconButton`s MUST remain on the right side.
- **CON-03 (Badge Kept):** The `Goal Reached` badge and full progress bar
  MUST remain unchanged.
- **CON-04 (No Dead Code):** The card's type literal
  (`successContainer`/`onSuccessContainer`/`success` extended colors) MAY be
  retained if still referenced by the badge/progress bar (it is — badge uses
  `successContainer`/`onSuccessContainer`, progress uses `success`).
- **CON-05 (Cross-Platform):** Android, iOS, Web render identically.

---

## 3. Goal & Acceptance Criteria

### 3.1 Interaction Matrix

| Element | Before | After |
|---|---|---|
| Check circle button | Large green circle, 28px icon | Removed |
| Right actions | Archive, Delete (+ check circle) | Archive, Delete only |
| `Goal Reached` badge | Present | Unchanged |

### 3.2 Acceptance Criteria

- **ACC-01 (Objective):** `app/savings.tsx` completed-card branch contains no
  `check-circle` / `checkmark-circle` icon and no 48px circle wrapper View.
- **ACC-02 (Objective):** Archive and delete `IconButton`s remain wired to
  `handleArchiveItem` / `handleDelete`.
- **ACC-03 (Subjective):** Reviewer confirms the completed card shows title,
  badge, amount line, full progress bar, and only archive/delete on the right —
  no `?` and no button-like green circle.

---

## 4. Platform Matrix

| Platform | Objective Checks (`ACC-01..02`) | Subjective Checks (`ACC-03`) |
|---|---|---|
| **Android** | Icon + wrapper removed | Card looks balanced |
| **iOS** | Same | Same |
| **Web** | Same | Same |

---

## 5. Deliverables

- **D-01 (`app/savings.tsx`):** Delete the "Middle: Green Checkmark Circle"
  View block from the completed-items card.

---

## 6. Glossary

- **Completed Allocation:** Savings item whose balance has reached
  `target_amount`.

---

## 7. References

- `specs/42-allocations-card-render-fixes.md` (superseded in part: its
  check-circle rename is reverted by this spec for the completed card)
- `AGENTS.md §1.1`, `§1.9`
