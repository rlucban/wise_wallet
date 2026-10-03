# Spec 26: Email-Only Registration (Remove Username Option from Register Screen)

| Field | Value |
|---|---|
| ID | SPEC-26 |
| Title | Email-Only Registration (Remove Username Option from Register Screen) |
| Status | **FINAL** (2026-09-29 per user call) |
| Owner | User (final authority) |
| Version | 1.0 — v1.0 clarifications: ACC-06 whitespace case, ACC-07..09 mode-independence wording (no normative scope change) |
| Scope | `app/register.tsx` identifier field only (label, placeholder, left icon, keyboard type, validation, error copy) for **both** Online and Offline modes; new `utils/registerValidation.ts`; new `utils/registerValidation.test.ts` |
| Non-goals | `app/login.tsx`; `app/(tabs)/settings.tsx` (incl. the `isUsernameOnly` heuristic); `README.md`; `utils/db.ts` storage shape; `wallet-api` `/auth/register` contract; migration of legacy username-era local accounts; new native dependencies; mode selector / info-box copy |
| Normative source | This file. File+symbol cites are normative; `:line` numbers are hints only. |

> History: created 2026-09-29 per user request; marked FINAL 2026-09-29 per user
> call. Supersedes the "username fallback to
> local account on mobile" behavior recorded in `docs/savepoint.md` (2026-09-28) for
> the **Register** screen only; `login.tsx` keeps its existing fallback behavior.
> Spec number 13 was already taken by `specs/13-theme-contrast-add-due.md`.

## Terminology (RFC 2119)

The keywords **MUST**, **MUST NOT**, **SHOULD**, and **MAY** in this spec are to be
interpreted as described in RFC 2119. Informative prose (examples, "today",
"currently") is non-normative unless restated as a requirement.

## 1. Context

### 1.1 Problem

`app/login.tsx` is already email-only: error copy "Email is required"
(`login.tsx:142`), field label "Email" (`:289`), placeholder "Enter your email
address" (`:301`), and the info box states "Cloud and Local accounts use email +
PIN" (`:363`).

`app/register.tsx` is the last surface that still offers **username** vocabulary,
and it is the only place where identifier rules differ by mode:

| Surface (register.tsx) | Online mode | Offline mode |
|---|---|---|
| Field label (`:268-270`) | `Email` | `Username` |
| Placeholder (`:282`) | `Enter your email` | `Choose a username` |
| Keyboard type (`:281`) | `email-address` | `default` |
| Left icon (`:283`) | `email-outline` | `account-outline` |
| Empty-input error (`:130`) | `Email is required` | `Username is required` |
| Format validation (`:135-172`) | strict on web only; mobile accepts any string and falls back to a local account | none |

Result: a user who registers Offline with a username cannot be told apart from a
Cloud user by the identifier alone, `app/(tabs)/settings.tsx:180-183` must infer
"local account" from a non-email `profile.name`, and the mobile-only block at
`register.tsx:141-172` exists solely to accept non-email input.

### 1.2 Non-normative today

`users.name` (`utils/db.ts:addUser`) and `profile.name` (`saveUserProfile`) already
store the email string for Cloud accounts and the username string for Local ones —
a single physical column serving both vocabularies. This spec does not change that.

## 2. Constraints (normative)

- **CON-01 — Single identifier vocabulary.** The Register screen MUST present
  exactly one identifier field, labeled `Email`, in **both** Online and Offline
  modes. The string `Username` (any case) MUST NOT appear anywhere in
  `app/register.tsx` — labels, placeholders, helper/error copy, dialogs, or
  comments.
- **CON-02 — Strict email format in both modes.** An identifier that fails the
  email pattern MUST be rejected in **Online and Offline modes on all three
  platforms** (Android, iOS, Web). The pattern is the one already used by the web
  branch: `/^[^\s@]+@[^\s@]+\.[^\s@]+$/`.
- **CON-03 — Zero network calls on invalid input.** When identifier validation
  fails, `handleRegister` MUST return before any `fetch`. No request to
  `${API_URL}/auth/register` (or any other endpoint) may be issued. On all
  platforms.
- **CON-04 — Non-email fallback removed.** The mobile-only block in
  `handleRegister` that attempts a cloud registration for non-email input and then
  falls through to `createLocalAccount` (today `register.tsx:141-172`) MUST be
  deleted. The single remaining route from a cloud network failure to a local
  account is the existing **"Cloud Unreachable"** dialog inside
  `createCloudAccount`'s `catch` (`:103-120`), which passes the (already valid)
  email to `createLocalAccount`.
