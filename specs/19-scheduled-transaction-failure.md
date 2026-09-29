# Spec 19: Scheduled Transaction Creation and Edit Save Failure

| Field | Value |
|---|---|
| ID | SPEC-19 |
| Title | Scheduled Transaction Creation and Edit Save Failure |
| Status | ** investigat** |
| Owner | AI Agent |
| Version | 1.0 |
| Scope | Dues screen: create new due + edit due save functionality |
| Non-goals | UI redesign, new features |

## Terminology (RFC 2119)

The keywords **MUST**, **MUST NOT**, **SHOULD**, and **MAY** in this spec are to be interpreted as described in RFC 2119. Informative prose is non-normative unless restated as a requirement.

## 1. Context

User reports two related issues with the Dues screen (`app/dues.tsx`):

1. **"i cant create a scheduled transact pay is not working"** - Unable to create a new scheduled due payment
2. **"once edit i cant save changes"** - Unable to save changes when editing an existing due

The Dues screen has two workflows:
- **Create**: FAB button navigates to `add-due` screen → user fills form → taps "Save Scheduled Due"
- **Edit**: User taps pencil icon on a due item → edit modal opens → user modifies fields → taps "Save Changes"

Both workflows ultimately call `handleSubmit` in `dues.tsx` which validates input and calls `addDue` or `updateDue` from `useDues` hook.

## 2. Constraints (normative)

- **CON-01 — Create workflow MUST navigate correctly.** FAB onPress `router.push("/add-due")` must successfully navigate to add-due screen. Current code at `dues.tsx:742` shows `onPress={() => router.push("/add-due")}` — MUST be verified working.

- **CON-02 — Edit workflow MUST open modal with pre-filled data.** `handleEdit` at `dues.tsx:175-186` sets form state and `setModalVisible(true)`. MUST populate all fields (title, amount, date, type, frequency, autoProcess, category, customCategory) from the due being edited.

- **CON-03 — Save Changes MUST persist updates.** `handleSubmit` at `dues.tsx:188-256` must successfully call `updateDue` (when editing) or `addDue` (when new). Any throw in the try/catch should be caught and show `"Failed to save scheduled item."` per current error handling.

- **CON-04 — Form validation MUST prevent submit with empty required fields.** Checks `!title`, `isNaN(numAmount) || numAmount <= 0`, and `isOthersSelected && !customCategory.trim()` must all work correctly.

- **CON-05 — Balance validation MUST run for expense types.** When `type === "expense"`, must check `availableBalance` and show insufficient funds alert if `numAmount > availableBalance`.

- **CON-06 — Cross-platform.** MUST keep Android + iOS + Web working. No native-only module static imports at top level.

## 3. Goal

Investigate and fix the two reported issues:
1. Unable to create a new scheduled due transaction (via FAB → add-due screen)
2. Unable to save changes when editing an existing due

Must determine root cause and implement fix per ACC requirements.

## 4. Deliverables

- **D-01:** Diagnose create workflow issue — verify FAB navigation to add-due, check add-due.tsx save functionality, identify why "pay is not working"
- **D-02:** Diagnose edit save issue — verify handleEdit pre-fills form, verify handleSubmit calls correct function (updateDue vs addDue), identify why save fails
- **D-03:** Implement fix for identified issues
- **D-04:** Verify both workflows work correctly after fix

## Glossary

| Term | Meaning |
|---|---|
| FAB | Floating Action Button in dues screen |
| addDue | Function to create new due item |
| updateDue | Function to update existing due item |
| handleSubmit | Function called when saving due form |
| handleEdit | Function called when editing a due |

## References

- `app/dues.tsx` — Dues screen, FAB, handleEdit, handleSubmit
- `app/add-due.tsx` — Add due screen, handleSubmit
- `hooks/useDues.ts` — addDue, updateDue functions
- `context/RepositoryContext.tsx` — repos.dues operations