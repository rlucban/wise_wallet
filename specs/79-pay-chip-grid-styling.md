# SPEC-79 — Pay Dialog Chip Grid + Modal Polish

| Field | Value |
|---|---|
| ID | SPEC-79 |
| Title | Scheduled-dues pay dialog: wrapped chip grid, theme chips, centered rounded modal |
| Status | FINAL v1.2 folded (per user calls 2026-10-10 — implementable) |
| Owner | User |
| Version | 1.2 FINAL (folded) |
| Scope | `app/dues.tsx` (pay `Dialog` only: chip container, chip props, label alignment, dialog style) + one new guard file `utils/payChipStyling.test.ts` |
| Non-goals | No pay flow/fetch/validation/record change; no width change; no Tailwind/new deps; no SPEC-47 document edit |

RFC 2119 terminology (MUST/MUST NOT/SHOULD) applies.

## Context

The Scheduled Dues pay dialog (`app/dues.tsx:652-686`, Paper `Dialog` owned
behaviorally by SPEC-47) renders `Payment Method` chips (`:661-666`, plain
`mode="outlined"` with default selected styling) in an already-wrapping
centered row, a left-aligned `Payment Method` label (`:660`), and an
unstyled dialog box. User call 2026-10-10: a clean wrapped chip grid,
theme-aligned chip states (neutral vs indigo + check), and a centered,
padded, rounded modal.

Overlap note (§1.14): SPEC-47 keeps behavior ownership (fetch, validation,
`recordTransaction` — untouched); SPEC-65's surface rules are
cross-referenced (no percent width is added, so its overflow rule is not
triggered); SPEC-63 D-06's prior pay polish is untouched. This file owns
styling only.

## Constraints

- **CON-01** Every change MUST keep Android + iOS + Web working, stay
  Expo Go (latest) import-safe, and stay Vercel-deployable.
- **CON-02** No new npm packages, native modules, fonts, or third-party code
  (AGENTS §1.12). No Tailwind — `rounded-2xl`/`bg-*` translate to
  `StyleSheet` keys (repo has no Tailwind runtime).
- **CON-03** Chip container MUST stay a wrapping centered grid:
  `flexDirection: "row"`, `flexWrap: "wrap"`, `justifyContent: "center"`,
  `gap: 8`. No horizontal `ScrollView`, no `nowrap` — chips MUST wrap to
  further rows instead of stretching one long line. (Row count itself
  follows content and is NOT pinned — flex-wrap cannot cap rows without
  clipping.)
