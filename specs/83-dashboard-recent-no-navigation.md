# SPEC-83 — Dashboard Recent Activity Non-Navigating Rows

| Field | Value |
|---|---|
| ID | SPEC-83 |
| Title | Recent Activity rows are display-only (no view, no edit entry) |
| Status | FINAL (per user call 2026-10-10 — implementable) |
| Owner | User |
| Version | 1.0 FINAL |
| Scope | `app/(tabs)/index.tsx` (recent-row pressability only) + one new guard file `utils/dashboardRecentNoNav.test.ts` |
| Non-goals | No row content/style/data change; no `transaction-details` screen change (edit/delete stay there per SPEC-63 CON-07); no `TransactionList` component change (other entry points intact); no route/dep/storage change |

RFC 2119 terminology (MUST/MUST NOT/SHOULD) applies.

## Context

Dashboard Recent Activity rows (`app/(tabs)/index.tsx:112-116`,
`renderTransactionItem`) are `TouchableOpacity` pushing
`/transaction-details?id=…` — every tap opens the details screen where
the transaction can be viewed/edited. User call 2026-10-10: rows tapped
from Recent Activity MUST NOT navigate anywhere (neither view nor edit).
The shared `components/TransactionList.tsx` (same destination) is
currently unreferenced by any screen and stays untouched, as does the
details screen itself — editing remains available through the remaining
entry points (e.g. the full transactions list).

## Constraints

- **CON-01** Every change MUST keep Android + iOS + Web working, stay
  Expo Go (latest) import-safe, and stay Vercel-deployable.
- **CON-02** No new npm packages, native modules, fonts, or third-party code
  (AGENTS §1.12).
- **CON-03** The recent row MUST become non-pressable: `TouchableOpacity` →
  plain `View` (dropping `onPress` AND `activeOpacity` — no navigation
  and no press flash). Row style, content, icons, and `FlatList` wiring
  MUST stay byte-identical.
- **CON-04** No other `TouchableOpacity` in `index.tsx` changes (headers,
  dues shortcut, calculator, notifications bell all keep theirs); the
  `router` import stays (used elsewhere).
- **CON-05** `transaction-details.tsx`, `TransactionList.tsx`, and all
  other details entry points MUST stay byte-identical.
- **CON-06** Identical on Android, iOS, and Web — no `Platform.OS` branch.
  Any platform branch needs its own amendment first (§1.10).
- **CON-07** No code, config, or dependency change before this spec is marked
  FINAL by the user (AGENTS §1.1, §1.10 CON-10 pattern).

## Goal

Recent Activity is a read-only glance: identical look, zero navigation.

### Interaction matrix

| Surface | Action | Expected |
|---|---|---|
| Dashboard Recent | Tap a row | Nothing happens (no push, no flash, no dialog) |
| Dashboard Recent | View list | Same rows, icons, amounts, order as before |
| Elsewhere | Open transaction details | Unchanged (other entries + edit/delete intact) |

### Decisions

- **DEC-01** `View` replacement, not handler removal on a touchable
  (a pressable without `onPress` still flashes — misleading).
- **DEC-02** Dashboard-only scope (user call "pag nasa recent activity";
  rejected: disabling details navigation globally).
- **DEC-03** New SPEC-83 file is the canonical home; SPEC-50 (row
  selection) and SPEC-63 CON-07 (edit home) keep theirs, documents never
  edited (§1.14).

### Acceptance

Objective — deterministic, machine-checkable (jest, parameterized by
`Platform.OS` = `android` / `ios` / `web` via mock):

- **ACC-01** Source scan: `app/(tabs)/index.tsx` contains zero
  `transaction-details` references (the row's exact `router.push`
  line gone). Holds on android/ios/web.
- **ACC-02** Source scan: the recent row renders the same style/content
  (`marginHorizontal: 16`, category fallback, icons) with no
  `TouchableOpacity`/`activeOpacity` on the row path; list source
  (`selectRecentTransactions(transactions)`) intact. Holds on
  android/ios/web.
- **ACC-03** Source scan: `transaction-details.tsx` and
  `TransactionList.tsx` byte-identical (no diff); no new import, dep,
  or `Platform.OS` in `index.tsx`. Holds on android/ios/web.

Subjective — human-judged UX as observable reviewer checks (explicit
pass/fail observation steps, user-run per AGENTS §1.3 — agent never runs CLIs):

- **ACC-S01** Reviewer on Android/iOS (Expo Go) confirms: tapping Recent
  rows does nothing at all; rows look pixel-identical; details still
  reachable from the transactions list with edit/delete working.
  FAIL = any navigation/flash, visual change, or lost edit path.
- **ACC-S02** Reviewer on Web confirms ACC-S01 identically, no console
  error. FAIL = any web-only deviation (triggers a CON-06 amendment, not a
  silent branch).

TDD coverage (§1.10): `utils/dashboardRecentNoNav.test.ts` covers
ACC-01..ACC-03 parameterized by `Platform.OS` (android/ios/web); ACC-S01/S02
are user-run manual checks exactly as written above (tap-behavior is not
jest-renderable — guards pin the non-pressable contract).

## Deliverables

- **D-01** `app/(tabs)/index.tsx` ONLY: recent-row `TouchableOpacity` →
  `View` per CON-03. No other line in the file changes.
- **D-02** `utils/dashboardRecentNoNav.test.ts` (new file, named here
  per §1.11): guards for ACC-01..ACC-03 × android/ios/web.
- **D-03** Docs after implementation (AGENTS §1.8, post-FINAL only):
  `docs/savepoint.md` entry + `AGENTS.md` §3 status line. NOT part of the
  spec-writing step; no doc edit ships with the DRAFT.

## Glossary

- **Recent row:** the dashboard's inline transaction row (not the shared
  `TransactionList` component).

## References

- `AGENTS.md` (§1.9 spec format, §1.10 TDD/platform matrix, §1.11
  bare-minimum, §1.12 no new deps, §1.14 one home)
- `specs/04-connection-status-vs-offline-mode.md` (template)
- `specs/50-dashboard-highlights-and-recent.md` (SPEC-50 — row selection;
  untouched)
- `app/(tabs)/index.tsx:112-137` (row block), `components/TransactionList.tsx:35`
