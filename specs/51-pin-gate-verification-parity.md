# SPEC-51 — PIN Gate Verification Parity (Clear Data + Local Backup)

| Field | Value |
|---|---|
| ID | SPEC-51 |
| Title | PIN gate verification parity for Clear All Data + Local Backup ON (converged server → local rule, PIN-state + copy fixes) |
| Status | **FINAL** v0.1 (marked by user 2026-10-07; implementable per AGENTS.md §1.1) |
| Owner | User (final authority) |
| Version | v0.1 DRAFT |
| Scope | `app/(tabs)/settings.tsx` PIN gates only (`verifyPinForSync`, `handleClearData`, `createNewAccountAndMigrate` PIN-state, gate dialog copy) + one named pure helper + tests + journal |
| Non-goals | Server auth contract/payload keys; display-name canonicalization; Change-PIN save path (SPEC-35 owned); Delete Account flow (already converged — regression guard only); tab bar (SPEC-52); new deps/routes/storage keys |
| Normative source | This file (once marked FINAL). File+symbol cites are normative; `:line` numbers are hints only. |

> History: v0.1 DRAFT 2026-10-07 from plan-fix run `20261007-session.md`
> (Track A, Option A). No normative content before FINAL mark.
> FINAL 2026-10-07 per user call ("Final") — content unchanged.

## Terminology (RFC 2119)

The keywords **MUST**, **MUST NOT**, **SHOULD**, and **MAY** in this spec are
to be interpreted as described in RFC 2119. Informative prose (examples,
"today", "currently") is non-normative unless restated as a requirement.

## Context

### Problem

In one sentence: **Settings asks for a PIN at Clear All Data and at
Local Backup ON, then rejects the correct PIN — because three gates in one
file verify the same PIN by three different rules, the Backup gate has no
offline fallback and misdirects server rejects into "Create New Account",
and it clears the PIN from state before the migrate step reuses it.**

### Evidence (verified read-only, this tree)

- `app/(tabs)/settings.tsx:323-359` — `verifyPinForSync` is server-only
  (no local fallback); any non-`ok` clears `pinVerificationInput` (`:349-350`)
  then opens `showNewAccountDialog`, whose `createNewAccountAndMigrate`
  (`:397`) reuses the just-cleared PIN.
- `app/(tabs)/settings.tsx:768-815` — `handleClearData` tries server login
  (`name: profile?.name`, `force: true`), then falls back to a SHA256-only
  local compare (`user.passcode === inputHash`, `:798`) — no plaintext-OR.
- `app/(tabs)/settings.tsx:1001-1037` — `verifyAccountPin` (Delete Account,
  reported working) tries server, then falls back to SHA256-**or**-plaintext
  (`user.passcode === inputHash || user.passcode === pin.trim()`, `:1029`).
- `context/PasscodeContext.tsx:105-111` — `verifyPasscode` (app-lock, SPEC-35)
  is a fourth rule (session-plaintext-wins else stored hash); it is NOT a
  gate here and MUST stay out of scope.
- `utils/db.ts:257-288` — `master_users` holds SHA256 (`addUser`,
  `updateUserPasscode`); some rows MAY be plaintext (hence the `:1029` OR).
- Likely false-mismatch triggers: display-name drift against server login
  (SPEC-38 notes onboarding writes display names) → 401 on correct PIN;
  offline Backup attempt → no local path at all.

### Notes (informative)

- The Delete Account gate is the reference implementation: it is the one
  users report works. Convergence means Clear + Backup adopt its rule, not
  a newly invented fifth rule.
- The server login payload keys (`name`, `passcode`, `force`) stay exactly
  as-is; any name-canonicalization is a server-contract matter (out of scope).
  Drift cases are rescued by the local fallback, which is the point of DEC-51-01.

## Constraints (normative)

- **CON-51-01 — Bare-minimum diff (§1.11).** Only the two gate verify paths,
  the PIN-state clearing lines, and the dialog copy named in CON-51-09 MAY
  change, plus the files named in D-*. No other `settings.tsx` change.
