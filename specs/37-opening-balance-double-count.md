# Spec 37: Opening Balance Counted Twice (Single Source of Truth + Shared Balance Helper)

| Field | Value |
|---|---|
| ID | SPEC-37 |
| Title | `profile.initialBalance` is the single canonical opening amount; one shared pure helper for every balance computation |
| Status | **FINAL** (2026-09-30 per user call) |
| Owner | User (final authority) |
| Version | 1.0 — FINAL: v0.1 draft approved as-is; implement exactly this |
| Scope | `utils/balance.ts` (new), the 6 in-app balance-computation call sites, `app/onboarding.tsx`, `utils/balance.test.ts` (new) |
| Non-goals | Reports income figure (`app/(tabs)/reports.tsx:98`); any `wallet-api` change or DDL; automatic repair of existing Cloud+ON accounts (per user 2026-09-30: out of scope, documented only); data migration / deletion of stored Opening Balance rows; `BalanceBreakdown` row layout; `negative-balance alert` copy and threshold logic |
| Normative source | This file, once marked FINAL. `AGENTS.md §4` is a pointer only. File+symbol cites are normative; `:line` numbers are hints only. |

## Terminology (RFC 2119)

The keywords **MUST**, **MUST NOT**, **SHOULD**, and **MAY** in this spec are
to be interpreted as described in RFC 2119. Informative prose (examples,
"today", "currently", "observed") is non-normative unless restated as a
requirement.

## 1. Context

### 1.1 The defect

Onboarding records the starting amount in two places at once:

1. `app/onboarding.tsx:41` → `completeSetup(name, X)` → `context/UserProfileContext.tsx:178-189`
   writes `profile.initialBalance = X`. This field **round-trips**: it is a
   real column (`supabase/schema.sql:53`, `"initialBalance" NUMERIC DEFAULT 0`)
   and is returned by the api-only profile normalizer.
2. `app/onboarding.tsx:45-53` → `addTransaction({ title: "Opening Balance", amount: X, type: "income", … })`,
   a second record of the same money, under a hardcoded category UUID
   (`app/onboarding.tsx:50`).

The correct balance formula is therefore
`initialBalance + Σincome − Σexpense` where **Σincome MUST exclude the
"Opening Balance" row**, because `initialBalance` already carries it.

The app is split on whether that exclusion happens:

| Call site | Excludes "Opening Balance"? | Result with X = ₱1,000 |
|---|---|---|
| `components/SummaryCard.tsx:20` (Dashboard) | yes | ₱1,000 ✅ |
| `app/add-transaction.tsx:66` | yes | ₱1,000 ✅ |
| `app/dues.tsx:247` | yes | ₱1,000 ✅ |
| `context/TransactionsContext.tsx:186` (negative-balance alert) | yes | ₱1,000 ✅ |
| `app/savings.tsx:26` (Allocations screen) | **no** | ₱2,000 ❌ |
| `app/add-allocation.tsx:28` | **no** | ₱2,000 ❌ |

`app/savings.tsx:26` and `app/add-allocation.tsx:28` use a bare
`transactions.filter((t) => t.type === "income")`. Beyond the displayed number,
this corrupts three validation gates, letting a user commit more savings than
they hold: `app/add-allocation.tsx:40` (allocation cap),
`app/savings.tsx:102` (create), `app/savings.tsx:195` (transfer in).

### 1.2 The title-based exclusion does not survive a Cloud round-trip

The "fix" already used by the four correct sites is a **string comparison on
`title`**, which is not a durable identifier:

- The `transactions` table has **no `title` column**
  (`supabase/schema.sql:75-90`; columns are `id`, `userId`, `amount`, `date`,
  `note`, `type`, `categoryId`, `paymentMethod`, `establishment`,
  `receiptUrl`, `splitInfo`, `dueId`, `savingsItemId`, `createdAt`).
- The server zod schema strips unknown keys, so onboarding's
  `title: "Opening Balance"` is silently dropped (recorded as a verified live
  probe in `specs/36-api-only-contract-compliance.md`, Non-goals: "transaction
  `title` fidelity (server has no title column — silent strip stands)"; same
  file `:59` cites `app/onboarding.tsx:45`).
