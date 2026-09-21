# Spec 04: Connection Status vs Offline (Local-Only) Account Mode

**Status: FINAL (2026-09-21 per user call) — implement exactly this; no Cloud→Local downgrade.**

> Moved out of `AGENTS.md §4` on 2026-09-21 per user request. Reformatted to
> Context / Constraints / Goal / Deliverables on 2026-09-21 per user request.
> This file is the normative spec. `AGENTS.md §4` is a pointer only.

## Context

The codebase conflates two independent axes under the word "offline":

- `settings.tsx` shows **"Local Profile (Offline)"** for a no-cloud account.
- `SyncStatusCard` shows **"Offline"** for no-network *and* **"Backup Disabled"**
  for auto-backup-off.
- Login silently falls back to local auth on network failure
  (`login.tsx:191-193`), so a *transient network blip* and a *deliberate
  no-cloud account* look identical to the user.

Two concepts, defined separately:

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
- UI surface today: `OfflineIndicator` banner in `_layout.tsx` only
  ("You're offline. Changes will sync automatically…"). `useCloudLink.ts`
  currently runs a *second, separate* 2s health check.

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
- **Feature-identical to Cloud**: same screens, same validation, same 10M
  limits. Only sync behavior and account-management surfaces differ.
- **Storage: AsyncStorage only**, same repository layer and same
  `user_{userId}_{entity}` key namespacing (`storage.ts:getPrefixedKey`) as
  Cloud — no separate storage engine. AsyncStorage is the *only* copy; no
  cloud mirror.

## Constraints

1. **Single selector.** Add `isLocalAccount()` (Auth data + profile): true iff
   `token ∈ {"offline_token","local_token"}` (or an explicit stored mode flag
   if introduced — same semantics). **Never** `autoBackup == false` alone: a
   Cloud account with auto-backup OFF stays Cloud. All gating (writers,
   banners, settings copy) uses it — never raw string compares scattered
   across files (today: `CloudLinkBanner:16`, `useCloudLink:42`, `login.tsx:21`).
2. **Data sync vs auth split.** `autoBackup` gates **data sync only**
   (`TransactionsContext:154-193`, `useSavings:103-138`, `useDues:72-107`,
   `CategoriesContext:65-81`):
   - **Local:** zero data calls (`authFetch` for entities never runs) and zero
     API probe calls (device connectivity only).
   - **Cloud with `autoBackup = false`:** no data sync calls, but auth/session
     calls and the `checkHealth()` probe are still allowed — OFF means
     "sync off", not "disconnected".
3. **Mode/connection independence + no downgrade.** Connection status never
   changes account mode and vice versa. Toggling auto-backup OFF never makes a
   Cloud account Local. **Once Cloud always Cloud; Local may become Cloud via
   upgrade only. No Cloud→Local downgrade** (only via Clear Data / new account,
   out of scope).
4. **Copy rule — never confuse offline/online with auto-backup.**
   `auto-backup` vocabulary describes the sync toggle only, never the mode.
   The word "offline" (and cloud-off icons) is reserved for connection status.
   Local accounts are called **"Local-only account"** with a device/phone icon:
   - `settings.tsx` profile subtitle → `"Local-only account — stored on this device"`
   - `SyncStatusCard`: `isLocalAccount()` → `"Local-only"`, neutral color;
     Cloud + `!autoBackup` → `"Sync off"` (still Cloud, neutral — not red
     `error`, not "Local-only"); red `error` is reserved for *problems*.
   - Offline banner keeps cloud-off icon + "You're offline…" copy.
5. **Probe rule.** Local accounts make zero API calls including probes
   (device connectivity only). Cloud accounts (even with auto-backup OFF) may
   use the `checkHealth()` probe.
6. **Login rule.** Up to **3 retries with throttling/backoff** on network
   failure, then a transient notice ("No connection — checking this device…")
   distinct from the Local-account offer, then local lookup.
