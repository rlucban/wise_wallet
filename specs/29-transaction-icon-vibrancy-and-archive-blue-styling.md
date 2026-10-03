# Spec 29: Transaction Icon Color Vibrancy & Allocation Archive Blue Styling

| Field | Value |
|---|---|
| ID | SPEC-29 |
| Title | Transaction Icon Color Vibrancy & Allocation Archive Blue Styling |
| Status | **FINAL** (2026-09-30 per user call "code this for me") |
| Owner | User (final authority) |
| Version | 1.0 |
| Scope | `components/TransactionList.tsx`, `app/(tabs)/index.tsx`, `app/savings.tsx`, `app/archived-allocations.tsx` |
| Non-goals | Database schema changes; modifying backend API |
| Normative source | This file. File+symbol cites are normative; `:line` numbers are hints only. |

---

## Terminology (RFC 2119)

The keywords **MUST**, **MUST NOT**, **SHOULD**, and **MAY** in this spec are
to be interpreted as described in RFC 2119. Informative prose is non-normative unless restated as a requirement.

---

## 1. Context

### 1.1 Problem

1. **Transaction Icons Faint & Desaturated:** In `components/TransactionList.tsx` and `app/(tabs)/index.tsx`, the transaction category icons currently use `backgroundColor: theme.colors.surfaceVariant` (a dull pale grey) with thin outline icons, making them blend into the card background and appear washed out / lacking color.
2. **Allocation Archive Button Lacks System Blue Color:** In `app/savings.tsx`, the archive button in `Appbar.Header` (`<Appbar.Action icon="archive-outline" />`) and the card archive action buttons currently have no color specified, rendering them in neutral grey instead of the system's signature primary blue (`theme.colors.primary` / `#1B3F7A`).

---

## 2. Constraints

- **CON-01**: Transaction icons in both `components/TransactionList.tsx` and `app/(tabs)/index.tsx` MUST use high-contrast, vibrant background container tints and matching icon colors:
  - Income items MUST use `theme.colors.tertiaryContainer` background (soft green) with `theme.colors.tertiary` (or vibrant green `#16A34A`) icon color.
  - Expense items MUST use `theme.colors.errorContainer` background (soft rose/red) with `theme.colors.error` (or vibrant red `#DC2626`) icon color, or category-specific vibrant pastel tints so they are clearly visible and colorful against the card surface.
- **CON-02**: In `app/savings.tsx`, the header Archive action button MUST use the system primary blue color (`color={theme.colors.primary}` or wrapped with system primary tint).
- **CON-03**: In `app/savings.tsx`, the archive action button on each active/completed allocation card (`IconButton icon="archive-arrow-down-outline"`) MUST use `iconColor={theme.colors.primary}`.
- **CON-04**: In `app/archived-allocations.tsx`, the top summary card and badges MUST consistently reflect system primary theming (`theme.colors.primaryContainer` and `theme.colors.primary`).
- **CON-05**: Cross-platform invariant: Parity across Web, Android, and iOS.
- **CON-06**: `npm run lint` MUST pass with 0 errors and 0 warnings.

---

## 3. Goal & Acceptance Criteria

### 3.1 Platform Matrix

| Platform | Objective Checks (`ACC-01`..`05`) | Subjective Reviewer Checks (`ACC-06`..`07`) |
|---|---|---|
| **Web** | Transaction icons show vibrant green/red container tints; Archive buttons in `/savings` are system blue | Reviewer verifies colorful transaction list and blue archive header button |
| **Android** | Transaction icons show vibrant green/red container tints; Archive buttons in `/savings` are system blue | Reviewer verifies Material 3 color contrast in Expo Go |
| **iOS** | Transaction icons show vibrant green/red container tints; Archive buttons in `/savings` are system blue | Reviewer verifies Material 3 color contrast in Expo Go |

### 3.2 Acceptance Criteria

- **ACC-01**: In `components/TransactionList.tsx`, icon container `backgroundColor` is `item.type === "income" ? theme.colors.tertiaryContainer : theme.colors.errorContainer`, and icon `color` is `item.type === "income" ? theme.colors.tertiary : theme.colors.error`.
- **ACC-02**: In `app/(tabs)/index.tsx`, `renderTransactionItem` applies the same vibrant container and icon colors.
- **ACC-03**: In `app/savings.tsx`, `<Appbar.Action icon="archive-outline" color={theme.colors.primary} ... />` renders in system blue.
- **ACC-04**: In `app/savings.tsx`, card `<IconButton icon="archive-arrow-down-outline" iconColor={theme.colors.primary} ... />` renders in system blue.
- **ACC-05**: In `app/archived-allocations.tsx`, top summary card uses `theme.colors.primaryContainer` and `theme.colors.onPrimaryContainer`.
- **ACC-06**: `npm run lint` passes with 0 errors and 0 warnings.

---

## 4. Deliverables

- **D-01 (`components/TransactionList.tsx` & `app/(tabs)/index.tsx`)**: Update transaction icon container background and icon color to use semantic `tertiaryContainer` / `errorContainer` and vibrant green / red colors.
- **D-02 (`app/savings.tsx`)**: Set `color={theme.colors.primary}` on `Appbar.Action` and `iconColor={theme.colors.primary}` on card archive icon buttons.
- **D-03 (`app/archived-allocations.tsx`)**: Align top summary card to `primaryContainer` theme.
- **D-04 (`docs/savepoint.md` & `AGENTS.md`)**: Update documentation upon final approval and implementation.

---

## 5. References

- [TransactionList.tsx](file:///c:/Users/rcluc/Downloads/wise_wallet/components/TransactionList.tsx)
- [index.tsx](file:///c:/Users/rcluc/Downloads/wise_wallet/app/(tabs)/index.tsx)
- [savings.tsx](file:///c:/Users/rcluc/Downloads/wise_wallet/app/savings.tsx)
