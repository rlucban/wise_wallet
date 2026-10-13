# SPEC-107: Edit Transaction — Category Required-Field Feedback

| Field | Value |
|-------|-------|
| **ID** | SPEC-107 |
| **Title** | Edit Transaction — Category Required-Field Feedback |
| **Status** | FINAL v1.0 (per user call 2026-10-13 — implement as written, including the SPEC-105 ACC-07 re-pin) |
| **Owner** | @rcluc |
| **Version** | 1.0 FINAL |
| **Scope** | `app/edit-transaction.tsx` ONLY (prefill branch, `HelperText` render, suggestion marker) + new guard file `utils/editTransactionCategoryFeedback.test.ts` |
| **Non-goals** | No change to the Add Transaction screen, category chips, Payment Source row, or the `paymentMethod`/`editedCategory` logic of SPEC-105/106; no change to `utils/categoryOptions.ts`, `context/TransactionsContext.tsx`, or `types/index.ts`; no change to the six SPEC-105 `handleSave` guards or their copies; no new dependency |

---

## Conventions

The key words **MUST**, **MUST NOT**, **REQUIRED**, **SHALL**, **SHALL NOT**, **SHOULD**, **SHOULD NOT**, **RECOMMENDED**, **MAY**, and **OPTIONAL** in this document are to be interpreted as described in RFC 2119.

---

## Context

User report (2026-10-13, web screenshot at `localhost:8081/edit-transaction?id=fd579096-16ab-446…`): on Edit Transaction the Category row shows **no selected chip**, the "Specify Category" field is already expanded, and nothing tells the user a category is required.

Source trace: the prefill effect (`app/edit-transaction.tsx:105-116`) reads

```js
setSelectedCategory(tx.category || null);
…
if (tx.category && availableCategories.length > 0) {
  const isKnown = availableCategories.some((c) => c.id === tx.category?.id);
  if (!isKnown && tx.category.name !== "Others") {
    setSelectedCategory(others);
    setCustomCategory(tx.category.name);
  } else {
    setCustomCategory("");
  }
}
```

When the stored category's `id` is unknown to the fetched list **and** its name is `"Others"`, the branch is skipped by the `tx.category.name !== "Others"` predicate. `selectedCategory` therefore keeps the unknown-id object, so:

- `isOthersCategory()` (`utils/categoryOptions.ts:20-22`) is `true` only because the name matches — the "Specify Category" field renders, exactly as in the screenshot;
- no chip's `id` matches, so nothing renders selected — matching the screenshot;
- `selectedCategory` is **non-null**, so SPEC-105's `Invalid Category` guard never fires and **Save proceeds** with a category the user cannot see.

This unknown-Others state is reached in two real ways: (a) `context/TransactionsContext.tsx:47-49` synthesizes `{ id: "uncategorized", name: "Others", … }` for any transaction stored without a category — the "uncategorized" placeholder is exactly an unknown Others; and (b) a real Others category whose id drifted from the fetched list.

The screen therefore reports "no category" while persisting one. The user cannot learn what is missing because the only feedback channel SPEC-105 added is a blocking alert that never triggers in this state.

**User decisions captured (2026-10-13):**
- Unknown category **MUST** clear the selection (not auto-select the canonical Others chip, which would silently write a category the user never chose).
- Feedback **MUST** be visible **before** Save so the user knows, i.e. a persistent inline `HelperText` — the pattern already used on Add Transaction (`app/add-transaction.tsx:327-329`).

---

## Constraints

