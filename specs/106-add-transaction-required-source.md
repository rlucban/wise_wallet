# SPEC-106: Add Transaction — Required Payment Source Selection

| Field | Value |
|-------|-------|
| **ID** | SPEC-106 |
| **Title** | Add Transaction — Required Payment Source (and Corrected Category Validation Copy) |
| **Status** | FINAL v1.0 (per user call 2026-10-13 — implement as written) |
| **Owner** | @rcluc |
| **Version** | 1.0 FINAL |
| **Scope** | `app/add-transaction.tsx` ONLY (payment-source state, type/source `onPress`, `handleSubmit` guard, `msgs` copy fix) + one re-pin in `utils/editTransactionRequiredFields.test.ts` (test-only) + new guard file `utils/addTransactionRequiredSource.test.ts` |
| **Non-goals** | No change to amount/note/date/establishment/receipt/category-chip behavior; no change to the inline category `HelperText` row; no change to the two-level chip UI layout or its styling; no change to `validate()`'s existing three field rules or `clearError`; no change to `context/TransactionsContext.tsx`, `types/index.ts`, `utils/apiClient.ts`, or `app/edit-transaction.tsx`; no server or `wallet-api` change; no new dependency |

---

## Conventions

The key words **MUST**, **MUST NOT**, **REQUIRED**, **SHALL**, **SHALL NOT**, **SHOULD**, **SHOULD NOT**, **RECOMMENDED**, **MAY**, and **OPTIONAL** in this document are to be interpreted as described in RFC 2119.

---

## Context

User report (2026-10-13, direct continuation of SPEC-105): the Add Transaction screen must also require a selected Payment Source before proceeding. Source trace of `app/add-transaction.tsx` found three separate facts:

1. **A payment source is always present and always implicitly chosen — never by the user.** `const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cash")` (`:47`) defaults to a value, and `fetchPaymentMethods` **auto-selects** `setPaymentMethod(data[0].name)` (`:88`) as soon as the API responds. So a "must select" guard would be structurally dead code, exactly as it was on the edit screen before SPEC-105 CON-06.
2. **A visible selection can silently fail to take effect.** The type-chip `onPress` (`:339-348`) only writes a source when an API method of the tapped type exists, and otherwise only in the `t === "cash"` branch. Selecting "CARD" when no card method exists therefore leaves `paymentMethod` at its previous value while the CARD chip renders selected — nothing on screen disagrees and nothing catches it. With the fetch failed (Local account, offline, web cold start → empty `availablePaymentMethods`), **every** non-cash type hits this, so the user cannot select any source other than the cash default.
3. **The validation alert shows the wrong copy for the Others-category case.** `handleSubmit` maps `category` to a hardcoded `"Please select a category."` (`:174`) and uses `msgs[firstErrorKey]` (`:180`), while `validate()` (`:144-148`) can set `errors.category` to `"Please specify a category."`. The inline `HelperText` shows the correct message, so the two disagree and the user is told to "select" a category they already selected.

**User decisions captured (2026-10-13):**
- Screen: **Add Transaction** (not the pay-due sheet).
- Fields: **Payment Source and Category** — the category requirement already exists, so this spec fixes its copy (finding 3) and leaves its logic untouched.

---

## Constraints

