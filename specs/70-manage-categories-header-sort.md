# SPEC-70 — Manage Categories Header Sort

| Field | Value |
|---|---|
| ID | SPEC-70 |
| Title | Manage Categories: remove body sort row, add header Sort by menu |
| Status | FINAL v1.2 (v1.0 + v1.1 + v1.2 per user calls 2026-10-10 — implementable) |
| Owner | User |
| Version | 1.2 FINAL |
| Scope | `app/category-settings.tsx` (UI only) + one new guard file `utils/manageCategoriesHeaderSort.test.ts` |
| Non-goals | No change to `utils/categorySort.ts` or `utils/categorySort.test.ts`; no sort persistence; no Expenses/Income filter change; no storage-key / API-contract / route / dependency change; no SPEC-63 edit |

RFC 2119 terminology (MUST/MUST NOT/SHOULD) applies.

## Context

Manage Categories (`app/category-settings.tsx`) currently renders two stacked
`SegmentedButtons` in the body: an Expenses/Income type filter (lines 55–62)
and a Name/Type sort row (lines 63–72). The sort row consumes vertical space
and only exposes two of the three modes the helper already supports
(`CategorySortMode = "name" | "type" | "recent"` in `utils/categorySort.ts`;
`"recent"` is unreachable in the UI). The user call (2026-10-10) is: delete
the Name/Type sort section from the body and put Sort by in the top-right of
the header navigation.

Canonical-home note (§1.14): SPEC-63 D-01/D-08 owns the Sort by ordering
logic and its helper tests (`utils/categorySort.test.ts`). This spec MUST NOT
re-specify or re-test ordering logic — it owns only the placement change
(body row → header menu) and cross-references SPEC-63. SPEC-63 itself is left
untouched. Path note: SPEC-63 Scope cites `app/(tabs)/category-settings.tsx`
but the file on disk is `app/category-settings.tsx`; the latter is canonical
for this spec.

## Constraints

- **CON-01** Every change MUST keep Android + iOS + Web working, stay
  Expo Go (latest) import-safe (no static native-only import at file
  top-level), and stay Vercel-deployable (no Node-only APIs in app code,
  `EXPO_PUBLIC_*` env only).
- **CON-02** No new npm packages, native modules, fonts, or third-party code
  (AGENTS §1.12). The menu MUST use the existing `react-native-paper` `Menu`
  (already a dependency); no custom dropdown library.
- **CON-03** The Expenses/Income `SegmentedButtons` filter (current lines
  55–62: values `expense`/`income`, labels `Expenses`/`Income`, default
  `"expense"`) MUST stay behavior- and copy-identical. Filtering
  (`normalizedCategories.filter((c) => c.type === type)`) MUST NOT change.
- **CON-04** The body sort row (current lines 63–72: second `SegmentedButtons`
  with `Name`/`Type`) MUST be removed in full. After the change exactly one
  `SegmentedButtons` (the type filter) MUST remain in the file.
- **CON-05** The replacement Sort by control MUST live in `Appbar.Header` as
  a right-side action (`Appbar.Action`, after `Appbar.Content`). It MUST use a
  valid `MaterialCommunityIcons` glyph already renderable in the repo (e.g.
  `sort`; SPEC-63 CON-03 applies — no glyph that renders a literal `?`).
  Tapping it MUST open the options menu; a tap-to-cycle icon with no menu and
  a header text-dropdown are explicitly rejected per user call.
- **CON-06** The menu MUST offer exactly three options mapping 1:1 to the
  existing `CategorySortMode` values: `Name` → `"name"`, `Type` → `"type"`,
  `Recent` → `"recent"`. Default selection MUST remain `"name"` (current
  `useState<CategorySortMode>("name")`). Selection MUST set the existing
  `sortBy` state and close the menu; list ordering MUST continue to flow
  through the untouched `sortCategories(filtered, sortBy)` call. Sort choice
  is in-memory `useState` only — NO persistence (no AsyncStorage, no storage
  key, no migration).
- **CON-07** `utils/categorySort.ts` and `utils/categorySort.test.ts` MUST
  stay byte-identical. Ordering determinism (name A–Z; type-then-name; recent
  `updatedAt` desc tie-broken by name) stays canonical in SPEC-63 D-08 and is
  NOT re-tested here beyond a mapping assertion.
