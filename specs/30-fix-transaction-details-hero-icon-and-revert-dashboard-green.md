# Spec 30: Fix Transaction Details Hero Icon & Revert Dashboard Icon Container

| Field | Value |
|---|---|
| ID | SPEC-30 |
| Title | Fix Transaction Details Hero Icon & Revert Dashboard Icon Container |
| Status | **FINAL** (2026-09-30 per user call "code this for me") |
| Owner | User (final authority) |
| Version | 1.0 |
| Scope | `app/transaction-details.tsx`, `components/TransactionList.tsx`, `app/(tabs)/index.tsx` |
| Non-goals | Database schema changes; modifying backend API |
| Normative source | This file. File+symbol cites are normative; `:line` numbers are hints only. |

---

## Terminology (RFC 2119)

The keywords **MUST**, **MUST NOT**, **SHOULD**, and **MAY** in this spec are
to be interpreted as described in RFC 2119. Informative prose is non-normative unless restated as a requirement.

---

## 1. Context

### 1.1 Problem

1. **Transaction Details Hero Icon Invisible:** In `app/transaction-details.tsx` line 106, the hero icon above the amount (`+₱500.00`) is hardcoded to `color={isIncome ? "#ffffff" : "#ffffff"}` while its container `styles.amountIcon` has a light background `backgroundColor: "#f9fafb"`. This renders a white icon on a white background, making it completely invisible to the user.
2. **Dashboard Transaction Icon Container:** In SPEC-29, the transaction item icon container was given a green background (`tertiaryContainer`), which the user specifically requested to remove and revert back to `theme.colors.surfaceVariant`.

---

## 2. Constraints

- **CON-01**: In `components/TransactionList.tsx` and `app/(tabs)/index.tsx`, the transaction item icon container `backgroundColor` MUST be reverted back to `theme.colors.surfaceVariant`, removing the green container background.
- **CON-02**: In `app/transaction-details.tsx`, the hero amount icon MUST be visible:
  - If the container remains neutral (`#f9fafb` or `theme.colors.surfaceVariant`), the icon color MUST use `isIncome ? "#16A34A" : "#DC2626"` (or `amountColor`).
  - Or the container MUST have a solid background (`backgroundColor: amountColor`) with a white icon (`#ffffff`) so it is clearly visible.
- **CON-03**: Cross-platform invariant: Parity across Web, Android, and iOS.
- **CON-04**: `npm run lint` MUST pass with 0 errors and 0 warnings.

---

## 3. Goal & Acceptance Criteria

### 3.1 Acceptance Criteria

- **ACC-01**: In `components/TransactionList.tsx` and `app/(tabs)/index.tsx`, the icon container `backgroundColor` is `theme.colors.surfaceVariant` (reverted, green container removed).
- **ACC-02**: In `app/transaction-details.tsx`, the icon above the amount (`+₱500.00`) is clearly visible with high contrast.
- **ACC-03**: `npm run lint` passes with 0 errors and 0 warnings.

---

## 4. Deliverables

- **D-01 (`components/TransactionList.tsx` & `app/(tabs)/index.tsx`)**: Revert icon container `backgroundColor` to `theme.colors.surfaceVariant`.
- **D-02 (`app/transaction-details.tsx`)**: Fix invisible icon above amount by setting container `backgroundColor: isIncome ? "#16A34A" : "#DC2626"` (with white icon) or setting icon `color: amountColor`.
- **D-03 (`docs/savepoint.md` & `AGENTS.md`)**: Update documentation upon final approval and implementation.
