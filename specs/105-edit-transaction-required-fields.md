# SPEC-105: Edit Transaction — Required Payment Source and Category

| Field | Value |
|-------|-------|
| **ID** | SPEC-105 |
| **Title** | Edit Transaction — Required Payment Source and Category |
| **Status** | FINAL v1.0 (per user call 2026-10-13 — implement as written; `Alert.alert` feedback confirmed) |
| **Owner** | @rcluc |
| **Version** | 1.0 FINAL |
| **Scope** | `app/edit-transaction.tsx` ONLY (payment-source state + fetch + chip render + `handleSave` guards) + new guard file `utils/editTransactionRequiredFields.test.ts` |
| **Non-goals** | No change to `app/add-transaction.tsx` (the pattern source, unedited); no change to amount/date/note/establishment/receipt/category-selection behavior; no server or `wallet-api` change; no new dependency; no change to the result dialog, `safeGoBack`, or `updatedAt` write path |

---

## Conventions

The key words **MUST**, **MUST NOT**, **REQUIRED**, **SHALL**, **SHALL NOT**, **SHOULD**, **SHOULD NOT**, **RECOMMENDED**, **MAY**, and **OPTIONAL** in this document are to be interpreted as described in RFC 2119.

---

## Context

User report (2026-10-13): editing a transaction must require a selected **Payment Source** and **Category** — if either is absent the edit must not proceed. Source trace of `app/edit-transaction.tsx` found three distinct facts, not one bug:

1. **The payment source is never actually unselectable, but it frequently *looks* unselected.** `types/index.ts:3` declares `PaymentMethod = string` — a free-form string, not a union. `app/add-transaction.tsx:88,344,346` persists the payment-method **name** from the API (`data[0].name` / `method.name`), so records carry values like `"Cash"` (capital C), `"GCash"`, `"BPI"`. `app/edit-transaction.tsx:264` compares with a case-sensitive `paymentMethod === method.value` against the hardcoded five (`"cash"`, `"card"`, `"bank_transfer"`, `"e_wallet"`, `"other"`). Result: **no chip renders as selected** for `"Cash"` (case) or `"GCash"` (not in the list), while `app/transaction-details.tsx:198` shows the real name — the Details and Edit screens disagree, and the edit screen reads as "no payment source".
2. **The category guard is a silent no-op.** `app/edit-transaction.tsx:140` is `if (!selectedCategory || !id) return;` — no `Alert`, no inline error. Pressing Save Changes does nothing with zero feedback, so the user cannot tell why the edit did not proceed. The `!id` case is folded into the same condition, so a missing id would be misreported as a category problem once feedback is added.
3. **The payment-source state cannot be empty by construction.** `useState<PaymentMethod>("cash")` (`:45`) defaults to a value and the chips' `onPress` only ever sets one — there is no deselect path. A naive "must select payment source" guard would therefore be dead code. Making the state nullable (start `null`, seed from `tx.paymentMethod || null`) turns the guard live for transactions that genuinely carry no source, and is the only honest way to satisfy the requirement.

**User decisions captured (2026-10-13):**
- Fix **both** #1 and #2 in one spec.
- Payment source list: **fetch the user's real payment methods** (`authFetch("paymentMethods")`, the `add-transaction.tsx` precedent) rather than case-insensitive-only matching against the hardcoded five — a value like `"GCash"` must render as genuinely selected.
- Error mechanism for the new guards: **`Alert.alert`**, not inline `HelperText` — pinned by the existing FINAL SPEC-85 ACC-05 (`utils/mutationFeedback.test.ts:44`).

---

## Constraints

