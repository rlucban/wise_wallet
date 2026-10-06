# SPEC-47 — Due Payment Method Picker + Validation-Message Surfacing

| Field    | Value                                                                                          |
|----------|------------------------------------------------------------------------------------------------|
| ID       | SPEC-47                                                                                        |
| Title    | Due payments carry a chosen method; server validation surfaces instead of connection copy      |
| Status   | **FINAL v1.0** (marked by user 2026-10-06; implementable per AGENTS §1.1)      |
| Owner    | TBD (user)                                                                                     |
| Version  | v1.0                                                                                           |
| Scope    | Dues pay path only: picker UI in `app/dues.tsx`, method pass-through, throw preference, tests under `utils/`, journal |
| Non-goals | Server zod change (wallet-api out of tree); Due type/storage change; PUT-400 (T-05); edit-screen rot; add-transaction Cash default (noted split); other writers' success paths; routes; dependencies |

## Terminology

RFC 2119 keywords: MUST, MUST NOT, SHOULD, MAY. "Pay flow" = `recordTransaction` in `app/dues.tsx` (sole manual caller: Pay button). "Server message" = the `error` field `authFetch` returns on HTTP `!ok` (server `message`, cf. T-05 note). "Transport failure" = `status: 0` / NetworkError (no HTTP response).

## Context

### Problem

Paying a due fails live: the POST carries `paymentMethod: ""` → server 400 → client shows a generic connection error → due stays open (fail-closed, no phantom completion).

### Evidence (read-only, static + HAR, 2026-10-06)

- `app/dues.tsx:260-268` calls `addTransaction` with NO `paymentMethod` (Due type has none; pay flow collects none). Single caller verified: Pay button (`dues.tsx:407`); no unattended payer.
- `sanitizeTransaction` defaults missing paymentMethod to `""` (TransactionsContext:41).
- Server zod requires non-empty → 400 `"paymentMethod: Payment method is required"` (HAR-proven twice: wise.har 07:31, localhost.har 08:42, same Weekly due).
- `addTransaction` throws generic "Failed to save transaction…" on any `!ok`; dues catch `:298-304` shows static "Failed to record transaction." — the usable server message dies twice.
- `paymentMethods` is API-only (add-transaction.tsx:83; payment-methods.tsx:39,58,77) — no repo, seed, or AsyncStorage key; a local list must be created.
- `authFetch` already returns server `message` as `error` (apiClient.ts:120-128) — surfacing is a preference, not plumbing.

### User decisions

- Option A′ in plan-fix run `20261006-due-payment-400.md` (B rejected: systematic Cash mislabeling; C parked: type+storage+server).
- Picker dialog at pay time; API list + hardcoded fallback; local/unreachable stores sentinel `"Unknown"` (proposed literal; this spec finalizes); message surfacing end-to-end (throw + dues dialog).
- Promotion note: post-fix rows (real method/"Unknown") promote cleanly; pre-fix `""` rows stay a parked migration gap (promotion scope, not this spec).

## Constraints

- **CON-01 — Bare-minimum (§1.11).** Only D-* files MAY change.
- **CON-02 — No new dependencies (§1.12).**
- **CON-03 — Cross-platform (§1.5).** Paper Dialog works android/ios/web; no native-only imports; no Node APIs in app code.
- **CON-04 — Vercel-deployable + Expo Go safe (§1.6/§1.7).**
- **CON-05 — Local completeness.** The picker MUST work fully offline (hardcoded fallback; zero API dependence for Local).
- **CON-06 — No contract break (§1.4).** Due type, storage keys, routes, native deps unchanged. `paymentMethod` is an existing body field, now populated (server requires it).
- **CON-07 — TDD cross-platform (§1.10).** jest parameterized android/ios/web + user-run Expo Go + web-export matrix.
- **CON-08 — One home (§1.14).** SPEC-45 DEC-02 (transport kept), SPEC-46 D-01 (body precedent), SPEC-07 (completed-dues untouched), SPEC-04 (local) cross-referenced, never re-normed.
- **CON-09 — Ordering.** D-01..D-03 land only after D-00 (FINAL).
- **CON-10 — Transport copy frozen.** Offline/NetworkError (`status: 0`) keeps the existing copy; only HTTP `!ok` with a server message changes.

