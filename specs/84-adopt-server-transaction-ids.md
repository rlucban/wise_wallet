# SPEC-84 — Adopt Server-Minted Transaction IDs on Create

| Field | Value |
|---|---|
| ID | SPEC-84 |
| Title | Use the POST-returned row id locally (fix pre-refetch PUT/DELETE 404s) |
| Status | FINAL (per user call 2026-10-10 — implementable; CON-03 pasted-body gate outstanding, device ACC-S01 doubles as retroactive gate per savepoint disclosure) |
| Owner | User |
| Version | 1.0 FINAL |
| Scope | `context/TransactionsContext.tsx` (`addTransaction` only) + `utils/dueTxLinks.ts` (remap helper, named here per §1.11) + one new guard file `utils/serverIdAdopt.test.ts` |
| Non-goals | No PUT/DELETE logic change; no repull/cache change (SPEC-62 untouched); no server change; no error-copy change; no legacy-row backfill (one manual refetch already heals those); no SPEC-43/45/49 document edit |

RFC 2119 terminology (MUST/MUST NOT/SHOULD) applies.

## Context

All web-created transactions fail PUT/DELETE until a manual refetch
(user-verified: "LAHAT HINDI MAKAPAG DELETE", then "Deletes fine" after
navigate-away-and-back). Mechanism, verified in source: the server mints
row ids on create (SPEC-43 HAR-proven — client UUIDs never reconcile),
but web `addTransaction` keeps the client UUID locally with no repull
(`TransactionsContext.tsx:197-199`), so every id-keyed call (`PUT/DELETE
transactions/<client-uuid>`) 404s with `Transaction not found or you do
not have permission…`. Native converges via post-write `refreshFromApi`
— but its `recordDueLink(clientId)` (line 216) orphans on that same
repull, since `attachDueLinks` matches exact `map[row.id]`
(`dueTxLinks.ts:41-46`). One fix cures both: adopt the POST-returned row
id at creation time, for the row AND its due link.

## Constraints

- **CON-01** Every change MUST keep Android + iOS + Web working, stay
  Expo Go (latest) import-safe, and stay Vercel-deployable.
- **CON-02** No new npm packages, native modules, fonts, or third-party code
  (AGENTS §1.12).
- **CON-03** Verification gate (user-run, BEFORE any code): create any
  transaction on web with the Network tab open and paste the full
  `POST transactions` response body. Proceed IFF it contains the created
  row with a string `id` differing from (or equal to) the posted one. On
  204/empty/unreadable → STOP and re-spec (repull-with-bypass design) —
  never implement blind.
- **CON-04** Adoption rule (both web and native POST paths, identical):
  extract the row (`Array.isArray(data) ? data[0] : data`), adopt its id
  IFF a non-empty string (uuid-shape NOT required — any server string
  wins; envelope already unwrapped per SPEC-40); else fail open to the
  client UUID (current behavior, zero regression). The adopted id flows
  into the listed row object AND the `recordDueLink` call for that same
  write (exact remap — no fuzzy matching, no other links touched).
- **CON-05** New helper `remapDueLink(fromId, toId, userId)` in
  `utils/dueTxLinks.ts` (named here per §1.11): no-op when ids equal or
  either is falsy; else moves the map entry. Used ONLY by the adoption
  path (alternatively: record directly under the final id — implementer
  picks the smaller diff that keeps `recordDueLink` semantics for all
  other callers).
- **CON-06** Nothing else in `addTransaction` changes (validation,
  sanitize, receipt, error text, repull cadence, list update). PUT/DELETE,
  fetch, cache (SPEC-62), and the Notifications screen stay
  byte-identical.
- **CON-07** Identical on Android, iOS, and Web — no `Platform.OS` branch.
  Any platform branch needs its own amendment first (§1.10).
- **CON-08** No new import beyond same-layer `utils` (no cycle), no
  dep/storage-key/API/route change.
- **CON-09** No code, config, or dependency change before this spec is marked
  FINAL by the user AND the CON-03 gate passes (AGENTS §1.1, §1.10 pattern).

## Goal

Every created row carries its server id from birth: pre-refetch PUT/DELETE
succeed, due links survive refetches, and a 204-shaped surprise changes
nothing.

### Interaction matrix

