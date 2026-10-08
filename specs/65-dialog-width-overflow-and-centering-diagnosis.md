# Spec 65: Dialog Width Overflow (and Vertical Centering Diagnosis)

| Field | Value |
|---|---|
| ID | SPEC-65 |
| Title | Dialog Width Overflow on iPhone; Vertical Centering Diagnosis |
| Status | **FINAL** (2026-10-08 per user call — "final") |
| Owner | User (final authority) |
| Version | 1.0 — initial final (DRAFT v0.1 marked FINAL; no normative change) |
| Scope | (A) Stop Paper `Dialog` cards from exceeding the modal width on narrow screens. (B) Record the reported vertical-centering defect and the evidence gate required to fix it. |
| Non-goals | Changing dialog copy, buttons, ordering, elevation, backdrop, animation, dismissal behavior, or any dialog that does not set a percent width. No vertical-position change in this spec. No new dependency, helper, or abstraction. |
| Normative source | This file. Amends `specs/26-responsive-dialogs-and-clear-data-flow.md` CON-01 by **addition only** (`marginHorizontal: 0`). |

> RFC 2119 keywords **MUST**, **MUST NOT**, **SHOULD**, and **MAY** express
> normative requirements below. They are active because this spec is FINAL.

## 1. Context

The user reported (2026-10-08) that dialogs are **not centered on an iPhone
screen**. Four iOS screenshots were supplied, run in **Expo Go** (per user
answer): Settings → *Delete Account* (two states) and Dues → *Pay*
("hsush", "FSFD"). In all four the card sits in the lower part of the screen
rather than vertically centered, the action row is at/below the screen edge,
and in the *Delete Account* shots the card is clipped at the left and right
edges.

Static analysis produced two separate findings.

**Finding A — horizontal overflow (proven from source, no device needed).**
`specs/26-...md` CON-01 mandates `maxWidth: 480`, `width: '90%'`,
`alignSelf: 'center'` on dialogs. Paper applies its own horizontal margin to the
**same** node (`node_modules/react-native-paper/src/components/Dialog/Dialog.tsx:114-127`):

```js
contentContainerStyle={[
  { borderRadius, backgroundColor,
    marginHorizontal: Math.max(left, right, 26) },   // Dialog.tsx:121
  styles.container,
  style,                                            // app's style prop, merged last
]}
```

On a 390pt-wide iPhone in portrait, `left`/`right` insets are 0, so the Surface
is over-constrained: `0.90 × 390 = 351` **plus** `26 + 26 = 52` → **403pt inside
a 390pt box**. The 13pt excess is clipped on **both** sides. This is the visible
edge clipping, and it is deterministic.

**Finding B — vertical position (NOT proven; deliberately out of scope).**
Paper's `Modal` centers its content by default —
`wrapper: { ...StyleSheet.absoluteFillObject, justifyContent: 'center' }`
(`node_modules/react-native-paper/src/components/Modal.tsx:237-241`). No app
code sets a vertical offset, margin, or transform on any dialog Surface, and
`{ marginTop: top, marginBottom: bottom }` on the wrapper
(`Modal.tsx:213`) would only shrink the centering box, not bottom-anchor the
card. Therefore the reported vertical position **cannot be corrected from the
card style**, and no root cause is established. Additionally, the supplied
screenshots show **no tab bar at the bottom**, so they may be cropped; they are
not sufficient evidence on their own. Per §1.11 no speculative vertical fix is
proposed here.

**Scope note.** All 17 Paper `<Dialog>` instances in 8 files were reviewed
(`app/(tabs)/settings.tsx` ×9, `app/dues.tsx` ×2, `app/add-transaction.tsx` ×2,
`app/add-due.tsx`, `app/login.tsx`, `app/register.tsx`,
`components/ConfirmDialog.tsx`). Only the 2 sites introduced by SPEC-26 set a
percent `width`; the other 8 inherit Paper's default auto width and **cannot**
overflow, so they MUST remain byte-identical (§1.11).

## 2. Constraints

- **CON-01 — No percent-width overflow.** Any dialog style that sets a percent
  `width` MUST also neutralize Paper's inherited `marginHorizontal`, so the
  Surface box is never wider than the modal box on a 390pt-wide screen.
