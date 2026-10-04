# Spec 37: Dedicated Transaction History Screen

| Field | Value |
|---|---|
| ID | SPEC-37 |
| Title | Dedicated Transaction History Screen |
| Status | **FINAL** (2026-10-04 per user approval "go") |
| Owner | User (final authority) |
| Version | 1.0 |
| Scope | `app/transactions.tsx` (new), `app/_layout.tsx`, `app/(tabs)/index.tsx` |
| Non-goals | Modifying report analytics charts, adding pagination/infinite-scroll network endpoints, or changing transaction database schema |
| Normative source | This file. File+symbol cites are normative; `:line` numbers are hints only. |

---

## Terminology (RFC 2119)

The keywords **MUST**, **MUST NOT**, **SHOULD**, and **MAY** in this spec are
to be interpreted as described in RFC 2119. Informative prose is non-normative unless restated as a requirement.

---

## 1. Context

### 1.1 Problem

On the Home Dashboard (`app/(tabs)/index.tsx`), the "Recent Activity" section displays a maximum of 6 transactions (`transactionData = sorted.slice(0, 6)`). Beside the "Recent Activity" title is a "See All" button.

Currently, tapping "See All" navigates to `/reports` (`router.push("/reports")`).
However, the `/reports` screen is designed for aggregate analytics (donut charts, trend bar graphs, category percentages, and PDF/CSV export) and does not display a chronological log of all transactions.

This creates a UX mismatch: when users tap "See All" on recent activity, they expect to view their full transaction history rather than analytics charts.

### 1.2 Proposed Solution

1. Create a dedicated screen at `app/transactions.tsx` ("Transaction History").
2. Register `<Stack.Screen name="transactions" />` in `app/_layout.tsx`.
3. In `app/(tabs)/index.tsx`, update the "See All" button on Recent Activity to navigate to `/transactions`.

---

## 2. Constraints

- **CON-01 (Route & Navigation):** The new screen MUST be located at `app/transactions.tsx` and registered under `<Stack>` in `app/_layout.tsx`. The "See All" button in `app/(tabs)/index.tsx` MUST navigate to `"/transactions"`.
- **CON-02 (Header & Back Action):** The screen MUST render an `Appbar.Header` with an `Appbar.BackAction` that navigates back to the caller (Dashboard) via `router.back()` or `router.push("/(tabs)")`, and an `Appbar.Content` with title `"Transaction History"`.
- **CON-03 (Search & Filter Controls):** The screen MUST provide:
  - A search input allowing users to filter transactions by title, category name, notes, or establishment.
  - Type filter chips/segmented buttons for `All`, `Expense`, and `Income`.
- **CON-04 (Full Transaction Rendering):** All transactions MUST be loaded via `useTransactions()` (or `useTransactionsData()`), sorted reverse-chronologically (newest first), filtered by search and type criteria, and rendered in a performant `FlashList`.
- **CON-05 (Transaction Details Navigation):** Tapping any transaction in the list MUST navigate to `/transaction-details?id=${item.id}`.
- **CON-06 (Consistent Design & Theming):** Transaction item cards MUST use the app design language (consistent with `TransactionList.tsx` and `app/(tabs)/index.tsx`), honoring light and dark themes using `useTheme()`.
- **CON-07 (Empty State):** When no transactions exist or when a search/filter yields zero results, the screen MUST display an `EmptyState` component with a friendly title and subtitle.
- **CON-08 (Cross-Platform Parity):** The screen MUST function and render cleanly across Android, iOS, and Web.
- **CON-09 (Zero Breaking Changes):** Existing `/reports`, `/transaction-details`, and transaction creation flows MUST NOT be modified or regressed.

---

## 3. Goal & Acceptance Criteria

### 3.1 Interaction Matrix

| Surface | Action | Destination / Behavior |
|---|---|---|
| `app/(tabs)/index.tsx` | Tap "See All" on Recent Activity | Navigates to `/transactions` |
| `app/transactions.tsx` | Tap header back icon | Returns to Dashboard |
| `app/transactions.tsx` | Type query in search bar | Live-filters transaction list by title, category, notes, or establishment |
| `app/transactions.tsx` | Tap type filter (`All` / `Expense` / `Income`) | Filters transaction list by matching type |
| `app/transactions.tsx` | Tap any transaction card | Navigates to `/transaction-details?id=${transaction.id}` |
| `app/transactions.tsx` | Empty results | Shows `EmptyState` component |

### 3.2 Acceptance Criteria

- **ACC-01 (Objective):** In `app/(tabs)/index.tsx`, the "See All" button `onPress` invokes `router.push("/transactions")`.
- **ACC-02 (Objective):** `app/_layout.tsx` contains `<Stack.Screen name="transactions" />`.
- **ACC-03 (Objective):** `app/transactions.tsx` exists, imports `useTransactions` and `useCurrency`, and renders an `Appbar.Header` with `"Transaction History"`.
- **ACC-04 (Objective):** Filter buttons allow switching between "All", "Expense", and "Income", properly filtering the displayed list.
- **ACC-05 (Objective):** Search text filters items by title, category name, establishment, and note (case-insensitive).
- **ACC-06 (Objective):** Each transaction card displays title, category/establishment subtitle, formatted date, formatted amount with correct color/sign (`+₱` green for income, `-₱` red for expense), and tapping navigates to `/transaction-details?id=${item.id}`.
- **ACC-07 (Subjective):** Reviewer visually confirms clicking "See All" on Home opens a dedicated "Transaction History" list rather than the Reports analytics charts.

---

## 4. Platform Matrix

| Platform | Objective Checks (`ACC-01..06`) | Subjective Checks (`ACC-07`) |
|---|---|---|
| **Android** | Navigation to `/transactions` succeeds; search/filter/tapping works | Fluid list, clean back navigation, no layout clipping |
| **iOS** | Navigation to `/transactions` succeeds; search/filter/tapping works | Fluid list, clean back navigation, no layout clipping |
| **Web** | Navigation to `/transactions` succeeds; search/filter/tapping works | Responsive card list, keyboard input works, clean styling |

---

## 5. Deliverables

- **D-01 (`app/transactions.tsx`):** Create the dedicated Transaction History screen with header, search bar, type filter chips, `FlashList` of transactions, and empty state.
- **D-02 (`app/_layout.tsx`):** Register `<Stack.Screen name="transactions" />` in the root navigation stack.
- **D-03 (`app/(tabs)/index.tsx`):** Update "See All" button `onPress` from `router.push("/reports")` to `router.push("/transactions")`.

---

## 6. Glossary

- **Transaction History:** Dedicated chronological list of all recorded transactions for an account.
- **Recent Activity:** Dashboard preview component showing the top 6 most recent transactions.
- **Reports:** Separate analytics screen aggregating income/expense trends, categories, and PDF/CSV exports.

---

## 7. References

- `app/(tabs)/index.tsx`: Recent Activity section and "See All" link.
- `app/(tabs)/reports.tsx`: Reports analytics screen.
- `components/TransactionList.tsx`: Reusable transaction list items and icon helper.
- `app/transaction-details.tsx`: Individual transaction inspection and action view.
