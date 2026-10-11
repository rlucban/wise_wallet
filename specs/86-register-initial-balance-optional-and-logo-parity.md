# SPEC-86 — Register Flow: Initial-Balance "Optional" Copy + Logo Parity

| Field | Value |
|---|---|
| ID | SPEC-86 |
| Title | Register flow: mark Initial Balance optional, unify header logo with main auth logo |
| Status | **FINAL v1.0** (marked FINAL by user 2026-10-11 — implementable) |
| Owner | User (final authority) |
| Version | 1.0 FINAL |
| Scope | `app/onboarding.tsx` header logo + Initial Balance label/copy ONLY + one new guard file `utils/registerOnboardingParity.test.ts` |
| Non-goals | No balance-validation change; no default-value change; no API/storage/route change; no `app/register.tsx` field addition; no new deps; no SPEC-04/37/43 document edit |
| Normative source | This file. File+symbol cites are normative; `:line` numbers are hints only. |

RFC 2119 terminology (MUST/MUST NOT/SHOULD/MAY) applies. Informative prose ("today", "currently") is non-normative unless restated as a requirement.

## Context

User call (Tagalog, 2026-10-11): *"register = dapat yung pag initial balance may nakalagay na 'optional' lang to at yung logo dapat same sa main na logo palitan hindi dapat na ganyan na cash"*.

Problem, traced in source (no device needed):

1. **"Initial balance … optional".** `app/register.tsx` has NO balance field today — both creation paths hardcode `initialBalance: 0` (`createLocalAccount`, `register.tsx:58`; `createCloudAccount`, `register.tsx:80,89`). The only Initial Balance input in the register→intro→onboarding flow is `app/onboarding.tsx:108-121`: `label="Initial Balance"`, default `"0"` (`onboarding.tsx:19`), left icon `cash-multiple` (`onboarding.tsx:116`), footer `onboarding.tsx:144` ("Your initial balance will be recorded as your first income transaction."). Nothing says optional, so a first-time user reads it as required.
2. **"Logo … same sa main … hindi … cash".** The auth-flow main logo is the white `MaterialCommunityIcons name="wallet"` glyph: `register.tsx:208` (size 42), `login.tsx:298` (size 42), `intro.tsx:14` (STEPS[0] `"wallet"`). The odd one out is `app/onboarding.tsx:78`: `<Text style={styles.walletEmoji}>💰</Text>` (money-bag emoji, 64pt) — the only cash-like header logo in the flow. The `cash-multiple` TextInput icon (`onboarding.tsx:116`) is a field icon, not the header logo.

## Constraints

- **CON-01** Every change MUST keep Android + iOS + Web working, stay Expo Go (latest) import-safe (no static native-only import at top level), and stay Vercel-deployable (`EXPO_PUBLIC_*` only, no Node APIs in app code).
- **CON-02** No new npm packages, native modules, fonts, images, or third-party code (AGENTS §1.12). The replacement logo MUST reuse the already-imported vector glyph family used by register/login (`MaterialCommunityIcons` / `@expo/vector-icons` — both already in the tree); no asset-file addition.
- **CON-03** Bare-minimum diff (AGENTS §1.11). ONLY `app/onboarding.tsx` changes: (a) Initial Balance label/copy gains the exact "optional" wording from CON-04; (b) the `💰` header node becomes the main-logo glyph per CON-05. No validation, default-value (`"0"`), `parseAmount`/10M cap, `buildOpeningBalancePayload`, footer-copy, layout, style-constant, or navigation change. `app/register.tsx`, `app/login.tsx`, `app/intro.tsx` stay byte-identical.
- **CON-04** Exact "optional" copy (FINAL): field `label="Initial Balance (Optional)"`. No HelperText addition, no footer rewrite, no placeholder change.
- **CON-05** Logo parity (FINAL): `💰` `<Text>` node replaced with `<MaterialCommunityIcons name="wallet" size={64} color="#fff" />` centered in the existing `styles.header` (same glyph + color as register/login, size kept at 64 to preserve the onboarding header hierarchy — register/login use 42 in a tighter header). `styles.walletEmoji` MUST be removed or left unused-free (no dead style to trip lint). No other header line (appName/tagline) changes.
- **CON-06** Identical on Android, iOS, and Web — no `Platform.OS` / `Platform.select` branch for either change. Any platform branch needs its own amendment first (§1.10).
- **CON-07** The `cash-multiple` field icon (`onboarding.tsx:116`) is OUT of scope and MUST stay byte-identical (it is a field affordance, not the header logo).
- **CON-08** No code, config, or dependency change before this spec is marked FINAL by the user (AGENTS §1.1).

## Goal

First-time users see that Initial Balance is skippable and see one consistent WiseWallet mark across register → login → intro → onboarding.

### Interaction matrix

