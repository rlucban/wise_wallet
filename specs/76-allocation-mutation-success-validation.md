# SPEC-76 — Allocation Mutation Success Validation (Delete / Archive / Restore)

| Field | Value |
|---|---|
| ID | SPEC-76 |
| Title | Confirmed success/failure feedback for allocation delete, archive, and restore |
| Status | **FINAL** (v1.1, 2026-10-10 per user call) |
| Owner | User (final authority) |
| Version | 1.1 — modal-dialog presentation (v1.0 was Snackbar; see History) |
| Scope (this repo) | `hooks/useSavings.ts`, `app/savings.tsx`, `app/archived-allocations.tsx`, `components/ConfirmDialog.tsx`, `utils/savingsArchive.test.ts`, `docs/savepoint.md`, `AGENTS.md §3` |
| Non-goals | The missing-item guard (item-not-found) beyond today's `if (!item) return`; changing persistence, sync, storage keys, routes, or API contract; SPEC-73/74/75 behavior; `useDues`; changing `ConfirmDialog` behavior for its other callers; any new dependency or new dialog component |
| Normative source | This file. File+symbol cites are normative; `:line` numbers are hints only. |

## Terminology (RFC 2119)

The keywords **MUST**, **MUST NOT**, **SHOULD**, and **MAY** are interpreted as
described in RFC 2119. Informative prose (examples, "today", "currently") is
non-normative unless restated as a requirement.

## 1. Context

### 1.1 Problem

Allocation mutations give untrustworthy feedback:

- **Active delete** (`app/savings.tsx` `confirmDelete`) calls
  `await deleteItem(id)` with **no try/catch and no success message** — the
  reported trigger ("No feedback on active delete"). The card disappears only
  because state is optimistically updated.
- **`deleteItem`** (`hooks/useSavings.ts`) swallows failures: its `catch` logs
  `console.error("Error deleting savings item:", error)` and does **not**
  rethrow. Callers therefore cannot tell success from failure. (Contrast
  `updateItem`, which rethrows — SPEC-73 CON-06.)
- **Archived delete** (`app/archived-allocations.tsx` `confirmDelete`) showed
  `"Archived allocation deleted permanently"` unconditionally, because the
  swallowed failure never reached its `catch` — a **false success** on web.
- **Archive** and **restore** reported failures via a blocking
  `Alert.alert("Error", …)`.

The two surfaces also diverge in wording and success/failure presentation.

### 1.2 Definitions

- **Authoritative delete:** the awaited operation whose failure may surface to
  the caller — the web `authFetch("savingsItems/{id}", { method: "DELETE" })`
  when `!ok`, or the native `repos.savingsItems.deleteById(id)`.
- **Queued sync rejection:** the asynchronous server rejection of an already
  enqueued `savingsItems` `delete` (SPEC-73 CON-06). It is processed later by
  `processSyncQueue` and is **not** awaited by `deleteItem`.
- **Confirm-then-report:** a success result is reported **only** after the
  awaited operation resolves; a rejected operation reports an error and
  **never** the success result (user-selected semantics, 2026-10-10).
- **Feedback dialog:** a single-action (OK only) modal dialog built on the
  shared `ConfirmDialog` component, used here to acknowledge a mutation's
  success or failure. Not to be confused with the two-action **confirm
  dialog** that asks the user to approve the delete.

### 1.3 Revision note (v1.1)

v1.0 presented validation as an in-screen Snackbar (`setToastMessage`). Per
user call on 2026-10-10, the validation **appearance changes to a modal
dialog** for all four operations (delete/archive/restore), reusing the existing
`ConfirmDialog` component. The confirm-then-report semantics (CON-01), the
`deleteItem` rethrow (CON-02), the copy (CON-05), and the cross-platform
requirement (CON-03) are unchanged from v1.0.

## 2. Constraints (normative)

- **CON-01 — Confirm-then-report.** Every allocation mutation (delete, archive,
  restore), on both surfaces, MUST present its success result **only** after the
  awaited mutation resolves successfully, and MUST present its error result
  instead when the mutation rejects. A failure MUST NOT present the success
  result.
- **CON-02 — `deleteItem` rethrows.** `hooks/useSavings.ts` `deleteItem` MUST
  rethrow a synchronous failure of the authoritative delete (web `!ok`, native
  repository error), mirroring `updateItem` (SPEC-73 CON-06): its `catch` logs
  then `throw error;`. Its signature and return type MUST NOT change. The web
  `throw new Error("Failed to delete allocation. Please check your
  connection.")` on `!ok` stays. Asynchronous queued sync rejections MUST remain
  unsurfaced to the caller (SPEC-73 CON-06 unchanged).
