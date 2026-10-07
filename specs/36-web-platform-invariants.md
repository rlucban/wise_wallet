# Spec 36: Web Platform Invariants (Always-Online, Never-Local, API-Direct Persistence)

| Field | Value |
|---|---|
| ID | SPEC-36 |
| Title | Web Platform Invariants (Always-Online, Never-Local, API-Direct Persistence) |
| Status | **FINAL v1.2** (session-identity exception per 2026-10-04 user call — implementable) |
| Owner | User (final authority) |
| Version | 1.2 |
| Scope | Web-only branches: connection-status reporting (hard Online pin), account-mode availability (never Local + legacy force-migrate), API-direct persistence rule, web-row rule for credential-change callers |
| Non-goals | Any native (Android/iOS) behavior change; `autoBackup`/sync-state semantics (a separate dimension — explicitly out of this spec); offline-capable PWA/caching; new dependencies, storage keys, routes, or API contract changes |
| Normative source | This file. Amends SPEC-04 v1.4 on web only, with supersession lines recorded below (SPEC-34-over-33 precedent). |

> History: drafted 2026-10-03 as v0.1 (always-online / never-local / always-auto-backup).
> Corrected 2026-10-04 per user call: the spec is about offline(LOCAL) vs
> online(API-CONNECTED) only — `autoBackup` never belonged here (CON-W-03/D-W-03/
> DEC-W3/ACC-W-03 deleted, no renumbering debt left behind). Web model decided:
> web persists API-direct always, the flag guards nothing, localStorage is not a
> store. FINAL v1.0 per user call (`DEC-W1` A, `DEC-W2` C).
> Widened 2026-10-04 to v1.1 per user call (Option B): D-W-03/ACC-W-03 cover reads
> as well as writes — web never reads the on-device store either. Narrow
> flag-gate plan discarded (it left false-positive reads intact).
> Amended 2026-10-04 to v1.2 per user call: session-identity keys (`activeUserId`,
> `authToken`, `lastActiveUserId`) MAY be read on web — user data still never.
> Session MUST be verified by an authenticated call; 401 clears it (existing
> `authFetch` path). S1/S2 slices deleted (no `secureStorage`/`AuthContext` change).

## Terminology (RFC 2119)

The keywords **MUST**, **MUST NOT**, **SHOULD**, and **MAY** in this spec are
to be interpreted as described in RFC 2119. Informative prose (examples,
"today", "currently") is non-normative unless restated as a requirement.

## 1. Context

### 1.1 Problem

In one sentence: **on web, the app can report Offline and offer Local-only operation on a platform whose localStorage is clearable and untrustworthy — producing false-positive reads presented as truth.**

Online means connected to the API, full stop. Offline means local-only. Sync/
`autoBackup` state is a different dimension and is not governed here.

### 1.2 Current behavior (non-normative)

- SPEC-04 v1.4: web offers no *new* Offline accounts (register/login), but pre-existing web Local accounts log in and may Make Online at will.
- A web session can report Offline mid-session (`OfflineIndicator`, settings Offline status, login offline strip) after loading fine.
- Web mutations consult the `autoBackup` flag and persist to localStorage-backed AsyncStorage — reads that may be stale, partial, or cleared.

### 1.3 Invariants (decided)

1. **Web is always Online** — connection status on web reads Online unconditionally (`DEC-W1` hard pin: probe skipped, Offline UI unreachable). API failures surface openly at the call site, never as a status and never as stored-local.
2. **Web is never Local** — no Local creation (already true) plus forced migration for pre-existing web Local accounts (`DEC-W2`).
3. **Web persists API-direct** — every web mutation goes to the API; the `autoBackup` flag is ignored on web; localStorage is not a store.

## 2. Constraints (normative)

- **CON-W-01 — Pinned Online (hard).** On `Platform.OS === 'web'`, connection status MUST read Online. The health probe MUST be skipped on web (not run-and-discarded). `OfflineIndicator`, the settings Offline status/`Check` affordance, and the login offline notice MUST be unreachable on web. Every API call's own failure handling (gated copy, zero-write fallbacks) remains the safety net for mid-session drops — nothing new is built for them.
- **CON-W-02 — Never Local, legacy force-migrated.** Web MUST offer no Local creation or Local fallback creation (extends v1.4, which already holds). Pre-existing web Local accounts MUST force Make Online at next login: one-time local→API migration, then the account is an ordinary online account. Grandfathering (serving untrusted reads) and login-blocking (data loss) are rejected.
- **CON-W-03 — API-direct persistence.** On web, mutations MUST be issued to the API and MUST NOT depend on localStorage/AsyncStorage as a source of truth. The `autoBackup` value MUST NOT gate, alter, or be written by web persistence paths — on web the flag is meaningless (there is no local store to back up *from*). An unreachable API MUST fail openly with zero local writes. Exception: session-identity keys (`activeUserId`, `authToken`, `lastActiveUserId`) MAY be read on web to restore the claimed session; the session MUST then be verified by an authenticated API call, and any 401 MUST clear the session and route to login via the existing `authFetch` 401 path. Second exception (user call 2026-10-07): the app-lock PIN hash key `user_{id}_passcode` MAY be persisted via the existing `secureStorage` web fallback; this is a client-side unlock gate, not user data, and it is NOT a substitute for the API session check — real authentication on web remains the JWT verified on every POST/GET. No other key MAY join this exception.