| ID | Constraint |
|----|------------|
| **CON-01** | The screen **MUST** remain fully functional on **Android, iOS, and Web** (Expo SDK 57); Expo Go import-safe; Vercel-deployable. |
| **CON-02** | `paymentMethod` state **MUST** become `PaymentMethod \| null`, initial `null`, seeded `null` (Add has no prefill). `useState<PaymentMethod>("cash")` **MUST NOT** survive. |
| **CON-03** | `fetchPaymentMethods` **MUST NOT** auto-select: the `if (data.length > 0) { setPaymentMethod(data[0].name); }` block (`:87-89`) **MUST** be deleted, leaving the `ok && … && Array.isArray(…)` guard and the state write untouched. No implicit selection on load. |
| **CON-04** | `selectedMethodType` state **MUST** become `string \| null`, initial `null`, so that no type chip renders selected on open. Otherwise the CASH chip would look selected while the payload value is null and the new guard would contradict the UI. |
| **CON-05** | The type-chip `onPress` **MUST** always produce a value: set `selectedMethodType` to the tapped type, then set `paymentMethod` to the first API method of that type when one exists and to the synthetic label for that type otherwise. The synthetic labels **MUST** be `Cash` / `Card` / `Bank` / `E-Wallet` / `Other` — the same vocabulary already shipped on the edit screen (SPEC-105 CON-04 fallback) and the dues pay sheet (SPEC-80 v1.1 `PAY_SOURCE_OPTIONS`). No tap may leave `paymentMethod` unchanged. |
| **CON-06** | The method-chip `onPress` **MUST** stay `setPaymentMethod(method.name)` (unchanged), and the method row **MUST** keep rendering only when a non-cash type is selected. Both `selectedMethodType.toLowerCase()` call sites (`:334`, `:361`) **MUST** become null-safe; no layout, styling, key, label, or icon change. |
| **CON-07** | `handleSubmit` **MUST** block a null payment source with this screen's own dialog mechanism — `setAlertDialog({ visible: true, title: "Invalid Payment Source", message: "Please select a payment source." })` — mirroring the existing `Validation Error` alert (`:177-181`) and SPEC-105's guard-in-handler shape. **MUST NOT** add a `HelperText` row (SPEC-105 DEC-02 precedent; the category is the only field with an inline row today). |
| **CON-08** | The source guard **MUST** be checked in `handleSubmit`, not inside `validate()`. `validate()` is a state-setting helper returning only the first error key, so TypeScript cannot narrow `paymentMethod` across the call — a handler-level guard is what makes the payload type-safe without a dead re-check. The guard **MUST** run **after** the `firstErrorKey` branch so the reported order stays amount/category/note → payment source, matching SPEC-105 CON-07's order. |
| **CON-09** | The `addTransaction` payload **MUST** contain a bare `paymentMethod` identifier narrowed to `string` — no `!`, no `as`, no `\|\| "cash"`, and **no `?? undefined`**: `context/TransactionsContext.tsx:45` normalizes `undefined` to `""` and an empty `paymentMethod` is the server-400 class fixed by SPEC-47. |
| **CON-10** | The category alert copy **MUST** be corrected. `validate()` already writes the exact per-field message into its local `next` map (`"Please select a category."` vs `"Please specify a category."` at `:149-153`), but `handleSubmit` discarded it in favour of a hardcoded `msgs` map with a single generic `category` entry. **Correction recorded during implementation (2026-10-13):** the drafted fix (`errors[firstErrorKey]` preferred over `msgs`) does not work — `setErrors` is batched, so `errors` still holds the previous tick's object inside the same `handleSubmit` call. `validate()` **MUST** therefore return the first *message* (`Object.values(next)[0] || null`) instead of the first key, `handleSubmit` **MUST** alert that message directly, and the now-redundant `msgs` map **MUST** be deleted. Amount and note alert copy become the same specific strings the inline `HelperText` already shows. `clearError`, the inline `HelperText`, and `validate()`'s three field rules **MUST** be untouched. |
| **CON-11** | Existing FINAL spec pins **MUST** stay green: `utils/apiSourceOfTruth.test.ts` ACC-04 (`app/add-transaction.tsx` contains `OPENING_BALANCE_CATEGORY_ID`, does not contain `t.title !== "Opening Balance"`), `utils/paySourceRename.test.ts` ACC-01/ACC-04/05 (SPEC-80 pins are `dues.tsx`-scoped), and `utils/mutationFeedback.test.ts` ACC-05 (SPEC-85 pins `edit-transaction.tsx`). |
| **CON-12** | **SPEC-105 ACC-08 MUST be re-pinned** (test-only, no app change): it asserts the new copies live in exactly one screen, which becomes false the moment SPEC-106 ships the same strings on Add. The re-pin **MUST** keep its intent — the copies exist on both screens and nowhere else. |
| **CON-13** | No code, config, or dependency change before this spec is marked **FINAL** by the user (AGENTS §1.1). |
| **CON-14** | **MUST** follow the SPEC-04 template and the AGENTS.md §1.10 platform matrix (Objective vs Subjective). |
| **CON-15** | Bare-minimum diff (AGENTS §1.11): ONLY the state declarations, `fetchPaymentMethods` auto-select block, the two `selectedMethodType` call sites, the type-chip `onPress`, the `handleSubmit` guard + `msgs` fix, the new synthetic-label constant named in D-01, and the payload line. No refactor, no drive-by cleanup. |

