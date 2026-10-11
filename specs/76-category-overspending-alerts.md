# SPEC-76 — Category Overspending Alerts

| Field | Value |
|---|---|
| ID | SPEC-76 |
| Title | In-app overspend alert when a category reaches half the available balance |
| Status | FINAL v1.1 (v1.0 per user call 2026-10-10; v1.1 per user call 2026-10-10 — implementable) |
| Owner | User |
| Version | 1.1 FINAL |
| Scope | `types/index.ts` (2 additive optional fields) + `utils/notifications.ts` (evaluator + trigger) + `context/SystemAlertsContext.tsx` (check entry) + `context/TransactionsContext.tsx` (effect wiring) + one new guard file `utils/overspendAlerts.test.ts` |
| Non-goals | No per-category budget UI/storage; no OS push; no Notifications-screen change; no API/storage-key/route/dependency change; no SPEC-10 behavior change |

RFC 2119 terminology (MUST/MUST NOT/SHOULD) applies.

## Context

No budget/limit concept exists in the app (`Budget` in `types/index.ts:66`
is an id-only stub; "budget" elsewhere is literacy copy). The closest working
precedent is SPEC-10: `checkAndTriggerNegativeBalanceAlert` in
`utils/notifications.ts:297` (create / update-in-place / auto-delete state
machine) + `SystemAlertsContext.checkNegativeBalance` (`:73`) invoked
unconditionally from the mutation effect in
`TransactionsContext.tsx:152-171`. User calls 2026-10-10: breach when a
single category's current-month expenses reach or exceed 50% of the
available balance (no monthly floor), evaluate on transaction add, one
unread alert per category per month updated in place, in-app list only —
e.g. title `Overspending Alert`, message
`High expenses detected in Food this month.`, visible in the Notifications
list on mobile and web.

## Constraints

- **CON-01** Every change MUST keep Android + iOS + Web working, stay
  Expo Go (latest) import-safe, and stay Vercel-deployable. Pure arithmetic
  only; Manila month math MUST be arithmetic UTC+8 (SPEC-33 precedent —
  never `Intl`).
- **CON-02** No new npm packages, native modules, fonts, or third-party code
  (AGENTS §1.12).
- **CON-03** Breach rule (user calls 2026-10-10 — floor deleted, balance
  basis): for the current Manila calendar month, let `catTotal[X]` = sum of
  expenses attributed to category X (by `tx.date`). A breach exists iff
  `balance > 0` AND `catTotal[X] >= 0.5 * balance` (reach-or-exceed),
  where `balance` is the same available balance the effect already computes
  (`initialBalance + income - expense`). When `balance <= 0` the rule is
  degenerate (half of nothing) and the negative-balance alert owns that
  state — so evaluation deletes unread overspend alerts instead of
  evaluating. No monthly floor: a lone first-of-month expense CAN alert.
- **CON-04** Attribution: expense predicate MUST be the same one the balance
  computation uses (`TransactionsContext.tsx:165-167`, no duplicate logic);
  month membership by `tx.date` under the Manila key. Category naming
  follows SPEC-46 echo-wins (`tx.category?.name`); transactions with no
  resolvable name can never breach (they simply belong to no category). No
  `CategoriesContext` import is added to the evaluator path.
- **CON-05** Dedup/state machine per category per Manila `YYYY-MM` month key
  (mirror of SPEC-10): breach + no unread current-month alert for X →
  create; breach + unread exists → update amount/message in place (no
  duplicate); no breach + unread exists → delete it; any unread alert whose
  month key is stale → delete. Returns `{ created, updated, deleted }`
  counts (no throw).
- **CON-06** Alert shape: `type: "Budget Alert"`, title constant
  `Overspending Alert`, message `High expenses detected in {Name} this
  month.` Two ADDITIVE optional fields on `SystemAlert`
  (`categoryId?: string`, `monthKey?: string`) carry the dedup key —
  AsyncStorage/LWW compatible (§1.4: optional-only, no migration, no
  rollback needed). No `scheduleNotificationAsync` call anywhere on this
  path (in-app only per user call).
