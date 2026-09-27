# SPEC-12: Add Allocation Screen — Validation Feedback & Error Handling

| Field | Value |
|-------|-------|
| **ID** | SPEC-12 |
| **Title** | Add Allocation Screen — Validation Feedback & Error Handling |
| **Status** | FINAL |
| **Owner** | @rcluc |
| **Version** | 1.0 |
| **Scope** | `app/add-allocation.tsx`, `context/ToastContext.tsx` (reuse only) |
| **Non-goals** | No changes to savings repository, no new backend calls, no navigation changes, no currency/locale changes |

---

## Conventions

The key words **MUST**, **MUST NOT**, **REQUIRED**, **SHALL**, **SHALL NOT**, **SHOULD**, **SHOULD NOT**, **RECOMMENDED**, **MAY**, and **OPTIONAL** in this document are to be interpreted as described in RFC 2119.

---

## Context

The **Add Allocation** screen (`app/add-allocation.tsx`) allows users to create a new savings allocation with a title, initial balance, and optional goal amount. Currently:

- Validation runs only on submit (`handleSubmit`) via `Alert.alert`.
- The "Create Allocation" button is disabled only while `loading === true`; it is **not** disabled for invalid input.
- Available balance is computed from `profile.initialBalance + income − expense` and shown as dim gray body text (`theme.colors.onSurfaceVariant`).
- No inline validation feedback appears under the Initial Balance field.
- No toast/snackbar is used; errors use modal `Alert.alert`.

This spec introduces **inline validation**, **disabled button styling**, **negative-balance highlight**, and **toast notifications** to replace modal alerts for validation errors.

---

## Constraints

| ID | Constraint |
|----|------------|
| **CON-01** | The screen **MUST** remain fully functional on **Android, iOS, and Web** (Expo SDK 57). |
| **CON-02** | **MUST** use the existing `ToastContext` (`useToast`) for toast notifications; no new notification library. |
| **CON-03** | **MUST NOT** change the repository layer (`useSavings`, `savings-item.repo.ts`). |
| **CON-04** | **MUST NOT** alter the available-balance computation formula. |
| **CON-05** | **MUST** keep the 10,000,000 amount cap (`utils/amount.ts` `MAX_AMOUNT`) enforced. |
| **CON-06** | **MUST** use `react-native-paper` components (`TextInput`, `Button`, `Text`, `Card`) and theme colors; no raw style values for semantic colors (e.g., use `theme.colors.error` for red). |
| **CON-07** | **MUST** follow the context split pattern (Data/Actions) — no new context needed. |
| **CON-08** | The "Create Allocation" button **MUST** be visually distinct when disabled: background `theme.colors.onSurface` at 12 % opacity (≈ `bg-slate-700` in dark, `bg-slate-300` in light), text `theme.colors.onSurface` at 38 % opacity (≈ `text-slate-400`), `cursor: not-allowed` on web. |

---

## Goal

### Interaction Matrix

| User Action | Current Behavior | New Behavior |
|-------------|------------------|--------------|
| User types in **Initial Balance** field | No immediate feedback | Real-time validation: if parsed value > available balance **or** available balance < 0, show red helper text under field |
| User types in **Goal Amount** field | No immediate feedback | No change (optional, validated on submit) |
| **Available balance** is negative | Dim gray label | Label text **MUST** be `theme.colors.error` (`text-red-400` equivalent) + `fontWeight: "600"` |
| **Create Allocation** button state | Disabled only during `loading` | Disabled when: `loading` **OR** `title` empty **OR** `initialBalance` invalid (≤ 0, > MAX, > available balance, NaN) **OR** `goalAmount` invalid (if provided: ≤ 0, > MAX, NaN) |
| Button disabled styling | Inherits contained style | Explicit `buttonColor` + `style` + `color` per **CON-08** |
| User presses button while invalid | Modal `Alert.alert` | Toast via `showToast("Cannot create allocation. Your initial balance exceeds your current available balance.")`; no modal |
| User presses button while valid | Proceeds to save | Unchanged (save + navigate back) |

### Decisions

| ID | Decision |
|----|----------|
| **DEC-01** | Validation runs on every keystroke (controlled inputs) — no debounce needed for numeric fields. |
| **DEC-02** | Toast message for any validation failure is the same generic string per spec: *"Cannot create allocation. Your initial balance exceeds your current available balance."* |
| **DEC-03** | Goal amount validation only blocks submit if user entered a non-empty invalid value; empty goal is allowed. |
| **DEC-04** | Negative available balance **does not** block creation if initial balance ≤ 0 (user could be allocating from future income); the red label is a warning only. |

