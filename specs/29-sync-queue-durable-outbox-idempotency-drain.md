# Spec 29: Sync Queue — Durable Outbox, Idempotency, Drain Behavior

| Field | Value |
|---|---|
| ID | SPEC-29 |
| Title | Sync Queue Hardening: keep it, make it idempotent, rate-limited, unthrottled |
| Status | **FINAL** (2026-09-29 per user call) |
| Owner | User (final authority) |
| Version | 1.0 — FINAL: v0.1 approved as-is (DEC-01 dead-letter counter, DEC-02 200ms window); implement exactly this |
| Scope | `utils/syncQueue.ts` + `utils/syncProcessor.ts`: durability contract, coalescing, trigger timing, failure backoff, dead-letter rule, diagnostics |
| Non-goals | Server (`wallet-api`) changes — server behavior is a recorded assumption, not a deliverable; replacing the queue with fire-and-forget; push/websocket |
| Normative source | This file, once marked FINAL. `AGENTS.md §4` is a pointer only. File+symbol cites are normative; `:line` numbers are hints only. |

## Terminology (RFC 2119)

The keywords **MUST**, **MUST NOT**, **SHOULD**, and **MAY** in this spec are
to be interpreted as described in RFC 2119. Informative prose (examples,
"today", "currently", "observed") is non-normative unless restated as a requirement.

## 1. Context

### 1.1 Questions asked (2026-09-29)

1. Do we need the `sync_queue`? **Yes** — see §1.2.
2. Async- or promise-based? **False dichotomy** — the queue is already 100%
   promise-based (`async`/`await` throughout); no callback refactor is proposed
   or needed. This spec keeps the promise model.
3. Idempotent? **Per-key yes, end-to-end partially** — gaps closed by CON-03/04.
4. Rate-limited but no throttling? **Yes, achievable** — sequential drain is the
   rate limit; happy-path delays are removed, backoff kept for failures only
   (CON-05).

### 1.2 Why the queue stays (non-normative)

Offline-first REQUIRES a durable outbox. A transaction created in airplane mode
exists only in the device repo; without a persisted, app-kill-surviving record
of "what still needs sending," that write never reaches the server — the exact
two-device divergence of SPEC-27. In-memory retry loses writes on app kill;
relying on fetch-merge re-upload is incidental, not a contract (SPEC-27 keeps
it only as backstop). The queue is the contract.

### 1.3 Observed gaps (non-normative)

- **No coalescing.** Rapid create→update→update enqueues two items
  (`create` + `update`) and sends both. Harmless but wasteful; create→delete
  sends a POST for a row the user already deleted.
- **End-to-end idempotency is assumed, not verified.** Client dedupe per key
  (`entity:operation:entityId` overwrite) exists, but timeout-after-success
  retry safety depends on the server upserting on the client UUID — server code
  is not in this repo, so this ships as a recorded assumption (D-04).
- **Happy-path throttle.** `triggerSyncProcessing(500)` debounces EVERY trigger
  500 ms, including online immediate writes. Snappy sync wants immediate drain
  with only a short coalesce window for rapid bursts.
- **404/400 dequeued as success.** Existing `syncProcessor.test.ts` documents
  these as BUG (silently drops). Retrying them forever is worse (battery/data);
  the fix is dequeue + visible dead-letter accounting (DEC-01).
- **What already works:** sequential drain (concurrency 1), exponential backoff
  with jitter capped at 32 s on failure only, `nextRetryAt` gating, offline
  growth + reconnect drain via `NetworkContext`.

### 1.4 Definitions

**Coalescing** — collapsing multiple queued ops on one entity id into the
minimal equivalent op with the latest data, at enqueue time.

**Dead letter** — an item dequeued WITHOUT server confirmation because it can
never succeed (404 unknown endpoint, 400 validation reject). Counted and
surfaced, never silently dropped, never retried forever.