- **CON-02 — SPEC-26 visual intent preserved.** `maxWidth: 480`,
  `width: "90%"`, and `alignSelf: "center"` MUST remain on both sites. The fix is
  additive (`marginHorizontal: 0`), never a replacement of these three values.
- **CON-03 — No vertical change in this spec.** Implementations MUST NOT add
  `contentContainerStyle`, `flex: 1`, wrapper/inset manipulation, transforms,
  `Platform` branches, or a new centering helper for any Paper `Dialog`. The
  cause is unproven (Finding B).
- **CON-04 — Evidence gate for the vertical report.** A vertical-position fix
  MUST be specified separately and MUST cite: (a) an **uncropped** full-screen
  iOS screenshot in which the tab bar is visible, (b) the result of opening the
  same dialog on **web** (`npm run web`), and (c) the iPhone model and Expo Go
  version. Absent all three, the vertical report stays open and unimplemented.
- **CON-05 — Cross-platform invariant.** The change MUST be identical on
  Android, iOS, and Web; MUST add no dependency; MUST change no storage key, API
  contract, route, or native dependency; MUST remain Expo Go-safe and
  Vercel-exportable.
- **CON-06 — Diff discipline.** Only `app/(tabs)/settings.tsx` and
  `components/ConfirmDialog.tsx` may change. The 8 dialogs without a percent
  width MUST stay byte-identical. No new production file.
- **CON-07 — Verification.** `utils/dialogSurfaceWidth.test.ts` MUST guard
  ACC-01..03 and MUST be parameterized by `Platform.OS` for `android`, `ios`,
  and `web`. The user runs `npx jest`, `npm run lint`, and `npx tsc --noEmit`
  and pastes the output (§1.3 — the agent MUST NOT run these).

## 3. Goal

| Platform | Objective (machine-checkable) | Subjective (reviewer check) |
|---|---|---|
| Android | **ACC-01:** The guard test passes with `Platform.OS = "android"` and asserts both dialog styles neutralize the inherited horizontal margin while keeping `maxWidth: 480`, `width: "90%"`, `alignSelf: "center"`. | **ACC-S01:** In Expo Go, open Settings → *Delete Account* and one shared `ConfirmDialog` (e.g. delete a due or a transaction). Confirm the card is fully inside the screen with no left/right clipping, and its rounded corners and shadow are both visible. |
| iOS | **ACC-02:** The guard test passes with `Platform.OS = "ios"` and asserts the same invariants as ACC-01. | **ACC-S02:** On the reporting iPhone in Expo Go, repeat ACC-S01 and confirm the card is no longer clipped on either edge. While the dialog is open, record **whether the card is vertically centered and whether the bottom action row is fully visible** — this is observation only and is the evidence for §6 (it does not gate this spec). |
| Web | **ACC-03:** The guard test passes with `Platform.OS = "web"` and asserts the same invariants as ACC-01. | **ACC-S03:** After `expo export --platform web`, open the same dialogs in a desktop browser and confirm the card is a centered modal of at most 480px wide with no edge clipping. Record whether the card is vertically centered. |

Resolved decisions (per user call 2026-10-08 — "Isulat ang spec ngayon"):

- **DEC-01:** The fix is `marginHorizontal: 0` on the dialog style — not
  `'auto'`, and not removing `width: "90%"`. It is one added line per file, it
  overrides Paper's inherited margin by merge order, and `alignSelf: "center"`
  already provides horizontal centering.
- **DEC-02:** The vertical-centering report is **deferred** to its own spec
  after the CON-04 evidence is collected. This spec is written and implemented
  without it.
- **DEC-03:** Only the 2 SPEC-26 sites change; the other 8 Paper dialogs are
  untouched (CON-06).

### Acceptance criteria — Objective (machine-checkable)

- **ACC-01:** `app/(tabs)/settings.tsx` `styles.dialog` and
  `components/ConfirmDialog.tsx`'s `Dialog` style each contain
  `marginHorizontal: 0`, and each still contains `maxWidth: 480`,
  `width: "90%"`, and `alignSelf: "center"`.
- **ACC-02:** `utils/dialogSurfaceWidth.test.ts` scans `app/` and `components/`
  and asserts that **no** file contains a percent dialog width (`width: "9…"`
  style) without `marginHorizontal` in the same style object, so a future
  SPEC-26-style addition cannot silently reintroduce Finding A.
