# SPEC-90 — PIN Verify Freshness Window (Skip Re-Verify When Fresh)

| Field | Value |
|---|---|
| ID | SPEC-90 |
| Title | Skip Step-1 re-verify within 5 minutes of a PIN proof (Local only) |
| Status | **FINAL v1.0** (marked FINAL by user 2026-10-11 — implementable) |
| Owner | User (final authority) |
| Version | 1.0 FINAL |
| Scope | `context/PasscodeContext.tsx` (timestamp + setter + helper) + 1 line in `app/passcode-screen.tsx` + Step-1/save gates in `app/(tabs)/settings.tsx` + one new guard file `utils/pinVerifyFreshness.test.ts` |
| Non-goals | No Cloud behavior change (server owns the PIN — hard constraint below); no wallet-api change; no new storage keys; no lockout policy; no lock-screen UI change; no new user-visible copy (reuse only); no new deps |
| Normative source | This file. File+symbol cites are normative; `:line` numbers are hints only. |

RFC 2119 terminology (MUST/MUST NOT/SHOULD/MAY) applies. Informative prose ("today", "currently") is non-normative unless restated as a requirement.

## Context

User call 2026-10-11 (Tagalog): kaka-verify pa lang (lock screen o kaka-change lang) tapos hihingin ulit ang current PIN sa Change Passcode — *"dapat hindi"*. Window call: **5 minutes**. Changer stays in after save (SPEC-35/SPEC-API-02, `settings.tsx:219`) — the pain is re-verification, not a logout.

Hard constraint (not negotiable, source-traced): Cloud save POSTs `{ currentPasscode, newPasscode }` (`settings.tsx:197-200`) and the server verdict wins (401 → back to Step 1). Skipping the Step-1 UI for Cloud cannot work — there would be no current PIN to send, and `wallet-api` is external. Local-only by construction.

Mechanism: every Local PIN proof stamps a memory-only timestamp; Change Passcode skips Step-1 while the stamp is fresh.

## Constraints

