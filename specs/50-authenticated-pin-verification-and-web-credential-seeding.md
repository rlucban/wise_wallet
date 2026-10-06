# Spec 50: Authenticated PIN Verification and Web Credential Seeding

| Field | Value |
|---|---|
| ID | SPEC-50 |
| Title | Authenticated PIN Verification and Web Credential Seeding |
| Status | **FINAL** (2026-10-06 per user call) |
| Owner | User (final authority) |
| Version | 1.0 |
| Scope | `app/(tabs)/settings.tsx`: `verifyAccountPin` authenticated bearer check + multi-candidate login verification; `app/login.tsx` & `app/register.tsx`: web credential persistence into `master_users` and `user_{id}_passcode` |
| Non-goals | Changing backend API contracts; modifying JWT generation or secrets; changing encryption algorithms (SHA-256 for local, bcrypt for cloud) |
| Normative source | This file. `AGENTS.md §4` is a pointer only. File+symbol cites are normative; `:line` numbers are hints only. |

---

## Terminology (RFC 2119)

The keywords **MUST**, **MUST NOT**, **REQUIRED**, **SHALL**, **SHALL NOT**, **SHOULD**, **SHOULD NOT**, **RECOMMENDED**, **MAY**, and **OPTIONAL** in this document are to be interpreted as described in RFC 2119.

---

## 1. Context

### 1.1 Problem
When a user attempts to execute "Clear All Data" or "Delete Account" in Settings (`app/(tabs)/settings.tsx`):
1. The app requests a 4-digit PIN to confirm the destructive action.
2. The user enters their correct 4-digit account PIN.
3. Verification fails with "Incorrect PIN. Please try again." (Clear Data) or "Invalid PIN. Please try again." (Delete Account).
4. As confirmed by user repro on Web (`localhost:8081/settings`), the user is completely blocked from clearing data or deleting the account despite typing the exact correct PIN.

### 1.2 Root Cause Analysis
1. **Identifier Mismatch in Cloud Login Verification**:
   - `verifyAccountPin` attempts to verify against `${API_URL}/auth/login` by sending `{ name: profile?.name, passcode: pin }`.
   - Accounts are registered and logged in with their **email address** as the `name` identifier in the backend `users` table.
   - During onboarding, `profile?.name` in `userProfiles` is populated with the user's chosen display name (e.g. "Reniel" or "Wise User").
   - Consequently, `${API_URL}/auth/login` checks for a user whose registered email is "Reniel", which does not exist, returning `401 Unauthorized` (Invalid credentials).
2. **Missing Local Credential Seeding on Web**:
   - In `app/login.tsx` (lines 204–209) and `app/register.tsx` (lines 83–89), `addUser(...)` is wrapped inside `if (Platform.OS !== "web")`.
   - On Web, `master_users` is never seeded with the account credentials upon registration or login.
   - When the cloud login check fails due to display name mismatch, the fallback check `users.find(u => u.id === activeUserId)` yields `undefined`, failing locally.
3. **PasscodeContext App-Lock Decoupling**:
   - `PasscodeContext` only sets `isPasscodeEnabled` if the user explicitly visited Security → "Set Passcode" in Settings.
   - Initial registration and login do not mirror the 4-digit PIN to `user_{id}_passcode`.
   - When a user has not enabled the app startup lock, `PasscodeContext` has `storedHash === null` and returns `false`.

---

## 2. Constraints (normative)

- **CON-01 — Authenticated Server Verification First:** For online cloud accounts with an active session (`authToken`), `verifyAccountPin` MUST verify the PIN against the server using the authenticated session token rather than unauthenticated `auth/login` with display name.
- **CON-02 — Direct `fetch` Usage for Trial Verification:** Server verification MUST use direct `fetch` (with `Authorization: Bearer <token>`) rather than `authFetch`, so that a 401 response from an incorrect PIN candidate does NOT trigger `clearAuthStorage` or session logout.
- **CON-03 — Web Credential Mirroring:** On Web, `addUser` MUST be called upon successful cloud registration and login so that `master_users` retains the local credential hash and registered email identifier for offline/local fallback.
- **CON-04 — Login Email Persistence:** Successful login and registration MUST store the registered email/identifier under `user_{id}_email` in storage, allowing candidate resolution even if profile display name changes.
- **CON-05 — Self-Healing Credential Cache:** Upon successful server PIN verification in Settings, the app MUST persist the verified PIN hash to `user_{id}_passcode` and update `master_users`, healing legacy sessions without requiring re-login.
- **CON-06 — Local Account Invariant:** Local accounts (`isLocal === true`) MUST NOT issue network calls and MUST verify strictly against `PasscodeContext` and `master_users`.

