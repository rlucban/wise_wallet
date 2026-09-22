# Spec 04: Connection Status vs Offline (Local-Only) Account Mode

| Field | Value |
|---|---|
| ID | SPEC-04 |
| Title | Connection Status vs Offline (Local-Only) Account Mode |
| Status | **FINAL** (2026-09-21 per user call) |
| Owner | User (final authority) |
| Version | 1.3 — review polish (stale cites fixed, retry/queue/plumbing tightened, same normative intent) |
| Scope | Account mode, connection status, sync gating, login fallback, Make Online upgrade |
| Non-goals | Cloud→Local downgrade (explicitly out of scope); new storage engine; new API contract |
| Normative source | This file. `AGENTS.md §4` is a pointer only. File+symbol cites are normative; `:line` numbers are hints only. |

> History: moved out of `AGENTS.md §4` on 2026-09-21; reformatted to
> Context / Constraints / Goal / Deliverables on 2026-09-21; polished with
> metadata, RFC 2119 keywords, and numbered requirements on 2026-09-21;
> review polish 1.3 on 2026-09-21 (same normative intent — implement exactly this).

## Terminology (RFC 2119)

The keywords **MUST**, **MUST NOT**, **SHOULD**, and **MAY** in this spec are
to be interpreted as described in RFC 2119. Informative prose (examples,
"today", "currently") is non-normative unless restated as a requirement.

## 1. Context

### 1.1 Problem

The codebase conflates two independent axes under the word "offline":

- `settings.tsx` shows **"Local Profile (Offline)"** for a no-cloud account.
- `SyncStatusCard` shows **"Offline"** for no-network *and* **"Backup Disabled"**
  for auto-backup-off.
- Login silently falls back to local auth on network failure
  (`login.tsx:188-193` — `else` + `catch` both call `attemptLocalLogin`), so a
  *transient network blip* and a *deliberate no-cloud account* look identical
  to the user.

The two axes MUST be modeled, named, and displayed as separate concepts.
Users MUST NOT be confused between offline/online (mode/connection) and
auto-backup (sync toggle).

### 1.2 Definitions

**A. Connection status — transient, device-level, automatic.**

- States: `Online` | `Offline`. Nothing else. The user cannot set it; it is
  sampled (app foreground, manual retry, cache).
- Source of truth, split by account mode:
  - **Cloud accounts:** `NetworkContext.checkHealth()` —
    `GET {API_URL}/system/health`, 3s abort timeout, 30s cache TTL.
    `online = response.ok || status ∈ {404, 405}`; any throw/timeout → offline.
  - **Local accounts:** device connectivity only
    (`navigator.onLine` / `expo-network`) — zero API pings, even for the
    reachability probe.
- UI surface today (non-normative): `OfflineIndicator` banner in `_layout.tsx`
  only. `useCloudLink.ts` currently runs a second, separate 2s health check.

**B. Account mode — persistent, per-account, chosen by the user at registration.**

- Modes: `Cloud` ("Online") | `Local` ("Offline"). The user picks explicitly on
  the Register screen via an Online/Offline mode selector (replacing the
  current email-format inference).
- "Offline mode" = **Local account**: created by selecting **Offline** at
  registration (`register.tsx`), or via the "Create Offline Account" dialog
  (`login.tsx:75-102`) — local UUID id, `login(id, "offline_token")` (or
  `"local_token"` on local re-login, `login.tsx:67,172`).
- `autoBackup = false` is the **initial** value for Local accounts, but it is
  **not** the mode indicator. The switch is always shown: on Local, toggling ON
  routes to the Make Online workflow; on Cloud it is a plain sync toggle.
- Feature-identical to Cloud: same screens, same validation, same 10M limits.
  Only sync behavior and account-management surfaces differ.
- Storage: AsyncStorage only, same repository layer and same
  `user_{userId}_{entity}` key namespacing (`storage.ts:getPrefixedKey`) as
  Cloud — no separate storage engine. AsyncStorage is the *only* copy; no
  cloud mirror.

## 2. Constraints (normative)

- **CON-01 — Single mode selector.** The implementation MUST add
  `isLocalAccount()` (Auth data + profile), true iff
  `token ∈ {"offline_token","local_token"}`. An explicit stored mode flag MAY
  replace the token test only if it ships with a defined storage key,
  migration, and rollback per CON-07 — otherwise token-only. It MUST NOT use
  `autoBackup == false` alone as a mode test. All gating (writers, banners,
  settings copy) MUST use `isLocalAccount()`; the three known single-token
  checks MUST be expanded to both tokens: `CloudLinkBanner` token guard,
  `useCloudLink` token guard, `login.tsx` focus guard.
