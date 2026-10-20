# Metadata
| ID | Title | Status | Owner | Version | Scope | Non-goals |
|----|-------|--------|-------|---------|-------|-----------|
| 109 | Cross-device login confirmation | FINAL | rcluc | 1.0 | Mobile 1 & Mobile 2 login flow | No changes to existing API contracts |

# Context
- The current authentication flow is managed by `AuthContext` and stores the logged‑in user in AsyncStorage under keys `user_{id}_*`.
- Mobile 1 may be performing transactions while logged in.
- Mobile 2 attempts to log in with the same account on a different device.
- “Validation” refers to a UI prompt/notification presented on Mobile 1 that requires the user to approve or reject Mobile 2’s login attempt.

# Constraints
CON-01 MUST NOT break existing logout behavior.
CON-02 MUST work on Android, iOS, and Web (Expo Go compatible).
CON-03 MUST keep the existing `user_{id}_*` storage schema unchanged.
CON-04 MUST handle the case where Mobile 1 is offline – the prompt should still appear when connectivity resumes.
CON-05 MUST not introduce new npm dependencies.

# Goal
Implement a cross‑device login confirmation flow.

## Acceptance Criteria
- **ACC-01** (machine‑checkable) – When Mobile 2 initiates login, the backend (or client‑side sync) returns a `409 Conflict` response with a payload `{ pending: true }` until Mobile 1 responds.
- **ACC-02** (human‑checked) – Mobile 1 displays a modal titled *“Device 2 is trying to log in”* with **Allow** and **Cancel** buttons.
- **ACC-03** (machine‑checkable) – If Mobile 1 selects **Cancel**, Mobile 2 receives an error message *“Login rejected by existing session”* and remains logged out.
- **ACC-04** (machine‑checkable) – If Mobile 1 selects **Allow**, Mobile 2 proceeds to the normal logged‑in state and receives the usual auth token.
- **ACC-05** (human‑checked) – After Mobile 1 approves, any draft transaction on Mobile 1 continues uninterrupted.
- **ACC-06** (human‑checked) – If Mobile 1 rejects, any in‑progress transaction on Mobile 1 is automatically saved as a draft.

# Deliverables
| D-# | Description |
|-----|-------------|
| D-01 | New utility `utils/isSameDeviceSession.ts` (or hook) to detect concurrent login attempts and store a pending request in AsyncStorage.
| D-02 | UI component `components/DeviceLoginPrompt.tsx` that shows the Allow/Cancel modal on Mobile 1.
| D-03 | Extend `AuthContext` (or create `LoginConfirmationContext`) to store the pending login request and expose `approveLogin` / `rejectLogin` actions.
| D-04 | Modify the login screen (`app/login.tsx` or appropriate route) to check for a pending confirmation before finalizing login.
| D-05 | Add platform‑parameterized Jest tests covering Android, iOS, and Web branches for the new flow.
| D-06 | Update `docs/savepoint.md` with a new “Current status” entry describing the feature addition.
| D-07 | Update any relevant TypeScript types in `types/` (e.g., add `PendingLoginRequest` interface).

# Glossary
- **Mobile 1** – The device that is already logged in with the account.
- **Mobile 2** – The second device attempting to log in with the same account.
- **Pending login request** – A temporary record stored in AsyncStorage indicating that a login from another device is awaiting confirmation.
- **Allow / Cancel** – User actions on Mobile 1 that respectively approve or reject Mobile 2’s login attempt.

# References
- [`AuthContext`](file:///c:/Users/rcluc/Downloads/wise_wallet/app/context/AuthContext.tsx)
- Existing login screen: [`app/login.tsx`](file:///c:/Users/rcluc/Downloads/wise_wallet/app/login.tsx)
- AsyncStorage utility: [`utils/storage.ts`](file:///c:/Users/rcluc/Downloads/wise_wallet/utils/storage.ts)