- **CON-03 — Uniform platforms.** The success/error behavior MUST be identical
  on Android, iOS, and Web. On native the local delete normally succeeds, so the
  success result is the norm; a queued sync failure is not separately surfaced
  (CON-02).
- **CON-04 — Modal-dialog presentation (v1.1).** For the four operations, both
  the success and the failure result MUST be presented in a **modal dialog**
  built on `components/ConfirmDialog.tsx`, with a single action button
  (`OK`). These four handlers MUST NOT call `setToastMessage`; the in-screen
  Snackbar MUST NOT be used to report allocation delete/archive/restore results.
  (`app/savings.tsx` MAY keep its Snackbar for unrelated messages such as
  "Goal Reached! 🎉" and "Failed to update allocation…".)
- **CON-05 — Exact copy.** The following strings MUST be used verbatim:

  | Operation | Result | Dialog title | Dialog message |
  |---|---|---|---|
  | Active delete | success | `Success` | `Allocation deleted` |
  | Active delete | failure | `Error` | `Failed to delete allocation. Please try again.` |
  | Archived delete | success | `Success` | `Allocation deleted` |
  | Archived delete | failure | `Error` | `Failed to delete allocation. Please try again.` |
  | Archive | success | `Success` | `Allocation archived` |
  | Archive | failure | `Error` | `Failed to archive allocation.` |
  | Restore | success | `Success` | `Allocation restored` |
  | Restore | failure | `Error` | `Failed to restore allocation.` |

  The success dialog MUST use the `check-circle-outline` icon and a non-error
  button color (`theme.colors.primary`); the failure dialog MUST use the
  `alert-circle-outline` icon and `theme.colors.error`.
- **CON-06 — Additive `ConfirmDialog` extension.** `components/ConfirmDialog.tsx`
  MUST be extended with backward-compatible optional props: `hideCancel?: boolean`
  (default `false` — must render both actions as today) and `confirmColor?:
  string` (default `theme.colors.error`). All existing callers MUST keep their
  current behavior with no prop changes. The SPEC-26/SPEC-65 dialog style
  (`style={{ maxWidth: 480, width: "90%", alignSelf: "center", marginHorizontal:
  0 }}`) MUST remain byte-identical.
- **CON-07 — No collateral change.** This spec MUST NOT alter persistence, sync,
  LWW/merge, storage keys (`user_{id}_*`), the `wallet-api` contract, navigation
  routes, or native dependencies. The archive/restore success copy is otherwise
  unchanged. SPEC-73/74/75 guards, fetch/seed/lifecycle, and the `ConfirmDialog`
  `loading` prop behavior MUST stay byte-identical except where CON-01..CON-06
  require.
- **CON-08 — Standing repo invariants (AGENTS.md §1).** Android + iOS + Web
  MUST keep working (`Platform.OS`/`select`); Expo Go MUST NOT crash on import;
  web MUST stay Vercel-deployable (`EXPO_PUBLIC_*` only).
- **CON-09 — TDD + platform matrix (AGENTS.md §1.10).** Guards MUST be `jest`
  tests parameterized by `Platform.OS` (`android`/`ios`/`web`) plus user-run
  Expo Go + web-export manual checks. No platform-only behavior.

## 3. Goal

Make every allocation mutation report the truth via a modal acknowledgement
dialog: success only when the awaited operation succeeded, and a clear error
dialog when it failed — the same way on all three platforms.

### 3.1 Interaction matrix

| Action | Screen | Awaited call | Success dialog | Failure dialog |
|---|---|---|---|---|
| Delete (active) | `app/savings.tsx` | `deleteItem(id)` | `Success` / `Allocation deleted` | `Error` / `Failed to delete allocation. Please try again.` |
| Delete (archived) | `app/archived-allocations.tsx` | `deleteItem(id)` | `Success` / `Allocation deleted` | `Error` / `Failed to delete allocation. Please try again.` |
| Archive | `app/savings.tsx` | `updateItem(id, { isArchived: true })` | `Success` / `Allocation archived` | `Error` / `Failed to archive allocation.` |
| Restore | `app/archived-allocations.tsx` | `updateItem(id, { isArchived: false })` | `Success` / `Allocation restored` | `Error` / `Failed to restore allocation.` |

### 3.2 Decisions

- **DEC-01** (user, 2026-10-10) — Scope = delete + archive + restore, on both
  surfaces.