- `app/add-transaction.tsx:201-211` creates user transactions with **no `title`
  field at all**.

Therefore, on the **api-only plane (Cloud + auto-backup ON — the default Cloud
mode per SPEC-34), every transaction read back from the server has
`title === undefined`.** `t.title !== "Opening Balance"` evaluates to `true`,
so the opening row is counted as ordinary income on top of
`profile.initialBalance`:

> Cloud+ON + onboarding with ₱1,000 → Dashboard shows **₱2,000** after any
> refetch/reload, on every screen, not just the two broken ones.

Only the brief in-memory state before the first server read is correct, which
makes the symptom look intermittent. This is the most likely thing the user
reported.

The "income row with an empty title" heuristic is **not** a valid substitute:
after a round-trip *every* user-created income is equally titleless.

### 1.3 Decision taken (user, 2026-09-30)

- **Profile-only.** Onboarding MUST write only `profile.initialBalance` and MUST
  NOT create an "Opening Balance" transaction. `initialBalance` is the single
  canonical record of the opening amount on both planes.
- **Shared helper.** Every balance computation MUST route through one pure
  helper so the six call sites can no longer diverge.
- **Legacy Cloud+ON accounts: out of scope, documented only.** Those accounts
  already carry an unidentifiable orphan income row and are already doubled.
  No heuristic repair — it could delete a legitimate income — and no
  destructive migration. The manual remedy is recorded in `docs/savepoint.md`.

### 1.4 Definitions

**Opening row** — the "Opening Balance" income transaction created by
onboarding. Exists in stored data for accounts onboarded before this spec;
never created after it.

**Canonical opening amount** — `profile.initialBalance`.

**Local-persist plane** — mobile-Local + mobile-OFF; AsyncStorage-backed
(SPEC-34 CON-09 scoping stands).

**api-only plane** — Cloud + auto-backup ON; server-backed, no entity
persistence.

## 2. Constraints (normative once FINAL)

- **CON-01 — `profile.initialBalance` is the single source of truth.** The
  balance formula MUST be `profile.initialBalance + Σincome − Σexpense`, where
  Σincome counts every income row. Onboarding MUST NOT create an "Opening
  Balance" transaction. No second record of the opening amount may exist.
- **CON-02 — One shared helper, six call sites.** All balance computations MUST
  call the helper in the new `utils/balance.ts`. The helper MUST be pure
  (no I/O, no hooks, no `Platform.OS` branch, no React import). A
  hand-rolled `filter(...).reduce(...)` balance formula MUST NOT remain in any
  of: `components/SummaryCard.tsx`, `app/add-transaction.tsx`,
  `app/savings.tsx`, `app/add-allocation.tsx`, `app/dues.tsx`,
  `context/TransactionsContext.tsx`. (This constraint is what prevents
  recurrence — §1.2 is a direct consequence of divergence.)
- **CON-03 — Legacy local-plane exclusion is preserved.** For the local-persist
  plane the helper MUST still exclude the Opening row from Σincome
  (`title === OPENING_BALANCE_TITLE`), so accounts already holding a stored
  Opening row keep the balance they show today (₱1,000, not ₱2,000). This is
  the existing correct behavior at `components/SummaryCard.tsx:20`, relocated
  — not a behavior change.
- **CON-04 — `reserved` stays a parameter, not a constant.** The helper MUST
  accept reserved savings as an optional argument defaulting to `0`.
  `components/SummaryCard.tsx:29-32`, `app/add-transaction.tsx:71`,
  `app/savings.tsx:28` and `app/dues.tsx:252` pass their existing reserved
  values. `app/add-allocation.tsx:30` deliberately omits reserved today
  (SPEC-12 formula is `initialBalance + income − expense`) and MUST continue to
  omit it. Per-site reserved semantics MUST NOT change.
- **CON-05 — Negative-balance alert input is unchanged in shape.**
  `context/TransactionsContext.tsx:182-194` MUST keep calling
  `checkNegativeBalance(balance)` with the same value it computes today on the
  local plane; only the arithmetic's location moves into the helper. SPEC-10
  (alert trigger, recovery, copy, `ACC-01..08`) is otherwise untouched.
