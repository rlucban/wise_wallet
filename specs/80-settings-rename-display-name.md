# SPEC-80 — Settings Rename Display Name

| Field | Value |
|---|---|
| ID | SPEC-80 |
| Title | Settings Rename Display Name |
| Status | **FINAL** (2026-10-11 per user call) |
| Owner | User (final authority) |
| Version | v1.0 |
| Scope | `app/(tabs)/settings.tsx` (pencil control + rename dialog + save path) + tests under `utils/` + docs |
| Non-goals | Login identity (`authName`, `master_users`, server auth account name/email); `UserProfileContext` API/`updateProfile` change; offline sync queue; a separate rename screen; storage-key/API-contract/route/dependency changes |
| Normative source | This file. File+symbol cites are normative; `:line` numbers are hints only. |

> History: created 2026-10-11 (v0.1 DRAFT) after clarification round — display
> name only (not login identity), Cloud-only visibility, reuse `updateProfile`
> (online sync, surface errors; native best-effort, no queue), pencil
> `IconButton` + inline dialog with `showMessage` feedback.

## Terminology (RFC 2119)

The keywords **MUST**, **MUST NOT**, **SHOULD**, and **MAY** in this spec are
to be interpreted as described in RFC 2119. Informative prose (examples,
"today", "currently") is non-normative unless restated as a requirement.

- **Display name:** `profile.name` — the friendly name shown in Settings
  (`app/(tabs)/settings.tsx:1280`) and used for the avatar initials (`:1276`).
- **Login identity:** `authName` (AsyncStorage) and the `master_users` row name,
  which for Cloud accounts is the email entered at register/login and is what
  `wallet-api` authenticates. Distinct from the display name.
- **Rename:** the new action that edits the display name only.

## 1. Context

### 1.1 Problem

Settings shows the display name but offers no way to change it
(`app/(tabs)/settings.tsx:1273-1285`). A user who set a placeholder or skipped
onboarding (SPEC-79, blank name → "Wise User") cannot set a friendly name
without recreating the account.

### 1.2 Existing behavior (non-normative)

- `updateProfile({ name })` (`context/UserProfileContext.tsx:108-138`) already
  persists the profile and syncs it:
  - **web:** `PUT userProfiles/{id}` and **throws** on `!ok`;
  - **native:** local repo upsert + `setProfile`, then `PUT userProfiles/{id}`
    as a best-effort `try/catch` (no queue, no throw).
- Login identity is a separate store: `authName` set at register/login
  (`app/register.tsx:57,95`, `app/login.tsx:104,208`) and `master_users` rows
  (`utils/db.ts:261-271`). Renaming the display name MUST NOT touch these.

### 1.3 Resolved decisions (user call, 2026-10-11)

- **DEC-01 — Display name only.** Rename edits `profile.name` only. Login
  identity (`authName`, `master_users`, server account name) MUST NOT change.
- **DEC-02 — Cloud accounts only.** The rename control MUST be visible only
  when the account is not Local-only (`!isLocal`); Local-only accounts MUST NOT
  see it.
- **DEC-03 — Reuse `updateProfile`; online sync, surface errors.** The save
  path MUST call the existing `updateProfile({ name })`. On web a failed PUT
  throws and MUST surface an error; on native the Cloud PUT stays best-effort
  (local name applied, no queue) and MUST NOT add an offline-sync mechanism.
- **DEC-04 — Pencil + inline dialog.** A pencil `IconButton` beside the name
  opens a Paper `Dialog` with a `TextInput` prefilled with the current name and
  Save/Cancel; trimmed non-empty is required; success/failure is reported via
  the existing `showMessage` dialog.
- **DEC-05 — All platforms.** Android + iOS + Web (web is always non-Local per
  SPEC-36, so the control shows there). No platform-only behavior beyond the
  existing `updateProfile` branches.
- **DEC-06 — Tests.** Platform-parameterized `jest` source-text guards plus a
  user-run Expo Go + web-export manual matrix (AGENTS §1.10).

## 2. Constraints (normative)

- **CON-01 — Bare-minimum diff.** Only `app/(tabs)/settings.tsx` MAY change in
  app code, plus the test and journal files named in D-*. No other file; no
  `UserProfileContext` change; no refactor or copy change beyond the pencil
  control, its dialog, and the save handler. The profile card row MAY add
  `flex: 1` to the existing middle `View` and the new `IconButton` only.
- **CON-02 — No new dependencies.** No npm packages or native modules. Reuse
  existing imports (`IconButton`, `Dialog`, `TextInput`, `Button`, `showMessage`).
- **CON-03 — Cloud-only (DEC-02).** Both the pencil `IconButton` and the rename
  `Dialog` MUST be gated on `!isLocal`. A Local-only account MUST render
  neither.
- **CON-04 — Display name only (DEC-01).** The save path MUST call
  `updateProfile({ name })` and nothing else. It MUST NOT write `authName`,
  `master_users`, or any server auth/account name, and MUST NOT import or add
  identity-write calls.
- **CON-05 — Save path (DEC-03/DEC-04).** The save handler MUST trim the input,
  refuse to submit when the trimmed value is empty, and wrap
  `await updateProfile({ name })` in `try/catch`. On success it MUST close the
  rename dialog and `showMessage("success", …)`; on failure (web `!ok` throw) it
  MUST close the rename dialog and `showMessage("error", …)`. The input MUST be
  length-capped (50).
