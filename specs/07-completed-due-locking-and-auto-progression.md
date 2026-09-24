# Spec 07: Completed Due Locking and Auto-Progression Gating

| Field | Value |
|---|---|
| ID | SPEC-07 |
| Title | Completed Due Locking and Auto-Progression Gating |
| Status | **FINAL** (2026-09-23 per user call) |
| Owner | User (final authority) |
| Version | 1.0 |
| Scope | Scheduled dues: completed state lockdown, auto-process gating for recurring progression |
| Non-goals | New status enum beyond `completed` boolean; background auto-processing jobs; notification changes; sync changes; new screens or routes |
| Normative source | This file. File+symbol cites are normative; `:line` numbers are hints only. |

## Terminology (RFC 2119)

The keywords **MUST**, **MUST NOT**, **SHOULD**, and **MAY** in this spec are
to be interpreted as described in RFC 2119. Informative prose (examples,
"today", "currently") is non-normative unless restated as a requirement.

## 1. Context

### 1.1 Problem

Currently in `app/dues.tsx`, completed dues (`completed === true`) still
display edit (pencil), delete (trash), and undo (undo-arrow) action buttons
(lines 412-418). This allows users to modify or remove completed records,
undermining the integrity of payment history.

Additionally, `recordTransaction()` (lines 244-263) **always** creates the
next recurring due when marking a recurring item as complete, regardless of
the `autoProcess` flag. The `autoProcess` field is stored and displayed
(lightning bolt icon, lines 359-365) but has no functional effect on
progression behavior.

### 1.2 Current behavior

| Action | Upcoming due | Completed due |
|---|---|---|
| Edit (pencil) | Opens modal | Opens modal (should not) |
| Delete (trash) | Shows confirm dialog | Shows confirm dialog (should not) |
| Undo (undo-arrow) | N/A | Toggles back to upcoming (should not) |
| Pay/Receive | Records transaction, marks complete, creates next if recurring | N/A |
| Auto-process checked | Lightning icon shown | Lightning icon shown |
| Auto-process unchecked | Lightning icon hidden | Lightning icon hidden |
| Next occurrence created | Always (regardless of autoProcess) | N/A |

## 2. Constraints (normative)

- **CON-01 — Completed due immutability.** Once a due has `completed === true`,
  the app MUST NOT allow the user to edit, delete, or toggle it back to
  not-completed via the UI. The undo, edit (pencil), and delete (trash)
  buttons MUST NOT appear or be tappable on completed due cards.
- **CON-02 — Auto-process gates recurring progression.** When the user taps
  Pay/Receive on a recurring due (`frequency !== "once"`), the next
  occurrence MUST only be created if `autoProcess === true` on that due.
  If `autoProcess` is false or undefined, marking the due complete MUST
  NOT create a next occurrence — the recurring chain stops.
- **CON-03 — One-time dues unaffected by auto-process.** For one-time dues
  (`frequency === "once"` or `frequency` undefined), `autoProcess` has no
  effect. Pay/Receive always marks the due complete with no next occurrence
  regardless of the flag.
- **CON-04 — Transaction still recorded.** Regardless of `autoProcess`, tapping
  Pay/Receive MUST always create the transaction record and mark the due
  complete. Only the next-occurrence creation is gated by `autoProcess`.
- **CON-05 — Standing repo invariants (AGENTS.md §1).** The implementation MUST
  keep Android + iOS + Web working; MUST keep web Vercel-deployable; MUST NOT
  introduce breaking changes to storage keys, the API contract, AsyncStorage
  shapes, routes, or native deps.

## 3. Goal

Lock completed dues from modification and gate recurring progression on the
`autoProcess` flag.

### 3.1 Interaction matrix

| Scenario | Due state | autoProcess | Action | Result |
|---|---|---|---|---|
| A | Upcoming | any | Pay/Receive | Transaction created, due marked complete; if recurring AND autoProcess=true → next created |
| B | Upcoming | false/undefined | Pay/Receive (recurring) | Transaction created, due marked complete; NO next created |
| C | Completed | any | Edit/Delete/Undo | Buttons not rendered — no action possible |
| D | Upcoming | any | Edit modal | Opens normally (current behavior preserved) |
| E | Upcoming | any | Delete | Shows confirm dialog (current behavior preserved) |

### Acceptance criteria — Objective (machine-checkable)

