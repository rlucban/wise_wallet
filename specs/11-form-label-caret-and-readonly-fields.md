# Spec 11: Form Label Separation & Read-Only Field Caret Cleanup

| Field | Value |
|---|---|
| ID | SPEC-11 |
| Title | Form Label Separation & Read-Only Field Caret Cleanup |
| Status | **FINAL** (2026-09-24 per user call) |
| Owner | User (final authority) |
| Version | 1.0 — DEC-01..03 approved as proposed |
| Scope | How field labels are rendered on form screens; caret/focus behavior of read-only value fields (Date/Due Date); visual mode of PIN fields in Settings |
| Non-goals | Redesigning chips, SegmentedButtons, radio groups, or section headers; changes to `login.tsx`/`register.tsx` (already compliant); passcode-screen dot UI; placeholders/HelperText copy; storage keys, API contract, routes, native deps; any new dependencies |
| Normative source | This file. File+symbol cites are normative; `:line` numbers are hints only. |

> History: drafted 2026-09-24 from diagnosis of "labels look like input
> textboxes with a blinking text cursor". DEC-01..03 are proposals until the
> user marks this spec FINAL.

## Terminology (RFC 2119)

The keywords **MUST**, **MUST NOT**, **SHOULD**, and **MAY** in this spec are
to be interpreted as described in RFC 2119. Informative prose (examples,
"today", "currently") is non-normative unless restated as a requirement.

## 1. Context

### 1.1 Problem

On the form screens, field labels appear to be (or sit inside) input
textboxes, and a blinking text caret is visible at/near the label. Users
report: *"the labels are like input textbox … it appears like the text cursor
is blinking."*

### 1.2 Root cause (verified 2026-09-24)

Two mechanisms, both present in the codebase:

**A. Labels are rendered *inside* the focusable input.**
Every field label on the form screens is the react-native-paper `label` prop
of the `TextInput` itself, so the label lives in the same container and shares
the field's touch/focus target. Nothing in the repo ever suppresses the caret
(`caretHidden`, `showSoftInputOnFocus`, `focusable`, `selectionColor`,
`tabIndex` — zero matches). Tapping the label area (or tab-focusing on web)
focuses the real input → caret blinks where the label sits (on an empty field
the label occupies the text position).

Inventory of `label=` on `TextInput` (the defect surface):

| File | Labels |
|---|---|
| `app/add-transaction.tsx` | Amount, Date\*, Specify Category, Establishment / Location, Note (Optional) |
| `app/edit-transaction.tsx` | Amount, Date\*, Specify Category, Establishment / Location, Note (Optional) |
| `app/add-due.tsx` | Title, Amount, Due Date\*, Specify Category |
| `app/dues.tsx` | Title, Amount, Date\*, Specify Category |
| `app/add-allocation.tsx` | Name, Initial Balance, Goal Amount (Optional) |
| `app/savings.tsx` | Name, Goal Amount (Optional), Amount ×2 |
| `app/onboarding.tsx` | Your Name, Initial Balance |
| `app/category-settings.tsx` | Category Name |
| `app/payment-methods.tsx` | Name (e.g. GCash, BPI, My Visa) |
| `app/(tabs)/settings.tsx` | Current PIN, Current PIN, PIN, New PIN, Current Passcode, New Passcode, Confirm New Passcode |

\* = read-only date field (mechanism B).

**B. Read-only "label-like" values are focusable `TextInput`s.**
The Date / Due Date fields display a static value but are `TextInput` with
only `editable={false}` — no caret/focus opt-out:

- `app/add-transaction.tsx` — `label="Date"`
- `app/edit-transaction.tsx` — `label="Date"`
- `app/add-due.tsx` — `label="Due Date"`
- `app/dues.tsx` — `label="Date"`