| Surface | Today | After (FINAL) |
|---|---|---|
| Onboarding header | 💰 emoji (64pt) | White `wallet` glyph (64pt), same family as register/login/intro |
| Initial Balance field | `label="Initial Balance"` | `label="Initial Balance (Optional)"` |
| Balance behavior | Default `"0"`, 0 allowed, >10M rejected | Byte-identical (copy-only change) |
| Register screen | `wallet` glyph + email + PIN | Byte-identical (no field added) |

### Decisions (FINAL — user marked final 2026-10-11 with no overriding calls; DRAFT proposals adopted as-is)

- **DEC-01 (FINAL)** Scope = onboarding-only. Rejected: adding a balance field to `app/register.tsx` — that would change the `POST auth/register` body, `validateRegisterInput`, SPEC-37 payload builder, and SPEC-43 once-only guard; far beyond "may nakalagay na optional".
- **DEC-02 (FINAL)** Exact optional wording: `Initial Balance (Optional)` as the field label, nothing else. Rejected: helper-text and em-dash variants.
- **DEC-03 (FINAL)** Logo size: 64 (preserves onboarding header hierarchy). Rejected: 42 pixel-match.
- **DEC-04 (FINAL)** `cash-multiple` input icon stays; `assets/*.png` untouched; SPEC-04/37/43 documents untouched (§1.14 one home).

### Acceptance

Platform matrix (§1.10): every Objective guard holds on `android` / `ios` / `web` (jest `Platform.OS` mock); every Subjective check is user-run on Expo Go (Android/iOS) + `expo export --platform web` (agent never runs CLIs per AGENTS §1.3).

Objective — deterministic, machine-checkable (jest source-scan guards):

- **ACC-01** `app/onboarding.tsx` holds the FINAL optional wording verbatim (`label="Initial Balance (Optional)"`) exactly once, and holds zero other "optional" strings in the file. Holds on android/ios/web.
- **ACC-02** `app/onboarding.tsx` holds zero `💰` / `walletEmoji` references, renders `MaterialCommunityIcons` with `name="wallet"` + `color="#fff"` in the header, and `app/register.tsx` + `app/login.tsx` still render `name="wallet"`. Holds on android/ios/web.
- **ACC-03** Scope guard: `git-diff` equivalent source scan — only `app/onboarding.tsx` + the new guard file change; no validation/default/API/storage/route/dep/`Platform.OS` change; `cash-multiple` still present once. Holds on android/ios/web.

Subjective — human-judged UX as observable reviewer checks (explicit pass/fail, user-run):

- **ACC-S01** Reviewer on Android/iOS (Expo Go) confirms: onboarding header shows the same white wallet mark as register/login (no cash emoji), and the balance field reads Optional; leaving the default `0` completes setup exactly as today. FAIL = cash glyph remnant, missing Optional, or any behavior/validation difference.
- **ACC-S02** Reviewer on Web (`expo export`) confirms ACC-S01 identically with no console error and no layout shift (header spacing unchanged). FAIL = any web-only deviation (triggers a CON-06 amendment, not a silent branch).

TDD coverage (§1.10): `utils/registerOnboardingParity.test.ts` covers ACC-01..ACC-03 parameterized by `Platform.OS` (android/ios/web); ACC-S01/S02 are user-run manual checks exactly as written (copy pixels and header hierarchy are not jest-renderable — guards pin the contract).

## Deliverables

- **D-01** `app/onboarding.tsx` ONLY: header-logo swap + optional label per CON-04/CON-05 (FINAL wording/size govern). No other line changes.
- **D-02** `utils/registerOnboardingParity.test.ts` (new file, named here per §1.11): guards for ACC-01..ACC-03 × android/ios/web.
- **D-03** Docs after implementation (AGENTS §1.8, post-FINAL only): `docs/savepoint.md` entry + `AGENTS.md` §3 status line. NOT part of the spec-writing step; no doc edit ships with the DRAFT.

## Glossary

- **Main auth logo:** the white `MaterialCommunityIcons "wallet"` glyph shared by register/login/intro headers.
- **Cash-like logo:** the `💰` emoji header node in onboarding today (the only header in the flow not using the wallet glyph).
- **Optional marking:** verbatim "(Optional)" copy on the Initial Balance field; behavior (default 0, 0 allowed) unchanged.

## References

- `AGENTS.md` (§1.9 spec format, §1.10 TDD/platform matrix, §1.11 bare-minimum, §1.12 no new deps, §1.14 one home)
- `specs/04-connection-status-vs-offline-mode.md` (template)
- `specs/37-onboarding-opening-balance-payment-method.md` (SPEC-37 — payload builder home; NOT amended)
- `specs/43-onboarding-opening-balance-once-only.md` (SPEC-43 — once-only guard home; NOT amended)
- `app/onboarding.tsx:19` (default `"0"`), `:78` (💰), `:108-121` (balance field), `:116` (field icon, out of scope), `:144` (footer, unchanged)
- `app/register.tsx:58,80,89` (hardcoded `initialBalance: 0`), `:208` (wallet glyph); `app/login.tsx:298` (wallet glyph); `app/intro.tsx:14` (wallet step)
