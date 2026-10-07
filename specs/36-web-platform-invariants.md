# Spec 36: Web Platform Invariants (Always-Online, Never-Local, API-Direct Persistence)

| Field | Value |
|---|---|
| ID | SPEC-36 |
| Title | Web Platform Invariants (Always-Online, Never-Local, API-Direct Persistence) |
| Status | **FINAL v1.2** (session-identity exception per 2026-10-04 user call — implementable) |
| Owner | User (final authority) |
| Version | 1.2 |
| Scope | Web-only branches: connection-status reporting (hard Online pin), account-mode availability (never Local + legacy force-migrate), API-direct persistence rule, web-row rule for credential-change callers |
| Non-goals | Any native (Android/iOS) behavior change; `autoBackup`/sync-state semantics (a separate dimension — explicitly out of this spec); offline-capable PWA/caching; new dependencies, storage keys, routes, or API contract changes |
| Normative source | This file. Amends SPEC-04 v1.4 on web only, with supersession lines recorded below (SPEC-34-over-33 precedent). |

> History: drafted 2026-10-03 as v0.1 (always-online / never-local / always-auto-backup).
> Corrected 2026-10-04 per user call: the spec is about offline(LOCAL) vs
> online(API-CONNECTED) only — `autoBackup` never belonged here (CON-W-03/D-W-03/
> DEC-W3/ACC-W-03 deleted, no renumbering debt left behind). Web model decided:
> web persists API-direct always, the flag guards nothing, localStorage is not a
> store. FINAL v1.0 per user call (`DEC-W1` A, `DEC-W2` C).
> Widened 2026-10-04 to v1.1 per user call (Option B): D-W-03/ACC-W-03 cover reads
> as well as writes — web never reads the on-device store either. Narrow
> flag-gate plan discarded (it left false-positive reads intact).
> Amended 2026-10-04 to v1.2 per user call: session-identity keys (`activeUserId`,
> `authToken`, `lastActiveUserId`) MAY be read on web — user data still never.
> Session MUST be verified by an authenticated call; 401 clears it (existing
> `authFetch` path). S1/S2 slices deleted (no `secureStorage`/`AuthContext` change).

## Terminology (RFC 2119)

The keywords **MUST**, **MUST NOT**, **SHOULD**, and **MAY** in this spec are
to be interpreted as described in RFC 2119. Informative prose (examples,
"today", "currently") is non-normative unless restated as a requirement.

## 1. Context

### 1.1 Problem

In one sentence: **on web, the app can report Offline and offer Local-only operation on a platform whose localStorage is clearable and untrustworthy — producing false-positive reads presented as truth.**

Online means connected to the API, full stop. Offline means local-only. Sync/
`autoBackup` state is a different dimension and is not governed here.

### 1.2 Current behavior (non-normative)

- SPEC-04 v1.4: web offers no *new* Offline accounts (register/login), but pre-existing web Local accounts log in and may Make Online at will.
- A web session can report Offline mid-session (`OfflineIndicator`, settings Offline status, login offline strip) after loading fine.
- Web mutations consult the `autoBackup` flag and persist to localStorage-backed AsyncStorage — reads that may be stale, partial, or cleared.

### 1.3 Invariants (decided)

1. **Web is always Online** — connection status on web reads Online unconditionally (`DEC-W1` hard pin: probe skipped, Offline UI unreachable). API failures surface openly at the call site, never as a status and never as stored-local.
2. **Web is never Local** — no Local creation (already true) plus forced migration for pre-existing web Local accounts (`DEC-W2`).
3. **Web persists API-direct** — every web mutation goes to the API; the `autoBackup` flag is ignored on web; localStorage is not a store.

## 2. Constraints (normative)

