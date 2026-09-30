# Spec 33: Cloud User-Profile Convergence (Second Device Sees Name + Balance)

| Field | Value |
|---|---|
| ID | SPEC-33 |
| Title | Cloud profile (name, initialBalance, flags) converges to a second device on login |
| Status | **SUPERSEDED (draft, never FINAL)** — absorbed by SPEC-34 per user 2026-09-30 (normalizer retained for API-only reads; reader/writer convergence re-spec'd under the API-only architecture) |
| Owner | User (final authority) |
| Version | 0.1 — DRAFT abandoned before FINAL; do not implement standalone |
| Scope | `UserProfile` read/write convergence for Cloud accounts (`context/UserProfileContext.tsx`, one `utils/` normalizer + tests) |
| Non-goals | Transactions/categories/dues/savings convergence (SPEC-27 stands); server changes; conflict UI beyond a failure notice; per-device prefs split (dark mode etc. stay inside the single record as today) |
| Normative source | This file, once marked FINAL. `AGENTS.md §4` is a pointer only. File+symbol cites are normative; `:line` numbers are hints only. |

## Terminology (RFC 2119)

The keywords **MUST**, **MUST NOT**, **SHOULD**, and **MAY** in this spec are
to be interpreted as described in RFC 2119. Informative prose (examples,
"observed", "repro") is non-normative unless restated as a requirement.

## 1. Context

### 1.1 Repro (reported 2026-09-30, non-normative)

Register on mobile web with initial balance ₱15.00 → log in (not register) on
a second web tab with the same credentials → same server `user.id`
(`395d0769…`) on both, Backup ON, 0 pending/failed — but the second tab shows
zero balance (and no synced name).

### 1.2 Root cause (non-normative, observed in code)

`UserProfileContext.fetchProfile` (`context/UserProfileContext.tsx:62-64`)
does `authFetch('userProfiles?userId=...')` then requires
`(cloudProfile).name` to be present. Elsewhere in our own codebase
(`app/(tabs)/settings.tsx` `performRestore`) the **same endpoint is treated
as returning an array** (`allProfs.find(p => p.userId === ...)`). An array has
no `.name`, so the cloud branch never takes: a fresh device with no local
profile falls through to `DEFAULT_PROFILE` (balance 0, empty name) — exactly
the reported symptom. Second suspect: `updateProfile` PUTs to
`userProfiles/${activeUserId}` inside a silent `catch` (console only), so a
writer-side id-scheme mismatch would fail invisibly the same way.

### 1.3 Coverage gap

SPEC-27 scoped convergence to transactions only (profiles explicitly out).
No FINAL spec governs `UserProfile` convergence — this spec fills that gap.
It changes no SPEC-27/28/29/30/31 normative content.

## 2. Constraints (normative once FINAL)

- **CON-01 — Reader accepts both shapes.** The fetch path MUST normalize the
  `userProfiles?userId=` response: array → the element whose `userId` equals
  the active id, else the first element; object → as-is. A record counts as
  found iff it carries `name` or `userId`. Found → today's merge
  (`{...DEFAULT_PROFILE, ...cloud}`) + local upsert + `setSetting` (unchanged).
  Not found → today's local/default fallback (unchanged).
- **CON-02 — Writer verifies, never silently swallows.** The `updateProfile`
  PUT MUST inspect its result: on failure the app MUST surface a transient
  notice (existing `useToast().showToast()`, e.g. "Couldn't save profile to
  cloud — will retry on next change.") in addition to the console log, and
  MUST keep the local write (local-first stands).
- **CON-03 — Server-wins-on-fetch (unchanged intent).** When a cloud record is
  found, it overwrites the local profile snapshot exactly as the current
  merge line intends. No new conflict UI, no field-level merge, no per-device
  prefs split in this spec.
- **CON-04 — No contract/storage change.** Same endpoint, same query, same
  AsyncStorage shapes/keys, same `UserProfile` type. Pure client robustness
  fix.
- **CON-05 — Standing repo invariants (AGENTS.md §1).** MUST keep Android + iOS
  + Web working; MUST keep web Vercel-deployable; Expo Go MUST NOT crash; no
  new native deps.

## 3. Goal

| Scenario | After (FINAL) |
|---|---|
| Register with balance ₱15 → login on 2nd device (same id) | 2nd device shows the name + ₱15 after login fetch (array or object response) |
| Endpoint returns `[]` / unreachable | Today's local/default fallback (unchanged), no crash |
| Profile edit while cloud PUT fails | Local applies immediately + transient "couldn't save to cloud" toast; no silent drop |
| Array with several rows | Row matching `userId` wins; else first row |

Open decisions: none proposed — DEC-01: normalize reader + verify writer (fix
both suspects, no server introspection needed); DEC-02: server-wins-on-fetch,
no conflict UI.

### Acceptance criteria

Objective (machine-checkable, `jest` parameterized by `Platform.OS` =
`android`/`ios`/`web` via mock):

- **ACC-01:** normalizer returns the `userId`-matching row from an array,
  first row when no `userId` match, the object when given an object, and
  `null` for `[]`/`null`/name-less shapes.
- **ACC-02:** `fetchProfile` path contains no bare `.name` check on the raw
  response (string-scan: the normalizer is the single gate).
- **ACC-03:** failed PUT triggers the toast path (unit test of the
  writer-result branch with mocked `authFetch`).

Subjective (human-judged, observable reviewer checks):

- **ACC-04:** reviewer registers with ₱15 on mobile web, logs in (not
  register) on incognito: name + ₱15 present after login; reload keeps them.
- **ACC-05:** reviewer edits profile with API blocked: local change applies
  instantly with a visible transient notice; no red-box on any platform.

## 4. Deliverables

- **D-01 — Normalizer (`utils/profileSync.ts`).** Pure
  `normalizeUserProfileResponse(data, userId)` per CON-01; no network, no
  native imports.
- **D-02 — Reader/writer wiring (`context/UserProfileContext.tsx`).**
  `fetchProfile` uses D-01; `updateProfile` PUT branch checks ok + toasts per
  CON-02 (needs the toast hook — already used elsewhere in data contexts).
- **D-03 — Tests.** `jest` for ACC-01..03 parameterized over
  `android`/`ios`/`web`; user-run Expo Go + web export for ACC-04/05.
- **D-04 — Docs.** `docs/savepoint.md` + `AGENTS.md §3` record implementation.

## Glossary

| Term | Meaning |
|---|---|
| Cloud record | The `userProfiles` row for the active `user.id`, either response shape |
| Server-wins-on-fetch | A found cloud record overwrites the local snapshot on fetch |

## References

- `AGENTS.md §1` — working agreements (spec-first, no CLI, invariants, docs).
- `context/UserProfileContext.tsx` (`fetchProfile:56-84`, `updateProfile:95-113`,
  `completeSetup:125-136`), `app/(tabs)/settings.tsx` (`performRestore`,
  array-shape precedent), `utils/apiClient.ts` (unwrap rules), `utils/db.ts`.
