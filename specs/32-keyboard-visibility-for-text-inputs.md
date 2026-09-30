# Spec 32: Keyboard Must Not Cover Text Inputs (Native)

| Field | Value |
|---|---|
| ID | SPEC-32 |
| Title | Soft keyboard MUST NOT cover the focused input on Android/iOS (PIN first, all forms swept) |
| Status | **FINAL** (2026-09-30 per user call) |
| Owner | User (final authority) |
| Version | 1.0 — FINAL: v0.1 draft approved as-is; implement exactly this |
| Scope | Every native screen/dialog with a `TextInput`, PIN-first: Settings dialogs (change-passcode, PIN-verify, delete-PIN, clear-data PIN, re-register form), `passcode-screen`, `login`, `register`; then form screens (`add/edit-transaction`, `add-due`, `add-allocation`, `onboarding`, others found in audit) |
| Non-goals | Custom keyboards; autofill/OTP APIs; new native dependencies; any web behavior change; copy/design changes beyond layout shifts |
| Normative source | This file, once marked FINAL. `AGENTS.md §4` is a pointer only. File+symbol cites are normative; `:line` numbers are hints only. |

## Terminology (RFC 2119)

The keywords **MUST**, **MUST NOT**, **SHOULD**, and **MAY** in this spec are
to be interpreted as described in RFC 2119. Informative prose (examples,
"observed", "today") is non-normative unless restated as a requirement.

## 1. Context

### 1.1 Problem (reported 2026-09-30, non-normative)

On mobile (Android/iOS) the soft keyboard covers the text being typed, most
painfully in PIN inputs. The user cannot see what they are entering.

### 1.2 Current state (non-normative, observed 2026-09-30)

- `login.tsx`, `register.tsx`, `onboarding.tsx` already wrap content in
  `KeyboardAvoidingView` + `ScrollView(keyboardShouldPersistTaps="handled")`.
- `app/(tabs)/settings.tsx` holds **9** `secureTextEntry` PIN fields (delete
  PIN, PIN-verify, re-register form PIN, clear-data PIN, change-passcode
  current/new/confirm ×2 layouts), all inside Paper `Dialog`s in a plain
  `ScrollView` — **no** keyboard avoidance. Dialogs size to content, so the
  keyboard overlaps the focused field and its error text.
- `passcode-screen.tsx` PIN uses `autoFocus` with a native keyboard; avoidance
  unverified.
- Form screens (`add-transaction`, `edit-transaction`, `add-due`,
  `add-allocation`) are bare `ScrollView`s with `keyboardShouldPersistTaps`
  but no avoidance wrapper.

## 2. Constraints (normative once FINAL)

- **CON-01 — Focused input stays visible.** On Android and iOS, focusing ANY
  `TextInput` in scope MUST scroll/shift layout so the focused field AND its
  validation/error text stay above the keyboard while it is open. Dismissing
  the keyboard MUST restore the prior layout with no stuck offset.
- **CON-02 — PIN-first ordering.** Settings PIN dialogs + `passcode-screen`
  MUST be fixed first; form screens follow in the same change. No screen in
  §Scope may be left covered.
- **CON-03 — No new native dependencies.** Only React Native built-ins
  (`KeyboardAvoidingView`, `ScrollView`, `Keyboard`) and already-installed
  `react-native-paper` dialog props. Expo Go MUST NOT crash; web output MUST
  be byte-identical in behavior (keyboard code MUST be native-gated via
  `Platform.OS`/`select` where it could affect web layout).
- **CON-04 — No behavior/copy change.** Tapping outside still dismisses
  (`keyboardShouldPersistTaps="handled"` preserved everywhere); validation,
  PIN lengths, dialog buttons, and copy MUST NOT change. Pure layout fix.
- **CON-05 — Standing repo invariants (AGENTS.md §1).** MUST keep Android + iOS
  + Web working; MUST keep web Vercel-deployable; MUST NOT change storage
  keys, the `wallet-api` contract, AsyncStorage shapes, routes, or native deps.

## 3. Goal

| Screen / dialog | After (FINAL) |
|---|---|
| Settings PIN dialogs (change-passcode 1+2, PIN-verify, delete-PIN, clear-data PIN, re-register form) | Field + error text visible above keyboard; decor (Dialog.Icon/Title) MAY scroll off |
| `passcode-screen` | PIN field visible above keyboard on focus |
| `login`, `register`, `onboarding` | Keep current avoidance; regression-checked (already wrapped) |
| Form screens (`add/edit-transaction`, `add-due`, `add-allocation`, any other TextInput screen found in audit) | Focused field scrolls into view above keyboard |

Open decisions: none proposed — DEC-01: built-ins only (no keyboard-aware
third-party dep); DEC-02: PIN dialogs first, all in one change (no phasing).

### Acceptance criteria

Objective (machine-checkable, `jest` parameterized by `Platform.OS` =
`android`/`ios`/`web` via mock):

- **ACC-01:** every in-scope file from the D-01 audit list renders a keyboard
  avoidance wrapper around its inputs (string-scan like
  `themeColors.test.js`: each file matches `KeyboardAvoidingView` or an
  approved shared wrapper; web-only files exempt).
- **ACC-02:** no in-scope `ScrollView` holding inputs lacks
  `keyboardShouldPersistTaps` (string-scan).
- **ACC-03:** no new dependency in `package.json` and no static import of a
  keyboard-helper package in app code (string-scan of `package.json` +
  imports).

Subjective (human-judged, observable reviewer checks in Expo Go):

- **ACC-04:** reviewer on Android opens each Settings PIN dialog, focuses the
  field with the keyboard up: field + error text fully visible, can still
  reach dialog buttons by scrolling; no red-box.
- **ACC-05:** reviewer on iOS repeats ACC-04 for `passcode-screen`, `login`,
  `register`, and each form screen: focused field visible, dismiss restores
  layout, no stuck offset, no red-box.
- **ACC-06:** reviewer on web export confirms zero layout/behavior change on
  the touched screens.

## 4. Deliverables

- **D-01 — Audit list.** Enumerate every `TextInput`/`secureTextEntry` screen
  in `app/` (starting from the §1.2 list) and mark wrapped vs bare; the list
  ships in the implementation notes (`docs/savepoint.md`).
- **D-02 — PIN dialogs + passcode-screen.** Avoidance wrappers (built-ins
  only) so field + error stay visible; `keyboardShouldPersistTaps` kept.
- **D-03 — Form-screen sweep.** Same treatment for every remaining bare
  form screen with inputs.
- **D-04 — Tests.** `jest` for ACC-01..03 parameterized over
  `android`/`ios`/`web`; user-run Expo Go (ACC-04/05) + web export (ACC-06).
- **D-05 — Docs.** `docs/savepoint.md` + `AGENTS.md §3` record the audit list
  and implementation.

## Glossary

| Term | Meaning |
|---|---|
| Avoidance wrapper | `KeyboardAvoidingView` (or shared wrapper built on it) that shifts/scrolls content above the soft keyboard |
| PIN-first | Settings dialogs + passcode-screen fixed ahead of general form screens |

## References

- `AGENTS.md §1` — working agreements (spec-first, no CLI, invariants, docs).
- `app/login.tsx`, `app/register.tsx`, `app/onboarding.tsx` (existing
  `KeyboardAvoidingView` pattern to reuse), `app/passcode-screen.tsx`,
  `app/(tabs)/settings.tsx` (9× `secureTextEntry`), `app/add-transaction.tsx`,
  `app/edit-transaction.tsx`, `app/add-due.tsx`, `app/add-allocation.tsx`.