- **CON-08** No platform-only behavior. The header action + menu MUST render
  and behave identically on Android, iOS, and Web. If implementation discovers
  a need for a `Platform.OS` branch, it MUST stop — that branch needs its own
  `CON-*` + `ACC-*` + `D-*` amendment before any code is written (§1.10).
- **CON-09** No code, config, or dependency change before this spec is marked
  FINAL by the user (AGENTS §1.1, §1.10 CON-10 pattern).

## Goal

Replace the body sort row with a header Sort by menu, surfacing all three
helper-supported modes, with zero behavior change to filtering or ordering.

### Interaction matrix

| Surface | Action | Expected |
|---|---|---|
| Manage Categories header | View header | Sort action visible at top-right of `Appbar.Header` |
| Manage Categories header | Tap sort action | Menu opens with `Name` / `Type` / `Recent`; current mode checked |
| Menu | Select `Name` | Menu closes; list orders A–Z (existing `sortCategories` path) |
| Menu | Select `Type` | Menu closes; list orders by type-then-name within current filter |
| Menu | Select `Recent` | Menu closes; list orders by `updatedAt` desc, name tie-break |
| Menu | Dismiss without selecting | Menu closes; order unchanged |
| Body | View filter section | Only the Expenses/Income `SegmentedButtons` remains; no sort row |
| Body | Toggle Expenses/Income | Filtering works exactly as before, combined with active sort |

### Decisions

- **DEC-01** Deletion target is exactly the second `SegmentedButtons` block
  (current lines 63–72). The Expenses/Income filter stays (user call).
- **DEC-02** Header control is a sort `Appbar.Action` + Paper `Menu`
  (user call; rejected: cycle-on-tap, text dropdown).
- **DEC-03** Menu exposes `Name` / `Type` / `Recent` (user call). `Recent`
  becomes reachable for the first time; no helper change is needed because
  `sortCategories` already implements it.
- **DEC-04** New SPEC-70 file is the canonical home for this placement
  change; SPEC-63 is cross-referenced, never edited (§1.14).

### Acceptance

Objective — deterministic, machine-checkable (jest, parameterized by
`Platform.OS` = `android` / `ios` / `web` via mock):

- **ACC-01** Source scan: `app/category-settings.tsx` contains exactly one
  `<SegmentedButtons` (the Expenses/Income filter) and zero sort-row
  remnants (`value={sortBy}` / `setSortBy` as a `SegmentedButtons` prop pair
  MUST be absent). Holds on android/ios/web (source-identical assertion).
- **ACC-02** Source scan: `app/category-settings.tsx` wires the header path —
  `Appbar.Header` contains a right-side sort `Appbar.Action`, a Paper `Menu`
  with three items mapping to `"name"` / `"type"` / `"recent"`, and the
  `useState` default `"name"`. Holds on android/ios/web.
- **ACC-03** Mapping: the test invokes the menu's selection mapping for all
  three options and asserts each resolves to its `CategorySortMode` with no
  API call, no storage write, and no `sortCategories` modification
  (helper file hash/pin asserted unchanged). Holds on android/ios/web.
- **ACC-04** Zero-footprint: `package.json`, storage keys (`user_{id}_*`),
  API contract (`wallet-api`), and navigation routes are byte-identical;
  the header glyph is a repo-valid icon (no literal `?` regression of the
  SPEC-63 D-02 class). Holds on android/ios/web.

Subjective — human-judged UX as observable reviewer checks (explicit
pass/fail observation steps, user-run per AGENTS §1.3 — agent never runs CLIs):

- **ACC-S01** Reviewer on Android (Expo Go) confirms: sort icon sits
  top-right of the Manage Categories header; tapping it opens a menu with
  `Name` / `Type` / `Recent` and a visible check on the active mode; no
  red-box, no overflow. FAIL = icon missing/misplaced, menu fails to open,
  or any crash.
- **ACC-S02** Reviewer on iOS (Expo Go) confirms: selecting each menu option
  visibly reorders the list (Recent puts the most recently updated category
  first); dismissing without selecting keeps the order; the Expenses/Income
  filter still filters correctly in combination with every sort mode.
  FAIL = order does not change, filter broken, or stale menu state.
