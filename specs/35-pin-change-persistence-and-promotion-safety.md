# SPEC-35 — PIN Change Persistence and Promotion Safety

| Field | Value |
|---|---|
| ID | SPEC-35 |
| Title | PIN change persistence and promotion safety (Local + Cloud, mobile + web) |
| Status | **FINAL** (marked by user 2026-10-06; implementable per AGENTS §1.1) |
| Owner | User (final authority) |
| Version | v1.0 (FINAL; content unchanged from v0.1 except status) |
| Scope | `app/(tabs)/settings.tsx` change-PIN dialog write path only + `context/PasscodeContext.tsx` hydration/persistence + local `master_users` re-hash (`utils/db.ts`) + Cloud `POST /api/auth/change-passcode` branch via `utils/apiClient.ts` + tests under `utils/` |
| Non-goals | Server session-enforcement redesign (SPEC-API-02 owns `protect` + JWT session-claim work); push notifications; sync merge/LWW changes; Clear Data / Delete Account flows; onboarding/register/login copy; tab bar/reports/TTS/theming; new dependencies; any route change |
| Normative source | This file (once marked FINAL). File+symbol cites are normative; `:line` numbers are hints only. |

## Terminology (RFC 2119)

The keywords **MUST**, **MUST NOT**, **SHOULD**, and **MAY** in this spec are
to be interpreted as described in RFC 2119. Informative prose (examples,
"today", "currently") is non-normative unless restated as a requirement.

## Context

### Problem

In one sentence: **Settings → Change Passcode updates in-memory state only,
so the new PIN works this session while the real login credential (local
`master_users` hash + server bcrypt) still expects the old PIN — confirmed by
user repro (new PIN unlocks now, old PIN survives restart/re-login).**

### Evidence (verified read-only, this tree)

- `app/(tabs)/settings.tsx:151-185` — `handleChangePasscode` ends at
  `:174` with `setPasscode(next)` only. No storage write, no hash, no
  `master_users` update, no `fetch`/`authFetch` call.
- `context/PasscodeContext.tsx:18-42` — pure `useState`, defaults
  `false / null / false`. No hydration, no `secureStorage`/`AsyncStorage`.
  Cold start always resets; `_layout.tsx:207`
  (`if (isPasscodeEnabled && !isUnlocked)`) therefore cannot gate a restart.
- `app/(tabs)/settings.tsx:1449-1595` — dialog branches on `passcode` while
  the entry button (`:1201-1219`) branches on `isPasscodeEnabled`
  (divergence risk). Step-2 disable (`:1581`) checks length + match but not
  `new !== current`, while the handler (`:164-167`) rejects same-as-current
  late (SPEC-24 CON-04/CON-06 gap).
- `utils/db.ts:261-273` — `addUser` stores SHA256 in `master_users`;
  `app/login.tsx:67-72` verifies against that hash. Change PIN never touches
  it, so local login still expects the old PIN.
- Cloud credential: `POST /auth/register` (`app/register.tsx:74`),
  `POST /auth/login` (`app/login.tsx:135`). No update endpoint is called by
  the dialog. Server half now exists and is merged
  (`POST /api/auth/change-passcode`, wallet_API SPEC-API-01 FINAL v1.0:
  `protect` → `validate(changePasscodeSchema)` → bcrypt-verify-current (401
  `'Current PIN is incorrect'`) → bcrypt-hash-new → `updatePasscode` +
  rotate `currentSessionId` → 200 message-only; changer JWT keeps working).
- 401 path (reused, not changed): `utils/apiClient.ts:79-85` clears auth
  storage and fires `onAuthFailure('session_ended')`; nav guard
  (`app/_layout.tsx:167-177`) creates the persisted "Session Ended" alert
  before redirect (SPEC-05 CON-MD-01/04). Enforcement gap: server `protect`
  checks JWT + user-exists only, so rotation alone does not 401 other
  devices (wallet_API SPEC-API-01 CON-API-08). True multi-device logout
  needs SPEC-API-02.

### Notes (informative)

- Mobile and web share the identical broken change path (no `Platform.OS`
  branch). Fallout differs only by login path: mobile falls back to the
  local hash; web is server-only (`app/login.tsx:81-83`) and API-direct
  (SPEC-36), so the new PIN fails at next server login on both.
- `verifyPinForSync` / Clear Data / Delete Account verify against server +
  `master_users` (`settings.tsx:256,619,849` + `:638-646,:869-873`). All
  three layers must converge post-change or those flows lock the user out.

## Constraints

- **CON-01 — Bare-minimum diff (§1.11).** Only the change-PIN write path,
  lock hydration/persistence, `master_users` re-hash on change, and the
  Cloud endpoint branch MAY change, plus test/journal files named in D-*.
  No refactoring, no copy/styling changes beyond the strings named here.
- **CON-02 — No new dependencies (§1.12).** No npm packages, native
  modules, or new libraries. Existing imports only (`secureStorage`,
  `authFetch`, `expo-crypto`, `NetworkContext`).
