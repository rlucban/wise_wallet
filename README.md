# WiseWallet

Personal finance management app built with Expo SDK 54 + React Native. Offline-first with optional cloud backup via Supabase.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Expo SDK 54 + React Native 0.81 |
| Language | TypeScript (strict) |
| UI Library | React Native Paper 5 (Material Design 3) |
| Routing | Expo Router (file-based) |
| Charts | react-native-chart-kit, react-native-calendars |
| Persistence | AsyncStorage (offline-first, single source of truth) |
| Backend | Express 5 + Supabase (PostgreSQL) via `wallet-api` |
| Auth | JWT (cloud) / SHA-256 passcode (offline fallback) |

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         ARCHITECTURE OVERVIEW                           │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌──────────────┐   ┌──────────────────┐   ┌─────────────────────────┐ │
│  │   Screens     │   │    Components     │   │        Hooks           │ │
│  │  (Expo Router)│──▶│ (TransactionList, │──▶│ (useTransactions,      │ │
│  │  19 screens)  │   │  SummaryCard, …)  │   │  useSavings, useDues)  │ │
│  └──────────────┘   └──────────────────┘   └───────┬─────────────────┘ │
│                                                     │                   │
│  ┌──────────────────────────────────────────────────┴─────────────────┐ │
│  │                   CONTEXT LAYER (11 providers)                     │ │
│  │                                                                     │ │
│  │  ┌─────────────────────┐  ┌────────────────────┐                   │ │
│  │  │  Data Contexts       │  │  Actions Contexts   │                   │ │
│  │  │  (read-only state)   │  │  (mutation fns)     │                   │ │
│  │  │                      │  │                     │                   │ │
│  │  │  TransactionsData    │  │  TransactionsActions │                   │ │
│  │  │  CategoriesData      │  │  CategoriesActions   │                   │ │
│  │  │  AuthData            │  │  AuthActions         │                   │ │
│  │  │  ThemeData           │  │  ThemeActions        │                   │ │
│  │  │  CurrencyData        │  │  CurrencyActions     │                   │ │
│  │  │  LanguageData        │  │  LanguageActions     │                   │ │
│  │  │  … (11 total)        │  │  … (11 total)        │                   │ │
│  │  └─────────────────────┘  └────────────────────┘                   │ │
│  └─────────────────────────────────────────────────────────────────────┘ │
│                                     │                                    │
│  ┌──────────────────────────────────┴──────────────────────────────────┐ │
│  │              REPOSITORY LAYER (via RepositoryContext)               │ │
│  │                                                                     │ │
│  │  ┌────────────────────┐  ┌─────────────────────┐                    │ │
│  │  │ BaseAsyncStorageRepo│  │  ProfileRepository  │                    │ │
│  │  │ (7 entities)        │  │  (single object)    │                    │ │
│  │  │                      │  │                      │                    │ │
│  │  │  getAll()            │  │  getAll() → [profile]│                    │ │
│  │  │  getById(id)        │  │  getById() → object  │                    │ │
│  │  │  upsert(entity)     │  │  upsert() → merge    │                    │ │
│  │  │  upsertBulk(arr)    │  │                      │                    │ │
│  │  │  deleteById(id)     │  │                      │                    │ │
│  │  └────────────────────┘  └─────────────────────┘                    │ │
│  └─────────────────────────────────────────────────────────────────────┘ │
│                                     │                                    │
│  ┌──────────────────────────────────┴──────────────────────────────────┐ │
│  │              PERSISTENCE + SYNC LAYER                               │ │
│  │                                                                     │ │
│  │  ┌──────────────────┐       ┌──────────────────┐                    │ │
│  │  │   AsyncStorage    │       │   Sync Queue     │                    │ │
│  │  │  user_{id}_{key}  │◄─────▶│  (AsyncStorage)  │                    │ │
│  │  │                   │       │                  │                    │ │
│  │  │  Offline-first:   │       │  enqueueSync()   │                    │ │
│  │  │  all reads from   │       │  processSyncQueue│────▶ API Server   │ │
│  │  │  local storage    │       │  exponential     │     (optional)    │ │
│  │  └──────────────────┘       │  backoff + jitter │                    │ │
│  │                              └──────────────────┘                    │ │
│  └─────────────────────────────────────────────────────────────────────┘ │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────────┐ │
│  │  CROSS-CUTTING                                                      │ │
│  │                                                                     │ │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐               │ │
│  │  │  In-memory   │  │ Secure Store │  │  DbRecovery  │               │ │
│  │  │  Cache       │  │ (JWT tokens) │  │  (self-heal) │               │ │
│  │  │  (userId,    │  │              │  │              │               │ │
│  │  │   settings)  │  │              │  │              │               │ │
│  │  └──────────────┘  └──────────────┘  └──────────────┘               │ │
│  └─────────────────────────────────────────────────────────────────────┘ │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### Data Flow