- **CON-07** Wiring: `SystemAlertsContext.checkOverspending(transactions,
  balance)` runs in the SAME unconditional mutation effect as
  `checkNegativeBalance` (`TransactionsContext.tsx:152-171`); the
  Notifications screen renders the alerts through its existing list with
  ZERO screen change (it already renders `Budget Alert` rows for SPEC-10 on
  both platforms).
- **CON-08** Identical on Android, iOS, Web — no `Platform.OS` branch.
  SPEC-10's evaluator, context entry, and effect behavior MUST stay
  byte-identical.
- **CON-09** No code, config, or dependency change before this spec is marked
  FINAL by the user (AGENTS §1.1, §1.10 CON-10 pattern).

## Goal

Heavy category months surface one fresh in-app alert each, auto-kept current
and auto-cleared, on both platforms with no new permissions or screens.

### Interaction matrix

| Surface | Action | Expected |
|---|---|---|
| Any | Add expense pushing Food to ≥ half the available balance | `Overspending Alert` / `High expenses detected in Food this month.` appears unread |
| Any | Add more Food same month | Same alert's amount/message refreshes; still exactly one unread Food alert |
| Any | Balance rises or Food drops below half (income, other spend mix) | Unread Food alert auto-deletes (no-op if none) |
| Any | Balance falls to ≤ ₱0 | Unread overspend alerts delete (negative-balance alert owns that state) |
| New month | First mutation | Stale prior-month unread overspend alerts purge; evaluation scopes to the new month |
| Notifications | Open list (mobile + web) | Alert rows render through the existing list; no screen change |

### Decisions

- **DEC-01** Half-of-available-balance with reach-or-exceed (`>=`), no
  floor (user calls — zero storage/UI scope; lone-expense months CAN
  alert by explicit user choice).
- **DEC-02** Evaluate on every transaction mutation via the existing effect
  (user call — same immediacy as negative-balance).
- **DEC-03** Update-in-place + auto-delete + stale purge (user call —
  SPEC-10 pattern; rejected: alert-per-breach).
- **DEC-04** In-app list only (user call — no OS push, no permission flow).
- **DEC-05** Title/message split adopted from the user's example copy
  (title constant, message templated with the resolved category name).
- **DEC-06** `OVERSPEND_SHARE_PCT = 50` confirmed by user call on the
  balance basis (`catTotal >= 0.5 * balance`); `OVERSPEND_MIN_MONTHLY_TOTAL`
  deleted per user call (no floor).

### Acceptance

Objective — deterministic, machine-checkable (jest, parameterized by
`Platform.OS` = `android` / `ios` / `web` via mock):

- **ACC-01** Pure evaluator: per-category monthly totals; breach exactly
  at half (`>=`), never below; balance `0`/negative evaluates clean (and
  reports the clear-all path); Manila month boundary
  (`2025-12-31T16:30Z` ∈ January) respected; unattributed spend never
  breaches. Holds on android/ios/web.
- **ACC-02** Trigger state machine: create / update-in-place (same id, no
  duplicate) / delete-on-clear / stale-month purge, with `categoryId` +
  `monthKey` persisted and zero `scheduleNotificationAsync` references on
  the path. Holds on android/ios/web (storage mocked as in
  `notifications.test.ts`).
- **ACC-03** Wiring: `TransactionsContext` effect calls `checkOverspending`
  alongside `checkNegativeBalance`; SPEC-10 evaluator/context/effect lines
  byte-identical; `SystemAlert` extension is additive-optional only; no new
  import of native modules, no `Platform.OS` branch. Holds on
  android/ios/web.

Subjective — human-judged UX as observable reviewer checks (explicit
pass/fail observation steps, user-run per AGENTS §1.3 — agent never runs CLIs):

- **ACC-S01** Reviewer on Android/iOS (Expo Go) confirms: driving Food to
  half the available balance produces the exact title/message; further Food
  spend refreshes (never duplicates); balance recovery clears it;
  non-positive balance hands off to the negative-balance alert with no
  overspend rows left; no red-box, no push permission prompt. FAIL =
  duplicate/stale/wrong-copy alert or any prompt.
- **ACC-S02** Reviewer on Web confirms ACC-S01 identically (same list, no
  console error). FAIL = any web-only deviation (triggers a CON-08
  amendment, not a silent branch).

