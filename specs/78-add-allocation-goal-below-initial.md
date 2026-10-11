# SPEC-78: Add Allocation — Goal Amount Must Not Be Lower Than Initial Balance

| Field | Value |
|-------|-------|
| **ID** | SPEC-78 |
| **Title** | Add Allocation — Goal Amount Must Not Be Lower Than Initial Balance |
| **Status** | FINAL |
| **Owner** | @rcluc |
| **Version** | 1.0 |
| **Scope** | `app/add-allocation.tsx`, new `utils/allocationGoal.ts` (+ `utils/allocationGoal.test.ts`) |
| **Non-goals** | No change to the available-balance formula (SPEC-12 CON-04), no change to the edit-allocation modal (`app/savings.tsx`), no change to toast copy (SPEC-12 DEC-02), no repository/`useSavings` change, no backend/API calls, no new dependencies |

---

## Conventions

The key words **MUST**, **MUST NOT**, **REQUIRED**, **SHALL**, **SHALL NOT**, **SHOULD**, **SHOULD NOT**, **RECOMMENDED**, **MAY**, and **OPTIONAL** in this document are to be interpreted as described in RFC 2119.

---

## Context

The **Add Allocation** screen (`app/add-allocation.tsx`) already validates the Initial Balance and the optional Goal Amount (SPEC-12):

- `isGoalInvalid` (`app/add-allocation.tsx:47-49`) rejects a non-empty goal that is `<= 0`, `> MAX_AMOUNT`, or unparseable.
- `isFormInvalid` (`app/add-allocation.tsx:51`) disables the "Create Allocation" button.

A gap remains: a goal **lower than the Initial Balance** is accepted. Such an allocation is created already complete (`balance >= target_amount`) and provides no meaningful tracking target. The user wants a red inline error below the Goal Amount input when this occurs, and the invalid form to block submission.

**User decisions captured (2026-10-10):**
- Comparison is **strictly** less than (`goal < initial`); `goal == initial` is **allowed**.
- The error **blocks** submission (not a warning-only).
- Exact copy: **"Goal amount is too low."**
- Scope is **Add Allocation only** (the edit-allocation modal in `app/savings.tsx` is out of scope).

> Note: `app/add-allocation.tsx` was also edited on 2026-10-10 to sync `availableBalance` with the Dashboard "Available to Spend" formula (opening-balance exclusion + `− totalReserved`). This spec does **not** cover that change and MUST NOT revert or alter it.

---

## Constraints

| ID | Constraint |
|----|------------|
| **CON-01** | The screen **MUST** remain fully functional on **Android, iOS, and Web** (Expo SDK 57). |
| **CON-02** | The rule **MUST** be **strictly** `cleanGoal < initialBalanceNum`. A goal **equal to** the Initial Balance **MUST NOT** trigger the error. |
| **CON-03** | When the rule holds, the "Create Allocation" button **MUST** be disabled (the condition **MUST** be folded into `isGoalInvalid`/`isFormInvalid`). |
| **CON-04** | The inline error text **MUST** be exactly `Goal amount is too low.` |
| **CON-05** | The inline error **MUST** render directly below the **Goal Amount** input as a `react-native-paper` `<Text variant="bodySmall">` colored with `theme.colors.error`. |
| **CON-06** | An **empty** Goal Amount field **MUST NOT** trigger the error (goal remains OPTIONAL). |
| **CON-07** | The change **MUST NOT** alter the available-balance computation, the Initial Balance validation, the negative-balance label behavior, or the submit toast copy (SPEC-12). |
| **CON-08** | Scope is Add Allocation only. The edit-allocation modal (`app/savings.tsx`) **MUST NOT** be modified. |
| **CON-09** | **MUST NOT** add npm packages, native modules, or third-party code. |
| **CON-10** | **MUST** follow the SPEC-04 template and the AGENTS.md §1.10 platform matrix (Objective vs Subjective). |

---

## Goal

### Interaction Matrix

| Goal Amount state | Initial Balance | Error shown? | Button |
|-------------------|-----------------|--------------|--------|
| Empty | any | No | Unchanged (goal optional) |
| Parses `<= 0` (e.g. `0`, `.`) | any | Yes — "Goal amount is too low." | Disabled |
| Parses `> MAX_AMOUNT` | any | No (existing cap rule; toast on submit) | Disabled |
| `< initialBalanceNum` | > 0 | Yes — "Goal amount is too low." | Disabled |
| `== initialBalanceNum` | > 0 | No | Enabled (if form otherwise valid) |
| `> initialBalanceNum` | > 0 | No | Enabled (if form otherwise valid) |

### Decisions

| ID | Decision |
|----|----------|
| **DEC-01** | The comparison is strictly `<`. Equal is allowed so an allocation may be created exactly at its opening balance (DEC-05). |
| **DEC-02** | The error is produced by a new **pure** helper `isGoalBelowInitial(goalAmount, initialBalance)` in `utils/allocationGoal.ts` so the branch is unit-testable under the repo's `roots: ['<rootDir>/utils']` jest config (AGENTS.md §1.10). |
| **DEC-03** | The message shows whenever the field is non-empty **and** the parsed goal is below the Initial Balance; this intentionally also covers a typed `0`/unparseable (which already make the form invalid via SPEC-12). |
| **DEC-04** | The submit-blocked toast copy is unchanged (`"Cannot create allocation. Your initial balance exceeds your current available balance."` per SPEC-12 DEC-02). No new toast copy is introduced. |
| **DEC-05** | `goal == initialBalance` is permitted; the resulting allocation is already at target. |
| **DEC-06** | The existing `cleanGoal <= 0`/`> MAX_AMOUNT`/`isNaN` validation and the Initial Balance helper text are left byte-identical. |