- **CON-02 — Data sync vs auth split.** `autoBackup` MUST gate data sync only
  (`TransactionsContext:154-193`, `useSavings:103-138`, `useDues:72-107`,
  `CategoriesContext:65-81`):
  - Local accounts MUST NOT issue data calls (`authFetch` for entities) and
    MUST NOT issue API probe calls.
  - Cloud accounts with `autoBackup = false` MUST NOT issue data sync calls,
    but MAY still issue auth/session calls and the `checkHealth()` probe. OFF
    means "sync off", NOT "disconnected".
- **CON-03 — Independence and upgrade-only.** Connection status MUST NOT change
  account mode and vice versa. Toggling auto-backup OFF MUST NOT convert a
  Cloud account to Local. Once Cloud always Cloud; Local MAY become Cloud via
  §4-D-07 only. Cloud→Local downgrade is out of scope (Clear Data / new
  account only, not part of this spec). The Make Online upgrade dialog
  (§4-D-07) MUST notify the user that the upgrade is permanent and cannot be
  reverted to Local-only before the user confirms.
- **CON-04 — Copy rule.** The word "offline" (and cloud-off icons) is reserved
  for connection status. Local accounts MUST be labeled **"Local-only account"**
  with a device/phone icon:
  - `settings.tsx` profile subtitle MUST read
    `"Local-only account — stored on this device"`;
  - `SyncStatusCard` MUST show `"Local-only"` (neutral color) when
    `isLocalAccount()`, and `"Sync off"` (neutral, still Cloud — MUST NOT use
    red `error`, MUST NOT say "Local-only") for Cloud + `!autoBackup`. Red
    `error` is reserved for problems;
  - the offline banner keeps the cloud-off icon + "You're offline…" copy.
  `auto-backup` vocabulary MUST describe the sync toggle only, never the mode.
- **CON-05 — Probe rule.** Local accounts MUST make zero API calls including
  probes (device connectivity only). Cloud accounts (even with auto-backup OFF)
  MAY use the `checkHealth()` probe.
- **CON-06 — Login retry rule.** On network failure the login flow MUST attempt
  at most 3 total tries (initial + up to 2 retries) with per-try 3s abort
  (reuse `PING_TIMEOUT`) and backoff ~500ms then ~1500ms, then show a transient
  non-blocking notice on the Login screen
  ("No connection — checking this device…", auto-dismiss, MUST NOT be a
  blocking Dialog) distinct from the Local-account offer, before local lookup.
- **CON-07 — Standing repo invariants (AGENTS.md §1).** The implementation MUST
  keep Android + iOS + Web working (`Platform.OS`/`select`; MUST NOT statically
  import a native-only module at file top level — Expo Go MUST NOT crash on
  import); MUST keep web Vercel-deployable (`EXPO_PUBLIC_*` only, no Node APIs
  in app code, no secrets in bundle); and MUST NOT introduce breaking changes
  to storage keys (`user_{id}_*`), the `wallet-api` contract, AsyncStorage
  shapes, routes, or native deps unless this spec requires them (any migration
  MUST note rollback).

## 3. Goal

Separate the two axes in model, naming, and display per the matrix below.

| Account | autoBackup | Connection | Writes go to | Cloud calls | Banner / status |
|---|---|---|---|---|---|
| Cloud | ON | Online | AsyncStorage + API (queue drains) | data + auth + probe | none (or "All synced") |
| Cloud | ON | Offline | AsyncStorage; queue grows | none attempted | `OfflineIndicator` banner; status "Offline" + pending count |
| Cloud | OFF | Online/Offline | AsyncStorage only (data); queue paused, MUST NOT grow | auth + probe only, no data sync | no offline banner; status "Sync off" (still Cloud) |
| Local | OFF (initial) | Online (device) | AsyncStorage only | none (zero API) | `CloudLinkBanner` ("Link to cloud…"); status "Local-only" |
| Local | OFF (initial) | Offline (device) | AsyncStorage only | none (zero API) | Both banner and "Local-only" may show — both true, no contradiction |

Resolved decisions (FINAL per user call 2026-09-21):

- DEC-01: reachability probe for Local accounts = device connectivity only.
- DEC-02: login fallback = retry (≤3, throttled) + transient notice, then local lookup.
- DEC-03: Cloud→Local downgrade explicitly out of scope.

### Acceptance criteria