- **CON-05 — Field behavior parity.** In both modes the identifier `TextInput`
  MUST use `keyboardType="email-address"` and `autoCapitalize="none"`; the left
  icon MUST be `email-outline`; the placeholder MUST be the identical string
  `Enter your email address` (matching `login.tsx:301`); the error styling
  (`error={!!emailError}` + `HelperText type="error"`) MUST be unchanged.
- **CON-06 — Validation order and copy.** Validation order MUST remain identifier
  first, PIN second. Empty or whitespace-only identifier MUST produce exactly
  `Email is required` in both modes. A non-empty but malformed identifier MUST
  produce exactly `Please enter a valid email address` in both modes. The copy
  `Username is required` MUST NOT exist (see CON-01).
- **CON-07 — PIN rules unchanged.** PIN MUST remain digits only, max 4, exactly
  4 required; the invalid-PIN copy MUST remain `Passcode must be exactly 4
  digits`.
- **CON-08 — Storage/API compatibility.** The identifier MUST continue to be
  written to `users.name` via `addUser(id, <identifier>, pin)` and to
  `profile.name` via `saveUserProfile({ name: <identifier>, … }, id)`. Storage
  keys, the `users` shape, the `profile` shape, and the `/auth/register` request
  body `{ name, passcode, initialBalance: 0 }` MUST NOT change. The rename in D-03
  applies to `register.tsx`-local variables only, never to object keys.
- **CON-09 — Offline-mode side effects unchanged.** `createLocalAccount` MUST
  keep: web refusal ("Not Available on Web"), case-insensitive local duplicate
  detection against `users[].name`, copy "Email Taken" / "This email address is
  already registered on this device. Please use a different email or login
  instead.", `generateUUID()` id, `setSetting('autoBackup', 'false')`, and
  `login(offlineId, "offline_token")`.
- **CON-10 — Pure, testable logic.** Identifier/PIN validation MUST live in a new
  `utils/registerValidation.ts` with **no** React, React Native, AsyncStorage, or
  network imports, and no `Platform` branching (both modes behave identically by
  design). `app/register.tsx` MUST consume it; it MUST NOT re-implement the regex.
- **CON-11 — Out-of-scope files untouched.** `app/login.tsx`,
  `app/(tabs)/settings.tsx` (including the `isUsernameOnly` heuristic at
  `:180-183` and the Auto-Backup switch at `:1109`), `README.md`, `utils/db.ts`,
  and `wallet-api` MUST NOT be modified. Legacy local accounts created with a
  username MUST keep logging in through the unchanged `login.tsx`.
- **CON-12 — No collateral copy/UI edits.** The Online/Offline mode selector,
  its clearing of the identifier field on switch, the info-box bullets, gradient,
  card styling, button styling, dialogs, and the "Already have an account? Login"
  row MUST remain as-is.
- **CON-13 — Platform invariants.** No new dependency; nothing statically imports
  a native-only module; `expo export --platform web` MUST still succeed; nothing
  in this change may red-box in Expo Go (AGENTS.md §1.5, §1.6, §1.7).

## 3. Goal

### 3.1 Interaction matrix

Rows: platform. Columns: Online mode, Offline mode. Every cell MUST read as
"Email" and enforce the strict format; only the **action** differs.

| Platform | Online mode | Offline mode |
|---|---|---|
| Android | Label `Email`; placeholder `Enter your email address`; `email-address` keyboard; `email-outline` icon; strict format; on success `createCloudAccount` (POST `/auth/register`) | Label `Email`; placeholder `Enter your email address`; `email-address` keyboard; `email-outline` icon; strict format; on success `createLocalAccount` |
| iOS | Same as Android | Same as Android |
| Web | Same as Android, plus the Offline selector stays hidden (`effectiveMode` is always `online`) | Unreachable on web (`createLocalAccount` refuses and shows "Not Available on Web") |

### 3.2 Decisions (DEC-*)

- **DEC-01** — Email is the only registration identifier; the username option is
  removed rather than hidden on one platform only.
- **DEC-02** — The format check is strict in **both** modes and on **all**
  platforms (not web-only as today), so a local identifier is unambiguous with a
  cloud one.
- **DEC-03** — The mobile username→cloud-then-local fallback block is deleted
  rather than re-pointed; the cloud-network-error dialog already offers the
  offline path.
- **DEC-04** — Change surface is `app/register.tsx` only. `settings.tsx`,
  `login.tsx`, and `README.md` are explicitly left for a later spec.
- **DEC-05** — Validation is extracted into `utils/registerValidation.ts` so the
  rules are jest-testable (AGENTS.md §1.10) without rendering the screen.
- **DEC-06** — `register.tsx`-local identifiers are renamed `name` → `email` and
  `nameError` → `emailError` for clarity. Object keys (`{ name: … }`) are NOT
  renamed (CON-08).