| ID | Constraint |
|----|------------|
| **CON-01** | The screen **MUST** remain fully functional on **Android, iOS, and Web** (Expo SDK 57); Expo Go import-safe; Vercel-deployable. |
| **CON-02** | When the stored category's name is `"Others"` and its id is unknown to the fetched list, the prefill **MUST** set `selectedCategory` to `null` and `customCategory` to `""`. The previously chosen path (unknown id **with a real name**) **MUST** keep selecting the canonical Others and prefilling `customCategory` with the stored name — it preserves user data. |
| **CON-03** | The prefill branch **MUST NOT** auto-select the canonical Others for the unknown-Others case. Auto-selection would persist `"Others"` that the user never chose, hiding the very gap the user reported. |
| **CON-04** | The Category row **MUST** render a persistent inline `HelperText` while no category is selected, using the screen's own copy `"Please select a category."` — identical wording to SPEC-105's guard. **MUST** use Paper's `HelperText` (already imported? — see CON-06) with `type="error"`, matching Add Transaction's row at `app/add-transaction.tsx:327-329`. |
| **CON-05** | The helper row **MUST NOT** be gated on a "has attempted to save" flag or any local `errors` state; it derives purely from `!selectedCategory`, so the user sees it on screen open. **MUST NOT** render when a category is selected — no flicker or layout shift once chosen. |
| **CON-06** | `HelperText` is **not** currently imported in `app/edit-transaction.tsx`, so the `react-native-paper` import line **MUST** be widened by that one token only — and this **MUST** invalidate SPEC-105's ACC-07 `expect(source).not.toContain("HelperText")` pin, which exists only because SPEC-105's edit screen was `Alert.alert`-only. That pin is re-pinned by D-03. No other import change; no new dep. |
| **CON-07** | The "Specify Category" field **MUST** still render only via `isOthersCategory(selectedCategory)` (unchanged), which under CON-02 is `false` in the reported state — so the field collapses as soon as the selection is cleared, and the user sees the empty chip row plus the helper row. |
| **CON-08** | SPEC-105's `handleSave` guards, their order, and their copies **MUST** stay byte-identical, including `Alert.alert("Invalid Category", "Please select a category.")`. This spec only adds *proactive* feedback; the blocking guard stays the backstop. |
| **CON-09** | Existing FINAL spec pins **MUST** stay green: SPEC-105 ACC-02 (nullable `paymentMethod`, no `useState<PaymentMethod>("cash")`), ACC-03 (case-insensitive compare, no deselect), ACC-04 (echo chip + hardcoded-five fallback), ACC-05 (six ordered guards, no folded `!id`), ACC-06 (narrowed payload), ACC-07 (imports, SPEC-85 ACC-05 + SPEC-80 ACC-01 pins), ACC-08 (two-screen vocabulary), and `utils/mutationFeedback.test.ts` ACC-05. The new chips/row **MUST NOT** introduce `HelperText` into any file SPEC-85 ACC-05 pins as `HelperText`-free — those pins are SPEC-105's own file scope, which this spec amends per D-04. |
| **CON-10** | Bare-minimum diff (AGENTS §1.11): ONLY the prefill branch named in CON-02, the `HelperText` render row, and the CON-06 import token. No refactor of the surrounding effect, no cleanup of `availableCategories`, no style-file change beyond what the helper row needs inline. |
| **CON-11** | No code, config, or dependency change before this spec is marked **FINAL** by the user (AGENTS §1.1). |
| **CON-12** | **MUST** follow the SPEC-04 template and the AGENTS.md §1.10 platform matrix (Objective vs Subjective). |

---

## Goal

Opening a transaction whose category cannot be rendered shows an unselected Category row with a visible, red, self-explanatory hint, and the user can fix it before ever pressing Save. Saving with it still empty blocks with the SPEC-105 alert.

### Interaction Matrix

| State | Expected |
|-------|----------|
| Category present and known (normal case) | Chip selected; helper row absent; Specify Category shown only for a real Others (was: same) |
| Stored category = `"Others"` with unknown id (incl. `"uncategorized"` placeholder) | **No chip selected**; `Please select a category.` shown in red under the chips; Specify Category collapsed; Save blocks with the SPEC-105 alert |
| Stored category = real custom name with unknown id (data preserved) | Canonical Others selected + name in Specify Category; helper row absent (unchanged — user data is not lost) |
| User taps any chip | Selection set; helper row disappears immediately |
| Save with no category | Alert `Invalid Category` — unchanged copy, unchanged guard |

### Decisions

