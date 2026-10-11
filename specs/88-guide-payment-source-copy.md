# SPEC-88 — Guide Live Prose: Payment Source Copy

| Field | Value |
|---|---|
| ID | SPEC-88 |
| Title | Rename live App Guide prose to Payment Source copy (SPEC-80's missed site) |
| Status | **FINAL v1.0** (marked FINAL by user 2026-10-11 — implementable) |
| Owner | User (final authority) |
| Version | 1.0 FINAL |
| Scope | 10 copy lines in `utils/learningGuideContent.ts` + repoint of SPEC-80's dead-file guard pin (`paySourceRename.test.ts:41-43`) + one pin update (`learningGuideContent.test.ts:29`) + one new guard file `utils/guidePaymentSource.test.ts` |
| Non-goals | No identifier/API/route/file-name change (SPEC-80 D-01 preserved); no article structure/title-count change; no SPEC-80/71/73 document edit; no CSV `Payment Method` header change (SPEC-33/34 column parity — observed, needs its own spec); no `add-transaction.tsx:92` console-string change (dev log, not UI); no new deps |
| Normative source | This file. File+symbol cites are normative; `:line` numbers are hints only. |

RFC 2119 terminology (MUST/MUST NOT/SHOULD/MAY) applies. Informative prose ("today", "currently") is non-normative unless restated as a requirement.

## Context

Chain, all source-traced (no device needed):

1. SPEC-80 renamed Payment Method → Payment Source at "7 sites"; its guard (`paySourceRename.test.ts:41-43`) pinned `learning-detail.tsx` containing `"payment source."` — a string that lived ONLY in the dead duplicate literal.
2. SPEC-87 v1.1 deleted that literal (lint `no-dupe-keys`, later-key-wins) and turned the pin red — exposing that the 7th site was dead text.
3. The LIVE guide body (`utils/learningGuideContent.ts` — what renders at `learning-detail.tsx:228` and what TTS reads at `:171`) still says "payment method(s)" in 10 lines across 3 articles (`:15,19,22,23,62,64,70,79,84,95`). The rename never reached the live prose. `app/` otherwise has zero UI survivors (only `add-transaction.tsx:92`, a `console.error` dev log — out of scope).

User call 2026-10-11: option **(a)** — rename the live prose (rejected: guard-only whitewash, revert of v1.1).

## Constraints

- **CON-01** Every change MUST keep Android + iOS + Web working, stay Expo Go (latest) import-safe, and stay Vercel-deployable.
- **CON-02** No new npm packages, native modules, fonts, images, or third-party code (AGENTS §1.12).
- **CON-03** Bare-minimum diff (AGENTS §1.11). ONLY the D-* items: the 10 copy lines, the two guard-pin edits, the new guard file. Article order/count, headings other than the two titles, all code, and every other line stay byte-identical.
- **CON-04** Exact replacement table (FINAL; prose stays lowercase per SPEC-80's `"payment source."` convention, titles stay Title Case):

| # | Location | Old (verbatim) | New (verbatim) |
|---|---|---|---|
| 1 | guide `:15` | `2. Select a category, payment method, and date; add an establishment and note for context.` | `2. Select a category, payment source, and date; add an establishment and note for context.` |
| 2 | guide `:19` (title) | `Managing Categories and Payment Methods:` | `Managing Categories and Payment Sources:` |
| 3 | guide `:22` | `2. Payment Methods stores the ways you pay, such as cash, cards, and e-wallets.` | `2. Payment Sources store the ways you pay, such as cash, cards, and e-wallets.` |
| 4 | guide `:23` | `3. Every transaction requires a category and a payment method, so keep both up to date.` | `3. Every transaction requires a category and a payment source, so keep both up to date.` |
| 5 | guide `:62` (title) | `Setting Up Categories and Payment Methods:` | `Setting Up Categories and Payment Sources:` |
| 6 | guide `:64` | `1. Cash is created as your first payment method; add cards and e-wallets in Settings.` | `1. Cash is created as your first payment source; add cards and e-wallets in Settings.` |
| 7 | guide `:70` | `2. Choose a category, payment method, and date, then save to update your balance.` | `2. Choose a category, payment source, and date, then save to update your balance.` |
| 8 | guide `:79` | `1. Each due has a title, amount, category, payment method, and start date.` | `1. Each due has a title, amount, category, payment source, and start date.` |
| 9 | guide `:84` | `1. Tap the + button and enter the amount, category, and payment method.` | `1. Tap the + button and enter the amount, category, and payment source.` |
| 10 | guide `:95` | `2. Confirm the payment method when prompted; the transaction keeps the due's category.` | `2. Confirm the payment source when prompted; the transaction keeps the due's category.` |

- **CON-05** Guard repoint (supersedes SPEC-80 ACC-01's guide lines, SPEC-80's document untouched per §1.14): `paySourceRename.test.ts:41-43` becomes a live-module pin — `readRepo("utils/learningGuideContent.ts")`, `toContain("payment source")`, `not.toContain("payment method")`, `not.toContain("Payment Method")`. Every other line of that file stays byte-identical.
- **CON-06** Pin update (SPEC-71's `TRIMMED_HEADINGS` pin, SPEC-71's document untouched per §1.14): `learningGuideContent.test.ts:29` becomes `"Managing Categories and Payment Sources",`. No other line of that file changes.
- **CON-07** Identical on Android, iOS, and Web — no `Platform.OS` / `Platform.select` branch. Any platform branch needs its own amendment first (§1.10).
- **CON-08** No code, config, or dependency change before this spec is marked FINAL by the user (AGENTS §1.1).

## Goal

The live guide reads Payment Source everywhere the app screens already do, and every guard pins live text — no guard pins dead code anymore.

### Interaction matrix

| Surface | Today | After (FINAL) |
|---|---|---|
| Live guide prose (renders + TTS) | 10× "payment method(s)" | 10× "payment source(s)" per CON-04 |
| SPEC-80 guard guide pin | Dead-file pin (red) | Live-module pin (green) |
| SPEC-71 headings pin | Old title | New title |
| CSV header / console log | Old copy | Byte-identical (own specs) |

### Decisions (FINAL — user marked final 2026-10-11 with no overriding calls; DRAFT proposals adopted as-is)

- **DEC-01 (FINAL)** Titles renamed with the body (rows 2/5). A "Payment Methods" header over "payment source" body would be incoherent. Rejected: body-only.
- **DEC-02 (FINAL)** New SPEC-88 home (rejected: SPEC-80 v1.2 amendment; rejected: SPEC-87 v1.2).
- **DEC-03 (FINAL)** Option (a): rename live prose (user call 2026-10-11).

Explicit supersessions (§1.14 — superseded documents NOT edited, this file governs):
- SPEC-80 ACC-01's `learning-detail.tsx` guide lines → D-02 repoint.
- SPEC-71 `TRIMMED_HEADINGS` pin (`learningGuideContent.test.ts:29`) → D-03 update.

### Acceptance

Platform matrix (§1.10): every Objective guard holds on `android` / `ios` / `web` (jest `Platform.OS` mock — pure copy, no platform branch); every Subjective check is user-run on Expo Go (Android/iOS) + `expo export --platform web` (agent never runs CLIs per AGENTS §1.3).

Objective — deterministic, machine-checkable (jest source-scan guards):

- **ACC-01** `utils/learningGuideContent.ts` holds all 10 new strings verbatim; holds zero `"payment method"` and zero `"Payment Method"` (substring cover includes plurals). Holds on android/ios/web.
- **ACC-02** `paySourceRename.test.ts` holds the live-module pin (CON-05) and zero `learning-detail` references; `learningGuideContent.test.ts:29` holds the new title; every other line of both files intact (spot-pinned: `>Payment Source</Text>`, `PAYMENT SOURCE / ACCOUNT`, `TRIMMED_HEADINGS` length 6). Holds on android/ios/web.
- **ACC-03** Scope: no identifier/API/route/file-name change (`PaymentMethod`, `paymentMethod: method`, `PaymentMethodChart`, report CSV header all intact); `learning-detail.tsx` needs no edit (renders module text); block count/order of all 5 articles intact. Holds on android/ios/web.

Subjective — human-judged UX as observable reviewer checks (explicit pass/fail, user-run):

- **ACC-S01** Reviewer on Android/iOS (Expo Go) confirms: the three articles read Payment Source throughout (spot-check all 10 lines), TTS speaks them identically, full `npx jest` green. FAIL = any old-copy survivor in-app or any suite red.
- **ACC-S02** Reviewer on Web confirms ACC-S01 identically with no console error. FAIL = any web-only deviation.

TDD coverage (§1.10): `utils/guidePaymentSource.test.ts` covers ACC-01..ACC-03 parameterized by `Platform.OS` (android/ios/web); ACC-S01/S02 are user-run manual checks exactly as written (prose/TTS are not jest-renderable — guards pin the strings).

## Deliverables

- **D-01** `utils/learningGuideContent.ts` ONLY: the 10 replacements per CON-04. No other line changes.
- **D-02** `utils/paySourceRename.test.ts` ONLY: guide-pin repoint per CON-05. No other line changes.
- **D-03** `utils/learningGuideContent.test.ts` ONLY: `:29` pin update per CON-06. No other line changes.
- **D-04** `utils/guidePaymentSource.test.ts` (new file, named here per §1.11): guards for ACC-01..ACC-03 × android/ios/web.
- **D-05** Docs after implementation (AGENTS §1.8, post-FINAL only): `docs/savepoint.md` entry + `AGENTS.md` §3 status line. NOT part of the spec-writing step; no doc edit ships with the DRAFT.

## Glossary

- **Live prose:** the `*_CONTENT` strings in `learningGuideContent.ts` — the only guide text that renders/TTS.
- **Dead-file pin:** a guard asserting copy in a file (or block) that never reaches the user — SPEC-80's `learning-detail.tsx` pin after v1.1.
- **Repoint:** moving a guard's `readRepo` target (and its literals) to the file that actually renders, without weakening what it asserts.

## References

- `AGENTS.md` (§1.9 spec format, §1.10 TDD/platform matrix, §1.11 bare-minimum, §1.12 no new deps, §1.13 overlap, §1.14 one home)
- `specs/04-connection-status-vs-offline-mode.md` (template)
- `specs/80-payment-source-rename-and-fetch-open.md` (SPEC-80 — rename home; scope line 10 + ACC-01; document NOT amended, ACC-01 guide lines superseded)
- `specs/71-financial-literacy-app-guide-redo.md` (SPEC-71 — content-module home; document NOT amended, headings pin superseded)
- `specs/87-theme-guard-peach-badge-exception.md` v1.1 (exposing deletion; document NOT amended)
- `utils/learningGuideContent.ts:15,19,22,23,62,64,70,79,84,95` (live hits) · `utils/paySourceRename.test.ts:41-43` (dead pin) · `utils/learningGuideContent.test.ts:26-33` (headings pin) · `app/(tabs)/learning-detail.tsx:171,228` (consumers proving the old pin was dead)