**No-throttling** — no artificial delay between an online write and its send
attempt. Backoff applies to failures only.

## 2. Constraints (normative once FINAL)

- **CON-01 — Durable outbox stays.** The queue MUST remain AsyncStorage-backed
  and app-kill-surviving. The implementation MUST NOT replace it with
  fire-and-forget POSTs or in-memory-only retry. Fetch-merge re-upload
  (SPEC-27) stays a backstop, never the primary path.
- **CON-02 — Promise model stays.** All queue code MUST remain `async`/`await`
  (promises). No callback-style refactor, no new concurrency primitives beyond
  the existing `isProcessing` guard.
- **CON-03 — Coalesce at enqueue.** `enqueueSync` MUST collapse per entity id:
  `create` + `update` → single `create` with latest data; `update` + `update`
  → single `update` with latest data; ANY op + `delete` → single `delete` with
  data dropped (`create` + `delete` MUST NOT send a POST first — just the
  `delete`; a 404 on drain then dead-letters per CON-06). Queue item id scheme
  (`entity:operation:entityId`) is preserved; collapse is by `entityId`.
- **CON-04 — Retry-safe payloads (client side).** Every `transactions`
  create/update payload MUST carry the stable client `id` + fresh `updatedAt`
  (already true via SPEC-27 CON-04), so a timeout-after-success resend
  overwrites the same server row instead of duplicating. ASSUMPTION (recorded,
  not built): server upserts on `(userId, id)`. D-04 documents it; no server
  work ships here.
- **CON-05 — Rate-limited drain, unthrottled happy path.** Drain MUST stay
  strictly sequential (max 1 in-flight request — the rate limit). Trigger MUST
  attempt drain IMMEDIATELY when online with only a short coalesce window
  (200 ms proposed — batches rapid bursts, imperceptible to users; replaces the
  blanket 500 ms debounce). Backoff (exponential, jittered, capped 32 s) MUST
  apply to failed items ONLY. No `setInterval` polling (SPEC-27 CON-07 stands).
- **CON-06 — Dead letters, not silent drops (DEC-01 default).** 404/400 MUST
  dequeue (never retry — they can never succeed) AND increment a persisted
  dead-letter counter surfaced in diagnostics. `console.warn` is kept. Infinite
  retry of dead letters is REJECTED (battery/data burn for zero gain).
- **CON-07 — Cross-user + paused gating preserved.** SPEC-27 D-05 (userId
  assert at drain) and the OFF early-out stay in force; coalescing MUST NOT
  merge items across different `userId`s.
- **CON-08 — Standing repo invariants (AGENTS.md §1).** MUST keep Android + iOS
  + Web working; MUST keep web Vercel-deployable; MUST NOT change storage keys
  (new keys need migration + rollback notes), the `wallet-api` contract,
  AsyncStorage shapes, routes, or native deps unless this spec requires them.

## 3. Goal

| Scenario | After (FINAL) |
|---|---|
| Offline create → app killed → reopened online | Write survives (durable), drains on start/reconnect, appears on 2nd device after its refetch |
| Rapid create → edit → edit (online) | ONE `create` with latest data sent (coalesced), no `update` follows |
| Create → delete before drain | ONE `delete` sent, never a POST (no ghost row if server was empty; dead-letter if 404) |
| POST succeeds server-side but response lost (timeout) | Retry resends same `id`+data → same row overwritten, no duplicate (given D-04 assumption) |
| 500s / airplane | Queue grows, UI unaffected, backoff per item; drains sequentially on recovery |
| 404/400 from server | Dequeued + dead-letter counter +1, visible in diagnostics, never retried |
| Shared device, user A queued, user B active | A's items untouched by B's drain (CON-07); B's drain skips them with warning |

Open decisions (need user call before FINAL):

- **DEC-01:** dead-letter rule — (a) dequeue + persisted counter in diagnostics
  (proposed, CON-06) vs (b) keep current silent-dequeue (status quo, tests
  keep calling it BUG)?
