# SPEC-99: Edit Allocation — Saving Indicator on Save Changes

| Field | Value |
|-------|-------|
| **ID** | SPEC-99 |
| **Title** | Edit Allocation — Saving Indicator on Save Changes |
| **Status** | FINAL (per user call 2026-10-12 — implementable) |
| **Owner** | @rcluc |
| **Version** | 1.0 FINAL |
| **Scope** | `app/savings.tsx` (Edit Allocation modal save path only) + new guard file `utils/editAllocationSaving.test.ts` |
| **Non-goals** | No change to validation rules/copies (SPEC-78, SPEC-98); no change to `useSavings`/`updateItem` data flow; no change to transfer/archive/delete modals; no latency reduction (indicator only — see DEC-04); no backend/API change; no new dependencies |

---

## Conventions

The key words **MUST**, **MUST NOT**, **REQUIRED**, **SHALL**, **SHALL NOT**, **SHOULD**, **SHOULD NOT**, **RECOMMENDED**, **MAY**, and **OPTIONAL** in this document are to be interpreted as described in RFC 2119.

---

## Context

User report (2026-10-12): pressing Save Changes in the Edit Allocation modal feels "hindi smooth" — measured at **over 5 seconds with zero feedback** before the modal closes, on all platforms. Code trace (`app/savings.tsx` `handleEditItem`, `hooks/useSavings.ts` `updateItem`):