| ID | Constraint |
|----|------------|
| **CON-01** | The screen **MUST** remain fully functional on **Android, iOS, and Web** (Expo SDK 57); Expo Go import-safe; Vercel-deployable. |
| **CON-02** | The payment-source option list **MUST** be fetched from the API exactly as `add-transaction.tsx:82-94` does: `authFetch<PaymentMethodInfo[]>("paymentMethods")` inside a `try`/`catch` that only `console.error`s, setting state only when `ok && Array.isArray(data)`. Same call, same guard, same failure posture. |
| **CON-03** | The payment-source chips **MUST** render the fetched `PaymentMethodInfo` list (`method.name` label, `method.icon` icon, `method.id` key). The hardcoded `PAYMENT_METHODS` constant **MUST NOT** be deleted; it becomes the offline/empty-list fallback when the fetch yields nothing (Local account, offline, web cold start) so a user can always choose a source. |
| **CON-04** | The option list **MUST** be normalized to one shape for rendering, and the **current value MUST stay visible even when it is not in the list** (echo-wins, SPEC-46 D-02 / SPEC-49 D-02 precedent). If `paymentMethod` is non-null and no option matches it case-insensitively by label, an extra chip carrying the current string **MUST** be appended. A transaction whose source is `"GCash"` **MUST** render with `"GCash"` selected — never zero selected chips. |
| **CON-05** | Selection matching **MUST** be case-insensitive (`paymentMethod.toLowerCase() === label.toLowerCase()`), mirroring `add-transaction.tsx:334,366`. The chips' `onPress` **MUST** still only ever set a value — **no deselect path** is introduced (CON-08 is enforced by the nullable state, not by a tap-to-clear). |
| **CON-06** | `paymentMethod` state **MUST** become `PaymentMethod \| null`, initial `null`, seeded by the prefill effect as `tx.paymentMethod \|\| null`. `useState<PaymentMethod>("cash")` and `tx.paymentMethod \|\| "cash"` **MUST NOT** survive. |
| **CON-07** | `handleSave` **MUST** guard, in this order, each with its own `Alert.alert` and its own early `return`, and none of them silent: (a) amount NaN/≤0 → `Alert.alert("Invalid Amount", "Please enter a valid amount greater than 0.")` — unchanged; (b) amount > 10,000,000 → `Alert.alert("Invalid Amount", "Amount must not exceed 10,000,000.")` — unchanged; (c) `!id` → own message, MUST NOT reuse the category copy; (d) `!selectedCategory` → `Alert.alert("Invalid Category", "Please select a category.")`; (e) `!paymentMethod` → `Alert.alert("Invalid Payment Source", "Please select a payment source.")`; (f) `isOthersCategory(selectedCategory) && !customCategory.trim()` → `Alert.alert("Invalid Category", "Please specify a category.")` — unchanged. |
| **CON-08** | The save **MUST NOT** proceed while `paymentMethod` is null or `selectedCategory` is null. After the guards, TypeScript narrowing **MUST** make `paymentMethod` non-null at the `updateTransaction` call site — no `!`, no `as`, no `|| "cash"` fallback inside the payload. |
| **CON-09** | Imports **MUST** be widened minimally and only on existing lines: `../types` gains `PaymentMethodInfo`; a new `authFetch` import from `../utils/apiClient`. `HelperText` **MUST NOT** be added (SPEC-85 ACC-05 pins `Alert.alert`; no JSX error row). No new dep. |
| **CON-10** | Bare-minimum diff (AGENTS §1.11): ONLY the payment-source block, the `paymentMethod` state/seed, the `handleSave` guard block, the two import lines, the new `useState`/`useMemo`/effect hookup, and the new style entries if any are required. No refactor of the amount/date/note/establishment/receipt/category code, no change to `availableCategories`/`fetchCategories`, no change to the result dialog or `handleResultOk`. |
| **CON-11** | Existing FINAL spec pins **MUST** stay green: `utils/mutationFeedback.test.ts` ACC-05 (`maxWidth: 480, width: "90%", alignSelf: "center", marginHorizontal: 0`, `resultDialog.ok ? "check-circle-outline" : "alert-circle-outline"`, `"Saved Successfully"`, `"Save Failed"`, `Your changes have been saved.`, `Alert.alert("Invalid Amount"`, `Alert.alert("Invalid Category"`, no `showToast`, no `ToastContext`) and `utils/paySourceRename.test.ts` ACC-01 (`>Payment Source</Text>` present, `>Payment Method</Text>` absent) / ACC-01 identifiers (`PaymentMethod` present). |
| **CON-12** | No code, config, or dependency change before this spec is marked **FINAL** by the user (AGENTS §1.1). |
| **CON-13** | **MUST** follow the SPEC-04 template and the AGENTS.md §1.10 platform matrix (Objective vs Subjective). |

