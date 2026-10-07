# SPEC-46 — Transaction Category Persistence (flat categoryId + rehydrate)

| Field    | Value                                                                                          |
|----------|------------------------------------------------------------------------------------------------|
| ID       | SPEC-46                                                                                        |
| Title    | Online transaction category survives write+refetch via flat `categoryId` + read rehydrate       |
| Status   | **FINAL v1.1** (marked by user 2026-10-06; implementable per AGENTS §1.1)      |
| Owner    | TBD (user)                                                                                     |
| Version  | v1.1                                                                                           |
| Scope    | Transactions-layer category shape only: `context/TransactionsContext.tsx` (online write shape + online read rehydrate), one new pure helper + tests under `utils/`, journal, plus one user-run contract probe under `scripts/` (verification tooling, never bundled); v1.1 adds web read rehydrate (D-02 extension) |
| Non-goals | Server/API change (wallet-api out of tree); display-site edits (7 files); dues/savings/categories/profile; web or local behavior change; routes; dependencies; edit-transaction `"8"/"9"` fallback rot (separate spec); v1.1 leaves the web WRITE path untouched (flat since v1.0) |

## Terminology

RFC 2119 keywords: MUST, MUST NOT, SHOULD, MAY. "Flat categoryId" = top-level `categoryId` string on the transaction payload/row (what the server persists). "Nested category" = the `category: {id,name,type,updatedAt}` object the client builds. "Rehydrate" = rebuilding nested `category` on read from flat `categoryId` via the categories list. "Server-echoed" = a nested `category` present on an API row.

## Context

### Problem

Online accounts: every saved transaction displays 'Others' regardless of the selected category (e.g. Salary/Freelance income). Local accounts unaffected; web correct until next fetch.

### Evidence (read-only, static, 2026-10-06)

- `app/add-transaction.tsx:198-213` passes the selection through; `sanitizeTransaction` keeps it; POST nests `category`. Client sends correctly.
- `utils/db.ts:57-67` seeds Salary/Freelance/Others; `utils/categoryOptions.ts` filters by type and appends synthetic Others on identical UUIDs. Selection state correct.
- Server drops the nested category (`categoryId: null`, no `title`) — HAR-proven (`docs/savepoint.md:672`, `docs/todo-specs.md:305-306`).
- `context/TransactionsContext.tsx:98-110` replace-on-fetch + `:49-52` fallback stamps 'Others'; 7 display sites render `?.name || "Others"`.
- Server-shape precedent: `app/(tabs)/settings.tsx:419,604,674,749` send flat `categoryId`. Rehydrate precedent: `app/dues.tsx:253-258`.

### User decisions

- Option A chosen in plan-fix run `20261006-add-transaction-category.md` (B rejected vs SPEC-45 DEC-01; C parked fallback).
- U1 contract-probe gate (v0.2, Keep A): user runs the D-05 probe and pastes PASS before any code slice. FAIL → stop, pursue Option C (server change request), no client slices.

## Constraints

- **CON-01 — Bare-minimum (§1.11).** Only D-* files MAY change.
- **CON-02 — No new dependencies (§1.12).**
- **CON-03 — Web byte-identical** (SPEC-36 CON-W-03; SPEC-45 CON-03). v1.1 exception: the web READ map line in `fetchTransactions` MAY change per D-02; web write bodies and all other web lines stay byte-identical.
- **CON-04 — Local byte-identical** (SPEC-04; SPEC-45 CON-04; `utils/authMode.ts` untouched).
- **CON-05 — Cross-platform (§1.5).** No native-only static imports; no Node APIs in app code.
- **CON-06 — Vercel-deployable + Expo Go safe (§1.6/§1.7).**
- **CON-07 — No contract break (§1.4).** Storage keys, AsyncStorage shapes, routes, native deps unchanged. Extra body key `categoryId` is additive-only; the server already accepts it on sibling flows.
- **CON-08 — TDD cross-platform (§1.10).** jest parameterized android/ios/web + user-run Expo Go + web-export matrix.
- **CON-09 — One home (§1.14).** SPEC-45 (truth mechanics), SPEC-04, SPEC-36 cross-referenced, never re-normed.
- **CON-10 — Ordering.** D-05 (probe script) lands first so the gate is runnable; D-01..D-03 land only after D-00 (FINAL) AND a pasted probe PASS. A probe FAIL stops all code slices (Option C path).

## Goal