---

## Goal

On Add Transaction, no payment source is pre-chosen: the user must tap a type chip or a method chip before the transaction can be saved, and the block is reported with a specific message. Every type tap takes effect, including when the API returned no method of that type.

### Interaction Matrix

| State | Expected |
|-------|----------|
| Screen opens (all platforms) | No type chip selected; no source value (was: CASH chip selected + `"cash"` silently stored) |
| Tap a type chip, API has a method of that type | First method of that type becomes the source; method row shows its siblings |
| Tap a type chip, API has no method of that type | Synthetic label (`Bank`, `E-Wallet`, …) becomes the source; method row empty (was: source silently unchanged) |
| Tap a method chip in the method row | That method's name becomes the source — unchanged behavior |
| Save with no source touched | `Invalid Payment Source` / `Please select a payment source.`; screen stays open |
| Save with a source chosen | Transaction saves; payload carries the chosen name |
| Save with no category | `Validation Error` / `Please select a category.` (unchanged) |
| Save with Others selected and blank custom text | `Validation Error` / `Please specify a category.` (was: wrongly "Please select a category.") |
| Offline / Local / empty API list | Five type chips still selectable; every tap yields a source; save blocked until one is tapped |

### Decisions

| ID | Decision |
|----|----------|
| **DEC-01** | Nullable `paymentMethod` + nullable `selectedMethodType`, mirroring SPEC-105 CON-06/CON-02 — one pattern across Add and Edit. Rejected: keeping `selectedMethodType` non-null, which would leave the CASH chip looking selected while the guard blocks. |
| **DEC-02** | Delete the `fetchPaymentMethods` auto-select (CON-03) — it is the same implicit-choice defect SPEC-105 removed from the edit screen's `"cash"` default. Rejected: keeping a default "so the user always has one", which is exactly the reported problem. |
| **DEC-03** | Synthetic label on every type tap (CON-05) using the shared `Cash`/`Card`/`Bank`/`E-Wallet`/`Other` vocabulary (SPEC-105 fallback + SPEC-80 `PAY_SOURCE_OPTIONS`) — so a tap never no-ops. Rejected: leaving non-cash types without a value, which would dead-end the user on Local/offline. |
| **DEC-04** | Guard in `handleSubmit`, not `validate()` (CON-08) — TS cannot narrow across `validate()`; the handler-level guard gives narrowing for free and matches SPEC-105's shape. A `validate()` rule would additionally require a duplicated `msgs` entry and still leave the payload un-narrowed. |
| **DEC-05** | `setAlertDialog` for the source error (CON-07), the screen's own dialog — rejected: a `HelperText` row, which this screen's payment-source block has no slot for and SPEC-105 DEC-02 already rejected. |
| **DEC-06** | Correct the category alert copy (CON-10) — same validation surface, same user need ("the form must say which selection is missing"). **Late-caught during implementation and disclosed:** the drafted `errors[firstErrorKey]`-preferred read is inert because `setErrors` is batched, so the fix routes the message through `validate()`'s return value instead and deletes the redundant `msgs` map. |
| **DEC-07** | Re-pin SPEC-105 ACC-08 (CON-12) rather than inventing different copy for Add — two screens reporting the same requirement should use the same words. Rejected: unique-but-inconsistent copy to dodge a guard conflict. |
| **DEC-08** | New SPEC-106 file owns these changes; SPEC-105/80/45/47 documents are NOT edited (§1.14). |

### Acceptance Criteria

