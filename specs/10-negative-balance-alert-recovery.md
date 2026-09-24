# Spec 10: Negative Balance Alert Recovery Handling

| Field | Value |
|---|---|
| ID | SPEC-10 |
| Title | Negative Balance Alert Recovery Handling |
| Status | **FINAL** (2026-09-23 per user call) |
| Owner | User (final authority) |
| Version | 1.0 |
| Scope | Behavior of the "Negative Balance Alert ⚠️" system alert when the computed balance recovers (reaches ≥ ₱0.00) or improves while still negative |
| Non-goals | Retracting already-delivered OS push notifications; changing the balance computation in `SummaryCard`/dashboard; changes to the `SystemAlert` AsyncStorage shape or storage keys; new alert types beyond "Balance Restored"-style copy (none added); dues/expense forecasting alerts |
| Normative source | This file. File+symbol cites are normative; `:line` numbers are hints only. |

## Terminology (RFC 2119)

The keywords **MUST**, **MUST NOT**, **SHOULD**, and **MAY** in this spec are
to be interpreted as described in RFC 2119. Informative prose (examples,
"currently") is non-normative unless restated as a requirement.

## 1. Context

### 1.1 Problem

A "Negative Balance Alert ⚠️" fires when the computed balance
(`initialBalance + income − expense`) drops below ₱0.00. Once the user adds a
significant income (or corrects expenses) and the balance climbs back to
₱0.00 or above, the alert **remains**: it stays unread, keeps the Dashboard
bell badge lit, and keeps rendering as a red error card in the Notifications
screen — even though the problem no longer exists.

### 1.2 Root cause

| Step | What happens | Location |
|---|---|---|
| 1. Trigger | `TransactionsContext` effect computes `balance`; only when `balance < 0` does it call `checkNegativeBalance(balance)` | `context/TransactionsContext.tsx:146-160` |
| 2. Alert creation | `checkAndTriggerNegativeBalanceAlert` writes an unread alert with `balanceAtTrigger` | `utils/notifications.ts:228-280` |
| 3. Recovery | Income arrives; `balance >= 0` — the effect gate (`if (balance < 0)`) means the evaluator is **never called** on recovery | `context/TransactionsContext.tsx:157` |
| 4. Result | The stale unread alert persists; `unreadCount` badge and `/notifications` still show it | `app/(tabs)/index.tsx:78,280-299`, `app/notifications.tsx:96-114` |

There is also a secondary gap: while the balance is still negative but
improving (e.g. −₱1,000 → −₱200), the current dedup logic
(`utils/notifications.ts:238-243`) simply **suppresses** any update, so the
alert's message keeps showing a stale (worse) amount.

### 1.3 Desired behavior (per user call)

1. On recovery (`balance >= 0`): **auto-delete** the unread Negative Balance
   Alert(s).
2. Improvement while still negative: **update the existing alert's amount
   only** — never create a duplicate.
3. Re-trigger: after a recovery clears the alert, a later drop below ₱0.00
   fires a **new** alert.
4. Recovery threshold: exactly `balance >= 0`.

## 2. Constraints (normative)

- **CON-01 — Recovery clears.** When the computed balance is `>= 0`, ALL
  unread "Negative Balance Alert ⚠️" alerts (identified by
  `title.includes("Negative Balance Alert")`) MUST be deleted from
  `system_alerts` in AsyncStorage. No new alert and no OS push is created.
- **CON-02 — History preserved.** Read Negative Balance Alerts MUST NOT be
  deleted by the recovery path; they remain as history.
- **CON-03 — Improvement updates in place.** When `balance < 0` and there is
  an unread Negative Balance Alert whose `balanceAtTrigger < currentBalance`
  (improved toward zero), the latest such unread alert MUST be updated in
  place: `balanceAtTrigger` set to `currentBalance`, `message` re-rendered
  with the new current amount, `updatedAt` refreshed, `read` left `false`.
  A duplicate alert MUST NOT be created.
- **CON-04 — Unchanged / worse preserved.** When `balance < 0`:
  - unchanged (`currentBalance === balanceAtTrigger` of the latest unread
    alert) → no-op;
  - worse (`currentBalance < balanceAtTrigger`) → a new alert is created with
    the worse amount (existing dedup intent preserved).
- **CON-05 — Re-trigger allowed.** After recovery deletes the unread alert(s)
  (CON-01), a subsequent drop to `balance < 0` MUST create a fresh unread
  alert. A historical **read** alert MUST NOT suppress this new alert.