- **DEC-07** — No migration. Existing local accounts keep their stored username
  and keep logging in via `login.tsx`; the `settings.tsx` heuristic keeps
  detecting them (CON-11).

### 3.3 Acceptance criteria — Objective (machine-checkable)

Each ACC MUST hold on **all three platforms** unless stated otherwise; the jest
suite is parameterized by `Platform.OS` (`android` | `ios` | `web`).

- **ACC-01** — `app/register.tsx` contains zero occurrences of `Username` or
  `username` (case-insensitive), and no `account-outline` icon reference.
- **ACC-02** — The identifier field label renders exactly `Email` when
  `accountMode === "online"` (Android, iOS) and exactly `Email` when
  `accountMode === "offline"` (Android, iOS). Web renders `Email` via
  `effectiveMode`.
- **ACC-03** — The placeholder is exactly `Enter your email address` in both modes
  on all platforms.
- **ACC-04** — Error copy is exactly: `Email is required` for empty/whitespace
  input, and `Please enter a valid email address` for malformed input — identical
  for `online` and `offline` on android/ios/web.
- **ACC-05** — `keyboardType` is `email-address` and `autoCapitalize` is `none` in
  both modes on all platforms.
- **ACC-06** — `isValidEmail` returns `true` for `a@b.co`,
  `first.last+tag@example.com`, `x@y-z.io`, and `" a@b.co "` (input is trimmed
  before testing); and `false` for `""`, `" "`, `john`, `john@`, `@b.co`,
  `a b@c.co`, `a@b`, `a@@b.co`.
- **ACC-07** — `validateRegisterInput` MUST accept exactly two parameters
  `(email, passcode)` — no mode parameter — so its result is provably identical
  for Online and Offline modes; `app/register.tsx` MUST call it for both modes.
  `validateRegisterInput("  ", "1234")` returns
  `{ ok: false, emailError: "Email is required" }` on android/ios/web.
- **ACC-08** — `validateRegisterInput("john", "1234")` returns
  `{ ok: false, emailError: "Please enter a valid email address" }` on
  android/ios/web (identical for both modes; previously Offline accepted `john`).
- **ACC-09** — `validateRegisterInput("a@b.co", "1234")` returns `{ ok: true }`
  with neither `emailError` nor `pinError` set, on android/ios/web.
- **ACC-10** — `validateRegisterInput("a@b.co", pin)` returns
  `{ ok: false, pinError: "Passcode must be exactly 4 digits" }` for `"1"`, `"123"`,
  `"12345"`, `"12a4"`, `""`; and when the email is *also* invalid, `emailError` is
  returned and `pinError` is absent (email precedence).
- **ACC-11** — No code path in `handleRegister` issues `fetch`; the only `fetch`
  call sites in `app/register.tsx` are inside `createCloudAccount`. Zero requests
  are made when validation fails (CON-03).
- **ACC-12** — After a successful Offline registration the sequence is
  `addUser(offlineId, email, pin)` → `saveUserProfile({ name: email, isFirstRun:
  true, initialBalance: 0 }, offlineId)` → `initDb(offlineId)` →
  `setSetting('autoBackup', 'false')` → `login(offlineId, "offline_token")`.
- **ACC-13** — After a successful Online registration the request body is exactly
  `{ name: <trimmed email>, passcode: <trimmed pin>, initialBalance: 0 }`, then
  `setSetting('autoBackup', 'true')` and `login(user.id, token)`.
- **ACC-14** — `npx jest utils/registerValidation.test.ts` passes with every ACC-06
  … ACC-10 case executed once per platform (`android`, `ios`, `web`) — 15 platform
  executions minimum. `npx tsc --noEmit` and `npm run lint` are clean.
- **ACC-15** — On web, the Offline selector remains hidden and `createLocalAccount`
  still refuses with the "Not Available on Web" dialog (behavior unchanged).

### 3.4 Acceptance criteria — Subjective (observable reviewer checks)

Written as pass/fail observation steps; the user runs them (AGENTS.md §1.3).

- **ACC-16** — **Reviewer, Expo Go, Android and iOS**: switching Account Type
  Online → Offline → Online keeps a single field reading `Email`, with the
  email keyboard, the envelope icon, and no residual "Username" text. PASS =
  field label, placeholder, and icon all email-flavored in both modes.
- **ACC-17** — **Reviewer, Android and iOS**: typing `john` and pressing Register
  in Offline mode shows `Please enter a valid email address` under the field and
  **no** dialog, **no** account is created, and **no** network dialog appears.
  PASS = inline error only, account list unchanged.