| ID | Criterion | Type |
|----|-----------|------|
| **ACC-01** | Source scan of `app/add-transaction.tsx`: `paymentMethod` is declared `useState<PaymentMethod \| null>(null)`; `useState<PaymentMethod>("cash")` MUST NOT appear. | Objective |
| **ACC-02** | Source scan: `fetchPaymentMethods` contains **no** `setPaymentMethod(data[0].name)` and no `setPaymentMethod` call at all inside it; its `ok`/`Array.isArray` guard and `setAvailablePaymentMethods(data)` are unchanged. | Objective |
| **ACC-03** | Source scan: `selectedMethodType` is declared nullable with `null`; both `selectedMethodType.toLowerCase()` sites are null-guarded; the method-chip `isMethodSelected` compare is null-guarded on `paymentMethod` as well (TS18047 class, caught by user-run tsc 2026-10-13); the method row still renders only for a non-cash selected type. | Objective |
| **ACC-04** | Source scan: the type-chip `onPress` sets `selectedMethodType`, then sets `paymentMethod` in **both** branches (API method first-of-type, else synthetic label); the `else if (t === "cash")` single-branch form MUST NOT appear; the synthetic labels are `Cash`/`Card`/`Bank`/`E-Wallet`/`Other`. | Objective |
| **ACC-05** | Source scan of `handleSubmit`: after the `firstErrorKey` branch there is a null `paymentMethod` guard that calls `setAlertDialog` with `"Invalid Payment Source"` and `"Please select a payment source."` and returns; `validate()` contains no `paymentSource`/`paymentMethod` rule. | Objective |
| **ACC-06** | Source scan: the `addTransaction` payload carries a bare `paymentMethod,` line, with no `paymentMethod ?? undefined`, no `paymentMethod \|\| "cash"`, no `paymentMethod!`, and no `as PaymentMethod`; `category,` / `note,` lines unchanged. **Note (test-repair 2026-10-13):** the negative checks are scoped to the paymentMethod token — the payload's pre-existing `category: category ?? undefined` and `receiptUrl: receiptImage || undefined` lines are legitimate (`Category | null` → optional field) and MUST NOT be caught by a whole-payload ban. | Objective |
| **ACC-07** | Source scan: `validate()` returns the first message (`Object.values(next)[0] || null`), not a key; `handleSubmit` alerts that message directly with no `msgs` map and no `errors[...]` read in the same tick; the resulting copy for an unselected category is `"Please select a category."` and for the blank Others case is `"Please specify a category."`; `clearError` and the inline category `HelperText` are untouched. | Objective |
| **ACC-08** | Source scan: imports unchanged (no new import line, no new dep); CON-11's `OPENING_BALANCE_CATEGORY_ID` present and `t.title !== "Opening Balance"` absent; SPEC-80/85 target files untouched. | Objective |

Note: `app/add-transaction.tsx` has no test-visible pre-existing pins beyond SPEC-45 ACC-04 (`apiSourceOfTruth.test.ts`), so the new `utils/addTransactionRequiredSource.test.ts` is the only guard file added by this spec.
| **ACC-09** | Source scan: the two new copy strings exist on exactly two screens — `app/add-transaction.tsx` and `app/edit-transaction.tsx` — and nowhere else in `app/`; `utils/editTransactionRequiredFields.test.ts` ACC-08 is re-pinned to allow both. | Objective |
| **ACC-S01** | Reviewer on Android + iPhone (Expo Go): Add Transaction opens with **no** type chip selected; tap Save Changes with nothing picked → `Invalid Payment Source` dialog with the right copy and the screen stays open. FAIL = saves silently, or the CASH chip already looks selected. | Subjective |
| **ACC-S02** | Reviewer on Android + iPhone (Expo Go): tap BANK (no bank method configured) → the BANK chip is selected and the source is actually BANK (method row empty); save succeeds and Transaction Details shows the same source. FAIL = source silently stays a previous value. | Subjective |
| **ACC-S03** | Reviewer offline / Local account: tap each type in turn → every tap yields a source and the method row behaves as expected; save blocked only until the first tap. FAIL = any tap that changes nothing, or an uncatchable save. | Subjective |
| **ACC-S04** | Reviewer on all three: Others selected + blank Specify Category → alert says `Please specify a category.` (was `Please select a category.`); empty category → `Please select a category.`. FAIL = wrong copy on either path. | Subjective |
| **ACC-S05** | Reviewer on Web: same flow, API-direct fetch renders the method row, no console error, no layout regression in the two chip rows. FAIL = console error, blank row, or layout break. | Subjective |

---

## Platform Matrix (AGENTS.md §1.10)

| Platform | Objective (machine-checkable) | Subjective (reviewer-observed) |
|----------|-------------------------------|-------------------------------|
| **Android** | ACC-01..ACC-09 pass with `Platform.OS === "android"`. | Expo Go: no pre-selection, guard blocks, every type tap takes effect (ACC-S01/S02/S03/S04). |
| **iOS** | Same guards with `Platform.OS === "ios"`. | Expo Go: identical behavior (ACC-S01/S02/S03/S04). |
| **Web** | Same guards with `Platform.OS === "web"`. | Web export: API-direct method row, guard fires, console clean, layout intact (ACC-S05). |

