# Spec 49: Clear Data PIN Layering and Delete Account PIN Verification

| Field | Value |
|---|---|
| ID | SPEC-49 |
| Title | Clear Data PIN Layering and Delete Account PIN Verification |
| Status | **FINAL** (2026-10-06 per user call) |
| Owner | User (final authority) |
| Version | 1.0 |
| Scope | `app/(tabs)/settings.tsx`: Clear Data PIN modal inline error display, unified PIN verification in `verifyAccountPin` and `handleClearData`, and robust account deletion flow |
| Non-goals | Changing API contract for `/auth/login` or `/auth/account`; modifying `PasscodeContext` internals; modifying `register.tsx` or `login.tsx` |
| Normative source | This file. `AGENTS.md §4` is a pointer only. File+symbol cites are normative; `:line` numbers are hints only. |

---

## Terminology (RFC 2119)

The keywords **MUST**, **MUST NOT**, **REQUIRED**, **SHALL**, **SHALL NOT**, **SHOULD**, **SHOULD NOT**, **RECOMMENDED**, **MAY**, and **OPTIONAL** in this document are to be interpreted as described in RFC 2119.

---

## 1. Context

### 1.1 Problem
1. **Clear Data PIN Validation Modal Layering**:
   In `app/(tabs)/settings.tsx`, when a user enters an incorrect PIN in the "Enter PIN to Clear Data" dialog (`showPinPrompt`), `handleClearData` calls `showMessage("error", "Incorrect PIN", "Please try again.")`. Because `showPinPrompt` remains `true` and the `<Dialog visible={showPinPrompt}>` is rendered after `<Dialog visible={messageDialog.visible}>` inside the `<Portal>`, React Native Paper renders `messageDialog` *behind* `showPinPrompt`. The user cannot see or interact with the error message, making the modal appear stuck.

2. **Delete Account PIN Verification Failure**:
   In `app/(tabs)/settings.tsx`, when attempting to delete an account via `handleVerifyDeletePin`:
   - `verifyAccountPin(pin)` sends a login request to `${API_URL}/auth/login` using `profile?.name`. If the user is a Local (Offline) account, or if the user's profile display name differs from the registered identifier, or on Web where `master_users` is not seeded on registration, the verification fails even when the user enters the correct 4-digit PIN.
   - `verifyAccountPin` does not consult `verifyPasscode(pin)` from `PasscodeContext`, ignoring the active passcode session/hash.
   - For Local accounts, `executeDelete` unconditionally calls `authFetch('auth/account', { method: 'DELETE' })`, which fails on local accounts that have no cloud presence.

---

## 2. Constraints (normative)

- **CON-01 — Inline Error in PIN Modal:** The Clear Data PIN prompt (`showPinPrompt`) MUST display validation failures inline directly under the PIN `TextInput` rather than opening `messageDialog` while the prompt is open.
- **CON-02 — Unified PIN Verification:** PIN verification for both Clear Data (`handleClearData`) and Delete Account (`verifyAccountPin`) MUST check `verifyPasscode(pin)` from `PasscodeContext` as a valid source of truth alongside `master_users` and `${API_URL}/auth/login`.
- **CON-03 — Local Account Zero Cloud Call Invariant:** For Local accounts (`isLocal === true`), `verifyAccountPin` and `executeDelete` MUST NOT issue API calls (`fetch` or `authFetch`) to cloud endpoints.
- **CON-04 — Web & Cross-Platform Parity:** PIN verification MUST work reliably across Web, Android, and iOS regardless of whether `master_users` contains local records.
- **CON-05 — State Reset on Dismiss:** Dismissing or canceling `showPinPrompt` or `showDeleteDialog` MUST reset any input and error states.

---

## 3. Goal

### 3.1 Decisions

- **DEC-01 (Inline Error for Clear Data):** Add `pinClearError` state in `SettingsScreen`. In `handleClearData`, if PIN verification fails, set `pinClearError("Incorrect PIN. Please try again.")` and clear `pinInput`. Render this error message in red below the `TextInput` in `showPinPrompt`. Reset `pinClearError` on text change and on dialog dismiss.
- **DEC-02 (Unified Verification Logic):**
  - If `isPasscodeEnabled` and `await verifyPasscode(pin)` returns `true`, PIN is verified.
  - If not verified, and `!isLocal` and `API_URL` is configured and online, attempt `${API_URL}/auth/login` with `profile?.name` and `pin`.
  - If not verified, fall back to checking `getUsers()` in `master_users` against `SHA256(pin)` or plaintext `pin`.
- **DEC-03 (Local Deletion Bypass):** In `executeDelete`, gate `authFetch('auth/account', { method: 'DELETE' })` behind `!isLocal`. For local accounts, directly clear local data, delete from `master_users`, log out, and redirect to `/login`.

### 3.2 Platform Matrix & Acceptance Criteria

| Platform | Type | Criteria |
|---|---|---|
| Android | Objective (`ACC-01`) | Entering incorrect PIN in Clear Data dialog displays "Incorrect PIN. Please try again." inline below the PIN input without opening a background modal. |
| iOS | Objective (`ACC-02`) | Entering incorrect PIN in Clear Data dialog displays "Incorrect PIN. Please try again." inline below the PIN input without opening a background modal. |
| Web | Objective (`ACC-03`) | Entering incorrect PIN in Clear Data dialog displays "Incorrect PIN. Please try again." inline below the PIN input without opening a background modal. |
| Android | Objective (`ACC-04`) | For Local and Cloud accounts with passcode enabled, entering correct PIN in Delete Account verifies successfully and enables confirmation. |
| iOS | Objective (`ACC-05`) | For Local and Cloud accounts with passcode enabled, entering correct PIN in Delete Account verifies successfully and enables confirmation. |
| Web | Objective (`ACC-06`) | For Local and Cloud accounts with passcode enabled, entering correct PIN in Delete Account verifies successfully and enables confirmation. |
| All | Objective (`ACC-07`) | For Local accounts (`isLocal === true`), Delete Account executes successfully without calling `auth/account` endpoint. |
| All | Subjective (`ACC-08`) | Reviewer verifies dialog stays responsive, errors are immediately visible and legible in both light and dark mode, and account deletion cleans up local data smoothly. |

---

## 4. Deliverables

- **D-01 (`app/(tabs)/settings.tsx`):**
  - Add `pinClearError` state and wire to `showPinPrompt` dialog UI.
  - Update `handleClearData` to use unified PIN check and set `pinClearError` on failure.
  - Update `verifyAccountPin` to check `verifyPasscode` first, gate cloud login to `!isLocal`, and fallback to `master_users`.
  - Update `executeDelete` to gate `authFetch('auth/account')` to `!isLocal`.

---

## 5. Glossary

- **`showPinPrompt`:** Modal dialog asking for 4-digit PIN before proceeding to Clear All Data confirmation.
- **`showDeleteDialog`:** Modal dialog asking for PIN verification and acknowledgement checkbox before permanently deleting account.
- **`verifyPasscode`:** Function from `PasscodeContext` checking input against active session PIN and encrypted secure storage hash.

---

## 6. References

- `specs/04-connection-status-vs-offline-mode.md` (SPEC-04)
- `specs/26-responsive-dialogs-and-clear-data-flow.md` (SPEC-26)
- `specs/35-pin-change-persistence-and-promotion-safety.md` (SPEC-35)
