# Spec 31: Unify Transaction Category Icon in Transaction Details

| Field | Value |
|---|---|
| ID | SPEC-31 |
| Title | Unify Transaction Category Icon in Transaction Details |
| Status | **FINAL** (2026-09-30 per user call "code this for me") |
| Owner | User (final authority) |
| Version | 1.0 |
| Scope | `app/transaction-details.tsx` |
| Non-goals | Database schema changes; modifying backend API |
| Normative source | This file. File+symbol cites are normative; `:line` numbers are hints only. |

---

## Terminology (RFC 2119)

The keywords **MUST**, **MUST NOT**, **SHOULD**, and **MAY** in this spec are
to be interpreted as described in RFC 2119. Informative prose is non-normative unless restated as a requirement.

---

## 1. Context

### 1.1 Problem

Currently, `app/transaction-details.tsx` displays a hardcoded icon (`isIncome ? "cash" : "arrow-down-circle"`). However, on the Dashboard and in `TransactionList.tsx`, transaction icons are determined dynamically using `renderCategoryIcon(category, title, type)` (e.g. `wallet-outline` for income, `silverware-fork-knife` for food, `cart-outline` for shopping, `receipt` for bills, etc.). Because of this discrepancy, the icon in the transaction details screen does not match the icon shown on the dashboard.

---

## 2. Constraints

- **CON-01**: In `app/transaction-details.tsx`, the hero icon MUST be computed using the exact same category icon resolver `renderCategoryIcon(transaction.category?.name, transaction.title, transaction.type)` used on the Dashboard and `TransactionList.tsx`.
- **CON-02**: The icon color MUST be `isIncome ? "#16A34A" : "#DC2626"`.
- **CON-03**: Cross-platform invariant: Parity across Web, Android, and iOS.
- **CON-04**: `npm run lint` MUST pass with 0 errors and 0 warnings.

---

## 3. Goal & Acceptance Criteria

### 3.1 Acceptance Criteria

- **ACC-01**: In `app/transaction-details.tsx`, the hero icon displays `renderCategoryIcon(transaction.category?.name, transaction.title, transaction.type)`.
- **ACC-02**: For any given transaction, opening its details page shows the exact same icon as displayed on the Dashboard's Recent Activity list.
- **ACC-03**: `npm run lint` passes with 0 errors and 0 warnings.

---

## 4. Deliverables

- **D-01 (`app/transaction-details.tsx`)**: Introduce `renderCategoryIcon` helper (matching `components/TransactionList.tsx` and `app/(tabs)/index.tsx`) and wire the hero `<MaterialCommunityIcons />` `name` prop to use it.
- **D-02 (`docs/savepoint.md` & `AGENTS.md`)**: Update documentation upon final approval and implementation.