TDD coverage (§1.10): `utils/overspendAlerts.test.ts` covers ACC-01..ACC-03
parameterized by `Platform.OS` (android/ios/web); ACC-S01/S02 are user-run
manual checks exactly as written above.

## Deliverables

- **D-01** `types/index.ts` (2 additive optional fields, named here per
  §1.11) + `utils/notifications.ts` (pure balance-ratio evaluator, Manila
  month-key helper, `checkAndTriggerOverspendAlerts` state machine; no push
  call). No other util file touched.
- **D-02** `context/SystemAlertsContext.tsx` (`checkOverspending` entry,
  SPEC-10 entry untouched) + `context/TransactionsContext.tsx` (same-effect
  wiring). Notifications screen and SPEC-10 lines byte-identical.
- **D-03** `utils/overspendAlerts.test.ts` (new file, named here per §1.11):
  guards for ACC-01..ACC-03 × android/ios/web.
- **D-04** Docs after implementation (AGENTS §1.8, post-FINAL only):
  `docs/savepoint.md` entry + `AGENTS.md` §3 status line. NOT part of the
  spec-writing step; no doc edit ships with the DRAFT.

## Glossary

- **Half balance:** `catTotal[X] >= 0.5 * balance` (reach-or-exceed) for
  the current Manila month; evaluated only while `balance > 0`.
- **Stale:** an unread overspend alert whose `monthKey` is not the current
  Manila month.

## References

- `AGENTS.md` (§1.4 storage compat, §1.9 spec format, §1.10 TDD/platform
  matrix, §1.11 bare-minimum, §1.12 no new deps, §1.14 one home)
- `specs/04-connection-status-vs-offline-mode.md` (template)
- `specs/10-negative-balance-alert-recovery.md` (SPEC-10 — evaluator/state
  machine/wiring pattern; NOT amended)
- `specs/46-transaction-category-persistence.md` (SPEC-46 echo-wins naming)
- `utils/notifications.ts:297-346` (evaluator pattern), `:280-295` (push —
  deliberately NOT used)
- `context/SystemAlertsContext.tsx:73-104`, `context/TransactionsContext.tsx:152-171`
- `types/index.ts:66-89` (`Budget` stub, `SystemAlert`)

---

## v1.1 Amendment — Income-basis ratio, top-1 only (FINAL)

User-reported defect 2026-10-10: with a negative displayed balance
(-₱4,900), every category fired an overspend alert. Investigation: the v1.0
`balance > 0` guard is verified intact on disk
(`utils/notifications.ts:387`) — the guarded path mathematically cannot
create under a non-positive *input*, so the observed alerts came from a
balance input that differed from the displayed figure (or a stale bundle),
not from the guarded rule. v1.1 removes `balance` from the rule entirely,
which structurally eliminates this failure class: the ratio is now computed
against monthly income (+ positive starting balance), and at most one
category may hold a live alert. v1.0 sections above stay normative; where
this amendment conflicts, v1.1 governs. Explicit supersessions: CON-03
(balance basis + ≤0 handoff) → CON-10 (income basis + denom gate);
CON-04 (denominator-free) → CON-10 income predicate reuse;
CON-05 (per-category alerts) → CON-11 top-1 + auto-clear subsumed;
CON-07 signatures → CON-12; DEC-01/DEC-06 → DEC-07/DEC-08;
ACC-01/ACC-S01 → ACC-04/ACC-S03 (ACC-02/ACC-03/S02 stand, re-run).

### v1.1 Constraints (delta)

- **CON-10** Ratio rule (user call): `denom = monthlyIncome +
  (initialBalance > 0 ? initialBalance : 0)`, where `monthlyIncome` sums
  current-Manila-month income-type transactions under the effect's existing
  income predicate (excludes `Initial account setup` + opening-balance
  category rows), and `initialBalance = Number(profile?.initialBalance ||
  0)` exactly as the effect computes it. A breach exists iff `denom > 0`
  AND `catTotal[X] >= 0.5 * denom` (reach-or-exceed, `OVERSPEND_SHARE_PCT`
  unchanged). `denom <= 0` → no evaluation; unread overspend alerts delete
  (same handoff shape as v1.0's balance gate). No monthly floor (v1.0
  carried the deletion forward).