- **ACC-S03** Reviewer on Web (`expo export --platform web` / `npm run web`)
  confirms ACC-S01..S02 identically, plus no console error and no layout
  shift of the header at desktop and mobile widths. FAIL = any web-only
  deviation (which would trigger CON-08 amendment, not a silent branch).

TDD coverage (§1.10): `utils/manageCategoriesHeaderSort.test.ts` covers
ACC-01..ACC-04 parameterized by `Platform.OS` (android/ios/web); ACC-S01..S03
are user-run manual checks exactly as written above.

## Deliverables

- **D-01** `app/category-settings.tsx` ONLY: delete the body sort
  `SegmentedButtons` row; add the header right-side sort `Appbar.Action` +
  Paper `Menu` (three options, `sortBy` state wiring, default `"name"`).
  No other file touched for UI; no helper, storage, API, route, or
  dependency change.
- **D-02** `utils/manageCategoriesHeaderSort.test.ts` (new file, named here
  per §1.11): guards for ACC-01..ACC-04 × android/ios/web. MUST NOT
  re-test ordering determinism (canonical home:
  `utils/categorySort.test.ts` via SPEC-63 D-08) — mapping assertion only.
- **D-03** Docs after implementation (AGENTS §1.8, post-FINAL only):
  `docs/savepoint.md` entry + `AGENTS.md` §3 status line. NOT part of the
  spec-writing step; no doc edit ships with the DRAFT.

## Glossary

- **Sort row:** the second `SegmentedButtons` (Name/Type) in the body of
  `app/category-settings.tsx` — the deletion target.
- **Header sort action:** the new right-side `Appbar.Action` in
  `Appbar.Header` that opens the Sort by menu.
- **Sort by menu:** the Paper `Menu` offering Name/Type/Recent, the
  replacement control.
- **Canonical home:** the single spec/file that owns a behavior (§1.14);
  ordering logic lives in SPEC-63, placement lives here.

## References

- `AGENTS.md` (§1.9 spec format, §1.10 TDD/platform matrix, §1.11
  bare-minimum, §1.12 no new deps, §1.14 one home)
- `specs/04-connection-status-vs-offline-mode.md` (template)
- `specs/63-ui-batch-settings-reports-literacy-dashboard-scheduled-dark-mode.md`
  (SPEC-63 D-01/D-08 — Sort by origin and ordering-logic home; NOT amended)
- `app/category-settings.tsx` (lines 54–72 filter + sort rows)
- `utils/categorySort.ts` (`CategorySortMode`, `sortCategories` — untouched)
- `utils/categorySort.test.ts` (ordering guards — untouched, cross-referenced)
- `specs/65-dialog-width-overflow-and-centering-diagnosis.md` (Paper
  percent-width/margin precedent — header work MUST NOT regress dialog rules)

---

## v1.1 Amendment — Name sort direction (FINAL)

User call 2026-10-10: the header Sort by menu gains a Name direction toggle —
A–Z with a down arrow, Z–A with an up arrow. Direction applies to Name only;
Type and Recent keep their fixed orders. v1.0 sections above stay normative;
where this amendment conflicts, v1.1 governs once marked FINAL. Explicit
supersessions: ACC-02 "three items" → four items; CON-07 helper
"byte-identical" → additive optional direction param (test file stays
byte-identical); ACC-03 mapping → (mode, direction) pairs below.

### v1.1 Constraints (delta)

- **CON-10** The menu MUST contain exactly four items: `Name A-Z`
  (`leadingIcon="arrow-down"`), `Name Z-A` (`leadingIcon="arrow-up"`),
  `Type`, `Recent`. `arrow-down` / `arrow-up` are core MDI glyphs — no glyph
  that renders a literal `?` (CON-05 extended).
- **CON-11** New state `sortDir: "asc" | "desc"`, default `"asc"`, in-memory
  `useState` only (no persistence, CON-06 extended). `sortDir` is meaningful
  ONLY when `sortBy === "name"` and MUST be ignored by the Type and Recent
  paths. Selecting `Name A-Z` sets `("name", "asc")`; `Name Z-A` sets
  `("name", "desc")`; selecting `Type` / `Recent` sets only the mode and
  closes the menu. The active check-mark tracks the (mode, direction)
  combination.
