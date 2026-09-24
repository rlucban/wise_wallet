# Spec 07: CI TypeScript Exclusion for Jest Files

| Field | Value |
|---|---|
| ID | SPEC-07 |
| Title | CI TypeScript exclusion for Jest files (`__mocks__`, `*.test.ts`) |
| Status | **FINAL** (2026-09-24 per user call) |
| Owner | User (final authority) |
| Version | 1.0 |
| Scope | `tsconfig.json` exclude, `tsconfig.test.json` include, `__mocks__` param annotations; zero runtime change |
| Non-goals | New test logic; dependency upgrades; `ci.yml` workflow redesign; app source edits |
| Normative source | This file. |

## Terminology (RFC 2119)

The keywords **MUST**, **MUST NOT**, **SHOULD**, and **MAY** in this spec are
to be interpreted as described in RFC 2119. Informative prose (examples,
"today", "currently") is non-normative unless restated as a requirement.

## 1. Context

### 1.1 Problem

The CI job `lint-typecheck` (`.github/workflows/ci.yml`) runs `npx tsc --noEmit`,
which uses `tsconfig.json`. That file extends `expo/tsconfig.base` with
`strict: true` and declares no `exclude` of its own, and the base exclude covers
only `node_modules`, `babel/metro/jest configs`, `android`, `ios` — it does
**not** exclude test-only files. So app typechecking also checks:

- `__mocks__/@react-native-async-storage/async-storage.ts` — a Jest manual mock
  using the `jest` global and the Node `module` global, with untyped arrow params.
- `utils/syncProcessor.test.ts` — a Jest test using `jest`, `describe`, `it`,
  `expect`, `beforeEach`, and `jest.MockedFunction`.

The app config provides neither Jest nor Node globals for these files, so CI
fails with 80+ errors: `TS2304 Cannot find name 'jest'`, `TS7006 Parameter
implicitly has an 'any' type`, `TS2591 Cannot find name 'module'`, `TS2593
Cannot find name 'describe'/'it'/'beforeEach'`, `TS2503 Cannot find namespace
'jest'`, `TS2304 Cannot find name 'expect'`. The failing step exits with code 2.

A separate `tsconfig.test.json` already exists for `ts-jest`
(`jest.config.js` transform, `types: ["jest", "node"]`, `strict: true`), but it
is not used by the CI typecheck step, and its `include` covers only
`**/*.test.ts` + `jest.setup.js` — not `__mocks__`.

### 1.2 Definitions

**App typecheck** — `npx tsc --noEmit`, driven by `tsconfig.json`. MUST cover
app/runtime sources only.

**Test typecheck** — `npx tsc -p tsconfig.test.json --noEmit` and the `ts-jest`
transform at `npm test` time, driven by `tsconfig.test.json` with
`types: ["jest", "node"]`. MUST cover all Jest-only files.

**Jest-only files** — `**/*.test.ts`, `**/*.spec.ts`, `__mocks__/**/*.ts`.
These MUST NOT be part of the app typecheck.

## 2. Constraints (normative)

- **CON-01 — Zero runtime change.** No app/runtime source, storage key,
  API contract, route, or native dependency changes. `git diff --stat` for the
  fix MUST show only `tsconfig.json`, `tsconfig.test.json`,
  `__mocks__/@react-native-async-storage/async-storage.ts`, plus spec/docs.
- **CON-02 — App config exclusion.** `tsconfig.json` MUST exclude Jest-only
  files (`**/*.test.ts`, `**/*.spec.ts`, `__mocks__/**`) so `npx tsc --noEmit`
  never evaluates them.
- **CON-03 — Tests stay typechecked.** Every Jest-only file MUST remain covered
  by `tsconfig.test.json` (which already carries `types: ["jest", "node"]`);
  its `include` MUST gain `__mocks__/**/*.ts`. `npx tsc -p
  tsconfig.test.json --noEmit` MUST exit 0.
- **CON-04 — No global Jest leakage.** `tsconfig.json` MUST NOT add
  `"types": ["jest"]` (or any equivalent that exposes `jest`/`describe`/`it`/
  `expect` globals to app code). Test globals MUST NOT be usable under `app/`,
  `components/`, `context/`, `hooks/`, `repositories/`, `utils/` (excluding
  `*.test.ts`), or `types/`.
- **CON-05 — No new dependencies.** `@types/jest` is already a direct devDep;
  `@types/node` resolves transitively (verified present in `node_modules/@types`).
  No `package.json` change is permitted by this spec.