- **CON-51-02 — No new modules except the named helper (§1.11/§1.12).**
  Convergence MUST reuse logic in-file; exactly one new pure helper MAY be
  added and only the one named in D-51-04. No npm packages, no native modules.
- **CON-51-03 — Frozen neighbors.** `handleChangePasscode` (SPEC-35),
  `context/PasscodeContext.tsx`, `utils/db.ts` hash functions,
  `utils/apiClient.ts`, and the server payload keys MUST stay byte-identical.
- **CON-51-04 — Gating invariant.** No destructive or confirmed action MAY
  proceed unless server-`ok` OR local-verify succeeds. No silent proceed,
  no auto-proceed on error.
- **CON-51-05 — Backup offline is fail-closed.** Enabling cloud sync requires
  server cooperation, so offline Backup MUST NOT proceed and MUST NOT queue;
  it MUST show the exact CON-51-09 offline copy (mirrors SPEC-35 CON-03
  rationale). Clear offline MAY proceed on local-ok (wipe is device-local;
  the cloud phase keeps its existing best-effort + Partial copy).
- **CON-51-06 — Cross-platform invariant (§1.5).** Behavior MUST be identical
  on Android + iOS + Web; no new native imports; no new `Platform.OS`
  branches (none needed — all branches already exist).
- **CON-51-07 — Expo Go safe (§1.7) / Vercel-deployable (§1.6).** Logic-only
  change; nothing new at import time; `EXPO_PUBLIC_*` only (unchanged).
- **CON-51-08 — TDD with cross-platform coverage (§1.10).** `jest`
  parameterized by `Platform.OS` (`android`/`ios`/`web`) for the helper plus
  source-text guards (repo precedent) for orchestration; user-run manual
  matrix for dialog/native paths jest cannot prove. No platform-only behavior
  exists in this spec, so no per-platform CON is needed.
- **CON-51-09 — Copy (exact).** Backup-offline error:
  `"Connect to enable cloud sync."` Local-verified cloud-mismatch dialog —
  title `"PIN Doesn't Match"`, body `"Your PIN is correct on this device,
  but it doesn't match the cloud account. You can create a new cloud
  account with this PIN and migrate your local data to it."` (existing
  sub-caption unchanged). Clear-incorrect copy unchanged
  (`"Incorrect PIN" / "Please try again."`).

## Goal

### Interaction matrix

| Gate | Online, server-ok | Online, server-reject + local-ok | Online, both fail | Offline, local-ok | Offline, local-fail |
|---|---|---|---|---|---|
| Clear All Data | proceed to confirm | proceed to confirm (cloud phase best-effort, existing Partial copy) | Incorrect PIN | proceed (local wipe; cloud best-effort) | Incorrect PIN |
| Backup ON / Make Online | existing conflict flow | corrected mismatch dialog, PIN preserved for migrate | Incorrect PIN | CON-51-09 offline copy (fail-closed) | Incorrect PIN |
| Delete Account | unchanged | unchanged | unchanged | unchanged | unchanged |

### Decisions

