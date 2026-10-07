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

---

## 6. v1.1 Amendment — History-style month groups, filter segments removed (FINAL v1.1)

### 6.1 Context

- Screenshots 2026-10-07: `/completed-dues` shows `SegmentedButtons` (This Week / This Month / All) + TOTAL COMPLETED card + flat per-due cards; `/transactions` shows month cards ("October 2026", "2 transactions") with statement rows. User order: Completed Dues MUST look like Transaction History; the week/month/all segments go away.
- **OD-01 (CALLED a per user 2026-10-07 — "OD 1 a"):** TOTAL COMPLETED card removed entirely (pure history mirror: month cards only). FINAL v1.1 marked same message + "code this for me".

### 6.2 Constraints

- **CON-08:** Only `D-*` files MAY change. Read-only stays (no edit/delete/undo per SPEC-07); `Appbar.Header` (back + "Completed Dues" title), `safeGoBack`, refetch-on-focus, and `EmptyState` (icon/title/subtitle) unchanged.
- **CON-09:** No new dependencies. Cross-platform (Android + iOS + Web); grouping is pure TS, layout uses `Platform.select` shadows only. `npm run lint` clean, `npx tsc --noEmit` clean (user-run per §1.3).
- **CON-10:** One home (§1.14). SPEC-56 owns the history look — cited, never re-normed. No duplicate dues-history spec.

### 6.3 Goal (FINAL v1.1)

- **DEC-04 (proposed):** Delete the `filter` state, `SegmentedButtons` block, and week/month window memos (`startOfWeek/endOfWeek/startOfMonth/endOfMonth`); the list is all completed dues newest-first. `totalCompletedAmount` sums the full list (kept iff OD-01 b).
- **DEC-05 (proposed):** Group by calendar month, newest month first, items newest-first within a month, via new pure `utils/groupDuesByMonth.ts` (`{ key: "YYYY-MM"; label e.g. "October 2026"; items: Due[] }`) mirroring `groupTransactionsByMonth`. The screen renders one card container per month with the month-year header + "N transaction(s)" count; the existing due row (icon box, strikethrough title, date + amount line, check icon) moves inside unchanged.
- **DEC-06 (proposed, pending OD-01):** Total card kept only on call (b), labeled statically (no filter suffix); on call (a) it is deleted with the segments.

| # | State | Behavior |
|---|---|---|
| 1 | Any completed dues exist | All shown, grouped by month newest-first; no filter UI anywhere |
| 2 | Zero completed dues | Same `EmptyState` as today (no change) |
| 3 | Tap a row | Nothing (read-only, as today — no navigation added) |
| 4 | Header back | Unchanged (`safeGoBack`) |

Objective (jest, `Platform.OS` = android/ios/web):

| ID | Check |
|---|---|
| ACC-08 | `app/completed-dues.tsx` contains zero `SegmentedButtons` + zero `"This Week"` + zero `"This Month"` + zero `"All"` filter; contains month-group rendering (`groupDuesByMonth`, month label, transaction count) |
| ACC-09 | Read-only + header + `EmptyState` intact; `npm test` 0 failed; `npm run lint` clean; `npx tsc --noEmit` clean (user-run) |

Subjective (reviewer-observed, Expo Go + web export):

- **ACC-S03:** Reviewer confirms month cards visually match `/transactions` (card, month header, count, rows); no segments on any width.
- **ACC-S04:** Empty account still shows the same "No completed dues" state.

### 6.4 Deliverables

- **D-06 (`app/completed-dues.tsx`):** rebuild per DEC-04..DEC-06. Nothing else in the file changes (rows, header, empty state intact).
- **D-07 (`utils/groupDuesByMonth.ts`, new):** pure month-grouping helper per DEC-05 (no `react-native` import).
- **D-08 (`utils/groupDuesByMonth.test.ts`, new):** grouping behavior (out-of-order fixtures → newest-first months/items) × android/ios/web + ACC-08 source guards.
- **D-09 (journal):** `docs/savepoint.md` + `AGENTS.md` §3 entry.

---

## 7. v1.2 Amendment — Drop title strikethrough (FINAL v1.2 per user call 2026-10-07: "SPEC-32 v1.2 FINAL, code this for me")

### 7.1 Context

- Screenshot 2026-10-07 (`/completed-dues`, month-grouped per v1.1): each row title carries a line through its middle (`textDecorationLine: "line-through"`, kept over from the pre-v1.1 card design). The modeled screen (`/transactions` history rows) has no such line. User order: the middle line goes away ("dapat wala na sana underline sa gitna").

### 7.2 Constraints (FINAL v1.2)

- **CON-11:** Only the title `Text` style in `app/completed-dues.tsx` MAY change (delete the `textDecorationLine` key). Weight (`600`), color (`onSurfaceVariant`), row layout, month cards, header, empty state MUST stay byte-identical. Cross-platform; `npm run lint` clean.

### 7.3 Goal (FINAL v1.2)

- **DEC-07:** Row title keeps `fontWeight: "600"` + `onSurfaceVariant` color with zero `textDecorationLine`.

Objective (jest, `Platform.OS` = android/ios/web):

| ID | Check |
|---|---|
| ACC-10 | `app/completed-dues.tsx` contains zero `line-through` / `textDecorationLine`; title still `fontWeight: "600"` (source-text guards) |
| ACC-11 | `npm test` 0 failed; `npm run lint` clean; `npx tsc --noEmit` clean (user-run per §1.3) |

Subjective (reviewer-observed, Expo Go + web export):

- **ACC-S05:** Reviewer opens Completed Dues: titles read clean like Transaction History, no middle line on any row, everything else identical.

### 7.4 Deliverables (FINAL v1.2)

- **D-10 (`app/completed-dues.tsx`):** delete the one `textDecorationLine` key per DEC-07. Nothing else in the file.
- **D-11 (`utils/groupDuesByMonth.test.ts`, extend):** ACC-10 guards × android/ios/web. No new test file.
- **D-12 (journal):** `docs/savepoint.md` + `AGENTS.md` §3 entry.