- **CON-W-01 — Pinned Online (hard).** On `Platform.OS === 'web'`, connection status MUST read Online. The health probe MUST be skipped on web (not run-and-discarded). `OfflineIndicator`, the settings Offline status/`Check` affordance, and the login offline notice MUST be unreachable on web. Every API call's own failure handling (gated copy, zero-write fallbacks) remains the safety net for mid-session drops — nothing new is built for them.
- **CON-W-02 — Never Local, legacy force-migrated.** Web MUST offer no Local creation or Local fallback creation (extends v1.4, which already holds). Pre-existing web Local accounts MUST force Make Online at next login: one-time local→API migration, then the account is an ordinary online account. Grandfathering (serving untrusted reads) and login-blocking (data loss) are rejected.
- **CON-W-03 — API-direct persistence.** On web, mutations MUST be issued to the API and MUST NOT depend on localStorage/AsyncStorage as a source of truth. The `autoBackup` value MUST NOT gate, alter, or be written by web persistence paths — on web the flag is meaningless (there is no local store to back up *from*). An unreachable API MUST fail openly with zero local writes. Exception: session-identity keys (`activeUserId`, `authToken`, `lastActiveUserId`) MAY be read on web to restore the claimed session; the session MUST then be verified by an authenticated API call, and any 401 MUST clear the session and route to login via the existing `authFetch` 401 path. Second exception (user call 2026-10-07): the app-lock PIN hash key `user_{id}_passcode` MAY be persisted via the existing `secureStorage` web fallback; this is a client-side unlock gate, not user data, and it is NOT a substitute for the API session check — real authentication on web remains the JWT verified on every POST/GET. No other key MAY join this exception.

> CON-W-03 second-exception amendment per user call 2026-10-07 (SPEC-58 lock half).
- **CON-W-04 — Native untouched + caller web row.** Android/iOS behavior MUST be byte-identical (SPEC-04 incl. v1.4). This spec supersedes SPEC-04 v1.4's "existing web locals keep login" (replaced by force-migrate). Any credential-change feature (e.g. PIN change) MUST conform to the §3.2 web row — on web it always attempts the endpoint and relies on call-failure handling, never on an offline gate.
- **CON-W-05 — No new machinery.** No new dependencies, storage keys, routes, or API contract changes. Enforcement reuses `Platform.OS` branches and existing settings/plumbing.

## 3. Goal & Acceptance Criteria

### 3.1 Decisions (closed at FINAL)

- **DEC-W1 — Pin hardness: A (hard pin).** Skip probe on web, never render Offline UI. Rationale: fewer branches; call-failure handling already covers drops.
- **DEC-W2 — Pre-existing web Local accounts: C (force Make Online).** One-time migration at next login. Rationale: grandfathering serves untrusted reads; blocking destroys device-only data.
- **DEC-W3 — WITHDRAWN.** Pre-existing Cloud-OFF handling belonged to the `autoBackup` dimension, which is out of this spec (see History).

### 3.2 Interaction matrix (normative)

| Web state | Effective behavior |
|---|---|
| Any session, any network | Connection reads Online; no Offline UI ever |
| Register / login "create offline" paths | Absent on web (already true) |
| Pre-existing Local login on web | Forced Make Online migration, then online-only |
| Web mutation, any flag value | Issued to the API; flag ignored; unreachable API fails openly, zero local writes |
| Authenticated credential-change call on web | Always attempts the endpoint; 401/failure handling per that feature's spec, never an offline-gated copy for connectivity reasons |

### 3.3 Platform matrix (per AGENTS.md §1.10)

| Platform | Objective (machine-checkable) | Subjective (reviewer-observed) |
|---|---|---|
| Web | `ACC-W-01`..`04` under `Platform.OS = web` mock: status pinned Online with probe stubbed to throw, no Local creation path, force-migrate on legacy login, API-direct writes regardless of flag | Reviewer loads web build: no offline banner ever, no Offline-mode buttons, no local-only persistence path, export still offered |
| Android | `ACC-W-05`: behavior byte-identical (all existing SPEC-04 native tests re-run green) | Reviewer in Expo Go confirms zero web-only UI leaking onto native |
| iOS | Same as Android | Same as Android |

### 3.4 Acceptance criteria

