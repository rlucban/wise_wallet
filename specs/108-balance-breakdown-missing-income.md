# SPEC-108: Balance Breakdown Missing ₱360 Income

| Field | Value |
|-------|-------|
| **ID** | SPEC-108 |
| **Title** | Balance Breakdown Missing ₱360 Income |
| **Status** | DRAFT v0.1 (per user call 2026-10-16 — draft now, review before FINAL; NO implementation until FINAL) |
| **Owner** | @rcluc |
| **Version** | 0.1 DRAFT |
| **Scope** | Diagnosis + guarded fix for `+₱360 Others / No details` income excluded from `SummaryCard` / `BalanceBreakdown` Income line on web (`wise-wallet-sage.vercel.app`) + one new guard file |
| **Non-goals** | No change to opening-balance design (profile + excluded opening txn stays); no change to expense math; no new dependency; no backend/API contract change unless a DEC names it |

---

## Conventions

The key words **MUST**, **MUST NOT**, **REQUIRED**, **SHALL**, **SHALL NOT**, **SHOULD**, **SHOULD NOT**, **RECOMMENDED**, **MAY**, and **OPTIONAL** in this document are to be interpreted as described in RFC 2119.

---

## Context

User report (2026-10-16, web screenshots at `wise-wallet-sage.vercel.app/transactions` and `/` dashboard):

Image 1 — Transaction History (All, 5 transactions):

* `Transport / Tricycle` `−₱79.00`
* `Transport / Indrive papasok school` `−₱200.00`
* `Others / No details` `+₱360.00`
* `Others / Maribank` `−₱650.00`
* `Others / Initial account setup` `+₱2,452.00`

Image 2 — Balance Breakdown modal:

* `TOTAL BALANCE ₱1,523.00`
* `Initial Balance ₱2,452.00`
* `+ Income ₱0.00`
* `- Expenses ₱929.00`
* `AVAILABLE TO SPEND ₱1,523.00`

Arithmetic check (verified from screenshots):

* Expenses: `79 + 200 + 650 = 929` — matches the Breakdown. Expenses are correct.
* Gross inflow in list: `2452 + 360 = 2812`. The `2452` opening row is excluded from the Income line by design (see below), so the Income line **SHOULD** read `₱360.00`.
* Displayed total `2452 + 0 − 929 = 1523` is internally consistent with its inputs, but wrong by exactly the missing `₱360`. Correct total **SHOULD** be `2452 + 360 − 929 = 1883`.

Source trace (why `0` means "row filtered/missing", not an arithmetic bug):

* `components/SummaryCard.tsx:18-25` derives `initialBalance = Number(profile?.initialBalance || 0)` and `income = transactions.filter(t => t.type === "income" && !isOpeningEntry(t))`, where `isOpeningEntry = t.note === "Initial account setup" || t.category?.id === OPENING_BALANCE_CATEGORY_ID` (`:20-21`). `components/BalanceBreakdown.tsx:28` then renders `balance = initialBalance + income − expense` from those props — pure display, no recompute.
* Same opening-exclusion predicate is duplicated (by design, SPEC-45 DEC-05) at `context/TransactionsContext.tsx:164`, `app/add-transaction.tsx:77`, `app/dues.tsx:255`, `app/savings.tsx:30`, `app/add-allocation.tsx:32`.
* Opening payload (`utils/onboardingPayload.ts:13-28`): `category = { id: OPENING_BALANCE_CATEGORY_ID ("b0eebc99-…"), name: "Others", type: "income" }`, `note = "Initial account setup"`. Note the shared `"Others"` name with the missing row.
* History renders `+`/green via strict `item.type === "income"` (`app/transactions.tsx:110-113`), so the `+₱360` row **is** `type === "income"` (lowercase exact) in the client array at History render time.
* Web read path (`context/TransactionsContext.tsx:127-136`, SPEC-36): API-direct, `resolveTransactionCategory(t, categories)` (`utils/transactionCategory.ts:14-21`: echo-wins → id-lookup → `{ id: "uncategorized", name: "Others" }` fallback), then `attachDueLinks`.
* Web collection GETs are cached 60s TTL in-memory (`utils/apiClient.ts:24-26, 142-145, 202-204`; invalidate-on-mutation, wipe on 401).

Three ranked hypotheses (all consistent with the screenshots; none proven without the evidence in D-01):

