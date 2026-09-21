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

---

## 4. Spec: Connection Status vs Offline (Local-Only) Account Mode

**Status: PROPOSED — do not implement until marked FINAL by the user.**

### 4.1 Problem statement

The codebase conflates two independent axes under the word "offline":

- `settings.tsx` shows **"Local Profile (Offline)"** for a no-cloud account.
- `SyncStatusCard` shows **"Offline"** for no-network *and* **"Backup Disabled"**
  for auto-backup-off.
- Login silently falls back to local auth on network failure
  (`login.tsx:191-193`), so a *transient network blip* and a *deliberate
  no-cloud account* look identical to the user.

They must be modeled, named, and displayed as separate concepts.

### 4.2 Definitions

**A. Connection status — transient, device-level, automatic.**

- States: `Online` | `Offline`. Nothing else.
- Source of truth: `NetworkContext.checkHealth()` — `GET {API_URL}/system/health`,
  3s abort timeout, 30s cache TTL. `online = response.ok || status ∈ {404, 405}`;
  any throw/timeout → offline.
- The user cannot set it. It is sampled (app foreground, manual retry, cache).
- UI surface: `OfflineIndicator` banner in `_layout.tsx` only
  ("You're offline. Changes will sync automatically…"). No other screen may
  invent its own verdict — `useCloudLink.ts` currently runs a *second, separate*
  2s health check and must be deleted and routed through `checkHealth()`.

**B. Account mode — persistent, per-account, chosen by the user.**

- Modes: `Cloud` | `Local`. Set at account creation, changeable only via the
  upgrade flow (§4.5).
- "Offline mode" = **Local account**, defined as:
  1. Created via `createLocalAccount` (`register.tsx:32-50`) or the "Create
     Offline Account" dialog (`login.tsx:75-102`) — local UUID id,
     `login(id, "offline_token")` (or `"local_token"` on local re-login,
     `login.tsx:67,172`).
  2. `autoBackup = false` (setting + profile). This is the enforcement switch
     every writer gates on (`TransactionsContext:154-193`, `useSavings:103-138`,
     `useDues:72-107`, `CategoriesContext:65-81`).
  3. **Feature-identical to Cloud**: same screens, same validation, same 10M
     limits. The *only* differences are sync behavior and account-management
     surfaces.
  4. **Storage: AsyncStorage only**, same repository layer and same
     `user_{userId}_{entity}` key namespacing (`storage.ts:getPrefixedKey`) as
     Cloud — there is no separate storage engine. "Uses AsyncStorage instead"
     means AsyncStorage is the *only* copy; no cloud mirror.

### 4.3 Normative rules

1. **Single selector.** Add `isLocalAccount()` (Auth data + profile): true if
   `token ∈ {"offline_token","local_token"}` **or** `autoBackup == false`. All
   gating (writers, banners, settings copy) uses it — never raw string compares
   scattered across files (today: `CloudLinkBanner:16`, `useCloudLink:42`,
   `login.tsx:21`).
2. **Local accounts make zero data/auth calls to the API.** No `authFetch`, no
   login/register/session calls. (Reachability probe: see open decision §4.6.1.)
3. **Connection status never changes account mode**, and account mode never
   changes connection status. A Cloud account with no signal is still a Cloud
   account with queued sync; a Local account with full bars still syncs nothing.
4. **Copy rule:** the word "offline" (and cloud-off icons) is reserved for
   connection status. Local accounts are called **"Local-only account"** with a
   device/phone icon. Replacements:
   - `settings.tsx` profile subtitle → `"Local-only account — stored on this device"`
   - `SyncStatusCard` `!autoBackup` state → `"Local-only"`, neutral color
     (red `error` is reserved for *problems*; a deliberate Local account is not
     an error)
   - Offline banner keeps cloud-off icon + "You're offline…" copy.

### 4.4 Interaction matrix (normative)

| Account | Connection | Writes go to | Cloud calls | Banner / status |
|---|---|---|---|---|
| Cloud | Online | AsyncStorage + API (queue drains) | yes | none (or "All synced") |
| Cloud | Offline | AsyncStorage; queue grows | none attempted | `OfflineIndicator` banner; status "Offline" + pending count |
| Local | Online | AsyncStorage only | none | `CloudLinkBanner` ("Link to cloud…"); status "Local-only" |
| Local | Offline | AsyncStorage only | none | Both banner and "Local-only" may show — both true, no contradiction |

### 4.5 Flows (existing behavior, locked in)

- **Create Local:** register non-email or "Cloud Unreachable → Create Offline
  Account" (`register.tsx:81-96`); login network-fail → `attemptLocalLogin` →
  "Account Not Found → Create Offline Account" (`login.tsx:55-104`).
- **Upgrade Local → Cloud:** flip Auto-Backup ON → PIN verify → conflict check →
  Merge (LWW) / Keep Local / Keep Cloud (`settings.tsx` conflict flow).
  `CloudLinkBanner` "LINK NOW" and the `useCloudLink` "Secure Your Data" dialog
  must both deep-link into this Settings flow (today `useCloudLink.performLink`
  is a dead-end demo alert and `CloudLinkBanner` pushes `/login` — both fix to
  route to Settings per this spec).

### 4.6 Open decisions (need user call before FINAL)

1. **Reachability probe for Local accounts:** `CloudLinkBanner` pings *our* API
   to decide showing "Link now". Strict "never connects to web API" forbids even
   that. Options: (a) allow the lightweight unauthenticated health probe
   (recommended — no user data leaves the device); (b) use platform connectivity
   (`navigator.onLine` / `expo-network`) instead.
2. **Login fallback copy:** a Cloud user's network failure silently drops into
   local lookup with no "you're offline" notice. Per §4.3.4 this needs an
   explicit transient notice ("No connection — checking this device…") distinct
   from the Local-account offer.
3. **Downgrade Cloud → Local:** currently only via Clear Data / new account.
   In scope or explicitly out?

**Acceptance:** (i) airplane-mode Cloud account shows offline banner, queues,
drains on reconnect, never offers "create offline account"; (ii) Local account
on Wi-Fi makes zero API data calls (verify via proxy/log); (iii) no screen uses
the word "offline" for a Local account.
