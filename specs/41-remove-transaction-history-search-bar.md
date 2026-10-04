# Spec 41: Remove Search Bar from Transaction History

| Field | Value |
|---|---|
| ID | SPEC-41 |
| Title | Remove Search Bar from Transaction History |
| Status | **FINAL** (2026-10-04 per user call "final") |
| Owner | User (final authority) |
| Version | 1.0 |
| Scope | `app/transactions.tsx` |
| Non-goals | Changing the `All`/`Expense`/`Income` filter behavior, route changes, list item rendering, empty-state structure for the no-filter case |
| Normative source | This file. File+symbol cites are normative; `:line` numbers are hints only. |

---

## Terminology (RFC 2119)

The keywords **MUST**, **MUST NOT**, **SHOULD**, and **MAY** in this spec are
to be interpreted as described in RFC 2119.

---

## 1. Context

`app/transactions.tsx` currently renders a `TextInput` search bar
(`placeholder="Search transactions..."`) above the `SegmentedButtons` filter
row. The user wants the search bar removed so the category filter tabs sit
directly under the page title and the list moves up.

### 1.1 Problem

The search input adds vertical chrome the user no longer wants on this screen.

---

## 2. Constraints

- **CON-01 (Search Bar Removed):** The `TextInput` with
  `placeholder="Search transactions..."` MUST be removed from
  `app/transactions.tsx`.
- **CON-02 (No Search State):** `searchQuery` state, its filter branch in
  `filteredTransactions`, and the `TextInput` import MUST be removed.
- **CON-03 (Filter Tabs Preserved):** The `SegmentedButtons` row with
  `All` / `Expense` / `Income` MUST remain, directly above the transaction
  count row.
- **CON-04 (Empty State Copy):** The empty-state title/subtitle conditional
  on `searchQuery` MUST be simplified to depend only on `filterType`:
  filtered-empty → `"No matching transactions"` / `"Try adjusting your filter"`;
  else `"No transactions yet"` / unchanged subtitle.
- **CON-05 (Groups Behavior):** Type filter MUST still filter by
  `t.type !== filterType` when not `"all"`; sort order MUST remain
  `date` descending.
- **CON-06 (Cross-Platform):** Android, iOS, Web MUST render identically apart
  from safe-area; no new imports of native-only modules.

---

## 3. Goal & Acceptance Criteria

### 3.1 Interaction Matrix

| Element | Before | After |
|---|---|---|
| Search bar | Shown, filters by title/category/establishment/note/paymentMethod | Removed |
| Filter tabs | Below search bar | Directly under title, above count row |
| Empty state | "Try adjusting your search query or filter" | "Try adjusting your filter" |
| List vertical position | Pushed down by search bar | Moves up |

### 3.2 Acceptance Criteria

- **ACC-01 (Objective):** `app/transactions.tsx` contains no `TextInput`
  search input and no `searchQuery` references.
- **ACC-02 (Objective):** Filter tabs and count row render in the list header;
  type filtering and date-desc sort unchanged.
- **ACC-03 (Objective):** Empty-state copy matches CON-04 exactly.
- **ACC-04 (Subjective):** Reviewer confirms the list begins higher on screen
  and the filter tabs sit right under the "Transaction History" title on
  Android, iOS, and Web.

---

## 4. Platform Matrix

| Platform | Objective Checks (`ACC-01..03`) | Subjective Checks (`ACC-04`) |
|---|---|---|
| **Android** | No TextInput/searchQuery; filter works | No gap where search bar was |
| **iOS** | Same | Same |
| **Web** | Same | Same |

---

## 5. Deliverables

- **D-01 (`app/transactions.tsx`):** Remove the search `TextInput`,
  `searchQuery` state/usages, the search branch of `filteredTransactions`,
  the `TextInput` import, and update `ListEmptyComponent` copy per CON-04.

---

## 6. Glossary

- **Filter Tabs:** The `SegmentedButtons` for All / Expense / Income.

---

## 7. References

- `specs/37-dedicated-transaction-history-screen.md`
- `AGENTS.md §1.1`, `§1.9`
