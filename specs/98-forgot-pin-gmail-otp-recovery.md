# SPEC-98 — Forgot PIN (Gmail OTP Recovery) at Login and Settings

| Field | Value |
|---|---|
| ID | SPEC-98 |
| Title | "Forgot PIN?" — email lookup + Gmail OTP verification + new 4-digit PIN, at Login and Settings |
| Status | **DRAFT v0.1** (not yet FINAL — awaiting user FINAL mark per AGENTS §1.1) |
| Owner | User (final authority) |
| Version | 0.1 DRAFT |
| Scope | New shared flow component `components/ForgotPinFlow.tsx` + entry points in `app/login.tsx` and `app/(tabs)/settings.tsx` + new pure helper `utils/forgotPin.ts` + native local-lock reset helper (via `utils/db.ts` `updateUserPasscode` + `utils/storage.ts` `getPrefixedKey`) + new guard `utils/forgotPin.test.ts` + `wallet-api` contract (D-B-*) |
| Non-goals | `app/register.tsx` (byte-identical, untouched); Local-only offline recovery without email; biometrics; changing `auth/login`, `auth/register`, `auth/change-passcode`; new navigation routes; new npm dependencies; storage-key changes; changing the 4-digit PIN length |

RFC 2119 terminology (MUST / MUST NOT / SHOULD / MAY) applies. Informative prose ("today", "currently") is non-normative unless restated as a requirement.

## Context

Users can lose their 4-digit PIN. Today the only recovery is Settings → Change Passcode (requires the current PIN) or a Cloud `auth/change-passcode` call (also requires the current PIN), so a forgotten PIN has no path back into the account.

Two distinct PIN concepts exist and MUST both be addressed by a reset:

1. **Server auth PIN** — `users.passcode` (bcrypt, wallet-api), used by `POST /auth/login` and `POST /auth/change-passcode`.
2. **Local app-lock PIN** — a 4-digit `PasscodeContext` lock, hashed (SHA256) to the per-user secure key `user_{id}_passcode` (SPEC-35) and mirrored in the native `master_users` row. This gates the app UI (`app/_layout.tsx:207-213`), not the server.

Because the app cannot send email, the email-existence check, OTP generation/delivery (via Gmail), OTP verification, and the PIN write are **backend responsibilities** (wallet-api). This spec defines the client-side contract exactly; the user implements wallet-api to match (D-B-*).

## Constraints

- **CON-01** Every change MUST keep Android + iOS + Web working, stay Expo Go (latest) import-safe, and stay Vercel-deployable (`EXPO_PUBLIC_*` only; no Node APIs; no secrets in the bundle). Use `Platform.OS` for platform code (AGENTS §1).
- **CON-02** No new npm packages, native modules, fonts, or third-party code (AGENTS §1.12). The 6 OTP boxes MUST be built from existing RN/Paper primitives (react-native `TextInput`), not an OTP library.
- **CON-03** Bare-minimum diff (AGENTS §1.11). `app/register.tsx` MUST be byte-identical. No route added to the Stack and no change to the `_layout.tsx` nav guards (the flow is a modal component — DEC-01). No storage keys, AsyncStorage shapes, or existing API calls change.
- **CON-04** **Non-revealing enumeration rule (FINAL user call).** `POST auth/forgot-pin/request` MUST return HTTP 200 with the same generic body for every email (registered or not). The client MUST always advance to the OTP screen after the neutral prompt; there is NO "email not found" branch and NO distinct not-found copy. The originally drafted string `"Couldn't find email, reset PIN aborted."` is DROPPED and MUST NOT appear anywhere.
- **CON-05** **OTP policy (FINAL user call).** 6 digits; 10-minute expiry; maximum 5 wrong attempts then lockout; resend cooldown 60 s, maximum 3 sends per reset session. The server MUST enforce all of these; the client MUST reflect them (disable Resend during cooldown, count resends, surface lockout). Client-side gating is a UX mirror, never the authority.
- **CON-06** **No auth side effects.** The three forgot-pin calls MUST NOT clear the auth token, MUST NOT trigger the 401 session-ended handler, and MUST NOT log the user out. They MUST use plain `fetch` with an `AbortController` timeout (same pattern as `app/login.tsx` `tryCloudLogin`), NOT `authFetch`. The Settings path stays logged in.
- **CON-07** **Cloud-only entry visibility.** The Forgot PIN entry MUST be hidden when `!API_URL` (no cloud backend configured). For Local-only accounts with a configured backend, clicking Forgot PIN still runs the generic flow (CON-04), so it never reveals local-vs-cloud and simply fails to receive a code — this is accepted (see Risks).
- **CON-08** **Local app-lock reset (native only, FINAL user call).** After `auth/forgot-pin/reset` succeeds, on `Platform.OS !== "web"` the app MUST reset the local lock for the matching local account (found by case-insensitive `name === email`) to the same new PIN: `updateUserPasscode(userId, newPin)` (SHA256, no plaintext) and overwrite the secure key `user_{userId}_passcode` with `SHA256(newPin)`. If the reset runs from Settings and `activeUserId === userId`, it MUST also call `PasscodeContext.setPasscode(newPin)` so the in-memory lock matches. On web this step MUST be a no-op (SPEC-36: no local rows).
- **CON-09** **Copy is fixed.** The strings in the Copy table (§3) are normative and MUST be used verbatim (subject to the existing button-label convention `theme.colors.onPrimary` on contained buttons).
- **CON-10** **Secrets.** The PIN and the OTP code MUST NOT be logged, persisted in plaintext, or placed in any URL. Only the email is sent; the new PIN travels only to the HTTPS `auth/forgot-pin/reset` endpoint.
- **CON-11** **Post-reset destination (FINAL user call).** From Login, a successful reset MUST return the user to the Login screen with the email prefilled and the PIN field empty; the user signs in with the new PIN (no auto-login). From Settings, the user MUST remain on Settings, logged in.
- **CON-12** Spec-first + TDD with cross-platform coverage (AGENTS §1.10): `utils/forgotPin.test.ts` is parameterized by `Platform.OS` (android/ios/web) for logic/copy/contract guards; native and web UI paths that jest cannot prove stay as user-run Subjective checks.

