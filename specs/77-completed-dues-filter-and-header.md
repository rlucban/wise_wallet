# SPEC-77 — Completed Dues Two-Option Filter + Static Total Header

| Field | Value |
|---|---|
| ID | SPEC-77 |
| Title | Completed dues: drop All segment (default This Month), static TOTAL COMPLETED |
| Status | FINAL v1.1 (v1.0 + v1.1 per user calls 2026-10-10 — implementable) |
| Owner | User |
| Version | 1.1 FINAL |
| Scope | `app/completed-dues.tsx` (filter state, predicate fallthrough, buttons, header copy) + one new guard file `utils/completedDuesFilter.test.ts` |
| Non-goals | No week/month window math change; no card/row/skeleton/refresh change; no dues-screen, storage-key, API-contract, route, dependency, or Platform change; no SPEC-32 document edit |

RFC 2119 terminology (MUST/MUST NOT/SHOULD) applies.

## Context

The Completed Dues screen (`app/completed-dues.tsx`) filters by a three-way
segment (`:20` state `"week" | "month" | "all"` defaulting `"all"`, buttons
`:133-137`) and heads its summary card `TOTAL COMPLETED
({filter.toUpperCase()})` (`:151`) — rendering `TOTAL COMPLETED (ALL)` by
default. User call 2026-10-10: remove the `All` option (leaving `This Week` /
`This Month`, defaulting to `This Month`) and fix the header to plain
`TOTAL COMPLETED`.

Overlap note (§1.14): the three-segment set was defined by SPEC-32 D-02.
This spec supersedes exactly that slice (option set + default + header
copy); the SPEC-32 document is NOT edited. SPEC-12's tab-switcher mention
is descriptive contrast guidance, unaffected by dropping one option. The
SPEC-61 skeleton guard pins only loading-branch strings, verified
unaffected.

## Constraints

- **CON-01** Every change MUST keep Android + iOS + Web working, stay
  Expo Go (latest) import-safe, and stay Vercel-deployable.
- **CON-02** No new npm packages, native modules, fonts, or third-party code
  (AGENTS §1.12).
- **CON-03** Filter state MUST narrow to `useState<"week" | "month">("month")`
  (default `This Month` — required, since `"all"` ceases to exist); the
  `onValueChange` cast narrows identically; buttons become exactly
  `This Week` / `This Month` in that order.
- **CON-04** The now-dead `return items;` fallthrough (`:59`, the old
  `"all"` path) MUST be removed with the narrowing — no dead branch left
  behind. Week/month window math (`:28-42`) and the sort stay byte-identical.
- **CON-05** The summary header MUST read exactly `TOTAL COMPLETED` (static
  text — the `({filter.toUpperCase()})` interpolation is deleted). Amount,
  card style, and the `length > 0` gate stay byte-identical.
- **CON-06** Identical on Android, iOS, and Web — no `Platform.OS` branch.
  Any platform branch needs its own amendment first (§1.10).
- **CON-07** No code, config, or dependency change before this spec is marked
  FINAL by the user (AGENTS §1.1, §1.10 CON-10 pattern).

## Goal

Completed dues open on `This Month` with two filter choices; the summary
card always reads `TOTAL COMPLETED`; week/month behavior is otherwise
untouched.

### Interaction matrix

| Surface | Action | Expected |
|---|---|---|
| Completed dues | Open screen | `This Month` active; two segments only; header `TOTAL COMPLETED` + month total |
| Completed dues | Tap `This Week` | Week-filtered list + total; header stays `TOTAL COMPLETED` |
| Completed dues | Tap `This Month` | Month-filtered list + total; header stays `TOTAL COMPLETED` |
| Completed dues | Pull-to-refresh, empty state, rows | Identical to before |

### Decisions

- **DEC-01** Default becomes `"month"` (user call "if necessary" — it is
  necessary: `"all"` no longer exists).
- **DEC-02** Dead `"all"` fallthrough deleted with the narrowing (rejected:
  leaving an unreachable path).
- **DEC-03** Static header with no filter reflection (user call; rejected:
  `TOTAL COMPLETED (THIS MONTH)` dynamic variant).
- **DEC-04** New SPEC-77 file is the canonical home for the segment set +
  header copy; SPEC-32's document stays untouched (§1.14).

### Acceptance

Objective — deterministic, machine-checkable (jest, parameterized by
`Platform.OS` = `android` / `ios` / `web` via mock):

- **ACC-01** Source scan: state defaults `"month"` with type
  `"week" | "month"` (no `"all"` in the state line, cast, or buttons);
  exactly two segment buttons (`This Week`, `This Month`, in order).
  Holds on android/ios/web.
- **ACC-02** Source scan: header contains static `TOTAL COMPLETED` with no
  `filter.toUpperCase()` interpolation; no `"all"`-branch remains in the
  predicate. Holds on android/ios/web.
- **ACC-03** Source scan: week/month window math, sort, skeleton branch,
  refresh, and row rendering intact; no new import, dep, or `Platform.OS`
  branch. Holds on android/ios/web.

Subjective — human-judged UX as observable reviewer checks (explicit
pass/fail observation steps, user-run per AGENTS §1.3 — agent never runs CLIs):

- **ACC-S01** Reviewer on Android/iOS (Expo Go) confirms: screen opens on
  `This Month`, two segments only, header reads exactly `TOTAL COMPLETED`;
  both filters list and total correctly. FAIL = third segment present,
  wrong default, or dynamic header remnant.
