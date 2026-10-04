# Spec 28: Type the Passcode Screen TextInput Ref

| Field | Value |
|---|---|
| ID | SPEC-28 |
| Title | Type the Passcode Screen TextInput Ref |
| Status | **FINAL** (approved 2026-09-30; v1.2 amendment approved same day after `tsc` rejected v1.1; ACC-05 annotated 2026-10-04 per SPEC-30 v2.3) |
| Owner | User (final authority) |
| Version | 1.2 |
| Scope | `app/passcode-screen.tsx` — the `inputRef` declaration (line 11) and the `react-native` import (line 2) |
| Non-goals | ESLint config changes (`eslint.config.js` untouched); `useState`/passcode logic; any other file; SPEC-27 deliverables |
| Normative source | This file. File+symbol cites are normative; `:line` numbers are hints only. |

> History: created 2026-09-30 per user request after `npm run lint` reported the last
> remaining warning (`@typescript-eslint/no-explicit-any`, `app/passcode-screen.tsx:11`).
> Pre-existing; unrelated to SPEC-27. Numbered 28 because `docs/savepoint.md` already
> journals SPEC-25/26/27.
>
> **v1.1 (rejected by `tsc`):** `useRef<React.ComponentRef<typeof TextInput>>(null)`.
> `React.ComponentRef<typeof TextInput>` resolves to Paper's `TextInputHandles`
> (`node_modules/react-native-paper/lib/typescript/components/TextInput/TextInput.d.ts:159,163`),
> but Paper's `ref` prop is an **intersection** — `Props` is
> `React.ComponentPropsWithRef<typeof NativeTextInput> & {...}` (same file, line 7), so
> `ref` must satisfy `Ref<NativeTextInput> & Ref<TextInputHandles>`. Passing only the
> `TextInputHandles` half produced `TS2322` at `app/passcode-screen.tsx:70`.
>
> **v1.2 (current):** type the ref with the host `TextInput` class from `react-native`,
> which structurally satisfies **both** halves of that intersection (its base mixin
> provides `focus`/`blur`/`setNativeProps`; the class adds `isFocused`/`clear`/
> `setSelection` — exactly the members of `TextInputHandles`). This requires adding
> `TextInput as NativeTextInput` to the existing `react-native` import, which v1.1's
> CON-03 wrongly forbade.

## Terminology (RFC 2119)

The keywords **MUST**, **MUST NOT**, **SHOULD**, and **MAY** in this spec are to be
interpreted as described in RFC 2119. Informative prose is non-normative unless restated
as a requirement.

## 1. Context

### 1.1 Problem

`npm run lint` currently reports exactly one problem:

```
11:27  warning  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
✖ 1 problem (0 errors, 1 warning)
```

`app/passcode-screen.tsx:11`:

```tsx
const inputRef = useRef<any>(null);
```

The ref is attached to a React Native Paper `<TextInput>` and only `.focus()` is called on
it (`app/passcode-screen.tsx:15`). `any` is unnecessary and is disallowed by
`eslint.config.js:56` (`"@typescript-eslint/no-explicit-any": "warn"`).

Stack: React 19.2, `react-native` 0.86.3, `react-native-paper` 5.13.1. In React 19 types,
`React.ElementRef` is deprecated in favour of `React.ComponentRef`.

### 1.2 Why the rest of the repo is clean

A repo-wide search for `any` in app/type positions finds only this line plus the rule
comment at `eslint.config.js:55`. `app/(tabs)/settings.tsx:215` shows the accepted
alternative of a precise DOM/host type (`useRef<HTMLInputElement>(null)`).

## 2. Constraints (normative)

- **CON-01 — Typed ref, no `any`.** `inputRef` MUST be typed so that
  `@typescript-eslint/no-explicit-any` reports nothing, and the type MUST expose the
  `focus()` member that `app/passcode-screen.tsx:15` calls.
- **CON-02 — No lint-rule changes.** `eslint.config.js` MUST NOT be edited: no rule
  downgrade to `off`, no file-specific override, no new exception. The code changes, not
  the guard.
- **CON-03 — Zero runtime change.** The edit MUST be type-level only. The emitted JavaScript
  MUST be equivalent (`useRef(null)`); no new dependency, no new runtime import, no changed
  JSX, handler, copy, or timer. Adding a **type-only** import alias to an existing
  `react-native` import statement is permitted (v1.2); a new import *statement* is not.
- **CON-04 — Cross-platform parity.** No `Platform.OS` branch; behavior identical on
  Android, iOS, and Web.
- **CON-05 — Expo Go safe.** MUST NOT crash Expo Go on import; no new native module.
- **CON-06 — No breaking changes.** No storage, API, navigation, theme, or passcode-context
  changes.
- **CON-07 — Scope discipline.** Only `app/passcode-screen.tsx` may be edited (plus this
  spec, `docs/savepoint.md`, and `AGENTS.md` §3).
- **CON-08 — Verification gates.** `npm run lint` MUST report 0 errors and 0 warnings;
  `npx tsc --noEmit` MUST report 0 errors; `npm test` MUST stay at 98/98. (Run by the user.)

## 3. Goal

Remove the last lint warning by giving `inputRef` the precise Paper `TextInput` instance
type, with no behavior change and no weakening of the lint guard.

### 3.1 Platform matrix

| Platform | Objective (machine-checkable) | Subjective (reviewer observation) |
|---|---|---|
| **Android** | ACC-01, ACC-02, ACC-03, ACC-04, ACC-05 | ACC-06, ACC-08 |
| **iOS** | ACC-01, ACC-02, ACC-03, ACC-04, ACC-05 | ACC-06, ACC-08 |
| **Web** (`expo export --platform web`) | ACC-01, ACC-02, ACC-03, ACC-04, ACC-05 | ACC-06, ACC-07, ACC-08 |

