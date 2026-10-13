# SPEC-104: Dues Alert Dialog Not Centered on Android

| Field | Value |
|-------|-------|
| **ID** | SPEC-104 |
| **Title** | Dues Alert Dialog (`Transaction Recorded`) Not Centered on Android |
| **Status** | FINAL v1.0 (per user call 2026-10-13 — implement as written; DEC-02 confirmed: no KAV/ScrollView) |
| **Owner** | @rcluc |
| **Version** | 1.0 FINAL |
| **Scope** | `app/dues.tsx` (`alertDialog` block, `app/dues.tsx:722-737`) + new guard file `utils/duesAlertDialogCentered.test.ts` |
| **Non-goals** | No change to dialog content, copies, icon selection, or any other dialog in any file; no new wrapper pattern (strict 2026-10-13 / `ConfirmDialog` mirror); no dependency change; **no KAV/ScrollView wrap** — this dialog has no text input |

---

## Conventions

The key words **MUST**, **MUST NOT**, **REQUIRED**, **SHALL**, **SHALL NOT**, **SHOULD**, **SHOULD NOT**, **RECOMMENDED**, **MAY**, and **OPTIONAL** in this document are to be interpreted as described in RFC 2119.

---

## Context

User report (2026-10-13, Android, screenshot): pay a due → the **`Transaction Recorded`** dialog renders low in the screen, not vertically centered (in the reference screenshot it sits in the lower half, below the visible fold area, while the screen above stays dim and empty).

Code trace: the dues `alertDialog` block (`app/dues.tsx:722-737`) is still a **bare React Native Paper `<Dialog>` nested inside `<Portal>`**. This is the last result/feedback dialog in `app/` on that pattern — the identical defect was already fixed on 2026-10-13 for `app/login.tsx` ("Login Failed"), `app/(tabs)/settings.tsx` ("Cleared Successfully"), `app/edit-transaction.tsx` ("Saved Successfully"), and `components/ConfirmDialog.tsx` + `app/transaction-details.tsx` ("Delete Transaction?" / "Deleted Successfully"), all of which now render `NativeModal` + centered scrim `View` + `Surface elevation={3} style={styles.dialog}` and are confirmed centered. `add-due.tsx:255`, `add-transaction.tsx:512`, `settings.tsx:1708`, and `register.tsx:169` are the same pattern class and remain open as adjacent rot (own specs, see `docs/savepoint.md`).

This single `alertDialog` block serves **all** dues feedback — success (`Transaction Recorded`, line 317) and validation/error (`Invalid Input`, `Invalid Amount`, `Invalid Category`, `Error`, `Insufficient Balance`, lines 198–238, 322). Fixing the one block therefore centers every dues dialog at once. Because the block contains no `TextInput`, no `KeyboardAvoidingView`/`ScrollView` wrap is required — the reference mirror (`components/ConfirmDialog.tsx:35-88`) has none either.

**User decisions captured (2026-10-13):**
- Scope: **`app/dues.tsx` only** ("ito nalang") — the remaining screens keep their current behavior and need their own specs.

---

## Constraints

