# Spec 31: Align Native Module Patch Versions with Expo SDK 57 (Expo Go)

| Field | Value |
|---|---|
| ID | SPEC-31 |
| Title | Align Native Module Patch Versions with Expo SDK 57 (Expo Go) |
| Status | **DRAFT** — awaiting user FINAL approval before any dependency change |
| Owner | User (final authority) |
| Version | 1.0 |
| Scope | `package.json` + `package-lock.json` + `node_modules` only. Six native packages bumped one patch version to the range `expo ~57.0.24` requires. |
| Non-goals | Any `.ts`/`.tsx` source change; `.env` / env handling; the offline banner, `NetworkContext`, `authFetch`, login/register, or any SPEC-30 code; `app.json`; adding or removing dependencies; Expo Go notification behavior (`isExpoGo()` stays a no-op path) |
| Normative source | This file. File+symbol cites are normative; `:line` numbers are hints only. |

> Raised 2026-10-01 per user call — "only fix the expo go, leave anything else alone". The
> diagnosis is `npx expo-doctor` 20/21: the failing check is "Check that packages match
> versions required by installed Expo SDK". SPEC-30's connectivity/banner/login items are
> explicitly deferred, not approved.

## Terminology (RFC 2119)

**MUST**, **MUST NOT**, **SHOULD**, and **MAY** are as described in RFC 2119. Informative prose
is non-normative unless restated as a requirement.

## 1. Context

### 1.1 Observed state

`npx expo-doctor@latest` reports 20/21 checks passed; the single failure is the SDK
version-alignment check, with these patch mismatches against `expo ~57.0.24`:

| package | required by SDK 57 | installed |
|---|---|---|
| `expo-document-picker` | `~57.0.3` | `57.0.2` |
| `expo-image-picker` | `~57.0.20` | `57.0.19` |
| `expo-linking` | `~57.0.11` | `57.0.10` |
| `expo-notifications` | `~57.0.21` | `57.0.20` |
| `expo-router` | `~57.0.24` | `57.0.22` |
| `expo-sharing` | `~57.0.22` | `57.0.21` |

All six contain native code. The bundle itself is healthy — `npx expo export --platform
android` succeeds (5.5 MB Hermes bytecode, no resolution errors, `app.json` plugins validate) —
so this is a version skew between the JS dependency graph and the native module set that Expo Go
ships, not a bundling defect.

### 1.2 Why this breaks Expo Go specifically

An Expo Go binary embeds a fixed set of native module versions. It does not resolve the app's
`package.json` for native code. A JS side that requests an older patch than the runtime embeds
yields a native-module skew at runtime — a red box on load, or a module that resolves in a dev
build and is unavailable in Go. `expo-router` carries the highest risk here because the app's
entire navigation tree is built on it.

### 1.3 Rollback

`git checkout -- package.json package-lock.json` followed by `npm install`. No source, storage,
API, or route is involved, so rollback is exact.

## 2. Constraints (normative)

- **CON-01 — Dependency-only change.** Exactly the six packages in §1.1 MUST move to the ranges
  the SDK requires. `package.json` MUST NOT gain or lose any other dependency, and no version
  range outside those six entries may change.
- **CON-02 — Single command.** The bump MUST be performed by
  `npx expo install --fix`, which resolves ranges from the installed SDK. Hand-edited version
  strings MUST NOT be used.
- **CON-03 — No source change.** No file under `app/`, `context/`, `utils/`, `hooks/`,
  `components/`, `repositories/`, `types/`, or `supabase/` may be modified by this spec. `app.json`
  MUST NOT change. `expo install --fix` is expected to rewrite only `package.json` and
  `package-lock.json`; any other file it reports changing is a failure of this spec.
- **CON-04 — No new package.** No dependency may be added, removed, or renamed, and no
  `expo.install.exclude` entry may be introduced.
- **CON-05 — Expo Go behavior unchanged.** `isExpoGo()` (`utils/notifications.ts:23-29`) MUST
  continue to make `scheduleDueNotifications` and `areLocalRemindersSupported()` no-ops, and
  `expo-notifications` MUST remain lazily `require`d behind that guard. Local due reminders are
  therefore expected to be inert in Expo Go after this spec; that is intended, not a regression.
- **CON-06 — SPEC-30 untouched.** The cold-start login forcing, `SystemResetManager` guard,
  `lastActiveUserId` reminder hint, and `NetworkContext` sync-queue gate all remain exactly as
  implemented. The offline-banner and `cloud_not_configured` items raised in the same discussion
  remain out of scope and unapproved.
- **CON-07 — Verification gates.** `npx expo-doctor` MUST report 21/21; `npm test` MUST stay
  98/98; `npm run lint` MUST report 0 errors and 0 warnings; `npx tsc --noEmit` MUST report 0
  errors. (Commands are run by the user, per AGENTS.md §1.3.)
- **CON-08 — Rollback stated.** §1.3 applies.

## 3. Goal

The dependency graph matches the installed Expo SDK 57 exactly, so the native modules the app
requests are the ones Expo Go embeds, and the app loads in Expo Go without a native-module
skew — with no source-level change of any kind.

