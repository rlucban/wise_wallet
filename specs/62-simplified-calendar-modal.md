# Spec 62: Simplified Calendar Modal (Grid + Summary + Tip Only)

| Field | Value |
|---|---|
| ID | SPEC-62 |
| Title | Simplified Calendar Modal (Grid + Summary + Tip Only) |
| Status | **FINAL v1.2** (2026-10-04 per user call) |
| Owner | User (final authority) |
| Version | 1.2 |
| Scope | `components/CalendarDaySheet.tsx`, `app/(tabs)/index.tsx`, `app/calendar.tsx`, new `utils/calendarSheetGuards.test.ts` |
| Non-goals | Transaction editing, /dues, list behavior elsewhere |
| Normative source | This file. |

---

## 1. Context

Two issues reported:

- **iOS Phone:** The Home calendar modal shows only the dimmed backdrop —
  the sheet itself never appears. Root cause: the bottom-sheet layout in
  `app/(tabs)/index.tsx` stacks a `Pressable style={{ flex: 1 }}`
  (tap-to-dismiss layer) and a `height: "92%"` sheet inside a
  `contentContainerStyle={{ flex: 1, justifyContent: "flex-end" }}`. On
  iOS the flex sibling consumes 100% of the container height, so the
  percentage-height sheet is squeezed to ~0 height. On web the
  percentage still resolves, so the sheet renders — but full-page-like.
- **Web Laptop:** The sheet renders but is cluttered: the per-day
  transaction list rows render below the summary, making the overlay feel
  like a full page.

User decision: simplify the calendar to a compact, centered pop-up with
only the calendar grid, selected-date income/expense summary, and a
Financial Tip. Remove the per-day transaction list entirely from this view.

---

## 2. Constraints

- **CON-01 (Centered modal):** Replace the bottom-sheet Modal in
  `app/(tabs)/index.tsx` with `CenteredDialogModal` (dim full-screen
  Pressable overlay + centered, rounded card `width: 90%`,
  `maxWidth: 480`, auto height). This removes the flex-overflow rendering
  bug — no competing `flex: 1` sibling, no percentage sheet height.
- **CON-02 (Simplified content):** The calendar content shown in the Home
  modal MUST contain only: (a) the monthly Calendar grid in a rounded
  card, (b) the selected-date header card with `Income: +₱X` /
  `Expense: -₱X`, (c) the Financial Tip box. No transaction list, no FAB
  inside the modal.
- **CON-03 (Route behavior):** `app/calendar.tsx` (`/calendar` route)
  keeps the full experience — the same simplified content (grid +
  summary + tip) plus its existing FAB-to-add, so both entry points
  match. No route registration change.
- **CON-04 (Component shape — viewport-bounded ScrollView):** 
  `components/CalendarDaySheet.tsx` removes the transaction-list block. 
  It keeps a `ScrollView` bounded by `maxHeight: windowHeight * 0.8` 
  (via `useWindowDimensions`) so the height auto-fits on normal screens 
  and scrolls instead of clipping on small phones (iPhone SE class ≈ 568pt, 
  where grid + summary + tip + close row ≈ 630px would otherwise overflow). 
  `contentContainerStyle` padding drops from `paddingBottom: 100` to 
  `paddingBottom: 16` (the old value cleared the in-sheet list/FAB; the 
  route FAB clears the bounded viewport instead). No `useWindowDimensions` 
  JS calculation needed in the component itself — the 0.8 factor provides 
  the viewport-bounded height per CON-04.
- **CON-05 (Close action):** The centered modal keeps a close (X)
  `IconButton` inside the card, top-right. The bottom-sheet drag handle
  is removed (meaningless in a centered dialog).
- **CON-06 (TDD / cross-platform coverage, AGENTS.md §1.10):** New
  `utils/calendarSheetGuards.test.ts` asserts ACC-01..03, ACC-05..06 at
  the source level (repo precedent: `tabBarMetrics.test.ts`,
  `reportFormat.test.ts` source guards), parameterized by `Platform.OS`
  (`android`/`ios`/`web` via `jest.mock`, pattern from
  `passcodeValidation.test.ts`). This change has no `Platform.OS` logic
  branch (the layout contract is platform-invariant), so the
  parameterization documents the matrix rather than switching behavior.
- **CON-07 (Preserve behavior):** Date selection (`onDayPress`),
  `markedDates` dot logic, income/expense totals computation, and the
  FinancialTip `date`/`extraTips` wiring stay byte-for-byte equivalent.
- **CON-08 (Responsive screen adaptation):** On Mobile Screens
  (`width < 768px`): the centered modal uses `CenteredDialogModal`'s
  default `width: '90%'`, `maxWidth: 480` layout. On Laptop/Desktop Web
  Screens (`width >= 768px`): the modal width is limited to
  `maxWidth: '500px'` and centered vertically and horizontally in the
  middle of the screen via `margin: 'auto'` on the card container.

---

## 3. Acceptance

