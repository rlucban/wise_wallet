# SPEC-45 — API Source of Truth + Local-Backup Toggle

| Field     | Value                                                        |
|-----------|--------------------------------------------------------------|
| ID        | SPEC-45                                                      |
| Title     | API source of truth; `autoBackup` reframed as Online-only `local backup` |
| Status    | **FINAL** (marked by user 2026-10-06; implementable per AGENTS §1.1) |
| Owner     | TBD (user)                                                   |
| Version   | v1.0 (FINAL; content unchanged from v0.1 except status + D-00) |
| Scope     | Source-of-truth model (truth table below, all rows) + transactions-layer implementation (`context/TransactionsContext.tsx`, transaction balance sums, mirror reads/writes for transactions) + tests under `utils/` + journal |
| Non-goals | Dues/savings/categories/profile behavior change (follow-up specs reference this one, never re-norm it); `syncQueue`/`syncProcessor` file deletion (stays for other entities until their specs land); server/API contract change (out of tree); routes; dependencies; web behavior change (byte-identical); local-account path change (byte-identical) |

## Terminology

RFC 2119 keywords: MUST, MUST NOT, SHOULD, MAY. "SSOT" = single source of truth. "Mirror" = the AsyncStorage copy of API records on mobile, written only from successful API responses, never merged. "Local backup" = the reframed `autoBackup` concept (copy/labels only in this spec; storage-key rename, if ever, is a separate spec). "Replace-don't-merge" = online fetch replaces UI state + mirror wholesale with the API response; no LWW, no fingerprint, no twin. "No-op" = offline attempt fails openly with an error and changes nothing.

## Context

### Problem

On Expo Go native, every tab navigation adds +1 row to Recent Activity and Settings → Data Management shows `N pending` climbing in real time. Web is unaffected (API-direct per SPEC-36).

### Evidence (verified read-only, static)

- `context/TransactionsContext.tsx:136-206` — native `fetchTransactions` treats local as truth: `getAll` → show local → fetch remote → id-merge → `isSameRecord` twin (`:77-87`, date+amount+type+note only) → miss (ms-truncation `337Z` vs `000Z`, or `note ""` vs `null`) → `enqueueAndTrigger('create')` + keep local in `merged` → `upsertBulk` saves → `processSyncQueue` POSTs → server mints a new id → +1 row per sync. Fired by `app/(tabs)/index.tsx:67-76` `useFocusEffect` on every tab focus.
- `repositories/base.storage.ts:40-53` — `upsertBulk` re-stamps `updatedAt = nowTimestamp()` on every saved row including just-fetched remotes, so every cached server row looks locally-newer next fetch → spurious `update` enqueues via `isSameContent` (`TransactionsContext:89-99`, sanitized-local `""`/`uncategorized` vs raw-remote `undefined`).
- `utils/syncQueue.ts:52-82`, `utils/syncProcessor.ts:151-178` — queue persists intent, processor drains; `hooks/useSyncStatus.ts:93-96` `pending = total - failed` is what the banner shows (`app/(tabs)/settings.tsx:35,78`).
- `docs/todo-specs.md` T-05 — HAR-proved 5 identical ₱9,999 rows, same payload instant, `createdAt` ~15s apart = queue replay, not taps; server mints ids and drops `title`/`category` (`categoryId: null`), so all balance sums filtering `t.title !== "Opening Balance"` count them as income (phantom ₱49,995).
- SPEC-43 scoped the merge path out (write-site guard only); SPEC-40's envelope unwrap re-enabled the previously-dead merge (empty reads → populated reads).

### User decisions (truth table, agreed 2026-10-06 session)

Online always calls the API. On mobile only, `local backup=true` ALSO stores the result in AsyncStorage; `false` leaves nothing locally. Local accounts are AsyncStorage-only with the toggle N/A. Web is always Online, toggle N/A, API as-is. Online + offline = hard-error no-ops (no offline transactions, no later sync). Mirror refreshes by background full-copy replace, versioned by timestamp.

## Constraints

