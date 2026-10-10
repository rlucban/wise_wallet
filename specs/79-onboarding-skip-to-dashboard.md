# SPEC-79 — Onboarding Skip to Dashboard

| Field | Value |
|---|---|
| ID | SPEC-79 |
| Title | Onboarding Skip to Dashboard |
| Status | **FINAL** (2026-10-11 per user call) |
| Owner | User (final authority) |
| Version | v1.0 |
| Scope | `app/onboarding.tsx` (Skip control + confirm dialog + skip write path) + tests under `utils/` + docs |
| Non-goals | Intro screen behavior (SPEC-79 keeps Intro's Skip → `/onboarding`); account mode / sync semantics (SPEC-04/36); `UserProfileContext` shape; `ConfirmDialog` component change; opening-balance payload (SPEC-37/43); storage-key, API-contract, or route changes |
| Normative source | This file. File+symbol cites are normative; `:line` numbers are hints only. |

> History: created 2026-10-11 (v0.1 DRAFT) after clarification round — skip
> discards both fields, permanent (`isFirstRun = false`), confirm dialog first,
> onboarding-only scope, all platforms, existing "Wise User" blank-name
> fallback kept, same persistence/error path as Get Started.

## Terminology (RFC 2119)

The keywords **MUST**, **MUST NOT**, **SHOULD**, and **MAY** in this spec are
to be interpreted as described in RFC 2119. Informative prose (examples,
"today", "currently") is non-normative unless restated as a requirement.

- **Setup requirements:** the Name and Initial Balance inputs on the Onboarding
  screen (`app/onboarding.tsx`).
- **Skip:** the new user action that completes the account setup without a
  name or balance.
- **Complete:** the profile write that sets `isFirstRun = false`, which the nav
  guard (`app/_layout.tsx:195-203`) uses to release the user from Intro /
  Onboarding to the dashboard.

## 1. Context

### 1.1 Problem

Onboarding requires a non-empty Name before it will proceed: `validate()`
adds `errors.name` when `name.trim()` is empty (`app/onboarding.tsx:26-28`),
and `handleGetStarted` returns early when validation fails (`:39`).
The only path that clears `isFirstRun` is `completeSetup(name, initialBalance)`
(`:48`), which calls `updateProfile({ name, initialBalance, isFirstRun: false })`
(`context/UserProfileContext.tsx:150-161`). The nav guard keeps any account
whose `profile.isFirstRun` is still `true` on `/intro` or `/onboarding`
(`app/_layout.tsx:195-203`). Therefore a user who does not want to enter a
name has no way to reach the home dashboard.

### 1.2 Resolved decisions (user call, 2026-10-11)

- **DEC-01 — Discard both fields.** Skip completes with a blank name and a
  zero balance (`completeSetup("", 0)`); nothing the user typed is saved.
- **DEC-02 — Permanent.** Skip sets `isFirstRun = false`; Intro / Onboarding
  MUST NOT reappear for that account (name can be added later in Settings).
- **DEC-03 — Confirm first.** Tapping Skip MUST show a confirmation dialog
  before completing setup.
- **DEC-04 — Onboarding only.** Intro's existing Skip stays pointing at
  `/onboarding` (`app/intro.tsx:63,116`); only the Onboarding screen gains a
  Skip.
- **DEC-05 — All platforms.** Android + iOS + Web (web stays always-Online per
  SPEC-36; no platform-only branch for this feature).
- **DEC-06 — Blank-name display unchanged.** Where a name is shown, the
  existing fallback applies (`profile?.name || "Wise User"`,
  `app/(tabs)/settings.tsx:1280`); no copy change.
- **DEC-07 — Same persistence/error path as Get Started.** Skip reuses
  `completeSetup`; on a Cloud/Web account whose API write fails, the existing
  re-triable `setupError` is surfaced and navigation MUST NOT occur
  (Local/native writes are local and always succeed).
- **DEC-08 — Placement.** A `text`-mode "Skip" button directly under the
  "Get Started" button inside the card.
- **DEC-09 — Tests.** Platform-parameterized `jest` source-text guards plus a
  user-run Expo Go + web-export manual matrix (AGENTS §1.10).

### 1.3 Existing surfaces (non-normative)

- `components/ConfirmDialog.tsx` already provides `title`, `message`,
  `confirmLabel`, `cancelLabel`, `icon`, `loading`, `confirmColor`,
  `onConfirm`, `onCancel` — sufficient for DEC-03 with no component change.
- Opening-balance creation is gated on `balance !== 0` in
  `buildOpeningBalancePayload` (`utils/onboardingPayload.ts:13`) and executed
  once-only in `handleGetStarted` (SPEC-43). Skip has no opening balance.

## 2. Constraints (normative)

- **CON-01 — Bare-minimum diff.** Only `app/onboarding.tsx` MAY change in app
  code, plus the test and journal files named in D-*. No other file, and no
  refactor, copy, style, or layout change beyond the Skip control and its
  dialog.
- **CON-02 — No new dependencies.** No npm packages, native modules, fonts, or
  third-party code. Reuse existing imports and `components/ConfirmDialog.tsx`
  unchanged (`useTheme` from `react-native-paper` is the only added import).
- **CON-03 — Discard both fields (DEC-01).** The skip path MUST call
  `completeSetup` with a literal empty name and `0` balance. It MUST NOT pass
  the Name or Initial Balance fields, and it MUST NOT run `validate()`. It
  MUST NOT create an Opening Balance transaction (no `addTransaction`, no
  `buildOpeningBalancePayload` call on this path).
- **CON-04 — Permanent (DEC-02).** Skip completion MUST set `isFirstRun =
  false` (via `completeSetup`). On success the screen MUST navigate to the
  dashboard (`router.replace("/")`), and the nav guard then keeps the user out
  of Intro / Onboarding.
- **CON-05 — Confirmation (DEC-03).** Tapping Skip MUST open the confirmation
  dialog and MUST NOT complete setup directly. Cancelling (Cancel button,
  backdrop, or hardware back) MUST dismiss the dialog and leave all state
  (fields, `isFirstRun`, navigation) unchanged.
- **CON-06 — Failure parity (DEC-07).** The skip write MUST share the existing
  `busyRef` guard, `loading` state, and `setupError` surface with
  `handleGetStarted`. On failure the account MUST NOT be marked complete and
  the screen MUST NOT navigate; the busy guard MUST be released so the user
  can retry (SPEC-37 UX preserved).
- **CON-07 — Copy (DEC-03/DEC-08).** The confirmation dialog text is:
  title `"Skip setup?"`; message warning that setup will be marked complete and
  the name can be added later in Settings; confirm label `"Skip"`; cancel
  label `"Cancel"`. The trigger button label is `"Skip"`.
- **CON-08 — Blank-name display unchanged (DEC-06).** No fallback copy is
  added or changed on any screen.
- **CON-09 — Cross-platform invariant (AGENTS §1.5).** Android + iOS + Web
  MUST all work; no statically imported native-only module at file top level;
  no Node-only APIs in app code. No platform-only branch is introduced by this
  spec.
- **CON-10 — Vercel-deployable / Expo Go safe (AGENTS §1.6/§1.7).** Web export
  stays clean; nothing may crash Expo Go on import.
- **CON-11 — TDD with cross-platform coverage (AGENTS §1.10).** `jest`
  parameterized by `Platform.OS` (`android`/`ios`/`web`) for the checkable
  branches (source-text guards, per SPEC-43 precedent for screen behavior
  `jest` cannot render) plus the user-run manual matrix in D-03.
- **CON-12 — No contract changes (AGENTS §1.4).** No storage-key, `wallet-api`,
  AsyncStorage-shape, navigation-route, or dependency change. The profile
  write reuses the existing `completeSetup` contract; no migration required.

## 3. Goal

Give the Onboarding screen a Skip action that completes account setup with a
blank name and zero balance after an explicit confirmation, releasing the user
to the home dashboard (DEC-01..DEC-09).

### Interaction matrix

| Step | User action | State before | State after | Navigation |
|---|---|---|---|---|
| 1 | Tap Skip | `isFirstRun = true` | dialog visible; nothing else changed | none |
| 2 | Cancel / dismiss | dialog visible | dialog closed; fields + `isFirstRun` unchanged | none |
| 3 | Confirm Skip (success) | dialog visible, `isFirstRun = true` | `name = ""`, `initialBalance = 0`, `isFirstRun = false`; no transaction | `router.replace("/")` |
| 4 | Confirm Skip (API failure, Cloud/Web) | dialog visible | `isFirstRun = true` (unchanged); `setupError` shown; busy guard released | none |

### Acceptance criteria

Objective (machine-checkable, `jest` × android/ios/web):

| ID | Check |
|---|---|
| ACC-01 | `app/onboarding.tsx` renders a Skip control (a `Button` whose label is `"Skip"`, `mode="text"`) below the "Get Started" button (source order). |
| ACC-02 | Tapping Skip sets the dialog-visible state and does NOT itself call `completeSetup` (the confirm handler is separate). |
| ACC-03 | The confirm handler calls `completeSetup("", 0)` with literal empty name and zero balance (source-text) and does NOT call `validate()`. |
| ACC-04 | The skip path contains no `addTransaction` and no `buildOpeningBalancePayload` call (existing `handleGetStarted` opening logic unchanged). |
| ACC-05 | On success the skip handler calls `router.replace("/")`. |
| ACC-06 | The skip handler participates in the shared `busyRef` guard and `setupError`, and does not navigate on failure (parity guard, CON-06). |
| ACC-07 | The dialog uses title `"Skip setup?"`, confirm label `"Skip"`, cancel label `"Cancel"`, and `onCancel` leaves state unchanged. |
| ACC-08 | `npx jest` 0 failed (new + existing suites); `npm run lint` 0 errors/0 warnings; `npx tsc --noEmit` 0 errors. |

Subjective (reviewer-observed):

- **ACC-S01:** Expo Go fresh Local account → tap Skip → confirm → lands on the
  dashboard with a blank name; Settings shows "Wise User".
- **ACC-S02:** rapid double-tap of the Skip trigger while the dialog opens
  produces a single dialog (no double completion).
- **ACC-S03:** Local account offline → Skip still completes and routes to the
  dashboard; Cloud/Web offline → Skip shows the re-triable error and stays on
  Onboarding.
- **ACC-S04:** Intro flow unchanged — last-step "Get Started" still lands on
  Onboarding, which now shows Skip (DEC-04).
- **ACC-S05:** `expo export --platform web` — Skip is present, confirms, and
  lands on the dashboard with no red-box / console error.

## 4. Deliverables

- **D-01 — Skip control + dialog + skip handler** in `app/onboarding.tsx`
  (CON-01..CON-08): a `text` "Skip" button under "Get Started"; a
  `ConfirmDialog` (existing component, unchanged) with the CON-07 copy; a
  `handleSkip` that, on confirm, runs the shared busy guard / `loading` /
  `setupError` and calls `completeSetup("", 0)` then `router.replace("/")`,
  creating no transaction.
- **D-02 — `utils/onboardingSkip.test.ts`** source-text guards ACC-01..ACC-07,
  parameterized by `Platform.OS` (`android`/`ios`/`web`).
- **D-03 — User-run matrix ACC-S01..ACC-S05** (Expo Go Android/iOS + web
  export), per AGENTS §1.3.
- **D-04 — `docs/savepoint.md` journal + `AGENTS.md` §3 entry** (AGENTS §1.8).

## Glossary

| Term | Meaning |
|---|---|
| Skip | New Onboarding action that completes setup with blank name + ₱0. |
| Complete | Profile write that sets `isFirstRun = false`, releasing the nav guard to the dashboard. |
| Setup requirements | The Name and Initial Balance inputs on Onboarding. |
| Busy guard | The synchronous `busyRef` flag shared with `handleGetStarted` (SPEC-43). |

## References

- `AGENTS.md §1` — working agreements (spec-first, no CLI, invariants, TDD, docs).
- `app/onboarding.tsx` — Name/Balance inputs, `validate`, `handleGetStarted`,
  `setupError`.
- `context/UserProfileContext.tsx:150-161` — `completeSetup`.
- `app/_layout.tsx:195-203` — `isFirstRun` nav guard.
- `app/intro.tsx:63-64,107,116` — Intro Skip / Get Started targets (out of scope).
- `components/ConfirmDialog.tsx` — reused dialog (unchanged).
- `utils/onboardingPayload.ts:13` and `specs/43-onboarding-opening-balance-once-only.md` —
  opening-balance gating (unchanged).
- `specs/37-onboarding-opening-balance-payment-method.md` — existing onboarding
  failure UX preserved.
- `specs/36-web-platform-invariants.md` — web always-Online context.
