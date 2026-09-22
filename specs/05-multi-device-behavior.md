# Spec 05: Multi-Device Behavior

| Field | Value |
|---|---|
| ID | SPEC-05 |
| Title | Multi-Device Behavior — Session Kill Notification & Conflict Resolution UX |
| Status | **FINAL** (2026-09-22 per user call) |
| Owner | User (final authority) |
| Version | 1.0 |
| Scope | Single-session enforcement UX, session kill notification, conflict resolution display |
| Non-goals | Concurrent sessions, push notifications, real-time sync, offline orphan recovery |
| Normative source | This file. |

## Terminology (RFC 2119)

The keywords **MUST**, **MUST NOT**, **SHOULD**, and **MAY** in this spec are
to be interpreted as described in RFC 2119.

## 1. Context

### 1.1 Problem

The current multi-device architecture has three UX gaps:

1. **Lazy session invalidation.** When Device B force-logins, Device A's JWT is
   invalidated server-side, but Device A does not know until its next API call
   returns 401. The user sees a generic logout with no explanation.
2. **Silent data overwrite.** When sync merges remote data that overwrites local
   records (LWW), the user is never told which records were affected.
3. **No session kill alert.** The 401 handler clears credentials and redirects
   to login, but does not explain *why* the user was logged out.

### 1.2 Current architecture

| Layer | Behavior |
|---|---|
| Auth | JWT per login; `authFetch` sends `Authorization: Bearer {token}` |
| Session | API enforces single active session per user |
| Conflict | Device B logs in → `sessionConflict: true` → user confirms → `force: true` → Device A's JWT invalidated |
| 401 | `authFetch` catches 401 → clears local credentials → `onAuthFailure` callback → nav guard redirects to login |
| Sync | Local + remote merged on fetch; LWW via `updatedAt`; sync queue processes sequentially |
| Alerts | `SystemAlertsContext` supports in-app alerts (currently used for negative balance only) |

### 1.3 Definitions

**Session kill** — server-side invalidation of a JWT when another device
force-logins with the same account.

**Overwritten record** — a local record whose `updatedAt` is older than the
corresponding remote record's `updatedAt` during sync merge, causing the local
version to be replaced.

## 2. Constraints (normative)

- **CON-MD-01 — Session kill alert.** When `authFetch` receives a 401 response
  (indicating session ended by another device or token expiry), the app MUST
  create an in-app alert with type `"Warning"`, title `"Session Ended"`, and
  message `"Your session was ended on another device. Please log in again."`
  before redirecting to the login screen. The alert MUST be persisted via
  `SystemAlertsContext` so it survives the redirect and is visible on the
  Notifications screen.
- **CON-MD-02 — Conflict overwrite banner.** After sync merge completes for any
  entity (transactions, categories, dues, savings), if any local records were
  overwritten by remote (remote `updatedAt` > local `updatedAt`), the app MUST
  log the count and show a non-blocking toast/banner: `"{N} record(s) updated
  from another device."` This banner MUST NOT block interaction.
- **CON-MD-03 — Standalone alert types.** The session kill alert MUST use
  `type: "Warning"` (same as negative balance alerts). The conflict overwrite
  banner is transient (auto-dismiss, not persisted) and uses the existing
  toast/banner pattern.
- **CON-MD-04 — No data loss from alert creation.** Creating the session kill
  alert MUST NOT interfere with the credential-clearing or redirect flow. The
  alert is written to AsyncStorage; the redirect happens after.

## 3. Goal

Improve multi-device UX by:
1. Explaining *why* the user was logged out (session ended on another device).
2. Informing the user when sync overwrites their local data from another device.

### Acceptance criteria

- **ACC-MD-01:** a user force-logged-out by another device sees "Session Ended —
  Your session was ended on another device. Please log in again." on the login
  screen (via Notifications).
- **ACC-MD-02:** after sync merge, if 3 transactions were overwritten, the user
  sees a transient banner: "3 record(s) updated from another device."
- **ACC-MD-03:** the session kill alert persists across app restarts (visible in
  Notifications until dismissed).
- **ACC-MD-04:** the conflict overwrite banner auto-dismisses within 5 seconds
  and does not block UI interaction.

## 4. Deliverables

- **D-MD-01 — Session kill notification:** modify `apiClient.ts` to pass 401
  status to `onAuthFailure` callback; modify `AuthContext.tsx` to accept and
  forward the reason; modify `SystemAlertsContext.tsx` to add
  `addSessionAlert(reason)` method; modify `_layout.tsx` nav guard to create
  the alert before redirecting to login.
- **D-MD-02 — Conflict overwrite display:** modify `TransactionsContext.tsx`,
  `useSavings.ts`, `useDues.ts`, `CategoriesContext.tsx` merge logic to count
  overwritten records (local `updatedAt` < remote `updatedAt` for same ID) and
  show a transient banner with the count.

## Glossary

| Term | Meaning |
|---|---|
| Session kill | Server-side JWT invalidation when another device force-logins |
| Overwritten record | Local record replaced by remote during LWW sync merge |
| Transient banner | Non-blocking, auto-dismissing in-app notification |

## References

- `utils/apiClient.ts` — `authFetch` 401 handling
- `context/AuthContext.tsx` — `handleAuthFailure` callback
- `context/SystemAlertsContext.tsx` — in-app alert system
- `app/_layout.tsx` — nav guard (redirects on auth state change)
- `context/TransactionsContext.tsx` — sync merge logic
- `hooks/useSavings.ts`, `hooks/useDues.ts`, `context/CategoriesContext.tsx` — sync merge logic