- **CON-01 — Bare-minimum diff (§1.11).** Only the files named in D-* MAY change. No refactoring, no drive-by cleanups, no new helpers/files unless a D-* names them.
- **CON-02 — No new dependencies (§1.12).** No npm packages, native modules, or third-party code. Existing imports + stdlib only.
- **CON-03 — Web byte-identical.** Every `Platform.OS === "web"` branch stays character-identical (SPEC-36 CON-W-03). No web behavior, copy, or storage change.
- **CON-04 — Local path byte-identical.** Every `isLocal` branch (token `offline_token`/`local_token`, `utils/authMode.ts` untouched) stays character-identical (SPEC-04). Local remains AsyncStorage-only, zero API calls.
- **CON-05 — Cross-platform invariant (§1.5).** Android + iOS + Web keep working. No native-only static imports at top level; no Node-only APIs in app code.
- **CON-06 — Vercel-deployable (§1.6) / Expo Go safe (§1.7).** Web export clean; nothing may crash Expo Go on import; unavailable features degrade with in-app fallback, never a red-box.
- **CON-07 — No contract change (§1.4) except as listed.** Storage keys (`user_{id}_*`, `sync_queue`, `last_synced_at`), API contract (`wallet-api`), AsyncStorage shapes, navigation routes, native dependencies stay compatible. The breaking behavior flip (online-mobile source of truth) is authorized ONLY by this spec on FINAL mark, with migration + rollback in D-06.
- **CON-08 — TDD with cross-platform coverage (§1.10).** `jest` parameterized by `Platform.OS` (`android`/`ios`/`web` via mock, per repo precedent for code jest cannot render: `utils/onboardingGuard.test.ts`, `utils/webPin.test.ts`) for checkable branches, plus user-run Expo Go + `expo export --platform web` manual matrix. No platform-only behavior without a `CON-*` + `ACC-*` + `D-*`.
- **CON-09 — One home (§1.14).** This file norms the model once. SPEC-04 (sync-vs-auth), SPEC-36 (web API-direct), T-05 (loop evidence home) are cross-referenced, never duplicated or re-normed. Follow-up entity specs reference this file's DEC-* by ID.

## Goal