- **ACC-03:** The same test asserts the arithmetic that documents the defect:
  with a 390pt box, `0.9 * 390 + 52 > 390` (Paper's inherited margin overflows)
  while `0.9 * 390 + 0 <= 390` (the fix does not), and that on a 390pt phone
  the `maxWidth: 480` cap does not bind, so the percent width governs.
- **ACC-01..03** MUST each run three times, once per `Platform.OS` value
  (`android`, `ios`, `web`).

### Acceptance criteria — Subjective (reviewer-judged)

- **ACC-S01..S03:** Follow the per-platform steps in the Goal matrix. Pass only
  if no edge of the card is clipped on any platform and the card reads as a
  centered modal. The vertical position is recorded, not judged, under this
  spec.

## 4. Deliverables

- **D-01:** `app/(tabs)/settings.tsx` — add `marginHorizontal: 0` to
  `styles.dialog`. No other edit in this file.
- **D-02:** `components/ConfirmDialog.tsx` — add `marginHorizontal: 0` to the
  `Dialog` style. No other edit in this file.
- **D-03:** Add `utils/dialogSurfaceWidth.test.ts` covering ACC-01..03,
  parameterized by `Platform.OS` (`android`, `ios`, `web`), following the
  source-scan guard pattern of `utils/settingsAccountMode.test.ts`. No new
  production code.
- **D-04:** Record in `docs/savepoint.md` that Finding A is fixed, that the 8
  non-percent-width dialogs were reviewed and intentionally left untouched, and
  that Finding B (vertical centering) is **open**, listing the three CON-04
  evidence items. Append a matching `Current status` entry to `AGENTS.md` §3.
- **D-05:** Amend `specs/26-responsive-dialogs-and-clear-data-flow.md` CON-01
  with a pointer to SPEC-65 (one-home rule, §1.14) noting the additive
  `marginHorizontal: 0` requirement.

## 5. Glossary

- **Surface:** the Paper-rendered node that carries `contentContainerStyle`,
  i.e. the visible dialog card.
- **Wrapper:** Paper's `absoluteFill` + `justifyContent: 'center'` container
  that vertically centers the Surface inside the modal (`Modal.tsx:237-241`).
- **Percent-width overflow:** the Surface box exceeding the modal box because a
  percent `width` is combined with Paper's inherited `marginHorizontal`
  (`Dialog.tsx:121`), clipping both edges.
- **Evidence gate:** the CON-04 list of facts that must exist in a spec before a
  vertical-position change may be implemented.

## 6. References

- `app/(tabs)/settings.tsx` (`styles.dialog`, lines 116-120)
- `components/ConfirmDialog.tsx` (Dialog style, line 33)
- `node_modules/react-native-paper/src/components/Dialog/Dialog.tsx` (lines 114-127)
- `node_modules/react-native-paper/src/components/Modal.tsx` (lines 186-241)
- `specs/26-responsive-dialogs-and-clear-data-flow.md` (CON-01, ACC-01, ACC-02)
- `specs/04-connection-status-vs-offline-mode.md` (spec template)
- `utils/settingsAccountMode.test.ts` (guard-test pattern)
- `AGENTS.md` §1.1, §1.3, §1.9, §1.10, §1.11, §1.12, §1.14

## 7. Open / deferred (non-normative)

- **Reported but not fixed here:** dialogs render in the lower part of an
  iPhone screen instead of vertically centered, on the two screens supplied
  (Settings → *Delete Account*, Dues → *Pay*). Root cause unproven; Paper
  centers by default. Blocked on CON-04 evidence. Candidate fixes, **to be
  decided in a future spec, not here**: (i) if web also reproduces, the cause is
  in app style/insets and a style-level fix applies; (ii) if web is correct,
  the cause is the native modal window on iOS and the fix is a deterministic
  `contentContainerStyle` centering container with the card moved inside it —
  a larger diff touching dialog structure, which §1.11 forbids without a spec.
- **Not yet reviewed:** the hand-rolled `components/CalculatorDialog.tsx`
  already centers its sheet via `contentContainerStyle={{ flex: 1 }}` and is
  explicitly **out of scope** (non-goals); the user named it as an example of
  correct behavior, not as a defect.