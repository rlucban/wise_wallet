# Spec 32: Dedicated Completed Dues Screen & Scheduled Transaction Deletion Lock

| Field | Value |
|---|---|
| ID | SPEC-32 |
| Title | Dedicated Completed Dues Screen & Scheduled Transaction Deletion Lock |
| Status | **FINAL** (2026-09-30 per user call "code this for me") |
| Owner | User (final authority) |
| Version | 1.0 |
| Scope | `app/dues.tsx`, `app/completed-dues.tsx`, `app/_layout.tsx`, `app/transaction-details.tsx` |
| Non-goals | Altering database schemas; modifying storage keys |
| Normative source | This file. File+symbol cites are normative; `:line` numbers are hints only. |

---

## Terminology (RFC 2119)

The keywords **MUST**, **MUST NOT**, **SHOULD**, and **MAY** in this spec are
to be interpreted as described in RFC 2119. Informative prose is non-normative unless restated as a requirement.

---

## 1. Context

### 1.1 Problem

1. **Completed Dues Inline in Scheduled Screen:** In `app/dues.tsx`, completed dues are currently rendered directly underneath upcoming dues in the same screen. Similar to SPEC-28 for Allocations, the user requested that "Completed" dues be accessed via a dedicated icon button on the top-right of the header in `app/dues.tsx` navigating to a separate screen, keeping `/dues` focused purely on upcoming dues.
2. **Paid Dues Transactions Deletable in History:** When a scheduled due is paid/received, a transaction is recorded in history (`transactions`). Currently, in `app/transaction-details.tsx`, the delete button remains active for transactions created from scheduled dues. The user explicitly requires that once a due is paid and completed, its recorded transaction in the dashboard/recent activity history MUST NOT be deletable.

---

## 2. Constraints

- **CON-01**: In `app/dues.tsx`, the `Appbar.Header` MUST render an action button on the top right (`<Appbar.Action icon="check-circle-outline" color={theme.colors.primary} />`) navigating to `/completed-dues`.
- **CON-02**: In `app/dues.tsx`, inline completed dues MUST be removed from `listData`. The screen displays only upcoming scheduled dues.
- **CON-03**: A new screen `app/completed-dues.tsx` MUST be created and registered in `app/_layout.tsx`:
  - `Appbar.Header` MUST include back action navigating to `/dues` and title `"Completed Dues"`.
  - Filter segmented buttons (This Week, This Month, All) or full list of completed dues.
  - Read-only list: no edit (pencil), no delete (trash), no undo buttons (per SPEC-07).
  - When empty, renders `EmptyState` (`icon="check-circle-outline"`, title="No completed dues", subtitle="Completed scheduled dues will appear here").
- **CON-04**: In `app/dues.tsx`, `recordTransaction()` MUST pass `dueId: item.id` when calling `addTransaction()`.
- **CON-05**: In `app/transaction-details.tsx`, if a transaction originated from a scheduled due (`dueId` exists or `category?.id === "scheduled"`):
  - The delete (trash) action button MUST be hidden, preventing deletion of the recorded payment from recent activity/dashboard.
- **CON-06**: Cross-platform invariant: Parity across Web, Android, and iOS.
- **CON-07**: `npm run lint` MUST pass with 0 errors and 0 warnings.

---

## 3. Goal & Acceptance Criteria

### 3.1 Acceptance Criteria

- **ACC-01**: In `app/dues.tsx`, header contains `<Appbar.Action icon="check-circle-outline" color={theme.colors.primary} onPress={() => router.push("/completed-dues")} />`.
- **ACC-02**: In `app/dues.tsx`, completed dues are not rendered inline in the list.
- **ACC-03**: `app/completed-dues.tsx` displays completed dues in read-only mode with date and amount, plus empty state.
- **ACC-04**: `app/_layout.tsx` registers `<Stack.Screen name="completed-dues" />`.
- **ACC-05**: `app/dues.tsx` sets `dueId: item.id` when creating transactions from dues.
- **ACC-06**: In `app/transaction-details.tsx`, transactions with `dueId` or `category.id === "scheduled"` hide the delete button.
- **ACC-07**: `npm run lint` passes with 0 errors and 0 warnings.

---

## 4. Deliverables

- **D-01 (`app/dues.tsx`)**: Add header completed action button; remove inline completed dues from list; pass `dueId` in `recordTransaction`.
- **D-02 (`app/completed-dues.tsx`)**: Dedicated Completed Dues screen.
- **D-03 (`app/_layout.tsx`)**: Register `completed-dues` route.
- **D-04 (`app/transaction-details.tsx`)**: Hide delete button for transactions originating from scheduled dues.
- **D-05 (`docs/savepoint.md` & `AGENTS.md`)**: Update documentation.

---

## 5. References

- [dues.tsx](file:///c:/Users/rcluc/Downloads/wise_wallet/app/dues.tsx)
- [transaction-details.tsx](file:///c:/Users/rcluc/Downloads/wise_wallet/app/transaction-details.tsx)
- [_layout.tsx](file:///c:/Users/rcluc/Downloads/wise_wallet/app/_layout.tsx)
- [07-completed-due-locking-and-auto-progression.md](file:///c:/Users/rcluc/Downloads/wise_wallet/specs/07-completed-due-locking-and-auto-progression.md)
