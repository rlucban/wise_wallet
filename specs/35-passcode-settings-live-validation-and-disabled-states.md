# Spec 35: Passcode Settings Live Validation and Complete Disabled States

| Field | Value |
|---|---|
| ID | SPEC-35 |
| Title | Passcode Settings Live Validation and Complete Disabled States |
| Status | **FINAL** (2026-10-03 per user call) |
| Owner | User (final authority) |
| Version | 1.0 |
| Scope | `app/(tabs)/settings.tsx`, `app/passcode-screen.tsx`, `utils/passcodeValidation.ts`, `utils/passcodeValidation.test.ts`, `docs/savepoint.md` |
| Non-goals | No changes to `context/PasscodeContext.tsx` storage shape, auth tokens, cloud sync, API contract, navigation guards, native dependencies, or local notification scheduling. No keyboard-avoidance refactor; that is tracked separately in the no-ops worktree. |
| Normative source | This file. File+symbol cites are normative; `:line` numbers are hints only. |

> History: v0.1 draft 2026-10-03; v1.0 FINAL per user call 2026-10-03.

## Terminology (RFC 2119)

The keywords **MUST**, **MUST NOT**, **SHOULD**, and **MAY** in this spec are to be interpreted as described in RFC 2119. Informative prose is non-normative unless restated as a requirement.

## 1. Context

SPEC-24 introduced the current passcode requirements, and SPEC-25/26 unified the dialogs in `app/(tabs)/settings.tsx`. In the current main tree, the behavior still does not fully satisfy the intent:

1. Validation is mostly submit-triggered. Fields clear their error on edit, but do not re-validate live while typing.
2. The Step 2 / no-existing-passcode "Set Passcode" button is disabled only when New/Confirm are not 4 digits or do not match. It does not enforce `New PIN !== current PIN` when an existing passcode is present.
3. Inputs have labels but no helpful placeholders.
4. `app/passcode-screen.tsx` uses "Incorrect passcode. Please try again." rather than the SPEC-24 copy style; the lock screen remains otherwise functional.
5. No centralized, jest-testable passcode validation module exists.

## 2. Constraints

- **CON-01 — Central pure validation.** Add `utils/passcodeValidation.ts` with pure string helpers and validation predicates. It MUST NOT import React, React Native components, AsyncStorage, or contexts.
- **CON-02 — Live consistency feedback.** In the unified passcode dialog, non-empty New/Confirm fields MUST show consistency and format errors while typing. Current-PIN correctness against the stored passcode MAY remain submit-triggered to avoid turning the UI into an incremental PIN oracle; format errors MAY be live.
- **CON-03 — Complete disabled predicates.**
  - Step 1 "Verify Current PIN" MUST be disabled unless `Current Passcode` normalizes to exactly 4 digits.
  - Step 2 "Set Passcode" MUST be disabled unless `New Passcode` is 4 digits, `Confirm New Passcode` is 4 digits, they match, and `New Passcode !== stored current passcode`.
  - No-existing-passcode "Set Passcode" MUST be disabled unless `New Passcode` is 4 digits, `Confirm New Passcode` is 4 digits, and they match.
- **CON-04 — Exact copy.** Error copy MUST use these strings:
  - `PIN must be 4 digits.`
  - `Incorrect Current PIN.`
  - `New PIN must be different from current PIN.`
  - `New PINs do not match.`
  - Passcode-screen wrong PIN: `Incorrect Passcode`
- **CON-05 — Input affordances.** All PIN inputs MUST keep `keyboardType="numeric"`, `secureTextEntry`, `maxLength={4}`, non-digit stripping, clear labels, and gain placeholders: `Current Passcode` → `4 digits`, `New Passcode` → `4 digits`, `Confirm New Passcode` → `4 digits`.
- **CON-06 — No security model change.** `PasscodeContext` persistence, tokens, login, register, Make Online, deletion, and sync behavior MUST remain unchanged.
- **CON-07 — Verification.** `npm run lint`, `npx tsc --noEmit`, and the new jest suite MUST pass. Expo Go and web export checks MUST be user-run.
- **CON-08 — Cross-platform TDD.** The validation helper MUST be tested with `Platform.OS` parameterized as `android` / `ios` / `web`.

## 3. Goal & Acceptance Criteria