- **CON-04** Chip states (Paper `Chip`, `mode="outlined"` kept):
  unselected → light `backgroundColor: "#F3F4F6"`, dark
  `theme.colors.surfaceVariant`; border `theme.colors.outlineVariant`;
  text `theme.colors.onSurfaceVariant` (dark-on-light / light-on-dark —
  readable in both themes). Selected (both themes) →
  `backgroundColor: "#1E3A8A"`, white text, `icon="check"` shown ONLY
  when selected, `selectedColor="#ffffff"`. (Guard accommodation, same
  intent: `utils/themeColors.test.js` `ALLOWED_EXCEPTIONS` gains a
  `selectedColor` entry — fixed white is required against fixed navy in
  BOTH themes and no theme token is white in both, so this line cannot
  use one; the guard's general rule is intact.)
- **CON-05** Modal box: the pay `Dialog` gains `style={{ borderRadius: 16,
  overflow: "hidden" }}` and nothing else (no width/size change —
  Paper's auto width stays, SPEC-65 percent-width rule stays uninvolved).
  `Payment Method` label gains `textAlign: "center"`. Title, amount,
  `Dialog.Content` padding, and `Dialog.Actions` (already centered) stay
  byte-identical.
- **CON-06** No behavior change: method list source, fallback, validation,
  busy/disable states, `recordTransaction` call, and Cancel/dismiss wiring
  MUST stay byte-identical.
- **CON-07** Identical on Android, iOS, and Web, light and dark — theming
  goes through `theme.dark` / theme tokens only, never `Platform.OS`.
  Any platform branch needs its own amendment first (§1.10).
- **CON-08** No code, config, or dependency change before this spec is marked
  FINAL by the user (AGENTS §1.1, §1.10 CON-10 pattern).

## Goal

The pay dialog shows a centered wrapped chip grid with instantly readable
selected state, inside a centered rounded modal — identical behavior,
both themes, all platforms.

### Interaction matrix

| Surface | Action | Expected |
|---|---|---|
| Pay dialog | Open (light) | Neutral `#F3F4F6` chips, dark text, subtle border, wrapped + centered |
| Pay dialog | Select a method (light/dark) | Chip turns `#1E3A8A` with white text + white check; others unchanged |
| Pay dialog | Open (dark) | Tonal surfaceVariant chips, light text; selected still indigo + white |
| Pay dialog | View title/amount/label/buttons | All centered; box corners rounded; Cancel/Confirm work as before |

### Decisions

- **DEC-01** Theme-aware chips (user call — literals would glow on the dark
  dialog; rejected: literals-always).
- **DEC-02** White check via conditional `icon` + `selectedColor`
  (user call "clean checkmark"; shown selected-only, never on unselected).
- **DEC-03** Radius/overflow only on this dialog (user call; rejected:
  width changes, shared-style edits).
- **DEC-04** New SPEC-79 file owns styling; SPEC-47/SPEC-65/SPEC-63 keep
  theirs, documents never edited (§1.14).

### Acceptance

Objective — deterministic, machine-checkable (jest, parameterized by
`Platform.OS` = `android` / `ios` / `web` via mock):

- **ACC-01** Source scan: chip container holds row + `flexWrap: "wrap"` +
  `justifyContent: "center"` + `gap: 8`; no horizontal `ScrollView` or
  `nowrap` around the chips. Holds on android/ios/web.
- **ACC-02** Source scan: chip style branches `#F3F4F6`,
  `theme.colors.surfaceVariant`, `theme.colors.outlineVariant`,
  `theme.colors.onSurfaceVariant`, selected `#1E3A8A`, white text,
  conditional `icon="check"`, `selectedColor="#ffffff"`,
  `mode="outlined"` kept. Holds on android/ios/web.
- **ACC-03** Source scan: pay `Dialog` style holds `borderRadius: 16` +
  `overflow: "hidden"` with no width key; `Payment Method` label centered;
  title/amount/actions lines byte-identical; `recordTransaction(due,
  method)` call intact. Holds on android/ios/web.

Subjective — human-judged UX as observable reviewer checks (explicit
pass/fail observation steps, user-run per AGENTS §1.3 — agent never runs CLIs):

- **ACC-S01** Reviewer on Android/iOS (Expo Go, light AND dark) confirms:
  chips wrap centered (no single-line stretch), selected chip reads
  indigo/white/check at a glance, modal corners rounded, everything
  centered, Cancel/Confirm behave as before. FAIL = stretched row,
  unreadable chip, square corners, or behavior change.
- **ACC-S02** Reviewer on Web confirms ACC-S01 identically (both themes),
  no console error. FAIL = any web-only deviation (triggers a CON-07
  amendment, not a silent branch).

TDD coverage (§1.10): `utils/payChipStyling.test.ts` covers ACC-01..ACC-03
parameterized by `Platform.OS` (android/ios/web); ACC-S01/S02 are user-run
manual checks exactly as written above.

## Deliverables

- **D-01** `app/dues.tsx` ONLY: pay-dialog chip container/chips/label/
  dialog style per CON-03..CON-05. No other line in the file changes.
- **D-02** `utils/payChipStyling.test.ts` (new file, named here
  per §1.11): guards for ACC-01..ACC-03 × android/ios/web.
- **D-03** Docs after implementation (AGENTS §1.8, post-FINAL only):
  `docs/savepoint.md` entry + `AGENTS.md` §3 status line. NOT part of the
  spec-writing step; no doc edit ships with the DRAFT.

## Glossary

- **Chip states:** unselected (neutral, theme-aware) vs selected (indigo
  `#1E3A8A`, white text + check).
- **Wrapped grid:** row + wrap + center + gap container (row count follows
  content).

## References

- `AGENTS.md` (§1.9 spec format, §1.10 TDD/platform matrix, §1.11
  bare-minimum, §1.12 no new deps, §1.14 one home)
- `specs/04-connection-status-vs-offline-mode.md` (template)
- `specs/47-due-payment-method-picker.md` (SPEC-47 — dialog behavior home;
  document NOT amended)
- `specs/65-dialog-width-overflow-and-centering-diagnosis.md` (SPEC-65 —
  surface rules; no percent width added here)
- `app/dues.tsx:652-686` (pay dialog: `:660` label, `:661-666` chips,
  `:669-685` actions)
- `app/dues.tsx:573-618` (add-due Frequency/Category chip pattern — v1.1 match target)
- `context/ThemeContext.tsx:13` (`primary: '#1B3F7A'`) and `:55`
  (`primary: '#4A90D9'`) — app primaries are indigo-family, so theme-default
  selected chips satisfy the indigo direction with no hardcoded colors

---

## v1.2 Amendment — Bottom-sheet account cards (PROPOSED, not yet FINAL)

User call 2026-10-10 with reference screenshot (bottom-sheet "Select
account" picker: drag handle, left title + subtitle + X, full-width option
cards with colored selected border, full-width Cancel): restyle the
scheduled pay/receive method picker to that shape. v1.0/v1.1 sections stay
normative; where this amendment conflicts, v1.2 governs once marked FINAL.
Explicit supersessions: CON-10/CON-11 (chips + 2-col grid) → CON-15
(full-width cards); CON-12 label/layout → CON-16 (sheet header);
ACC-04/ACC-05 → ACC-07/ACC-08 below (ACC-03/ACC-06/S03/S04 stand, re-run).

Fold note (user call 2026-10-10 — no v1.3 section exists): the v1.3
bottom-anchor substance is merged here — CON-15 rewritten with the
wrapper mechanism, 24/0 radii and pb-32, DEC-13/14/15 and the flush-edge
checks folded into ACC-07/S05. On-disk D-08 still reflects pre-fold v1.2
and will be redone after FINAL.

### v1.2 Constraints (delta)

- **CON-15** The pay picker is a bottom sheet anchored flush to the viewport:
  Paper `Modal` (already imported in `dues.tsx`) with the WRAPPER `style`
  prop `{{ justifyContent: "flex-end", marginTop: 0, marginBottom: 0 }}`
  (this slot, applied after the inset margins at `Modal.tsx:214`, both
  bottom-anchors the sheet AND zeroes the safe-area gap — the v1.2
  `contentContainerStyle` demonstrably never reached the wrapper, see
  `Modal.tsx:222` vs `:210-217`, so it is DELETED, not extended). Sheet
  `backgroundColor: theme.colors.surface`, `borderTopLeftRadius: 24`,
  `borderTopRightRadius: 24`, explicit `borderBottomLeftRadius: 0` and
  `borderBottomRightRadius: 0` (flat bottom pinned), `padding: 20` +
  `paddingBottom: 32` (`pb-8` — buttons sit 32pt above the flush edge,
  clearing the gesture zone; accepted trade-off: the sheet underlaps the
  OS gesture bar). Non-interactive drag handle pill on top (centered,
  ~48×-5, `borderRadius: 3`, `theme.colors.outlineVariant`). Dismiss paths
  byte-identical in effect: backdrop tap, X, and Cancel all call
  `setPayTarget(null)`; visibility stays driven by `payTarget` alone. No
  custom slide animation, no drag-to-dismiss gesture (rejected — new
  interaction scope).
- **CON-16** Sheet header: dynamic title left (`Pay "[t]"?` /
  `Receive "[t]"?`, existing copy kept) + `IconButton icon="close"`
  right (same dismiss); amount line below as the subtitle (existing
  content, left-aligned). The `Payment Method` label is dropped (cards
  are self-evident, screenshot parity). Method options are full-width
  cards (stacked, `gap: 8`): `borderRadius: 16`, `padding: 16`, method
  name left (`titleMedium`-weight text, NO icons — user call "as in the
  system"); unselected = 1px `theme.colors.outlineVariant` border on
  surface; selected = 2px `theme.colors.primary` border (user call —
  indigo, NOT the screenshot's green). Whole card is the tap target
  (select-only; Confirm still executes per DEC-09).
- **CON-17** Buttons: full-width stacked with `gap: 8` — Confirm
  `mode="contained"` (primary) above Cancel (full-width tonal, mirroring
  the screenshot's full-width Cancel). Labels, disabled/busy states, and
  the `recordTransaction(due, method)` flow stay byte-identical.
- **CON-18** Zero hardcoded colors anywhere in the new styling (theme
  tokens + radii only) — the `themeColors` guard MUST pass unmodified.
  No width/percent keys on the sheet (SPEC-65 rule untriggered); no new
  imports beyond RN core (`Pressable` if needed) — no new deps.
- **CON-19** No v1.2 code beyond D-08/D-09. SPEC-47 behavior, v1.0 box
  radius intent (now expressed as sheet top corners), and all pay-flow
  lines stand.

### v1.2 Goal (delta)

| Surface | Action | Expected |
|---|---|---|
| Scheduled | Pay/Receive a due | Bottom sheet slides over content: handle, title + X, amount, full-width method cards, Confirm + Cancel stacked |
| Sheet | Tap a method card | Selected card gains the 2px indigo border; nothing executes yet |
| Sheet | Tap Confirm | Same transaction recorded as before; sheet closes |
| Sheet | Tap X / Cancel / backdrop | Closes with no action (as before) |

Decisions:

- **DEC-09** Bottom sheet, Confirm kept (user calls; rejected: centered
  restyle, tap-to-confirm behavior change).
- **DEC-10** Indigo selected border via theme primary (user call; rejected:
  screenshot-literal green).
- **DEC-11** No card icons (user call "as in the system" — the system has
  none on these options; rejected: wallet/cash iconography).
- **DEC-12** New SPEC-79 v1.2 section owns the sheet shape; SPEC-47 keeps
  behavior, documents never edited (§1.14).
- **DEC-13** Wrapper `style` prop per library evidence (folded from v1.3;
  rejected: more `contentContainerStyle` keys, which demonstrably cannot
  work).
- **DEC-14** 24 top / explicit 0 bottom (folded from v1.3; user call).
- **DEC-15** `paddingBottom: 32` as the gesture clearance (folded from
  v1.3; user call).

Acceptance (all × android/ios/web where machine-checkable):

- **ACC-07** Source scan: pay `Modal` carries the wrapper `style` with
  `justifyContent: "flex-end"`, `marginTop: 0`, `marginBottom: 0`; NO
  `contentContainerStyle` on the pay Modal; sheet holds top radii `24`,
  explicit bottom `0`s, `padding: 20` + `paddingBottom: 32`; handle pill,
  X close wired to `setPayTarget(null)`; no `Dialog` remains on the pay
  path; no chips/grid remnants (`flexBasis`, `mode="outlined"` chip
  block gone).
- **ACC-08** Source scan: method cards full-width stacked (`gap: 8`,
  `borderRadius: 16`, `padding: 16`), name-only, selected = 2px
  `theme.colors.primary` border, unselected = `outlineVariant`; no
  hardcoded color, no chip `icon=` (the X close keeps `icon="close"` per
  CON-15), no `Payment Method` label; stacked
  full-width Confirm (contained) + Cancel; `recordTransaction(due,
  method)` + busy/disable lines intact.
- **ACC-S05** Reviewer on Android/iOS (Expo Go, light AND dark) confirms:
  sheet matches the screenshot shape (handle, title+X, amount, cards,
  stacked buttons), selected card reads indigo-bordered, flow unchanged;
  sheet touches left/right/bottom edges with zero gap, top rounded 24,
  bottom square, buttons 32pt above the edge (incl. gesture-bar devices).
  FAIL = centered dialog remnant, green border, icons, behavior change,
  or any gap/float.
- **ACC-S06** Reviewer on Web confirms ACC-S05 identically (both themes),
  no console error. FAIL = any web-only deviation.

### v1.2 Deliverables (delta)

- **D-08** `app/dues.tsx` ONLY: pay `Dialog` → bottom-sheet `Modal` per
  CON-15..CON-17. Nothing else in the file changes.
- **D-09** `utils/payChipStyling.test.ts`: rewritten guards for
  ACC-07/ACC-08 × android/ios/web (superseded chip pins replaced).
- **D-10** Docs after v1.2 implementation (AGENTS §1.8, post-FINAL only):
  `docs/savepoint.md` entry + `AGENTS.md` §3 status line.



---

## v1.1 Amendment — Add-due chips in a 2-column grid (PROPOSED, not yet FINAL)

User call 2026-10-10: the v1.0 custom styling "does not match the system"
— redo the pay-method chips to match the add-due Frequency/Category chip
pattern, laid out in 2 columns (rows flow with method count), keeping the
indigo-selected / neutral-unselected direction. v1.0 sections above stay
normative; where this amendment conflicts, v1.1 governs once marked FINAL.
Explicit supersessions: CON-04 (custom chip colors) → CON-10 (theme-default
chips); CON-03 container (centered) + CON-05 label (centered) → CON-11/12
(add-due left pattern); the `selectedColor` guard exception (repair note) →
CON-13 (reverted); ACC-01/ACC-02 → ACC-04/ACC-05 below (ACC-03/S01/S02
stand, re-run).

### v1.1 Constraints (delta)

- **CON-10** Pay-method chips MUST be add-due-exact: `mode="outlined"`,
  `style` carrying `borderRadius: 16` plus the column sizing, plain
  `{m.name}` children — NO custom `backgroundColor`, `textStyle`,
  `borderColor`, `icon`, or `selectedColor`. Selected state comes from
  Paper's theme defaults, which read indigo-family through the app
  primaries (`#1B3F7A` / `#4A90D9`) — the kept direction with zero
  hardcoded colors.
- **CON-11** 2-column grid: each chip gets `flexBasis: "48%"` +
  `flexGrow: 1` inside a container of `flexDirection: "row"`,
  `flexWrap: "wrap"`, `gap: 6` with NO `justifyContent` (add-due-exact
  left flow: 2 methods = 1 row of 2; 3–4 = 2 rows). No horizontal
  `ScrollView`, no `nowrap`, no fixed row cap.
- **CON-12** `Payment Method` label takes the add-due label style
  (`marginBottom: 8`, `fontWeight: "600"`, left-aligned — reverses v1.0's
  centering). Dialog box (`borderRadius: 16` + `overflow: "hidden"`),
  title, amount, Content padding, and Actions stay exactly v1.0.
- **CON-13** The `selectedColor` `ALLOWED_EXCEPTIONS` entry in
  `utils/themeColors.test.js` MUST be removed (guard restored to
  original) — no hardcoded colors remain anywhere in the new styling, so
  the exception is dead. The guard's general rule is untouched.
- **CON-14** No v1.1 code beyond D-04..D-06. Pay behavior, SPEC-47's
  document, and the v1.0 modal-box lines all stand.

### v1.1 Goal (delta)

| Surface | Action | Expected |
|---|---|---|
| Pay dialog | Open | Chips look like add-due chips, 2-column left-flowing grid, label semibold left |
| Pay dialog | Select a method | Theme-default selected chip (indigo-family), others neutral |
| Pay dialog | 2 vs 4 methods | 1 row of 2 / 2 rows of 2 — never one stretched line |

Decisions:

- **DEC-05** Add-due pattern as the match target (user call).
- **DEC-06** 2 columns via `flexBasis 48%` + grow (user call "2 columns
  always"; rejected: fixed row caps, centered single-row flow).
- **DEC-07** Theme-default selection (reconciles "keep indigo direction"
  with "match the system": the indigo comes from the app primary, not
  literals; rejected: keeping any custom chip color).
- **DEC-08** Guard exception reverted with the colors that required it
  (rejected: leaving a dead exception behind).

Acceptance (all × android/ios/web where machine-checkable):

- **ACC-04** Source scan: chip container holds row + wrap + `gap: 6` with
  no `justifyContent: "center"`; each chip holds `flexBasis: "48%"` +
  `flexGrow: 1`; no `ScrollView`/`nowrap` in the block.
- **ACC-05** Source scan: chips hold `mode="outlined"` +
  `borderRadius: 16` with plain `{m.name}` children and NONE of
  `backgroundColor`, `textStyle`, `borderColor`, `icon=`,
  `selectedColor`, `#1E3A8A`, `#F3F4F6`, `#ffffff` in the block; label
  holds `fontWeight: "600"` with no `textAlign: "center"`; dialog box
  still `borderRadius: 16` + `overflow: "hidden"`.
- **ACC-06** Source scan: `utils/themeColors.test.js` holds no
  `selectedColor` exception; pay behavior lines
  (`recordTransaction(due, method)`, busy/disable states) intact.
- **ACC-S03** Reviewer on Android/iOS (Expo Go, light AND dark) confirms:
  chips visually match add-due chips, 2-column grid, selected reads
  clearly, modal box unchanged from v1.0. FAIL = custom-styled chips,
  single-line stretch, or behavior change.
- **ACC-S04** Reviewer on Web confirms ACC-S03 identically (both themes),
  no console error. FAIL = any web-only deviation.

### v1.1 Deliverables (delta)

- **D-04** `app/dues.tsx` ONLY: pay-dialog chips/container/label rewritten
  per CON-10..CON-12. Nothing else in the file changes.
- **D-05** `utils/payChipStyling.test.ts`: rewritten guards for
  ACC-04..ACC-06 × android/ios/web (superseded v1.0 pins replaced).
- **D-06** `utils/themeColors.test.js`: `selectedColor` exception removed
  (guard restored byte-identical to pre-SPEC-79).
- **D-07** Docs after v1.1 implementation (AGENTS §1.8, post-FINAL only):
  `docs/savepoint.md` entry + `AGENTS.md` §3 status line.