- **ACC-W-01 (pinned Online):** with `Platform.OS = web`, status selector returns Online with the probe module stubbed to throw — Offline UI components receive no Offline state.
- **ACC-W-02 (never Local + force-migrate):** web register/login sources contain no reachable Local-creation call (source-text guard); a legacy web Local login routes into Make Online migration before normal use.
- **ACC-W-03 (full API-direct):** web mutations issue the API call regardless of the stored `autoBackup` value with zero localStorage writes; web screens load from the API with zero AsyncStorage reads of user data on web (lists, profile, settings, flags); session-identity reads allowed but verified-or-logged-out; unreachable API yields open failure with zero local writes.
- **ACC-W-04 (caller conformance):** credential-change callers on web issue the endpoint call (never an offline-gated copy for connectivity reasons); call-failure paths per the caller's own spec unchanged.
- **ACC-W-05 (native regression):** full existing jest suite green with no web-branch leakage; `npm run lint` 0/0 (user-run).
- **ACC-W-06 (subjective):** reviewer on web export + Expo Go native confirms §3.3 right column.

## 4. Deliverables (one file / one layer at a time; stop after each for review)

- **D-W-01 (connection pin):** hard web branch per `DEC-W1` (`NetworkContext` probe skip + status selector + `OfflineIndicator`/settings/login gates).
- **D-W-02 (mode gate + force-migrate):** web Local handling per `DEC-W2` (creation paths already absent — verify + guard with tests; legacy-login migration trigger).
- **D-W-03 (full API-direct, re-sliced):** web read AND mutation paths per CON-W-03 (reads from API, zero AsyncStorage reads/writes on web, flag ignored, fail-open) — file list per the re-slice scan + `ACC-W-03` coverage.
- **D-W-04 (caller conformance):** web-row behavior of credential-change callers proven by `ACC-W-04`.
- **D-W-05 (tests):** jest `Platform.OS`-parameterized web cases + native regression re-run; user-run web-export + Expo Go matrix.
- **D-W-06 (docs):** `docs/savepoint.md` + `AGENTS.md §3` entries.

## 5. Glossary

- **Pinned:** hardcoded by platform branch, not sampled — web connection is asserted Online, never probed-into-Offline.
- **Hard pin:** the probe is skipped on web (not run-and-discarded); no Offline UI can render.
- **Force-migrate:** a legacy Local account is routed into Make Online at next login — one-time local→API migration, then online-only.
- **API-direct:** web persistence issued straight to the API with no local store in the path.
- **Fail-open:** an unreachable API surfaces the failure at the call (gated copy / error), never stored locally, never a status.
- **False positive (localStorage read):** serving clearable/stale/partial local data as if it were truth.

## 6. References

- `specs/04-connection-status-vs-offline-mode.md` (FINAL incl. v1.4 — amended on web only per §2)
- PIN-change dialog (external: `spec-change-pin` worktree SPEC-35 — informative only, not normative here)
- `context/NetworkContext.tsx` (probe + status), `app/_layout.tsx` (`OfflineIndicator`), `utils/authMode.ts` (`isLocalAccountToken`)
- `app/register.tsx` + `app/login.tsx` (mode availability, legacy local paths), `app/(tabs)/settings.tsx` (Make Online flow, sync UI)
- Plan run file `20261004-0000-spec36-web-passcode.md` (scope correction + web-model decision record)
- `docs/savepoint.md`, `.agents/rules/wisewallet.md` (journal + status protocol)

## 7. v1.3 Amendment — Web add reconciles server-minted IDs (FINAL v1.3 per user call 2026-10-07: "confirm same session, OD W4 a ... final, code this for me")

### 7.1 Diagnosis (read-only evidence, 2026-10-07)

- `context/TransactionsContext.tsx:173-184` — web add POSTs to the API, then appends the client-built object (`uploaded`, carrying the client-minted UUID) to state. The response `data` is ignored and no re-GET follows. Native online add (`:192-201`) calls `refreshFromApi()` after POST, so native state carries server IDs and native edit/delete work.
- In-file comment `:56-59` (SPEC-43 follow-up, HAR-proven): the server mints ids on create — client UUIDs never reconcile.
- Consequence: web PUT/DELETE to `transactions/<client-uuid>` hit a row the server never stored → server 404 `"Transaction not found or you do not have permission to modify it"` — verbatim the pasted update error (`:229-235`). Delete masks any server message as `"Failed to delete transaction. Please check your connection."` (`:271-274`, `:280-283`), so the same 404 presents as a connectivity complaint.
- Self-healing boundary: the web GET (`fetchTransactions` `:120-129`) replaces state with server rows, so rows loaded from the server (older rows, post-reload rows) carry server IDs and edit/delete fine. Only rows added in the same session before any refetch are affected. **Needs user confirmation (see report).**