- **ACC-18** — **Reviewer, Android and iOS**: entering a valid email + 4-digit PIN
  in Offline mode creates the account and lands on onboarding/Dashboard with no
  red-box. PASS = navigation completes, no error dialog.
- **ACC-19** — **Reviewer, Web (`expo export --platform web`)**: the register page
  builds and renders one `Email` field; submitting a valid email + PIN behaves as
  before. PASS = build succeeds, no console error beyond pre-existing warnings.
- **ACC-20** — **Reviewer, regression check**: an existing local account created
  earlier with a username still logs in at `/login` (unchanged screen), and
  Settings still shows its local-account state (unchanged screen). PASS = login
  succeeds, Settings unchanged.
- **ACC-21** — **Reviewer, layout**: card height, gradient, mode selector, info
  box, and buttons look unchanged apart from the identifier wording. PASS = no
  new wrapping, clipping, or misalignment.

## 4. Deliverables

- **D-01** — New `utils/registerValidation.ts` exporting:
  - `EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/`
  - `isValidEmail(value: string): boolean` (trims before testing)
  - `type RegisterValidationResult = { ok: boolean; emailError?: string; pinError?: string }`
  - `validateRegisterInput(email: string, passcode: string): RegisterValidationResult`
    — email precedence, then PIN; returns `{ ok: true }` when both pass.
  - Constants for the three copy strings (`EMAIL_REQUIRED_ERROR`,
    `INVALID_EMAIL_ERROR`, `INVALID_PIN_ERROR`) so register and tests share one
    source. No React/RN/storage/network imports; no `Platform` usage.
- **D-02** — New `utils/registerValidation.test.ts` implementing ACC-06 … ACC-10
  parameterized over `android` | `ios` | `web`, following the `Platform` mock
  pattern used in `utils/speechVoice.test.ts`.
- **D-03** — `app/register.tsx`:
  1. Rename local state `name` → `email`, `nameError` → `emailError` (DEC-06);
     object keys untouched (CON-08).
  2. Replace the inline regex check with `validateRegisterInput` /
     `isValidEmail` from D-01; set both errors from the result.
  3. Delete the mobile non-email fallback block (`:141-172`) per CON-04.
  4. Make label, placeholder, icon, and `keyboardType` mode-independent
     (CON-05, ACC-02/03/05).
  5. Keep `createLocalAccount` and `createCloudAccount` bodies and their dialogs
     verbatim apart from the identifier rename (CON-08, CON-09).
- **D-04** — Documentation per AGENTS.md §1.8 (non-code): append a
  `docs/savepoint.md` change-journal entry and a newest-bottom entry in
  `AGENTS.md §3` recording SPEC-26 FINAL + implemented, deliverables, and the
  commands run.

### 4.1 Commands the user runs (AGENTS.md §1.3 — the agent runs none of these)

```bash
npx jest utils/registerValidation.test.ts
npx tsc --noEmit
npm run lint
# manual (Expo Go, Android + iOS): ACC-16 … ACC-18, ACC-20, ACC-21
npx expo export --platform web   # ACC-19
```

## 5. Glossary

| Term | Meaning |
|---|---|
| **Identifier** | The single text value the user types to register or log in. Always an email address after this spec. |
| **Online mode / Cloud account** | Registration mode that POSTs to `${API_URL}/auth/register`; `autoBackup = true`; JWT token. |
| **Offline mode / Local account** | Registration mode stored only in AsyncStorage; `autoBackup = false`; `offline_token` / `local_token`. |
| **`effectiveMode`** | `register.tsx` local: `isWeb ? "online" : accountMode`. |
| **Username-era local account** | A pre-existing local account whose stored `profile.name` is not an email; still detected by `settings.tsx:181` (`isUsernameOnly`). Not migrated. |

## 6. References

- `app/register.tsx` — `RegisterScreen`, `createLocalAccount`, `createCloudAccount`, `handleRegister`
- `app/login.tsx:142,289,301,363` — already email-only wording this spec aligns to
- `app/(tabs)/settings.tsx:180-183,1109` — `isUsernameOnly` heuristic (out of scope, unchanged)
- `utils/authMode.ts` — `LOCAL_TOKENS = { "offline_token", "local_token" }`
- `utils/speechVoice.test.ts` — `Platform` mock pattern reused by D-02
- `specs/04-connection-status-vs-offline-mode.md` — CON-07 (cross-platform), account-mode model
- `docs/savepoint.md` (2026-09-28) — superseded mobile username fallback (Register screen only)
- `AGENTS.md §1.1` (spec-first), `§1.3` (user runs CLIs), `§1.4` (no breaking changes), `§1.5`–`§1.7` (platform invariants), `§1.9` (spec format), `§1.10` (spec-first + TDD, cross-platform matrix)
