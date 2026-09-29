# Spec 23: Fix `numAmount` ReferenceError in `add-transaction.tsx` and Unused `Alert` in `dues.tsx`

| Field | Value |
|---|---|
| ID | SPEC-23 |
| Title | Fix `numAmount` ReferenceError in `add-transaction.tsx` and Unused `Alert` Lint Warning in `dues.tsx` |
| Status | **FINAL** (2026-09-29 per user call) |
| Owner | User (final authority) |
| Version | 1.0 |
| Scope | `app/add-transaction.tsx`, `app/dues.tsx` |
| Non-goals | Re-architecting transactions or dues screens; modifying database schema or API endpoints |
| Normative source | This file. File+symbol cites are normative; `:line` numbers are hints only. |

---

## Terminology (RFC 2119)

The keywords **MUST**, **MUST NOT**, **SHOULD**, and **MAY** in this spec are
to be interpreted as described in RFC 2119.

---

## 1. Context

### 1.1 Problem

1. **Runtime ReferenceError in `app/add-transaction.tsx`**:
   At line 271 of `app/add-transaction.tsx`, JSX evaluates:
   ```tsx
   {numAmount > availableBalance
     ? `Insufficient funds: Expense exceeds Available to Spend (₱${availableBalance.toFixed(2)}).`
     : ""}
   ```
   However, `numAmount` is not declared at component scope, causing an unhandled runtime crash:
   `Web ERROR [ReferenceError: numAmount is not defined]` when opening or rendering `/add-transaction`.

2. **Unused Import Warning in `app/dues.tsx`**:
   At line 2 of `app/dues.tsx`, `Alert` is imported from `react-native`:
   ```ts
   import { View, Alert } from "react-native";
   ```
   Since all alerts in `dues.tsx` were converted to the cross-platform Material 3 `Dialog` in `Portal`, `Alert` is no longer used, triggering ESLint warning:
   `2:16 warning 'Alert' is defined but never used @typescript-eslint/no-unused-vars`.

---

## 2. Constraints

- **CON-01**: `app/add-transaction.tsx` MUST declare `numAmount` in the component scope (`const numAmount = amount ? parseAmount(amount) : 0;`) before any JSX references it.
- **CON-02**: `app/add-transaction.tsx` MUST NOT throw `ReferenceError: numAmount is not defined` on initial render or when typing amounts.
- **CON-03**: `app/dues.tsx` MUST NOT import unused `Alert` from `react-native`.
- **CON-04**: `npm run lint` MUST pass with 0 errors and 0 warnings for both files.
- **CON-05**: Cross-platform invariant: Android, iOS, and Web MUST load and render `/add-transaction` without runtime crashes.

---

## 3. Goal & Acceptance Criteria

### 3.1 Platform Matrix

| Platform | Objective Checks (`ACC-01`..`04`) | Subjective Reviewer Checks (`ACC-05`) |
|---|---|---|
| **Web** | `numAmount` declared; no `ReferenceError`; lint clean | Reviewer verifies `/add-transaction` loads and displays cleanly in browser |
| **Android** | `numAmount` declared; no `ReferenceError`; lint clean | Reviewer confirms screen renders in Expo Go with no red-box |
| **iOS** | `numAmount` declared; no `ReferenceError`; lint clean | Reviewer confirms screen renders in Expo Go with no red-box |

### 3.2 Acceptance Criteria

- **ACC-01**: In `app/add-transaction.tsx`, `const numAmount = amount ? parseAmount(amount) : 0;` is declared at the top of `AddTransaction()`.
- **ACC-02**: The warning text below the Amount field conditionally displays only when `type === "expense" && numAmount > availableBalance`, formatting the available amount cleanly via `formatAmount(availableBalance)`.
- **ACC-03**: In `app/dues.tsx`, line 2 imports only `{ View } from "react-native"`.
- **ACC-04**: `npm run lint` finishes with 0 errors and 0 warnings.
- **ACC-05**: Reviewer observes that clicking `+ Transaction` navigates to `/add-transaction` without crashing on Web and mobile.

---

## 4. Deliverables

- **D-01 (`app/add-transaction.tsx`)**: Declare `numAmount = amount ? parseAmount(amount) : 0;` in `AddTransaction()` and clean up inline warning condition.
- **D-02 (`app/dues.tsx`)**: Remove unused `Alert` import from `react-native`.
- **D-03 (`docs/savepoint.md`)**: Document the fix upon completion.