---

## Goal

Editing a transaction cannot silently no-op: a missing category or payment source is reported with a specific message, and the edit does not proceed. The screen also always shows which payment source is currently saved, including values the API invented (names like `"GCash"`), so the requirement is observable rather than structural only.

### Interaction Matrix

| State | Expected |
|-------|----------|
| Transaction saved with `paymentMethod: "GCash"` | `GCash` chip renders selected (was: nothing selected) |
| Transaction saved with `paymentMethod: "Cash"` (capital) | `Cash` chip renders selected (was: nothing selected) |
| Transaction with no category | Save → `Invalid Category` / `Please select a category.`; screen stays open; nothing written |
| Transaction with no payment source, API reachable | User must tap a fetched source chip, then Save proceeds |
| Transaction with no payment source, API unreachable / Local | Hardcoded five chips render (CON-03 fallback); user must pick one; Save blocked until they do |
| `isOthersCategory` selected, blank custom text | `Invalid Category` / `Please specify a category.` — unchanged copy |
| API fetch in flight | Existing source chip (if any) already visible; fetched chips appear on arrival; no empty state flash that blocks saving a valid edit |
| Amount 0 / > ₱10M | `Invalid Amount` copies — unchanged |

### Decisions

| ID | Decision |
|----|----------|
| **DEC-01** | Fetch the real payment methods (user call) — rejected: case-insensitive-only matching, which fixes `"Cash"` but leaves `"GCash"` invisible; rejected: hardcoded five only, which is today's defect. |
| **DEC-02** | `Alert.alert` for the new guards (SPEC-85 ACC-05 pin + the file already uses it three times) — rejected: inline `HelperText`, which would need a new import, new error state, and a JSX row, and would break the pinned pattern in this file (Add Transaction's precedent is a different screen). |
| **DEC-03** | Nullable `paymentMethod` state rather than a sentinel like `""` — the type already permits null and TS narrowing at the call site then proves CON-08 (rejected: `""`, which is falsy but indistinguishable from a real empty API name). |
| **DEC-04** | Echo-wins unmatched current value (CON-04) rather than silently mapping it onto the closest hardcoded chip — SPEC-46 D-02 / SPEC-49 D-02 precedent; a silent remap would destroy the user's data. |
| **DEC-05** | No deselect path on the chips (CON-05) — the requirement is enforced by nullable state + guards, not by letting a user clear a good value by mis-tapping. |
| **DEC-06** | New SPEC-105 file owns these guards; SPEC-80/82/85/46/49 documents are NOT edited (§1.14). |
| **DEC-07** | The `!id` branch gets its own message instead of being folded into the category guard — required by CON-07(c); otherwise the new category copy would be a lie. |

### Acceptance Criteria

| ID | Criterion | Type |
|----|-----------|------|
| **ACC-01** | Source scan of `app/edit-transaction.tsx`: `authFetch<PaymentMethodInfo[]>` is called with `` `paymentMethods` `` inside a `try`/`catch` that only `console.error`s, guarded by `ok && … && Array.isArray(…)`; the result is stored in state. | Objective |
| **ACC-02** | Source scan: `paymentMethod` state is typed `PaymentMethod \| null`, initialized to `null`; the only seeding site is `tx.paymentMethod \|\| null`; the strings `"cash"` and `tx.paymentMethod \|\|` MUST NOT appear adjacent anywhere in the file. | Objective |
| **ACC-03** | Source scan: the payment-source chip `selected` expression is case-insensitive (`.toLowerCase()` on both sides) and chips `onPress` only ever set a value; **no** chip `onPress` sets `null`. | Objective |
| **ACC-04** | Source scan: the option list is derived by a `useMemo` (or equivalent pure derivation) that appends an echo chip when the current `paymentMethod` is non-null and matches no option label case-insensitively; the hardcoded `PAYMENT_METHODS` constant is still present and used as the empty-list fallback. | Objective |
| **ACC-05** | Source scan of `handleSave`: six ordered guards per CON-07 — `Alert.alert("Invalid Amount"`, `Amount must not exceed 10,000,000.`, the `!id` branch (own copy, not the category copy), `Alert.alert("Invalid Category", "Please select a category.")`, `Alert.alert("Invalid Payment Source", "Please select a payment source.")`, and `Please specify a category.`; every guard path returns; `updateTransaction` is called only after all of them. | Objective |
| **ACC-06** | Source scan: the `updateTransaction` payload contains a bare `paymentMethod,` identifier on its own line (no `!`, no `as`, no `\|\| "cash"`); `category` and `note` payload lines unchanged. Asserted by trimming each payload line (this file's payload indent differs from SPEC-85's single-line literal pins). | Objective |
| **ACC-07** | Source scan: imports — `../types` includes `PaymentMethodInfo`, and `authFetch` is imported from `../utils/apiClient`; exactly one `<HelperText` element exists, in the Category row owned by SPEC-107 (`HelperText type="error" visible={!selectedCategory}`), and no other field has a helper row; CON-11's SPEC-85 ACC-05 and SPEC-80 ACC-01 pins all still satisfied. **Note (test-repair 2026-10-13):** `edit-transaction.tsx` renders its `styles.dialog` **one key per line**, so the SPEC-85 `maxWidth/width/alignSelf/marginHorizontal` quadruple is pinned **per line** in this file, not as SPEC-85's single-line literal. **Note (SPEC-107 amendment 2026-10-13):** this row originally read "`HelperText` is NOT imported" — true while SPEC-105's feedback was `Alert.alert`-only. SPEC-107 shipped a persistent Category helper row, so the guard was re-pinned to count the element token (see D-03 of SPEC-107); the SPEC-85 ACC-05 pins are unaffected. | Objective |
| **ACC-08** | Source scan: the two new copy strings live on exactly two screens — `app/edit-transaction.tsx` (1 each) and `app/add-transaction.tsx` (1 each, added by SPEC-106) — and nowhere else in `app/`; `transaction-details.tsx`, `types/index.ts`, and `utils/apiClient.ts` are byte-identical to their pre-spec state. **Note (SPEC-106 amendment 2026-10-13):** originally "exactly one screen"; SPEC-106 legitimately ships the same copies on Add Transaction, so ACC-08 was re-pinned to two screens with the guard's intent (confined vocabulary) unchanged (§1.14 cross-reference). | Objective |
| **ACC-S01** | Reviewer on Android + iPhone (Expo Go): open a transaction whose source is a custom name (e.g. saved from Add Transaction as `GCash`) → its chip is visibly selected; tap Save Changes → `Saved Successfully`. FAIL = no chip selected, or the source silently rewritten. | Subjective |
| **ACC-S02** | Reviewer on Android + iPhone (Expo Go): open a transaction, clear the category selection by opening the screen fresh on a record with no category → tap Save Changes → `Invalid Category` dialog appears with the right copy and the screen stays open. FAIL = silent no-op. | Subjective |
| **ACC-S03** | Reviewer on all three platforms, offline/Local: same flow with no network → the five fallback chips still render and a source can be picked; with nothing picked, Save is blocked with `Invalid Payment Source`. FAIL = empty chip row, or a save that proceeds with no source. | Subjective |
| **ACC-S04** | Reviewer on Web: same checks, no console error, no visual regression besides the payment-source row's contents. FAIL = console error, blank row, or layout break. | Subjective |

---

## Platform Matrix (AGENTS.md §1.10)

| Platform | Objective (machine-checkable) | Subjective (reviewer-observed) |
|----------|-------------------------------|-------------------------------|
| **Android** | ACC-01..ACC-08 pass with `Platform.OS === "android"`. | Expo Go: custom source selected, both guards block with correct copy (ACC-S01/S02/S03). |
| **iOS** | Same guards with `Platform.OS === "ios"`. | Expo Go: identical behavior (ACC-S01/S02/S03). |
| **Web** | Same guards with `Platform.OS === "web"`. | Web export: API-direct fetch renders the source row, guards fire, no console error (ACC-S04). |

TDD coverage (§1.10): new `utils/editTransactionRequiredFields.test.ts` covers ACC-01..ACC-08 parameterized by `Platform.OS` (`android`/`ios`/`web` via mock); ACC-S01..S04 are user-run manual checks exactly as written above (an actual API round-trip and on-device alert rendering are not jest-provable — guards pin the state type, the fetch shape, the case-insensitive compare, the echo chip, and the ordered guards).

---

## Deliverables

| ID | Deliverable |
|----|-------------|
| **D-01** | `app/edit-transaction.tsx` ONLY: (i) `paymentMethod` → `PaymentMethod \| null` with `null` seed; (ii) `authFetch` payment-method fetch hookup in the existing mount effect; (iii) payment-source chips render the normalized fetched list with CON-03 fallback + CON-04 echo chip; (iv) `handleSave` guards per CON-07 with the payload using the narrowed `paymentMethod`; (v) the two CON-09 import lines. |
| **D-02** | New `utils/editTransactionRequiredFields.test.ts` (named here per §1.11): guards for ACC-01..ACC-08 × android/ios/web, plus re-assertions of the CON-11 SPEC-85/SPEC-80 pins on this file. `blockOf()`-style helpers **MUST** anchor on the opener (`lastIndexOf("<NativeModal", anchor)` style, SPEC-93 lesson) where a JSX block is sliced. |
| **D-03** | Docs after implementation (AGENTS §1.8, post-FINAL only): `docs/savepoint.md` entry + `AGENTS.md` §3 status line. Implemented after D-01/D-02 are verified (user-run jest/lint/tsc per §1.3). |

---

## Glossary

| Term | Definition |
|------|------------|
| **Echo-wins** | The SPEC-46 D-02 / SPEC-49 D-02 rule: a value read back from storage that is not recognized by the current option list is preserved verbatim rather than remapped to a default. |
| **Payment method name** | The `PaymentMethodInfo.name` string persisted by Add Transaction (e.g. `"GCash"`, `"Cash"`, `"BPI"`) — free-form per `types/index.ts:3`. |
| **Hardcoded five** | `PAYMENT_METHODS` in `app/edit-transaction.tsx:27-33` — `cash` / `card` / `bank_transfer` / `e_wallet` / `other`, the offline fallback under CON-03. |
| **Dead guard** | A validation branch whose condition can never be true, giving false assurance — why CON-06 requires nullable state. |

---

## References

- `app/edit-transaction.tsx:27-33` (`PAYMENT_METHODS` hardcoded five), `:45` (`useState<PaymentMethod>("cash")`), `:80` (`tx.paymentMethod || "cash"`), `:140` (silent guard), `:258-273` (payment-source chip row), `:130-172` (`handleSave`)
- `app/add-transaction.tsx:78-94, 331-382, 129-157` (the fetch + two-level chip + `validate` precedent — unedited, pattern source)
- `types/index.ts:3,5-10,32` (`PaymentMethod = string`, `PaymentMethodInfo`, optional `paymentMethod`)
- `app/transaction-details.tsx:198` (shows the real name — the screen that disagrees with Edit)
- `utils/mutationFeedback.test.ts:37-48` (SPEC-85 ACC-05 pin), `utils/paySourceRename.test.ts:24-60` (SPEC-80 ACC-01 pins)
- `specs/46-transaction-category-persistence.md` (echo-wins), `specs/49-scheduled-tx-link-persistence.md` (echo-wins), `specs/85-delete-edit-success-toasts.md` (ACC-05), `specs/80-payment-source-rename-and-fetch-open.md` (copy + ACC-01)
- `AGENTS.md` §1.1 (spec-first), §1.9 (spec format), §1.10 (platform matrix + TDD), §1.11 (bare-minimum), §1.12 (no new deps), §1.14 (one home)