- **ACC-S02** Reviewer on Web confirms ACC-S01 identically, no console
  error. FAIL = any web-only deviation (triggers a CON-06 amendment, not a
  silent branch).

TDD coverage (§1.10): `utils/completedDuesFilter.test.ts` covers
ACC-01..ACC-03 parameterized by `Platform.OS` (android/ios/web); ACC-S01/S02
are user-run manual checks exactly as written above.

## Deliverables

- **D-01** `app/completed-dues.tsx` ONLY: state + cast narrowing, `All`
  button + dead fallthrough removal, static header per CON-03..CON-05.
  No other line in the file changes.
- **D-02** `utils/completedDuesFilter.test.ts` (new file, named here
  per §1.11): guards for ACC-01..ACC-03 × android/ios/web.
- **D-03** Docs after implementation (AGENTS §1.8, post-FINAL only):
  `docs/savepoint.md` entry + `AGENTS.md` §3 status line. NOT part of the
  spec-writing step; no doc edit ships with the DRAFT.

## Glossary

- **Segment set:** the `SegmentedButtons` options — now two, owned here.
- **Static header:** `TOTAL COMPLETED` with no filter interpolation.

## References

- `AGENTS.md` (§1.9 spec format, §1.10 TDD/platform matrix, §1.11
  bare-minimum, §1.12 no new deps, §1.14 one home)
- `specs/04-connection-status-vs-offline-mode.md` (template)
- `specs/32-completed-dues-screen-and-transaction-deletion-lock.md`
  (SPEC-32 D-02 — segment-set home; document NOT amended)
- `app/completed-dues.tsx:20` (state), `:44-60` (predicate), `:130-151`
  (segments + header)

---

## v1.1 Amendment — Overall list, segments removed (PROPOSED, not yet FINAL)

User call 2026-10-10 (folded here per user choice (a) — the standalone
`specs/78-completed-dues-overall-list.md` DRAFT is deleted instead of
implemented, keeping one home per §1.14): drop the week/month separation
entirely — one overall transactions-style list of all completed dues.
v1.0 sections above stay normative; where this amendment conflicts, v1.1
governs once marked FINAL. Explicit supersessions: CON-03 (two-option
state) → CON-10 (no filter); ACC-01/ACC-02/ACC-03/S01/S02 → ACC-04/05/06
and ACC-S03/S04 below (the v1.0 filter pins cannot stand alongside CON-11).

### v1.1 Constraints (delta)

- **CON-10** The `SegmentedButtons` block, the `filter` state + cast, and
  the week/month predicate branches MUST all be removed. The list becomes
  the existing sorted-all expression (completed, date-desc — v1.0 line 45,
  kept byte-identical in behavior).
- **CON-11** Orphan cleanup (required for lint-clean): the now-unused `now`
  / `startOfWeek` / `endOfWeek` / `startOfMonth` / `endOfMonth` memos plus
  the `filter` dep-array entries MUST be deleted with the filter. No
  unused variable may remain.
- **CON-12** The `TOTAL COMPLETED` card (copy, amount, style, `length > 0`
  gate), sort, skeleton branch, refresh, rows, and empty state MUST stay
  byte-identical — the card now totals the overall list.
- **CON-13** No v1.1 code, config, or dependency change until v1.1 is marked
  FINAL (CON-07 extended).

### v1.1 Goal (delta)

| Surface | Action | Expected |
|---|---|---|
| Completed dues | Open screen | No segments; full completed list newest-first; `TOTAL COMPLETED` + overall total |
| Completed dues | Scroll / refresh / empty | Identical behavior to before, minus filtering |

Decisions:

- **DEC-05** Delete the filter feature outright (user call; rejected:
  keeping segments with any default).
- **DEC-06** Orphans go with the filter (required — otherwise unused-var
  lint failures).
- **DEC-07** Folded into SPEC-77 v1.1 (user choice (a)); the SPEC-78 DRAFT
  file is deleted, never implemented.

Acceptance (all × android/ios/web where machine-checkable):

- **ACC-04** Source scan: no `SegmentedButtons`, no `filter` state/cast,
  no `"week"` / `"month"` option strings; the list derives from the kept
  sorted-all expression.
- **ACC-05** Source scan: no orphaned machinery (`startOfWeek`,
  `startOfMonth`, `setFilter` all absent); header still static
  `TOTAL COMPLETED` with the live total.
- **ACC-06** Source scan: sort, skeleton branch, refresh, rows, and empty
  state intact; no new import, dep, or `Platform.OS` branch.
- **ACC-S03** Reviewer on Android/iOS (Expo Go) confirms: no segments,
  full list newest-first, overall total correct. FAIL = any filter UI
  remnant or missing dues.
- **ACC-S04** Reviewer on Web confirms ACC-S03 identically, no console
  error. FAIL = any web-only deviation.

### v1.1 Deliverables (delta)

- **D-04** `app/completed-dues.tsx` ONLY: filter + orphans removal per
  CON-10/CON-11; everything else byte-identical.
- **D-05** `utils/completedDuesFilter.test.ts`: rewritten guards for
  ACC-04/05/06 (superseded v1.0 pins replaced, not duplicated) ×
  android/ios/web — existing guard home, pin migration per §1.11/§1.14.
- **D-06** Docs after v1.1 implementation (AGENTS §1.8, post-FINAL only):
  `docs/savepoint.md` entry + `AGENTS.md` §3 status line.