* **H1 — Opening-marker misclassification.** The `+₱360` row carries `note === "Initial account setup"` OR `category.id === OPENING_BALANCE_CATEGORY_ID`, so `isOpeningEntry` eats it. Suspicious: both the opening row and the missing row display category `"Others"`. Reachable via: user picked an Others category whose id IS the opening UUID; server stored `categoryId = opening UUID`; or `resolveTransactionCategory` returned the opening category via id-lookup.
* **H2 — Stale read / 60s GET cache.** The Breakdown modal captured the `transactions` array before the `+₱360` write became visible (cache hit, or modal opened from a Dashboard render predating the History refetch). Both screens share one context array, but at different render moments.
* **H3 — Server row shape.** The stored row differs from what History rendered (e.g. `amount` as string, `type` case variant on refetch, `categoryId: null` + fallback drift). Least likely given the `+` render, kept so the fix does not assume H1/H2.

**Open decisions (BLOCK implementation until called — SPEC-42 precedent):**

* `DEC-01`: which hypothesis the evidence confirms (H1 / H2 / H3).
* `DEC-02`: fix shape for the confirmed hypothesis — (a) narrow the opening predicate, (b) cache/refetch ordering fix, or (c) read-path normalization. No code written until both DECs are called and Status is FINAL.

---

## Constraints

| ID | Constraint |
|----|------------|
| **CON-01** | The app **MUST** remain fully functional on **Android, iOS, and Web** (Expo SDK 57); Expo Go import-safe; Vercel-deployable (`EXPO_PUBLIC_*` only, no Node APIs in app code). |
| **CON-02** | Bare-minimum diff (AGENTS §1.11): the fix **MUST** touch only the predicate/read path named by the confirmed DEC-02 option plus the one guard file named in D-02. No refactor, no drive-by cleanup, no second screen. |
| **CON-03** | No new dependency unless this spec names it (AGENTS §1.12). The fix **MUST** use existing imports/stdlib. |
| **CON-04** | The opening-balance design **MUST NOT** change: `profile.initialBalance` stays the Initial line; the genuine `Initial account setup` row stays excluded from Income. A user income legitimately titled similarly **MUST** still count (SPEC-45 DEC-05). |
| **CON-05** | Expense math (`type === "expense"` sum) **MUST NOT** change — it already reconciles (`929`). |
| **CON-06** | No code, config, or dependency change before this spec is marked **FINAL** by the user (AGENTS §1.1). DRAFT ships docs only. |
| **CON-07** | **MUST** follow the SPEC-04 template and the AGENTS.md §1.10 platform matrix (Objective vs Subjective) below. |
| **CON-08** | The fix **MUST NOT** weaken any existing FINAL pin: SPEC-45 DEC-05 (opening-marker rule), SPEC-46 rehydrate precedence, SPEC-62 cache invalidate-on-mutation, SPEC-85/105/106/107 feedback pins. |

---

## Goal

The `+₱360 Others / No details` income counts in the Income line, so the Breakdown reads `Initial ₱2,452 + Income ₱360 − Expenses ₱929 = Total ₱1,883` (plus Reservations unchanged), on all three platforms.

### Interaction Matrix

| State | Expected |
|-------|----------|
| Genuine opening row (`note === "Initial account setup"` OR opening-UUID category) | Excluded from Income; counted via Initial line (unchanged) |
| Normal income (`+₱360`, empty note, non-opening category incl. `uncategorized` fallback) | **Counted in Income**; Total = Initial + Income − Expenses |
| Expense rows (`−₱79/200/650`) | Summed as today (`₱929`); unchanged |
| Breakdown opened after refetch completes | Reflects the same array History renders (no stale-zero) |
| Income filter on `/transactions` | Shows both `+₱2,452` and `+₱360` (type-level proof) |

### Decisions

| ID | Decision |
|----|----------|
| **DEC-01** | OPEN — H1 / H2 / H3 per the D-01 evidence. |
| **DEC-02** | OPEN — fix shape for the confirmed hypothesis only: (a) narrow `isOpeningEntry` (e.g. require BOTH markers, or drop the id-half) if H1; (b) refetch/cache ordering if H2; (c) read-path normalization if H3. Rejected until evidence: changing all six predicate copies blindly; widening the envelope unwrap; backend migration. |

### Acceptance Criteria