## Goal

Add a "Forgot PIN?" entry at Login and Settings that runs: Email → Proceed → neutral prompt → Okay → loading → 6-digit OTP → new 4-digit PIN → success, against the 3-step wallet-api contract, without revealing whether an email is registered.

### Interaction matrix

| Aspect | Login | Settings |
|---|---|---|
| Entry control | Text link `Forgot PIN?` below the Login button | Text button `Forgot PIN?` in the Passcode section, below Change/Set Passcode |
| Email field | Editable, validated format | Prefilled from `authName` (fallback `profile.name`), read-only (DEC-07) |
| Proceed → prompt | Neutral prompt dialog (copy §3) | Neutral prompt dialog (copy §3) |
| Okay → loading | Full-bleed modal spinner | Full-bleed modal spinner |
| OTP screen | 6 boxes + Resend + Verify | 6 boxes + Resend + Verify |
| New-PIN step | New + Confirm | New + Confirm |
| On success | Back to Login, email prefilled, PIN empty (CON-11) | Stay on Settings, logged in (CON-11) |
| Local lock reset | Native: reset matching local row + secure key (CON-08) | Native: same + in-memory `setPasscode` when active (CON-08) |
| Platform | Android / iOS / Web | Android / iOS / Web |

### Decisions (FINAL unless noted — user answers 2026-10-12)

- **DEC-01** Ship one shared component `components/ForgotPinFlow.tsx` rendered inside a modal on both screens; **no new route** and **no `_layout.tsx` change** (the unauthenticated nav guard at `app/_layout.tsx:180-187` only allows `login`/`register`/`intro`/`onboarding`; a new route would need guard surgery — more blast radius for no gain). Rejected: dedicated `app/forgot-pin.tsx` route.
- **DEC-02** Non-revealing flow: request always 200 + always show OTP; drop the not-found error string (CON-04).
- **DEC-03** 3-step contract: `request` → `verify` (returns short-lived single-use `resetToken`) → `reset`.
- **DEC-04** OTP policy values per CON-05.
- **DEC-05** Post-reset behavior per CON-11 (no auto-login).
- **DEC-06** Local app-lock reset to the new PIN per CON-08.
- **DEC-07** Settings prefills the signed-in email, read-only.
- **DEC-08** Plain `fetch` + timeout, never `authFetch` (CON-06).
- **DEC-09** Hide the entry when `!API_URL` (CON-07).

### Copy table (normative — CON-09)

| Key | String |
|---|---|
| Entry link | `Forgot PIN?` |
| Email label | `Email` |
| Email placeholder | `Enter your email address` |
| Proceed button | `Proceed` |
| Neutral prompt title | `Check Your Email` |
| Neutral prompt body | `If email account is registered, you will receive an email.` |
| Neutral prompt button | `Okay` |
| Loading copy | `Sending verification code…` |
| OTP title | `Enter Verification Code` |
| OTP helper | `Enter the 6-digit code sent to {email}.` |
| Resend link | `Resend code` |
| Resend cooldown | `Resend in {n}s` |
| Resend exhausted | `No resends left` |
| Verify button | `Verify` |
| Invalid/expired code | `Invalid or expired code. Please try again.` |
| Lockout | `Too many attempts. Please try again later.` |
| New-PIN title | `Set New PIN` |
| New-PIN labels | `New PIN` / `Confirm New PIN` |
| New-PIN error (format) | `New PIN must be 4 digits.` |
| New-PIN error (match) | `New PINs do not match.` |
| Reset button | `Reset PIN` |
| Connection error | `Please check your connection.` |
| Success title | `PIN Reset` |
| Success body (Login) | `Your PIN has been reset. Please log in with your new PIN.` |
| Success body (Settings) | `Your PIN has been reset.` |

