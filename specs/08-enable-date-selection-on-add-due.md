# Spec 08: Enable Date Selection on Add Due Screen

| Field | Value |
|---|---|
| ID | SPEC-08 |
| Title | Enable Date Selection on Add Due Screen |
| Status | **FINAL** (2026-09-23 per user call) |
| Owner | User (final authority) |
| Version | 1.0 |
| Scope | Add Due screen date picker functionality |
| Non-goals | Changes to edit modal date picker (already works); changes to date validation logic; changes to recurrence date computation |
| Normative source | This file. File+symbol cites are normative; `:line` numbers are hints only. |

## Terminology (RFC 2119)

The keywords **MUST**, **MUST NOT**, **SHOULD**, and **MAY** in this spec are
to be interpreted as described in RFC 2119. Informative prose (examples,
"today", "currently") is non-normative unless restated as a requirement.

## 1. Context

### 1.1 Problem

In `app/add-due.tsx` (line 131), the calendar icon on the "Due Date" field
has `onPress={() => {}}` — a no-op. The date state is initialized to
`new Date()` (line 20) and the user has no way to change it. This means
every new scheduled due is created with today's date regardless of when the
due should actually occur.

The edit modal in `app/dues.tsx` already has a working date picker using
`react-native-calendars` `Calendar` component in a `Portal > Modal` pattern
(lines 568-610). The Add Due screen should use the same pattern.

### 1.2 Current behavior

| Screen | Date field | Calendar icon | Date changeable? |
|---|---|---|---|
| Add Due (`add-due.tsx`) | `editable={false}`, initialized to `new Date()` | `onPress={() => {}}` (no-op) | **No** |
| Edit modal (`dues.tsx`) | `editable={false}` | `onPress={() => setShowDatePicker(true)}` | Yes (Calendar picker) |

## 2. Constraints (normative)

- **CON-01 — Working date picker.** The Add Due screen MUST provide a working
  date picker that allows the user to select any date (past, present, or
  future) for the due.
- **CON-02 — Consistent UX.** The date picker implementation in Add Due MUST
  follow the same `Calendar` component + `Portal > Modal` pattern already
  used in the edit modal (`dues.tsx` lines 568-610) for visual and
  behavioral consistency.
- **CON-03 — Standing repo invariants (AGENTS.md §1).** The implementation MUST
  keep Android + iOS + Web working; MUST keep web Vercel-deployable; MUST NOT
  introduce breaking changes to storage keys, the API contract, AsyncStorage
  shapes, routes, or native deps.

## 3. Goal

Enable users to select a due date when creating a new scheduled due.

### Acceptance criteria — Objective (machine-checkable)

- **ACC-01 (jest):** The Add Due screen renders a calendar icon that, when
  pressed, opens a date picker modal. Test parameterized by `Platform.OS`
  (`android`, `ios`, `web`).
- **ACC-02 (jest):** Selecting a date in the picker updates the date state
  and closes the modal. The displayed date in the TextInput matches the
  selected date.
- **ACC-03 (jest):** The date field remains non-editable (user types nothing;
  selection is picker-only).

### Acceptance criteria — Subjective (human-judged UX)

- **ACC-04 (Expo Go, Android + iOS):** Reviewer opens Add Due screen, taps
  the calendar icon, sees a Calendar modal, picks a different date, and
  confirms the date field updates to the chosen date.
- **ACC-05 (web export):** Reviewer confirms the same calendar picker works
  on web — icon opens modal, date selection updates the field.

## 4. Deliverables

- **D-01 — Add date picker state and Calendar modal** (`app/add-due.tsx`):
  - Import `Calendar` from `react-native-calendars` and `Card` from
    `react-native-paper` (Card already imported).
  - Add `showDatePicker` state (`useState(false)`).
  - Replace the no-op `onPress={() => {}}` on the calendar icon (line 131)
    with `onPress={() => setShowDatePicker(true)}`.
  - Add a `Portal > Modal` containing a `Calendar` component (matching the
    pattern in `dues.tsx` lines 568-610): `onDayPress` sets the date and
    closes the modal; `markedDates` highlights the current selection;
    themed to match the app.

## Glossary

| Term | Meaning |
|---|---|
| Add Due screen | `app/add-due.tsx` — form for creating a new scheduled due |
| Edit modal | Inline modal in `app/dues.tsx` for editing an existing due |
| Date picker | Calendar modal allowing the user to select a date via tap |

## References

- `app/add-due.tsx` — Add Due screen (date field at lines 126-133, state at line 20).
- `app/dues.tsx` — Edit modal date picker (lines 568-610) — reference implementation.
- `react-native-calendars` — `Calendar` component used for date selection.
- `AGENTS.md §1` — working agreements.