| ID | Criterion | Type |
|----|-----------|------|
| **ACC-01** | Guard test reproduces the reported dataset (incomes `2452` opening + `360` normal; expenses `79/200/650`): the income selector returns `360`, expense returns `929`, total returns `1883`. | Objective |
| **ACC-02** | Guard test pins the genuine opening row still excluded (by `note`, and by opening-UUID id independently) — CON-04. | Objective |
| **ACC-03** | Guard test pins the `+₱360`-shaped row (empty/unknown note, `uncategorized` or non-opening Others id) counted — the exact regression for this report. | Objective |
| **ACC-04** | Source scan: no fix outside the DEC-02-named site + guard file; no new dependency; the other five predicate copies byte-identical unless DEC-02 names them (CON-02/CON-08). | Objective |
| **ACC-S01** | Reviewer on web: seed the 5-row state → Dashboard Breakdown shows `+ Income ₱360.00`, `Total ₱1,883.00`. FAIL = still `₱0 / ₱1,523`. | Subjective |
| **ACC-S02** | Reviewer taps the `+₱360` row → details show `TYPE Income`, `AMOUNT +₱360.00`, category `Others`; taps `Income` segment → both incomes listed. FAIL = either missing. | Subjective |
| **ACC-S03** | Reviewer on Android + iPhone (Expo Go): ACC-S01/S02 identical; no red-box; dark-mode readable. | Subjective |

---

## Platform Matrix (AGENTS.md §1.10)

| Platform | Objective (machine-checkable) | Subjective (reviewer-observed) |
|----------|-------------------------------|-------------------------------|
| **Android** | ACC-01..ACC-04 pass with `Platform.OS === "android"`. | Expo Go: ACC-S01/S02/S03. |
| **iOS** | Same guards with `Platform.OS === "ios"`. | Expo Go: ACC-S01/S02/S03. |
| **Web** | Same guards with `Platform.OS === "web"`. | Web export (`wise-wallet-sage.vercel.app` or `npm run web`): ACC-S01/S02, no console error. |

TDD coverage (§1.10): new guard file (D-02, name fixed there) covers ACC-01..ACC-04 parameterized by `Platform.OS` (`android`/`ios`/`web` via mock); ACC-S01..S03 are user-run manual checks exactly as written above (needs the real 5-row account state — jest pins the selector, not the server).

---

## Deliverables

| ID | Deliverable |
|----|-------------|
| **D-01** | Diagnostic evidence (user-run, NO code): (i) tap `+₱360` → Transaction Details screenshot (TYPE/AMOUNT/CATEGORY); (ii) `Income` segment screenshot; (iii) server truth for the `+₱360` row (`id, type, amount, categoryId, note, title`) + `userProfiles.initialBalance`; (iv) refetch-then-reopen-Breakdown result (stays `₱0` or becomes `₱360`). DEC-01/DEC-02 are called from this evidence. |
| **D-02** | New `utils/balanceBreakdownIncome.test.ts` (named here per §1.11): ACC-01..ACC-04 × android/ios/web. Block helpers **MUST** anchor on the opener (SPEC-93 lesson). |
| **D-03** | The DEC-02 fix (POST-FINAL only): exactly the confirmed-hypothesis change, nothing more. |
| **D-04** | Docs after implementation (AGENTS §1.8, post-FINAL only): `docs/savepoint.md` entry + `AGENTS.md` §3 status line. NOT part of the DRAFT step; no doc edit ships now. |

---

## Glossary

| Term | Definition |
|------|------------|
| **Opening entry** | The once-only onboarding income (`note === "Initial account setup"` OR `category.id === OPENING_BALANCE_CATEGORY_ID`); excluded from the Income line, counted via `profile.initialBalance`. |
| **Missing row** | The `+₱360.00 Others / No details` income visible in History but absent from the Breakdown Income line. |
| **Stale-zero** | H2 shape: Breakdown rendered `₱0` from a pre-write array/cache while History already showed 5 rows. |

---

## References

* `components/SummaryCard.tsx:18-25` (income/expense/balance derivation + `isOpeningEntry`)
* `components/BalanceBreakdown.tsx:28,55-59` (pure display of passed props)
* `utils/onboardingPayload.ts:13-28` (`OPENING_BALANCE_CATEGORY_ID`, `"Others"` name share)
* `context/TransactionsContext.tsx:127-136` (web API-direct read), `:164` (negative-balance income filter)
* `utils/transactionCategory.ts:14-21` (echo → id-lookup → `uncategorized` fallback)
* `utils/apiClient.ts:24-26,142-145` (60s heavy-GET cache)
* `app/transactions.tsx:46-52,110-113` (filter + `+` render gate)
* `specs/45-api-source-of-truth.md` (DEC-05 opening-marker rule), `specs/36-web-platform-invariants.md` (web API-direct), `specs/46-transaction-category-persistence.md` (rehydrate), `specs/62-get-memoization.md` (cache)
* `AGENTS.md` §1.1 (spec-first), §1.9 (spec format), §1.10 (platform matrix + TDD), §1.11 (bare-minimum), §1.12 (no new deps), §1.14 (one home)