On web, `editable={false}` maps to `readOnly` (`react-native-web`
`exports/TextInput/index.js`), which remains focusable — browsers show a
**blinking caret**. On native, `editable={false}` maps to
`isEnabled = false`, which hides the caret — so the defect is loudest on the
Vercel web build but the label-as-input problem (A) affects all platforms.

**C. Minor:** four PIN inputs in `app/(tabs)/settings.tsx` (Current PIN ×2,
PIN, New PIN) omit `mode`, so Paper renders the default **flat/underlined**
field — visually "classic textbox" — while every other field is
`mode="outlined"`. The three passcode fields in the same file already pass
`mode="outlined"`.

### 1.3 In-repo correct pattern (reference)

`app/login.tsx` and `app/register.tsx` render labels as standalone
`<Text style={styles.fieldLabel}>` **above** a `TextInput` that has no
`label` prop (only `placeholder`). Those labels are non-focusable text and
cannot show a caret. `fieldLabel` style (normative values for this spec):
`{ color: '#666', fontSize: 13, fontWeight: '600', marginTop: 4, marginBottom: 6 }`.

## 2. Constraints (normative)

- **CON-01 — Label separation.** On every screen listed in §1.2-A, each field
  label MUST be a standalone, non-focusable `<Text>`-class element rendered
  *outside and before* the `TextInput`. The `TextInput` MUST NOT carry a
  `label` prop for these fields. Labels MUST NOT be focusable and MUST NOT
  display a caret on any platform. Tapping a label MUST NOT focus any input.
  This constraint applies ONLY to `TextInput.label` — `label` keys on
  `SegmentedButtons`/`Chip`/`Button` configs are legitimate and MUST NOT be
  changed or flagged.
- **CON-02 — Read-only value fields.** The four Date/Due Date fields MUST NOT
  be focusable and MUST NOT show a caret on any platform (Android, iOS, web),
  including when tab-navigated on web. The calendar icon MUST remain
  pressable and MUST still open the date picker. Field appearance MUST stay
  visually equivalent to the current outlined field (same value text, same
  icon placement) unless DEC-02(b) is chosen and the reviewer confirms parity.
- **CON-03 — Editable inputs keep normal caret.** Genuinely editable inputs
  (Amount, Note, Title, etc.) MAY show the caret when the user deliberately
  focuses them for editing — that is normal behavior. The caret MUST appear
  only within the editable text area, never at/adjacent to a label.
- **CON-04 — PIN field mode.** The four PIN `TextInput`s in
  `app/(tabs)/settings.tsx` (labels: Current PIN, Current PIN, PIN, New PIN)
  MUST pass `mode="outlined"` to match the passcode fields and the rest of
  the app. Their `label` prop is still removed per CON-01.
- **CON-05 — Shared label style.** All migrated labels MUST use a single
  shared style source (one exported constant or one tiny wrapper component)
  whose values match the normative `fieldLabel` style in §1.3. Per-screen
  ad-hoc redefinitions MUST NOT be introduced. `login.tsx`/`register.tsx`
  MAY be repointed to the shared source in the same change (SHOULD).
- **CON-06 — Standing repo invariants (AGENTS.md §1).** The implementation
  MUST keep Android + iOS + Web working (`Platform.OS` / `Platform.select`;
  no new native-only top-level imports — Expo Go MUST NOT crash); MUST keep
  web Vercel-deployable (`expo export --platform web`, no Node-only APIs or
  secrets in app code); MUST NOT change storage keys (`user_{id}_*`), the
  `wallet-api` contract, AsyncStorage shapes, navigation routes, or native
  dependencies; MUST NOT add any new dependency.
- **CON-07 — TDD + platform matrix (AGENTS.md §1.10).** Objective acceptance
  MUST be covered by jest tests parameterized over
  `Platform.OS = "android" | "ios" | "web"` living under `utils/` (per
  `jest.config.js` roots), plus user-run manual checks in Expo Go and
  `expo export --platform web` for the subjective UI paths jest cannot prove.

## 3. Goal