- **DEC-51-01 (RECOMMENDED):** order stays server → local (server precedence
  preserved; local rescues drift/offline). Local rule = SHA256-or-plaintext
  (Delete's rule, DEC-51-02) — accepts legacy plaintext rows as accepted tech
  debt; no migration (migration is breaking-risk, out of scope).
- **DEC-51-02 (RECOMMENDED):** the mismatch dialog appears only after
  local-ok (never on local-fail), so "Create New" always means "device PIN
  confirmed, cloud disagrees" — the misdirect is structurally impossible.
- **DEC-51-03 (RECOMMENDED):** PIN state is preserved across failure →
  migrate/retry; cleared only on success-complete, dialog cancel, or the
  existing migrate `finally`.
- **DEC-51-04 (RECOMMENDED):** Change-PIN save path untouched; regression
  covered by existing SPEC-35 tests + ACC-S04 (byte-identical guard).

### Acceptance

Objective (machine-checkable):

| ID | Android | iOS | Web | Check |
|----|---------|-----|-----|-------|
| ACC-01 | ✅ | ✅ | ✅ | Both gates route through the converged rule: source-text guard finds zero server-only gate without a local fallback, and `handleClearData` fallback carries the plaintext-OR |
| ACC-02 | ✅ | ✅ | ✅ | Helper unit tests: correct PIN matches SHA256 row and legacy plaintext row; wrong PIN fails; blank/non-4-digit fails (`Platform.OS` ×3) |
| ACC-03 | ✅ | ✅ | ✅ | Backup offline shows exact CON-51-09 copy and issues zero auth calls (jest + manual airplane) |
| ACC-04 | ✅ | ✅ | ✅ | Source-text guard: no state-clear of the verify PIN between mismatch-dialog show and migrate read; migrate posts the user-typed PIN |
| ACC-05 | ✅ | ✅ | ✅ | `handleChangePasscode` diff empty + existing SPEC-35 tests green (no-regression guard) |
| ACC-06 | ✅ | ✅ | ✅ | `jest` 0 failed, `lint` clean, `tsc` clean; no dep/storage-key/route/contract change |

Subjective (reviewer-observed, Expo Go + web export):

- **ACC-S01:** correct PIN clears data (Cloud online); wrong PIN shows Incorrect; airplane-mode Clear works on local PIN.
- **ACC-S02:** Backup ON in airplane mode shows the exact offline copy, no spinner hang.
- **ACC-S03:** Local → Make Online with cloud-absent PIN shows the corrected dialog; Create New & Migrate succeeds and the same PIN logs in after.
- **ACC-S04:** Delete Account + Change Passcode behave exactly as before (side-by-side with pre-change build).
- **ACC-S05:** web export shows no console errors on any gate path.

## Deliverables

- **D-51-01 (`app/(tabs)/settings.tsx`, gates only):** route
  `verifyPinForSync` + `handleClearData` through the converged server →
  local (SHA256-or-plaintext) rule per DEC-51-01/02 + matrix; Backup offline
  fail-closed per CON-51-05. Nothing else in these hunks.
- **D-51-02 (`app/(tabs)/settings.tsx`, PIN state only):** preserve the
  verify PIN across failure → migrate/retry per DEC-51-03 (remove the
  premature clears; keep success-complete/cancel/`finally` clears).
- **D-51-03 (`app/(tabs)/settings.tsx`, copy only):** exact CON-51-09
  strings; no other copy touched.
- **D-51-04 (new `utils/pinGate.ts`, ≤30 lines):** pure
  `verifyLocalPin(pin, storedHash)` (same `expo-crypto` SHA256 call as
  `addUser`, injectable digest default for tests) implementing the
  hash-or-plaintext compare. Only new file allowed by this spec.
- **D-51-05 (tests `utils/pinGate.test.ts` + source-text guards):**
  ACC-01..04 across `android`/`ios`/`web`.
- **D-51-06 (docs):** `docs/savepoint.md` + `AGENTS.md` §3 entry per §1.8.
  Status flips to FINAL only on explicit user call.

## Glossary

- **Gate:** a PIN dialog that must verify before a destructive/upgrade action proceeds.
- **Converged rule:** server-`ok` OR local (`master_users`, SHA256-or-plaintext) success.
- **local-ok / server-ok:** the corresponding check succeeded for the typed PIN.
- **Fail-closed:** refuse while offline (Backup) rather than queue or guess.
- **Plaintext-OR (accepted debt):** legacy rows accepted as-is; no migration in this spec.

## References

- `app/(tabs)/settings.tsx` (`verifyPinForSync`, `handleClearData`, `verifyAccountPin`, `createNewAccountAndMigrate`, gate dialogs) · `utils/db.ts:257-288` (`master_users`) · `context/PasscodeContext.tsx:105-111` (out of scope — cited to forbid touching).
- `specs/35-pin-change-persistence-and-promotion-safety.md` (SPEC-35 owns the save path; regression guard) · `specs/04-connection-status-vs-offline-mode.md` (Make Online flow ownership; probe rules) · `specs/38-settings-account-mode-token-only.md` (mode copy) · `specs/36-web-platform-invariants.md` (web API-direct) · `specs/39-web-auto-backup-switch-disabled.md` (web switch already disabled).
