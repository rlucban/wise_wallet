# SPEC-37 — Onboarding Opening Balance paymentMethod

| Field     | Value                                                        |
|-----------|--------------------------------------------------------------|
| ID        | SPEC-37                                                      |
| Title     | Onboarding Opening Balance paymentMethod                     |
| Status    | FINAL (marked by user 2026-10-04; implementable per AGENTS §1.1) |
| Owner     | TBD (user)                                                   |
| Version   | v0.1                                                         |
| Scope     | Web onboarding `handleGetStarted` Opening Balance write + its failure UX |
| Non-goals | Backend schema change; global error-copy rewrite; native queue; scheduled-dues audit |

## Terminology

RFC 2119 keywords: MUST, MUST NOT, SHOULD, MAY. "Opening Balance" = the
first income transaction created at setup. "API-direct" = SPEC-36 web writes
with no local repo or queue. "Builder" = the new pure payload function in `utils/`.

## Context

On web, `handleGetStarted` (`app/onboarding.tsx:34-62`) posts an Opening
Balance transaction with no `paymentMethod`. `sanitizeTransaction`
(`context/TransactionsContext.tsx:37-38`) fills `""`; the SPEC-36 web branch
(posts API-direct, lines 178-190) gets `ok:false` on the server's 400
(`wallet_API/src/schemas/transactionSchema.js:9`, `paymentMethod` min 1) and
throws the "connection" error (line 186). The catch (`onboarding.tsx:57-58`)
logs only — no navigation, no message. The normal add screen defaults
`paymentMethod` to `"cash"` (`app/add-transaction.tsx:44`), so only callers
that omit it break.

## Constraints

- **CON-01:** MUST NOT touch `D:\hobby\wallet_API` or require a redeploy.
- **CON-02:** MUST NOT change the native `addTransaction`/queue behavior.
- **CON-03:** MUST keep Android + iOS + Web working; MUST stay Expo-Go-safe
  on import and `expo export --platform web` clean.
- **CON-04:** MUST NOT add dependencies.
- **CON-05:** MUST NOT alter the zero-balance path (no transaction created).
- **CON-06:** MUST follow this template with an Android|iOS|Web matrix and
  jest coverage parameterized by `Platform.OS` (AGENTS §1.9/§1.10).

## Goal

### Decisions

- **DEC-01:** Fix app-side (plan Option A); server validation stays strict.
- **DEC-02:** Default `"cash"`, mirroring the add-transaction screen.
- **DEC-03:** Pure builder in `utils/` so jest (roots: `utils`) can cover it.
- **DEC-04:** Onboarding failure shows an in-UI, re-triable message; copy
  stays connection-generic (server-detail surfacing is parked).

### Acceptance

Objective (machine-checkable):

| ID      | Android | iOS | Web | Check |
|---------|---------|-----|-----|-------|
| ACC-01  | ✅      | ✅  | ✅  | jest: builder returns `paymentMethod: "cash"` for nonzero balance on all three `Platform.OS` mocks |
| ACC-02  | ✅      | ✅  | ✅  | jest: builder returns null for balance 0 (no transaction) |
| ACC-03  | —       | —   | ✅  | source guard: `onboarding.tsx` builds the payload via the builder |
| ACC-04  | —       | —   | ✅  | source guard: `handleGetStarted` catch sets a rendered error state (no console-only path) |

Subjective (reviewer-observed):

- **ACC-S01:** Reviewer on web dev server enters name + ₱1,000 → lands on
  dashboard, Opening Balance visible, no red-box.
- **ACC-S02:** Reviewer with API unreachable taps Get Started → stays on
  onboarding with a readable error and can retry.
- **ACC-S03:** Reviewer confirms via Network tab that POST
  `/api/transactions` returns 201 with a non-empty `paymentMethod`.

## Deliverables

- **D-00:** This spec marked FINAL by the user.
- **D-01:** `utils/onboardingPayload.ts` (new, pure) + `app/onboarding.tsx` uses it.
- **D-02:** Onboarding visible error state on failure.
- **D-03:** `utils/onboardingPayload.test.ts` covering ACC-01/02/04.
- **D-04:** User-run manual matrix: web Get Started, Expo Go add-transaction
  regression, `expo export --platform web`.
- **D-05:** `docs/savepoint.md` + `AGENTS.md` §3 entry.

## Glossary

- **sanitizeTransaction:** fills defaults (`paymentMethod: ""`) before writes.
- **zod validate:** server middleware returning 400 on schema mismatch.
- **Stuck screen:** no navigation and no message after a failed Get Started.

## References

- `specs/04-connection-status-vs-offline-mode.md`, `specs/36-web-platform-invariants.md`
- `app/onboarding.tsx:34-62`, `context/TransactionsContext.tsx:37-38,178-190`
- `utils/apiClient.ts:71-76`, `app/add-transaction.tsx:44`
- `D:\hobby\wallet_API\src\schemas\transactionSchema.js:9`,
  `src/routes/transactionRoutes.js:13`, `src/app.js:7`