| ID | Constraint |
|----|------------|
| **CON-01** | The screen **MUST** remain fully functional on **Android, iOS, and Web** (Expo SDK 57); Expo Go import-safe; Vercel-deployable. |
| **CON-02** | The fix **MUST** mirror the 2026-10-13 reference wrapper exactly (`components/ConfirmDialog.tsx:35-88`): `NativeModal` (`visible`, `transparent`, `animationType="fade"`, `presentationStyle="overFullScreen"`, `onRequestClose` mirroring today's `onDismiss`) → scrim `View` (`flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "rgba(0, 0, 0, 0.32)"`) → tap-outside `Pressable` (`StyleSheet.absoluteFill`) → `Surface elevation={3} style={styles.dialog}` containing the existing `Dialog.Icon` / `Dialog.Title` / `Dialog.Content` / `Dialog.Actions`. No new wrapper pattern, no KAV, no ScrollView. |
| **CON-03** | Dialog **content MUST** stay byte-identical: the `Dialog.Icon` expression (`alertDialog.title === "Error" \|\| alertDialog.title === "Insufficient Balance" ? "alert-circle-outline" : "check-circle-outline"`), the `Dialog.Title` with `textAlign: "center"` and `{alertDialog.title}`, the `Dialog.Content` `Text variant="bodyMedium"` with `textAlign: "center", lineHeight: 22` and `{alertDialog.message}`, the centered `Dialog.Actions` and its `Button mode="contained"` labelled `OK`. |
| **CON-04** | Handler wiring **MUST** stay byte-identical: every dismiss is `setAlertDialog((prev) => ({ ...prev, visible: false }))` — for `onRequestClose`, the scrim `Pressable`, and the OK button. No state clearing added, no close-path change. |
| **CON-05** | The `<Portal>` wrapper around this block **MUST** be removed along with it (it is dead once `NativeModal` owns the overlay). `Portal` **MUST** stay imported — the pay dialog and date-picker `Modal` still use it. |
| **CON-06** | Imports **MUST** be widened minimally and only inside these two lines: `react-native` line gains `StyleSheet` and `Modal as NativeModal`; the `react-native-paper` line gains `Surface`. No other import line changes; no new dep; no test-only import into app code. (User call 2026-10-13: **no** `KeyboardAvoidingView`/`ScrollView` addition — DEC-02.) |
| **CON-07** | `styles.scrim` / `styles.dialog` **MUST** be added to a `StyleSheet.create` in `app/dues.tsx` with the reference values (`maxWidth: 480, width: "90%", alignSelf: "center", marginHorizontal: 0, borderRadius: 16, overflow: "hidden"`), per SPEC-65/SPEC-71. The file currently has no `StyleSheet` — adding one is REQUIRED, not optional. |
| **CON-08** | No code, config, or dependency change before this spec is marked **FINAL** by the user (AGENTS §1.1). |
| **CON-09** | **MUST** follow the SPEC-04 template and the AGENTS.md §1.10 platform matrix (Objective vs Subjective). |
| **CON-10** | Bare-minimum diff (AGENTS §1.11): ONLY the `alertDialog` block, the two import lines named in CON-06, and the new style entries. No refactor, no drive-by cleanup of the other four bare `<Dialog>` blocks. |

---

## Goal

The dues feedback dialog renders vertically and horizontally centered on Android exactly as it already does on iOS and Web, with the dim scrim filling the screen, and every dues success/error dialog in the block behaves as it does today apart from position.

### Interaction Matrix

| State | Expected |
|-------|----------|
| Pay a due → `Transaction Recorded` | Dialog centered (Android); OK dismisses; identical content |
| Validation error (empty title / amount / category, over ₱10M) | Same centered dialog with the alert icon |
| `Error` / `Insufficient Balance` | Same centered dialog with the alert icon |
| Tap the scrim | Dialog closes (mirrors `onDismiss`) |
| Android hardware back | Dialog closes (mirrors `onDismiss`) |

### Decisions

| ID | Decision |
|----|----------|
| **DEC-01** | Strict 2026-10-13 / `ConfirmDialog` mirror (fifth instance of the solved class, same repo precedent) — rejected: a bespoke offset/`marginTop` tweak, which would introduce a second pattern to maintain and break on other viewport heights. |
| **DEC-02** | No KAV/ScrollView wrap — the block has no `TextInput` (contrast SPEC-102, where the keyboard was the failing control). Mirrors `ConfirmDialog.tsx`, which also ships wrapper-only. |
| **DEC-03** | Content frozen (CON-03/CON-04) — this spec fixes position only; any copy or behavior change to the dues feedback flow needs its own spec. |
| **DEC-04** | New SPEC-104 file owns the dues `alertDialog` wrap; the 2026-10-13 change entry and `ConfirmDialog.tsx` stay the pattern owners and are NOT edited (§1.14). |
| **DEC-05** | The other four bare `<Dialog>` blocks (`add-due.tsx:255`, `add-transaction.tsx:512`, `settings.tsx:1708`, `register.tsx:169`) are out of scope per the user call — recorded as adjacent rot in `docs/savepoint.md`, not fixed here. |

### Acceptance Criteria

| ID | Criterion | Type |
|----|-----------|------|
| **ACC-01** | Source scan of `app/dues.tsx`: the `alertDialog` block holds a `NativeModal` (`transparent`, `animationType="fade"`, `presentationStyle="overFullScreen"`) whose `visible` is `alertDialog.visible`, containing the scrim `View`, a `StyleSheet.absoluteFill` dismiss `Pressable`, and a `Surface elevation={3} style={styles.dialog}` wrapping the existing `Dialog.Icon`/`Title`/`Content`/`Actions`. | Objective |
| **ACC-02** | Source scan: dialog content byte-identical — the icon ternary, `Dialog.Title` with `{alertDialog.title}`, the centered body `Text` with `lineHeight: 22`, the centered `Dialog.Actions`, and the `OK` `Button mode="contained"` all present and unchanged. | Objective |
| **ACC-03** | Source scan: all three dismiss paths (`onRequestClose`, scrim `Pressable`, OK `Button`) call `setAlertDialog((prev) => ({ ...prev, visible: false }))`; the block has no `KeyboardAvoidingView` and no `ScrollView`. | Objective |
| **ACC-04** | Source scan: `react-native` import line contains `StyleSheet` and `Modal as NativeModal`; `react-native-paper` import line contains `Surface`; `styles.scrim` / `styles.dialog` exist with the pinned values; the file still imports `Portal` and still contains `alertDialog` consumers outside this block (title/amount/category/error setters + `Transaction Recorded`). | Objective |
| **ACC-05** | Source scan: `app/` contains exactly one `NativeModal` for the dues screen and the four out-of-scope bare `<Dialog>` sites are untouched (`add-due.tsx:255`, `add-transaction.tsx:512`, `settings.tsx:1708`, `register.tsx:169` each still present verbatim). | Objective |
| **ACC-S01** | Reviewer on Android (Expo Go): Scheduled → pay a due → Confirm → `Transaction Recorded` renders **vertically centered** with the dim scrim behind it; tap OK and tap the scrim both dismiss; hardware back dismisses. FAIL = dialog anchored low or scrim missing. | Subjective |
| **ACC-S02** | Reviewer on Android + iPhone (Expo Go): trigger a validation error (`Add Due` with empty amount, or pay with `Insufficient Balance`) → same centered dialog with the alert icon, correct copy. FAIL = wrong icon/copy or off-center render. | Subjective |
| **ACC-S03** | Reviewer on Web (`npx expo start --web` or web export): pay a due → same centered dialog, no console error, page behind the modal inert; no visual regression vs today apart from position. FAIL = console error, blank overlay, or regression. | Subjective |

---

## Platform Matrix (AGENTS.md §1.10)

| Platform | Objective (machine-checkable) | Subjective (reviewer-observed) |
|----------|-------------------------------|-------------------------------|
| **Android** | ACC-01..ACC-05 pass with `Platform.OS === "android"`. | Expo Go: centered `Transaction Recorded`, dismiss paths, error dialogs (ACC-S01/S02). |
| **iOS** | Same guards with `Platform.OS === "ios"`. | Expo Go: unchanged position (already correct), same dismiss paths (ACC-S02). |
| **Web** | Same guards with `Platform.OS === "web"`. | Web: centered dialog, no console error, inert backdrop (ACC-S03). |

TDD coverage (§1.10): new `utils/duesAlertDialogCentered.test.ts` covers ACC-01..ACC-05 parameterized by `Platform.OS` (`android`/`ios`/`web` via mock); ACC-S01..S03 are user-run manual checks exactly as written above (vertical centering on a device viewport is not jest-provable — guards pin the wrapper shape, the frozen content, and the imports).

---

## Deliverables

| ID | Deliverable |
|----|-------------|
| **D-01** | `app/dues.tsx` ONLY: replace the bare-Paper-`Dialog` `alertDialog` block (`app/dues.tsx:722-737`) with the CON-02 wrapper, drop its dead `<Portal>` wrapper, widen the two CON-06 import lines, and add the CON-07 style entries. No other line in the file changes. |
| **D-02** | New `utils/duesAlertDialogCentered.test.ts` (named here per §1.11): guards for ACC-01..ACC-05 × android/ios/web. `blockOf()` **MUST** anchor on the opener via `lastIndexOf("<NativeModal", anchor)` and **MUST NOT** slice from `visible=` (SPEC-93 test-harness lesson recorded 2026-10-11). |
| **D-03** | Docs after implementation (AGENTS §1.8, post-FINAL only): `docs/savepoint.md` entry + `AGENTS.md` §3 status line, including the DEC-05 adjacent-rot note. NOT part of the spec-writing step; implemented after D-01/D-02 are verified (user-run jest/lint/tsc per §1.3). |

---

## Glossary

| Term | Definition |
|------|------------|
| **Scrim** | The `rgba(0, 0, 0, 0.32)` full-screen dismiss layer behind the `Surface`. |
| **Bare Paper `<Dialog>`** | React Native Paper's `Dialog` rendered directly inside `Portal` — the pattern that anchors low on Android in this app's tree. |
| **2026-10-13 reference wrapper** | `components/ConfirmDialog.tsx:35-88` — `NativeModal` + scrim + tap-outside `Pressable` + `Surface elevation={3} style={styles.dialog}`, no KAV. |
| **Dues `alertDialog`** | The single `useState` block in `app/dues.tsx:71-73` driving every success/validation/error dialog on the Scheduled screen. |

---

## References

- `app/dues.tsx:722-737` (the bare `<Dialog>` site slated for conversion)
- `components/ConfirmDialog.tsx:35-88` (the reference wrapper — unedited, pattern owner)
- `app/edit-transaction.tsx:357-383` and `app/transaction-details.tsx` (2026-10-13 siblings — unedited)
- `specs/65-dialog-width-overflow-and-centering-diagnosis.md` (`marginHorizontal: 0` rationale, CON-03 open state)
- `specs/71-change-passcode-modal-rounded-corners.md` (`borderRadius: 16` precedent)
- `docs/savepoint.md` 2026-10-13 entry (the five already-converted dialogs)
- `AGENTS.md` §1.1 (spec-first), §1.9 (spec format), §1.10 (platform matrix + TDD), §1.11 (bare-minimum), §1.12 (no new deps), §1.14 (one home)
