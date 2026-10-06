# SPEC-48 — Paid Dues Stay Gone; Correct Next Occurrence; Busy-Guarded Pay; Auto-renew Labels

| Field    | Value                                                                                          |
|----------|------------------------------------------------------------------------------------------------|
| ID       | SPEC-48                                                                                        |
| Title    | Paid dues stay completed across refetch; next occurrences anchor on max(today, scheduled); pay is busy-guarded; Auto-Process renamed Auto-renew |
| Status   | **FINAL v1.0** (marked by user 2026-10-06; implementable per AGENTS §1.1)      |
| Owner    | TBD (user)                                                                                     |
| Version  | v1.0                                                                                           |
| Scope    | Dues pay/list behavior only: next-occurrence anchor math, busy flags, Auto-renew copy, tests under `utils/`, journal; `useDues` handling ONLY if the HAR gate implicates it |
| Non-goals | Server change (wallet-api out of tree); Due type/storage change; transactions writer; PUT-400 (T-05); migration swallow; healing pre-existing duplicate rows; routes; dependencies |

## Terminology

RFC 2119 keywords: MUST, MUST NOT, SHOULD, MAY. "Paid interval" = the occurrence just paid (stays completed, hidden). "Anchor" = the base date the next occurrence is computed from. "Busy guard" = tap sites disabled while the pay write is in flight. "HAR gate" = user-run PUT `dues/:id` `{completed:true}` → GET comparison proving whether the server persists it.

## Context

### Problem

After Pay + submit, Upcoming clears — but navigating away and back redisplays the paid due, even though the paid interval should stay hidden until its next week/month.

### Evidence (read-only, static + HAR, 2026-10-06)

- Pay chain: `addTransaction` → `updateDue(id, {completed:true})` → conditional `addDue` next occurrence (dues.tsx:287-319). List shows `!d.completed` in the week/month window (dues.tsx:116-132); refetch on every focus (dues.tsx:78-82).
- `updateDue` syncs a PARTIAL `{completed:true}` (useDues:146-152); server persistence unproven (out of tree — this server drops fields).
- Native merge keeps local-newer and only counts remote-newer, never applies it (useDues:63-71); web replaces wholesale (useDues:45-53) — resurrects outright if the server dropped the flag.
- Next occurrence anchors `new Date(item.date)` + interval (dues.tsx:299-306) — stale for overdue dues: the "next" row is born already in-window.
- No busy state on Pay (:435) or dialog Confirm (:655-667) — re-tappable mid-flight.
- Labels read "Auto-Process" (add-due.tsx:126; dues.tsx:568; badge dues.tsx:422-427); help (:38) already describes the true behavior.

### User decisions

- Anchor on `max(today, scheduled)`; completed handling HAR-gated (U1-class); busy flags on Pay + Confirm; rename UI to Auto-renew (switches, badge → AUTO-RENEW, help term) with the `autoProcess` field untouched (migration-free). No background auto-pay exists or is scoped (possible future feature).

## Constraints

- **CON-01 — Bare-minimum (§1.11).** Only D-* files MAY change.
- **CON-02 — No new dependencies (§1.12).**
- **CON-03 — Cross-platform (§1.5).** No native-only imports; no Node APIs in app code.
- **CON-04 — Vercel-deployable + Expo Go safe (§1.6/§1.7).**
- **CON-05 — Local parity.** Anchor/busy/rename behave identically for Local (pure client logic, no API).
- **CON-06 — No contract break (§1.4).** Due type, storage keys, routes, native deps unchanged; next-occurrence rows keep today's shape.
- **CON-07 — TDD cross-platform (§1.10).** jest parameterized android/ios/web + user-run Expo Go + web-export matrix.
- **CON-08 — One home (§1.14).** SPEC-07 (gate ref only), SPEC-32 (completed screen), SPEC-45 (dues-deferred; hard-error), SPEC-46 (probe pattern), SPEC-04 (local) cross-referenced, never re-normed.
- **CON-09 — Ordering.** D-01..D-04 land only after D-00 (FINAL); the useDues slice additionally waits on the HAR gate.
- **CON-10 — Forward fix only.** Pre-existing duplicate/stale rows are not healed.