### Acceptance criteria

Platform matrix (AGENTS §1.10): every Objective guard holds on `android` / `ios` / `web` (jest `Platform.OS` mock); every Subjective check is user-run on Expo Go (Android/iOS) + `expo export --platform web` (the agent never runs CLIs per AGENTS §1.3).

**Objective — deterministic, machine-checkable (jest source-scan + pure-helper guards):**

- **ACC-01** `utils/forgotPin.ts` exports `isValidEmail`, `validateNewPin`, the policy constants (`OTP_LENGTH=6`, `OTP_TTL_MS=600000`, `OTP_MAX_ATTEMPTS=5`, `OTP_RESEND_COOLDOWN_MS=60000`, `OTP_MAX_RESENDS=3`), the endpoint constants (`auth/forgot-pin/request|verify|reset`), and the §3 copy constants; `validateNewPin` returns the format error for non-4-digit and the match error for mismatched confirm, `null` when valid. Holds on android/ios/web.
- **ACC-02** Non-revealing (CON-04): no `Couldn't find email` / `reset PIN aborted` string anywhere in `app/`/`utils/`/`components/`; the neutral prompt body is exactly the §3 string; the flow has no not-found branch.
- **ACC-03** Contract (DEC-03): the flow calls `auth/forgot-pin/request` with `{ email }`, then `auth/forgot-pin/verify` with `{ email, code }`, then `auth/forgot-pin/reset` with `{ resetToken, newPasscode }`; all three via plain `fetch` (no `authFetch` in the flow) with an abort timeout (CON-06).
- **ACC-04** Entry points: `app/login.tsx` renders the `Forgot PIN?` link; `app/(tabs)/settings.tsx` renders the `Forgot PIN?` button in the Passcode section; `app/register.tsx` is byte-identical (CON-03).
- **ACC-05** Visibility (CON-07): the entry is suppressed when `!API_URL`; OTP policy constants gate Resend (cooldown countdown; disabled at 3 sends) and attempts (lockout at 5) on all platforms.
- **ACC-06** Local-lock reset (CON-08): the native success path calls `updateUserPasscode` and overwrites the `user_{id}_passcode` secure key with the new PIN hash; the web path calls neither. Guarded by `Platform.OS` mock.
- **ACC-07** Post-reset (CON-11, DEC-05): from Login the flow returns to Login with the email prefilled and PIN empty, no login call; from Settings it dismisses without navigation and without a logout.

**Subjective — human-judged UX as observable reviewer checks (explicit pass/fail, user-run):**

- **ACC-S01** Reviewer on Android + iOS (Expo Go): open Forgot PIN from Login, enter a registered email → Proceed → prompt appears → Okay → loading → 6 boxes appear → enter the emailed code → set a new PIN → success → Login prefilled; then log in with the new PIN. FAIL = any step crashes (red box) or the code/prompt differs from §3.
- **ACC-S02** Reviewer on Web (`expo export --platform web`): same cascade; on success the Login screen shows the email prefilled. FAIL = any web-only deviation or console error.
- **ACC-S03** Reviewer confirms the entry is hidden when `EXPO_PUBLIC_API_URL` is unset, and that an unknown email still shows the OTP screen with no "not found" message (non-revealing). FAIL = a not-found message appears or the OTP screen is skipped.
- **ACC-S04** Reviewer in Settings opens Forgot PIN: email is prefilled and read-only; after success the reviewer stays on Settings and can still Change Passcode with the new PIN (local lock reset to the new PIN). FAIL = the old PIN still unlocks the app lock.

TDD coverage (§1.10): `utils/forgotPin.test.ts` covers ACC-01..ACC-07 parameterized by `Platform.OS` (android/ios/web); ACC-S01..S04 are user-run manual checks exactly as written (email delivery, native keyboard, and lock behavior are not jest-renderable).

## Deliverables