### 7.2 Decisions (OPEN — user to call)

- **OD-W4 (CALLED a per user 2026-10-07).** After web POST success, re-GET `transactions?userId=<id>` and replace state — web-safe repull (categories resolved from context state per SPEC-46 v1.1 web read; zero AsyncStorage/catRepo/mirror touches, no loading flash). Mirrors the native repull without importing its local-store steps. Option (b) rejected by call.
- **OD-W5 (DEFERRED — still open).** No letter given at FINAL mark, so status-quo (b) holds by default per bare-minimum: delete copy unchanged, zero code change. May be called in a later amendment.

### 7.3 Constraints

- **CON-W-06 — Web repull stays API-direct.** The repull MUST NOT read/write AsyncStorage, MUST NOT call `catRepo`, MUST NOT touch the mirror/queue, and MUST ignore `autoBackup` (CON-W-03). Categories resolve from context state (SPEC-46 v1.1). Native branches MUST stay byte-identical. No dependency, contract, storage-key, or route change.

### 7.4 Goal

- **DEC-W4 (FINAL v1.3, OD-W4 a).** Web add: POST ok → re-GET `transactions?userId=<id>` → state replaced with server rows (context categories, zero local writes); repull failure/unavailable falls back to the pre-v1.3 optimistic append (no worse than before). POST !ok → existing open-failure copy unchanged.
- **DEC-W5 (DEFERRED with OD-W5).** Delete copy byte-identical (no change).

| Web state | Behavior |
|---|---|
| Add, POST ok | New row immediately editable/deletable in the same session (server ID in state) |
| Add, POST !ok | Existing open-failure copy, zero local writes (unchanged) |
| Edit/Delete a same-session-added row | Succeeds (row addressable by its server ID) |
| Edit/Delete a server-loaded row | Unchanged (already works) |

Objective (jest, `Platform.OS` = android/ios/web):

| ID | Check |
|---|---|
| ACC-W-07 | Web add issues a GET after POST success and sets state from its rows (fallback append retained); zero `txRepo`/`setItem`/`catRepo.getAll` added to the web add path; delete copy byte-identical (OD-W5 deferred) |
| ACC-W-08 | `npm test` 0 failed; `npm run lint` clean; `npx tsc --noEmit` clean (user-run per §1.3) |

Subjective (reviewer-observed, web export):

- **ACC-W-09:** Reviewer on web: add → edit → delete one transaction in a single session with no errors; reload shows identical rows.

### 7.5 Deliverables

- **D-W-07 (`context/TransactionsContext.tsx`):** web-add reconcile per DEC-W4 (+ delete copy per DEC-W5). Nothing else in the file.
- **D-W-08 (tests):** source guards × android/ios/web (behavior via pure helper if one is factored, else guards-only deviation disclosed per precedent).
- **D-W-09 (journal):** `docs/savepoint.md` + `AGENTS.md` §3 entry.

## 8. v1.4 Amendment — Delete validation feedback: success toast + in-app failure (FINAL v1.4 per user call 2026-10-07: "OD-W6 a, OD-W7 a ... FINAL, code this for me"; F5 result recorded: new rows OK, old rows still fail — old-row root cause open, surfaced message will identify it)

### 8.1 Context (read-only evidence, 2026-10-07)

