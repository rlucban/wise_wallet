# Spec 34: API-Only Online Mode (AsyncStorage Persists Mobile-Local and Mobile-OFF Only)

| Field | Value |
|---|---|
| ID | SPEC-34 |
| Title | Cloud+ON reads/writes genuinely API-only; AsyncStorage persists only mobile-Local and mobile-OFF |
| Status | **FINAL** (2026-09-30 per user call) |
| Owner | User (final authority) |
| Version | 1.0 — FINAL: v0.2 draft approved as-is; implement exactly this |
| Scope | Data plane per account-mode × platform (contexts, repositories bypass, queue bypass, offline gate, purge/seed, export/import, status UI) |
| Non-goals | Auth/session flows (SPEC-31 stands); server changes; per-device prefs split; conflict UI beyond stated notices |
| Normative source | This file, once marked FINAL. `AGENTS.md §4` is a pointer only. File+symbol cites are normative; `:line` numbers are hints only. |

## Terminology (RFC 2119)

The keywords **MUST**, **MUST NOT**, **SHOULD**, and **MAY** in this spec are
to be interpreted as described in RFC 2119. Informative prose (examples,
"today", "observed") is non-normative unless restated as a requirement.

## 1. Context

### 1.1 User decisions (2026-09-30)

- **API-only scope:** any Cloud account with `autoBackup = ON`, on every
  platform, persists NOTHING to AsyncStorage — reads/writes go genuinely to
  the API alone (memory-only state). AsyncStorage persists ONLY (a) mobile
  Local accounts and (b) mobile Cloud accounts with `autoBackup = OFF`.
  Web never persists anything (extends SPEC-31 never-local).
