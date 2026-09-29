# Spec 24: Refactor Passcode Setup, Change Passcode Modal Flow, and Input UI

| Field | Value |
|---|---|
| ID | SPEC-24 |
| Title | Refactor Passcode Setup, Change Passcode Modal Flow, and Input UI |
| Status | **FINAL** (2026-09-29 per user call) |
| Owner | User (final authority) |
| Version | 1.0 |
| Scope | `app/passcode-screen.tsx`, `app/(tabs)/settings.tsx` |
| Non-goals | Changing authentication tokens; cloud sync storage shapes; modifying navigation guard logic in `_layout.tsx` |
| Normative source | This file. File+symbol cites are normative; `:line` numbers are hints only. |

---

## Terminology (RFC 2119)

The keywords **MUST**, **MUST NOT**, **SHOULD**, and **MAY** in this spec are
to be interpreted as described in RFC 2119. Informative prose is non-normative unless restated as a requirement.

---

## 1. Context

### 1.1 Problem

1. **Custom On-Screen Keypad in `app/passcode-screen.tsx`**:
   The current passcode lock screen renders a fixed, custom 1-9 button grid with manual touch targets. On desktop and web browsers, this requires mouse-clicking individual virtual buttons instead of using the physical keyboard or clean input fields. On mobile, it bypasses the system's native numeric keyboard.

2. **Incomplete Set Passcode Flow in `app/(tabs)/settings.tsx`**:
   The current "Set Passcode" dialog (`showPinSetup`) only provides a single "New PIN" input without a "Confirm PIN" confirmation field, risking typos that permanently lock users out.

3. **Suboptimal Change Passcode Flow & Validation**:
   The current "Change Passcode" dialog (`showChangePasscodeDialog`) only validates on button press rather than providing real-time feedback, and the action button remains clickable even with invalid or mismatched inputs.

---

## 2. Constraints

- **CON-01**: `app/passcode-screen.tsx` MUST replace the custom on-screen 1-9 keypad with a standard numeric text input (`TextInput` with `keyboardType="numeric"`, `secureTextEntry={true}`, `maxLength={4}`) that supports physical typing on Web/Desktop and triggers the system numeric keypad on mobile.
- **CON-02**: In `app/(tabs)/settings.tsx`, "Set Passcode" MUST require both **New 4-digit PIN** and **Confirm New PIN**, ensuring both match and are exactly 4 digits.
- **CON-03**: In `app/(tabs)/settings.tsx`, "Change Passcode" MUST require **Current PIN**, **New 4-digit PIN**, and **Confirm New PIN**.
- **CON-04**: "Change Passcode" MUST validate:
  - `Current PIN` matches the stored `passcode`.
  - `New PIN` and `Confirm New PIN` match exactly.
  - `New PIN` is exactly 4 digits.
  - `New PIN` is different from `Current PIN`.
- **CON-05**: Both Set and Change Passcode dialogs MUST provide real-time validation feedback (e.g., "Incorrect Current PIN", "PINs do not match", "PIN must be 4 digits").
- **CON-06**: The "Set Passcode" / "Save Passcode" button in both dialogs MUST remain disabled until all validation conditions are satisfied.
- **CON-07**: Inputs in the modal MUST have clear labels, styled outlines, and helpful placeholder texts.
- **CON-08**: `npm run lint` MUST pass with 0 errors and 0 warnings.

---

## 3. Goal & Acceptance Criteria

### 3.1 Platform Matrix

| Platform | Objective Checks (`ACC-01`..`06`) | Subjective Reviewer Checks (`ACC-07`..`09`) |
|---|---|---|
| **Web** | Standard `TextInput` used; physical keyboard typing supported; validation disables button | Reviewer verifies smooth keyboard entry on desktop without clunky on-screen button clicking |
| **Android** | Standard `TextInput` triggers native numeric keypad; clean 4-digit input | Reviewer verifies PIN screen in Expo Go has clean Material 3 styling |
| **iOS** | Standard `TextInput` triggers native numeric keypad; clean 4-digit input | Reviewer verifies PIN screen in Expo Go has clean Material 3 styling |

### 3.2 Acceptance Criteria

- **ACC-01**: `app/passcode-screen.tsx` contains a centered, styled 4-digit numeric `TextInput` with `secureTextEntry`, `maxLength={4}`, and auto-focus, eliminating the custom 1-9 button grid.
- **ACC-02**: In `app/passcode-screen.tsx`, entering the correct 4-digit PIN immediately unlocks the app (`setIsUnlocked(true)`). Entering an incorrect PIN displays an "Incorrect Passcode" error and resets the input.
- **ACC-03**: In `app/(tabs)/settings.tsx`, "Set Passcode" modal presents:
  - `New PIN` (4 digits, numeric, secure)
  - `Confirm New PIN` (4 digits, numeric, secure)
  - Submit button disabled until both are 4 digits and match.
- **ACC-04**: In `app/(tabs)/settings.tsx`, "Change Passcode" modal presents:
  - `Current PIN` (4 digits, numeric, secure)
  - `New PIN` (4 digits, numeric, secure)
  - `Confirm New PIN` (4 digits, numeric, secure)
  - Submit button disabled until current PIN matches stored PIN, new PIN is 4 digits, new PIN != current PIN, and confirm matches new PIN.
- **ACC-05**: Real-time error text displays below the relevant fields when conditions are violated (e.g. "PINs do not match", "Incorrect current PIN").
- **ACC-06**: `npm run lint` produces 0 errors and 0 warnings.
- **ACC-07**: Reviewer confirms that typing in the passcode screen is responsive, clean, and visually aligned across desktop and mobile.

---

## 4. Deliverables

- **D-01 (`app/passcode-screen.tsx`)**: Refactor screen to remove on-screen virtual keypad grid; introduce centered, styled numeric `TextInput` with auto-focus and 4-dot indicator or clean PIN box.
- **D-02 (`app/(tabs)/settings.tsx`)**: Update "Set Passcode" dialog to include confirm PIN with real-time validation; update "Change Passcode" dialog with clear labels, placeholders, real-time error feedback, and disabled button state until valid.
- **D-03 (`docs/savepoint.md` & `AGENTS.md`)**: Document the changes in change journal and status log upon completion.

---

## 5. References

- [PasscodeContext.tsx](file:///C:/Users/rcluc/Downloads/wise_wallet/context/PasscodeContext.tsx)
- [passcode-screen.tsx](file:///C:/Users/rcluc/Downloads/wise_wallet/app/passcode-screen.tsx)
- [settings.tsx](file:///C:/Users/rcluc/Downloads/wise_wallet/app/(tabs)/settings.tsx)