- **DEC-02:** coalesce window — 200 ms (proposed) vs fully immediate (0 ms,
  bursts send separately) vs keep 500 ms?

### Acceptance criteria

Objective (machine-checkable, `jest` parameterized by `Platform.OS` =
`android`/`ios`/`web` via mock):

- **ACC-01:** create→update→update on one id yields ONE queue item, op
  `create`, latest data.
- **ACC-02:** update→delete yields ONE item, op `delete`, data empty.
- **ACC-03:** two users' items on one id-key never coalesce across `userId`.
- **ACC-04:** happy path: `enqueueAndTrigger` while online leads to a send
  attempt within the coalesce window (fake timers), with zero backoff delay.
- **ACC-05:** failed item (500) is NOT retried before its `nextRetryAt`;
  backoff grows across consecutive failures and caps at 32 s.
- **ACC-06:** 404/400 dequeues + increments dead-letter counter exactly once;
  item never reprocessed.

Subjective (human-judged, observable reviewer checks):

- **ACC-07:** reviewer toggles airplane mode, creates 3 transactions, kills and
  restarts the app, reconnects: all 3 reach the server, exactly 3 rows, no
  duplicates, no red-box (Expo Go Android + iOS).
- **ACC-08:** reviewer rapid-edits one transaction 5 times online: server shows
  the final values with ≤2 requests in logs.
- **ACC-09:** reviewer with dead-letter state sees the counter in diagnostics
  (Settings/Sync card) in `expo export --platform web` with no layout break.

## 4. Deliverables

- **D-01 — Coalescing `enqueueSync` (`utils/syncQueue.ts`).** Per-`entityId`
  collapse per CON-03 (+ CON-07 user scoping). Pure enough for direct unit
  tests against the AsyncStorage mock.
- **D-02 — Trigger timing (`utils/syncProcessor.ts`).** Coalesce window per
  DEC-02; immediate attempt when online; `NetworkContext` reconnect path
  unchanged.
- **D-03 — Dead-letter counter.** Persisted key (migration + rollback noted),
  increment on 404/400 dequeue, exposed via `getQueueStats`/`useSyncStatus`,
  rendered in `SyncStatusCard` diagnostics (neutral color).
- **D-04 — Server contract note.** Document the `(userId, id)` upsert
  assumption + timeout-retry safety argument in `docs/savepoint.md` (or spec
  appendix). No server code ships.
- **D-05 — Tests + manual proof.** `jest` for ACC-01..06 parameterized over
  `android`/`ios`/`web` (extend `syncProcessor.test.ts` + new `syncQueue`
  tests); user-run Expo Go + web export for ACC-07..09.
- **D-06 — Docs.** Append `docs/savepoint.md` + `AGENTS.md §3` after FINAL
  implementation. No normative change via docs alone.

## Glossary

| Term | Meaning |
|---|---|
| Durable outbox | AsyncStorage queue surviving app kill; the contract for offline writes |
| Coalescing | Enqueue-time collapse of ops on one id to the minimal equivalent |
| Dead letter | Dequeued-without-confirmation item that could never succeed (404/400) |
| Coalesce window | Short happy-path delay batching bursts; NOT failure backoff |

## References

- `AGENTS.md §1` — working agreements (spec-first, no CLI, invariants, docs).
- `specs/27-two-device-single-transaction-log.md` — D-05 (userId assert),
  CON-07 (no polling), fetch-merge backstop.
- `utils/syncQueue.ts` — queue + `generateQueueItemId`; `utils/syncProcessor.ts`
  — sequential drain, backoff, 404/400 branches.
- `utils/syncProcessor.test.ts` — documents 404/400 silent-drop as BUG.
- `context/NetworkContext.tsx` — reconnect trigger; `hooks/useSyncStatus.ts`,
  `app/(tabs)/settings.tsx SyncStatusCard` — diagnostics surface.