Field labels are plain static text that can never look or behave like an
input; read-only values never show a caret; all fields share one outlined
visual style — identical behavior on Android, iOS, and Web.

### Decisions (proposals — user call at FINAL)

- **DEC-01:** Labels migrate to the standalone-`Text`-above-input pattern
  (login/register style) on all screens in §1.2-A; Paper `label` prop is
  removed from every form `TextInput`. (Chosen over "keep floating labels +
  only suppress caret" because the complaint is specifically that *labels*
  look like textboxes — separating them from the input is the only way a
  label can never share a focus target.)
- **DEC-02:** Date/Due Date fields preferred implementation = **(a)** keep
  Paper `TextInput` for visual parity and apply caret/focus suppression
  (`editable={false}` + `caretHidden` + web non-focus, e.g.
  `tabIndex={-1}` / `Platform.select`). Alternative **(b)** = replace with a
  non-input `View`/`Text` + icon styled to match the outlined field — allowed
  only if the reviewer confirms visual parity per CON-02.
- **DEC-03:** Settings PIN fields become `mode="outlined"` (CON-04).

### 3.1 Platform matrix

| Platform | Objective (machine-checkable, jest where under `utils/`) | Subjective (reviewer-observable) |
|---|---|---|
| Android (Expo Go) | ACC-01, ACC-02, ACC-03 hold with `Platform.OS = "android"` | ACC-05, ACC-07 |
| iOS (Expo Go) | ACC-01, ACC-02, ACC-03 hold with `Platform.OS = "ios"` | ACC-05, ACC-07 |
| Web (`expo export`) | ACC-01, ACC-02, ACC-03 hold with `Platform.OS = "web"` (web read-only props include non-focus keys) | ACC-04, ACC-06, ACC-07 |

### 3.2 Acceptance criteria — Objective (jest)

Tests MUST live under `utils/` (`jest.config.js` roots) and be parameterized
over `Platform.OS = "android" | "ios" | "web"` per CON-07.

- **ACC-01 (jest):** The shared read-only input helper (D-01) returns props
  that include `editable: false` and `caretHidden: true` on all three
  platforms; on `web` it additionally includes a non-focus mechanism
  (`tabIndex: -1` or equivalent documented key). On `android`/`ios` no web-only
  key is required.
- **ACC-02 (jest):** The shared `fieldLabel` style source (D-01) equals the
  §1.3 normative values exactly (`color '#666'`, `fontSize 13`,
  `fontWeight '600'`, `marginTop 4`, `marginBottom 6`).
- **ACC-03 (jest, source audit):** A test reads every screen file listed in
  §1.2-A and FAILS if any `TextInput` opening tag still carries a `label=`
  prop. The audit MUST NOT flag `label` keys on `SegmentedButtons` `buttons`
  arrays, `Chip`, or `Button` configs (CON-01 exception).

### 3.3 Acceptance criteria — Subjective (human-judged UX)

Written as observable reviewer steps per AGENTS.md §1.10.

- **ACC-04 (web export):** On the Vercel-built web bundle, the reviewer opens
  Add Transaction, Edit Transaction, Add Due, Dues (edit dialog), Add
  Allocation, Savings (edit dialog), Onboarding, Category Settings, Payment
  Methods, and Settings: (i) every field label sits above its box as plain
  text — no caret ever appears at a label; (ii) clicking or tabbing to the
  Date/Due Date field shows **no blinking caret** and does not accept typing;
  (iii) the calendar icon still opens the date picker; (iv) PIN fields render
  outlined (no underline-only classic look).
- **ACC-05 (Expo Go, Android + iOS):** Reviewer repeats ACC-04 steps (i)–(iv)
  on device: tapping a label does not focus any input; focused editable
  fields show the caret only in the text area; Date/Due Date never show a
  caret and the calendar icon works.
