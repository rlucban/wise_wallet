# AGENTS.md — WiseWallet Agent Contract

> This file is the standing contract for any AI agent working in this repo.
> It outranks ad-hoc instructions when they conflict. If a request violates
> Section 1, stop and ask instead of proceeding.
> Companion rules: `.agents/rules/wisewallet.md`. Change journal: `docs/savepoint.md`.

---

## 1. Working agreements (must-follow, moving forward)

1. **Spec-first, no exceptions.** No code, config, or dependency changes without a
   written spec the user has explicitly marked **final/finalized**. The loop is:
   discuss → write spec → user approves spec as final → implement exactly the spec.
2. **No auto-pilot.** Never chain beyond what was approved. Finish the approved
   step, report, and stop. Ask before starting the next phase, even if it seems
   "obvious."
3. **Agent does not run CLIs — the user does.** The agent must NEVER execute
   terminal commands (`npm`/`npx`/`expo`/`git`/builds/deploys, etc.). The agent
   provides the exact commands; the user runs them and pastes back output.
   Rationale: the user owns the device, build environment, and credentials.
4. **No breaking changes unless the finalized spec requires them.** Storage keys
   (`user_{id}_*`), the API contract (`wallet-api`), AsyncStorage shapes,
   navigation routes, and native dependencies must stay compatible. Any
   migration must be in the spec with rollback noted.
5. **Cross-platform invariant.** Every change must keep **Android + iOS + Web**
   working. Use `Platform.OS` / `Platform.select` for platform code; never
   statically import a native-only module at file top-level (see the
   `expo-notifications` Expo Go crash — lazy-load with try/catch instead).
6. **Keep it Vercel-deployable.** Web output (`expo export --platform web`,
   see `vercel.json`) must keep working: no Node-only APIs in app code, no
   secrets in the bundle, `EXPO_PUBLIC_*` env only.
7. **Keep it Expo Go (latest) testable.** Nothing may crash Expo Go on import.
   Features unavailable in Go must degrade gracefully with an in-app fallback
   and a clear message — never a red-box crash. Verify mentally against this
   checklist before proposing any native dependency.
8. **Document after approved changes.** Update `docs/savepoint.md` (change
   journal) and append a `Current status` entry in Section 3 below, per
   `.agents/rules/wisewallet.md`.

---

## 2. App overview and scaffold

**What it is:** WiseWallet — personal finance management, Expo SDK 57 +
React Native + TypeScript (strict) + React Native Paper 5 (Material 3) +
Expo Router (file-based routing). **Offline-first**: AsyncStorage is the
single source of truth; cloud sync via `wallet-api` (Express + Supabase/Postgres,
base URL in `.env` as `EXPO_PUBLIC_API_URL`) is optional per account.

**Features:** Dashboard (balance, dues, recent activity) · Transactions
(add/edit/delete, receipt photo, payment method, establishment) · Reports
(Income-vs-Expense donut, monthly bar trend, category breakdowns, CSV/PDF
export) · Scheduled dues (recurring/one-time) · Allocations/Savings (goal
amount + progress) · Calendar · Financial Literacy (articles + TTS read-aloud)
· Cloud sync (auto-backup toggle, LWW merge / keep-local / keep-cloud,
manual backup/restore) · JSON export/import · 4-digit passcode lock ·
Dark mode · English UI · PHP currency · Custom categories · Payment methods.

**Scaffold:**

```
wise-wallet/
├── app/                    # Expo Router screens (17 routes)
│   ├── (tabs)/             # Tab navigator: index (Dashboard), reports,
│   │                       # learning, learning-detail, settings
│   ├── _layout.tsx         # Root layout + full provider tree + nav guards
│   ├── add/edit/transaction, transaction-details, dues, add-due,
│   ├── savings, add-allocation, calendar, category-settings,
│   ├── payment-methods, login, register, onboarding, intro,
│   ├── passcode-screen, notifications, help
├── components/             # TransactionList, SummaryCard, DonutChart,
│                           # MonthlyTrendChart, SmartInsights, CloudLinkBanner,
│                           # FinancialTip, EmptyState, ConfirmDialog, …
├── context/ (11)           # Data/Actions split per provider: Auth, UserProfile,
│                           # Transactions, Categories, Theme, Language, Passcode,
│                           # Currency, Network, SystemAlerts, DbRecovery, Repository
├── hooks/                  # useTransactions, useSavings, useDues, useInsights,
│                           # useCloudLink, useSyncStatus
├── repositories/           # AsyncStorage repos (transactions, categories, dues,
│                           # savings-items, profiles) + base + interfaces
├── utils/                  # db, storage (user_{id}_ keys), cache, secureStorage,
│                           # apiClient (authFetch), syncQueue/syncProcessor,
│                           # notifications (Expo-Go-safe lazy load), exportUtils,
│                           # amount (MAX 10,000,000), uuid, learningData
├── types/                  # Transaction, Category, Due, SavingsItem
│                           # (has target_amount), UserProfile, SystemAlert, …
├── assets/  app.json  vercel.json  .env (EXPO_PUBLIC_API_URL)
└── docs/savepoint.md  .agents/rules/wisewallet.md
```

