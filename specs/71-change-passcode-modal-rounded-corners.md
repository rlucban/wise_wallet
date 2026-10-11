# SPEC-71 — Settings Modal Rounded Corners

| Field | Value |
|---|---|
| ID | SPEC-71 |
| Title | Settings modal containers: rounded-2xl + overflow-hidden (all dialogs) |
| Status | FINAL (per user call 2026-10-10 — implementable) |
| Owner | User |
| Version | 1.0 FINAL |
| Scope | `app/(tabs)/settings.tsx` (shared `styles.dialog`, two keys) + one new guard file `utils/settingsModalRadius.test.ts` |
| Non-goals | No behavior, copy, PIN-logic, storage-key, API-contract, route, or dependency change; no SPEC-26 / SPEC-65 document edit (additive overlap recorded below, §1.14) |

RFC 2119 terminology (MUST/MUST NOT/SHOULD) applies.

## Context

All Settings modal boxes render with square corners: the shared
`styles.dialog` (`settings.tsx:116-121`) carries only `maxWidth: 480` /
`width: "90%"` / `alignSelf: "center"` / `marginHorizontal: 0` — no
`borderRadius`, no `overflow`. It feeds every modal in the screen, including
the three named by the user — Clear Data PIN prompt (`:1671`, `Surface`),
Delete Account confirmation (`:1703`, `Surface`), Change Passcode (`:1736`,
`Surface`) — plus the Delete Account dialog (`:1479`) and five Paper
`Dialog`s (`:1578`, `:1606`, `:1625`, `:1636`, `:1947`). User calls
2026-10-10 (expanded scope): give ALL modal boxes consistent curved/rounded
edges via rounded-2xl (`borderRadius: 16`) plus `overflow: "hidden"` so
children clip to the curve.

Overlap reconciliation (§1.14): `styles.dialog`'s width/alignSelf requirements
are owned by SPEC-26 (CON-01) and its `marginHorizontal: 0` rule by SPEC-65 —
neither document is edited and neither behavior changes. SPEC-71 becomes the
canonical home for radius/overflow on that style ONLY (purely additive two
keys). Verified no guard breakage: SPEC-65's guards assert by `toContain`
(`marginHorizontal: 0`, `maxWidth: 480`, `width: "90%"`,
`alignSelf: "center"`) plus a percent-width-without-margin scan — all still
pass with two extra keys; no existing test asserts exact style shape or key
absence.

## Constraints

- **CON-01** Every change MUST keep Android + iOS + Web working, stay
  Expo Go (latest) import-safe (no static native-only import), and stay
  Vercel-deployable (no Node-only APIs in app code).
- **CON-02** No new npm packages, native modules, fonts, or third-party code
  (AGENTS §1.12).
- **CON-03** The change MUST land in the shared `styles.dialog`
  definition (current lines 116-121) by appending exactly two keys —
  `borderRadius: 16` and `overflow: "hidden"` — after the existing four,
  which MUST stay byte-identical in value and order. Every
  `styles.dialog` consumer (all three named modals plus all other dialogs)
  inherits the curve from this single place.
- **CON-04** No JSX change. Every `Surface` / `Dialog` / `Modal` usage keeps
  its existing `style` prop verbatim (still `style={styles.dialog}` where
  it is today); no per-dialog override is added anywhere.
- **CON-05** No behavior, copy, PIN-step logic, open/dismiss wiring, button,
  or error-path change anywhere in the file.
- **CON-06** No platform-only behavior. The two keys MUST ship identically
  on Android, iOS, and Web. If implementation discovers a need for a
  `Platform.OS` branch, it MUST stop — that branch needs its own `CON-*` +
  `ACC-*` + `D-*` amendment before any code is written (§1.10).
- **CON-07** No code, config, or dependency change before this spec is marked
  FINAL by the user (AGENTS §1.1, §1.10 CON-10 pattern).

## Goal

Every Settings modal box renders with 16pt rounded corners and its content
clipped to the curve — Clear Data, Delete Account, Change Passcode, and all
other `styles.dialog` consumers, consistently.

### Interaction matrix

| Surface | Action | Expected |
|---|---|---|
| Settings | Open Change Passcode / Clear Data PIN / Delete Account confirm | Box has visibly rounded corners; content inside the curve |
| Settings | Open any other dialog (backup, conflict, message, PIN verify, new account) | Same rounded box — consistent with the three named modals |
| Any modal | Steps, Cancel, close-X, backdrop tap, validation, errors | Behavior identical to before (open/close/logic untouched) |

### Decisions