- **DEC-02** — Semantics = confirm-then-report (success only on real success).
- **DEC-03** — `deleteItem` rethrows like `updateItem` (CON-02); no signature
  change.
- **DEC-04** — Uniform across web + native.
- **DEC-05** (v1.1, user call 2026-10-10) — Presentation = modal dialog (not
  Snackbar), for both success and failure, all four operations. Reuse
  `ConfirmDialog` with additive `hideCancel` + `confirmColor` props (CON-06);
  one `OK` action; success = `Success` + check icon + primary color, failure =
  `Error` + alert icon + error color. Archived-delete success copy unified to
  `Allocation deleted`.
- **DEC-06** — The pre-existing `if (!item) return` missing-item guard is left
  as-is; it is not the requested validation.

### 3.3 Acceptance criteria

**Objective (machine-checkable — jest, parameterized by `Platform.OS`
`android`/`ios`/`web`)**

- **ACC-01** `deleteItem`'s `catch` block logs then rethrows
  (`console.error("Error deleting savings item:", error);` immediately followed
  by `throw error;`); its `deleteById` / `authFetch` call sites and the web
  `!ok` throw are unchanged.
- **ACC-02** `app/savings.tsx` `confirmDelete` routes both outcomes through
  `setFeedback(...)` (success `Success`/`Allocation deleted`; failure
  `Error`/`Failed to delete allocation. Please try again.`) and contains no
  `setToastMessage`.
- **ACC-03** `app/savings.tsx` `handleArchiveItem` routes both outcomes through
  `setFeedback(...)` (`Success`/`Allocation archived`;
  `Error`/`Failed to archive allocation.`) and contains no `setToastMessage`.
- **ACC-04** `app/archived-allocations.tsx` `handleRestoreItem` routes both
  outcomes through `setFeedback(...)` (`Success`/`Allocation restored`;
  `Error`/`Failed to restore allocation.`).
- **ACC-05** `app/archived-allocations.tsx` `confirmDelete` routes both outcomes
  through `setFeedback(...)` (`Success`/`Allocation deleted`;
  `Error`/`Failed to delete allocation. Please try again.`); the string
  `Archived allocation deleted permanently` no longer appears; the screen no
  longer renders a `<Snackbar>`.
- **ACC-06** Neither screen's delete / archive / restore handlers call
  `Alert.alert(..., "Failed to (delete|archive|restore) allocation…")`.
- **ACC-07** `components/ConfirmDialog.tsx` declares `hideCancel` (default
  `false`) and `confirmColor` (default `theme.colors.error`); the Cancel action
  is rendered only when `!hideCancel`; the confirm button uses
  `confirmColor`. The SPEC-26/65 style literals (`maxWidth: 480`,
  `width: "90%"`, `alignSelf: "center"`, `marginHorizontal: 0`) are present, and
  `utils/dialogSurfaceWidth.test.ts` still passes.
- **ACC-08** Each screen renders a single-action feedback `ConfirmDialog`
  (`hideCancel`, `confirmLabel="OK"`, severity-driven `icon`/`confirmColor`)
  bound to the feedback state.

**Subjective (manual reviewer — Expo Go Android/iOS + web export)**

- **ACC-S01** Web: force a failing delete (e.g. offline/`!ok`) → the `Error`
  dialog `Failed to delete allocation. Please try again.` appears (non-
  resizable, centered, single `OK`), and the allocation remains.
- **ACC-S02** Android/iOS: delete an active allocation and an archived
  allocation → the `Success` / `Allocation deleted` dialog appears and the card
  is gone.
- **ACC-S03** Archive and restore → `Success` / `Allocation archived` /
  `Allocation restored` dialogs appear; a simulated failure shows the matching
  `Error` dialog.
- **ACC-S04** Tapping outside or `OK` dismisses each feedback dialog; no
  navigation or extra action occurs; no red-box in Expo Go and no new web
  console errors.

### 3.4 Platform matrix

| Acc | Android | iOS | Web |
|---|---|---|---|
| ACC-01..ACC-08 (Objective) | jest | jest | jest |
| ACC-S01 | — | — | web export |
| ACC-S02 | Expo Go | Expo Go | web export |
| ACC-S03 | Expo Go | Expo Go | web export |
| ACC-S04 | Expo Go | Expo Go | web export |

## 4. Deliverables

- **D-76-01** `hooks/useSavings.ts` — in `deleteItem`'s `catch`, add
  `throw error;` after the existing `console.error("Error deleting savings
  item:", error);` (mirrors `updateItem`). Nothing else in the hook changes.