- **DEC-01 — Writes carry flat `categoryId`** (= selected `category.id`, `null` when none) on online POST/PUT; the nested `category` object MUST be kept as-is (harmless; preserves local and web-optimistic display).
- **DEC-02 — Reads rehydrate.** For each API row, nested `category` = server-echoed nested if present, else `categories.find(c => c.id === row.categoryId)` on match, else the existing Others fallback. Rehydrate logic MUST live in a pure `utils/` helper (no `react-native` import) so jest covers it. Web resolves against CategoriesContext state (ancestry verified: ProviderComposer reduceRight nests CategoriesProvider outside TransactionsProvider — app/_layout.tsx:361, ProviderComposer.tsx:9; no tree change, no import cycle). Accepted cost: web mount may GET twice (pre/post categories load); no dedupe per §1.11.
- **DEC-03 — Empty-list safety.** When the categories list is empty/unloaded at rehydrate time, keep the current fallback for that pass (no throw, no blank); the next fetch rehydrates. No loading-state UI change.

### Interaction matrix

| # | Account | Platform | Behavior |
|---|---------|----------|----------|
| 1 | Online  | mobile   | POST/PUT include `categoryId`; GET rows rehydrated per DEC-02 |
| 2 | Online  | web      | POST/PUT unchanged since v1.0; GET rows rehydrated via Categories state (v1.1) |
| 3 | Local   | mobile   | byte-identical (AsyncStorage nested round-trip, untouched) |
| 4 | Online  | offline  | hard-error no-op per SPEC-45 (unchanged) |

### Acceptance

Objective (jest, `Platform.OS` = android/ios/web):

| ID     | Check                                                                                          |
|--------|------------------------------------------------------------------------------------------------|
| ACC-01 | Online POST/PUT bodies derive `categoryId` from the selected `category.id` (not hardcoded; source-text guard)                  |
| ACC-02 | `Platform.OS === "web"` branches byte-identical (diff-empty guard)                            |
| ACC-03 | `isLocal` branches byte-identical; `utils/authMode.ts` untouched                               |
| ACC-04 | Helper: echo wins; `categoryId` resolves (incl. b18/b19 synthetic IDs against seed list); unknown id, null/missing `categoryId` → Others without throw; empty list → Others             |
| ACC-05 | `npm test` 0 failed; `npm run lint` clean; `npx tsc --noEmit` clean (user-run per §1.3)        |

| ACC-06 | Contract probe (D-05) exits 0: probe row round-trips `categoryId` and is deleted afterwards (user-run per §1.3; output pasted as gate evidence) |
| ACC-07 | Web fetch maps rows through resolveTransactionCategory with Categories state (no catRepo in web branch; useCategoriesData consumed) — source-text guards |

Subjective (reviewer-observed, Expo Go + web export):

- **ACC-S01:** Online native — add Salary income → details + Recent Activity show Salary; survives tab-switch refetch.
- **ACC-S02:** Others-with-custom-text still saves/displays the custom text (no regression).
- **ACC-S03:** Local add + web add behavior unchanged.
- **ACC-S04:** `expo export --platform web` clean.
- **ACC-S05 (v1.1):** Web — add Salary income → survives screen-refresh refetch still showing Salary (needs categories loaded; empty-list pass falls back per DEC-03).

## Deliverables

- **D-00:** User marks this spec FINAL (status flip v1.0). Gates D-01..D-03 together with the D-05 probe PASS.
- **D-01:** `context/TransactionsContext.tsx` — online add/update include `categoryId`. Web/local branches byte-identical. Nothing else in the file.
- **D-02:** Same file read path (`refreshFromApi`/`addCategoryFallback`) rehydrates via new `utils/transactionCategory.ts` pure helper (DEC-02/DEC-03). v1.1: web branch of `fetchTransactions` maps through the same helper with CategoriesContext state (+ deps); native/local/web-write paths untouched by v1.1. Nothing else.
- **D-03:** `utils/transactionCategory.test.ts` — hardened ACC-01..ACC-04 × android/ios/web (derivation, null-safety, b18/b19 seed-ID resolution; source-text guards + pure asserts; SPEC-07 tsc exclusion respected). v1.1: + ACC-07 web-read guards (ACC-03 count stays 4 — web wiring adds no new "categoryId" literal).
- **D-04:** Journal — `docs/savepoint.md` + `AGENTS.md` §3 entry; includes U1 probe outcome + edit-screen `"8"/"9"` rot note (own future spec). v1.1: + v1.1 journal entry + HAR verdicts (wise.har stale-bundle, localhost.har D-01 live proof).
- **D-05:** `scripts/verify-category-roundtrip.mjs` — user-run contract probe (node, zero deps, never imported by app code): reads the API URL from `EXPO_PUBLIC_API_URL`, takes token + userId args (never logged), POSTs a uniquely-marked probe transaction carrying flat `categoryId`, GETs it back, asserts the field survived, DELETEs the probe row, prints PASS/FAIL and exits non-zero on any mismatch or leftover.