- **ACC-01:** an airplane-mode Cloud account shows the offline banner, queues
  writes, drains on reconnect, and is never offered "create offline account".
- **ACC-02:** a Local account on Wi-Fi makes zero API calls (device
  connectivity only — verify via proxy/log).
- **ACC-03:** a Cloud account with auto-backup OFF stays Cloud, remains
  auth-capable, is labeled "Sync off", and is never labeled
  "Local-only"/"Offline".
- **ACC-04:** no screen uses the word "offline" for a Local account.
- **ACC-05:** login performs at most 3 total tries (3s abort each; ~500ms /
  ~1500ms backoff) before the transient non-blocking offline notice.
- **ACC-06:** after a successful Make Online upgrade, `isLocalAccount()`
  returns false, auto-backup is true, the "Make Online" button does not
  appear, and the account is permanently Cloud (no downgrade path).

## 4. Deliverables

- **D-01 — Register mode selector** (replaces email-format inference):
  Online → `POST {API_URL}/auth/register`; on success `autoBackup = true`,
  JWT stored (Cloud). Offline → `createLocalAccount` with no network call:
  local UUID → `addUser` → `saveUserProfile` → `initDb` →
  `autoBackup = false` (initial) → `login(id, "offline_token")`. Online chosen
  but unreachable → "Cloud Unreachable" dialog offering "Create Offline
  Account" (keep `register.tsx:81-96`).
- **D-02 — `isLocalAccount()`** per CON-01 with all gating rerouted through it,
  including both-token handling in `CloudLinkBanner`, `useCloudLink`, and the
  `login.tsx` focus guard.
- **D-03 — Writer gating** per CON-02 (`TransactionsContext`, `useSavings`,
  `useDues`, `CategoriesContext`).
- **D-04 — Connection plumbing:** delete the second 2s `Promise.race` check in
  `useCloudLink.ts`; end-state: Cloud routes through `checkHealth()` (3s abort,
  30s cache) only, Local uses device connectivity only with
  `isVisible = isLocalAccount() && deviceOnline` and zero `fetch`;
  `OfflineIndicator` remains the sole connection banner in `_layout.tsx`.
- **D-05 — Settings + status copy** per CON-04: switch always shown (Local ON →
  Make Online workflow; Cloud = sync toggle); `SyncStatusCard` and subtitle
  copy as specified.
- **D-06 — Login flow** per CON-06: at most 3 tries (3s abort; ~500ms/~1500ms
  backoff) → transient non-blocking "No connection — checking this device…"
  notice → `attemptLocalLogin` (`login.tsx`); known PIN → `"local_token"`;
  unknown → "Create Offline Account" dialog.
- **D-07 — Make Online upgrade (only direction):** single Settings flow
  reachable from Settings "Make Online", Local switch ON, `CloudLinkBanner`
  "LINK NOW", and the `useCloudLink` dialog (reroute away from `/login` /
  dead-end alert): confirmation dialog MUST warn the user that this upgrade
  is permanent and cannot be reverted to Local-only, and that auto-backup
  will be enabled → PIN verify → cloud register/login → conflict check →
  Merge (LWW) / Keep Local / Keep Cloud (reuse `settings.tsx` flow) → Cloud
  (`autoBackup = true`, JWT). After upgrade, `isLocalAccount()` MUST return
  false and the "Make Online" button MUST NOT reappear.

## Glossary

| Term | Meaning |
|---|---|
| Cloud account | Online-mode account with JWT; MAY sync data when `autoBackup` is ON |
| Local account | Offline-mode, Local-only account (`offline_token`/`local_token`); AsyncStorage only |
| Connection status | Transient device-level Online/Offline; never changes account mode |
| auto-backup | Data-sync toggle only; OFF on Cloud means "Sync off", still Cloud |
| Make Online | Upgrade flow Local → Cloud (PIN verify → register/login → conflict resolve) |

## References

- `AGENTS.md §1` — working agreements (spec-first, no CLI, invariants, docs).
- `context/NetworkContext.tsx` — `checkHealth()`; `app/_layout.tsx` —
  `OfflineIndicator`; `hooks/useCloudLink.ts`, `components/CloudLinkBanner.tsx`.
- `app/register.tsx`, `app/login.tsx`, `app/(tabs)/settings.tsx` (incl.
  `SyncStatusCard`), `context/UserProfileContext.tsx`, `types/index.ts`.
- Writers: `context/TransactionsContext.tsx`, `hooks/useSavings.ts`,
  `hooks/useDues.ts`, `context/CategoriesContext.tsx`.