## Goal

- **DEC-01 — Anchor.** Next-occurrence date = `max(today, item.date)` + interval (same weekly/biweekly/monthly/yearly cases).
- **DEC-02 — Busy guard.** Pay button + dialog Confirm disabled while `recordTransaction` is in flight; reset on settle including errors.
- **DEC-03 — Rename.** "Auto-Process" → "Auto-renew" (add-due switch, dues edit modal, badge → "AUTO-RENEW", help term). Field `autoProcess` untouched.
- **DEC-04 — Completed handling, HAR-gated.** Runs ONLY if the HAR gate shows the server dropping `completed` (PUT `dues/:id` `{completed:true}` → GET lacks it). Mechanism fixed at implementation inside `useDues` only. Outcome normed: a paid row stays completed across refetch.

### Interaction matrix

| # | Account | Platform | Behavior |
|---|---------|---------|----------|
| 1 | Online  | online  | Pay once → stays gone; pay recurring+auto → next correctly dated + hidden until interval |
| 2 | Online  | offline | Existing hard-error behavior (unchanged); busy resets on failure |
| 3 | Local   | —       | Identical client behavior (anchor/busy/rename are local logic) |

### Acceptance

Objective (jest, `Platform.OS` = android/ios/web):

| ID     | Check                                                                                          |
|--------|------------------------------------------------------------------------------------------------|
| ACC-01 | Anchor uses `max(today, scheduled)` (pure asserts + source-text guard)                         |
| ACC-02 | Both tap sites disabled mid-flight and reset on settle (source-text guards)                    |
| ACC-03 | Auto-renew strings present; `autoProcess` field/references intact (source-text guards)         |
| ACC-04 | Completed-handling per HAR outcome (runs only if gate implicates; else recorded skip)          |
| ACC-05 | `npm test` 0 failed; `npm run lint` clean; `npx tsc --noEmit` clean (user-run per §1.3)        |

Subjective (reviewer-observed, Expo Go + web export):

- **ACC-S01:** Pay an overdue recurring due → next correctly dated and hidden until its interval.
- **ACC-S02:** Pay a once due → stays gone across navigate-away/back.
- **ACC-S03:** Double-tap Pay/Confirm → exactly one transaction row.
- **ACC-S04:** Web matrix mirrors S01–S03; `expo export --platform web` clean.

## Deliverables

- **D-00:** User marks this spec FINAL (status flip v1.0) + runs the HAR gate. Gates everything below.
- **D-01:** `app/dues.tsx` — anchor math + busy flags. Nothing else in the file.
- **D-02:** Copy — `app/add-due.tsx` switch, `app/dues.tsx` modal label + badge, `app/help.tsx` term. Copy only.
- **D-03:** `hooks/useDues.ts` — CONDITIONAL on the HAR gate (skip + record if green). Nothing else in the file.
- **D-04:** `utils/` test file named here at implementation (anchor pure asserts + source-text guards; SPEC-07 tsc exclusion respected).
- **D-05:** Journal — `docs/savepoint.md` + `AGENTS.md` §3 entry (incl. HAR outcome).

## Glossary

- Paid interval / Anchor / Busy guard / HAR gate — see Terminology.
- Auto-renew — user-facing name for the autoProcess flag: paying a recurring due chains its next occurrence. No background processing exists.

## References

- Plan-fix run `20261006-paid-due-reappears.md` (decision + scan RAG) · `specs/07-completed-due-locking-and-auto-progression.md` (gate ref) · `specs/32-completed-dues-screen-and-transaction-deletion-lock.md` (completed screen) · `specs/45-api-source-of-truth.md` (dues-deferred; hard-error) · `specs/46-transaction-category-persistence.md` (U1-class probe pattern) · `specs/04-connection-status-vs-offline-mode.md` (local) · `app/dues.tsx:78-82,116-132,229-334,422-427,435,568,655-667` · `hooks/useDues.ts:45-87,126-156` · `app/add-due.tsx:126` · `app/help.tsx:38`.