- On **web**, the modal stays open while awaiting the full server `PUT savingsItems/{id}` round-trip (`updateItem:264-286`) — the close/reset lines run only after it resolves.
- On **native**, the modal waits for the local write chain (`getById` + `upsert` + queue) with the same zero-feedback wait.
- The Save Changes button has **no `loading`/busy state** (unlike Add Allocation's `loading={loading}` and Add Transaction's "Saving transaction…" dialog), so the tap appears dead — and a rapid double-tap can fire `updateItem` twice (no busy guard, unlike dues' `payBusy` precedent).

**User decisions captured (2026-10-12):**
- Delay class: over 5 seconds.
- Fix direction: **loading indicator** (not optimistic close).

---

## Constraints

| ID | Constraint |
|----|------------|
| **CON-01** | The screen **MUST** remain fully functional on **Android, iOS, and Web** (Expo SDK 57); Expo Go import-safe; Vercel-deployable. |
| **CON-02** | A new boolean state (name: `editSaving`, default `false`) **MUST** gate the save flight: set `true` only after all three validation guards pass (invalid / cap / below-balance), set `false` in a `finally` block. Validation-failure returns **MUST NOT** touch it (no spinner on rejected input). |
| **CON-03** | Save Changes **MUST** take `loading={editSaving}` (Paper spinner — Add Allocation precedent) and its disabled expression **MUST** become `disabled={editGoalBelowBalance \|\| editSaving}` (SPEC-98 condition preserved). Disabled styling stays Paper-default (no custom colors). |
| **CON-04** | This spec changes **perceived** smoothness only — it does **not** reduce actual save latency. A consistently >5s PUT against a warm API is a `wallet-api` (backend) issue and is **out of scope** here (own investigation, backend repo). First-save-after-idle slowness (cold start) is expected; the indicator is the correct client answer for it. |
| **CON-05** | Re-entry guard: `handleEditItem` **MUST** early-return when `editSaving` is already `true` (dues `payBusy` precedent — covers double-tap before re-render). `openEditModal` **MUST** reset `editSaving` to `false` (stale-true if the modal was dismissed mid-save). |
| **CON-06** | Success path (close + field reset) and failure path (modal stays open + `Failed to update allocation` toast) **MUST** stay byte-identical; validation guards/copies (SPEC-78, SPEC-98) untouched; transfer/archive/delete/completed flows untouched. |
| **CON-07** | **MUST NOT** add npm packages, native modules, or third-party code. No `Platform.OS` branch. No `useSavings` change. |
| **CON-08** | No code, config, or dependency change before this spec is marked **FINAL** by the user (AGENTS §1.1). |
| **CON-09** | **MUST** follow the SPEC-04 template and the AGENTS.md §1.10 platform matrix (Objective vs Subjective). |

---

## Goal

Every Save Changes tap gives immediate visible feedback (spinner + disabled button) until the save resolves; double-taps cannot duplicate the update; success/failure behavior is exactly as before.

### Interaction Matrix

| State | Save Changes appearance | Tap outcome |
|-------|------------------------|-------------|
| Idle, valid goal | Enabled, no spinner | Saves (as today, now with feedback) |
| Saving (`editSaving`) | Disabled + spinner | Ignored (early return even if pressed pre-render) |
| Invalid goal (below-balance / bad / over-cap) | Disabled (below-balance) or Alert on attempt (others) | Unchanged (SPEC-98 / existing guards) |
| Save succeeds | — | Modal closes + fields reset (unchanged) |
| Save fails | Spinner clears via `finally` | Modal stays open + toast (unchanged) |
| Modal reopened after mid-save dismiss | Reset to idle | Normal save (no stuck spinner) |

### Decisions

| ID | Decision |
|----|----------|
| **DEC-01** | Paper `loading` + `disabled` on the existing button (Add Allocation precedent) — rejected: a full-screen "Saving…" dialog (Add Transaction precedent) as oversized for an edit modal. |
| **DEC-02** | `editSaving` flips only on the true save path (after guards) with `finally` reset — rejected: setting it at function top, which would flash a spinner on validation rejections. |
| **DEC-03** | Early-return + `openEditModal` reset included (1 line each) — the disabled prop alone cannot stop a double-tap issued before re-render, and a mid-save dismiss would otherwise strand the spinner. |
| **DEC-04** | No latency fix in this spec: the client cannot shorten a >5s server PUT; if the delay persists on a warm API it is a backend investigation, not a client diff (CON-04). |
| **DEC-05** | New SPEC-99 file owns the indicator; SPEC-78/98 keep validation; no document edited after FINAL (§1.14). |

### Acceptance Criteria

| ID | Criterion | Type |
|----|-----------|------|
| **ACC-01** | Source scan of `app/savings.tsx`: `const [editSaving, setEditSaving] = useState(false)` exists; `handleEditItem` early-returns on `editSaving`, sets it `true` after the SPEC-98 guard, resets it in `finally`; `openEditModal` resets it to `false`. | Objective |
| **ACC-02** | Source scan: Save Changes carries `loading={editSaving}` and `disabled={editGoalBelowBalance \|\| editSaving}`; validation guards, Alert/toast copies, success/failure lines, and all other modals byte-identical. | Objective |
| **ACC-03** | Source scan: no new import, no new dep, no `Platform.OS` branch, no `useSavings` change. | Objective |
| **ACC-S01** | Reviewer on Android/iOS (Expo Go): valid edit → Save → spinner appears immediately, button disabled, second tap ignored; success closes the modal and updates the card; forced failure (e.g. offline Cloud save) keeps the modal open with the toast and a cleared spinner. FAIL = dead-feeling tap, duplicate update, or stuck spinner. | Subjective |
| **ACC-S02** | Reviewer on Web: identical to ACC-S01, no console error. Reviewer additionally notes whether the >5s delay happens on EVERY save or only first-after-idle (warm-vs-cold signal for a backend follow-up). FAIL = any web-only deviation. | Subjective |

---

## Platform Matrix (AGENTS.md §1.10)

| Platform | Objective (machine-checkable) | Subjective (reviewer-observed) |
|----------|-------------------------------|-------------------------------|
| **Android** | ACC-01..ACC-03 pass with `Platform.OS === "android"`. | Expo Go: spinner + disabled + no double-save + close/toast paths (ACC-S01). |
| **iOS** | Same guards with `Platform.OS === "ios"`. | Expo Go: identical to Android (ACC-S01). |
| **Web** | Same guards with `Platform.OS === "web"`. | Web export: identical + warm-vs-cold timing note (ACC-S02). |

TDD coverage (§1.10): new `utils/editAllocationSaving.test.ts` covers ACC-01..ACC-03 parameterized by `Platform.OS` (`android`/`ios`/`web` via mock); ACC-S01/S02 are user-run manual checks exactly as written above (timing/spinner behavior is not jest-provable — guards pin the state, wiring, and placement).

---

## Deliverables

| ID | Deliverable |
|----|-------------|
| **D-01** | `app/savings.tsx` ONLY: `editSaving` state + `handleEditItem` early-return/set-`true`/`finally`-reset + `openEditModal` reset + Save Changes `loading`/`disabled` per CON-02/CON-03/CON-05. No other line in the file changes. |
| **D-02** | New `utils/editAllocationSaving.test.ts` (named here per §1.11): guards for ACC-01..ACC-03 × android/ios/web. |
| **D-03** | Docs after implementation (AGENTS §1.8, post-FINAL only): `docs/savepoint.md` entry + `AGENTS.md` §3 status line. NOT part of the spec-writing step; no doc edit ships with the DRAFT. |

---

## Glossary

| Term | Definition |
|------|------------|
| **editSaving** | Boolean flight flag for the Edit Allocation save; `true` only between guard-pass and settle. |
| **Dead tap** | A Save press with zero visual response while the async save is in flight (the reported defect). |
| **Warm vs cold** | Whether the API responds fast on repeat saves (warm) or only the first-after-idle save is slow (cold start — backend hosting behavior, not a client bug). |

---

## References

- `app/savings.tsx` `handleEditItem` (unguarded save path), `openEditModal`, edit-modal JSX (Save Changes button)
- `app/add-allocation.tsx` (`loading={loading}` precedent), `app/add-transaction.tsx` (saving-dialog precedent), `app/dues.tsx` `payBusy` (busy-guard precedent)
- `hooks/useSavings.ts:262-287` (`updateItem` — awaited web PUT / native write chain; untouched)
- `specs/78-add-allocation-goal-below-initial.md`, `specs/98-edit-allocation-goal-below-balance.md` (validation owners; unedited)
- `AGENTS.md` §1.1 (spec-first), §1.9 (spec format), §1.10 (platform matrix + TDD), §1.11 (bare-minimum), §1.12 (no new deps), §1.14 (one home)
