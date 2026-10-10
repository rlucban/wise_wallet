# SPEC-85 — Delete/Edit Success + Failure Toasts

| Field | Value |
|---|---|
| ID | SPEC-85 |
| Title | Global toast feedback for transaction delete and edit outcomes |
| Status | FINAL v1.2 (v1.0 + v1.1 + v1.2 per user calls 2026-10-10 — implementable) |
| Owner | User |
| Version | 1.2 FINAL |
| Scope | `app/transaction-details.tsx` (delete handler) + `app/edit-transaction.tsx` (save handler) + one new guard file `utils/mutationFeedback.test.ts` |
| Non-goals | No validation-rule change (pre-submit `Alert`s stay); no confirm-dialog change; no edit-screen layout change; no ToastContext/provider change; no new deps; no SPEC-05 document edit |

RFC 2119 terminology (MUST/MUST NOT/SHOULD) applies.

## Context

Transaction delete (`transaction-details.tsx:50-56`) succeeds silently
(back-nav, no feedback) and its failure path is UNCAUGHT (thrown error
escapes `handleDelete` — red box in dev, as user-reported). Edit save
(`edit-transaction.tsx:149-167`) succeeds silently and fails via native
`Alert.alert`. User call 2026-10-10: both operations MUST display
validation feedback ("successfully" style). Surface call: the global
`ToastContext` Snackbar (`context/ToastContext.tsx`, provider composed
above the nav tree at `app/_layout.tsx:357`, 5s + OK action) — transient,
non-blocking, survives back-navigation, same mechanism as SPEC-05's
conflict toasts (precedent: `CategoriesContext.tsx:65`).

## Constraints

- **CON-01** Every change MUST keep Android + iOS + Web working, stay
  Expo Go (latest) import-safe, and stay Vercel-deployable.
- **CON-02** No new npm packages, native modules, fonts, or third-party code
  (AGENTS §1.12).
