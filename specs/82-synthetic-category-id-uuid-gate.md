# SPEC-82 — Synthetic Category IDs Rejected by Server UUID Column

| Field | Value |
|---|---|
| ID | SPEC-82 |
| Title | Send null categoryId for non-UUID ids (fix dues-pay 400 crash) |
| Status | FINAL (per user call 2026-10-10 — implementable) |
| Owner | User |
| Version | 1.0 FINAL |
| Scope | `utils/uuid.ts` (one pure helper, named here per §1.11) + `context/TransactionsContext.tsx` (2 POST bodies + 1 PUT body) + one new guard file `utils/syntheticCategoryId.test.ts` |
| Non-goals | No sanitize/display-label change (SPEC-09 `Add Scheduled` + `Others` echoes stay); no server change; no error-copy change; no new deps; no SPEC-09/45/46 document edit |

RFC 2119 terminology (MUST/MUST NOT/SHOULD) applies.

## Context

Paying a due with no real category crashes on web with console
`invalid input syntax for type uuid: "scheduled"` (`addTransaction`
throws, `recordTransaction` shows its failure dialog, the due stays
uncompleted — fail-closed, correct). Chain, all verified in source:
`recordTransaction` (`dues.tsx:273-278`) falls back to synthetic
`{ id: "scheduled", ... }` (SPEC-09); `sanitizeTransaction` guarantees a
category object; `addTransaction` POSTs `categoryId:
uploaded.category?.id ?? null` (`TransactionsContext.tsx:192,211`) — so
`"scheduled"` (and likewise `"uncategorized"`, title-as-id at
`dues.tsx:276`, and edit-transaction's `"8"`/`"9"` fallbacks) hits the
Postgres uuid column → HTTP 400. The server accepts `null` (SPEC-46
HAR-proven: `categoryId: null` rows read/write fine), so `null` is the
correct wire value for anything that is not a real category id. Real
category ids are uuids (server-minted; `OPENING_BALANCE_CATEGORY_ID` is a
uuid); the only non-uuid ids in the codebase are client sentinels.

## Constraints

- **CON-01** Every change MUST keep Android + iOS + Web working, stay
  Expo Go (latest) import-safe, and stay Vercel-deployable.
- **CON-02** No new npm packages, native modules, fonts, or third-party code
  (AGENTS §1.12).
- **CON-03** New pure helper `toApiCategoryId(id: string | null |
  undefined): string | null` in `utils/uuid.ts` (beside `generateUUID`,
  no new imports): returns the id iff it matches UUID shape
  (`/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i`),
  else `null` (covers nil, blank, `"scheduled"`, `"uncategorized"`,
  titles, `"8"`/`"9"` — no sentinel enumeration to rot).
- **CON-04** Use the helper at all three wire sites: both POST bodies
  (`categoryId: toApiCategoryId(uploaded.category?.id)`) and the PUT
  body (`updates.category` present → `toApiCategoryId(updates.category
  ? updates.category.id : null)` — the PUT carries the identical hole
  for edited synthetic rows, included deliberately; same 2-line shape).
  Local state, sanitize fallbacks, and display echoes MUST stay
  byte-identical (SPEC-09 labels survive locally; web keeps them verbatim
  since web never repulls — native repull may resolve null rows to
  `Others` per existing SPEC-45/46 dynamics, accepted as-is).
- **CON-05** Error/success copy, validation, busy states, confirm flow,
  and the fail-closed order MUST stay byte-identical.
- **CON-06** Identical on Android, iOS, and Web — no `Platform.OS` branch.
  Any platform branch needs its own amendment first (§1.10).
- **CON-07** No new import beyond the helper (same-layer `utils` import —
  no cycle: `uuid.ts` imports nothing), no dep/storage/API/route change.
- **CON-08** No code, config, or dependency change before this spec is marked
  FINAL by the user (AGENTS §1.1, §1.10 CON-10 pattern).

## Goal

Dues with no real category pay successfully online; no synthetic id ever
reaches the API; everything else behaves exactly as before.

### Interaction matrix

| Surface | Action | Expected |
|---|---|---|
| Scheduled (online) | Pay uncategorized due | Recorded + due completed (was: 400 + failure dialog, due stuck) |
| Any (online) | Add/edit with synthetic category | Saves with server-side `null` (was: same 400 class) |
| Any | Normal uuid-categorized writes | Byte-identical payloads as before |
| Local accounts | Any write with synthetic category | Unchanged (no uuid constraint locally) |

### Decisions

- **DEC-01** UUID-shape rule, not a sentinel allowlist (user-visible bug,
  but the fix must cover present + future sentinels without enumeration).
- **DEC-02** Central fix in `addTransaction`/PUT, not dues-local
  (rejected: patching `recordTransaction` alone — `sanitizeTransaction`
  would re-poison it with `"uncategorized"`, and the PUT hole would
  remain).
- **DEC-03** PUT included deliberately (same defect, 2 lines — flagged
  for FINAL review; reject it there and D shrinks by 2 lines + 2 tests).
- **DEC-04** New SPEC-82 file owns the wire rule; SPEC-09/45/46 keep
  labels/mirror/merge, documents never edited (§1.14).

### Acceptance

Objective — deterministic, machine-checkable (jest, parameterized by
`Platform.OS` = `android` / `ios` / `web` via mock):

- **ACC-01** Pure helper: uuid (any case) passes through; `null`,
  `undefined`, `""`, `"scheduled"`, `"uncategorized"`, titles,
  `"8"`/`"9"` all map to `null`. Holds on android/ios/web.
- **ACC-02** Source scan: both POST bodies + the PUT body route through
  `toApiCategoryId`; no bare `category?.id ?? null` wire expression
  remains; sanitize/display lines byte-identical. Holds on
  android/ios/web.
- **ACC-03** Source scan: no new import beyond `./uuid` (already the
  `generateUUID` source — import list extended, not added), no dep,
  no `Platform.OS`, no copy/behavior drift outside the three bodies.
  Holds on android/ios/web.

Subjective — human-judged UX as observable reviewer checks (explicit
pass/fail observation steps, user-run per AGENTS §1.3 — agent never runs CLIs):

- **ACC-S01** Reviewer on Web (the reporting platform) confirms: paying
  the same uncategorized due now records + completes with no console
  error. FAIL = any 400/uuid text or stuck due.
- **ACC-S02** Reviewer on Android/iOS (Expo Go) confirms normal
  categorized pay/add/edit flows unchanged. FAIL = any regression.
- **ACC-S03** Reviewer on Web confirms ACC-S02 identically, no console
  error. FAIL = any web-only deviation (triggers a CON-06 amendment, not a
  silent branch).

TDD coverage (§1.10): `utils/syntheticCategoryId.test.ts` covers
ACC-01..ACC-03 parameterized by `Platform.OS` (android/ios/web); ACC-S01..S03
are user-run manual checks exactly as written above (server round-trips
are not jest-provable — guards pin the wire rule + payload shape).

## Deliverables

- **D-01** `utils/uuid.ts`: `toApiCategoryId` per CON-03. Nothing else in
  the file changes.
- **D-02** `context/TransactionsContext.tsx` ONLY: three bodies per
  CON-04. No other line in the file changes.
- **D-03** `utils/syntheticCategoryId.test.ts` (new file, named here
  per §1.11): guards for ACC-01..ACC-03 × android/ios/web. Plus
  `utils/transactionCategory.test.ts` ACC-01/ACC-01b rewritten to the
  wire-helper norm (the SPEC-46 pins they replaced were superseded here;
  all other pins untouched).
- **D-04** Docs after implementation (AGENTS §1.8, post-FINAL only):
  `docs/savepoint.md` entry + `AGENTS.md` §3 status line. NOT part of the
  spec-writing step; no doc edit ships with the DRAFT.

## Glossary

- **Synthetic id:** any client fallback id that is not a uuid
  (`scheduled`, `uncategorized`, titles, `8`/`9`).
- **Wire rule:** uuid → as-is, anything else → `null` (server-accepted).

## References

- `AGENTS.md` (§1.4 compat, §1.9 spec format, §1.10 TDD/platform matrix,
  §1.11 bare-minimum, §1.12 no new deps, §1.14 one home)
- `specs/04-connection-status-vs-offline-mode.md` (template)
- `specs/09-fix-default-category-for-scheduled-due-transactions.md`
  (SPEC-09 — `Add Scheduled` label home; untouched)
- `specs/45-api-source-of-truth.md` + `specs/46-transaction-category-persistence.md`
  (API-first/repull, flat `categoryId`, null accepted; untouched)
- `app/dues.tsx:273-289` (fallback → `addTransaction`), `:320-322`
  (fail-closed catch)
- `context/TransactionsContext.tsx:38-55` (sanitize/fallback),
  `:190-217` (POST bodies), `:240-242` (PUT body)