- **CON-06 — No data migration and no destructive repair.** This spec MUST NOT
  delete, rewrite, or re-derive any stored transaction or profile row. The
  helper is read-only. Existing api-only accounts remain doubled until the user
  removes the orphan row manually (recorded in `docs/savepoint.md` per D-05).
- **CON-07 — No server change, no schema change, no new dependency.** No
  `wallet-api` route/contract/DDL edit; no `supabase/schema.sql` edit; no
  addition to `package.json`. Storage keys (`user_{id}_*`), AsyncStorage
  shapes, navigation routes, and the `Transaction`/`UserProfile` types are
  unchanged.
- **CON-08 — Cross-platform invariants (AGENTS.md §1.5–§1.7).** Android + iOS +
  Web keep working; web stays Vercel-deployable (helper is plain TS, no
  Node-only API); Expo Go does not crash on import.
- **CON-09 — Onboarding copy must match behavior.** The footer at
  `app/onboarding.tsx:134` ("Your initial balance will be recorded as your
  first income transaction.") states behavior this spec removes and MUST be
  rewritten. No other onboarding copy, field, validation, or layout changes;
  the screen keeps the Initial Balance field and its ₱10,000,000 cap
  (`app/onboarding.tsx:25-29`).

## 3. Goal

| Scenario | After (FINAL) |
|---|---|
| Onboarding, any mode, initial balance X | `profile.initialBalance = X`; **no** "Opening Balance" transaction; no other record created |
| Dashboard (all three platforms) | Balance = X. Unchanged on the local plane; corrected on the api-only plane (was 2X after refetch) |
| Allocations screen, New Allocation, Add Transaction, pay-a-due, negative-balance alert | All show/validate the same balance as the Dashboard (no ₱2,000 divergence) |
| Local plane, account holding a legacy Opening row | Balance unchanged from today (₱1,000) — CON-03 |
| Cloud+ON after reload | Balance = X (was 2X) — the reported bug |
| Existing Cloud+ON account with an orphan row | Still doubled; remedy documented (CON-06) |
| Reports income figure | Unchanged (Non-goal) |
| Saved amounts / storage keys / API contract / routes | Byte-identical (CON-07) |

Open decisions: none outstanding.

### 3.1 Decisions

- **DEC-01 — Profile-only.** Chosen by user 2026-09-30 over (a) keeping the
  transaction and patching two sites, and (b) adding a durable marker column.
  Rationale: `initialBalance` is the only representation that round-trips both
  planes (§1.2); a marker column would need a breaking server DDL
  (AGENTS.md §1.4) and an ON→OFF migration. Accepted cost: the Opening row no
  longer appears in Recent Activity or Reports for new accounts, which is
  honest — it was never income.
- **DEC-02 — Shared helper over five local patches.** The bug is divergence,
  not a typo; fixing only the two broken sites leaves §1.2 latent in every
  future call site.
- **DEC-03 — Legacy api-only accounts out of scope.** Per user 2026-09-30. No
  heuristic repair (could delete a real income), no automatic deletion.
- **DEC-04 — Reports excluded.** `app/(tabs)/reports.tsx:98` reports
  transactions, not a balance; a legacy local account's Opening row stays
  visible in Reports while being excluded from Dashboard income. Noted as a
  deliberate, pre-existing disagreement, not a balance error.
- **DEC-05 — Keep the title-based exclusion as a legacy shim.** Retiring it
  would immediately double every existing local-plane account.

### 3.2 Platform matrix — Objective (machine-checkable, `jest` × `Platform.OS`)

The helper is pure with no `Platform.OS` branch (CON-02), so the matrix proves
*identical* results on all three platforms — that identity is the §1.5
guarantee, asserted rather than assumed.

| # | Android | iOS | Web |
|---|---|---|---|
| ACC-01 | pass | pass | pass |
| ACC-02 | pass | pass | pass |
| ACC-03 | pass | pass | pass |
| ACC-04 | pass | pass | pass |
| ACC-05 | pass | pass | pass |
| ACC-06 | pass | pass | pass |
| ACC-07 | pass | pass | pass |
| ACC-08 | pass | pass | pass |

- **ACC-01 — Opening row excluded from Σincome.** Helper reports it in a
  separate `openingIncome` field, `income` excludes it, and the expense sum is
  byte-identical to a plain `type === "expense"` sum. Legacy local-plane
  behavior preserved (CON-03).
- **ACC-02 — Regression for the reported bug (the headline case).**
  `computeBalance({ initialBalance: 1000, transactions: [opening row of 1000] })`
  === `1000`, **not** `2000`. Same shape with a realistic mix (opening 1000 +
  salary 5000 − expense 300) === `5700`.
- **ACC-03 — No Opening row.** `computeBalance` equals
  `initialBalance + Σincome − Σexpense` over all rows (the new-account case,
  and the api-only plane where nothing is excluded).
- **ACC-04 — Reserved.** `computeAvailableBalance` subtracts the `reserved`
  argument; omitting it defaults to `0` (the `app/add-allocation.tsx:30` shape).
  Per-site reserved inputs are unchanged.
- **ACC-05 — Known limitation pinned (api-only orphan row is counted).** An
  income row with `title: undefined` and amount equal to `initialBalance` IS
  included in Σincome — i.e. a legacy Cloud+ON account still doubles (DEC-03,
  CON-06). Asserted deliberately so the behavior is intentional and
  regression-visible rather than accidental.
- **ACC-06 — Known false positive preserved.** A *user-created* income row
  literally titled `"Opening Balance"` is still excluded — pre-existing
  behavior at `components/SummaryCard.tsx:20`, unchanged (DEC-05).
- **ACC-07 — Robustness.** Empty list, missing/`null`/`NaN`/`"12.50"`
  `amount`, missing `title`, and missing `initialBalance` all return a finite
  number and never throw.
- **ACC-08 — Source scan: divergence is gone.** `fs.readFileSync` over the six
  files in CON-02 asserts none of them still contains
  `title !== "Opening Balance"`, and `app/onboarding.tsx` contains neither
  `addTransaction(` nor the hardcoded category UUID
  `b0eebc99-9c0b-4ef8-bb6d-6bb9bd380b19`. Mirrors the established source-scan
  convention (`utils/apiOnly.test.ts:560-586`, `utils/modeState.test.ts:96`).

### 3.3 Platform matrix — Subjective (human-judged, observable reviewer checks)

| # | Android (Expo Go) | iOS (Expo Go) | Web (`expo export --platform web`) |
|---|---|---|---|
| ACC-09 | Local account, ₱1,000 | Cloud+OFF, ₱1,000 | Cloud+ON, ₱1,000 |
| ACC-10 | pass | pass | pass |
| ACC-11 | pass | pass | pass |

- **ACC-09 — Reviewer walkthrough.** Reviewer on each platform registers an
  account, reaches onboarding, enters Initial Balance ₱1,000, taps Get
  Started, and confirms: Dashboard shows ₱1,000; Allocations shows Available
  Balance ₱1,000; New Allocation shows Available balance ₱1,000; Add
  Transaction shows Available to Spend ₱1,000; **no** "Opening Balance" row in
  Recent Activity; the onboarding footer no longer claims a first income
  transaction; no red-box.
- **ACC-10 — Web reload is the real test (the reported symptom).** Reviewer on
  the web build with Cloud+ON completes ACC-09, then **reloads the page and
  signs in again**: Dashboard still shows ₱1,000 (today it shows ₱2,000),
  identically on Allocations, New Allocation, Add Transaction, and after paying
  a scheduled due.
- **ACC-11 — No regression on the local plane.** Reviewer on Android with an
  account onboarded *before* this change (still holds a stored Opening row)
  confirms every balance figure is unchanged from today (₱1,000), i.e. no new
  doubling and no zeroed balance. Reviewer on iOS Cloud+OFF confirms the same.
  Reviewer confirms no storage key, route, or API contract changed.

## 4. Deliverables

- **D-01 — `utils/balance.ts` (new).** Pure, platform-free balance math:
  `OPENING_BALANCE_TITLE` constant; `isOpeningBalanceTransaction(t)`;
  `computeBalanceSums(transactions)` → `{ income, expense, openingIncome }`
  with the Opening row pulled out of `income` (CON-01/CON-03); and
  `computeBalance({ initialBalance, transactions })` /
  `computeAvailableBalance({ initialBalance, transactions, reserved? })`
  (CON-04). No I/O, no React, no `Platform` import, no comments beyond the
  SPEC-37 references the repo already uses.
- **D-02 — Route the six call sites through the helper (CON-02).**
  `components/SummaryCard.tsx:17-32` (passes its existing reserved to
  `computeAvailableBalance`, keeps `income`/`expense` for its own tiles from
  `computeBalanceSums`); `app/add-transaction.tsx:63-73`;
  `app/savings.tsx:24-29`; `app/add-allocation.tsx:26-31` (reserved omitted,
  per CON-04); `app/dues.tsx:246-253`;
  `context/TransactionsContext.tsx:182-194`.
  `components/BalanceBreakdown.tsx:28-33` keeps receiving props from
  `SummaryCard` and is behaviorally unchanged; reviewer confirms its
  "Initial Balance" row still reads ₱1,000.
- **D-03 — `app/onboarding.tsx`:** delete the `addTransaction` block (`:43-54`),
  the now-unused `useTransactionsActions` import (`:7`, `:13`), and the
  hardcoded category UUID (`:50`); keep `completeSetup` (`:41`) as the only
  write; rewrite the footer copy per CON-09.
- **D-04 — `utils/balance.test.ts` (new).** ACC-01..08 × `android`/`ios`/`web`
  using the repo's `describe.each([...])` + `jest.mock("react-native")`
  `Platform.OS` pattern (`utils/modeState.test.ts:8-27`), including the ACC-08
  source scan. Lives under `utils/` (`jest.config.js` `roots`).
- **D-05 — Docs.** `docs/savepoint.md` implementation entry + the DEC-03
  manual-remedy note for existing Cloud+ON accounts; `AGENTS.md §3` append
  entry per `.agents/rules/wisewallet.md`; this file's Status → FINAL with the
  approval date.
- **D-06 — User-run verification** (§1.3 — the agent does not run these):
  `npx tsc --noEmit`, `npx tsc -p tsconfig.test.json --noEmit`, `npm test`,
  `npx eslint .`, then Expo Go Android + iOS (ACC-09, ACC-11) and
  `expo export --platform web` (ACC-10).

## Glossary

| Term | Meaning |
|---|---|
| Opening row | The "Opening Balance" income transaction onboarding used to create; present in pre-existing stored data, never created after this spec |
| Canonical opening amount | `profile.initialBalance` — the single record of the opening money |
| Σincome | Sum of income `amount`s, excluding the Opening row on the local plane (CON-03) |
| Local-persist plane | mobile-Local + mobile-OFF; AsyncStorage-backed (SPEC-34 CON-09) |
| api-only plane | Cloud + auto-backup ON; server-backed, zero entity persistence (SPEC-34) |

## References

- `AGENTS.md §1` — spec-first, no-CLI, invariants, docs; §1.4 no breaking
  changes; §1.9 spec format; §1.10 platform matrix + TDD.
- `specs/34-api-only-online-mode.md` — CON-02/CON-09 (api-only plane, local-plane
  scoping).
- `specs/36-api-only-contract-compliance.md` — Non-goals (server has no
  transaction `title` column; silent strip) + `:59` citing
  `app/onboarding.tsx:45`; CON-04 (`paymentMethod` default).
- `specs/10-negative-balance-alert-recovery.md` — `:202` states the balance
  formula; trigger/copy behavior unchanged (CON-05).
- `specs/12-add-allocation-validation-feedback.md` — `:110` states the
  `initialBalance + income − expense` (reserved-omitted) formula preserved by
  CON-04.
- `app/onboarding.tsx:7,13,41,43-54,50,134`;
  `context/UserProfileContext.tsx:178-189`;
  `components/SummaryCard.tsx:17-32`; `components/BalanceBreakdown.tsx:28-33`;
  `app/add-transaction.tsx:63-73`; `app/savings.tsx:24-29,102,195`;
  `app/add-allocation.tsx:26-31,40`; `app/dues.tsx:45,246-253`;
  `context/TransactionsContext.tsx:182-194`;
  `app/(tabs)/reports.tsx:98` (non-goal);
  `types/index.ts:23-41,72`; `supabase/schema.sql:53,75-90`;
  `jest.config.js`; `utils/modeState.test.ts:8-27,96`;
  `utils/apiOnly.test.ts:560-586`.