- **ACC-01 (Objective):** `index.tsx` uses `CenteredDialogModal` for the
  calendar sheet; no `justifyContent: "flex-end"` + dim background
  `contentContainerStyle`, no `Pressable flex: 1` dismiss layer, no
  `height: "92%"`, no `borderTopLeftRadius` sheet remains.
- **ACC-02 (Objective):** No `dayTransactions.map` / `List.Item` /
  `Divider` block and no "No transactions on this day." text remains in
  `components/CalendarDaySheet.tsx`.
- **ACC-03 (Objective):** The content order is: Calendar grid card →
  selected-date + Income/Expense card → FinancialTip.
- **ACC-04 (Subjective):** On iPhone (Expo Go + iOS Safari web), Android,
  and desktop web, the calendar modal appears centered with a dimmed
  backdrop — not hidden, not stuck to an edge — and the card fits its
  content.
- **ACC-05 (Objective):** `CalendarDaySheet` renders inside a
  `ScrollView` with `maxHeight: '85vh'` and `overflowY: 'auto'`.
- **ACC-06 (Objective):** The modal keeps `icon="close"` and drops the
  drag handle (`width: 40, height: 4` pill).
- **ACC-07 (Objective):** On laptop/desktop web (`width >= 768px`), the
  modal card has `maxWidth: '500px'` and is centered vertically and
  horizontally; on mobile (`width < 768px`), it retains the default
  `CenteredDialogModal` width layout.

---

## 4. Platform Matrix

| Platform | Objective Checks | Subjective Checks |
|---|---|---|
| **Android** | ACC-01..03, 05, 06, 07 (D-04 jest guards) | Centered compact modal (ACC-04, ACC-07) |
| **iOS Phone** | ACC-01..03, 05, 06, 07 (D-04 jest guards) | Modal actually appears and centers; no clipping on small screens (ACC-04, ACC-07) |
| **Web (iOS Safari / desktop)** | ACC-01..03, 05, 06, 07 (D-04 jest guards) | Backdrop dims full viewport; card centered, compact; on >=768px screen, card maxWidth 500px and centered (ACC-07) |

---

## 5. Deliverables

- **D-01 (`components/CalendarDaySheet.tsx`):** Remove the day
  transaction-list block; keep the grid card, summary card, FinancialTip,
  `markedDates`, and the income/expense totals; wrap in a `ScrollView`
  with `maxHeight: '85vh'` and `overflowY: 'auto'` per CON-04 (no
  `useWindowDimensions` calculation needed).
- **D-02 (`app/(tabs)/index.tsx`):** Swap the bottom-sheet Modal for
  `CenteredDialogModal` (SPEC-61 helper) wrapping a close `IconButton`
  (top-right, inside the card) + `CalendarDaySheet` per CON-01/CON-05;
  drop `Portal`/`Modal`/`Pressable` imports if now unused.
- **D-03 (`app/calendar.tsx`):** No code change required — verify the
  route still renders the same simplified `CalendarDaySheet` + Appbar +
  FAB (CON-03).
- **D-04 (`utils/calendarSheetGuards.test.ts`, new):** Source-guard jest
  tests per CON-06 covering ACC-01..03, ACC-05..07.

---

## 6. History

- **v1.0 (draft 2026-10-04):** Original draft (centered modal via
  CenteredDialogModal; remove transaction list; plain View wrapper).
- **v1.1 (FINAL 2026-10-04 per user call):** CON-04 amended — keep a
  viewport-bounded `ScrollView` (`maxHeight: windowHeight * 0.8`) instead
  of a plain View, because grid + summary + tip + close row (~630px) can
  exceed iPhone SE-class viewports (568pt) and would re-introduce the
  "content cut off" defect; `paddingBottom` 100 → 16. CON-05 added —
  close button kept inside the card, drag handle removed. CON-06 + D-04
  added — source-guard jest tests for machine-checkable acceptance
  (§1.10). CenteredDialogModal approach confirmed by user call.
- **v1.2 (FINAL 2026-10-04 per user call):** CON-04 amended — replaced
  `windowHeight * 0.8` with pure CSS `maxHeight: '85vh'` + `overflowY: 
  'auto'` for dynamic viewport adjustment; CON-08 added — responsive screen
  adaptation: mobile (`width < 768px`) uses default
  `CenteredDialogModal` width layout; laptop (`width >= 768px`) limits
  modal width to `maxWidth: '500px'` and centers vertically and horizontally.
  CON-07 + ACC-07 added for platform-width checks.

---

## 7. References

- `specs/61-centered-dialog-modal.md` (CenteredDialogModal helper)
- `specs/60-home-calendar-bottom-sheet.md` (superseded for Home entry)
- `utils/tabBarMetrics.test.ts`, `utils/reportFormat.test.ts` (source-guard precedent)
- `utils/passcodeValidation.test.ts` (Platform.OS parameterization precedent)
- `AGENTS.md §1.9`, `§1.10`