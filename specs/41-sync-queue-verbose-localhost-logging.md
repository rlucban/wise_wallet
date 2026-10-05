# SPEC-41: Verbose Localhost-Gated Sync-Failure Logging

| Field | Value |
|---|---|
| ID | SPEC-41 |
| Title | Verbose Localhost-Gated Sync-Failure Logging |
| Status | **FINAL v1.0** (marked FINAL by user call 2026-10-05; implementable) |
| Owner | User (final authority) |
| Version | 1.0 |
| Scope | `utils/syncProcessor.ts`, `utils/syncProcessor.test.ts` |
| Non-goals | Queue dequeue policy; `authFetch` error field; payload repair; 401 path; web path; dues/savings payloads; retry ceiling; any new dependency, storage key, endpoint, or route |

## Terminology (RFC 2119)

The keywords **MUST**, **MUST NOT**, **SHOULD**, and **MAY** in this spec are
to be interpreted as described in RFC 2119. Informative prose is non-normative
unless restated as a requirement.

## Context

The native sync queue (`utils/syncProcessor.ts` + `utils/syncQueue.ts`) is the
only sync path on Android/iOS (SPEC-04); web writes API-direct and never queues
(SPEC-36 CON-W-03). Hence 400/404 sync warnings are native-only.

`processSingleItem` maps 400 (`utils/syncProcessor.ts:97-99`) and 404 (`:94-96`)
to `{ success: true }` → `dequeueSync` + `updateLastSyncedAt`. The suite pins
this as a known BUG (`utils/syncProcessor.test.ts:137,160` for 400; `:105,128`
for 404), and every queue test uses `operation: 'create'` — `update` payloads
have zero coverage.

`utils/apiClient.ts:100,109` reads only `body.error` while the server sends
`{status, message}`, so failure logs show a bare `"HTTP 400"` with the reason
discarded (`docs/todo-specs.md` defect 3 — out of scope here).

The failing field itself is unknown (web experiment open, user-picked diagnosis
B: live invalid payloads). This spec changes observability only.

## Constraints

- **CON-01** — Verbose output MUST be gated on `API_URL` containing `localhost`
  (`utils/db.ts:55`, `EXPO_PUBLIC_API_URL`).
- **CON-02** — When the gate is off (including `API_URL` unset), behavior MUST be
  byte-identical to today (`console.warn` + dequeue).
- **CON-03** — When the gate is on, the 400 and 404 branches MUST use
  `console.error` and MUST include status, entity, operation, entityId, server
  error string, full `item.data` payload, timestamp, and retryCount.
- **CON-04** — Queue semantics MUST NOT change in any environment (still dequeue;
  still stamp `lastSyncedAt`; never retry 400/404 — retrying a validation
  failure cannot succeed, `docs/todo-specs.md:292`).
- **CON-05** — MUST NOT add dependencies, storage keys, endpoints, routes, or
  files beyond the two in scope.
- **CON-06** — MUST NOT touch `utils/apiClient.ts`, `utils/syncQueue.ts`, the
  401/`onAuthFailure` path, SPEC-40's unwrap, or any screen/context/hook.
- **CON-07** — Tests MUST set `EXPO_PUBLIC_API_URL` explicitly per case (the mock
  defaults it to localhost at `utils/syncProcessor.test.ts:7`) and MUST cover
  `Platform.OS` `android`/`ios`/`web` (AGENTS §1.10).

## Goal

### Platform matrix

| Platform | Objective (jest, `ACC-01`..`05`) | Subjective (reviewer checks) |
|---|---|---|
| Android (Expo Go) | `ACC-01`..`05` | `ACC-06`: against a localhost backend, a rejected item surfaces as an error with full detail; against the hosted backend, output is unchanged |
| iOS (Expo Go) | `ACC-01`..`05` | `ACC-06` as Android |
| Web (`expo export --platform web`) | `ACC-01`..`05` (queue path unreachable; no-op) | `ACC-07`: export unaffected, no new console output |

### Decisions

- **DEC-01** — Gate is an `API_URL` substring check (existing env, no new flag
  plumbing; unset ⇒ off).
- **DEC-02** — Level is `console.error` (visible LogBox on the Expo Go test
  device; localhost-only so no production noise).
- **DEC-03** — Full payload is included (PII acceptable on own-machine localhost;
  forbidden elsewhere by `CON-02`).
- **DEC-04** — Dequeue policy deliberately untouched; ending the silent loss is a
  separate spec (needs the failing field first).

### Acceptance criteria

- **ACC-01** — Localhost env, mocked 400 on `transactions:update:<id>` →
  `console.error` called with entity, operation, entityId, status, and payload;
  item dequeued (`android`/`ios`/`web`).
- **ACC-02** — Same as `ACC-01` for 404.
- **ACC-03** — Non-localhost env → `console.warn` + dequeue, byte-identical to
  today (`android`/`ios`/`web`).
- **ACC-04** — `API_URL` unset → early-return, queue untouched, no output at all.
- **ACC-05** — `npm run lint` reports 0 errors and 0 warnings; jest suite green.
- **ACC-06** — Reviewer confirms on Expo Go (Android + iOS) the `ACC-06` matrix
  row above, step by step.
- **ACC-07** — Reviewer confirms the web export matrix row above.

## Deliverables

- **D-01** (`utils/syncProcessor.ts`) — flag const + reworked `:94-99` branch
  bodies. One file; implement-fix slices it as const first, branches second.
- **D-02** (`utils/syncProcessor.test.ts`) — rewritten BUG cases (`:105-167`) +
  env matrix per `CON-07`.
- **D-03** (docs) — `docs/savepoint.md` change-journal entry + `AGENTS.md` §3
  status line, per AGENTS §1.8.

## Glossary

- **sync_queue** — device-global AsyncStorage key holding pending sync items
  (`utils/syncQueue.ts:18`); never cleared by app code, no per-user partition.
- **Poison-pill breaker** — the 400/404→`success:true` mapping that keeps one bad
  item from stalling the queue; retained by `CON-04`.
- **Localhost gate** — `DEC-01` condition enabling verbose output.
- **LogBox** — React Native dev overlay surfacing `console.error` on Expo Go.

## References

- `specs/04-connection-status-vs-offline-mode.md` (native queue ownership)
- `specs/36-web-platform-invariants.md` CON-W-03 (web API-direct)
- `specs/37-onboarding-opening-balance-payment-method.md` (same bug class, registration path)
- `specs/40-authfetch-envelope-unwrap.md` `:11`, CON-04 (error/401 path out of scope)
- `docs/todo-specs.md:219-300` (defects 1–3, candidates, no-retry-400 rule)
- `utils/syncProcessor.test.ts:105-167` (BUG-pinned cases to rewrite)
- Plan RAG: `~/.config/opencode/skills/plan-fix/runs/20261005-0630-sync-queue-400.md`