- **CON-12** `sortCategories` gains ONE additive optional third parameter
  (`dir: "asc" | "desc" = "asc"`). Only the `"name"` branch reverses on
  `"desc"` (Z–A, name tie-break logic unchanged); the `"type"` and `"recent"`
  branches MUST NOT reference `dir`. The default keeps every existing two-arg
  call — including all of `utils/categorySort.test.ts` — behavior-identical,
  so that test file stays byte-identical. SPEC-63's document is not edited;
  this amendment is the canonical home for direction (§1.14).
- **CON-13** No v1.1 code, config, or dependency change until v1.1 is marked
  FINAL (CON-09 extended).

### v1.1 Goal (delta)

| Surface | Action | Expected |
|---|---|---|
| Menu | Open menu, mode is Name asc | `Name A-Z` checked, down-arrow icon visible |
| Menu | Select `Name Z-A` | Menu closes; list orders Z–A |
| Menu | Select `Name A-Z` afterwards | Menu closes; list orders A–Z again |
| Menu | Select `Type` / `Recent` after Z–A | Menu closes; type-then-name / newest-first order, direction ignored |
| List | Toggle Expenses/Income under Z–A | Filter applies within Z–A Name order |

Decisions:

- **DEC-05** Four flat menu items (user call "menu items with arrows");
  rejected: separate header direction button, single cycling button,
  conditional enable/disable of direction items.
- **DEC-06** Direction is Name-only (user call); Recent stays newest-first,
  Type stays type-then-name (rejected: direction on all three).

Acceptance (all × android/ios/web where machine-checkable):

- **ACC-05** Source scan: exactly four `Menu.Item`s with the CON-10 titles +
  arrow icons; `useState` defaults `"name"` / `"asc"`; helper signature
  carries the optional third param defaulting `"asc"`; `case "type"` and
  `case "recent"` bodies contain no `dir` reference.
- **ACC-06** Mapping: `Name A-Z` → `setSortBy("name")` + asc, `Name Z-A` →
  `setSortBy("name")` + desc, each closing the menu; no `authFetch` /
  `AsyncStorage` added.
- **ACC-07** Backward compatibility: `utils/categorySort.test.ts` passes
  byte-identical (two-arg calls default to `"asc"`).
- **ACC-S04** Reviewer on Android/iOS (Expo Go) confirms: both arrow icons
  render (no `?`), Z–A visibly reverses Name order, switching to Type/Recent
  ignores the last direction, filter composes with Z–A. FAIL = any deviation.
- **ACC-S05** Reviewer on Web confirms ACC-S04 identically, no console
  error, no header layout shift. FAIL = any web-only deviation (triggers a
  CON-08 amendment, not a silent branch).

### v1.1 Deliverables (delta)

- **D-04** `app/category-settings.tsx` ONLY: four menu items per CON-10,
  `sortDir` state per CON-11, `sortCategories(filtered, sortBy, sortDir)`
  call-site. Nothing else in the file changes.
- **D-05** `utils/manageCategoriesHeaderSort.test.ts`: extend with ACC-05..
  ACC-07 guards × android/ios/web. MUST NOT re-test ordering determinism
  beyond the backward-compat pin (canonical home stays
  `utils/categorySort.test.ts`).
- **D-06** Docs after v1.1 implementation (AGENTS §1.8, post-FINAL only):
  `docs/savepoint.md` entry + `AGENTS.md` §3 status line.

### v1.1 Glossary (additions)

- **Direction:** `sortDir`, Name-only ascending (`asc`, A–Z, down arrow) vs
  descending (`desc`, Z–A, up arrow); ignored outside Name mode.

---

## v1.2 Amendment — Direction-only menu (FINAL)

User call 2026-10-10: remove Name and Type from the Sort by section — the
menu becomes direction-only (`A-Z` / `Z-A`), Type and Recent are dropped too.
Removed modes fall back to the default Name A–Z ordering with no data change.
v1.0/v1.1 sections above stay normative; where this amendment conflicts, v1.2
governs once marked FINAL. Explicit supersessions: CON-10 four items → two
items; CON-11 (mode, direction) pairs → direction only, `sortBy` state
removed; ACC-02/ACC-05/ACC-06 → ACC-08/ACC-09 below.