## Goal

- **DEC-01 — Picker dialog in the pay flow.** List = `paymentMethods` API when reachable, else hardcoded fallback (Cash-led set incl. `"Unknown"` sentinel for local/unreachable).
- **DEC-02 — Pass-through.** `recordTransaction` passes the chosen method into `addTransaction`.
- **DEC-03 — Throw preference.** `addTransaction` throws the server `error` message on HTTP `!ok` when present; transport failure keeps the existing copy.
- **DEC-04 — Dialog surfacing.** The dues catch dialog shows the surfaced message when present instead of the static copy.

### Interaction matrix

| # | Account | Network | Behavior |
|---|---------|---------|----------|
| 1 | Online  | online  | Picker (API list) → 201 + completes; 400s show server message |
| 2 | Online  | offline | Picker shows; write hard-errors SPEC-45 copy (unchanged) |
| 3 | Local   | —       | Picker (fallback incl. "Unknown"); pays locally; promotes cleanly later |

### Acceptance

Objective (jest, `Platform.OS` = android/ios/web):

| ID     | Check                                                                                          |
|--------|------------------------------------------------------------------------------------------------|
| ACC-01 | Picker passes the chosen method into the `addTransaction` call (source-text guard)             |
| ACC-02 | Fallback literal present; API list preferred when reachable (source-text guards)                |
| ACC-03 | Throw prefers server message on HTTP `!ok`; offline path copy unchanged (source-text guards)   |
| ACC-04 | Dues dialog renders the surfaced message when present (source-text guard)                      |
| ACC-05 | No `paymentMethod` field added to Due type/storage (source-text guard)                         |
| ACC-06 | `npm test` 0 failed; `npm run lint` clean; `npx tsc --noEmit` clean (user-run per §1.3)        |

Subjective (reviewer-observed, Expo Go + web export):

- **ACC-S01:** Online — pay with a chosen method → 201, due completes, transaction shows the method.
- **ACC-S02:** Offline/airplane — unchanged hard-error copy, nothing written.
- **ACC-S03:** Local — fallback path pays (incl. "Unknown" when applicable).
- **ACC-S04:** Forced validation failure shows the server message, not the connection copy.
- **ACC-S05:** `expo export --platform web` clean.

## Deliverables

- **D-00:** User marks this spec FINAL (status flip v1.0). Gates D-01..D-03.
- **D-01:** `app/dues.tsx` — picker dialog + list resolution + pass-through + dialog surfacing. Nothing else in the file.
- **D-02:** `context/TransactionsContext.tsx` — throw preference only (CON-10). Nothing else in the file.
- **D-03:** `utils/duePayment.test.ts` — ACC-01..ACC-05 × android/ios/web (source-text guards + behavior asserts; SPEC-07 tsc exclusion respected).
- **D-04:** Journal — `docs/savepoint.md` + `AGENTS.md` §3 entry (incl. live-POST proof of the literal + HAR verdicts).

## Glossary

- Pay flow / Server message / Transport failure — see Terminology.
- Sentinel "Unknown" — provisional method for local/unreachable pays; passes non-empty validation, displays honestly, uploads intact on later promotion.

## References

- Plan-fix run `20261006-due-payment-400.md` (decision + scan RAG) · `specs/45-api-source-of-truth.md` (DEC-02 hard-error no-op) · `specs/46-transaction-category-persistence.md` (D-01 body-shape precedent; D-05 probe pattern for U1-class live proof) · `specs/07-completed-due-locking-and-auto-progression.md` (completed-dues locking — pay path must respect it) · `specs/04-connection-status-vs-offline-mode.md` (local zero-API calls) · `utils/apiClient.ts:99-128` (envelope + `error` field; T-05 server-shape note) · `app/dues.tsx:229-306,407` (recordTransaction + sole manual caller) · `C:\Users\ninal\Downloads\wise.har` + `localhost.har` (POST 400 ×2, same Weekly due; categories server list).