- **CON-11** Top-1 only (user call): among breachers the live alert goes to
  the highest `catTotal`, tie-broken by name ascending (byte-deterministic);
  every other category's unread current-month alert is deleted by the
  existing not-in-breach path — auto-clear is subsumed, at most ONE live
  overspend alert per month. No second alert object shape is introduced.
- **CON-12** Signatures (no dead params): `evaluateCategoryOverspend
  (transactions, monthlyIncome, initialBalance, now?)`,
  `checkAndTriggerOverspendAlerts(transactions, monthlyIncome,
  initialBalance, userId?, now?)`, `checkOverspending(transactions,
  monthlyIncome, initialBalance)`. `balance` is REMOVED from all three.
  The effect computes `monthlyIncome` by extending its own income filter
  with the Manila month check (predicate stays in exactly one place) and
  reuses its existing `initialBalance` const.
- **CON-13** No v1.1 code beyond D-07..D-10; SPEC-10 lines, notification
  screen, copy, fields, and no-push rule all stand.

### v1.1 Goal (delta)

| Surface | Action | Expected |
|---|---|---|
| Any | Two categories over half of income (Shopping ₱5,000, Bills ₱3,000; income ₱4,000) | Exactly ONE unread alert — Shopping (the top); Bills holds none |
| Any | Bills overtakes Shopping next mutation | Alert migrates: Bills created/updated, Shopping auto-deleted |
| Any | Income rises so top falls below half | Live alert auto-deletes |
| Any | No-income month (denom ≤ 0) | No evaluation; unread overspend alerts delete |

Decisions:

- **DEC-07** Income + positive-start denominator (user call — answers
  "Total Monthly Income / Total Monthly Budget (or positive starting
  balance)"; rejected: income-only, balance basis retained).
- **DEC-08** Single top category (user call; rejected: alert-per-breacher).
  Tie-break is an implementer detail pinned deterministic, not a user
  choice.

Acceptance (all × android/ios/web where machine-checkable):

- **ACC-04** Pure evaluator: income-basis breach at exactly half, never
  below; positive `initialBalance` adds to the denominator, non-positive
  is ignored; `denom <= 0` evaluates clean; top-1 selection with
  total-desc/name-asc tie-break; Manila boundary; unattributed never
  breaches.
- **ACC-05** Trigger: two simultaneous breachers yield exactly one alert
  (the top); a seeded second-category alert is downgraded (updated top +
  deleted other); SPEC-10 alerts survive; zero push calls; `categoryId` +
  `monthKey` persisted.
- **ACC-S03** Reviewer on Android/iOS (Expo Go) confirms: the reported
  negative-balance scenario can no longer multi-fire (rule has no balance
  input); top-category alerting, migration, and auto-clear behave per the
  matrix; no red-box, no push prompt. FAIL = more than one live overspend
  alert or any prompt.
- **ACC-S04** Reviewer on Web confirms ACC-S03 identically, no console
  error. FAIL = any web-only deviation.

### v1.1 Deliverables (delta)

- **D-07** `utils/notifications.ts` ONLY: evaluator rewritten per
  CON-10/CON-11 (header comment updated), trigger re-signed per CON-12
  (body otherwise byte-identical — the ≤1-breach set flows through the
  existing create/update/delete paths). Threshold const, copy, fields,
  no-push rule unchanged.
- **D-08** `context/SystemAlertsContext.tsx` (`checkOverspending` re-signed,
  SPEC-10 entry untouched) + `context/TransactionsContext.tsx` (effect
  computes `monthlyIncome` via its own predicate + Manila check and passes
  `(transactions, monthlyIncome, initialBalance)`; `getManilaMonthKey`
  import added — no cycle, utils imports types only).
- **D-09** `utils/overspendAlerts.test.ts`: rewritten to ACC-04/05
  (superseded balance-based cases replaced, not duplicated) ×
  android/ios/web.
- **D-10** Docs after v1.1 implementation (AGENTS §1.8, post-FINAL only):
  `docs/savepoint.md` entry + `AGENTS.md` §3 status line.