- **CON-06 — Reuse, no contract change (DEC-03).** The rename path MUST NOT add
  a context action, change `updateProfile`'s signature, or introduce an offline
  queue. The native best-effort semantics are accepted as-is.
- **CON-07 — Cross-platform invariant (AGENTS §1.5).** Android + iOS + Web MUST
  work; no statically imported native-only module at file top level; no
  Node-only APIs in app code.
- **CON-08 — Vercel-deployable / Expo Go safe (AGENTS §1.6/§1.7).** Web export
  stays clean; nothing may crash Expo Go on import.
- **CON-09 — TDD with cross-platform coverage (AGENTS §1.10).** `jest`
  parameterized by `Platform.OS` (`android`/`ios`/`web`) for the checkable
  branches (source-text guards, per repo precedent for screen behavior `jest`
  cannot render) plus the user-run manual matrix in D-03.
- **CON-10 — No breaking changes (AGENTS §1.4).** No storage-key,
  `wallet-api`-contract, AsyncStorage-shape, navigation-route, or native-dep
  change. No migration.

## 3. Goal

Add a Cloud-only pencil control beside the Settings display name that opens a
prefilled dialog and saves the new display name through the existing
`updateProfile` sync path (DEC-01..DEC-06).

### Interaction matrix

| # | Account | Action | Result |
|---|---|---|---|
| 1 | Cloud | tap pencil | dialog opens, `TextInput` prefilled with `profile.name` |
| 2 | Cloud | Cancel / dismiss | dialog closes; no write; name unchanged |
| 3 | Cloud | Save empty/whitespace | blocked (no `updateProfile` call) |
| 4 | Cloud (web/native) online, valid name | Save | `updateProfile({ name })`; local + server updated; success message |
| 5 | Cloud web, PUT fails | Save | error message (web throws) |
| 6 | Cloud native offline | Save | local name applied; best-effort PUT (no queue); success message |
| 7 | Local-only | — | no pencil, no dialog |

### Acceptance criteria

Objective (machine-checkable, `jest` × android/ios/web):

| ID | Check |
|---|---|
| ACC-01 | Profile card renders a pencil `IconButton` gated on `!isLocal` (source guard: presence + `isLocal` guard). |
| ACC-02 | A `Dialog` exists with a `TextInput` bound to the current `profile?.name` and Save/Cancel actions. |
| ACC-03 | The save handler trims the input and does not call `updateProfile` when the trimmed value is empty. |
| ACC-04 | The save handler calls `updateProfile({ name: … })` inside `try/catch` and calls `showMessage` on both success and error. |
| ACC-05 | The rename path adds no `authName`/`master_users`/identity write (source guard). |
| ACC-06 | `updateProfile` signature is unchanged and no new context action is added (source guard). |
| ACC-07 | `npx jest` 0 failed (new + existing suites); `npm run lint` 0 errors/0 warnings; `npx tsc --noEmit` 0 errors. |

Subjective (reviewer-observed):

- **ACC-S01:** Expo Go Cloud account → pencil → type a new name → Save → Settings
  and the avatar initials update immediately.
- **ACC-S02:** web: rename → reload the page / sign in on a second web session →
  the new name persists (server sync).
- **ACC-S03:** Local-only account (native) shows no pencil.
- **ACC-S04:** empty/whitespace Save does nothing; Cancel leaves the name
  unchanged; web offline Save shows the error message.
- **ACC-S05:** `expo export --platform web` builds; rename works; no red-box /
  console error.

## 4. Deliverables

- **D-01 — Pencil control + rename dialog + save handler** in
  `app/(tabs)/settings.tsx` (CON-01..CON-06): a pencil `IconButton` beside the
  name (gated `!isLocal`), a `Dialog` with a prefilled `TextInput` (max 50) and
  Save/Cancel, and a handler that trims, guards empty, `await
  updateProfile({ name })` in `try/catch`, and reports via `showMessage`. The
  message dialog MUST remain the last Portal child (SPEC-58 paint order).
- **D-02 — `utils/profileRename.test.ts`** source-text guards ACC-01..ACC-06,
  parameterized by `Platform.OS` (`android`/`ios`/`web`).
- **D-03 — User-run matrix ACC-S01..ACC-S05** (Expo Go Android/iOS + web
  export), per AGENTS §1.3.
- **D-04 — `docs/savepoint.md` journal + `AGENTS.md` §3 entry** (AGENTS §1.8).

## Glossary

| Term | Meaning |
|---|---|
| Display name | `profile.name`; shown in Settings, drives avatar initials. |
| Login identity | `authName` / `master_users` name (email); authenticates with `wallet-api`. |
| Rename | Cloud-only action that edits the display name only. |

## References

- `AGENTS.md §1` — working agreements (spec-first, no CLI, invariants, TDD, docs).
- `app/(tabs)/settings.tsx:1273-1285` — profile card; `:1135-1148`
  `showMessage`/`closeMessage`.
- `context/UserProfileContext.tsx:108-138` — `updateProfile` (web throw / native
  best-effort).
- `utils/db.ts:156-178,258-293` — profile + `master_users` stores (untouched).
- `app/register.tsx:57,95`, `app/login.tsx:104,208` — `authName` writes (untouched).
- `specs/36-web-platform-invariants.md` — web always-Online (rename shows on web).
- `specs/58-web-lock-store-and-dialog-order.md` — message-dialog Portal ordering.
- `specs/79-onboarding-skip-to-dashboard.md` — skip can leave a blank name.