- **D-01** `components/ForgotPinFlow.tsx` (new): self-contained modal flow (email → neutral prompt → loading → 6 OTP boxes → new PIN → success) per §3 copy, CON-04/CON-05/CON-06, with an `onDismiss` and a `from: "login" | "settings"` prop controlling CON-11 behavior; no route, no `_layout.tsx` change (DEC-01).
- **D-02** `app/login.tsx`: add the `Forgot PIN?` link and render `<ForgotPinFlow from="login" …>` (email prefilled on success per CON-11). No other login logic changes.
- **D-03** `app/(tabs)/settings.tsx`: add the `Forgot PIN?` button in the Passcode section and render `<ForgotPinFlow from="settings" prefilledEmail={authName ?? profile?.name} …>`; on success stay logged in (CON-11). Change-Passcode and all other Settings logic byte-identical.
- **D-04** `utils/forgotPin.ts` (new, pure — no `react-native` import): validation helpers, policy constants, endpoint constants, copy constants (§3), and the request/verify/reset payload builders used by the flow.
- **D-05** Native local-lock reset (CON-08): a small helper (in `utils/forgotPin.ts` or `utils/db.ts`) that finds the local `master_users` row by email, calls `updateUserPasscode`, overwrites the secure `user_{id}_passcode` hash, and returns the userId; `Platform.OS === "web"` → no-op. Reuses `utils/db.ts` `updateUserPasscode` (SPEC-35 D-02) and `utils/storage.ts` `getPrefixedKey`.
- **D-06** `utils/forgotPin.test.ts` (new): ACC-01..ACC-07 × android/ios/web, including repo-wide source scans for ACC-02 (no not-found string) and ACC-04 (`register.tsx` untouched; both entries present).
- **D-07** Docs after implementation (AGENTS §1.8, post-FINAL only): `docs/savepoint.md` entry + `AGENTS.md §3` status line. NOT part of the spec-writing step.

### Backend deliverables (user implements in wallet-api)

- **D-B-01** `POST /auth/forgot-pin/request` body `{ email }` → always `200` with the generic body for every email; `429` when rate-limited. MUST NOT reveal existence or vary meaningfully in timing.
- **D-B-02** OTP: 6 digits, 10-minute TTL, stored hashed; delivered to the registered account email via Gmail SMTP; max 3 sends per reset window with a 60 s resend cooldown.
- **D-B-03** `POST /auth/forgot-pin/verify` body `{ email, code }` → `200 { resetToken }` (short-lived, single-use) on success; `400` invalid/expired; `429` after 5 wrong attempts.
- **D-B-04** `POST /auth/forgot-pin/reset` body `{ resetToken, newPasscode }` → `200`; bcrypt-updates `users.passcode` for a 4-digit numeric `newPasscode`; `400`/`401` for an invalid/expired/used token.
- **D-B-05** No enumeration surface anywhere in the three endpoints.

## Glossary

| Term | Meaning |
|---|---|
| Server auth PIN | `users.passcode` (bcrypt) checked by `auth/login` / `auth/change-passcode` |
| Local app-lock PIN | 4-digit UI lock, SHA256 to `user_{id}_passcode` (SPEC-35) + `master_users` mirror |
| resetToken | Short-lived, single-use token returned by `auth/forgot-pin/verify` and consumed by `auth/forgot-pin/reset` |
| Non-revealing | Server/UI never signal whether an email is registered (CON-04) |

## Risks / accepted tradeoffs

- **Local-only accounts** (CON-07): a Local account with a configured backend runs the generic flow and never receives a code, ending in lockout. Accepted with DEC-02/CON-04 (chosen over revealing existence); the entry is hidden entirely when `!API_URL`.
- **Mobile 400 path**: server-side OTP/validation errors are surfaced only via the generic client copies (CON-04/CON-09); the exact wallet-api messages are not user-facing.
- **Token rotation**: `auth/forgot-pin/reset` may rotate the server session; CON-06 keeps the Settings path from a spurious 401, but the user may need to re-login on other devices (mirrors SPEC-35 behavior).

## References

- `AGENTS.md` (§1.1 spec-first, §1.3 no-CLI, §1.8 docs, §1.9 spec format, §1.10 TDD/platform matrix, §1.11 bare-minimum, §1.12 no new deps, §1.14 one home)
- `specs/04-connection-status-vs-offline-mode.md` (template); `specs/35-pin-change-persistence-and-promotion-safety.md` (local hash persist + `updateUserPasscode`); `specs/51-pin-gate-verification-parity.md`; `specs/59-clear-gate-token-consume-and-login-identity.md` (`authName`)
- `app/login.tsx:131-150` (`tryCloudLogin` fetch+abort pattern); `app/(tabs)/settings.tsx:165-263` (Change Passcode dialog + copies); `context/PasscodeContext.tsx:50-81` (setPasscode persist); `utils/db.ts` `updateUserPasscode`; `utils/storage.ts` `getPrefixedKey`