- **CON-03 — Cloud change is online-gated (fail-closed).** A Cloud-account
  PIN change MUST NOT proceed while offline and MUST NOT be queued. The
  dialog MUST disable the save action offline and show the CON-09 copy.
  Rationale: only the server can `bcrypt.compare` the current PIN, and a
  queued credential change bypasses the server 20/15min/IP throttle and
  creates split-brain (new PIN locally, old PIN on server).
- **CON-04 — Local change is fully offline.** A Local-only account change
  MUST succeed with zero API calls (re-hash + persist lock). It MUST NOT
  hit `/system/health` or any `/api/*` route (SPEC-04 CON-05 probe rule).
- **CON-05 — Lock persists hashed, per user, cleared on logout.** The
  app-lock MUST survive restarts via the existing `secureStorage`
  (SecureStore with AsyncStorage fallback) under a per-user key; it MUST
  store a SHA256 hash (same `expo-crypto` call as `addUser`), never
  plaintext; it MUST hydrate before the `_layout.tsx:207` gate can fire;
  it MUST be cleared on logout/session-end alongside `authToken`. Key
  addition + rollback (remove key) ships in this spec per §1.4.
- **CON-06 — All three layers converge on success.** On success the
  implementation MUST update every layer that exists for that account:
  (a) persisted lock (CON-05), (b) local `master_users` hash (native mirror,
  so login/Clear/Delete verification agree), (c) server bcrypt via
  `POST /api/auth/change-passcode` (Cloud only). Partial writes MUST be
  reported as failure, never as success.
- **CON-07 — Changer stays logged in.** A successful change MUST preserve
  `authToken` + `activeUserId` on the changing device (server CON-API-05).
  It MUST NOT log the changer out.
- **CON-08 — Eventual-logout semantics (stated limit).** "Other devices get
  logged out" MEANS 401-on-next-online-call → existing SPEC-05
  session-ended alert → Login. An offline device is NOT counted as logged
  out until its first online call. This spec MUST NOT add polling, push, or
  any new endpoint to chase offline devices. True immediate kill needs
  SPEC-API-02 (server `protect` session enforcement); until then the app
  MUST keep its 401 `session_ended` path byte-identical.
- **CON-09 — Copy (exact).** Offline Cloud save disabled with
  `"Connect to change your Cloud PIN."`; success:
  `"Passcode changed — other devices will be signed out when next online."`;
  wrong-current on Cloud surfaces the server copy
  `'Current PIN is incorrect'`; 429 surfaces `"Too many attempts, try again
  later"` without breaking the dialog.
- **CON-10 — Validation parity.** Step-2 save MUST remain disabled until
  new is 4 digits AND confirm matches AND new differs from current (closes
  the SPEC-24 CON-04/CON-06 late-error gap). Dialog and entry button MUST
  branch on the same source (kills the `passcode` vs `isPasscodeEnabled`
  split).
- **CON-11 — Cross-platform invariant (§1.5).** Android + iOS + Web keep
  working. No native-only static imports; `Platform.OS` branches only where
  named. Web follows SPEC-36 (API-direct, no local seeding implications
  beyond the `master_users` mirror update already owned by login/register).
- **CON-12 — Expo Go safe (§1.7) / Vercel-deployable (§1.6).** Nothing may
  crash Expo Go on import; web export clean; `EXPO_PUBLIC_*` only.
- **CON-13 — TDD with cross-platform coverage (§1.10).** `jest`
  parameterized by `Platform.OS` (`android`/`ios`/`web`, source-text guards
  per repo precedent where screens cannot render) for checkable branches,
  plus user-run manual matrix for native/UI paths jest cannot prove. No
  platform-only behavior without its CON + ACC + D.

## Goal

### Interaction matrix

| Account \ Connectivity | Online | Offline |
|---|---|---|
| **Local-only** | Change succeeds locally (re-hash + persist, zero API calls) | Change succeeds locally (same — CON-04) |
| **Cloud** | Verify + update via `POST /api/auth/change-passcode` (CON-03/06), changer stays in (CON-07) | Save disabled + CON-09 offline copy (CON-03, no queue) |

### Decisions

- **DEC-01 (DECIDED — user call):** Cloud change requires online (fail-closed, never queued).
- **DEC-02 (DECIDED — user call):** App-lock persists, hashed per user (CON-05), not plaintext.
- **DEC-03 (RECOMMENDED — user said "proceed with recommended"):** Changer stays logged in (CON-07); others get eventual logout via 401 (CON-08). If the user overrides to changer-out, this spec is void and needs a server-contract amendment (SPEC-API-01 v1.1) first.
- **DEC-04 (DECIDED — user call):** Multi-device clause ships in this spec as eventual-logout; immediate-kill enforcement is SPEC-API-02's scope (server `protect` session-claim work). Single-device acceptance is shippable before SPEC-API-02.
- **DEC-05 (DECIDED):** Server is source of truth for Cloud current-PIN correctness (401 copy wins); any local pre-check is format-gating only.