### 3.2 Acceptance criteria (Objective — machine-checkable)

| ID | Criterion |
|---|---|
| **ACC-01** | `npm run lint` reports `0 errors, 0 warnings` and no `@typescript-eslint/no-explicit-any` entry. |
| **ACC-02** | A repo search for `:\s*any\b` / `as any\b` / `<any>` in `app/`, `components/`, `context/`, `hooks/`, `repositories/`, `utils/` returns no match. |
| **ACC-03** | `app/passcode-screen.tsx:2` imports `TextInput as NativeTextInput` from `react-native` (added to the existing import statement, none added) and `app/passcode-screen.tsx:11` is `const inputRef = useRef<NativeTextInput>(null);`. `TextInput` from `react-native-paper` (line 3) remains the component used in JSX. |
| **ACC-04** | `npx tsc --noEmit` reports 0 errors — in particular no `TS2322` at `app/passcode-screen.tsx:70` — and `inputRef.current?.focus()` at `app/passcode-screen.tsx:15` type-checks. |
| **ACC-05** | `npm test` still reports `Tests: 98 passed, 98 total`, 0 failed; `git diff --stat` shows changes only in `app/passcode-screen.tsx` (plus docs/spec). **Annotated 2026-10-04 (SPEC-30 v2.3):** `98/98` is the verified baseline *for this spec as shipped* and is preserved as historical record. The repo-wide total is now higher (SPEC-37/38/39 added `utils/onboardingPayload.test.ts` and `utils/settingsAccountMode.test.ts`, plus guards in `utils/webPin.test.ts`), so a current run reports more than 98 tests. The gate is **0 failed**, not a fixed number. The `git diff --stat` clause is unaffected by this annotation. |

### 3.3 Acceptance criteria (Subjective — reviewer observation, per platform)

| ID | Criterion | Pass condition |
|---|---|---|
| **ACC-06** | Expo Go (latest), Android and iOS: lock the app with a passcode, then unlock. | The passcode field still auto-focuses on mount (keyboard opens without tapping the field), digits still mask, and correct/wrong entry behave as before. |
| **ACC-07** | Web build (`npx expo export --platform web`) opened in Chrome: unlock the app. | Auto-focus on load still works; no new console error or type-related build failure. |
| **ACC-08** | Any platform, dark and light mode: open `/passcode-screen`. | Layout, colors, helper text, and card appearance are visually identical to the pre-change build (type-only edit). |

### 3.4 Decisions

- **DEC-01:** Type the ref as the host `TextInput` from `react-native`, imported as
  `NativeTextInput`. `TextInputHandles` (Paper's ref handle type) is **not exported** by
  `react-native-paper`, so it cannot be named; the host class is the one public type that
  satisfies Paper's `Ref<NativeTextInput> & Ref<TextInputHandles>` intersection. Rejected
  alternative: `React.ComponentRef<typeof TextInput>` (v1.1) — resolves to `TextInputHandles`
  only and fails `tsc` (TS2322).
- **DEC-02:** Keep `null` as the ref initial value and keep the optional-chained
  `inputRef.current?.focus()` — no behavior change (CON-03).
- **DEC-03:** Do not touch `eslint.config.js`; the warning is a real type-safety signal
  (CON-02).

## 4. Deliverables

- **D-01 — `app/passcode-screen.tsx`**: add `TextInput as NativeTextInput` to the existing
  `react-native` import (line 2) and replace `useRef<any>(null)` with
  `useRef<NativeTextInput>(null)` per ACC-03. No other line changes.
- **D-02 — Documentation**: append the implementation entry to `docs/savepoint.md` and a
  `Current status` bullet to `AGENTS.md` §3 (AGENTS.md §1.8).
- **D-03 — Verification**: report the user's `npm run lint`, `npx tsc --noEmit`, and
  `npm test` output against ACC-01, ACC-04, ACC-05; ACC-06..ACC-08 are user-run.

## Glossary

| Term | Meaning |
|---|---|
| `ComponentRef<T>` | React 19 type helper yielding the instance type a component's ref receives. |
| `TextInputHandles` | Paper's unexported ref-handle type: `Pick<NativeTextInput, 'focus' \| 'clear' \| 'blur' \| 'isFocused' \| 'setNativeProps' \| 'setSelection'>`. |
| `Paper `TextInput`` | `react-native-paper`'s `TextInput`; compounded component whose `ref` prop is `Ref<NativeTextInput> & Ref<TextInputHandles>`. |
| Guard | The lint rule `@typescript-eslint/no-explicit-any` configured in `eslint.config.js`. |

## References

- `app/passcode-screen.tsx:11` — `useRef<any>(null)` (the sole violation)
- `app/passcode-screen.tsx:15` — `inputRef.current?.focus()`
- `eslint.config.js:56` — `"@typescript-eslint/no-explicit-any": "warn"`
- `eslint.config.js:82-88` — test-file override (already exempts `*.test.*`)
- `app/(tabs)/settings.tsx:215` — `useRef<HTMLInputElement>(null)` (accepted precise-type pattern)
- `specs/23-numamount-reference-and-dues-lint-fix.md` — precedent for a lint-warning spec
- `specs/27-theme-onprimary-label-colors.md` — prior work; unaffected
- `AGENTS.md` §1.1 (spec-first), §1.5 (cross-platform), §1.7 (Expo Go), §1.8 (docs), §1.10 (spec-first + TDD platform matrix)