- **D-76-02** `app/savings.tsx` —
  (a) add a `feedback` state
  (`{ title: string; message: string; severity: "success" | "error" } | null`);
  (b) `confirmDelete`: wrap the awaited `deleteItem(id)` in `try`/`catch`
  (dialog closed first, as today); success →
  `setFeedback({ title: "Success", message: "Allocation deleted", severity:
  "success" })`, failure → `setFeedback({ title: "Error", message: "Failed to
  delete allocation. Please try again.", severity: "error" })`;
  (c) `handleArchiveItem`: same pattern with `Success`/`Allocation archived`
  and `Error`/`Failed to archive allocation.`;
  (d) render a single-action feedback `ConfirmDialog` (CON-04/CON-05) bound to
  `feedback`. The existing Snackbar and its other messages stay untouched.
- **D-76-03** `app/archived-allocations.tsx` —
  (a) add the same `feedback` state;
  (b) `handleRestoreItem`: success → `Success`/`Allocation restored`;
  failure → `Error`/`Failed to restore allocation.`;
  (c) `confirmDelete`: success → `Success`/`Allocation deleted` (replacing
  `Archived allocation deleted permanently`); failure → `Error`/`Failed to
  delete allocation. Please try again.`;
  (d) render the single-action feedback `ConfirmDialog`; remove the now-unused
  `<Snackbar>` element, `toastMessage` state, and `Snackbar` import.
- **D-76-04** `components/ConfirmDialog.tsx` — add optional `hideCancel`
  (default `false`) and `confirmColor` (default `theme.colors.error`) props;
  render the Cancel `Button` only when `!hideCancel`; use
  `buttonColor={confirmColor ?? theme.colors.error}` on the confirm button.
  Preserve the SPEC-26/65 `<Dialog style>` and all existing defaults so current
  callers are unchanged.
- **D-76-05** `utils/savingsArchive.test.ts` — extend the existing `runSuite`
  (× android/ios/web): `G12` (ACC-01, unchanged), `G13` (ACC-02/03),
  `G14` (ACC-04/05), `G15` (ACC-06), and `G16` (ACC-07/08) — asserting the
  dialog routing, exact copy, the `ConfirmDialog` prop additions/defaults, and
  the preserved SPEC-26/65 styles. No new test file (§1.14).
- **D-76-06** Journals — `docs/savepoint.md` entry and `AGENTS.md §3` status
  line, per `AGENTS.md §1.8`.

## 5. Glossary

| Term | Meaning |
|---|---|
| Confirm-then-report | Success result presented only after the awaited mutation resolves; failure shows an error instead |
| Feedback dialog | Single-action (OK) modal acknowledgement built on `ConfirmDialog` |
| Confirm dialog | Two-action modal asking the user to approve the delete (unchanged) |
| Authoritative delete | The awaited web API delete or native repository delete (may fail synchronously) |
| Queued sync rejection | Late asynchronous server rejection of an enqueued delete; not awaited, not surfaced here (SPEC-73) |

## 6. References

- `hooks/useSavings.ts` (`deleteItem`, `updateItem`), `app/savings.tsx`
  (`confirmDelete`, `handleArchiveItem`), `app/archived-allocations.tsx`
  (`confirmDelete`, `handleRestoreItem`), `components/ConfirmDialog.tsx`.
- `specs/73-fix-allocation-archive-persistence.md` — CON-06 rethrow precedent +
  `savingsItems` 400/404 surfacing; `specs/74-*`, `specs/75-*` — same hook
  family.
- `specs/26-responsive-dialogs-and-clear-data-flow.md` (CON-01) and
  `specs/65-dialog-width-overflow-and-centering-diagnosis.md` — the
  `ConfirmDialog` style this spec must preserve.
- `AGENTS.md §1.1` (spec-first), §1.9 (spec format), §1.10 (TDD + matrix),
  §1.11 (bare-minimum diffs), §1.12 (no new deps), §1.14 (one home per spec).

## History

- **1.0 (2026-10-10)** — FINAL per user call: scope delete + archive + restore;
  confirm-then-report; `deleteItem` rethrows; uniform web + native; **Snackbar**
  for success and failure; archived-delete copy unified to `Allocation
  deleted`. Archive/restore failure copy kept as the pre-existing strings.
- **1.1 (2026-10-10)** — FINAL per user call ("change the validation appearance
  instead of a snackbar"): presentation switches to a **modal dialog**
  (`ConfirmDialog`) for all four operations, both success and failure; add
  backward-compatible `hideCancel` + `confirmColor` props; Snackbar no longer
  used for these results. Copy, rethrow, and cross-platform requirements carry
  over unchanged.