| ID | Decision |
|----|----------|
| **DEC-01** | Clear the selection for the unknown-Others case (user call) — rejected: auto-selecting the canonical Others, which silently rewrites data the user never chose; rejected: adding an "include unknown Others" match to the `!isKnown` branch, which would render the placeholder as a real selection. |
| **DEC-02** | Persistent helper row derived from `!selectedCategory` (user call: "para malaman ni user") — rejected: a save-attempt-gated error, which is invisible until the user already failed; rejected: an alert-only backstop, which is the state that shipped broken. |
| **DEC-03** | Copy reuses SPEC-105's exact string `"Please select a category."` — the two surfaces (proactive hint and blocking alert) must read identically; no second vocabulary for the same rule. |
| **DEC-04** | Amend SPEC-105's ACC-07 note rather than let a stale `HelperText`-free pin contradict this spec (§1.14). SPEC-105 keeps its own file scope for the screen's OTHER feedback — the SPEC-85 ACC-05 pins on `edit-transaction.tsx`'s dialog style and alert strings are unaffected because `HelperText` is a Paper component, not a literal in those pins. |
| **DEC-05** | New SPEC-107 file owns the Category feedback; SPEC-105/106 and their guard files are NOT edited beyond the CON-09/D-04 pin re-assertions. |

### Acceptance Criteria