```
User taps "Save"
  → Hook calls action (e.g. addTransaction)
    → Repository: upsert() to AsyncStorage (local-first write)
    → Context: optimistically updates React state (instant UI)
    → Sync Queue: enqueueSync() with the mutation
      → Sync Processor: processSyncQueue() after 500ms debounce
        → authFetch(POST /api/{entity}) to cloud
        → dequeueSync() on success, retry with backoff on failure
```

### Key Design Decisions

- **Offline-first**: All reads from AsyncStorage. Writes go to local storage first, then sync to cloud.
- **Dual sync patterns**: Transactions use inline merge on fetch; Categories, Dues, Savings use queue-based sync.
- **Last-writer-wins (LWW)**: Conflict resolution via `updatedAt` timestamps.
- **Context split pattern**: Every provider exposes separate `DataContext` (state) and `ActionsContext` (stable function references) to minimize re-renders.
- **Virtualized lists**: `@shopify/flash-list` v2 used for TransactionList, Dashboard, and Dues screens.
- **Auth**: Email + 4-digit PIN for cloud accounts. Any username + PIN for offline-only. JWT in `expo-secure-store`.

### Provider Tree (nesting order)

```
DbRecoveryProvider                         # Self-healing on DB corruption
  RepositoryProvider                        # 8 repo instances, created once
    AuthProvider                            # activeUserId, JWT, login/logout
      UserProfileProvider                   # name, isFirstRun, theme prefs
        SystemResetManager                  # Server-triggered data wipe
        ProviderComposer [7 contexts]       # Theme, Language, Passcode,
                                            # Currency, Categories,
                                            # Transactions
          AuthLoader                        # Init DB per user
            MainLayout                      # App shell + NetworkProvider
              Stack (Expo Router)           # All route screens
```

## Features

| Feature | Description |
|---------|-------------|
| Dashboard | Balance overview with available-to-spend, income/expense summary, upcoming dues, paginated recent transactions |
| Transactions | Add/edit/delete with receipt photo (camera or gallery), payment method, establishment tracking |
| Reports | Income vs expense pie chart, expense by category, period filtering (weekly/monthly/annually), CSV/PDF export |
| Scheduled (Dues) | Recurring and one-time scheduled payments with auto-process option |
| Allocations (Savings) | Savings goals/tracking with balance allocation |
| Subscriptions | Recurring bill tracking |
| Calendar | View transactions by date |
| Learning | Financial literacy articles (Budgeting 101, Understanding Debt, Saving for the Future) |
| Cloud Sync | Auto-backup toggle, conflict resolution (merge LWW / keep local / keep cloud), manual backup/restore |
| Offline Mode | Full functionality without internet, queue-based sync when connectivity returns |
| Export/Import | JSON backup with embedded receipt images |
| Passcode Lock | 4-digit PIN to secure app on startup |
| Customization | Dark mode, language (English/Filipino), currency (PHP/USD), decimal places |
| Categories | Customizable income/expense categories |
| Payment Methods | Cash, Bank, E-Wallet, Card tracking |

## Getting Started

### Prerequisites

- Node.js 20+
- npm
- Expo CLI (`npm install -g expo-cli`)

### Install & Run

```bash
npm install
npm run web      # Browser
npm run android  # Android emulator/device
npm run ios      # iOS Simulator (Mac only)
```

### Backend (optional, for cloud sync)

The app points to `https://wallet-api-xi-plum.vercel.app/api` by default (set in `.env`). A local `json-server` is available for development:

```bash
npm run server   # Runs json-server on port 3000
```

Set `EXPO_PUBLIC_API_URL=http://localhost:3000` in `.env` to use the local server.

## Project Structure