- **CON-01** Every change MUST keep Android + iOS + Web working, stay Expo Go (latest) import-safe, and stay Vercel-deployable.
- **CON-02** No new npm packages, native modules, fonts, images, or third-party code (AGENTS §1.12).
- **CON-03** Bare-minimum diff (AGENTS §1.11). ONLY the D-* items. Cloud paths, Step-2, no-lock branches, modal container, error copies, and every other line stay byte-identical.
- **CON-04** Freshness contract (FINAL): `PIN_VERIFY_FRESH_MS = 5 * 60 * 1000` in `PasscodeContext.tsx` (named here per §1.11); `lastPinVerifiedAt: number | null` state (starts `null`); `markPinVerified()` sets `Date.now()`; pure exported helper `isPinVerificationFresh(ts)` returns `ts !== null && Date.now() - ts < PIN_VERIFY_FRESH_MS`. Memory-only: MUST NOT use storage keys, SecureStore, or AsyncStorage — restart wipes it (fail-closed). Reset to `null` in the existing account-change/sign-out clear (`PasscodeContext.tsx:72-74` area) alongside the other clears.
- **CON-05** Mark sites (exactly three, Local-semantics): lock-screen unlock success (`passcode-screen.tsx`, beside `setIsUnlocked(true)`); Step-1 Local verify success (settings verify handler, before `setPinStep(2)`); Local change success (`handleChangePasscode` Local path, beside `setPasscode(next)`). Login PIN entry does NOT mark (cold start re-locks anyway, so the unlock mark covers it).
- **CON-06** Skip gates (Local + lock only): (a) at BOTH dialog-open sites (`settings.tsx:1449,1458`), if Local + lock enabled + fresh → open at `pinStep` 2, else step 1 (today's behavior; close still resets to 1); (b) at Local save, if fresh → skip `verifyPasscode(current)`; if stale → `setPinStep(1)` + existing copy `Enter your current 4-digit PIN.` via `setChangePasscodeError` (zero new strings). Cloud save byte-identical (current always required).
- **CON-07** Identical on Android, iOS, and Web — no `Platform.OS` / `Platform.select` branch. Any platform branch needs its own amendment first (§1.10).
- **CON-08** No code, config, or dependency change before this spec is marked FINAL by the user (AGENTS §1.1).

## Goal

Kaka-verify mo lang → diretso new-PIN entry. Luma na o ibang sitwasyon → verify gaya ngayon. Cloud → laging verify.

### Interaction matrix

| Account | Fresh (≤5 min, same process) | Expected |
|---|---|---|
| Local + lock | Unlock/change moments ago | Dialog opens at Step 2; save skips verify |
| Local + lock | Stale / restart / never | Step 1 as today; save verifies as today |
| Local, no lock | — | Direct new-PIN fields (existing, untouched) |
| Cloud | — | Step 1 always; API body unchanged |

### Decisions (FINAL — user marked final 2026-10-11 with no overriding calls; DRAFT proposals adopted as-is)

- **DEC-01 (FINAL)** 5-minute window (user call 2026-10-11).
- **DEC-02 (FINAL)** Local only — Cloud immovable per the API-body hard constraint above.
- **DEC-03 (FINAL)** Memory-only stamp, fail-closed on restart/account change (rejected: persisted stamp — survives restart, weaker; rejected: per-login stamp — redundant with re-lock).
- **DEC-04 (FINAL)** Mark events = unlock + Step-1-ok + change-ok (rejected: login marks — cold start re-locks, unlock covers it).
- **DEC-05 (FINAL)** Stale-at-save falls back to Step-1 with the existing `Enter your current 4-digit PIN.` copy (rejected: new copy — unnecessary string).

### Acceptance

Platform matrix (§1.10): every Objective guard holds on `android` / `ios` / `web` (jest `Platform.OS` mock — no platform branch in the change); every Subjective check is user-run on Expo Go (Android/iOS) + `expo export --platform web` (agent never runs CLIs per AGENTS §1.3).

Objective — deterministic, machine-checkable (jest source-scan guards):

- **ACC-01** `PasscodeContext.tsx` holds `PIN_VERIFY_FRESH_MS = 5 * 60 * 1000`, `lastPinVerifiedAt` state starting `null`, `markPinVerified` setting `Date.now()`, an exported pure `isPinVerificationFresh`, reset-to-`null` in the account-change clear, and zero new storage/secure-store keys. Holds on android/ios/web.
- **ACC-02** The three mark sites present (unlock, Step-1-ok, Local-change-ok); BOTH open sites gate step 2 on Local + lock + fresh; Local save skips verify when fresh and falls back to Step-1 with the existing copy when stale. Holds on android/ios/web.
- **ACC-03** Cloud byte-identical: POST body still `{ currentPasscode, newPasscode }`, Cloud Step-1/verify untouched; no new user-visible strings anywhere in the diff; no `Platform.OS` added. Holds on android/ios/web.

Subjective — human-judged UX as observable reviewer checks (explicit pass/fail, user-run):

- **ACC-S01** Reviewer on Android/iOS (Expo Go, Local): unlock → open Change → lands on new-PIN entry (no verify); complete a change → reopen → still skips; restart app (or wait out the window) → verify returns; wrong-PIN behavior unchanged when asked. FAIL = any deviation.
- **ACC-S02** Reviewer on Web confirms ACC-S01 identically (session survives refresh per SPEC-30 v1.2, but the memory-only stamp does not — post-refresh MUST verify), plus Cloud account still always verifies. FAIL = any web-only deviation.

TDD coverage (§1.10): `utils/pinVerifyFreshness.test.ts` covers ACC-01..ACC-03 parameterized by `Platform.OS` (android/ios/web); ACC-S01/S02 are user-run manual checks exactly as written (timestamps/focus are not jest-renderable — guards pin the contract).

## Deliverables

- **D-01** `context/PasscodeContext.tsx` ONLY: timestamp state + setter + constant + helper + reset per CON-04 (Data/Actions split preserved). No other line changes.
- **D-02** `app/passcode-screen.tsx` ONLY: `markPinVerified()` beside unlock success. No other line changes.
- **D-03** `app/(tabs)/settings.tsx` ONLY: skip-at-open at both sites + mark on Step-1-ok + save-gate/mark per CON-05/CON-06. No other line changes.
- **D-04** `utils/pinVerifyFreshness.test.ts` (new file, named here per §1.11): guards for ACC-01..ACC-03 × android/ios/web.
- **D-05** Docs after implementation (AGENTS §1.8, post-FINAL only): `docs/savepoint.md` entry + `AGENTS.md` §3 status line. NOT part of the spec-writing step; no doc edit ships with the DRAFT.

## Glossary

- **Fresh:** `Date.now() - lastPinVerifiedAt < 5 min`, same process lifetime.
- **PIN proof:** lock-screen unlock, Step-1 Local verify success, or Local change success.
- **Fail-closed:** restart/account change clears the stamp → verify returns.

## References

- `AGENTS.md` (§1.9 spec format, §1.10 TDD/platform matrix, §1.11 bare-minimum, §1.12 no new deps, §1.14 one home)
- `specs/04-connection-status-vs-offline-mode.md` (template)
- `specs/35-pin-change-persistence-and-promotion-safety.md` (SPEC-35 — changer-stays-in, lock/verify homes; NOT amended)
- `specs/89-change-passcode-ios-entry-ui.md` (SPEC-89 — Step-1 UI home; NOT amended, visuals preserved)
- `context/PasscodeContext.tsx:29-36,72-74,105-124` (state/clear/verify/actions) · `app/passcode-screen.tsx:29-41` (unlock) · `app/(tabs)/settings.tsx:152-160,164-251,1449,1458,1909-1928` (close/save/open/verify)