**Architecture notes:** context split pattern (separate Data/Actions contexts to
limit re-renders) · repository pattern over AsyncStorage · dual sync
(transactions inline-merge, others queue-based) · LWW conflict resolution via
`updatedAt` · `AuthLoader` per-user DB init + nav guards in `MainLayout` ·
local notifications lazy-loaded so Expo Go never evaluates the native module.

---

## 3. Current status (historical tracking — append newest at bottom)

- **2026-09-21 — Ma'am Haidee suggestions implemented.** Dashboard header is
  date+day only (`app/(tabs)/index.tsx`); Reports has Expense/Income/Total top
  cards with bar chart first, pie second (`app/(tabs)/reports.tsx`); Settings
  is English-only, language toggle removed (`app/(tabs)/settings.tsx`);
  Allocations goal amount + progress bar and Learning TTS read-aloud verified
  pre-existing and preserved.
- **2026-09-21 — Amount cap ₱10,000,000.** `utils/amount.ts` `MAX_AMOUNT` plus
  all validators/messages in add/edit-transaction, add-due, dues, onboarding,
  add-allocation, savings. Lint clean.
- **2026-09-21 — Expo Go crash fixed.** `utils/notifications.ts` lazy-loads
  `expo-notifications` (SDK 53+ throws on static import in Go); local reminders
  no-op in Go, in-app SystemAlerts unaffected.
- **2026-09-21 — Config health.** `app.json` migrated to SDK 57 schema
  (removed `newArchEnabled`/`splash`/`edgeToEdgeEnabled`; splash moved to
  `expo-splash-screen` plugin); installed `expo-font` + `expo-splash-screen`;
  `expo-doctor` 21/21; `npm run lint` clean.
- **2026-09-21 — Spec §4 proposed (NOT finalized).** Connection status vs
  offline (local-only) account mode. Open decisions pending user call; no
  implementation until finalized.
- **2026-09-21 — Spec §4 revised per user call.** Mode is an explicit
  Online/Offline choice at registration (replaces email-format inference);
  "auto-backup" is not user-facing vocabulary for Local accounts —
  `autoBackup = false` is automatic, the switch is hidden, Settings shows
  "Make Online" instead. Login-no-network review deferred.
- **2026-09-21 — Spec §4 FINAL per user call.** Local probe = device
  connectivity only (no API ping); Auto-Backup switch always shown — Cloud
  OFF stays Cloud (sync off only, auth still allowed), Local ON routes to
  Make Online register workflow, once Cloud always Cloud; Login = up to 3
  throttled retries then transient offline notice; no Cloud→Local downgrade.

---

## 4. Spec: Connection Status vs Offline (Local-Only) Account Mode

**Status: FINAL (2026-09-21 per user call) — implement exactly this; no Cloud→Local downgrade.**

### 4.1 Problem statement

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

### 4.2 Definitions

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

### 4.3 Normative rules

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

### 4.4 Interaction matrix (normative)

| Account | autoBackup | Connection | Writes go to | Cloud calls | Banner / status |
|---|---|---|---|---|---|
| Cloud | ON | Online | AsyncStorage + API (queue drains) | data + auth + probe | none (or "All synced") |
| Cloud | ON | Offline | AsyncStorage; queue grows | none attempted | `OfflineIndicator` banner; status "Offline" + pending count |
| Cloud | OFF | Online/Offline | AsyncStorage only (data) | auth + probe only, no data sync | no offline banner; status "Sync off" (still Cloud) |
| Local | OFF (initial) | Online (device) | AsyncStorage only | none (zero API) | `CloudLinkBanner` ("Link to cloud…"); status "Local-only" |
| Local | OFF (initial) | Offline (device) | AsyncStorage only | none (zero API) | Both banner and "Local-only" may show — both true, no contradiction |

### 4.5 Flows (normative)

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

### 4.6 Resolved decisions (were open; FINAL per user call 2026-09-21)

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