7. **Standing repo invariants (AGENTS.md §1).** Android + iOS + Web keep working
   (`Platform.OS`/`select`, no static native-only imports — Expo Go must not
   crash on import); Vercel-deployable web (`EXPO_PUBLIC_*` only, no Node APIs
   in app code, no secrets in bundle); no breaking changes to storage keys
   (`user_{id}_*`), API contract (`wallet-api`), AsyncStorage shapes, routes,
   or native deps unless this spec requires them (any migration needs rollback
   noted).

## Goal

Separate the two axes in model, naming, and display so that:

| Account | autoBackup | Connection | Writes go to | Cloud calls | Banner / status |
|---|---|---|---|---|---|
| Cloud | ON | Online | AsyncStorage + API (queue drains) | data + auth + probe | none (or "All synced") |
| Cloud | ON | Offline | AsyncStorage; queue grows | none attempted | `OfflineIndicator` banner; status "Offline" + pending count |
| Cloud | OFF | Online/Offline | AsyncStorage only (data) | auth + probe only, no data sync | no offline banner; status "Sync off" (still Cloud) |
| Local | OFF (initial) | Online (device) | AsyncStorage only | none (zero API) | `CloudLinkBanner` ("Link to cloud…"); status "Local-only" |
| Local | OFF (initial) | Offline (device) | AsyncStorage only | none (zero API) | Both banner and "Local-only" may show — both true, no contradiction |

Resolved decisions (FINAL per user call 2026-09-21):

1. Reachability probe for Local accounts: **device connectivity only** — zero API calls.
2. Login fallback: **retry (≤3, throttled) + transient notice**, then local lookup.
3. Downgrade Cloud → Local: **explicitly out of scope**.

Acceptance:

1. Airplane-mode Cloud account shows offline banner, queues, drains on
   reconnect, never offers "create offline account".
2. Local account on Wi-Fi makes zero API calls (device connectivity only —
   verify via proxy/log).
3. Cloud with auto-backup OFF stays Cloud, still auth-capable, labeled
   "Sync off", never "Local-only"/"Offline".
4. No screen uses the word "offline" for a Local account.
5. Login attempts ≤3 throttled retries before the transient offline notice.

## Deliverables

1. **Register — explicit Online/Offline mode selector** (replaces
   email-format inference):
   - Online → `POST {API_URL}/auth/register`; on success `autoBackup = true`,
     JWT stored, Cloud account.
   - Offline → `createLocalAccount` with no network call: local UUID id →
     `addUser` → `saveUserProfile` → `initDb` → `autoBackup = false`
     (initial) → `login(id, "offline_token")`.
   - Online chosen but server unreachable → "Cloud Unreachable" dialog offering
     "Create Offline Account" (keep current `register.tsx:81-96` behavior).
2. **`isLocalAccount()` selector** (Auth data + profile) and reroute of all
   gating (writers, banners, settings copy) through it.
3. **Writer gating keeps `autoBackup` as data-sync switch** in
   `TransactionsContext`, `useSavings`, `useDues`, `CategoriesContext`;
   Cloud-OFF still allows auth/probe; Local performs zero API calls.
4. **Connection plumbing:** delete the second 2s health check in
   `useCloudLink.ts`; Cloud routes through `checkHealth()`, Local through
   device connectivity; `OfflineIndicator` remains the sole connection banner
   in `_layout.tsx`.
5. **Settings + status copy:** Auto-Backup switch always shown (Local ON →
   Make Online workflow; Cloud = sync toggle); `SyncStatusCard` shows
   "Local-only" vs "Sync off" per §Constraints-4; profile subtitle
   "Local-only account — stored on this device".
6. **Login flow:** ≤3 throttled retries → transient "No connection — checking
   this device…" notice → `attemptLocalLogin` (`login.tsx:55-104`); known PIN
   → `"local_token"`; unknown → "Create Offline Account" dialog.
7. **Make Online upgrade (only direction):** single Settings flow reachable
   from Settings "Make Online", Local switch ON, `CloudLinkBanner` "LINK NOW",
   and `useCloudLink` dialog (reroute away from `/login`/dead-end alert):
   PIN verify → cloud register/login → conflict check → Merge (LWW) / Keep
   Local / Keep Cloud (reuse `settings.tsx` flow) → Cloud (`autoBackup = true`,
   JWT).