```
wise-wallet/
├── app/                    # Expo Router screens + layouts (19 routes)
│   ├── (tabs)/             # Tab navigator (Dashboard, Reports, Learning, Settings)
│   │   ├── index.tsx       # Dashboard — FlashList with widgets in ListHeaderComponent
│   │   ├── reports.tsx     # Income/expense charts with period filtering
│   │   ├── learning.tsx    # Financial literacy articles
│   │   └── settings.tsx    # All settings panels
│   ├── _layout.tsx         # Root layout with full provider tree
│   ├── add-transaction.tsx # Add transaction form with receipt image picker
│   ├── edit-transaction.tsx
│   ├── transaction-details.tsx
│   ├── auth.tsx            # Login/Register
│   ├── dues.tsx            # Scheduled payments (FlashList)
│   ├── savings.tsx         # Savings goals
│   ├── calendar.tsx
│   ├── category-settings.tsx
│   ├── payment-methods.tsx
│   ├── passcode-screen.tsx
│   ├── help.tsx
│   └── onboarding.tsx
├── components/             # Reusable UI components (12)
│   ├── TransactionList.tsx # Shared FlashList for transactions
│   ├── SummaryCard.tsx     # Balance summary with allocation bar
│   ├── EmptyState.tsx      # Reusable empty state with icon
│   ├── ProviderComposer.tsx# Flattens deep provider nesting with reduceRight
│   ├── SmartInsights.tsx   # AI-powered spending insights
│   ├── CloudLinkBanner.tsx # Cloud sync status banner
│   ├── SkeletonLoader.tsx  # Loading skeleton screens
│   ├── FinancialTip.tsx
│   ├── BalanceBreakdown.tsx
│   ├── ChartCard.tsx
│   ├── PaymentMethodChart.tsx
│   └── PiggyBank.tsx
├── context/                # React Context providers (11)
│   ├── TransactionsContext.tsx  # Data/Actions split pattern
│   ├── CategoriesContext.tsx    # Data/Actions split
│   ├── AuthContext.tsx          # Data/Actions split
│   ├── CurrencyContext.tsx      # Data/Actions split
│   ├── ThemeContext.tsx         # Data/Actions split
│   ├── LanguageContext.tsx      # Data/Actions split
│   ├── PasscodeContext.tsx      # Data/Actions split
│   ├── NetworkContext.tsx       # Data/Actions split
│   ├── DbRecoveryContext.tsx    # Minimal (single value)
│   ├── RepositoryContext.tsx    # DI container for all repos
│   └── UserProfileContext.tsx   # Data/Actions split
├── hooks/                  # Custom hooks (6)
│   ├── useTransactions.ts  # Re-exports transaction context hooks
│   ├── useSavings.ts       # Direct repo usage + sync (no context)
│   ├── useDues.ts          # Direct repo usage + sync (no context)
│   ├── useInsights.ts      # Composes transactions + dues data
│   ├── useCloudLink.ts     # Cloud sync pairing logic
│   └── useSyncStatus.ts    # Sync queue status polling
├── repositories/           # Repository pattern (9 repos)
│   ├── base.storage.ts     # Abstract base: getAll, getById, upsert, upsertBulk, deleteById
│   ├── transaction.repo.ts # + getByDateRange
│   ├── category.repo.ts    # + getByType
│   ├── due.repo.ts
│   ├── savings-item.repo.ts
│   ├── subscription.repo.ts
│   ├── agenda.repo.ts
│   ├── payment-method.repo.ts
│   └── profile.repo.ts     # Single-object storage (not array-based)
├── utils/                  # Core utilities
│   ├── db.ts               # Legacy CRUD (settings, auth, export/import, mergeLWW) — 358 lines
│   ├── storage.ts          # getPrefixedKey, getItem, setItem, deduplicate, timestamps
│   ├── cache.ts            # In-memory cache for activeUserId + settings
│   ├── secureStorage.ts    # expo-secure-store wrapper with AsyncStorage fallback
│   ├── apiClient.ts        # Authenticated fetch wrapper with 401 handling
│   ├── syncQueue.ts        # Queue CRUD: enqueue, dequeue, retry with exponential backoff + jitter
│   ├── syncProcessor.ts    # Queue processing: enqueueAndTrigger, processSyncQueue
│   ├── exportUtils.ts      # CSV/PDF export helpers
│   └── uuid.ts             # UUID generation
├── types/                  # TypeScript interfaces
│   ├── index.ts            # Entity types: Transaction, Category, Due, SavingsItem, …
│   └── repositories.ts     # Repository interfaces + extension interfaces
├── assets/                 # Fonts, images, icons
├── tests-e2e/              # Playwright e2e tests
├── docs/                   # Architecture plans & documentation
│   .github/workflows/ci.yml # GitHub Actions: lint + typecheck on push/PR
```

## Known Limitations

- No test suite (0 unit tests, 0 integration tests)
- No error tracking (Sentry)
- Transactions use a different sync pattern (inline merge) than other entities (queue-based)
- Search/filter for transactions not implemented
- Push notifications not configured (expo-notifications installed but unused)
- Educational videos section is a placeholder