### Acceptance Criteria

| ID | Criterion | Type |
|----|-----------|------|
| **ACC-01** | When `initialBalance > availableBalance` (and available ≥ 0), red helper text *"Insufficient available balance to create this allocation."* appears under Initial Balance field. | Objective |
| **ACC-02** | When `availableBalance < 0`, the "Available balance:" label renders with `theme.colors.error` and `fontWeight: "600"`. | Objective |
| **ACC-03** | "Create Allocation" button is disabled (per **CON-08**) when any validation fails. | Objective |
| **ACC-04** | Pressing the button while disabled/invalid triggers a toast (not `Alert.alert`) with the exact message: *"Cannot create allocation. Your initial balance exceeds your current available balance."* | Objective |
| **ACC-05** | Valid submission (title + valid initial balance ≤ available balance + valid optional goal) saves and navigates back — no regression. | Objective |
| **ACC-06** | Reviewer confirms on Android, iOS, and Web: no red-box crashes, toast appears, button styling matches **CON-08**, negative balance label is red. | Subjective |

---

## Deliverables

| ID | Deliverable |
|----|-------------|
| **D-01** | Add `useToast` hook import and `const { showToast } = useToast();` in `AddAllocation`. |
| **D-02** | Compute `initialBalanceNum` from `balance` state on every render (parsed, sanitized). |
| **D-03** | Derive `isInitialBalanceInvalid = initialBalanceNum <= 0 \|\| initialBalanceNum > MAX_AMOUNT \|\| isNaN(initialBalanceNum) \|\| (availableBalance >= 0 && initialBalanceNum > availableBalance)`. |
| **D-04** | Derive `isGoalInvalid = goalAmount.trim() !== "" && (cleanGoal <= 0 \|\| cleanGoal > MAX_AMOUNT \|\| isNaN(cleanGoal))`. |
| **D-05** | Derive `isFormInvalid = !title.trim() \|\| isInitialBalanceInvalid \|\| isGoalInvalid`. |
| **D-06** | Render conditional helper `<Text variant="bodySmall" style={{ color: theme.colors.error, marginTop: 4, marginBottom: 8 }}>` under Initial Balance when `availableBalance >= 0 && initialBalanceNum > availableBalance`. |
| **D-07** | Render "Available balance:" label with dynamic style: `color: availableBalance < 0 ? theme.colors.error : theme.colors.onSurfaceVariant, fontWeight: availableBalance < 0 ? "600" : "400"`. |
| **D-08** | Update `<Button>`: `disabled={loading || isFormInvalid}`, `buttonColor={isFormInvalid || loading ? disabledColor : theme.colors.primary}`, `color={isFormInvalid || loading ? disabledTextColor : "#fff"}`, `style={{ ... , opacity: (isFormInvalid || loading) ? 1 : undefined }}` — **no** `opacity` reduction; use explicit colors per **CON-08**. |
| **D-09** | Replace all `Alert.alert` validation branches in `handleSubmit` with early returns that call `showToast("Cannot create allocation. Your initial balance exceeds your current available balance.")` and return. Keep the 10M cap alerts as toasts too (same message or specific). |
| **D-10** | Ensure `handleSubmit` still permits valid submissions (no behavior change for happy path). |
| **D-11** | Add unit tests (`app/add-allocation.test.tsx`) parameterized by `Platform.OS` (`android`, `ios`, `web`) covering: ACC-01..05 logic branches. |
| **D-12** | Manual verification checklist in PR description for ACC-06 (three platforms). |

---

## Glossary

| Term | Definition |
|------|------------|
| **Allocation** | A savings bucket with optional target amount (`target_amount`). |
| **Available Balance** | `profile.initialBalance + sum(income) − sum(expense)` for the active user. |
| **MAX_AMOUNT** | Constant `10_000_000` from `utils/amount.ts`. |
| **Toast** | Non-blocking Snackbar via `ToastContext.showToast`. |

---

## References

- `app/add-allocation.tsx` (current implementation)
- `context/ToastContext.tsx` (toast provider)
- `utils/amount.ts` (`MAX_AMOUNT`, `formatNumberInput`)
- `specs/04-connection-status-vs-offline-mode.md` (spec template reference)
- `specs/11-female-tts-voice-for-recommended-reading.md` (latest implemented spec pattern)