---

## 3. Goal & Acceptance Criteria

### 3.1 Decisions

- **DEC-01 (Session-Aware Server Check in `verifyAccountPin`):**
  For online cloud accounts (`!isLocal && API_URL && isOnline`):
  1. Retrieve `authToken`.
  2. Send `POST ${API_URL}/auth/change-passcode` with `{ currentPasscode: cleanPin, newPasscode: cleanPin }` and `Authorization: Bearer ${authToken}` using direct `fetch`.
  3. If status is `200`, PIN is verified. Self-heal local credential stores (`setSecureItem` for `user_{id}_passcode` and `updateUserPasscode`).
  4. If status is `401`, PIN is incorrect.
  5. If endpoint is unreachable or fails with other status, fall back to multi-candidate `POST ${API_URL}/auth/login` testing `[storedEmail, user?.name, profile?.name]`.
- **DEC-02 (Local Fallback & Passcode Check):**
  If `isPasscodeEnabled` or `storedHash` exists, verify via `verifyPasscode(cleanPin)`.
  If user exists in `master_users`, verify via SHA-256 hash or plaintext match.
- **DEC-03 (Enable Web `addUser` & Store Email):**
  Remove `if (Platform.OS !== "web")` around `addUser` in `app/login.tsx` and `app/register.tsx`.
  Persist `storedEmail` under `getPrefixedKey('email', userId)` upon login and registration.

### 3.2 Platform Matrix & Acceptance Criteria

| Platform | Type | Criteria |
|---|---|---|
| Web | Objective (`ACC-01`) | Entering correct 4-digit PIN in Clear Data dialog on Web successfully verifies and proceeds to confirmation dialog without "Incorrect PIN" failure. |
| Web | Objective (`ACC-02`) | Entering correct 4-digit PIN in Delete Account dialog on Web successfully displays "PIN verified" with checkmark and enables confirmation. |
| Android | Objective (`ACC-03`) | Entering correct 4-digit PIN in Clear Data and Delete Account verifies successfully for both Local and Cloud accounts. |
| iOS | Objective (`ACC-04`) | Entering correct 4-digit PIN in Clear Data and Delete Account verifies successfully for both Local and Cloud accounts. |
| All | Objective (`ACC-05`) | Entering incorrect PIN displays inline error without logging out the user or clearing session storage. |
| All | Subjective (`ACC-06`) | Reviewer verifies Clear Data clears all data smoothly and Delete Account permanently deletes the account and routes to `/login`. |

---

## 4. Deliverables

- **D-01 (`app/(tabs)/settings.tsx`):**
  Update `verifyAccountPin`:
  - Check active session bearer verification via direct `fetch` to `${API_URL}/auth/change-passcode` (with `currentPasscode: pin, newPasscode: pin`).
  - Self-heal local stores on success.
  - Multi-candidate fallback for `${API_URL}/auth/login` using stored email, `master_users.name`, and `profile?.name`.
  - Check `verifyPasscode` and `master_users`.
- **D-02 (`app/login.tsx`):**
  - Remove `Platform.OS !== "web"` gate from `addUser`.
  - Store login email under `getPrefixedKey('email', inner.user.id)`.
  - Cache initial passcode hash in `user_{id}_passcode`.
- **D-03 (`app/register.tsx`):**
  - Remove `Platform.OS !== "web"` gate from `addUser`.
  - Store registered email under `getPrefixedKey('email', responseData.data.user.id)`.
  - Cache initial passcode hash in `user_{id}_passcode`.

---

## 5. Glossary

- **`verifyAccountPin`:** Centralized verification function in Settings for PIN-gated destructive operations.
- **`master_users`:** Local credential table in storage containing user IDs, registered identifiers, and SHA-256 passcode hashes.
- **`change-passcode`:** Server endpoint validating `currentPasscode` against the user's bcrypt hash using the authenticated JWT token.

---

## 6. References

- `specs/04-connection-status-vs-offline-mode.md` (SPEC-04)
- `specs/35-pin-change-persistence-and-promotion-safety.md` (SPEC-35)
- `specs/36-web-platform-invariants.md` (SPEC-36)
- `specs/49-clear-data-pin-layering-and-delete-account-pin-verification.md` (SPEC-49)