- **DEC-01 — SSOT flip (online-mobile, transactions).** For Online accounts on native, the API is the source of truth for transactions. Fetch = `GET` → replace UI state → replace mirror wholesale (replace-don't-merge). No id-merge, no fingerprint/twin, no `isSameContent` compare, no fetch-time `enqueueAndTrigger`, no `processSyncQueue()` call from the transactions fetch path.
- **DEC-02 — Write-through (transactions).** Online-mobile writes = API `POST`/`PUT`/`DELETE` first; on `ok`, background re-pull (`GET`) replaces UI state + mirror; on failure (incl. offline/NetworkError), hard-error no-op: error surfaced, nothing written locally, nothing enqueued. No queue usage from transactions online paths.
- **DEC-03 — Mirror rule.** Mirror key(s) unchanged (`user_{id}_transactions` via existing `getPrefixedKey`). Mirror holds the last successful API response verbatim (server `updatedAt` preserved as-is; MUST NOT re-stamp `now`). One mirror-level `lastSyncedAt` marker (existing `syncQueue.ts` key, written directly — no queue involvement). Toggle ON populates mirror via immediate `GET`; toggle OFF clears the mirror key. Reads never merge; offline never falls back to the mirror (hard error even when a mirror exists, per user call).
- **DEC-04 — `local backup` reframe (copy only).** User-facing copy `Auto-Backup` → `Local backup`; OFF banner copy `Sync off` → `No local backup`. Toggle visible/enabled for Online on mobile only; hidden (N/A) for Local accounts and on web. Storage key name `autoBackup` and profile field name UNCHANGED in this spec (rename, if ever, is a separate spec).
- **DEC-05 — Opening-marker balance sums.** All transaction balance computations (dashboard `SummaryCard`, `add-transaction` guard, `dues recordTransaction` guard, `TransactionsContext` negative-balance eval) MUST NOT match on `title` alone (server drops it). They MUST match the surviving marker: `note === "Initial account setup"` OR category id `b0eebc99-9c0b-4ef8-bb6d-6bb9bd380b19` (the `OPENING_BALANCE_CATEGORY_ID` from `utils/onboardingPayload.ts`). A user income legitimately titled similarly MUST still count.
- **DEC-06 — Migration before removal (order matters).** (a) Upload-once: pre-existing local-only transaction rows absent remotely (tolerant match: amount+type+day, note-normalized) POST once each; (b) Heal: delete duplicate server rows keeping the oldest `createdAt` (requires user Export backup first — destructive, irreversible); (c) Drain/discard `sync_queue` transaction items only. Steps run in this order; the loop code (D-01) lands only after (a)–(c) complete, or mobile re-creates what was healed. Rollback = revert the named files; orphaned mirror content is inert; server deletes are NOT reversible (warned in-dialog).
- **DEC-07 — Deferred entities.** Dues/savings/categories/profile keep current behavior byte-identical. Their specs reference DEC-01..DEC-06 by ID and implement the same pattern per entity. `syncQueue.ts`/`syncProcessor.ts`/`NetworkContext` back-online trigger stay until the last entity spec lands.

### Interaction matrix (normative)

| # | Account | Platform | Network | Local backup | Reads | Writes | Stored locally? | Banner / switch |
|---|---|---|---|---|---|---|---|---|
| 1 | Local | mobile | — | N/A, hidden | AsyncStorage only, zero API | AsyncStorage only | Yes (the store) | "Local-only" |
| 3 | Online | mobile | online | ON | API → background full-copy mirror + timestamp | API → success → background re-pull | Yes | "All synced" (pending 0) |
| 4 | Online | mobile | online | OFF | API only | API only | No | "No local backup", switch OFF |
| 5 | Online | mobile | offline | (mirror exists) | Hard error, mirror NOT shown | No-op, blocked | Mirror as-is | Error |
| 6 | Online | mobile | offline | (no mirror) | Hard error | No-op, blocked | No | Error |
| 7 | Online | web | online | N/A | API as-is | API as-is | No | idle |
| 8 | Online | web | offline | N/A | Fail openly | Fail openly | No | Error |

(Row 2 web-local deleted: impossible per SPEC-04 v1.4 + SPEC-36 DEC-W2. Local → Make Online promotion unchanged and permanent per SPEC-04.)

### Acceptance

Objective (machine-checkable via `jest`, `Platform.OS` = android/ios/web):

| ID | Android | iOS | Web | Check |
|----|---------|-----|-----|-------|
| ACC-01 | ✅ | ✅ | ✅ | `fetchTransactions` contains zero `enqueueAndTrigger`/`processSyncQueue` calls on any path reachable for Online (source-text guard, per precedent) |
| ACC-02 | ✅ | ✅ | ✅ | `Platform.OS === "web"` branches in `TransactionsContext.tsx` byte-identical to pre-spec (diff-empty guard or explicit string assert) |
| ACC-03 | ✅ | ✅ | ✅ | `isLocal` branches byte-identical; `utils/authMode.ts` untouched |
| ACC-04 | ✅ | ✅ | ✅ | All 4 balance sums match the DEC-05 marker and none match on `title` alone (source-text guards) |
| ACC-05 | ✅ | ✅ | ✅ | Mirror write path never assigns `updatedAt = nowTimestamp()` to API-sourced rows (source-text guard on the online path; `base.storage.ts` untouched) |
| ACC-06 | ✅ | ✅ | ✅ | `npm test` 0 failed; `npm run lint` 0 errors/0 warnings; `npx tsc --noEmit` 0 errors (user-run per §1.3) |

Subjective (reviewer-observed, Expo Go + web export):

- **ACC-S01:** Expo Go native, Online, ON: 3× tab switches (Home→Reports→Home→Settings→Home) → Recent Activity count unchanged, balance unchanged, Settings shows "All synced", pending 0 throughout.
- **ACC-S02:** Toggle OFF → mirror key cleared, banner "No local backup"; toggle ON → mirror repopulated from API; counts/balance identical before/after (mirror is invisible).
- **ACC-S03:** Airplane mode → any transaction read/write shows the hard-error copy, changes nothing; previously-mirrored rows are NOT shown; reconnect → next action succeeds (no auto-flush pestering, no backlog).
- **ACC-S04:** Web regression: dashboard/lists populate from API, no local writes, `expo export --platform web` clean; Local-account Expo Go path unchanged.

## Deliverables

- **D-00:** FINAL marked by the user 2026-10-06.
- **D-01:** `context/TransactionsContext.tsx` — Online paths API-first per DEC-01/DEC-02/DEC-03 (fetch replace + background mirror; writes API-then-repull; offline hard-error no-op). Web + Local branches byte-identical. Nothing else in the file touched.
- **D-02:** Balance sums → DEC-05 marker: `components/SummaryCard.tsx`, `app/add-transaction.tsx`, `app/dues.tsx` (`recordTransaction` guard), `context/TransactionsContext.tsx` (negative-balance eval) + `context/SystemAlertsContext.tsx` only if it duplicates the filter (verify first; if absent, untouched and noted).
- **D-03:** Copy: `app/(tabs)/settings.tsx` — `Auto-Backup` → `Local backup` labels, `Sync off` → `No local backup`, toggle visibility (Online-mobile enabled; Local hidden; web disabled), ON-populate/OFF-clear wiring, error copy. No handler-logic change beyond mirror populate/clear.
- **D-04:** Migration + heal runbook implementation for transactions only, per DEC-06 order (upload-once → heal-duplicates with pre-export warning → discard queued transaction items). Exact file list fixed at implementation time under `/implement-fix` slice validation; no out-of-scope paths.
- **D-05:** Tests under `utils/` — ACC-01..ACC-05 across `android`/`ios`/`web` (source-text guards + any pure asserts, following `utils/onboardingGuard.test.ts` precedent; app `tsc` exclusion respected per SPEC-07).
- **D-06:** Docs: `docs/savepoint.md` + `AGENTS.md` §3 `Current status` entry per §1.8 (migration executed? backlog discarded? counts before/after heal). Rollback note: revert D-01..D-04 files; orphaned mirror inert; server deletes irreversible.

## Glossary

- **SSOT:** single source of truth — for Online transactions, the API.
- **Mirror:** last successful API response stored in AsyncStorage (mobile, ON only); never merged, never read offline.
- **Local backup:** reframed `autoBackup`; Online-only, mobile-only toggle.
- **Replace-don't-merge:** fetch replaces state + mirror wholesale; the twin/fingerprint era ends for Online.
- **No-op:** failed attempt changes nothing and enqueues nothing.
- **Cloud-OFF (retired):** old JWT + `autoBackup=false` sync-off state; superseded by rows 4/6 (API-only).

## References

- `context/TransactionsContext.tsx:77-99,136-206,229-335` · `repositories/base.storage.ts:40-53` · `utils/syncQueue.ts` · `utils/syncProcessor.ts:151-178` · `hooks/useSyncStatus.ts:93-96` · `app/(tabs)/index.tsx:67-76` · `app/(tabs)/settings.tsx:25-100,247,1192` · `components/SummaryCard.tsx:19-27` · `utils/authMode.ts` · `utils/onboardingPayload.ts:3` (`OPENING_BALANCE_CATEGORY_ID`)
- `specs/04-connection-status-vs-offline-mode.md` (sync-vs-auth split; promotion) · `specs/36-web-platform-invariants.md` (web API-direct, flag meaningless on web) · `specs/40-authfetch-envelope-unwrap.md` (merge re-enabled) · `specs/43-onboarding-opening-balance-once-only.md` (write-site guard; merge out of scope) · `docs/todo-specs.md` T-05 (loop evidence home; HAR proof)
- Plan-fix run: (to be recorded on `/plan-fix` invocation per §1.13)