> CON-W-03 second-exception amendment per user call 2026-10-07 (SPEC-58 lock half).
- **CON-W-04 — Native untouched + caller web row.** Android/iOS behavior MUST be byte-identical (SPEC-04 incl. v1.4). This spec supersedes SPEC-04 v1.4's "existing web locals keep login" (replaced by force-migrate). Any credential-change feature (e.g. PIN change) MUST conform to the §3.2 web row — on web it always attempts the endpoint and relies on call-failure handling, never on an offline gate.
- **CON-W-05 — No new machinery.** No new dependencies, storage keys, routes, or API contract changes. Enforcement reuses `Platform.OS` branches and existing settings/plumbing.

## 3. Goal & Acceptance Criteria

### 3.1 Decisions (closed at FINAL)

- **DEC-W1 — Pin hardness: A (hard pin).** Skip probe on web, never render Offline UI. Rationale: fewer branches; call-failure handling already covers drops.
- **DEC-W2 — Pre-existing web Local accounts: C (force Make Online).** One-time migration at next login. Rationale: grandfathering serves untrusted reads; blocking destroys device-only data.
- **DEC-W3 — WITHDRAWN.** Pre-existing Cloud-OFF handling belonged to the `autoBackup` dimension, which is out of this spec (see History).

### 3.2 Interaction matrix (normative)

| Web state | Effective behavior |
|---|---|
| Any session, any network | Connection reads Online; no Offline UI ever |
| Register / login "create offline" paths | Absent on web (already true) |
| Pre-existing Local login on web | Forced Make Online migration, then online-only |
| Web mutation, any flag value | Issued to the API; flag ignored; unreachable API fails openly, zero local writes |
| Authenticated credential-change call on web | Always attempts the endpoint; 401/failure handling per that feature's spec, never an offline-gated copy for connectivity reasons |

### 3.3 Platform matrix (per AGENTS.md §1.10)

| Platform | Objective (machine-checkable) | Subjective (reviewer-observed) |
|---|---|---|
| Web | `ACC-W-01`..`04` under `Platform.OS = web` mock: status pinned Online with probe stubbed to throw, no Local creation path, force-migrate on legacy login, API-direct writes regardless of flag | Reviewer loads web build: no offline banner ever, no Offline-mode buttons, no local-only persistence path, export still offered |
| Android | `ACC-W-05`: behavior byte-identical (all existing SPEC-04 native tests re-run green) | Reviewer in Expo Go confirms zero web-only UI leaking onto native |
| iOS | Same as Android | Same as Android |

### 3.4 Acceptance criteria

- **ACC-W-01 (pinned Online):** with `Platform.OS = web`, status selector returns Online with the probe module stubbed to throw — Offline UI components receive no Offline state.
- **ACC-W-02 (never Local + force-migrate):** web register/login sources contain no reachable Local-creation call (source-text guard); a legacy web Local login routes into Make Online migration before normal use.
- **ACC-W-03 (full API-direct):** web mutations issue the API call regardless of the stored `autoBackup` value with zero localStorage writes; web screens load from the API with zero AsyncStorage reads of user data on web (lists, profile, settings, flags); session-identity reads allowed but verified-or-logged-out; unreachable API yields open failure with zero local writes.
- **ACC-W-04 (caller conformance):** credential-change callers on web issue the endpoint call (never an offline-gated copy for connectivity reasons); call-failure paths per the caller's own spec unchanged.
- **ACC-W-05 (native regression):** full existing jest suite green with no web-branch leakage; `npm run lint` 0/0 (user-run).
- **ACC-W-06 (subjective):** reviewer on web export + Expo Go native confirms §3.3 right column.

## 4. Deliverables (one file / one layer at a time; stop after each for review)

- **D-W-01 (connection pin):** hard web branch per `DEC-W1` (`NetworkContext` probe skip + status selector + `OfflineIndicator`/settings/login gates).
- **D-W-02 (mode gate + force-migrate):** web Local handling per `DEC-W2` (creation paths already absent — verify + guard with tests; legacy-login migration trigger).
- **D-W-03 (full API-direct, re-sliced):** web read AND mutation paths per CON-W-03 (reads from API, zero AsyncStorage reads/writes on web, flag ignored, fail-open) — file list per the re-slice scan + `ACC-W-03` coverage.
- **D-W-04 (caller conformance):** web-row behavior of credential-change callers proven by `ACC-W-04`.
- **D-W-05 (tests):** jest `Platform.OS`-parameterized web cases + native regression re-run; user-run web-export + Expo Go matrix.
- **D-W-06 (docs):** `docs/savepoint.md` + `AGENTS.md §3` entries.

## 5. Glossary

- **Pinned:** hardcoded by platform branch, not sampled — web connection is asserted Online, never probed-into-Offline.
- **Hard pin:** the probe is skipped on web (not run-and-discarded); no Offline UI can render.
- **Force-migrate:** a legacy Local account is routed into Make Online at next login — one-time local→API migration, then online-only.
- **API-direct:** web persistence issued straight to the API with no local store in the path.
- **Fail-open:** an unreachable API surfaces the failure at the call (gated copy / error), never stored locally, never a status.
- **False positive (localStorage read):** serving clearable/stale/partial local data as if it were truth.

## 6. References

- `specs/04-connection-status-vs-offline-mode.md` (FINAL incl. v1.4 — amended on web only per §2)
- PIN-change dialog (external: `spec-change-pin` worktree SPEC-35 — informative only, not normative here)
- `context/NetworkContext.tsx` (probe + status), `app/_layout.tsx` (`OfflineIndicator`), `utils/authMode.ts` (`isLocalAccountToken`)
- `app/register.tsx` + `app/login.tsx` (mode availability, legacy local paths), `app/(tabs)/settings.tsx` (Make Online flow, sync UI)
- Plan run file `20261004-0000-spec36-web-passcode.md` (scope correction + web-model decision record)
- `docs/savepoint.md`, `.agents/rules/wisewallet.md` (journal + status protocol)