- Delete still throws at `context/TransactionsContext.tsx:283` (generic copy) from `app/transaction-details.tsx:50` `handleDelete`. Expected for rows whose state still carries client-minted UUIDs: (i) rows added before the v1.3 bundle loaded — in-memory web state survives Fast Refresh, so the fix only governs adds made after the new bundle runs (full F5 reload heals by re-GETting server rows); (ii) opening-balance rows posted via onboarding before the fix. **Pending user confirmation: full-reload done? which row fails (newly added vs old/opening-balance)?**
- The confirm step already exists (`transaction-details.tsx:183-190` `ConfirmDialog` "Delete Transaction?" → Delete/Cancel). What is missing per the request ("dapat may successful na validations then confirm"): success validation feedback (today: silent back-nav) and in-app failure feedback (`handleDelete` `:48-54` has no try/catch, so any throw becomes a red box instead of a message).
- Precedent: `app/add-allocation.tsx` uses `useToast().showToast()` for in-app error feedback; `ToastProvider` is mounted at root (`app/_layout.tsx:358`).

### 8.2 Decisions (CALLED — FINAL v1.4)

- **OD-W6 (feedback shape).** (a) Recommended: success → `showToast("Transaction deleted successfully.")` then `safeGoBack`; failure → `showToast(<resolved message>)`, dialog closes, user stays on the details screen (no navigation, no red box). (b) User-supplied copy/flow.
- **OD-W7 (resolve deferred OD-W5 now?).** (a) Recommended: delete prefers the server message when present (`status !== 0 && error ? error : <generic>` — the pattern add/update already use), so a real 404/403 reads as not-found/permission instead of a connectivity complaint. Completes §7. (b) Keep the generic copy.

### 8.3 Constraints

- **CON-W-07 — Bare-minimum + shared screen.** Only `D-*` files MAY change. The details screen is shared cross-platform, so the toast UX applies identically on Android + iOS + Web (stated in the matrix, not branched). Confirm-dialog copy/UX unchanged; SPEC-32 scheduled-delete lock unchanged. No dependency, contract, storage-key, or route change.

### 8.4 Goal

- **DEC-W6 (pending OD-W6).** `handleDelete` gains try/catch: success → toast + back; failure → error toast + stay.
- **DEC-W7 (pending OD-W7).** Context delete copy prefers the server message iff (a); byte-identical iff (b).

| State | Behavior |
|---|---|
| Confirm Delete, API ok | Success toast, then back to previous screen |
| Confirm Delete, API !ok (404/403/offline) | Error toast with the resolved message; dialog closed; stays on details; no red box |
| Scheduled-due transaction | No delete affordance at all (unchanged SPEC-32 lock) |

Objective (jest, `Platform.OS` = android/ios/web):

| ID | Check |
|---|---|
| ACC-W-10 | `handleDelete` wraps `deleteTransaction` in try/catch; success path toasts + navigates back; failure path toasts and does not navigate; confirm-dialog wiring intact; delete copy prefers server message iff OD-W7 (a) |
| ACC-W-11 | `npm test` 0 failed; `npm run lint` clean; `npx tsc --noEmit` clean (user-run per §1.3) |

Subjective (reviewer-observed, web export + Expo Go):

- **ACC-W-12:** Reviewer deletes a transaction: confirm → success toast → back. Reviewer deletes with API failing (e.g. stale pre-fix row): error toast, stays on screen, zero red box.

### 8.5 Deliverables

- **D-W-10 (`app/transaction-details.tsx` + `context/TransactionsContext.tsx` delete copy iff OD-W7 a):** toast wiring per DEC-W6/W7. Nothing else in either file.
- **D-W-11 (tests):** source guards × android/ios/web (try/catch + toast + back-on-success-only + no-navigation-on-failure).
- **D-W-12 (journal):** `docs/savepoint.md` + `AGENTS.md` §3 entry.

## 9. v1.5 Amendment — 204-as-success + edit-save feedback parity (FINAL v1.5 per user call 2026-10-07: "OD-W8 a, OD-W9 a ... FINAL, code this for me"; failing-row title not supplied — OD-W10 stays open, no code)

### 9.1 Diagnosis (read-only evidence + user-pasted logs, 2026-10-07)