| ID | Criterion | Type |
|----|-----------|------|
| **ACC-01** | Source scan of `app/edit-transaction.tsx`: the prefill effect's unknown-id branch clears the selection — `setSelectedCategory(null)` and `setCustomCategory("")` appear on the `name === "Others"` path. | Objective |
| **ACC-02** | Source scan: the prefill effect keeps the data-preserving path — when the stored name is **not** `"Others"`, the canonical Others is selected and `setCustomCategory(tx.category.name)` still runs. `availableCategories`, `ensureOthersOption` behave as before. | Objective |
| **ACC-03** | Source scan: the Category row renders a `HelperText` with `type="error"` whose message is `"Please select a category."`, gated only on a `!selectedCategory` expression — no save-attempt flag, no `errors` state, no `visible={…}` bound to anything but the selection. | Objective |
| **ACC-04** | Source scan: the helper row is inside the Category section (after the chip `View`, before the Specify Category input) so it hides when a category is chosen; the Specify Category gate `isOthersCategory(selectedCategory)` is unchanged. | Objective |
| **ACC-05** | Source scan: `HelperText` is imported from `react-native-paper` (widened by that token if it was missing); no other import line changes; no new dependency. | Objective |
| **ACC-06** | Source scan: SPEC-105's `handleSave` guards are byte-identical — the six `Alert.alert` copies, their order, the payload's narrowed `paymentMethod`, and the SPEC-85 ACC-05 / SPEC-80 ACC-01 pins all still hold. | Objective |
| **ACC-07** | Source scan: the Category helper row's copy `"Please select a category."` appears exactly **twice** in the file — once inline (ACC-03) and once in the guard (SPEC-105) — and nowhere else. | Objective |
| **ACC-S01** | Reviewer on Web and Android: open a transaction whose category renders as unselected (screenshot's state) → the chip row is empty, `Please select a category.` is visible in red below it, and Specify Category is collapsed. FAIL = no hint, or the hint only appears after tapping Save. | Subjective |
| **ACC-S02** | Reviewer picks a category → the hint disappears immediately and Save works. FAIL = hint lingers, or the row jumps. | Subjective |
| **ACC-S03** | Reviewer opens a transaction with a real custom category (e.g. `Pet Care`) → canonical Others selected with `Pet Care` prefilled; hint absent. FAIL = data lost. | Subjective |
| **ACC-S04** | Reviewer on Android + iPhone (Expo Go): same three checks; no red-box; dark mode hint readable; no console error on web export. | Subjective |

---

## Platform Matrix (AGENTS.md §1.10)

| Platform | Objective (machine-checkable) | Subjective (reviewer-observed) |
|----------|-------------------------------|-------------------------------|
| **Android** | ACC-01..ACC-07 pass with `Platform.OS === "android"`. | Expo Go: hint visible in the unselected state, disappears on pick (ACC-S01/S02/S03/S04). |
| **iOS** | Same guards with `Platform.OS === "ios"`. | Expo Go: identical behavior (ACC-S01..S04). |
| **Web** | Same guards with `Platform.OS === "web"`. | Web export: hint at `localhost:8081` repro state, no console error (ACC-S01/S04). |

TDD coverage (§1.10): new `utils/editTransactionCategoryFeedback.test.ts` covers ACC-01..ACC-07 parameterized by `Platform.OS` (`android`/`ios`/`web` via mock); ACC-S01..S04 are user-run manual checks exactly as written above (the `"uncategorized"` placeholder path needs a real stored record — jest pins the branch and the render gate).

---

## Deliverables

| ID | Deliverable |
|----|-------------|
| **D-01** | `app/edit-transaction.tsx` ONLY: (i) prefill unknown-id branch clears the selection when the stored name is `"Others"` while preserving the data path for real names; (ii) a persistent error `HelperText` row in the Category section gated only on `!selectedCategory`; (iii) the `HelperText` import token if missing. |
| **D-02** | New `utils/editTransactionCategoryFeedback.test.ts` (named here per §1.11): guards for ACC-01..ACC-07 × android/ios/web. Block helpers **MUST** anchor on the opener (SPEC-93 lesson). |
| **D-03** | Amend SPEC-105's ACC-07 note and **re-pin its guard** (test-only, no app change) to cross-reference this spec's `HelperText` addition (§1.14, disclosure). SPEC-105's `expect(source).not.toContain("HelperText")` becomes `expect(countOf(source, "<HelperText")).toBe(1)` plus the exact render expression — preserving the pin's intent (no helper row for any other field). Note the element token is counted, not the literal: the string `HelperText` also occurs in the import and the closing tag. The SPEC-85 ACC-05 pins in the same test are untouched: they target the dialog style and the `Alert.alert` strings, not `HelperText`. |
| **D-04** | Docs after implementation (AGENTS §1.8, post-FINAL only): `docs/savepoint.md` entry + `AGENTS.md` §3 status line, including the D-03 re-pin note. NOT part of the spec-writing step; no doc edit ships with the DRAFT. |

---

## Glossary

| Term | Definition |
|------|------------|
| **Unknown-id Others** | A stored category whose name is `"Others"` but whose `id` is absent from the fetched `availableCategories` — including the `"uncategorized"` placeholder synthesized by `TransactionsContext.tsx:47-49`. |
| **Data-preserving path** | The prefill branch that re-selects the canonical Others and prefills the custom name for a stored category with a **real** name (not `"Others"`). |
| **Persistent helper row** | A Paper `HelperText type="error"` shown whenever the field is unselected — proactive feedback, unlike a save-attempt-gated error. |

---

## References

- `app/edit-transaction.tsx:94-116` (prefill effect — the unknown-id branch), `:224-248` (Category section + Specify Category), `:130-172` (SPEC-105 `handleSave` guards)
- `utils/categoryOptions.ts:11-22` (`ensureOthersOption`, `isOthersCategory` — why `"uncategorized"` behaves like a real Others)
- `context/TransactionsContext.tsx:39-50` (`sanitizeTransaction` — synthesis of the `"uncategorized"` placeholder)
- `app/add-transaction.tsx:327-329` (the Add Transaction helper-row precedent)
- `utils/editTransactionRequiredFields.test.ts`, `utils/mutationFeedback.test.ts` (pins that MUST stay green)
- `specs/105-edit-transaction-required-fields.md` (CON-07 guards, ACC-02..08), `specs/85-delete-edit-success-toasts.md` (ACC-05 pin), `specs/80-payment-source-rename-and-fetch-open.md` (ACC-01 copy pins)
- `AGENTS.md` §1.1 (spec-first), §1.9 (spec format), §1.10 (platform matrix + TDD), §1.11 (bare-minimum), §1.12 (no new deps), §1.14 (one home)