- **DEC-01** Shared-`styles.dialog` edit, NOT per-modal overrides (user
  scope is ALL modal boxes with consistent edges; one two-key addition is
  the bare-minimum diff per §1.11 and cannot drift out of sync; verified it
  breaks no SPEC-26/SPEC-65 guard).
- **DEC-02** Tailwind `rounded-2xl` / `overflow-hidden` translated to
  `borderRadius: 16` + `overflow: "hidden"` — the repo uses
  `StyleSheet`/inline styles, no Tailwind runtime exists and none is added.
- **DEC-03** New SPEC-71 file is the canonical home for radius/overflow on
  `styles.dialog`; SPEC-26 (width/alignSelf) and SPEC-65 (margin rule) keep
  their ownership and their documents are never edited (§1.14).

### Acceptance

Objective — deterministic, machine-checkable (jest, parameterized by
`Platform.OS` = `android` / `ios` / `web` via mock):

- **ACC-01** Source scan: the `styles.dialog` definition contains all six
  keys — the four existing (`maxWidth: 480`, `width: "90%"`,
  `alignSelf: "center"`, `marginHorizontal: 0`) plus `borderRadius: 16` AND
  `overflow: "hidden"`. Holds on android/ios/web.
- **ACC-02** Source scan: `borderRadius` and `overflow` each occur exactly
  once in the file (inside `styles.dialog`); no `Surface` / `Dialog` /
  `Modal` JSX `style` prop changed. Holds on android/ios/web.
- **ACC-03** Source scan: no new import, no `Platform.OS` branch, no
  `authFetch`/`AsyncStorage` touched by the diff; SPEC-65 pins
  (`marginHorizontal: 0`, `maxWidth: 480`, `width: "90%"`,
  `alignSelf: "center"`) still present. Holds on android/ios/web.

Subjective — human-judged UX as observable reviewer checks (explicit
pass/fail observation steps, user-run per AGENTS §1.3 — agent never runs CLIs):

- **ACC-S01** Reviewer on Android/iOS (Expo Go) confirms: Change Passcode,
  Clear Data PIN, and Delete Account boxes all have visibly rounded corners;
  titles, inputs, error text, and buttons all render inside the curve with
  nothing clipped wrongly and nothing painting past the edge; no red-box.
  FAIL = any of the three still square, content cut off, or any crash.
- **ACC-S02** Reviewer opens the remaining Settings dialogs (backup,
  conflict, message, PIN verify, new account) and confirms the SAME rounded
  box — consistency, nothing square remains among `styles.dialog`
  consumers. FAIL = any dialog still square.
- **ACC-S03** Reviewer on Web (`expo export --platform web` / `npm run web`)
  confirms ACC-S01..S02 identically, no console error, no layout shift.
  FAIL = any web-only deviation (triggers a CON-06 amendment, not a silent
  branch).

TDD coverage (§1.10): `utils/settingsModalRadius.test.ts` covers
ACC-01..ACC-03 parameterized by `Platform.OS` (android/ios/web); ACC-S01..S03
are user-run manual checks exactly as written above.

## Deliverables

- **D-01** `app/(tabs)/settings.tsx` ONLY: two keys appended to the
  `styles.dialog` definition per CON-03. No other line in the file changes.
- **D-02** `utils/settingsModalRadius.test.ts` (new file, named here
  per §1.11): guards for ACC-01..ACC-03 × android/ios/web.
- **D-03** Docs after implementation (AGENTS §1.8, post-FINAL only):
  `docs/savepoint.md` entry + `AGENTS.md` §3 status line. NOT part of the
  spec-writing step; no doc edit ships with the DRAFT.

## Glossary

- **Modal containers:** every `styles.dialog` consumer in Settings (three
  named `Surface`s + all other dialogs) — all inherit the curve.
- **Shared dialog style:** `styles.dialog` — width/alignSelf owned by
  SPEC-26, margin rule by SPEC-65, radius/overflow by SPEC-71 (§1.14 split).

## References

- `AGENTS.md` (§1.9 spec format, §1.10 TDD/platform matrix, §1.11
  bare-minimum, §1.12 no new deps, §1.14 one home)
- `specs/04-connection-status-vs-offline-mode.md` (template)
- `specs/26-responsive-dialogs-and-clear-data-flow.md` (SPEC-26 —
  width/alignSelf home; document NOT amended)
- `specs/65-dialog-width-overflow-and-centering-diagnosis.md` (SPEC-65 —
  margin-rule home; document NOT amended; guards verified unaffected)
- `app/(tabs)/settings.tsx:116-121` (`styles.dialog`), `:1479` (Delete
  Account), `:1657-1725` (Clear Data PIN + delete confirmation), `:1727-1736`
  (Change Passcode), `:1578-1636` + `:1947` (Paper dialogs)
