# Spec 27: Allocation Archive Functionality in Savings Screen

| Field | Value |
|---|---|
| ID | SPEC-27 |
| Title | Allocation Archive Functionality in Savings Screen |
| Status | **FINAL** (2026-09-30 per user call "code this for me") |
| Owner | User (final authority) |
| Version | 1.0 |
| Scope | `types/index.ts`, `app/savings.tsx` |
| Non-goals | Altering database backend schemas; modifying navigation routes; altering transaction-splitting logic |
| Normative source | This file. File+symbol cites are normative; `:line` numbers are hints only. |

---

## Terminology (RFC 2119)

The keywords **MUST**, **MUST NOT**, **SHOULD**, and **MAY** in this spec are
to be interpreted as described in RFC 2119. Informative prose is non-normative unless restated as a requirement.

---

## 1. Context

### 1.1 Problem

Currently, `app/savings.tsx` allows users to create, edit, transfer into/out of, and delete allocations (`SavingsItem`). When an allocation goal is achieved or a user wishes to set aside an allocation without permanently erasing its history, the only current mechanism is deletion. Deleting immediately transfers any remaining funds and destroys the record. Users need the ability to archive allocations to keep their active view clutter-free while preserving past allocation records with read-only protection, and the option to either restore or permanently delete them later.

---

## 2. Constraints

- **CON-01**: `types/index.ts` MUST include an optional `isArchived?: boolean` field on the `SavingsItem` interface.
- **CON-02**: In `app/savings.tsx`, an allocation with `isArchived: true` MUST NOT appear in the "Active" or "Completed" active allocations lists. It MUST appear strictly under an "Archived Allocations" section.
- **CON-03**: In active allocation cards, an Archive action button (`archive-arrow-down-outline` or `archive-outline`) MUST be present. Pressing it MUST update the item to `{ isArchived: true }` and display a user feedback notification ("Allocation archived").
- **CON-04**: The screen MUST present clear totals:
  - Top summary card displays Total Active Allocated.
  - The "Archived Allocations" section displays the total archived amount (e.g., "Total Archived: ₱X.XX").
  - Overall reserved funds for main balance calculation MUST still include all allocated funds until withdrawn or deleted.
- **CON-05**: In the "Archived Allocations" section:
  - The Edit (Pencil) button MUST be hidden or disabled to enforce read-only status.
  - Money transfer buttons (Transfer In / Transfer Out) MUST be hidden or disabled.
  - A Restore button (`archive-arrow-up-outline` or `backup-restore`) MUST be provided to set `isArchived: false` and return the item to the active section.
  - A Delete Permanently button (`delete-forever-outline` or `delete-outline`) MUST prompt a `ConfirmDialog` before permanently removing the record via `deleteItem`.
- **CON-06**: Cross-platform invariant: Parity across Web, Android, and iOS without native import crashes or regressions.
- **CON-07**: `npm run lint` MUST pass with 0 errors and 0 warnings.

---

## 3. Goal & Acceptance Criteria

### 3.1 Platform Matrix

| Platform | Objective Checks (`ACC-01`..`05`) | Subjective Reviewer Checks (`ACC-06`..`07`) |
|---|---|---|
| **Web** | `isArchived` toggle works; Active & Archived lists render separately; total amounts accurate; archived edit button hidden | Reviewer verifies smooth archiving and restoring on desktop web without UI glitches |
| **Android** | `isArchived` toggle works; Active & Archived lists render separately; total amounts accurate; archived edit button hidden | Reviewer verifies responsive Material 3 layout in Expo Go |
| **iOS** | `isArchived` toggle works; Active & Archived lists render separately; total amounts accurate; archived edit button hidden | Reviewer verifies responsive Material 3 layout in Expo Go |

### 3.2 Acceptance Criteria

- **ACC-01**: `types/index.ts` exports `SavingsItem` with `isArchived?: boolean`.
- **ACC-02**: Pressing Archive on an active allocation card sets `isArchived: true` using `updateItem(id, { isArchived: true })` and shows a confirmation toast.
- **ACC-03**: The screen separates "Active Allocations" and "Archived Allocations" with their respective counts and subtotals.
- **ACC-04**: Archived allocation cards omit the Edit button and money transfer buttons.
- **ACC-05**: Archived allocation cards provide a "Restore" button (restoring `isArchived: false`) and a "Delete Permanently" button (triggering `ConfirmDialog` and calling `deleteItem`).
- **ACC-06**: `npm run lint` produces 0 errors and 0 warnings.
- **ACC-07**: Reviewer confirms visually that archived cards are clearly demarcated from active ones.

---

## 4. Deliverables

- **D-01 (`types/index.ts`)**: Add `isArchived?: boolean` to `SavingsItem`.
- **D-02 (`app/savings.tsx`)**:
  - Split items into active and archived lists with subtotal computations.
  - Add Archive action button to active cards.
  - Add "Archived Allocations" section with header total.
  - Enforce read-only state for archived cards (no Edit/Transfer), adding Restore and Delete Permanently actions.
- **D-03 (`docs/savepoint.md` & `AGENTS.md`)**: Update change log and current status entries.

---

## 5. References

- [savings.tsx](file:///c:/Users/rcluc/Downloads/wise_wallet/app/savings.tsx)
- [types/index.ts](file:///c:/Users/rcluc/Downloads/wise_wallet/types/index.ts)