- **DELETE 204 misread (deterministic client bug).** Pasted log: `Error deleting transaction: [Error: HTTP 204 (empty body)]` at `TransactionsContext.tsx:283`. The server answers DELETE with **204 + empty body** = success. But `utils/apiClient.ts:99-109` parses every body with `response.json()`; on empty body it returns `{ok: false, ...}` regardless of status — so a successful delete throws, the error toast shows, and the row stays in state (a reload proves it is gone server-side). Same `authFetch` serves native, so native delete misreads 204 identically. No `204` case exists in `apiClient.test.ts` (grep: zero hits).
- **Old-row PUT 404 (identity still open).** Pasted log: `Transaction not found or you do not have permission...` at `:244` via `edit-transaction.tsx:151` `handleSave`. v1.3 explains same-session rows; the failing row here is an *old* row (post-F5, server-loaded state). Candidates: a pre-fix ghost never stored server-side, or a server-protected row (e.g. opening-balance). **Pending user datum: the failing row's title.**
- **Edit-save feedback gap.** `app/edit-transaction.tsx:150-166` already catches (in-app `Alert`, no red box) but masks the server message with a generic copy and navigates back silently on success — the same two gaps §8 closed for delete.

### 9.2 Decisions (CALLED — FINAL v1.5: OD-W8 a, OD-W9 a)

- **OD-W8 (204 shape).** (a) Recommended: in `authFetch`, when `response.ok` is true and the body is empty/unparseable, return `{ok: true, status}` (data `undefined`) — one spot, all callers (web + native) fixed; 401 path, envelope unwrap, and non-2xx handling byte-identical. (b) Special-case 204 in the delete paths only.
- **OD-W9 (edit-save parity).** (a) Recommended: `handleSave` success → `showToast("Transaction updated successfully.")` then back; failure → `Alert` shows the resolved server message (context update already prefers it since §7-adjacent code uses the same pattern — verify at implementation; if not, include the one-line change). (b) Skip — leave edit screen as is.
- **OD-W10 (old-row 404).** No code until the row is identified — answer pending (title of the failing row). Tracked here so the follow-up lands in this home, not a new number.

### 9.3 Constraints

- **CON-W-08 — Shared client, stated cross-platform.** `authFetch` serves web + native identically; the 204 branch MUST NOT alter the 401/session-kill path (SPEC-44), the envelope unwrap (SPEC-40), or any non-2xx result. No dependency, contract, storage-key, or route change.

### 9.4 Goal

- **DEC-W8 (pending OD-W8).** Empty-body + `response.ok` → ok:true (a); or delete-path 204 special-case (b).
- **DEC-W9 (pending OD-W9).** Edit-save toast wiring iff (a).

| State | Behavior |
|---|---|
| DELETE → 204 empty | Success path: row removed from state, success toast, back (no error anywhere) |
| Any empty-body 2xx (iff a) | `ok: true` with `data: undefined` |
| Empty-body 4xx/5xx | Still `ok: false` with `HTTP {status} (empty body)` (unchanged) |
| Edit save ok (iff OD-W9 a) | Success toast, then back |
| Edit save !ok (iff OD-W9 a) | Alert with the resolved server message; stays; no red box |

Objective (jest, `Platform.OS` = android/ios/web):

| ID | Check |
|---|---|
| ACC-W-13 | `authFetch` unit cases (mocked fetch): 204-empty → `{ok: true, status: 204}`; 404-empty → `{ok: false}`; JSON envelope + 401 paths unchanged (existing suite green) |
| ACC-W-14 | `npm test` 0 failed; `npm run lint` clean; `npx tsc --noEmit` clean (user-run per §1.3) |

Subjective (reviewer-observed, web export + Expo Go):

- **ACC-W-15:** Reviewer deletes any transaction: success toast, row gone, still gone after reload, zero error. Reviewer edits with API failing: resolved message shown, no red box (iff OD-W9 a).

### 9.5 Deliverables

- **D-W-13 (`utils/apiClient.ts`):** 204 branch per DEC-W8. Nothing else in the file.
- **D-W-14 (`app/edit-transaction.tsx` + update copy iff needed):** toast wiring per DEC-W9 iff OD-W9 (a); skipped entirely iff (b).
- **D-W-15 (tests):** `apiClient.test.ts` 204/404-empty cases + source guards × android/ios/web.
- **D-W-16 (journal):** `docs/savepoint.md` + `AGENTS.md` §3 entry.
