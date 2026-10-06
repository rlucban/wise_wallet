# SPEC-44 — 401 Warning Dedupe (Expo Go LogBox Spam)

| Field | Value |
|---|---|
| ID | SPEC-44 |
| Title | Warn once per invalidated session, not per rejected call (401 `console.warn` dedupe) |
| Status | **FINAL** (marked by user 2026-10-06; implementable per AGENTS §1.1) |
| Owner | User (final authority) |
| Version | v1.0 |
| Scope | `utils/apiClient.ts` 401 branch only; `utils/apiClient.test.ts`; tests under `utils/` |
| Non-goals | Changing 401 side effects (credential clear, `onAuthFailure('session_ended')`), retry/backoff, sync queue, nav guard, `LogBox` global config, web behavior, any route/storage/dependency change |
| Normative source | This file. File+symbol cites are normative; `:line` numbers are hints only. |

## Terminology (RFC 2119)

- **invalidation episode** — a single stretch in which the active session is rejected (401) until the next successful login.
- MUST / MUST NOT / SHOULD / MAY follow RFC 2119.

## Context

- `utils/apiClient.ts:79-84`: every HTTP 401 does `console.warn('401 Unauthorized - clearing auth credentials')`, clears credentials, and fires `onAuthFailure('session_ended')`.
- In Expo Go, each `console.warn` shows a yellow LogBox pop. When another device changes the passcode (SPEC-API-02), the stale-token client keeps issuing protected calls (sync/queue, refetches, web-direct loads); each one warns again. The observed "page flashing" was this LogBox spam, not a page render.
- Web builds through the same file but does not surface LogBox, and SPEC-36 API-direct reads fail closed — both unaffected by warning dedupe.

## Constraints

- **CON-01** — At most ONE `'401 Unauthorized'` warn per invalidation episode (first 401 wins; subsequent 401s before the next successful login MUST NOT warn).
- **CON-02** — The latch MUST reset when a new login or logout completes, so a later, genuinely separate invalidation warns again.
- **CON-03** — Exactly one diagnostic warn per episode MUST remain (dedupe, never drop).
- **CON-04** — Response shape (`{ok:false,status:401,…}`), credential clear, and `onAuthFailure('session_ended')` side effects MUST be byte-identical per call.
- **CON-05** — jest tests parameterized by `Platform.OS` (`android`/`ios`/`web`), source-text guard + behavioral check.
- **CON-06** — The warn MUST be invisible unless `EXPO_PUBLIC_ADMIN_TOGGLE === "true"` at bundle time. `false`, unset, `null`, or any other value MUST NOT warn. (User call 2026-10-06: banner suppressed by default.)

## Goal

- **DEC-01** — Module-scope latch in `utils/apiClient.ts`; reset via an exported `resetAuthSessionWarningLatch()` called on login success and logout (or simply on every successful login — see D-02). No new dependency, no `LogBox` global toggle.
- **ACC-01** — First 401 warns once; immediate second 401 (same episode) does not warn again.
- **ACC-02** — After a login/logout reset, the next 401 warns again.
- **ACC-03** — Credentials are cleared and `onAuthFailure('session_ended')` fires on EVERY 401, dedupe is logging-only.
- **ACC-04** — With `EXPO_PUBLIC_ADMIN_TOGGLE` unset/false/null the warn is never emitted; with exactly `"true"` it follows ACC-01/ACC-02.

## Deliverables

- **D-01** — `utils/apiClient.ts`: add `let authWarnLatched = false;` guard around the `console.warn` at the 401 branch; export `resetAuthSessionWarningLatch()` that sets it back to `false`.
- **D-02** — Reset wiring: `AuthContext` login/logout paths call `resetAuthSessionWarningLatch()`. (Smallest single touch point: the two places a token/credential change is committed in `context/AuthContext.tsx`.)
- **D-03** — `utils/apiClient.test.ts`: ACC-01..03 across `android`/`ios`/`web`.
- **D-04** — `docs/savepoint.md` + `AGENTS.md` §3 journal entry.

## Glossary

- **LogBox** — Expo Go on-screen yellow/red warning box surfaced from `console.warn`/`console.error`.
- **invalidation episode** — see Terminology.

## References

- `utils/apiClient.ts` (401 branch), `context/AuthContext.tsx` (login/logout), `docs/savepoint.md` 2026-10-06 SPEC-35 session, SPEC-API-02 multi-device behavior.