### v1.2 Constraints (delta)

- **CON-14** The menu MUST contain exactly two items: `A-Z`
  (`leadingIcon="arrow-down"`) and `Z-A` (`leadingIcon="arrow-up"`). No
  `Type`, `Recent`, `Name A-Z`, or `Name Z-A` item remains. Arrow glyphs
  unchanged (CON-05/CON-10 still apply — no literal `?`).
- **CON-15** The menu sets ONLY `sortDir` (`A-Z` → `"asc"`, `Z-A` →
  `"desc"`, each closing the menu); the check-mark tracks `sortDir` alone.
  The `sortBy` state is REMOVED — the call-site passes `"name"` literally —
  so no dead mode state is left behind (rejected: keeping an unreachable
  `sortBy` state). `sortDir` default stays `"asc"`, in-memory only, no
  persistence and no migration (there is nothing persisted to migrate —
  "fall back to default" is satisfied by the mount default).
- **CON-16** `utils/categorySort.ts` and `utils/categorySort.test.ts` are
  untouched by v1.2 (CON-12 stands; the `type`/`recent` branches stay as
  backward-compatible dead paths for the helper's other callers, of which
  there are currently none besides this screen).
- **CON-17** No v1.2 code, config, or dependency change until v1.2 is marked
  FINAL (CON-09 extended).

### v1.2 Goal (delta)

| Surface | Action | Expected |
|---|---|---|
| Menu | Open menu | Exactly two items: `A-Z` (down arrow), `Z-A` (up arrow); active direction checked |
| Menu | Select `Z-A` | Menu closes; list orders Z–A |
| Menu | Select `A-Z` | Menu closes; list orders A–Z |
| Menu | No Type/Recent anywhere | Neither item nor any mode switcher remains in the screen |
| List | Toggle Expenses/Income | Filter composes with the active direction |

Decisions:

- **DEC-07** Direction-only two-item menu (user call); rejected: keeping
  Type/Recent, keeping the `Name` prefix on the labels.
- **DEC-08** `sortBy` state deleted, `"name"` passed literally (no dead
  state); rejected: retaining unreachable mode state.

Acceptance (all × android/ios/web where machine-checkable):

- **ACC-08** Source scan: exactly two `Menu.Item`s with the CON-14 titles +
  arrow icons; no `title="Type"`, `title="Recent"`, `Name A-Z`, or `Name Z-A`;
  no `sortBy`/`setSortBy` identifier remains in the screen; call-site passes
  `"name"` literally.
- **ACC-09** Mapping: `A-Z` → `setSortDir("asc")` + close, `Z-A` →
  `setSortDir("desc")` + close; no `authFetch` / `AsyncStorage` added.
- **ACC-10** Backward compatibility: `utils/categorySort.ts` and
  `utils/categorySort.test.ts` byte-identical to v1.1 (helper untouched).
- **ACC-S06** Reviewer on Android/iOS (Expo Go) confirms: two-item menu,
  arrows render, Z–A visibly reverses order, no Type/Recent anywhere, filter
  composes. FAIL = any deviation.
- **ACC-S07** Reviewer on Web confirms ACC-S06 identically, no console
  error, no header layout shift. FAIL = any web-only deviation (triggers a
  CON-08 amendment, not a silent branch).

### v1.2 Deliverables (delta)

- **D-07** `app/category-settings.tsx` ONLY: two menu items per CON-14,
  `sortBy` state removed per CON-15, literal-`"name"` call-site. Nothing
  else in the file changes.
- **D-08** `utils/manageCategoriesHeaderSort.test.ts`: update superseded
  ACC-02/ACC-05/ACC-06 assertions, add ACC-08..ACC-10 guards ×
  android/ios/web. Ordering determinism still canonical in
  `utils/categorySort.test.ts` (untouched).
- **D-09** Docs after v1.2 implementation (AGENTS §1.8, post-FINAL only):
  `docs/savepoint.md` entry + `AGENTS.md` §3 status line.