- **ACC-06 (web export):** Reviewer keyboard-tabs through each form and
  confirms labels are skipped (not tab stops) and Date/Due Date do not
  receive a visible focus caret; editable fields remain tabbable and
  typeable.
- **ACC-07 (all platforms):** Reviewer confirms no visual regressions:
  labels remain legible with the shared style, HelperText error spacing is
  unchanged, SegmentedButtons/Chip labels still render (CON-01 exception
  intact), and layout does not shift beyond the label relocation.
- **ACC-08 (all platforms):** `npm run lint` and `npm test` pass; Expo Go
  launches without a red box (AGENTS.md §1.7).

## 4. Deliverables

- **D-01 — Shared helpers (TDD first):** new `utils/formInput.ts` exporting:
  (1) `readOnlyInputProps()` — per-platform read-only props per DEC-02(a) /
  ACC-01; (2) the normative `fieldLabel` style constant (or a re-export
  backing a tiny wrapper, per CON-05). New `utils/formInput.test.ts`
  covering ACC-01…ACC-02 parameterized by `Platform.OS`, plus the ACC-03
  source audit over the §1.2-A file list.
- **D-02 — Label migration (CON-01, DEC-01):** on every §1.2-A screen, move
  each `TextInput label="…"` to a standalone label element using the shared
  style from D-01, placed immediately before its `TextInput`, and remove the
  `label` prop. Preserve label strings, field order, `mode="outlined"`,
  placeholders, `error`/`HelperText` wiring, and all `onChange` handlers
  exactly.
- **D-03 — Read-only Date fields (CON-02, DEC-02):** apply
  `readOnlyInputProps()` (or the approved (b) presentation) to the four
  Date/Due Date fields in `add-transaction.tsx`, `edit-transaction.tsx`,
  `add-due.tsx`, `dues.tsx`; keep the calendar icon `onPress` intact.
- **D-04 — PIN fields outlined (CON-04, DEC-03):** add `mode="outlined"` to
  the four PIN inputs in `app/(tabs)/settings.tsx`; their labels migrate per
  D-02 as part of the same edit.
- **D-05 — Docs:** after implementation, append to `docs/savepoint.md` and
  add a `Current status` entry in `AGENTS.md §3` per AGENTS.md §1.8.
- **D-06 — Manual verification:** run ACC-04…ACC-06 reviewer steps in Expo Go
  (Android + iOS) and on `expo export --platform web`; user runs the
  commands (AGENTS.md §1.3 — agent does not execute CLIs).

## Glossary

| Term | Meaning |
|---|---|
| Label | Static field caption text above an input; non-focusable, no caret |
| Read-only value field | Displays a fixed value (Date/Due Date) inside field chrome; not focusable, no caret, icon may be pressable |
| Caret | Blinking text-insertion cursor in a focused text input |
| `label` prop | react-native-paper `TextInput` prop that renders the caption *inside* the input container — removed by this spec on form screens |
| Shared `fieldLabel` | Single style source for all migrated labels (§1.3 values) |

## References

- `AGENTS.md §1` — working agreements (spec-first, no CLI, invariants, §1.10
  TDD + platform matrix, §1.8 docs).
- `specs/04-connection-status-vs-offline-mode.md` — SPEC-04 template this
  file follows; `specs/10-negative-balance-alert-recovery.md` — objective/
  subjective ACC + platform-matrix precedent.
- `app/login.tsx` (`fieldLabel` style + standalone-label pattern),
  `app/register.tsx` — compliant reference implementation.
- `app/add-transaction.tsx`, `app/edit-transaction.tsx`, `app/add-due.tsx`,
  `app/dues.tsx`, `app/add-allocation.tsx`, `app/savings.tsx`,
  `app/onboarding.tsx`, `app/category-settings.tsx`,
  `app/payment-methods.tsx`, `app/(tabs)/settings.tsx` — migration targets.
- `jest.config.js` — jest roots under `utils/`, `*.test.ts`, ts-jest.