- **CON-06 — Evaluator runs on all changes.** The balance evaluator MUST be
  invoked on every balance-affecting change (app start / load, add/update/
  delete transaction, sync merge), NOT only when `balance < 0`. The
  `TransactionsContext` effect MUST call it unconditionally.
- **CON-07 — OS push on creation only.** A local OS push notification is
  scheduled ONLY when a new alert is created (existing behavior, native
  Android/iOS, non-web, non-Expo-Go). `updated` and `deleted` actions MUST
  NOT schedule a push.
- **CON-08 — In-app state refresh.** `SystemAlertsContext.checkNegativeBalance`
  MUST refresh the in-app `alerts` state whenever the evaluation produced a
  mutation (`created` / `updated` / `deleted`) so the bell badge and the
  Notifications list reflect the change immediately.
- **CON-09 — Cross-platform invariants (AGENTS.md §1.5–1.7).** The change MUST
  keep Android + iOS + Web working; MUST keep web Vercel-deployable; MUST NOT
  statically import or evaluate `expo-notifications` on web or in Expo Go
  (lazy-load preserved). Features degrade gracefully — the in-app alert
  logic is identical on all platforms.
- **CON-10 — No format/API breaks.** The `SystemAlert` type, `system_alerts`
  storage key, and the API contract MUST NOT change. Only alert content
  semantics change. Existing stored alerts remain readable.

## 3. Goal

Ensure the Negative Balance Alert accurately reflects the live balance:
it clears automatically once the balance reaches ₱0.00 or above, stays
current (amount) while the balance is still negative, and re-fires after a
full recovery so a future shortfall is not silently hidden.

### 3.1 State-transition matrix (`currentBalance` vs latest unread alert)

| `currentBalance` | Latest unread alert `balanceAtTrigger` | Action | Result |
|---|---|---|---|
| `>= 0` | any (unread exists) | delete unread negative alerts | `deleted` |
| `>= 0` | none / only read | none | `none` |
| `< 0` & `> balanceAtTrigger` | unread | update amount + message + `updatedAt` | `updated` |
| `< 0` & `== balanceAtTrigger` | unread | none | `none` |
| `< 0` & `< balanceAtTrigger` | unread | create new alert (worse) | `created` |
| `< 0` | latest negative alert is **read** | create new alert | `created` |
| `< 0` | no negative alert | create new alert | `created` |

### 3.2 Acceptance criteria — Objective (machine-checkable, jest)

Tests MUST live in `utils/notifications.test.ts` and be parameterized over
`Platform.OS = "android" | "ios" | "web"` (mock), per AGENTS.md §1.10.

- **ACC-01 (jest):** With an unread Negative Balance Alert stored and
  `currentBalance >= 0`, the evaluator returns
  `{ action: "deleted" }` and the alert is no longer in `system_alerts`.
- **ACC-02 (jest):** With no negative alerts stored and `currentBalance >= 0`
  the evaluator returns `{ action: "none" }` and performs no writes.
- **ACC-03 (jest):** With only **read** negative alerts stored and
  `currentBalance >= 0`, the evaluator returns `{ action: "none" }` and keeps
  the read alerts intact.
- **ACC-04 (jest):** Balance improves while negative (−₱1,000 → −₱200) with
  one unread alert: evaluator returns `{ action: "updated" }`, exactly one
  Negative Balance Alert remains, its `balanceAtTrigger === -200`, and its
  `message` contains "−₱200" (formatted current amount).
- **ACC-05 (jest):** Balance unchanged (`== balanceAtTrigger`): returns
  `{ action: "none" }`, alert count unchanged.
- **ACC-06 (jest):** Balance worsens (−₱200 → −₱800): returns
  `{ action: "created" }`; a new unread alert with `balanceAtTrigger === -800`
  exists alongside the prior one.
- **ACC-07 (jest):** Re-trigger — recovery (deleted) then a later drop to
  −₱150 with a historical **read** alert present: returns
  `{ action: "created" }` (fresh unread alert).
- **ACC-08 (jest):** OS push scheduling (mock `expo-notifications`
  `scheduleNotificationAsync`) is invoked on `created` only, never on
  `updated` or `deleted`, for all three `Platform.OS` values (on web/Expo Go
  the whole push branch is skipped and `notificationsAvailable()` is false).

### 3.3 Acceptance criteria — Subjective (human-judged UX)

Written as observable reviewer steps per AGENTS.md §1.10.