### Acceptance

Objective (machine-checkable):

| ID | Android | iOS | Web | Check |
|----|---------|-----|-----|-------|
| ACC-01 | ✅ | ✅ | ✅ | Change path writes persisted lock hash + `master_users` re-hash (Local) / + `POST /api/auth/change-passcode` via `authFetch` (Cloud); no `setPasscode(plaintext)`-only path remains (source-text guard) |
| ACC-02 | ✅ | ✅ | ✅ | Cloud save disabled offline with exact CON-09 copy; zero `/api/*` calls issued offline (source-text + jest `Platform.OS` cases) |
| ACC-03 | ✅ | ✅ | ✅ | Step-2 save disabled until 4-digit + match + differs-from-current (CON-10); dialog/entry branch on same source |
| ACC-04 | ✅ | ✅ | ✅ | Wrong-current Cloud maps server 401 copy; 429 maps CON-09 copy; partial writes never report success |
| ACC-05 | ✅ | ✅ | ✅ | Lock hydrates before gate, clears on logout/session-end; stores hash never plaintext (source-text guard) |
| ACC-06 | ✅ | ✅ | ✅ | 401 `session_ended` path byte-identical (SPEC-05 flow untouched — enforcement arrives via SPEC-API-02) |
| ACC-07 | ✅ | ✅ | ✅ | `npm test` 0 failed; `npm run lint` 0 errors/0 warnings; `npx tsc --noEmit` 0 errors; no dependency/storage-key/route/contract change beyond the CON-05 key + rollback note |

Subjective (reviewer-observed):

- **ACC-S01 (Local, mobile):** Change PIN → restart → old PIN fails login, new PIN succeeds; app-lock asks on launch.
- **ACC-S02 (Cloud, mobile + web):** Change PIN online → logout → old PIN 401s, new PIN logs in; success copy exact (CON-09).
- **ACC-S03 (Cloud, offline):** Airplane mode → save disabled + offline copy; zero API calls; no state changed.
- **ACC-S04 (multi-device, post-SPEC-API-02):** Change on device A → device B's next sync 401s → "Session Ended" alert persists → Login. Pre-SPEC-API-02, device B stays valid (stated limit, not a failure of this spec).

## Deliverables

- **D-01 (`context/PasscodeContext.tsx` + `utils/secureStorage.ts` usage):** hashed per-user persist + hydrate-before-gate + clear on logout/session-end (CON-05). Nothing else in these files.
- **D-02 (`utils/db.ts` change path only):** re-hash `master_users` entry on PIN change (same SHA256 call as `addUser`); web mirror semantics preserved.
- **D-03 (`app/(tabs)/settings.tsx` change dialog only):** online-gated Cloud branch (`authFetch('auth/change-passcode')`, CON-03/06/07/09) + Local offline branch (CON-04) + validation parity + single-source branching (CON-10).
- **D-04 (tests under `utils/`):** ACC-01..06 across `android`/`ios`/`web` (source-text guards per precedent + `Platform.OS`-parameterized branches).
- **D-05 (user-run matrix):** ACC-S01..S04 (mobile Expo Go + web export).
- **D-06 (`docs/savepoint.md` + `AGENTS.md` §3 entry):** journal update per §1.8. Status flips to FINAL only on explicit user call.

## Glossary

- **Three layers:** (a) persisted app-lock hash, (b) local `master_users` SHA256, (c) server bcrypt. Convergence = all present layers agree post-change.
- **Fail-closed:** Cloud change refuses while offline (no queue).
- **Eventual logout:** other devices 401 on their next online call, then SPEC-05 flow.
- **SPEC-API-02:** server follow-up owning `protect` session-claim enforcement (not this spec).

## References

- `app/(tabs)/settings.tsx:151-185,1201-1219,1449-1595` · `context/PasscodeContext.tsx:18-42` · `utils/secureStorage.ts` · `utils/db.ts:257-273` · `app/login.tsx:67-83` · `app/register.tsx:38-90` · `utils/authMode.ts` · `utils/apiClient.ts:53-117` · `app/_layout.tsx:167-177,207` · `context/NetworkContext.tsx` · `utils/notifications.ts:348-360` (session alert) · `app/passcode-screen.tsx:29-38`
- `specs/24-passcode-refactor-and-modal-flow.md` (dialog validation) · `specs/05-multi-device-behavior.md` (401 → Session Ended flow, reused unchanged) · `specs/04-connection-status-vs-offline-mode.md` (Local probe + mode rules) · `specs/36-web-platform-invariants.md` (web API-direct) · `specs/30-force-reauth-on-cold-start.md` (cold-start vs web refresh) · `specs/40-authfetch-envelope-unwrap.md` (envelope unwrap — new endpoint MUST return a shape that passes through untouched)
- wallet_API `specs/01-change-passcode-endpoint.md` FINAL v1.0 (server half, merged) · SPEC-API-02 (server session-enforcement follow-up, owns immediate kill)