## v1.2 Amendment — Sanitize non-UUID categoryId → null (FINAL v1.2 per user call 2026-10-07: "OD-46A a ... FINAL, code this for me")

### Context

- Pasted log 2026-10-07: Scheduled → Pay "fdsfsf" → Confirm → `Error adding transaction: invalid input syntax for type uuid: "scheduled"` (`addTransaction` via `dues.tsx:257 recordTransaction`). Root cause: `dues.tsx:283-288` falls back to the synthetic `{ id: "scheduled", name: "Add Scheduled" }` (SPEC-09 label) when the due has no real category; D-01's flat mapping (`categoryId: uploaded.category?.id ?? null` — web POST `:178`, native POST `:196`, web PUT `:225-226`) forwards `"scheduled"` verbatim and the server casts `categoryId` to UUID → PG 500. Same wall for any synthetic id (edit-screen `"8"/"9"` rot noted in D-04) on every online write, web + native. Dues error surfacing already exists (alert dialog + error banner in the screenshots) — purely a payload bug, no UX gap.

### Decisions (OPEN — user to call)

- **OD-46A (fix shape).** (a) Recommended, central: in the online POST/PUT mapping expressions, `categoryId = isUUID(category?.id) ? category.id : null` — reuses the SPEC-45 D-45A `isUUID` helper (cross-referenced, never duplicated). One spot covers dues-pay, add/edit screens, and onboarding; display falls back to "Others" via the unchanged DEC-02 rehydrate. Incidentally heals the `"8"/"9"` edit write path (same lines — recorded here, no separate spec needed for writes). (b) Per-caller fix in `recordTransaction` only (add/edit rot left for later).

### Constraints

- **CON-11 — Mapping lines only.** Only the `categoryId` derivation expressions MAY change; the nested `category` object stays as-is (DEC-01); local branches byte-identical; rehydrate/read untouched. CON-03's web-write-identical clause is explicitly superseded for these expressions (otherwise every synthetic-id write 500s server-side). No dependency, contract, storage-key, or route change.

### Goal

- **DEC-04 (pending OD-46A).** Under (a): web POST + native POST + web PUT derive `categoryId` through the UUID gate (native PUT sends no `categoryId` today — untouched).

| State | Behavior |
|---|---|
| Pay due with a real category | Unchanged (UUID passes through) |
| Pay due with no category (synthetic `"scheduled"`) | POST 201 with `categoryId: null`; row reads back as "Others"; due completes normally |
| Edit with fallback `"8"/"9"` | Saves with `categoryId: null` instead of PG 500 |
| Local accounts | Byte-identical (nested round-trip, untouched) |

Objective (jest, `Platform.OS` = android/ios/web):

| ID | Check |
|---|---|
| ACC-08 | The three online `categoryId` derivations gate on `isUUID` (web POST, native POST, web PUT); zero bare `category?.id ?? null` / `category.id` passthrough remains on online write paths (`isUUID` itself covered by ACC-45A — no new helper test) |
| ACC-09 | `npm test` 0 failed; `npm run lint` clean; `npx tsc --noEmit` clean (user-run per §1.3) |

Subjective (reviewer-observed, web export + Expo Go):

- **ACC-S06:** Reviewer pays a category-less due on web and native: success path, new row shows "Others", due marks paid/completed, zero error. Real-category dues unchanged.

### Deliverables

- **D-06 (`context/TransactionsContext.tsx`):** UUID-gate the three online `categoryId` derivations per DEC-04. Nothing else in the file.
- **D-07 (`utils/transactionCategory.test.ts`, extend):** ACC-08 source guards × android/ios/web. No new test file.
- **D-08 (journal):** `docs/savepoint.md` + `AGENTS.md` §3 entry.

## Glossary

- Flat categoryId / Nested category / Rehydrate / Server-echoed — see Terminology.
- Replace-don't-merge (SPEC-45): fetch replaces state wholesale — the amplifier that exposed this bug.

## References

- Plan-fix run `20261006-add-transaction-category.md` (decision + scan RAG) · `specs/45-api-source-of-truth.md` (DEC-01/02, CON-03/04, ACC precedent) · `specs/04-connection-status-vs-offline-mode.md` (local) · `specs/36-web-platform-invariants.md` (web) · `docs/savepoint.md:672` + `docs/todo-specs.md:305-306` (HAR proof) · `app/dues.tsx:253-258` (rehydrate precedent) · `app/(tabs)/settings.tsx:419,604,674,749` (flat-`categoryId` precedent) · `scripts/verify-category-roundtrip.mjs` (D-05 probe, added v0.2) · app/_layout.tsx:361 + components/ProviderComposer.tsx:9 (Categories-outside-Transactions ancestry, added v1.1).
