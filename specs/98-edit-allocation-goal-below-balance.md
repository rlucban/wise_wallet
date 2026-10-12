# SPEC-98: Edit Allocation — Goal Amount Must Not Be Lower Than Current Balance

| Field | Value |
|-------|-------|
| **ID** | SPEC-98 |
| **Title** | Edit Allocation — Goal Amount Must Not Be Lower Than Current Balance |
| **Status** | FINAL (per user call 2026-10-12 — implementable) |
| **Owner** | @rcluc |
| **Version** | 1.1 FINAL |
| **Scope** | `app/savings.tsx` (Edit Allocation modal guard only) + new guard file `utils/editAllocationGoal.test.ts` |
| **Non-goals** | No change to `utils/allocationGoal.ts` (helper reused byte-identical); no change to Add Allocation screen; no change to transfer in/out, archive, delete, or completed-item rendering; no repository/`useSavings` change; no backend/API calls; no new dependencies |

---

## Conventions

The key words **MUST**, **MUST NOT**, **REQUIRED**, **SHALL**, **SHALL NOT**, **SHOULD**, **SHOULD NOT**, **RECOMMENDED**, **MAY**, and **OPTIONAL** in this document are to be interpreted as described in RFC 2119.

---

## Context

The **Add Allocation** screen blocks a goal lower than the Initial Balance (SPEC-78: `isGoalBelowInitial` + inline error + disabled button). The **Edit Allocation** modal in `app/savings.tsx` (`handleEditItem`, `:69-94`) was explicitly out of scope there (SPEC-78 CON-08) and only guards `cleanGoal <= 0`/unparseable and `> MAX_AMOUNT`. It never compares the edited goal against the item's balance.

Result (user-reported): an allocation holding ₱80.00 can be edited to a ₱10.00 goal. The edit saves, the `completedItems` filter (`target_amount && balance >= target_amount`, `savings.tsx:43-46`) immediately marks it complete, and the card renders the nonsensical `₱80.00 / ₱10.00 100% Reached` state.

