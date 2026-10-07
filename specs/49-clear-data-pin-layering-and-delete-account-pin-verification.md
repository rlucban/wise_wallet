# Spec 49: Clear Data PIN Layering and Delete Account PIN Verification

| Field | Value |
|---|---|
| ID | SPEC-49 |
| Title | Clear Data PIN Layering and Delete Account PIN Verification |
| Status | **FINAL v1.1** (centered validation feedback per user request 2026-10-07; v1.0 behavior retained) |
| Owner | User (final authority) |
| Version | 1.1 |
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

## 7. v1.1 Amendment — Center PIN Validation Feedback (FINAL)

### 7.1 Constraints

- **CON-06 — Centered inline validation.** Clear Data (`showPinPrompt`) and Delete Account (`showDeleteDialog`) PIN validation errors MUST be displayed inline directly below their respective PIN inputs and horizontally centered (`textAlign: "center"`, `alignSelf: "center"`, `width: "100%"`). Clear Data validation MUST NOT open a second message dialog while its PIN prompt is visible.
- **CON-07 — Behavior preservation.** PIN verification, Local/offline behavior, deletion/clear operations, copy, and dialog transitions MUST remain unchanged except that Clear Data validation is rendered inline and both errors are centered.
- **CON-08 — Cross-platform TDD.** Objective guards MUST run under mocked Android/iOS/Web; reviewer checks MUST cover phone-sized Android and iOS screens and Web.

### 7.2 Goal and Acceptance

| Platform | Objective checks | Subjective reviewer check |
|---|---|---|
| Android | ACC-09 source guards pass with `Platform.OS="android"` | ACC-S09: On a phone, incorrect Clear Data and Delete Account PIN feedback is visible inline, centered, and does not appear behind another dialog. |
| iOS | ACC-09 source guards pass with `Platform.OS="ios"` | ACC-S09: Same observation in Expo Go on a phone. |
| Web | ACC-09 source guards pass with `Platform.OS="web"` | ACC-S10: Both inline validation messages remain centered and visible in the responsive dialog. |

| ID | Check |
|---|---|
| ACC-09 | Clear Data has centered inline error state below its PIN input; wrong PIN sets that error without opening `messageDialog`; Delete Account validation error is centered below its PIN input; all × Android/iOS/Web. |
| ACC-10 | `npm run lint`, `npx tsc --noEmit`, and relevant Jest tests pass (user-run per AGENTS §1.3). |

### 7.3 Deliverables

- **D-02 (`app/(tabs)/settings.tsx`):** Render Clear Data PIN validation inline and center both Clear Data and Delete Account validation messages. Keep verification and mutation logic unchanged.
- **D-03 (`utils/settingsPinFeedback.test.ts`):** Add focused source guards for ACC-09, parameterized across Android/iOS/Web.
- **D-04 (journal):** Update `docs/savepoint.md` and `AGENTS.md` §3.