- **ACC-09 (Expo Go, Android + iOS):** Reviewer recreates the bug: spend until
  balance < 0 → alert appears and bell badge increments; then add a large
  income → confirm the alert **disappears** from the Notifications screen and
  the badge clears without manual "Mark as Read" / "Clear Alerts" actions.
- **ACC-10 (Expo Go):** While balance is still negative, reviewer adds income
  that improves (but does not zero) it → confirm the existing alert's message
  shows the new (less negative) amount and no duplicate alert appears.
- **ACC-11 (Expo Go):** After a recovery, reviewer overspends below zero again
  → confirm a **new** Negative Balance Alert fires (re-trigger works).
- **ACC-12 (web export):** Reviewer repeats ACC-09…ACC-11 on the Vercel-built
  web bundle (`expo export --platform web`) with the web-only behavior
  confirmed (no crash, no OS push, alert logic identical).
- **ACC-13 (all platforms):** Reviewer confirms read/historical Negative
  Balance Alerts remain visible after a recovery (history preserved, only
  unread ones are cleared).

## 4. Deliverables

- **D-01 — Rework `checkAndTriggerNegativeBalanceAlert`**
  (`utils/notifications.ts:228-280`): Replace the current
  return-`SystemAlert | null` contract with an evaluation result type, e.g.
  `type BalanceAlertEvaluation = { action: "created" | "updated" | "deleted" | "none" }`,
  and implement the full state matrix from §3.1:
  - `currentBalance >= 0` → delete unread negative alerts (CON-01/02);
  - negative + improved vs latest unread → update in place, reusing the
    existing message template with the new current amount (CON-03);
  - unchanged/worse/read/none → no-op or create with push (CON-04/05/07).
  - Extract a shared `buildNegativeBalanceMessage(currentBalance, formatAmount)`
    helper so creation and update use identical copy.
- **D-02 — Update `SystemAlertsContext.checkNegativeBalance`**
  (`context/SystemAlertsContext.tsx:72-82`): Consume the new result type and
  call `fetchAlerts()` whenever `action !== "none"` so the badge and
  `/notifications` list refresh immediately (CON-08).
- **D-03 — Evaluate on every balance change**
  (`context/TransactionsContext.tsx:146-160`): Remove the `if (balance < 0)`
  gate so `checkNegativeBalance(balance)` runs unconditionally on every
  effect execution (CON-06). Keep the `loading` guard so the run happens with
  a settled transaction list.
- **D-04 — Jest tests** (`utils/notifications.test.ts`): New test file
  covering ACC-01…ACC-08 against the pure evaluator, parameterized by
  `Platform.OS` (`android` / `ios` / `web`) with mocked storage
  (`getItem`/`setItem`/`getPrefixedKey`), `uuid`, and `expo-notifications`.
- **D-05 — Docs:** After implementation, append to `docs/savepoint.md` and add
  a `Current status` entry in `AGENTS.md §3` per AGENTS.md §1.8.
- **D-06 — Manual verification:** Run the ACC-09…ACC-12 reviewer steps in Expo
  Go (Android + iOS) and on the web export.

## Glossary

| Term | Meaning |
|---|---|
| Computed balance | `profile.initialBalance + Σincome − Σexpense` over all non-"Opening Balance" transactions |
| Negative Balance Alert ⚠️ | A `Budget Alert`-type `SystemAlert` created when the computed balance drops below ₱0.00 |
| `balanceAtTrigger` | The balance value at the moment the alert was last created/updated (`SystemAlert.balanceAtTrigger`) |
| Recovery | The computed balance reaching `>= 0` after being negative |
| Re-trigger | A fresh alert being allowed after a recovery cleared the previous unread alert(s) |

## References

- `utils/notifications.ts:228-280` — `checkAndTriggerNegativeBalanceAlert()` (current create/dedup logic).
- `context/SystemAlertsContext.tsx:72-82` — `checkNegativeBalance` consumer.
- `context/TransactionsContext.tsx:146-160` — balance computation + `balance < 0` gate.
- `types/index.ts:80-88` — `SystemAlert` type (`balanceAtTrigger?: number`).
- `app/notifications.tsx:96-114` — alerts render list; unread badge per alert.
- `app/(tabs)/index.tsx:78,280-299` — Dashboard bell `totalBadgeCount` (pending dues + unread alerts).
- `jest.config.js` — jest roots under `utils/`, `*.test.ts`, ts-jest.
- `specs/09-fix-default-category-for-scheduled-due-transactions.md` — SPEC template used here.
- `AGENTS.md §1` — working agreements (spec-first, no CLI, §1.10 TDD + platform matrix).