**User decisions captured (2026-10-12):**
- Comparison basis is the item's **current balance** (the edit modal changes title + goal only, never the balance).
- Comparison is **strictly** less than (`goal < balance`); `goal == balance` is **allowed** (parity with SPEC-78 DEC-01).
- UX is **Alert on Save only** (`Alert.alert` + return, matching the edit modal's existing pattern) — no inline text, no disabled-button change.
- Clearing the goal (empty field) stays **allowed** (removes the target, existing behavior).

This spec supersedes SPEC-78 CON-08 (edit-modal freeze) for this one guard only; the SPEC-78 document itself is not edited (§1.14).

---

## Constraints

| ID | Constraint |
|----|------------|
| **CON-01** | The screen **MUST** remain fully functional on **Android, iOS, and Web** (Expo SDK 57); Expo Go import-safe; Vercel-deployable. |
| **CON-02** | The rule **MUST** be strictly `editedGoal < currentBalance`, where `currentBalance` is the selected item's live `balance`. A goal **equal to** the balance **MUST NOT** trigger the error. |
| **CON-03** | An **empty** Goal Amount field **MUST NOT** trigger the error (clearing the goal removes the target — existing behavior preserved). |
| **CON-04** | On block, the modal **MUST** call exactly `Alert.alert("Invalid Goal", "Goal amount is too low.")` and return **before** `updateItem`; the modal stays open and no state is reset (message copy matches SPEC-78 CON-04). |
| **CON-05** | The two existing guards (`<= 0`/unparseable, `> MAX_AMOUNT`), guard order (new guard runs **after** them), the `try`/`catch`/toast path, and all transfer/archive/delete/completed flows **MUST** stay byte-identical. |
| **CON-06** | When the rule holds, the modal **MUST** show `Goal amount is too low.` as a `<Text variant="bodySmall">` in `theme.colors.error` directly below the Goal Amount input (create-parity, SPEC-78 CON-04/CON-05) **and** the Save Changes button **MUST** be `disabled`. Disabled styling is Paper's default (no custom colors). The `Alert.alert` backstop in `handleEditItem` stays (v1.1 amendment per user call 2026-10-12 — supersedes the v1.0 Alert-only rule). |
| **CON-07** | The existing pure helper `isGoalBelowInitial` (`utils/allocationGoal.ts`) **MUST** be reused as-is; that file **MUST NOT** be modified. |
| **CON-08** | **MUST NOT** add npm packages, native modules, or third-party code. The only import added is the helper (same-layer `utils` import, no cycle). No `Platform.OS` branch. |
| **CON-09** | No code, config, or dependency change before this spec is marked **FINAL** by the user (AGENTS §1.1). |
| **CON-10** | **MUST** follow the SPEC-04 template and the AGENTS.md §1.10 platform matrix (Objective vs Subjective). |

---

## Goal

An edited goal below the allocation's current balance is rejected on Save with an Alert; equal, higher, and empty goals save exactly as before.

### Interaction Matrix

| Edited goal state | Current balance | Blocked? | Outcome |
|-------------------|-----------------|----------|---------|
| Empty | any | No | Saves, target removed (unchanged) |
| Unparseable / `<= 0` | any | Yes (existing guard, unchanged copy) | `Alert.alert("Invalid Goal", "Please enter a valid goal amount.")` |
| `> MAX_AMOUNT` | any | Yes (existing guard, unchanged copy) | `Alert.alert("Invalid Goal", "Goal amount must not exceed 10,000,000.")` |
| `< balance` (e.g. `10` vs `80`) | `80` | Yes (new guard) | Live inline `Goal amount is too low.` + Save Changes disabled; Alert backstop if ever submitted — modal stays open |
| `== balance` (e.g. `80` vs `80`) | `80` | No | Saves (may show as Completed — same as create-at-target, SPEC-78 DEC-05) |
| `> balance` | any | No | Saves, unchanged |

### Decisions

| ID | Decision |
|----|----------|
| **DEC-01** | Comparison basis is live `balance` looked up from `items` by `selectedItemId` at Save time (not a stale render value, not the creation-time initial balance). |
| **DEC-02** | Strictly `<`; equal allowed — parity with SPEC-78 DEC-01/DEC-05 (user call 2026-10-12). |
| **DEC-03** | v1.0 shipped Alert-on-Save only (user call 2026-10-12); v1.1 (user call 2026-10-12) adds the live inline error + disabled Save for create-parity, keeping the Alert as a backstop (rejected: removing the Alert — zero-cost defense if submit is ever reachable). |
| **DEC-04** | Alert message reuses the SPEC-78 copy `Goal amount is too low.` under the existing `Invalid Goal` title, so create and edit speak the same words. |
| **DEC-05** | New SPEC-98 file owns the edit guard; SPEC-78 keeps the create rule; neither document is edited after FINAL (§1.14). |

### Acceptance Criteria

| ID | Criterion | Type |
|----|-----------|------|
| **ACC-01** | `isGoalBelowInitial("10", 80)` is `true`; `("80", 80)` is `false`; `("", 80)` is `false`; `("100", 80)` is `false`. | Objective |
| **ACC-02** | Source scan of `app/savings.tsx`: `handleEditItem` calls `isGoalBelowInitial(goalAmount, <live balance>)` after the two existing guards and before `try`, blocking with exactly `Alert.alert("Invalid Goal", "Goal amount is too low.")` + return; the edit modal derives a live `editGoalBelowBalance` flag, renders the exact copy in a `theme.colors.error` `<Text variant="bodySmall">` below the Goal Amount input, and passes `disabled={editGoalBelowBalance}` to Save Changes; existing guards, `updateItem` call, catch/toast, and all other modal JSX byte-identical. | Objective |
| **ACC-03** | Source scan: the only import delta is `isGoalBelowInitial` from `../utils/allocationGoal`; no new dep, no `Platform.OS` branch, no other copy/behavior drift in the file. | Objective |
| **ACC-S01** | Reviewer on Android/iOS (Expo Go): allocation holding ₱80 → Edit → goal `10` → Save Changes → Alert `Invalid Goal / Goal amount is too low.`, modal stays open, card unchanged. Goal `80` saves; cleared goal saves (target removed). FAIL = save succeeds with goal below balance, or any red-box. | Subjective |
| **ACC-S02** | Reviewer on Web (`expo export --platform web`): identical to ACC-S01, no console error. FAIL = any web-only deviation. | Subjective |

---

## Platform Matrix (AGENTS.md §1.10)

| Platform | Objective (machine-checkable) | Subjective (reviewer-observed) |
|----------|-------------------------------|-------------------------------|
| **Android** | ACC-01..ACC-03 pass with `Platform.OS === "android"` (helper + source-scan guards parameterized per platform). | Expo Go: Alert on Save, modal stays open, equal/empty save (ACC-S01). |
| **iOS** | Same guards with `Platform.OS === "ios"`. | Expo Go: identical to Android (ACC-S01). |
| **Web** | Same guards with `Platform.OS === "web"`. | Web export: identical behavior, no console error (ACC-S02). |

TDD coverage (§1.10): new `utils/editAllocationGoal.test.ts` covers ACC-01..ACC-03 parameterized by `Platform.OS` (`android`/`ios`/`web` via mock); ACC-S01/S02 are user-run manual checks exactly as written above (Alert/modal behavior is not jest-provable — guards pin the branch + copy + placement).

---

## Deliverables

| ID | Deliverable |
|----|-------------|
| **D-01** | `app/savings.tsx` ONLY: (a) add the `isGoalBelowInitial` import + the below-balance guard in `handleEditItem` (after the cap guard, before `try`); (b) derive a live `editGoalBelowBalance` flag beside `selectedItem`, render the conditional error `<Text>` below the Goal Amount input, and pass `disabled={editGoalBelowBalance}` to Save Changes. No other line in the file changes (CON-05). |
| **D-02** | New `utils/editAllocationGoal.test.ts` (named here per §1.11): guards for ACC-01..ACC-03 × android/ios/web. |
| **D-03** | Docs after implementation (AGENTS §1.8, post-FINAL only): `docs/savepoint.md` entry + `AGENTS.md` §3 status line. NOT part of the spec-writing step; no doc edit ships with the DRAFT. |

---

## Glossary

| Term | Definition |
|------|------------|
| **Allocation** | A savings bucket with current `balance` and optional `target_amount` (goal). |
| **Current balance** | The selected item's live `balance` at Save time (post-transfer value, not creation-time initial). |
| **Below-balance goal** | An edited goal strictly less than the current balance (`parsed < balance`). |
| **Alert-on-Save** | `Alert.alert` + early return inside `handleEditItem`; the modal neither closes nor resets. |

---

## References

- `app/savings.tsx:69-94` (`handleEditItem` — the unguarded site), `:180` (`selectedItem` lookup), `:458-469` (Edit Allocation modal JSX — untouched)
- `utils/allocationGoal.ts` (`isGoalBelowInitial` — reused byte-identical)
- `specs/78-add-allocation-goal-below-initial.md` (create-side rule; CON-08 superseded for this guard only, document unedited)
- `specs/12-add-allocation-validation-feedback.md` (original validation contract)
- `AGENTS.md` §1.1 (spec-first), §1.9 (spec format), §1.10 (platform matrix + TDD), §1.11 (bare-minimum), §1.12 (no new deps), §1.14 (one home)