### Acceptance Criteria

| ID | Criterion | Type |
|----|-----------|------|
| **ACC-01** | `isGoalBelowInitial("100", 500)` returns `true`; `isGoalBelowInitial("999", 500)` returns `false`; `isGoalBelowInitial("", 500)` returns `false`. | Objective |
| **ACC-02** | `isGoalBelowInitial("500", 500)` returns `false` (equal allowed, CON-02). | Objective |
| **ACC-03** | With a non-empty goal below the Initial Balance, `isGoalInvalid` is `true` and the "Create Allocation" button is disabled (CON-03). | Objective |
| **ACC-04** | With a non-empty goal below the Initial Balance, the red text `Goal amount is too low.` renders directly below the Goal Amount input using `theme.colors.error` (CON-04, CON-05). | Objective |
| **ACC-05** | Empty Goal Amount → no error text and the field does not by itself invalidate the form (CON-06). | Objective |
| **ACC-06** | Reviewer confirms on Android, iOS, and Web (Expo Go + `expo export --platform web`): no red-box crash; the red line appears under the Goal input when lower; the line disappears when corrected; the button toggles enabled/disabled accordingly; spacing/placement looks correct. | Subjective |

---

## Platform Matrix (AGENTS.md §1.10)

| Platform | Objective (machine-checkable) | Subjective (reviewer-observed) |
|----------|-------------------------------|-------------------------------|
| **Android** | `isGoalBelowInitial` + `isGoalInvalid` branch tests pass for `Platform.OS === "android"` (ACC-01..05). | Expo Go: red line under Goal input, correct color, button disabled/enabled (ACC-06). |
| **iOS** | Same branch tests for `Platform.OS === "ios"` (ACC-01..05). | Expo Go: red line under Goal input, correct color, button disabled/enabled (ACC-06). |
| **Web** | Same branch tests for `Platform.OS === "web"` (ACC-01..05). | `expo export --platform web`: red line renders, button disabled/enabled, no console error (ACC-06). |

---

## Deliverables

| ID | Deliverable |
|----|-------------|
| **D-01** | New `utils/allocationGoal.ts` exporting `isGoalBelowInitial(goalAmount: string, initialBalance: number): boolean` — returns `false` for an empty/whitespace goal, otherwise parses (`parseFloat` on the digit/dot-stripped string, `|| 0`) and returns `parsed < initialBalance`. No `react-native` import. |
| **D-02** | `app/add-allocation.tsx`: derive `const goalBelowInitial = isGoalBelowInitial(goalAmount, initialBalanceNum);` and fold it into `isGoalInvalid` (e.g. `... || goalBelowInitial`) so `isFormInvalid`/button reflect it. Existing conditions preserved (DEC-06). |
| **D-03** | `app/add-allocation.tsx`: render `{goalBelowInitial && (<Text variant="bodySmall" style={{ color: theme.colors.error, marginTop: 4, marginBottom: 8 }}>Goal amount is too low.</Text>)}` immediately after the Goal Amount `TextInput` (before the "Available balance:" text). |
| **D-04** | New `utils/allocationGoal.test.ts` — ACC-01..05, parameterized by `Platform.OS` (`android`/`ios`/`web` via mock), asserting literal booleans; also asserts the derived-form gate (goal-below-initial ⇒ invalid) for each platform. |
| **D-05** | Docs: append a `Current status` entry in `AGENTS.md` §3 and a `docs/savepoint.md` journal entry per `.agents/rules/wisewallet.md`. |
| **D-06** | Manual verification checklist (PR/notes) for ACC-06 across the three platforms. |

---

## Glossary

| Term | Definition |
|------|------------|
| **Allocation** | A savings bucket with optional target amount (`target_amount`). |
| **Initial Balance** | The starting amount placed into a new allocation (`balance` field, parsed as `initialBalanceNum`). |
| **Goal Amount** | The optional target for an allocation (`target_amount`); empty means no target. |
| **Available Balance** | `profile.initialBalance + Σ income (excluding Opening Balance) − Σ expense − Σ reserved` (synced to Dashboard "Available to Spend" on 2026-10-10 — outside this spec). |

---

## References

- `app/add-allocation.tsx` (current implementation; goal validation at `:47-49`, goal input at `:122-131`)
- `specs/12-add-allocation-validation-feedback.md` (existing validation contract; CON-04, DEC-02)
- `utils/amount.ts` (`MAX_AMOUNT`, `formatNumberInput`)
- `specs/04-connection-status-vs-offline-mode.md` (spec template reference)
- `AGENTS.md` §1.9 (spec format), §1.10 (platform matrix + TDD), §1.11 (bare-minimum diffs)