### 3.1 Platform matrix

| Platform | Objective (machine-checkable) | Subjective (reviewer observation) |
|---|---|---|
| **Android (Expo Go)** | ACC-01..ACC-06 | ACC-07 |
| **iOS (Expo Go)** | ACC-01..ACC-06 | ACC-07 |
| **Web** | ACC-01..ACC-06 | ACC-08 |

`expo-document-picker`, `expo-image-picker`, `expo-linking`, `expo-router`, and `expo-sharing`
all have web implementations, so the web build is re-verified for regressions. Local
notifications are excluded from all three platforms (CON-05).

### 3.2 Acceptance criteria (Objective — machine-checkable)

| ID | Criterion |
|---|---|
| **ACC-01** | `npx expo-doctor` reports `21/21 checks passed`, 0 failed. |
| **ACC-02** | `package.json` resolves the six packages of §1.1 to `~57.0.3`, `~57.0.20`, `~57.0.11`, `~57.0.21`, `~57.0.24`, `~57.0.22` respectively, and every other dependency entry is byte-identical to the pre-change file. |
| **ACC-03** | `git status` after the change lists exactly `package.json` and `package-lock.json`; no tracked source file, `app.json`, or `.env` is modified. |
| **ACC-04** | `npm test` reports `98 passed, 98 total`, 0 failed. |
| **ACC-05** | `npm run lint` reports 0 errors and 0 warnings; `npx tsc --noEmit` reports 0 errors. |
| **ACC-06** | `npx expo export --platform android` succeeds, and `npx expo export --platform web` succeeds, so the Vercel path (AGENTS.md §1.6) still works. |

### 3.3 Acceptance criteria (Subjective — reviewer observation, per platform)

| ID | Criterion | Pass condition |
|---|---|---|
| **ACC-07** | Android and iOS: run `npx expo start`, scan the QR with Expo Go, and load the app on each platform. | The app loads with **no red box**; no "module isn't available" / native-module error; Login/Register renders per SPEC-30. Reload from Expo Go's dev menu also succeeds. |
| **ACC-08** | Web: `npm run build:web`, then load the exported site. | The web build renders Login/Register with no console resolution error, confirming the six bumps did not regress the web implementations. |

### 3.4 Decisions

- **DEC-01:** `npx expo install --fix` rather than hand-edited ranges — the SDK is the single
  source of truth for the expected range, and hand-editing is the documented cause of this class
  of drift (CON-02).
- **DEC-02:** No `expo.install.exclude` entry is added; the doctor output is the authority and
  suppressing it would hide a real skew.
- **DEC-03:** Version alignment is treated as the whole fix. The `expo-notifications` SDK bump
  lands as a side effect of the SDK-required range, but no notification code changes (CON-05).
- **DEC-04:** The `EXPO_PUBLIC_API_URL` and Metro-cache items from the same diagnosis are not in
  this spec: the CLI already loads `.env` (`env: load .env`), so there is nothing to fix there,
  and any banner/login change is deferred per the user call.
- **DEC-05:** No jest tests are added. The change is dependency metadata with no logic of its own;
  the risk it carries is environmental, verified by ACC-01, ACC-06, and ACC-07/ACC-08 rather than
  by a unit test.

## 4. Deliverables

- **D-01** — Run `npx expo install --fix`, bumping exactly the six packages of §1.1 (CON-01..CON-04).
- **D-02** — Confirm via `git status` that only `package.json` and `package-lock.json` changed
  (ACC-03).
- **D-03** — Verification: report the user's `npx expo-doctor`, `npm test`, `npm run lint`,
  `npx tsc --noEmit` output against ACC-01 and ACC-04/ACC-05; ACC-06..ACC-08 are user-run.
- **D-04** — Documentation: append the entry to `docs/savepoint.md` and a `Current status` bullet
  to `AGENTS.md` §3 (AGENTS.md §1.8), including the §1.4 note that the Expo Go device must run an
  SDK 57 Expo Go build, with the rollback in §1.3.

## Glossary

| Term | Meaning |
|---|---|
| Expo Go | The Expo sandbox runtime that loads a Metro dev bundle. It embeds a fixed set of native module versions. |
| SDK version skew | The app's JS dependency graph requesting native modules at versions different from the ones the runtime embeds. |
| Patch mismatch | A package installed one patch version behind the range the installed SDK requires. |
| `expo-doctor` | Expo's project validator; its SDK alignment check is the authority for the six ranges in §1.1. |

## References

- `npx expo-doctor@latest` output 2026-10-01 — 20/21, SDK alignment failure with the §1.1 table
- `package.json:16-57` — the six entries in `dependencies`; `expo` is `~57.0.24`
- `utils/notifications.ts:23-29` — `isExpoGo()` (CON-05); `:31-42` — lazy `require("expo-notifications")`
- `app.json:26-54` — plugins (CON-03, unchanged)
- `AGENTS.md` §1.1 (spec-first, no dependency change without FINAL), §1.3 (user runs CLIs), §1.4 (breaking changes + rollback), §1.6 (Vercel-deployable), §1.7 (Expo Go safe), §1.8 (docs), §1.10 (platform matrix)
