# Spec 27: Replace Remaining Hardcoded `#fff` Control Labels with Theme Tokens

| Field | Value |
|---|---|
| ID | SPEC-27 |
| Title | Replace Remaining Hardcoded `#fff` Control Labels with Theme Tokens |
| Status | **FINAL** (approved 2026-09-30; ACC-01 annotated 2026-10-04 per SPEC-30 v2.3) |
| Owner | User (final authority) |
| Version | 1.1 |
| Scope | The 9 remaining hardcoded `#fff` label/icon colors on `/add-allocation`, `/add-due`, `/dues`, `/savings`, `/category-settings`; the `/add-allocation` disabled-state button text token |
| Non-goals | Weakening `utils/themeColors.test.js`; editing any other screen (incl. the Home FAB at `app/(tabs)/index.tsx`); changing `context/ThemeContext.tsx` values; changing any FAB/Button `backgroundColor`, layout, copy, or behavior |
| Normative source | This file. File+symbol cites are normative; `:line` numbers are hints only. |

> History: created 2026-09-30 per user request after `npm test` reported 15 failing
> `utils/themeColors.test.js` cases; **finalized 2026-09-30** (user call: use
> `theme.colors.onPrimary`). Numbered 27 because `docs/savepoint.md` already journals
> SPEC-25 and SPEC-26 for the passcode-dialog work. Supersedes nothing; narrows SPEC-12 CON-01 and
> exercises the second branch of SPEC-17 CON-02 (`theme.colors.onPrimary`).

## Terminology (RFC 2119)

The keywords **MUST**, **MUST NOT**, **SHOULD**, and **MAY** in this spec are to be
interpreted as described in RFC 2119. Informative prose (examples, "today", "currently")
is non-normative unless restated as a requirement.

## 1. Context

### 1.1 Problem (current failing state)

`npm test` currently fails 15 of 24 `utils/themeColors.test.js` cases (5 files ×
`android`/`ios`/`web`). The guard scans each file line-by-line and skips any line whose
text contains an `ALLOWED_EXCEPTIONS` entry (e.g. `theme.colors.`). The 5 failing files
each contain exactly one violation, always the literal `"#fff"`:

| File | Violating line (hint) | Content |
|---|---|---|
| `app/add-allocation.tsx` | 75 | `const buttonTextColor = isButtonDisabled ? disabledText : "#fff";` |
| `app/add-due.tsx` | 198 | `color="#fff"` (contained "Save Scheduled Due" Button) |
| `app/dues.tsx` | 744 | `color="#fff"` (FAB) |
| `app/savings.tsx` | 518 | `color="#fff"` (FAB) |
| `app/category-settings.tsx` | 131 | `color="#fff"` (FAB) |

### 1.2 Accidental passes (same defect, masked)

4 further `color="#fff"` occurrences sit on a line that also contains `theme.colors.`
(inside `buttonColor={theme.colors.primary}`), so the line-substring exception hides them.
They are the same defect and MUST be fixed in the same pass:

- `app/dues.tsx:645` — "Save Changes" Button
- `app/savings.tsx:429` ("Save Changes"), `:463` ("Confirm" transfer in), `:495` ("Confirm" transfer out)
- `app/category-settings.tsx:107` — "Add" Button

### 1.3 Secondary defect: invisible disabled label on `/add-allocation`

`app/add-allocation.tsx` currently derives:

```tsx
const disabledBg = theme.colors.onSurface;
const disabledText = theme.colors.onSurface;   // same token as the background
const buttonBg = isButtonDisabled ? disabledBg : theme.colors.primary;
const buttonTextColor = isButtonDisabled ? disabledText : "#fff";
```

When disabled, the label color equals the button background color, so "Create Allocation"
is unreadable. This MUST be corrected in the same change (ACC-03).

### 1.4 Reference: theme values this change relies on

From `context/ThemeContext.tsx`:

| Token | Light | Dark |
|---|---|---|
| `theme.colors.primary` | `#1B3F7A` | `#4A90D9` |
| `theme.colors.onPrimary` | `#FFFFFF` | `#001F4D` |
| `theme.colors.surface` | `#FFFFFF` | `#161B22` |
| `theme.colors.onSurface` | `#1A1A2E` | `#E6EDF3` |

Consequence: in **light** mode the rendered result is byte-identical to today
(`onPrimary` is `#FFFFFF`). In **dark** mode the label changes from `#FFFFFF` to
`#001F4D` on the `#4A90D9` primary fill — the Material 3 pairing, and a contrast
improvement (approx. 3.3:1 → approx. 6.4:1).

## 2. Constraints (normative)

- **CON-01 — Semantic tokens only.** The 9 occurrences in §1.1/§1.2 MUST be replaced by
  `theme.colors.*` values. No hex, named CSS color, or `rgb()/rgba()` literal may remain
  in those 5 files.
- **CON-02 — Guard MUST NOT be weakened.** `utils/themeColors.test.js` MUST NOT be edited:
  no new `ALLOWED_EXCEPTIONS` entry, no `FILES_TO_CHECK` change, no pattern change, no
  skipped/`.only`/`.skip` test, no threshold change. The fix lives in the app code.
