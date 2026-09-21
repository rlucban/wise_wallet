# Spec 04: Connection Status vs Offline (Local-Only) Account Mode

**Status: FINAL (2026-09-21 per user call) — implement exactly this; no Cloud→Local downgrade.**

> Moved out of `AGENTS.md §4` on 2026-09-21 per user request ("specs should be
> not in the AGENTS.md, create a folder for specs"). `AGENTS.md` now holds only
> a pointer. This file is the normative spec.

## 4.1 Problem statement

The codebase conflates two independent axes under the word "offline":

- `settings.tsx` shows **"Local Profile (Offline)"** for a no-cloud account.
- `SyncStatusCard` shows **"Offline"** for no-network *and* **"Backup Disabled"**
  for auto-backup-off.
- Login silently falls back to local auth on network failure
  (`login.tsx:191-193`), so a *transient network blip* and a *deliberate
  no-cloud account* look identical to the user.

They must be modeled, named, and displayed as separate concepts. Users must
never be confused between offline/online (mode/connection) and auto-backup
(sync toggle).

## 4.2 Definitions

**A. Connection status — transient, device-level, automatic.**

- States: `Online` | `Offline`. Nothing else.
- Source of truth, split by account mode (FINAL decision 2026-09-21):
  - **Cloud accounts:** `NetworkContext.checkHealth()` —
    `GET {API_URL}/system/health`, 3s abort timeout, 30s cache TTL.
    `online = response.ok || status ∈ {404, 405}`; any throw/timeout → offline.
  - **Local accounts:** device connectivity only
    (`navigator.onLine` / `expo-network`) — zero API pings, even for the
    reachability probe.
- The user cannot set it. It is sampled (app foreground, manual retry, cache).
- UI surface: `OfflineIndicator` banner in `_layout.tsx` only
  ("You're offline. Changes will sync automatically…"). No other screen may
  invent its own verdict — `useCloudLink.ts` currently runs a *second, separate*
  2s health check and must be deleted and routed through the split source above
  (Cloud → `checkHealth()`, Local → device connectivity).

**B. Account mode — persistent, per-account, chosen by the user at registration.**

- Modes: `Cloud` ("Online") | `Local` ("Offline"). The user picks explicitly on
  the Register screen via an Online/Offline mode selector (replacing the
  current email-format inference). **Once Cloud always Cloud; Local may become
  Cloud via upgrade (§4.5). There is no Cloud→Local downgrade** (only via
  Clear Data / new account, out of scope).
- "Offline mode" = **Local account**, defined as:
  1. Created by selecting **Offline** at registration (`register.tsx`), or via
     the "Create Offline Account" dialog (`login.tsx:75-102`) — local UUID id,
     `login(id, "offline_token")` (or `"local_token"` on local re-login,
     `login.tsx:67,172`).
  2. `autoBackup = false` is set **automatically** as the initial value for
     Local accounts, but it is **not** the mode indicator. The Auto-Backup
     switch is **always shown** (FINAL revision): on a Local account toggling
     it ON routes to the Make Online register workflow (§4.5); on a Cloud
     account it is a plain sync on/off toggle.
  3. **Feature-identical to Cloud**: same screens, same validation, same 10M
     limits. The *only* differences are sync behavior and account-management
     surfaces.
  4. **Storage: AsyncStorage only**, same repository layer and same
     `user_{userId}_{entity}` key namespacing (`storage.ts:getPrefixedKey`) as
     Cloud — there is no separate storage engine. "Uses AsyncStorage instead"
     means AsyncStorage is the *only* copy; no cloud mirror.

## 4.3 Normative rules

1. **Single selector.** Add `isLocalAccount()` (Auth data + profile): true iff
   `token ∈ {"offline_token","local_token"}` (or an explicit stored mode flag
   if introduced — same semantics). **Never** `autoBackup == false` alone:
   a Cloud account with auto-backup OFF stays Cloud. All gating (writers,
   banners, settings copy) uses it — never raw string compares scattered
   across files (today: `CloudLinkBanner:16`, `useCloudLink:42`,
   `login.tsx:21`).
2. **Data sync vs auth split.** `autoBackup` gates **data sync only**
   (`TransactionsContext:154-193`, `useSavings:103-138`, `useDues:72-107`,
   `CategoriesContext:65-81`):
   - **Local:** zero data calls (`authFetch` for entities never runs) and zero
     API probe calls (device connectivity only).
   - **Cloud with `autoBackup = false`:** no data sync calls, but **auth/session
     calls and the `checkHealth()` probe are still allowed** — OFF means
     "sync off", not "disconnected".
3. **Connection status never changes account mode**, and account mode never
   changes connection status. Toggling auto-backup OFF never makes a Cloud
   account Local. A Cloud account with no signal is still a Cloud account with
   queued sync; a Local account with full bars still syncs nothing.
4. **Copy rule:** do not confuse users with offline/online vs auto-backup.
   `auto-backup` vocabulary describes the sync toggle only, never the mode.
   The word "offline" (and cloud-off icons) is reserved for connection status.
   Local accounts are called **"Local-only account"** with a device/phone icon.
   Replacements:
   - `settings.tsx` profile subtitle → `"Local-only account — stored on this device"`
   - `SyncStatusCard`: `isLocalAccount()` → `"Local-only"`, neutral color;
     Cloud + `!autoBackup` → `"Sync off"` (stays Cloud, neutral — not red
     `error`, not "Local-only"); red `error` is reserved for *problems*.
   - Offline banner keeps cloud-off icon + "You're offline…" copy.

## 4.4 Interaction matrix (normative)

| Account | autoBackup | Connection | Writes go to | Cloud calls | Banner / status |
|---|---|---|---|---|---|
| Cloud | ON | Online | AsyncStorage + API (queue drains) | data + auth + probe | none (or "All synced") |
| Cloud | ON | Offline | AsyncStorage; queue grows | none attempted | `OfflineIndicator` banner; status "Offline" + pending count |
| Cloud | OFF | Online/Offline | AsyncStorage only (data) | auth + probe only, no data sync | no offline banner; status "Sync off" (still Cloud) |
| Local | OFF (initial) | Online (device) | AsyncStorage only | none (zero API) | `CloudLinkBanner` ("Link to cloud…"); status "Local-only" |
| Local | OFF (initial) | Offline (device) | AsyncStorage only | none (zero API) | Both banner and "Local-only" may show — both true, no contradiction |

## 4.5 Flows (normative)

- **Register — explicit mode choice (NEW, replaces email-format inference).**
  The Register screen presents an **Online / Offline mode selector** before
  account creation:
  - **Online** → cloud registration (`POST {API_URL}/auth/register`); on
    success `autoBackup = true`, JWT stored, normal Cloud account.
  - **Offline** → `createLocalAccount` path with no network call at all:
    local UUID id → `addUser` → `saveUserProfile` → `initDb` →
    `autoBackup = false` (initial) → `login(id, "offline_token")`.
  - If **Online** is chosen but the server is unreachable → "Cloud Unreachable"
    dialog offering "Create Offline Account" (current `register.tsx:81-96`
    behavior, kept).
- **Login (FINAL revision): throttled retries + transient notice.** Up to **3
  retries with throttling/backoff** on network failure, then a transient
  notice ("No connection — checking this device…") distinct from the
  Local-account offer. Then → `attemptLocalLogin` (`login.tsx:55-104`);
  known local user + matching PIN → in with `"local_token"`; unknown user →
  "Create Offline Account" dialog (same Local creation as above).
- **Make Online (upgrade Local → Cloud; only upgrade direction).**
  Entry points (all route to the same Settings flow): Settings **"Make Online"**
  action, **Local Auto-Backup switch toggled ON**, `CloudLinkBanner` "LINK NOW",
  and the `useCloudLink` "Secure Your Data" dialog (today they push `/login`
  / show a dead-end alert — both rerouted per this spec). Flow: PIN verify →
  cloud register/login → conflict check → Merge (LWW) / Keep Local / Keep Cloud
  (existing `settings.tsx` conflict flow, reused). On success the account
  becomes Cloud (`autoBackup = true`, JWT). Once Cloud always Cloud.

## 4.6 Resolved decisions (were open; FINAL per user call 2026-09-21)

1. **Reachability probe for Local accounts: (b) device connectivity only.**
   No API health ping for Local accounts — zero API calls.
2. **Login fallback: retry + transient notice.** Up to 3 throttled retries,
   then transient offline notice, then local lookup (see §4.5).
3. **Downgrade Cloud → Local: explicitly out of scope.** Cloud stays Cloud
   (auto-backup OFF ≠ Local). Local → Cloud only.

**Acceptance:** (i) airplane-mode Cloud account shows offline banner, queues,
drains on reconnect, never offers "create offline account"; (ii) Local account
on Wi-Fi makes zero API calls (device connectivity only — verify via proxy/log);
(iii) Cloud with auto-backup OFF stays Cloud, still auth-capable, labeled
"Sync off", never "Local-only"/"Offline"; (iv) no screen uses the word "offline"
for a Local account; (v) login attempts ≤3 throttled retries before the
transient offline notice.