- **CON-06 — Standing repo invariants (AGENTS.md §1).** Android + iOS + Web MUST
  keep working; web MUST stay Vercel-deployable; Expo Go MUST NOT crash on
  import; agent MUST NOT run CLIs (user runs all verification commands).

## 3. Goal

Split typechecking along the existing two-config seam: app files under
`tsconfig.json`, Jest-only files under `tsconfig.test.json`, with no file
checked by neither and no Jest global visible to app code.

| File class | `tsc --noEmit` (app) | `tsc -p tsconfig.test.json` / `ts-jest` | Android | iOS | Web |
|---|---|---|---|---|---|
| App sources | checked, exit 0 | not included | unchanged | unchanged | unchanged |
| `*.test.ts` / `*.spec.ts` | excluded (CON-02) | checked, exit 0 (CON-03) | n/a (not shipped) | n/a | n/a |
| `__mocks__/**/*.ts` | excluded (CON-02) | checked, exit 0 (CON-03) | n/a (not shipped) | n/a | n/a |

Resolved decisions (FINAL):

- DEC-01: fix by exclusion (CON-02) + test-config coverage (CON-03), NOT by
  adding Jest types globally and NOT by `// @ts-nocheck` suppressions.
- DEC-02: annotate the mock's implicit-`any` params explicitly
  (`key: string`, `value: string`, `keys: string[]`, `k: string`;
  `store: Map<string, string>`) so it passes `strict` under BOTH configs'
  rules; keep `module.exports = AsyncStorage` (covered by `"node"` in
  `tsconfig.test.json`), no ESM rewrite.
- DEC-03: no `ci.yml` change in this spec — the existing `npx tsc --noEmit`
  step goes green via CON-02; test-config health is verified user-side
  (ACC-02/ACC-03). Adding `npm test` to CI is deferred (non-goal).

### Acceptance criteria

Objective (machine-checkable, user-run — agent runs no CLIs):

- **ACC-01:** `npx tsc --noEmit` exits 0 on a clean tree.
- **ACC-02:** `npx tsc -p tsconfig.test.json --noEmit` exits 0.
- **ACC-03:** `npm test` passes (existing `syncProcessor` suite green).
- **ACC-04:** `npx eslint .` stays clean (no new warnings/errors vs before).
- **ACC-05:** `git diff --stat` for the fix lists only `tsconfig.json`,
  `tsconfig.test.json`,
  `__mocks__/@react-native-async-storage/async-storage.ts` (+ spec/docs);
  and a probe use of `jest`/`describe` inside a non-test app file still fails
  app typecheck (proves CON-04, no leakage).

Subjective (human-judged, observable reviewer checks):

- **ACC-06:** reviewer confirms the CI `lint-typecheck` job is green on push,
  and confirms smoke parity in Expo Go (Android/iOS) plus
  `expo export --platform web` (no red-box, no behavior/visual change —
  expected: none, config-only change).

## 4. Deliverables

- **D-01 — `tsconfig.json` exclusion** per CON-02: add
  `"exclude": ["node_modules", "**/*.test.ts", "**/*.spec.ts", "__mocks__/**"]`
  (base already excludes `node_modules`; restated for explicitness).
- **D-02 — `tsconfig.test.json` coverage** per CON-03: `include` gains
  `"__mocks__/**/*.ts"`.
- **D-03 — Mock annotations** per DEC-02: explicit param/key types in
  `__mocks__/@react-native-async-storage/async-storage.ts`; logic unchanged.
- **D-04 — Docs** per AGENTS.md §1.8: `docs/savepoint.md` change-journal entry
  + `AGENTS.md §3 Current status` append after implementation.

## Glossary

| Term | Meaning |
|---|---|
| App typecheck | `npx tsc --noEmit` via `tsconfig.json`; app sources only after this spec |
| Test typecheck | `tsc -p tsconfig.test.json` + `ts-jest`; covers all Jest-only files |
| Jest-only files | `*.test.ts`, `*.spec.ts`, `__mocks__/**/*.ts`; never shipped, never app-checked |
| Leakage | Test globals (`jest`, `describe`, …) visible to app sources; forbidden by CON-04 |

## References

- `AGENTS.md §1` — working agreements (spec-first, no CLI, invariants, §1.9 format, §1.10 cross-platform TDD).
- `.github/workflows/ci.yml` — `lint-typecheck` job (`npx tsc --noEmit`).
- `tsconfig.json`, `tsconfig.test.json`, `jest.config.js`, `jest.setup.js`.
- `__mocks__/@react-native-async-storage/async-storage.ts`,
  `utils/syncProcessor.test.ts`.
- `node_modules/expo/tsconfig.base.json` — base `exclude` (no test/mocks exclusion).