- **CON-03 — Primary-filled control label.** Any `Button`/`FAB` whose fill is
  `theme.colors.primary` MUST take its label/icon color from `theme.colors.onPrimary`
  (directly, or via a variable computed from it).
- **CON-04 — Disabled state pairing.** On `/add-allocation`, when the button fill is
  `theme.colors.onSurface`, the label MUST be `theme.colors.surface`; when the fill is
  `theme.colors.primary`, the label MUST be `theme.colors.onPrimary`. The enabled-state
  fill MUST remain `theme.colors.primary`.
- **CON-05 — Cross-platform parity.** No new `Platform.OS` / `Platform.select` branch may
  be introduced; behavior MUST be identical on Android, iOS, and Web.
- **CON-06 — Expo Go safe.** No new dependency, no new native module, no new top-level
  native import. Importing any of the 5 files in Expo Go MUST NOT red-box.
- **CON-07 — No breaking changes.** No change to storage keys, the `wallet-api` contract,
  AsyncStorage shapes, navigation routes, the Paper theme provider, or user-facing copy.
  Purely a color-source change.
- **CON-08 — Scope discipline.** Files not listed in §1.1/§1.2 MUST NOT be edited. In
  particular `app/(tabs)/index.tsx` (Home FAB) keeps `color="#fff"`; that file is not in
  `FILES_TO_CHECK` and is out of scope.
- **CON-09 — Verification gates.** `npm test`, `npm run lint`, and the TypeScript check
  MUST be clean before this spec is reported implemented. (Commands are run by the user.)

## 3. Goal

Zero hardcoded color literals in the 5 scanned screens, with the disabled `/add-allocation`
label legible, achieved without touching the test guard and without regressing any
platform's rendering.

### 3.1 Platform matrix

| Platform | Objective (machine-checkable) | Subjective (reviewer observation) |
|---|---|---|
| **Android** | ACC-01, ACC-02, ACC-03, ACC-04, ACC-05, ACC-06, ACC-07, ACC-08 | ACC-09, ACC-10, ACC-11, ACC-13 |
| **iOS** | ACC-01, ACC-02, ACC-03, ACC-04, ACC-05, ACC-06, ACC-07, ACC-08 | ACC-09, ACC-10, ACC-11, ACC-13 |
| **Web** (`expo export --platform web`) | ACC-01, ACC-02, ACC-03, ACC-04, ACC-05, ACC-06, ACC-07, ACC-08 | ACC-09, ACC-10, ACC-11, ACC-12, ACC-13 |

### 3.2 Acceptance criteria (Objective — machine-checkable)

| ID | Criterion |
|---|---|
| **ACC-01** | `utils/themeColors.test.js` reports 0 violations for all 8 files × `android`/`ios`/`web`; `npm test` ends with `Tests: 98 passed, 98 total`, 0 failed. **Annotated 2026-10-04 (SPEC-30 v2.3):** `98/98` is the verified baseline *for this spec as shipped* and is preserved as historical record. The repo-wide total is now higher (SPEC-37/38/39 added `utils/onboardingPayload.test.ts` and `utils/settingsAccountMode.test.ts`, plus guards in `utils/webPin.test.ts`), so a current run reports more than 98 tests. The gate is **0 failed**, not a fixed number. |
| **ACC-02** | The 9 literals in §1.1 + §1.2 are gone: a repo search of the 5 files for `#fff`/`#FFF`/`white`/`rgb(` returns no match outside comment text. |
| **ACC-03** | `app/add-allocation.tsx` computes the label as: disabled → `theme.colors.surface`, enabled → `theme.colors.onPrimary`; fill remains `theme.colors.onSurface` (disabled) / `theme.colors.primary` (enabled). |
| **ACC-04** | `git diff --stat -- utils/themeColors.test.js` is empty (guard byte-identical, per CON-02). |
| **ACC-05** | `npm run lint` reports 0 errors and 0 warnings for the 5 edited files. |
| **ACC-06** | The TypeScript check (`npx tsc --noEmit`) reports 0 errors; `package.json` has no new/changed dependency entries. |
| **ACC-07** | `git diff` on the 5 files shows no added `Platform.` usage and no changed JSX structure, copy, handlers, or `backgroundColor` values. |
| **ACC-08** | Diff touches only the 5 files in §1.1/§1.2 plus this spec and `docs/savepoint.md` / `AGENTS.md` §3 status. |

### 3.3 Acceptance criteria (Subjective — reviewer observation, per platform)