| Surface | Action | Expected |
|---|---|---|
| Web | Add/pay, then immediately edit/delete | Succeeds (id already server-true; was: 404) |
| Native | Pay a due, then refetch | Deletion lock still holds (link keyed by server id; was: orphaned) |
| Any | POST returns 204/empty | Client-UUID behavior exactly as today (fail-open) |
| Legacy divergent rows | One manual refetch | Heal via GET-replace (unchanged path; no backfill needed) |

### Decisions

- **DEC-01** Adopt-at-create over repull-after-write (no extra GET, no
  SPEC-62 cache interplay, exact (not fuzzy) link remap; rejected:
  unconditional repull).
- **DEC-02** Both POST paths, one rule (native has the same latent link
  orphan; rejected: web-only fix).
- **DEC-03** HAR-style verification gate first (repo precedent: SPEC-46/
  47/48 gates; rejected: assuming the POST shape).
- **DEC-04** New SPEC-84 file owns id adoption; SPEC-43/45/49/62 keep
  theirs, documents never edited (§1.14).

### Acceptance

Objective — deterministic, machine-checkable (jest, parameterized by
`Platform.OS` = `android` / `ios` / `web` via mock):

- **ACC-01** Source scan: both POST paths extract the returned row,
  adopt a non-empty string id, fail open otherwise; `recordDueLink`
  (or the remap helper) receives the adopted id for that write.
  Holds on android/ios/web.
- **ACC-02** Source scan + unit: `remapDueLink` moves exactly one entry,
  no-ops on equal/falsy ids, touches nothing else; no other link
  call-site changed. Holds on android/ios/web (storage mocked).
- **ACC-03** Source scan: validation/sanitize/receipt/error/repull/list
  lines byte-identical; no new import beyond `utils`, no dep, no
  `Platform.OS`. Holds on android/ios/web.

Subjective — human-judged UX as observable reviewer checks (explicit
pass/fail observation steps, user-run per AGENTS §1.3 — agent never runs CLIs):

- **ACC-S01** Reviewer on Web confirms: add → immediately edit AND delete
  both succeed with no console error (the exact reported repro, inverted).
  FAIL = any 404/permission text.
- **ACC-S02** Reviewer pays a due on Android/iOS (Expo Go), refetches,
  and confirms the scheduled-transaction deletion lock still holds.
  FAIL = lock lost post-refetch.
- **ACC-S03** Reviewer on Web confirms ACC-S02 identically, no console
  error. FAIL = any web-only deviation (triggers a CON-07 amendment, not a
  silent branch).

TDD coverage (§1.10): `utils/serverIdAdopt.test.ts` covers ACC-01..ACC-03
parameterized by `Platform.OS` (android/ios/web); ACC-S01..S03 are user-run
manual checks exactly as written above (server id-minting is not
jest-provable — CON-03 gate covers it).

## Deliverables

- **D-01** Verification gate output pasted by the user (POST body with row
  id) + this spec marked FINAL. No code without both.
- **D-02** `context/TransactionsContext.tsx` (`addTransaction` both POST
  paths) + `utils/dueTxLinks.ts` (remap helper) per CON-04/CON-05.
  Nothing else in either file changes.
- **D-03** `utils/serverIdAdopt.test.ts` (new file, named here
  per §1.11): guards for ACC-01..ACC-03 × android/ios/web.
- **D-04** Docs after implementation (AGENTS §1.8, post-FINAL only):
  `docs/savepoint.md` entry + `AGENTS.md` §3 status line. NOT part of the
  spec-writing step; no doc edit ships with the DRAFT.

## Glossary

- **Adoption:** replacing the local client UUID with the POST-returned
  server id, for the row and its due link, at creation time.
- **Fail-open:** unusable/missing server id → legacy client-UUID behavior.

## References

- `AGENTS.md` (§1.4 compat, §1.9 spec format, §1.10 TDD/platform matrix,
  §1.11 bare-minimum, §1.12 no new deps, §1.14 one home)
- `specs/04-connection-status-vs-offline-mode.md` (template)
- `specs/43-onboarding-opening-balance-once-only.md` (SPEC-43 — server
  mints ids, HAR-proven)
- `specs/45-api-source-of-truth.md` (SPEC-45 — replace-on-fetch heals
  legacy rows)
- `specs/49-scheduled-tx-link-persistence.md` (SPEC-49 — link map +
  attach semantics)
- `context/TransactionsContext.tsx:179-223` (`addTransaction`, both POST
  paths — `data` currently ignored), `:277-310` (PUT/DELETE unchanged)
- `utils/dueTxLinks.ts:16-46` (record/prune/attach)
