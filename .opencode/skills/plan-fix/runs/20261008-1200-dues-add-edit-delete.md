---
skill: plan-fix
story: Dues add/edit/delete failure paths in app/dues.tsx
repo: D:\hobby\wise_wallet
calibration: {1: "C", 2: "B", 3: "B", 4: "B", 5: "A", 6: "A"}
workflow: B
decision: Option A (guard-rail tests only)
status: ready-for-implement-fix
pending: handoff
---

# Plan

## Progress

| id | question | answer |
|----|----------|--------|
| story | What should I plan? | Dues add/edit/delete |
| 1 | Output shape | C (Card first, tree if needed) |
| 2 | Understand form | B (Short bullets) |
| 3 | Agent explanations | B (Short explanation plus diagram) |
| 4 | Workflow | B (SCAN → VISUAL → QUESTION ME → PLAN → BUILD) |
| 5 | During implementation | A (Step n/N then wait) |
| 6 | Teach or orient | A (Teach) |
| unknown-1 | Scheduled double popup identity | User redirects: reported but not reproduced; evaluate + prepare guard-rail tests (English only) |
| context-1 | Additional context (allocation) | Archive action does not move item to archive |
| context-2 | Additional context (scheduled) | Double popup on newly implemented scheduled flow |

## Pending
- 2. When you need to understand something

## Decisions
- Approved option: A (guard-rail tests only, zero app-code change).
- Invariant preservation:
  - Spec-first: preserved — no normative behavior change; tests are pre-spec evidence, future fix still needs user-finalized FINAL spec.
  - No auto-pilot: preserved — stop after plan; handoff only on explicit yes.
  - Agent never runs CLIs: preserved — user runs npm test and pastes output.
  - No breaking changes: preserved — no storage keys, wallet-api contract, AsyncStorage shapes, routes, or native deps touched.
  - Android+iOS+Web: preserved — suites parameterized by Platform.OS (android/ios/web); web API-direct vs native repo divergence asserted, not altered.
  - Web Vercel-deployable: preserved — no app code, no Node-only APIs, no env change.
  - Expo Go testable: preserved — tests never statically import native-only modules; lazy-load/mocks only.
  - Specs template + TDD: preserved — each guard maps to a future ACC; jest is the proof.
  - Bare-minimum + no new deps: preserved — new test files only; stdlib + existing jest setup.
  - Ask-before-update: preserved — this plan is a prompt; files change only via implement-fix handoff.
- Layering order: hooks (useSavings.updateItem, dues pay path) → app screens (savings.tsx, archived-allocations.tsx, dues.tsx) read-first; repositories/sync/server untouched.
- Gold paths read: specs/04-connection-status-vs-offline-mode.md (spec template for future ACC); utils/notifications.ts (Expo-Go-safe mock pattern).
- Proof command: npm test (package.json scripts.test = jest).
- Who implements: Agent (Code it) — each slice still needs explicit Apply this slice.

## Scan

Path-A (allocation archive miss): app/savings.tsx:231 handleArchiveItem → hooks/useSavings.ts:154 updateItem → utils/apiClient PUT savingsItems/{id} (web API-direct) / repos.savingsItems.upsert (native) → app/archived-allocations.tsx:28 filter !!isArchived
Proof-A: none found (grep isArchived hits only types/screens/specs, zero test files). Command: npm test
Teach-A: updateItem catches and only console.errors (useSavings.ts:181-183, no throw), so handleArchiveItem toast "Allocation archived" fires even on failure; on web, refetch is API-direct (useSavings.ts:52-60) so a server-dropped isArchived flag reverts the optimistic {isArchived:true} on next focus/refetch.
Lens-A: Spec-first applies + app/savings.tsx + hooks/useSavings.ts (any persist change needs FINAL spec); No-breaking-changes applies + savingsItems shape/server contract (isArchived persistence touches contract); Android+iOS+Web applies + web API-direct vs native repo paths differ; Bare-minimum applies + two screen files only; Ask-before-update applies + no code written.

Path-B (scheduled double popup): app/dues.tsx:675 Confirm (setPayTarget null + recordTransaction) → app/dues.tsx:258 recordTransaction → 291 addTransaction → 301 updateDue(completed:true) → 312 addDue recurrence → 326 setAlertDialog "Transaction Recorded"; rival popup candidates: ToastContext overwritten toast (hooks/useDues.ts:76), scheduleDueNotifications warn (app/dues.tsx:86-92), SystemAlerts negative-balance path.
Proof-B: none found for pay-popup count. Command: npm test
Teach-B: pay Dialog and alertDialog are separate Portals (app/dues.tsx:652 payTarget Dialog, 690 alertDialog Dialog); Confirm closes the first then the async write opens the second, so any extra toast/alert from the write path reads as "dalawa nag pop up".
Lens-B: same invariants as A; Cross-platform applies + Dialog/Portal behavior differs web vs Expo Go; No-new-deps n/a + fix needs no dep.

## Plan
- Slice 1 (hook contract, archive): guard suite asserting updateItem rejects on failed persist (no silent toast path), native mirror keeps isArchived across refetch, web round-trip distinguishes echo vs drop. Files: new test file(s) only.
- Slice 2 (screen path, scheduled): guard suite asserting single success surface per Confirm, payBusy second-fire suppressed, no rival toast on clean path. Files: new test file(s) only.
- Proof per slice: user runs npm test, pastes output. No app/store/API/route/dep edits in this plan.