| ID | Criterion | Pass condition |
|---|---|---|
| **ACC-09** | Light mode on Android, iOS, Web: open `/dues`, `/savings`, `/category-settings`, `/add-due`, `/add-allocation`. | FAB and Button labels ("Due", "New Allocation", "Save Changes", "Save Scheduled Due", "Add") still render **white** on solid primary — i.e. visually identical to the pre-change build. |
| **ACC-10** | Dark mode (Settings → toggle dark), same 5 screens. | Labels render as the dark navy `onPrimary` on the lighter blue primary fill and are clearly readable; no label disappears into its background. |
| **ACC-11** | Dark mode + light mode on `/add-allocation`, with the form left empty so the button is disabled. | "Create Allocation" label is visible against the `onSurface` fill in both themes (it was previously the same color as the fill). |
| **ACC-12** | Web build (`npx expo export --platform web`), served and opened in Chrome. | Labels render on all 5 screens; no new console warning or hydration error appears versus the previous build. |
| **ACC-13** | Expo Go (latest) on Android and iOS. | Each of the 5 screens opens with no red box and no crash; FAB/Button tap targets still work. |

### 3.4 Decisions

- **DEC-01:** Use `theme.colors.onPrimary` for all primary-filled control labels (CON-03) —
  satisfies both SPEC-12 CON-01 and the second branch of SPEC-17 CON-02.
- **DEC-02:** Do **not** touch `utils/themeColors.test.js`; the 15 failures are the guard
  working as designed and the guard stays as written.
- **DEC-03:** Fix the 4 accidentally-passing occurrences in the same pass so the code is
  consistent and reordering a JSX prop cannot silently re-break the guard.
- **DEC-04:** Fix the `/add-allocation` disabled label via `theme.colors.surface`
  (`onSurface` fill ↔ `surface` label = light-on-dark and dark-on-light in both themes).
- **DEC-05:** Accept the dark-mode label color change on the 3 FABs (`/dues`, `/savings`,
  `/category-settings`) as intended: those files are guarded by the test, the Home FAB is
  out of scope per CON-08, and the change improves dark-mode contrast.

## 4. Deliverables

- **D-01 — `app/add-allocation.tsx`**: replace the `"#fff"` literal in the `buttonTextColor`
  ternary with `theme.colors.onPrimary`, and change `disabledText` to `theme.colors.surface`
  (ACC-03).
- **D-02 — `app/add-due.tsx`**: FAB/Button label `color="#fff"` → `color={theme.colors.onPrimary}`.
- **D-03 — `app/dues.tsx`**: FAB label `color="#fff"` → `color={theme.colors.onPrimary}`, and
  the edit-modal "Save Changes" Button `color="#fff"` → `color={theme.colors.onPrimary}`.
- **D-04 — `app/savings.tsx`**: FAB label plus the three modal Buttons ("Save Changes",
  transfer-in "Confirm", transfer-out "Confirm") → `color={theme.colors.onPrimary}`.
- **D-05 — `app/category-settings.tsx`**: FAB label plus the "Add" Button → `color={theme.colors.onPrimary}`.
- **D-06 — Documentation**: append the implementation entry to `docs/savepoint.md` and a
  `Current status` bullet to `AGENTS.md` §3 (AGENTS.md §1.8). No change to
  `utils/themeColors.test.js` (CON-02, ACC-04).
- **D-07 — Verification**: report the user's `npm test`, `npm run lint`, and
  `npx tsc --noEmit` output against ACC-01, ACC-05, ACC-06; ACC-09..ACC-13 are user-run.

## Glossary

| Term | Meaning |
|---|---|
| Semantic token | A `theme.colors.*` value that adapts to light/dark mode automatically. |
| Hardcoded color | A literal hex string (`#fff`, `#1E3A8A`), named CSS color (`white`, `gray`), or `rgb()/rgba()` call in a style/JSX color prop. |
| Primary-filled control | A React Native Paper `Button` (`mode="contained"`) or `FAB` whose background is `theme.colors.primary`. |
| Accidental pass | A violation the guard does not report only because the same line happens to contain an allowed substring. |
| Expo Go | The Expo development client build used for manual on-device verification. |

## References

- `utils/themeColors.test.js` — the string-scan guard (SPEC-12 D-03; **not modified**)
- `app/add-allocation.tsx` — `disabledBg` / `disabledText` / `buttonBg` / `buttonTextColor`
- `app/add-due.tsx` — contained "Save Scheduled Due" Button
- `app/dues.tsx` — FAB; edit-modal "Save Changes" Button
- `app/savings.tsx` — FAB; "Save Changes" / transfer-in / transfer-out Buttons
- `app/category-settings.tsx` — FAB; "Add" Button
- `context/ThemeContext.tsx` — `primary`, `onPrimary`, `surface`, `onSurface` (light + dark)
- `specs/12-theme-contrast-fixes.md` — CON-01 (semantic tokens only)
- `specs/13-theme-contrast-add-due.md`, `specs/14-theme-contrast-allocations.md`,
  `specs/15-theme-contrast-category-settings.md` — per-screen token sweeps
- `specs/17-fab-button-styling.md` — CON-02 (`#fff` **or** `theme.colors.onPrimary`)
- `AGENTS.md` §1.1 (spec-first), §1.5 (cross-platform), §1.7 (Expo Go), §1.8 (docs), §1.9 (spec format), §1.10 (spec-first + TDD platform matrix)