- **CON-03** Delete (`handleDelete`): wrap in try/catch. Success →
  `showToast("Deleted successfully")`, close confirm, then back (toast
  outlives the navigation via the provider). Failure → close confirm,
  STAY on screen, `showToast` with the thrown message if `Error` else
  `"Failed to delete transaction. Please check your connection."`
  (the context's own default — no new copy).
- **CON-04** Edit (`handleSave`): success → `showToast("Saved
  successfully")`, then back (same order). Failure → `showToast` with
  the same rule as CON-03 (generic: `"Failed to save changes. Please
  check your connection."` — today's native-`Alert` text, new surface),
  stay on screen with `loading` reset. Pre-submit validation `Alert`s
  (amount/category) MUST stay byte-identical.
- **CON-05** Exact success copy (`Deleted successfully` /
  `Saved successfully`) is user-approved wording, FINAL-adjustable on
  request. Failure copy reuses existing generics — zero invented strings.
- **CON-06** Only additions: `useToast` import + hook call per screen and
  the specified handler bodies. No layout, style, dialog, validation, or
  navigation-target change.
- **CON-07** Identical on Android, iOS, and Web — no `Platform.OS` branch.
  Any platform branch needs its own amendment first (§1.10).
- **CON-08** No code, config, or dependency change before this spec is marked
  FINAL by the user (AGENTS §1.1, §1.10 CON-10 pattern).

## Goal

Every delete/edit ends with visible feedback — success or failure — and
failures never red-box again.

### Interaction matrix

| Surface | Action | Expected |
|---|---|---|
| Details | Confirm delete (ok) | Toast `Deleted successfully`; back to list |
| Details | Confirm delete (fail) | Toast with error; stays on screen, dialog closed |
| Edit | Save (ok) | Toast `Saved successfully`; back |
| Edit | Save (fail) | Toast with error; stays, loading reset |
| Both | Invalid input (pre-submit) | Native validation `Alert`s exactly as today |

### Decisions

- **DEC-01** Global toast, not blocking dialogs (user call — transient,
  survives nav, matches the conflict pattern; rejected: two-step OK
  dialogs).
- **DEC-02** Same surface for failures (user call scope "validation";
  rejected: keeping native `Alert` on edit-fail and the uncaught throw
  on delete-fail).
- **DEC-03** Toast-before-back ordering (rejected: navigating first —
  the toast must be enqueued while its caller is still mounted... it
  survives regardless via provider, but enqueue-first is the safe order).
- **DEC-04** New SPEC-85 file owns delete/edit feedback; SPEC-05 keeps
  the toast mechanism, documents never edited (§1.14).

### Acceptance

Objective — deterministic, machine-checkable (jest, parameterized by
`Platform.OS` = `android` / `ios` / `web` via mock):

- **ACC-01** Source scan: details handler calls `showToast("Deleted
  successfully")` then back-nav, inside try/catch with an error toast
  on failure. Holds on android/ios/web.
- **ACC-02** Source scan: edit handler calls `showToast("Saved
  successfully")` then back-nav on success; failure shows a toast
  (today's generic preserved); pre-submit validation `Alert`s intact.
  Holds on android/ios/web.
- **ACC-03** Source scan: both screens import/use `useToast`; no layout,
  dialog, validation, route, dep, or `Platform.OS` change. Holds on
  android/ios/web.

Subjective — human-judged UX as observable reviewer checks (explicit
pass/fail observation steps, user-run per AGENTS §1.3 — agent never runs CLIs):

- **ACC-S01** Reviewer on Android/iOS (Expo Go) confirms: delete success
  toasts then returns; forced-failure (e.g. airplane-mode delete of an
  unsynced row) toasts the error with no red-box and stays; edit save
  toasts then returns; validation alerts unchanged. FAIL = silent
  outcome, red-box, or stuck screen.
- **ACC-S02** Reviewer on Web confirms ACC-S01 identically, no console
  error (expected errors surface as toasts, not console noise beyond
  the context's existing log). FAIL = any web-only deviation (triggers a
  CON-07 amendment, not a silent branch).

TDD coverage (§1.10): `utils/mutationFeedback.test.ts` covers
ACC-01..ACC-03 parameterized by `Platform.OS` (android/ios/web); ACC-S01/S02
are user-run manual checks exactly as written above (toasts and
navigation are not jest-renderable — guards pin the handler contract).

## Deliverables

- **D-01** `app/transaction-details.tsx` ONLY: `handleDelete` per
  CON-03 (+ `useToast` wiring). No other line in the file changes.
- **D-02** `app/edit-transaction.tsx` ONLY: `handleSave` per CON-04
  (+ `useToast` wiring). No other line in the file changes.
- **D-03** `utils/mutationFeedback.test.ts` (new file, named here
  per §1.11): guards for ACC-01..ACC-03 × android/ios/web.
- **D-04** Docs after implementation (AGENTS §1.8, post-FINAL only):
  `docs/savepoint.md` entry + `AGENTS.md` §3 status line. NOT part of the
  spec-writing step; no doc edit ships with the DRAFT.

## Glossary

- **Toast:** the provider-level `Snackbar` (`showToast`, 5s, OK action).
- **Validation display:** a visible success/failure message for every
  completed mutation (never silent, never red-box).

## References

- `AGENTS.md` (§1.9 spec format, §1.10 TDD/platform matrix, §1.11
  bare-minimum, §1.12 no new deps, §1.14 one home)
- `specs/04-connection-status-vs-offline-mode.md` (template)
- `specs/05-multi-device-behavior.md` (SPEC-05 — toast mechanism home;
  document NOT amended)
- `context/ToastContext.tsx` (provider above nav tree), `app/_layout.tsx:357`
- `app/transaction-details.tsx:50-56` (uncaught delete), `app/edit-transaction.tsx:129-167`

---

## v1.1 Amendment — Screenshot-style result dialogs (PROPOSED, not yet FINAL)

User call 2026-10-10 with screenshot (the `Delete Transaction?`
`ConfirmDialog`: centered white rounded box, top icon, centered title +
message, action buttons): success feedback MUST NOT sit at the bottom —
it MUST use the same centered-modal design, and failure feedback joins
it there (user call). v1.0 sections stay normative; where this amendment
conflicts, v1.1 governs once marked FINAL. Explicit supersessions:
CON-03/CON-04 (toast surface) → CON-10/CON-11 (dialog surface);
ACC-01/ACC-02 → ACC-04/ACC-05 below (ACC-03/S01/S02 stand, re-run).

### v1.1 Constraints (delta)

- **CON-10** Delete result: a Paper `Dialog` matching the
  `ConfirmDialog` visual contract (responsive style identical to
  `ConfirmDialog`'s — `maxWidth: 480`, `width: "90%"`,
  `alignSelf: "center"`, `marginHorizontal: 0` per SPEC-26/SPEC-65 — top
  `Dialog.Icon`, centered `Dialog.Title` + message, single centered
  contained `OK` button). Success → icon `check-circle-outline`,
  title `Deleted Successfully`, message `The transaction has been
  deleted.`; OK closes then back-navs (same order as v1.0). Failure →
  icon `alert-circle-outline`, title `Delete Failed`, message = thrown
  text or today's generic; OK closes, STAYS on screen. The `try/catch`
  stays (red-box fix stands).
- **CON-11** Edit result: same dialog contract on the edit screen.
  Success → `Saved Successfully` / `Your changes have been saved.` →
  OK → back. Failure → `Save Failed` + error text → OK → stay with
  `loading` reset. Pre-submit validation `Alert`s stay byte-identical.
  Exact titles/messages are user-approved wording, FINAL-adjustable.
- **CON-12** The v1.0 `showToast` wiring (import + hook + calls) MUST be
  removed from both screens (otherwise unused-var lint failures). No
  other line in either file changes.
- **CON-13** No v1.1 code beyond D-04..D-06. Confirm dialog, validation,
  navigation targets, `ToastContext`, and SPEC-05 all stand.

### v1.1 Goal (delta)

| Surface | Action | Expected |
|---|---|---|
| Details | Confirm delete (ok) | Centered success dialog (screenshot design); OK → back to list |
| Details | Confirm delete (fail) | Centered error dialog; OK → stay, no red-box |
| Edit | Save (ok / fail) | Same success/error dialog pattern; OK → back / stay |

Decisions:

- **DEC-05** Screenshot-design dialogs for both outcomes (user calls;
  rejected: keeping any toast on these paths).
- **DEC-06** Single-OK-button dialog per screen, inline (Paper `Dialog`
  mirroring `ConfirmDialog` visuals + dues `alertDialog` structure;
  rejected: reusing two-button `ConfirmDialog`, new shared component).
- **DEC-07** v1.1 amends in place; SPEC-05 keeps the toast mechanism for
  its own (conflict) callers, documents never edited (§1.14).

Acceptance (all × android/ios/web where machine-checkable):

- **ACC-04** Source scan: details screen holds a result dialog with
  `check-circle-outline` + `Deleted Successfully` and
  `alert-circle-outline` + `Delete Failed`, single OK wiring back-nav
  on success only, `try/catch` retained, zero `showToast` in the file.
  Holds on android/ios/web.
- **ACC-05** Source scan: edit screen holds the same contract
  (`Saved Successfully` / `Save Failed`, OK → back / stay, loading
  reset), validation `Alert`s intact, zero `showToast` in the file.
  Holds on android/ios/web.
- **ACC-S03** Reviewer on Android/iOS (Expo Go) confirms: success and
  error dialogs match the screenshot design (icon/title/message/button,
  centered, rounded); flows behave per matrix; no toast appears on
  these paths. FAIL = bottom toast remnant or design mismatch.
- **ACC-S04** Reviewer on Web confirms ACC-S03 identically, no console
  error. FAIL = any web-only deviation.

### v1.1 Deliverables (delta)

- **D-04** `app/transaction-details.tsx` ONLY: result dialog + handler
  rewiring + `useToast` removal per CON-10/CON-12. No other line changes.
- **D-05** `app/edit-transaction.tsx` ONLY: same per CON-11/CON-12.
  No other line changes.
- **D-06** `utils/mutationFeedback.test.ts`: rewritten guards for
  ACC-04/05 × android/ios/web (superseded toast pins replaced).
- **D-07** Docs after v1.1 implementation (AGENTS §1.8, post-FINAL only):
  `docs/savepoint.md` entry + `AGENTS.md` §3 status line.

---

## v1.2 Amendment — Success dialog survives row removal (PROPOSED, not yet FINAL)

User-reported defect 2026-10-10: delete succeeds but the screen shows
`Transaction not found` instead of the success dialog. Root cause, traced
in source (no device needed): `deleteTransaction` removes the row from
context → the `[id, transactions]` effect re-runs → `setTransaction(null)`
→ the early-return "not found" view (lines 58-64) preempts the whole tree
INCLUDING the result dialog, before `safeGoBack` unmounts the screen. The
dialog state is set correctly — it simply never paints. v1.0/v1.1 sections
stay normative; where this amendment conflicts, v1.2 governs once marked
FINAL.

### v1.2 Constraints (delta)

- **CON-14** The lookup effect MUST keep the stale transaction object
  while the result dialog is visible: `if (!found &&
  resultDialog.visible) return;` with `resultDialog.visible` added to
  deps. Nothing else in the effect or the early-return branch changes —
  genuine not-found rows (bad id, no dialog) still render the text.
- **CON-15** No v1.2 code beyond D-08/D-09. Edit screen needs no change
  (updates never null the row).

### v1.2 Goal (delta)

| Surface | Action | Expected |
|---|---|---|
| Details | Confirm delete (ok) | Success dialog paints over the (dimmed) details; OK → back; never the not-found text |

Decisions:

- **DEC-08** Guard the effect, not the JSX (one conditional return vs
  restructuring/duplicating the dialog; rejected: moving dialog above
  the early return, extracting a shared node).

Acceptance (all × android/ios/web where machine-checkable):

- **ACC-06** Source scan: the lookup effect early-outs when the row is
  missing AND the result dialog is visible (deps include the flag);
  early-return text branch otherwise intact.
- **ACC-S05** Reviewer on Android/iOS (Expo Go) confirms: delete shows
  the success dialog (never not-found text); OK returns; genuinely
  missing ids still show the text. FAIL = any deviation.
- **ACC-S06** Reviewer on Web confirms ACC-S05 identically. FAIL = any
  web-only deviation.

### v1.2 Deliverables (delta)

- **D-08** `app/transaction-details.tsx` ONLY: effect guard per CON-14.
  No other line in the file changes.
- **D-09** `utils/mutationFeedback.test.ts`: new ACC-06 guard ×
  android/ios/web.
- **D-10** Docs after v1.2 implementation (AGENTS §1.8, post-FINAL only):
  `docs/savepoint.md` entry + `AGENTS.md` §3 status line.