| Platform | Objective Checks | Subjective Reviewer Checks |
|---|---|---|
| Android | Step 1/2 disabled states match CON-03; live errors appear with the exact CON-04 strings; numeric keypad opens; no red-box in Expo Go. | Reviewer confirms labels/placeholders are clear and the dialog does not jump unexpectedly. |
| iOS | Same objective behavior as Android; correct/incorrect PIN handling is identical. | Reviewer confirms native numeric keypad and Material 3 styling remain clean. |
| Web | Same objective behavior; physical keyboard input works; Set button stays disabled until complete. | Reviewer confirms no mouse-only keypad regression and no layout overflow in the dialog. |

- **ACC-01:** `utils/passcodeValidation.ts` exports `normalizePasscodeInput(value: string): string`, `isFourDigitPasscode(value: string): boolean`, `getPasscodeFormatError(value: string): string | null`, `getNewPasscodeError(next: string, current?: string | null): string | null`, `getConfirmPasscodeError(next: string, confirm: string): string | null`, and `canSubmitPasscodeChange(next: string, confirm: string, current?: string | null): boolean`.
- **ACC-02:** `normalizePasscodeInput` strips non-digits and caps at 4 characters.
- **ACC-03:** `getPasscodeFormatError` returns `PIN must be 4 digits.` for a non-empty value that is not exactly four digits, otherwise `null`.
- **ACC-04:** `getNewPasscodeError` returns the different-from-current error when `current` is present and equal to `next`; otherwise only format/null.
- **ACC-05:** `getConfirmPasscodeError` returns `New PINs do not match.` when both fields are complete and differ; returns format error when confirm is complete but invalid; otherwise `null` until there is something to report.
- **ACC-06:** `canSubmitPasscodeChange` is false unless `next` and `confirm` are 4 digits, equal, and different from `current` when `current` is provided.
- **ACC-07:** Settings Step 1 verify button disabled predicate is exactly `isFourDigitPasscode(current)` after normalization.
- **ACC-08:** Settings Step 2 set button disabled predicate is exactly `!canSubmitPasscodeChange(new, confirm, storedPasscode)`.
- **ACC-09:** Settings no-existing-passcode set button disabled predicate is exactly `!canSubmitPasscodeChange(new, confirm, null)`.
- **ACC-10:** On wrong stored current PIN, the UI shows `Incorrect Current PIN.` and clears the current input while preserving the error.
- **ACC-11:** `app/passcode-screen.tsx` sets `Incorrect Passcode` on wrong 4-digit input and clears the input after the existing short delay.
- **ACC-12:** `utils/passcodeValidation.test.ts` runs the object-count/exact-string/disabled predicate checks across android/ios/web.
- **ACC-13:** Reviewer confirms in Expo Go and web that placeholders, secure entry, numeric keyboard, disabled buttons, and inline errors are usable and consistent.

## 4. Deliverables

- **D-01 (`utils/passcodeValidation.ts`)**: Implement the pure validation module in ACC-01..06 with exact copy.
- **D-02 (`utils/passcodeValidation.test.ts`)**: Add jest tests parameterized by `Platform.OS` for android/ios/web.
- **D-03 (`app/(tabs)/settings.tsx`)**: Route Step 1, Step 2, and no-existing-passcode disabled predicates through `utils/passcodeValidation.ts`; show live New/Confirm errors; add placeholders; preserve the unified dialog and success messages.
- **D-04 (`app/passcode-screen.tsx`)**: Align wrong-PIN copy with CON-04 and remove the commented duplicate ref line.
- **D-05 (`docs/savepoint.md`, `AGENTS.md`)**: After implementation, append a change-journal entry and a `Current status` entry per `.agents/rules/wisewallet.md`.
- **D-06 (verification)**: User runs `npm run lint`, `npx tsc --noEmit`, `npm test -- passcodeValidation`, Expo Go, and `expo export --platform web` checks.

## 5. Glossary

- **Normalization**: Removing non-digit characters and capping length to 4 before validation.
- **Live feedback**: Error text updates as the user edits, rather than only after pressing a submit button.
- **Stored current passcode**: The `passcode` value from `PasscodeContext`.

## 6. References

- `specs/24-passcode-refactor-and-modal-flow.md`
- `specs/28-passcode-screen-ref-type.md`
- `docs/savepoint.md`
- `app/(tabs)/settings.tsx`
- `app/passcode-screen.tsx`
