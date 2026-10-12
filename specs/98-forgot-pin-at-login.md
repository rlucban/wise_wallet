# SPEC-98 — Forgot PIN? at Login (Account Existence Check + PIN Change)

## Metadata
| Field | Value |
|---|---|
| ID | SPEC-98 |
| Title | Forgot PIN? at Login — verify account exists, then proceed with new PIN change |
| Status | FINAL (2026-10-11) |
| Owner | AI Agent |
| Version | 1.0 |
| Scope | Login screen ("Forgot PIN?") only. Register untouched. Verify account exists first; set new PIN (not reveal current). |
| Non-goals | Email OTP/SMS, 3rd-party recovery, deep linking, unlock flow (passcode-screen.tsx), Settings Change Passcode (SPEC-35), self-service Cloud→Local, new auth primitives. |

## RFC 2119
MUST, MUST NOT, SHOULD, SHOULD NOT, MAY.

## Context
Wallet API has `POST /api/auth/forgot-passcode` (public, no auth): `{name, newPasscode}`; rotates sessionId; returns `{user:{id}}`. No currentPasscode. Cloud existence-check endpoint MUST be created in `wallet_API` (public, no Vercel-specific auth, auto-working). Client: local `master_users` (SHA256) for offline/local accounts; token mode via `isLocalAccountToken`/`useIsLocalAccount`. Web constraints per SPEC-36.

## Constraints
- **CON-01 — Login-only.** MUST NOT modify `app/register.tsx`.
- **CON-02 — No PIN reveal.** Change to new PIN (enter new 4-digit PIN + confirm). MUST NOT display current PIN.
- **CON-03 — Verify existence first.** Check before allowing change. For Cloud use new `POST /api/auth/check-account` (public) with `{name}`; returns 200 `{exists:true}` or 404 generic error.
- **CON-04 — Generic errors.** Never enumerate: use `"Account not found or cannot reset PIN on this device."` for not-found; throttled cases use generic. Rate-limit `check-account` and `forgot-passcode`.
- **CON-05 — Case-insensitive + trim.** `name = email.trim().toLowerCase()` on client and server.
- **CON-06 — Mode-aware.** No API_URL → local-only. Local tokens ("offline_token"/"local_token") → local path. Cloud (API_URL configured; attempting Cloud flow means API reachable) → Cloud path via `authFetch`/`fetch`.
- **CON-07 — Local multi-device.** If local account only on another device → generic CON-04 message (device-local).
- **CON-08 — Web legacy locals.** If detected as legacy web local needing migration (SPEC-36), block Forgot PIN and show: `"Local-only accounts on web require migration. Go to Settings → Make Online."`
- **CON-09 — Success.** Return to Login, pre-fill email, show dialog `"PIN changed successfully. Please log in with your new PIN."` — MUST NOT auto-login.
- **CON-10 — Validation.** 4-digit numeric, new PIN == confirm, both required. No new≠current enforcement required for forgot (unauthenticated).
- **CON-11 — Reuse.** `utils/db.ts` (`getUsers`, `updateUserPasscode`), `PasscodeContext` hashed persist (SPEC-35), `utils/apiClient.ts`, `utils/authMode.ts`, Dialogs (SPEC-26/65/71), centering (SPEC-92/89/93/94/95).
- **CON-12 — Security.** No PIN/hash/token logging. Generic errors.
- **CON-13 — Platform parity.** Android + iOS + Web where possible; web constraints per SPEC-36.

## Deliverables
- **D-01 — wallet_API: `POST /api/auth/check-account`** (public, no Vercel auth). Body `{name}`; 200 `{exists:true}` if user found; 404 generic message. Rate-limited. Uses existing `userRepository.findByName` + normalization (trim+lowercase). Auto-working on deploy.
- **D-02 — wallet_API: `forgot-passcode`** (already public) — ensure normalization (trim+lowercase) and generic 404; no protect.
- **D-03 — Client `app/login.tsx`**: add "Forgot PIN?" link under Login button, center-aligned (match SPEC-92). No Register changes.
- **D-04 — Client flow**: two-step Dialogs. Step 1: email input → check existence. Local: scan `getUsers()` case-insensitively. Cloud: `POST {API_URL}/auth/check-account` with `{name}`. On 404 → generic CON-04. On 200 → Step 2. Step 2: new PIN + confirm → validate 4-digit+match → apply. Local: `updateUserPasscode(id,new)` + `PasscodeContext` re-hash/persist (SPEC-35). Cloud: `POST {API_URL}/auth/forgot-passcode` `{name,newPasscode}` → on 200 return to Login pre-filled + success dialog.
- **D-05 — Web legacy guard**: if legacy web local detected (needs migration per SPEC-36), block Step 1 and show guidance (CON-08).
- **D-06 — Tests**: `utils/forgotPin.test.ts` ACC-* × android/ios/web (existence, local change, Cloud check+forgot, not-found generic, confirm mismatch, 4-digit, web legacy guard, case-insensitive).
- **D-07 — Docs**: `docs/savepoint.md` history entry; this spec FINAL.

## Acceptance
- **ACC-01**: "Forgot PIN?" visible on Login only; centered under Login button.
- **ACC-02**: Non-existent email → generic error (no enumeration).
- **ACC-03**: Local existing → set new PIN twice → login accepts new PIN.
- **ACC-04**: Cloud existing → check-account then forgot-passcode → success returns to Login pre-filled.
- **ACC-05**: 4-digit + confirm match enforced; malformed rejected.
- **ACC-06**: Web legacy local → guidance shown; no change applied.
- **ACC-07**: Case-insensitive lookup works.