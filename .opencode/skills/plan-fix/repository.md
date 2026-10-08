refined: true
Stack: TypeScript (strict), Expo SDK 57, React Native 0.86.3, React Native Paper 5, Expo Router (package.json: expo ~57.0.24, react-native 0.86.3; AGENTS.md §2 says SDK 57; README.md still says SDK 54 — stale)
Tests: npm test (package.json scripts.test = "jest")
Issue tracker: user text only (no tracker named in files read; planning runs discuss → spec → user marks final per AGENTS.md §1.1/§1.9; no .github/ config found)
Layering: app/ (Expo Router screens) → components/ → hooks/ → context/ (11 providers, Data/Actions split) → repositories/ (AsyncStorage repos) → persistence+sync (AsyncStorage user_{id}_* single source of truth, sync queue → wallet-api) — README.md Architecture + AGENTS.md §2
Invariants:
- Spec-first, no code/config/deps without a user-finalized spec — AGENTS.md §1.1 — source does not say why (standing contract)
- No auto-pilot, stop after the approved step and ask before the next phase — AGENTS.md §1.2 — source does not say why
- Agent never runs CLIs, user runs them and pastes output — AGENTS.md §1.3 — user owns device, build environment, credentials
- No breaking changes to storage keys (user_{id}_*), wallet-api contract, AsyncStorage shapes, routes, native deps unless FINAL spec requires + migration with rollback — AGENTS.md §1.4 — source does not say why
- Android + iOS + Web must keep working, Platform.OS/select, never static native-only import at top level — AGENTS.md §1.5 — expo-notifications static import crashed Expo Go, lazy-load with try/catch instead
- Web stays Vercel-deployable (expo export --platform web, no Node-only APIs, EXPO_PUBLIC_* env only) — AGENTS.md §1.6 — source does not say why
- Expo Go (latest) testable, unavailable features degrade with fallback, never red-box — AGENTS.md §1.7 — source does not say why
- Specs live under specs/ on the SPEC-04 template with CON-*/ACC-*/D-* + platform matrix; TDD via jest parameterized by Platform.OS plus user-run Expo Go + web checks — AGENTS.md §1.9/§1.10 — source does not say why
- Bare-minimum diffs, no new deps unless instructed or FINAL-spec-named — AGENTS.md §1.11/§1.12 — source does not say why
- Always ask before updating code; default output is a prompt, edit only on keyword "code this for me"; document after changes in docs/savepoint.md — .agents/rules/wisewallet.md — source does not say why
Gold paths:
- app/_layout.tsx (root layout + provider tree + nav guards) — AGENTS.md §2
- app/(tabs)/index.tsx (Dashboard) — AGENTS.md §2/§3
- utils/notifications.ts (Expo-Go-safe lazy load example) — AGENTS.md §1.5
- specs/04-connection-status-vs-offline-mode.md (normative spec template) — AGENTS.md §1.9
Sources:
- D:\hobby\wise_wallet\package.json
- D:\hobby\wise_wallet\AGENTS.md
- D:\hobby\wise_wallet\README.md
- D:\hobby\wise_wallet\.agents\rules\wisewallet.md
- Negative checks: CLAUDE.md absent; .github/**/* absent; D:\hobby\wise_wallet\.opencode\skills\ empty before this run (no skill files found)