TDD coverage (§1.10): new `utils/addTransactionRequiredSource.test.ts` covers ACC-01..ACC-09 parameterized by `Platform.OS` (`android`/`ios`/`web` via mock); ACC-S01..S05 are user-run manual checks exactly as written above (a real API round-trip and on-device dialog rendering are not jest-provable — guards pin the state types, the removed auto-select, the two-branch `onPress`, the ordered handler guard, the payload narrowing, and the shared copy).

---

## Deliverables

| ID | Deliverable |
|----|-------------|
| **D-01** | `app/add-transaction.tsx` ONLY: nullable `paymentMethod` + nullable `selectedMethodType`; delete the `fetchPaymentMethods` auto-select; null-safe the two `selectedMethodType` call sites; two-branch type-chip `onPress` with the synthetic labels from a new module-level label constant (named here per §1.11: `PAYMENT_TYPE_LABELS`); `validate()` returns the first message and `handleSubmit` alerts it directly (redundant `msgs` map deleted); `handleSubmit` null-source guard after the validation branch; payload carries the narrowed `paymentMethod`. |
| **D-02** | Re-pin `utils/editTransactionRequiredFields.test.ts` ACC-08 (test-only, no app change): allow the two new copy strings on both `app/edit-transaction.tsx` and `app/add-transaction.tsx` and nowhere else. |
| **D-03** | New `utils/addTransactionRequiredSource.test.ts` (named here per §1.11): guards for ACC-01..ACC-09 × android/ios/web. `blockOf()`-style helpers **MUST** anchor on the opener (SPEC-93 lesson). |
| **D-04** | Docs after implementation (AGENTS §1.8, post-FINAL only): `docs/savepoint.md` entry + `AGENTS.md` §3 status line, including the CON-12 re-pin note and the SPEC-105 ACC-08 amendment. Implemented after D-01..D-03 are verified (user-run jest/lint/tsc per §1.3). |

---

## Glossary

| Term | Definition |
|------|------------|
| **Implicit selection** | A value written without a user gesture — the `"cash"` default on Edit (SPEC-105) and `data[0].name` auto-select on Add (CON-03). The defect class this spec removes. |
| **Type chip** | The first-level Payment Source row (`cash` / `card` / `bank` / `e_wallet` / `other`); tapping one sets `selectedMethodType` and, per CON-05, a source. |
| **Method chip** | The second-level row listing the user's API payment methods for the selected type; shown only when the selected type is not cash. |
| **Synthetic label** | The `Cash`/`Card`/`Bank`/`E-Wallet`/`Other` string used when the API has no method of the tapped type — shared with SPEC-105's offline fallback and SPEC-80's `PAY_SOURCE_OPTIONS`. |
| **`msgs` map** | The hardcoded per-field copy in `handleSubmit` (`:172-176`) whose `category` entry masked the Others message (finding 3). |

---

## References

- `app/add-transaction.tsx:47` (`useState<PaymentMethod>("cash")`), `:56` (`selectedMethodType`), `:82-94` (fetch + auto-select), `:129-157` (`validate`), `:169-183` (`handleSubmit` + `msgs`), `:331-382` (Payment Source chips), `~:205-214` (payload)
- `app/edit-transaction.tsx` (SPEC-105 — the sibling pattern, unedited)
- `context/TransactionsContext.tsx:39-50` (`sanitizeTransaction` — why `?? undefined` is banned, CON-09)
- `types/index.ts:3,5-10,32` (`PaymentMethod = string`, `PaymentMethodInfo`, optional field)
- `app/dues.tsx` `PAY_SOURCE_OPTIONS` (SPEC-80 v1.1 — the shared label vocabulary)
- `utils/apiSourceOfTruth.test.ts:18-60` (SPEC-45 ACC-04 pins on this file), `utils/editTransactionRequiredFields.test.ts:169-182` (SPEC-105 ACC-08 to be re-pinned)
- `specs/105-edit-transaction-required-fields.md`, `specs/80-payment-source-rename-and-fetch-open.md`, `specs/47-due-payment-method-picker.md`, `specs/85-delete-edit-success-toasts.md`
- `AGENTS.md` §1.1 (spec-first), §1.9 (spec format), §1.10 (platform matrix + TDD), §1.11 (bare-minimum), §1.12 (no new deps), §1.14 (one home)
