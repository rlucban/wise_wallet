refined: true
Stack: TypeScript (strict) on Node 20; Expo SDK ~57 + React Native 0.86 + React 19.2; Expo Router (file-based routing); React Native Paper 5 (Material 3); jest + ts-jest; eslint 9 + @typescript-eslint (package.json, app.json, jest.config.js, eslint.config.js, tsconfig.json, .github/workflows/ci.yml)
Tests: npm test # jest — roots: ['<rootDir>/utils'], ts-jest + tsconfig.test.json, testMatch **/*.test.ts|js
Issue tracker: GitHub Issues at rlucban/wise_wallet (specs/42-go-back-after-web-refresh.md, docs/savepoint.md, AGENTS.md)
Layering: Screens (app/, Expo Router) -> components/ -> hooks/ -> context/ (11 providers, Data/Actions split) -> repositories/ (DI via RepositoryContext) -> AsyncStorage `user_{id}_{key}` + sync queue (utils/syncQueue.ts, utils/syncProcessor.ts) -> wallet-api via utils/apiClient.ts; cross-cutting utils/, types/ (README.md Architecture + Provider Tree, AGENTS.md 2)
Invariants:
- No code, config, or dependency change without a written spec the user has marked FINAL — AGENTS.md 1.1 — the spec is the contract implementation must match exactly
- The agent must never execute CLIs; it supplies the commands and the user runs them and pastes output — AGENTS.md 1.3 — the user owns device, build environment, and credentials
- Storage keys `user_{id}_*`, the `wallet-api` contract, AsyncStorage shapes, navigation routes, and native deps stay compatible — AGENTS.md 1.4 — existing accounts and stored data must survive any change
- Android + iOS + Web must all keep working; platform code uses Platform.OS/Platform.select — AGENTS.md 1.5 — source does not say why
- Never statically import a native-only module at file top level; lazy-load with try/catch — AGENTS.md 1.5/1.7 — `expo-notifications` crashed Expo Go on static import in SDK 53+
- Web export (`expo export --platform web`, vercel.json) must keep working: no Node-only APIs in app code, no secrets in the bundle, `EXPO_PUBLIC_*` only — AGENTS.md 1.6 — the app deploys to Vercel
- Bare-minimum diffs: implement the smallest change satisfying the FINAL spec's ACC-*, no refactors or drive-by cleanups — AGENTS.md 1.11 — the diff must be reviewable against the spec
- No new dependencies unless the user instructs or the FINAL spec names them; install commands go to the user — AGENTS.md 1.12
- AsyncStorage is the single source of truth; writes hit local storage first, then sync — README.md Key Design Decisions / Data Flow — offline-first operation
- Every provider splits DataContext (state) from ActionsContext (stable fn refs) — README.md Key Design Decisions — minimize re-renders
- Sync conflict resolution is last-writer-wins on `updatedAt`; transactions merge inline, categories/dues/savings queue — README.md Key Design Decisions — source does not say why
- After any approved change, update docs/savepoint.md and append a `Current status` entry to AGENTS.md 3 — .agents/rules/wisewallet.md — "this is not a git history file. this is to keep the context and objective up to date"
- Ask before touching the codebase; edit code only on "code this for me" — .agents/rules/wisewallet.md — source does not say why
Gold paths:
- specs/04-connection-status-vs-offline-mode.md — the mandatory spec template for all new specs (metadata table, RFC 2119, Context/Constraints CON-*, Goal/DEC-*/ACC-*, Deliverables D-*, Glossary, References), plus the Android|iOS|Web matrix split into Objective (machine-checkable) vs Subjective (reviewer-observed) per AGENTS.md 1.9/1.10
- utils/ — the home for pure logic and the only jest `roots` entry, so new testable logic belongs there rather than in app/ or context/ (jest.config.js, AGENTS.md 3 test entries)
Sources:
- package.json
- jest.config.js
- tsconfig.json (not read in full; referenced by AGENTS.md 3 SPEC-07 for the Jest-file exclusion)
- eslint.config.js (name only)
- .github/workflows/ci.yml
- README.md
- AGENTS.md
- .agents/rules/wisewallet.md
- specs/42-go-back-after-web-refresh.md (issue-tracker reference)
- docs/savepoint.md (issue-tracker reference, read-only grep hit)
- git remote (origin -> github.com/rlucban/wise_wallet.git)
