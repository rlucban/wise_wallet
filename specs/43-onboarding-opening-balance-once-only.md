# SPEC-43 — Onboarding Opening Balance Once-Only Guard

| Field     | Value                                                        |
|-----------|--------------------------------------------------------------|
| ID        | SPEC-43                                                      |
| Title     | Onboarding Opening Balance once-only guard                   |
| Status    | **FINAL** (marked by user 2026-10-05; implementable per AGENTS §1.1) |
| Owner     | TBD (user)                                                   |
| Version   | v1.0 (FINAL; content unchanged from v0.1 except status + D-00) |
| Scope     | `app/onboarding.tsx` `handleGetStarted` write path only (existence check + synchronous busy guard) + tests under `utils/` |
| Non-goals | Sync merge path; server/API; storage migrations; cleanup of already-duplicated rows (follow-up); SPEC-37 failure UX change; routes; dependencies |
| Normative source | This file. Plan-fix run `20261005-0700-initial-balance-duplicate.md` (decision A) is the planning record, not normative. File+symbol cites are normative; `:line` numbers are hints only. |

## Terminology

RFC 2119 keywords: MUST, MUST NOT, SHOULD, MAY. "Opening entry" = a
transaction created from `buildOpeningBalancePayload` (title "Opening
Balance", dedicated category id, note "Initial account setup"). "Re-entry" =
any second execution of the setup write (re-tap, re-mounted screen, replayed
onboarding).

## Context

### Problem

The initial-balance transaction can be written more than once: every repeat
of the setup write appends another "Others" / "Initial account setup" income
row, and nothing at the write site stops the Nth copy.

### Evidence (verified 2026-10-05, read-only scan)

- `app/onboarding.tsx:36-59` — `handleGetStarted` runs `completeSetup`
  (`:44`) then `addTransaction(openingPayload)` (`:47-50`) with **no
  existence check** and **no synchronous busy guard** (`setLoading(true)` at
  `:38` is async state — a rapid second tap fires before re-render).
- `utils/onboardingPayload.ts:3,10-28` — builder mints a **fresh UUID per
  call** (`:27` `updatedAt`, `generateUUID` at the `addTransaction` site);
  marker fields: title "Opening Balance" (`:15`), category
  `b0eebc99-9c0b-4ef8-bb6d-6bb9bd380b19` / "Others" (`:19-24`), note
  "Initial account setup" (`:25`).
- `context/TransactionsContext.tsx:171-207` — `addTransaction` writes **once
  per call** (web `:178-190` POST + append; native `:192-202` upsert +
  enqueue `'create'`), so every repeated invocation is a new row by
  construction.
- Compounding hazard (unconfirmed, out of scope here): `:86-148` merge
  re-enqueues `'create'` for every local row missing remotely on every
  fetch, while `supabase/schema.sql:75-76` defaults `transactions.id` to
  `gen_random_uuid()` and server code is not in this tree — if the server
  mints ids, native re-fetches compound. Recorded for the B-follow-up, not
  this spec.
- Only 3 `addTransaction` call sites exist (onboarding, add-transaction
  form, dues `recordTransaction`); transactions refetch only on
  `activeUserId` change (`:152-155`).

### Notes (informative)

- Computed-balance sums already exclude title "Opening Balance"
  (`TransactionsContext.tsx:159-166`, SPEC-10) — duplicates inflate the
  list, not the total. Skipping dup writes preserves that semantic.
- SPEC-37 owns the failure UX (`setupError` re-triable, `:53-58`); this
  spec MUST NOT change it.
- No overlap with SPEC-37 (missing `paymentMethod` 400): different defect,
  same payload. Cross-referenced, not duplicated (§1.14).

## Constraints

- **CON-01 — Bare-minimum diff (§1.11).** Only `handleGetStarted` in
  `app/onboarding.tsx` MAY change, plus test/journal files named in D-*.
  No refactoring, no copy/styling changes.
- **CON-02 — No new dependencies (§1.12).** No npm packages, native
  modules, or new libraries. Existing imports only (a new `utils/` helper
  is NOT authorized — inline guard, decided for minimality).
- **CON-03 — Marker precision.** The existence check MUST match the
  dedicated opening-balance marker (category id
  `b0eebc99-9c0b-4ef8-bb6d-6bb9bd380b19`, optionally AND note "Initial
  account setup"). It MUST NOT match on title alone — a user income
  legitimately titled similarly MUST still save.
- **CON-04 — Error path stays re-triable.** The busy guard MUST reset on
  failure (`catch`/`finally`) so the SPEC-37 `setupError` retry path keeps
  working. A failed setup MUST NOT permanently lock the button.
- **CON-05 — Cross-platform invariant (§1.5).** Android + iOS + Web keep
  working; no native-only static imports; no Node-only APIs in app code.
- **CON-06 — Vercel-deployable (§1.6) / Expo Go safe (§1.7).** Web export
  clean; nothing may crash Expo Go on import.
- **CON-07 — TDD with cross-platform coverage (§1.10).** `jest`
  parameterized by `Platform.OS` (`android`/`ios`/`web`) for checkable
  branches (source-text guards, per repo precedent for screen behavior
  jest cannot render) plus user-run manual matrix for the tap/re-entry
  paths. No contract changes (§1.4): no storage-key, API, route, or
  dependency change.

## Goal

- **DEC-01 (DECIDED — plan decision A, user-confirmed via Done):** guard at
  the write site: (a) existence check — skip `addTransaction` when an
  opening entry already exists; (b) synchronous busy guard — second
  invocation while the first is in flight returns immediately.

### Acceptance

Objective (machine-checkable):

| ID | Android | iOS | Web | Check |
|----|---------|-----|-----|-------|
| ACC-01 | ✅ | ✅ | ✅ | `handleGetStarted` gates `addTransaction` on an opening-existence check (source-text, per precedent) |
| ACC-02 | ✅ | ✅ | ✅ | synchronous busy guard set before the first await and reset in `catch`/`finally` (CON-04) |
| ACC-03 | ✅ | ✅ | ✅ | existence match uses the dedicated category id, not title alone (CON-03) |
| ACC-04 | ✅ | ✅ | ✅ | `npm test` 0 failed; `npm run lint` 0 errors/0 warnings; `npx tsc --noEmit` 0 errors |

Subjective (reviewer-observed):

- **ACC-S01:** fresh onboarding, balance > 0 → exactly 1 Opening Balance / Others row after Get Started.
- **ACC-S02:** rapid re-tap during flight + re-entry to onboarding + repeat Get Started → still exactly 1 such row, no new transaction.
- **ACC-S03:** failed setup (e.g. offline) still shows the re-triable error (SPEC-37 UX preserved).
- **ACC-S04:** normal add-transaction and dues-record flows unaffected.

## Deliverables

- **D-00:** FINAL marked by the user 2026-10-05.
- **D-01:** `app/onboarding.tsx` — existence check + synchronous busy guard in `handleGetStarted` (CON-01..04). Nothing else in the file touched.
- **D-02:** guard tests under `utils/` — ACC-01..ACC-03 across `android`/`ios`/`web`.
- **D-03:** user-run matrix ACC-S01..S04.
- **D-04:** `docs/savepoint.md` + `AGENTS.md` §3 entry (§1.8).

## Glossary

- **Opening entry:** the transaction built by `buildOpeningBalancePayload`.
- **Re-entry:** any second execution of the setup write path.
- **Busy guard:** a synchronous flag blocking concurrent invocations.

## References

- Plan-fix run `20261005-0700-initial-balance-duplicate.md` (decision A; unknowns: platform, server id echo, re-entry path)
- `app/onboarding.tsx:36-59` · `utils/onboardingPayload.ts:3-28` · `context/TransactionsContext.tsx:86-207` · `supabase/schema.sql:75-76`
- `specs/37-onboarding-opening-balance-payment-method.md` (same payload, different defect — no overlap)
- `specs/10-negative-balance-alert-recovery.md:202` (Opening Balance excluded from computed sums)
- `specs/05-multi-device-behavior.md` (merge/LWW path — explicitly out of scope; B-follow-up home if server-id proof lands)