- **ACC-01 (jest):** Given a due with `completed: true`, `renderItem` does NOT
  render the edit IconButton, delete IconButton, or undo IconButton. Test
  parameterized by `Platform.OS` (`android`, `ios`, `web`).
- **ACC-02 (jest):** Given a due with `completed: false`, `renderItem` renders
  all three action buttons (edit, delete, undo). Test parameterized by
  `Platform.OS`.
- **ACC-03 (jest):** `recordTransaction` called on a recurring due
  (`frequency: "monthly"`, `autoProcess: false`) creates a transaction,
  marks the due complete, and does NOT call `addDue` for the next
  occurrence. Assert `addDue` call count === 0.
- **ACC-04 (jest):** `recordTransaction` called on a recurring due
  (`frequency: "monthly"`, `autoProcess: true`) creates a transaction,
  marks the due complete, and calls `addDue` once for the next occurrence
  with the correct next date.
- **ACC-05 (jest):** `recordTransaction` called on a one-time due
  (`frequency: "once"`, `autoProcess: false`) creates a transaction,
  marks the due complete, and does NOT call `addDue`. Same for
  `autoProcess: true`.
- **ACC-06 (jest):** `recordTransaction` called on a due with `frequency`
  undefined behaves identically to `frequency: "once"` (no next occurrence).

### Acceptance criteria — Subjective (human-judged UX)

- **ACC-07 (Expo Go, Android + iOS):** Reviewer opens Scheduled screen, taps
  Pay/Receive on a recurring due with auto-process unchecked. Confirms:
  transaction recorded, due moves to Completed section, no new upcoming due
  appears.
- **ACC-08 (Expo Go, Android + iOS):** Reviewer opens Completed section.
  Confirms: no pencil, no trash, no undo icons visible on completed cards;
  card is visually distinct (opacity, strikethrough preserved).
- **ACC-09 (web export):** Reviewer confirms same behavior on web — completed
  cards show no action buttons; Pay/Receive with auto-process off creates no
  next occurrence.
- **ACC-10 (Expo Go):** Reviewer creates a recurring due with auto-process
  checked, taps Pay/Receive. Confirms: transaction recorded, next occurrence
  created with correct date and same details.

## 4. Deliverables

- **D-01 — Completed card action removal** (`app/dues.tsx`):
  In the `renderItem` callback, the completed-due branch (lines 379-423)
  MUST NOT render the undo `IconButton` (line 412-416), edit `IconButton`
  (line 417), or delete `IconButton` (line 418). The `handleToggleCompleted`
  reference in the `useCallback` dependency array (line 424) MAY be removed
  if no longer used. The completed card retains: icon, title (strikethrough),
  date, amount, and opacity styling.

- **D-02 — Auto-process gates next-occurrence creation** (`app/dues.tsx`):
  In `recordTransaction()` (lines 244-263), wrap the next-occurrence
  `addDue(...)` block in a condition: `if (item.autoProcess === true)`.
  The transaction creation (lines 234-241) and `updateDue` to mark complete
  (line 242) MUST remain unconditional. The `autoProcess` flag MUST be
  copied to the new due when creating the next occurrence.

- **D-03 — Help screen copy update** (`app/help.tsx`):
  Update the scheduled dues help text (line 37 or nearby) to clarify:
  "Enable Auto-Process so that when you mark a recurring due as paid, the
  next occurrence is automatically created. Without Auto-Process, the
  recurring chain stops after payment." Also note that completed dues cannot
  be edited or deleted.

## Glossary

| Term | Meaning |
|---|---|
| Completed due | A due with `completed === true`; payment recorded, locked from modification |
| Auto-process | Boolean flag on Due; when true, Pay/Receive on a recurring due creates the next occurrence |
| Recurring due | A due with `frequency` ∈ {`weekly`, `biweekly`, `monthly`, `yearly`} |
| One-time due | A due with `frequency === "once"` or `frequency` undefined |
| Recurring chain | The sequence of future dues created by successive Pay/Receive actions on recurring dues |

## References

- `AGENTS.md §1` — working agreements (spec-first, no CLI, invariants, docs).
- `app/dues.tsx` — main scheduled dues screen (renderItem, recordTransaction, edit modal).
- `hooks/useDues.ts` — addDue, updateDue, deleteDue functions.
- `types/index.ts` — Due interface (lines 43-54), DueFrequency type.
- `app/help.tsx` — scheduled dues help documentation.