- **Offline:** API-only mode with no connection shows a persistent banner
  ("You're offline… Turn auto-backup OFF to keep using the app with on-device
  data") above gated content; one tap switches OFF with no fetch.
- **Entering API-only:** fetch-then-push migration — verified `GET`, then POST
  local entries / PUT profile (local wins ties), then purge the local cache.
  Nothing is ever discarded before it is uploaded. Any step failing aborts
  with no purge and no mode change.
- **Turning ON explains itself:** the online OFF→ON toggle shows what will
  happen (fetch cloud first, then push this device's data) before proceeding.
- **`autoBackup` semantics:** the toggle is sync-only. On mobile, OFF also
  means "persist to AsyncStorage"; ON means live API. (Web: the toggle
  controls refresh cadence only — ON refreshes on foreground/focus plus
  write-through, OFF fetches on login/focus/manual only; persistence is none
  either way, writes always direct-through.)

### 1.2 What changes (non-normative)

Today every mode is offline-first (local repo → display → GET → LWW-merge →
persist). After this spec, Cloud+ON bypasses the repositories and the sync
queue entirely; SPEC-27/29 machinery remains normative ONLY for mobile-Local
and mobile-OFF paths. SPEC-33 (profile convergence draft, never FINAL) is
absorbed: its response-shape normalizer survives as API-response handling for
API-only reads, the rest is superseded by this file.

## 2. Constraints (normative once FINAL)

- **CON-01 — Mode matrix.** The data plane is a pure function of
  `{ platform, isLocal, autoBackup }`:

  | Platform | Account | autoBackup | Persistence | Data plane |
  |---|---|---|---|---|
  | mobile | Local | false (forced) | AsyncStorage | Local only, zero API (unchanged) |
  | mobile | Cloud | OFF | AsyncStorage | Local-first isolated log, queue paused, zero transaction calls (SPEC-27 CON-11 unchanged) |
  | mobile | Cloud | ON | NONE (memory) | Direct API reads/writes; repos + queue bypassed |
  | web | Cloud | ON or OFF | NONE (memory) | Direct API; OFF refreshes on login/focus/manual only |

- **CON-02 — API-only read/write + registration rules.** In API-only mode
  every entity (transactions, categories, dues, savings, profile) MUST be read
  from the API into memory state and written straight through to the API. No
  `user_{id}_*` keys for entity data may be created, updated, or read; the
  sync queue MUST NOT be enqueued to (failures surface as errors with retry,
  never silent outbox). Receipt capture MAY stage a temp file for upload but
  MUST NOT treat it as source of truth. Registration/login specifics:
  (a) Online register/login MUST skip `saveUserProfile(newId)`, `initDb(newId)`,
  and `setSetting` entity writes on all platforms; (b) the `master_users`
  registry row is KEPT (native OFF-mode PIN lookup and delete ghost-matching
  depend on it — it is registry, not entity cache); (c) profile writes MUST
  ensure-exists first (`GET` → `POST` if missing → else `PUT`), never blind
  PUT; (d) category pickers MUST fall back in-memory to the
  `GLOBAL_CATEGORIES` constant when the API returns none. Offline (Local)
  registration is byte-identical to today (SPEC-30 CON-01/CON-02 and the
  username-fallback confirm stand).
- **CON-03 — Offline banner + gate.** API-only mode with no device
  connectivity MUST show a persistent banner — "You're offline. Cloud data is
  unavailable — turn auto-backup OFF to keep using the app with on-device
  data." — with a [Turn OFF] action, above gated content (no data shown). The
  banner/gate MUST lift automatically when connectivity returns (then fetch
  fresh) without changing mode. Tapping [Turn OFF] switches to OFF mode with
  NO fetch: any existing local cache seeds the log, else it starts empty;
  nothing is purged, nothing is uploaded. No banner/gate on Local/OFF-mobile
  paths (unchanged).
- **CON-04 — Fetch-then-push migration on entering API-only.** Login with
  Cloud+ON, toggle OFF→ON (after the CON-05 dialog), or first run after
  upgrade with a pre-existing cache MUST run, strictly in order: (1) `GET`
  the server snapshot and require `ok` (drain the user's outbox first where
  one exists); (2) POST local entries missing server-side, then PUT the local
  profile — local wins ties (push runs after fetch); (3) hold the reconciled
  state in memory; (4) only then delete that user's `user_{id}_*` entity keys
  and its queue items. `master_users` rows, `localDeviceId`, other users'
  data, and export files MUST be preserved. ANY step failing aborts with NO
  purge and NO mode change (plus a notice). Fresh identities (register /
  re-register) run the same code path and trivially converge (nothing local).
- **CON-05 — ON-toggle explanation dialog (online).** After PIN verification,
  Cloud OFF→ON MUST show: "Turning ON will sync data: fetch cloud first, then
  push this device's entries." with [Turn ON] / [Cancel]. Cancel leaves mode
  untouched. (Local ON routes to the SPEC-30 re-registration honesty flow —
  new identity, no merge — unchanged, except its import pointer MUST state
  imports upload into the new Online account per CON-07.)
- **CON-06 — Snapshot seeding on ON→OFF (mobile, online).** Toggling ON→OFF
  MUST fetch the server snapshot and require `ok` before switching; the
  snapshot seeds the frozen local log. Fetch failure → stay ON with a notice,
  no state change. (OFF-while-offline is governed by CON-03. Web has no OFF
  persistence; toggle only changes refresh cadence.)
- **CON-07 — Export/import follow the mode.** Export serializes the live
  in-memory snapshot (same JSON shape — SPEC-22 unchanged). Import in
  API-only mode MUST POST each entry to the API (reusing manual-backup POST
  logic) then refetch; per-entity failures are reported, never silent.
  OFF/Local import keeps today's local behavior.
- **CON-08 — Status UI honesty.** API-only mode MUST NOT show queue-derived
  counts (pending is definitionally 0 — hide it, don't print "0 pending") nor
  a "Last Sync" upload timestamp; it shows a live/fetch-time state instead.
  OFF/Local cards keep today's copy.
- **CON-09 — Scoping rule (no per-item surgery).** The local-first provisions
  of SPEC-04 (D-01 Online branch, D-03, Cloud+ON matrix rows), SPEC-22
  (non-goal + D-02/D-04/D-05 local paths), SPEC-27 (merge/queue/fetch/drain)
  and SPEC-29 (outbox/coalescing/dead-letters) remain normative ONLY for the
  local-persist plane (mobile-Local, mobile-OFF) and are bypassed in API-only
  mode. SPEC-30 (creation gate, suggestion modal, fallback confirm,
  re-registration) and SPEC-31 (never-local, hygiene, PIN unification) stand
  fully, plus the registration amendments in CON-02/CON-05.
- **CON-10 — Tandem.** The SPEC-33 draft is SUPERSEDED by this file; its
  array/object normalizer is retained as the API-response handler for
  API-only reads.
- **CON-11 — Standing repo invariants (AGENTS.md §1).** MUST keep Android + iOS
  + Web working; MUST keep web Vercel-deployable; Expo Go MUST NOT crash; no
  new native deps; no `wallet-api` contract change.

## 3. Goal

| Scenario | After (FINAL) |
|---|---|
| Mobile Cloud+ON, online | Live API data; zero `user_{id}_*` writes (assertable via storage spy) |
| Mobile Cloud+ON, offline | Banner + [Turn OFF] over gated content; reconnect lifts it (CON-03) |
| Offline [Turn OFF] tapped | OFF mode, no fetch; existing cache seeds else empty; nothing purged/uploaded |
| Mobile Cloud+ON → OFF (online) | Explanation not required; verified snapshot seeds frozen log; queue paused |
| Mobile Cloud+OFF → ON (online) | PIN verify → explanation dialog → fetch → push → purge → live (CON-04/05) |
| ON-toggle explanation cancelled | Mode untouched, zero fetch, zero writes |
| Fresh Cloud+ON login with legacy cache | Same fetch → push → purge flow (CON-04) |
| Online register/login | No entity-key writes; `master_users` row kept; profile ensure-exists; in-memory globals fallback (CON-02) |
| Web Cloud (ON or OFF), online | Live/memory data, zero persistence; OFF refreshes on login/focus/manual |
| Register ₱15 → 2nd-device login (same id) | Name + ₱15 present (normalizer applied to API reads) |
| API write fails in API-only mode | Visible error + retry; nothing queued, nothing lost silently |

Open decisions: none proposed — DEC-01 (matrix per §1.1), DEC-02 (banner +
gate with OFF action), DEC-03 (fetch-then-push, purge last), DEC-04 (snapshot
seeding; toggle is sync-only, OFF persists mobile-only), DEC-05 (ON-toggle
explanation dialog), DEC-06 (registration write rules + scoping over
per-item surgery) all resolved per user 2026-09-30.

### Acceptance criteria

Objective (machine-checkable, `jest` parameterized by `Platform.OS` =
`android`/`ios`/`web` via mock):

- **ACC-01:** pure mode router returns `api-only` / `local-persist` /
  `memory` per the CON-01 matrix for every platform × mode combination.
- **ACC-02:** API-only write path performs zero `AsyncStorage.setItem` to
  `user_*` keys and zero `enqueueSync` calls (storage + queue spies), on all
  platforms.
- **ACC-03:** migration helper deletes ONLY the entering user's entity keys +
  queue items, and ONLY after drain + verified GET + push; `master_users`,
  `localDeviceId`, other users, and exports are byte-identical; any failed
  step purges nothing and changes no mode. Operation-log spy asserts GET
  precedes first POST (fetch-then-push order).
- **ACC-04:** response normalizer (ex-SPEC-33 D-01) picks the `userId` row
  from arrays, first row as fallback, object as-is, `null` for empty/nameless.
- **ACC-09:** offline OFF-toggle performs zero `fetch` and zero entity writes;
  mode flips to OFF with cache-or-empty seed (unit test of the guard).
- **ACC-10:** Online register/login helpers create zero `user_{id}_*` keys
  while still writing the `master_users` row (storage spy per platform).

Subjective (human-judged, observable reviewer checks):

- **ACC-05:** reviewer on Android Expo Go, Cloud+ON, airplane mode: banner +
  [Turn OFF] over gated content (no data, no red-box); reconnect lifts it
  with fresh data; tapping [Turn OFF] yields a usable empty/frozen log.
- **ACC-06:** reviewer registers ₱15 on mobile web, logs in on incognito:
  name + ₱15 present; creating on one side appears on the other after
  refresh; no "Last Sync: Never" confusion (copy per CON-08).
- **ACC-07:** reviewer toggles ON→OFF on mobile: snapshot seeds offline log;
  airplane mode still shows data; toggle back ON shows the explanation
  dialog, then fetch → push → purge; cancelling changes nothing.
- **ACC-08:** reviewer on web export: no persistence-related copy, no layout
  gap, no red-box.

## 4. Deliverables

- **D-01 — Mode router + API-only data paths.** Pure `resolveDataPlane()`
  helper; each entity context bypasses repos/queue in API-only mode
  (transactions, categories, dues, savings, profile incl. normalizer);
  direct-write error + retry surfaces.
- **D-02 — Offline banner + gate component.** Persistent banner with [Turn
  OFF] over gated content in API-only mode; auto-lifts on reconnect +
  refetch; OFF-while-offline guard per CON-03.
- **D-03 — Migration/seed flows + registration rules.** Fetch → push → purge
  per CON-04 (login / toggle-ON after CON-05 dialog / legacy cache);
  ON→OFF snapshot seeding per CON-06; register/login write rules +
  ensure-exists + globals fallback per CON-02; re-reg import copy per CON-05.
- **D-04 — Export/import + status copy.** Mode-following export/import per
  CON-07; status cards per CON-08.
- **D-05 — Tests.** `jest` for ACC-01..04 + ACC-09/10 parameterized over
  `android`/`ios`/`web`; user-run Expo Go + web export for ACC-05..08.
- **D-06 — Docs + supersessions.** `docs/savepoint.md` + `AGENTS.md §3`;
  record the CON-09 scoping rule, SPEC-33-draft absorption, registration
  amendments, and the offline-first premise change.

## Glossary

| Term | Meaning |
|---|---|
| API-only | Cloud+ON data plane: memory state, direct API reads/writes, zero AsyncStorage entity persistence |
| Local-persist | Mobile-Local and mobile-OFF plane: AsyncStorage-backed, today's semantics |
| Fetch-then-push migration | Verified GET → POST local entries / PUT profile (local wins ties) → purge local cache when entering API-only |
| Snapshot seeding | Verified GET stored locally when leaving API-only for OFF |

## References

- `AGENTS.md §1` — working agreements (spec-first, no CLI, invariants, docs).
- `specs/27-two-device-single-transaction-log.md` — stays normative for
  OFF/Local paths; ON-mode paths bypass it per this spec.
- `specs/29-sync-queue-durable-outbox-idempotency-drain.md` — stays normative
  for OFF/Local paths; never enqueued to in API-only mode.
- `specs/31-web-never-local-and-logout-hygiene.md` — auth/session unchanged.
- `specs/33-cloud-profile-convergence.md` — DRAFT absorbed by this file
  (normalizer retained for API reads).
- `context/TransactionsContext.tsx`, `context/UserProfileContext.tsx`,
  `hooks/useSavings.ts`, `hooks/useDues.ts`, `context/CategoriesContext.tsx`,
  `utils/syncQueue.ts`, `utils/syncProcessor.ts`, `utils/db.ts`
  (export/import), `app/(tabs)/settings.tsx` (`SyncStatusCard`).
