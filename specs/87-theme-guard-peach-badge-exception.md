# SPEC-87 — Pinned Theme-Guard Exception for the SPEC-74 Peach Badge

| Field | Value |
|---|---|
| ID | SPEC-87 |
| Title | Pinned `themeColors` guard exception for the SPEC-74 fixed peach App Guide badge |
| Status | **FINAL v1.1** (v1.0 + v1.1 per user calls 2026-10-11 — implementable) |
| Owner | User (final authority) |
| Version | 1.0 FINAL |
| Scope | ONE comment on `app/(tabs)/learning.tsx:117` + ONE `ALLOWED_EXCEPTIONS` entry in `utils/themeColors.test.js` + one new guard file `utils/themeBadgeException.test.ts` |
| Non-goals | No color/visual change; no `SPEC-74` document edit; no other guard weakening; no new deps; no worker-teardown investigation (pre-existing jest warning, unrelated) |
| Normative source | This file. File+symbol cites are normative; `:line` numbers are hints only. |

RFC 2119 terminology (MUST/MUST NOT/SHOULD/MAY) applies. Informative prose ("today", "currently") is non-normative unless restated as a requirement.

## Context

User-run full `npx jest` (2026-10-11): 52/53 suites pass; the ONLY failure is `utils/themeColors.test.js` — `app/(tabs)/learning.tsx:117` hardcoded `"#FFDAB9"` / `"#5D4037"`.

Root cause, traced in source (no device needed): that line is the SPEC-74 FINAL-mandated fixed peach App Guide badge (`getPastelTagStyle`, `case "App Guide"` — SPEC-74 DEC-03 requires fixed literals so the badge is identical in light and dark mode). The guard forbids hardcoded colors with no per-line exception mechanism beyond its line-substring `ALLOWED_EXCEPTIONS` list, which was never extended when SPEC-74 landed. The spec and the guard directly contradict each other. User call 2026-10-11: option **(a)** — pin a guard exception, visuals unchanged (rejected: option (b) theme-token replacement).

Evidence: `grep #FFDAB9|#5D4037` shows exactly ONE app-code occurrence (`learning.tsx:117`); all other hits are docs/specs (`AGENTS.md`, `docs/savepoint.md`, `specs/74-*`) and the SPEC-74 guard (`learningGuideContent.test.ts:201-202`, which asserts the exact hexes — so the values MUST stay byte-identical). SPEC-86 is uninvolved (`app/onboarding.tsx` is not in the guard's `FILES_TO_CHECK`).

## Constraints

- **CON-01** Every change MUST keep Android + iOS + Web working, stay Expo Go (latest) import-safe, and stay Vercel-deployable.
- **CON-02** No new npm packages, native modules, fonts, images, or third-party code (AGENTS §1.12).
- **CON-03** Bare-minimum diff (AGENTS §1.11). ONLY: (a) a trailing marker comment on `learning.tsx:117`; (b) ONE `ALLOWED_EXCEPTIONS` entry in `utils/themeColors.test.js`; (c) the new guard file named in D-03. The hex bytes, the badge logic, `FILES_TO_CHECK`, every other exception entry, and every other line of both edited files stay byte-identical.
- **CON-04** Exact marker copy (FINAL): line 117 becomes `return { backgroundColor: "#FFDAB9", textColor: "#5D4037" }; // SPEC-87 pinned: SPEC-74 peach badge`, and the guard entry is the unique substring `"SPEC-87 pinned"` with a comment pointing at `learning.tsx:117` + SPEC-87. The entry MUST match the guard's existing mechanism (line skipped iff it contains an exception substring) — no new matching machinery.
- **CON-05** The exception MUST be pinned, not widened: after implementation, the substring `SPEC-87 pinned` MUST appear in exactly two places (the badge line + the guard entry). Any future reuse MUST come back as its own spec.
- **CON-06** Identical on Android, iOS, and Web — no `Platform.OS` / `Platform.select` branch. Any platform branch needs its own amendment first (§1.10).
- **CON-07** SPEC-74's document is NOT amended (§1.14 one home — this file owns the exception; SPEC-74 keeps the visual requirement).
- **CON-08** No code, config, or dependency change before this spec is marked FINAL by the user (AGENTS §1.1).

## Goal

Full `npx jest` green with the peach badge pixel-identical: the guard keeps forbidding hardcoded colors everywhere except the one SPEC-74-mandated line it now names.

### Interaction matrix

| Surface | Today | After (FINAL) |
|---|---|---|
| Badge line 117 | Exact hex, guard FAILs | Exact hex + marker comment, guard passes |
| Guard exceptions | No peach entry | ONE `"SPEC-87 pinned"` entry |
| Badge visuals | Peach `#FFDAB9` / `#5D4037` | Byte-identical |
| Any other hardcoded color | Guard FAILs | Guard FAILs (unchanged) |

### Decisions (FINAL — user marked final 2026-10-11 with no overriding calls; DRAFT proposals adopted as-is)

- **DEC-01 (FINAL)** Marker-comment mechanism per CON-04 (rejected: hex-value allowlist — value-based, would silently cover any future paste of those hexes elsewhere; rejected: structured per-file/per-line exception list — heavier machinery than the guard's line-substring design needs for a single line).
- **DEC-02 (FINAL)** Option (a): visuals unchanged (user call 2026-10-11; rejected: option (b) theme-token replacement).

### Acceptance

Platform matrix (§1.10): every Objective guard holds on `android` / `ios` / `web` (jest `Platform.OS` mock — the change itself has no platform branch); every Subjective check is user-run on Expo Go (Android/iOS) + `expo export --platform web` (agent never runs CLIs per AGENTS §1.3).

Objective — deterministic, machine-checkable (jest source-scan guards):

- **ACC-01** `app/(tabs)/learning.tsx` holds the badge line with the exact hexes AND the exact marker comment, exactly once each; each hex appears exactly once in the file (no spread). Holds on android/ios/web.
- **ACC-02** `utils/themeColors.test.js` holds the `"SPEC-87 pinned"` entry exactly once; `FILES_TO_CHECK` still lists the same 8 files (learning.tsx included, none added/removed); no other `ALLOWED_EXCEPTIONS` entry added, removed, or reworded. Holds on android/ios/web.
- **ACC-03** Wiring: badge line 117 contains at least one quoted exception substring parsed from the guard's own `ALLOWED_EXCEPTIONS` block (i.e. the guard as-written skips that line — the full-suite red goes green for the right reason, not by deleting the check). Holds on android/ios/web.

Subjective — human-judged UX as observable reviewer checks (explicit pass/fail, user-run):

- **ACC-S01** Reviewer on Android/iOS (Expo Go, light + dark) confirms the App Guide badge is still peach and full `npx jest` is green (only the pre-existing worker-teardown warning may remain). FAIL = badge color shift or any remaining suite failure.
- **ACC-S02** Reviewer on Web (`expo export`) confirms ACC-S01 identically with no console error. FAIL = any web-only deviation.

TDD coverage (§1.10): `utils/themeBadgeException.test.ts` covers ACC-01..ACC-03 parameterized by `Platform.OS` (android/ios/web); ACC-S01/S02 are user-run manual checks exactly as written (badge pixels are not jest-renderable — guards pin the contract).

## Deliverables

- **D-01** `app/(tabs)/learning.tsx` ONLY: trailing marker comment on line 117 per CON-04. No other line changes.
- **D-02** `utils/themeColors.test.js` ONLY: ONE `ALLOWED_EXCEPTIONS` entry per CON-04. No other line changes.
- **D-03** `utils/themeBadgeException.test.ts` (new file, named here per §1.11): guards for ACC-01..ACC-03 × android/ios/web.
- **D-04** Docs after implementation (AGENTS §1.8, post-FINAL only): `docs/savepoint.md` entry + `AGENTS.md` §3 status line. NOT part of the spec-writing step; no doc edit ships with the DRAFT.

## Glossary

- **Pinned exception:** a guard exception naming exactly one line via a unique marker substring (CON-05); the opposite of a widened (value- or pattern-based) exception.
- **Peach badge:** the SPEC-74 fixed App Guide topic badge (`#FFDAB9` background, `#5D4037` text, both modes).

## References

- `AGENTS.md` (§1.9 spec format, §1.10 TDD/platform matrix, §1.11 bare-minimum, §1.12 no new deps, §1.14 one home)
- `specs/04-connection-status-vs-offline-mode.md` (template)
- `specs/74-trim-overview-and-app-guide-section.md` (SPEC-74 — visual-requirement home, especially DEC-03; document NOT amended)
- `utils/themeColors.test.js:4-34` (scan list + exception mechanism), `app/(tabs)/learning.tsx:97-121` (`getPastelTagStyle`), `utils/learningGuideContent.test.ts:201-202` (hex-value pins that force byte-identical values)

---

## v1.1 Amendment — Drop dead duplicate `content` literal in learning-detail (FINAL per user call 2026-10-11)

User call 2026-10-11 ("spec this — drop the dead literal, ilagay mo sa spec 87 lang"): no new spec file — folded here as v1.1 (§1.14: one home, no duplication). v1.0 sections stay normative; where this amendment conflicts, v1.1 governs.

### v1.1 Constraints (delta)

- **CON-09** `app/(tabs)/learning-detail.tsx` ONLY: delete the dead inline `content` template literal in `wisewallet_app_guide` (lines 18-30, opener `content: \`Welcome to WiseWallet. This guide helps` through closer `becomes.\`,`), keeping `title` and `content: APP_GUIDE_CONTENT` (line 31) byte-identical. The `APP_GUIDE_CONTENT` import (line 7) stays. No other key, entry, line, or file changes.
- **CON-10** Behavior-identical by construction: duplicate-key later-wins is deterministic JS semantics, so line 31 already governs every consumer (`topic.content` rendered at `:228`, read aloud at `:171`); deleting the shadowed literal changes zero runtime bytes, zero TTS output, zero visuals.
- **CON-11** The ACC-04 guards live in the existing `utils/themeBadgeException.test.ts` (extended, NOT a new file — v1.1 stays in SPEC-87's single home; `learningGuideContent.test.ts` is SPEC-71's home and MUST NOT be touched per §1.14).
- **CON-12** Identical on Android, iOS, and Web — no `Platform.OS` / `Platform.select` branch. Any platform branch needs its own amendment first (§1.10).
- **CON-13** No v1.1 code beyond D-05/D-06. v1.0 deliverables stand.

### v1.1 Goal (delta)

| Surface | Today | After (v1.1 FINAL) |
|---|---|---|
| `wisewallet_app_guide` keys | Two `content` keys (lint `no-dupe-keys` red at 31:9) | ONE `content: APP_GUIDE_CONTENT` |
| Guide body + TTS | `APP_GUIDE_CONTENT` (line 31 wins) | Byte-identical |
| `npm run lint` on the file | 1 error | Clean |

Decisions:

- **DEC-03** Delete the dead literal, keep the import (rejected: keeping inline + dropping line 31 — that would swap the article body and TTS to the stale inline text and contradict SPEC-71/74's content home in `learningGuideContent.ts`).
- **DEC-04** Fold into SPEC-87, no SPEC-88 (user call; rejected: separate spec — adjacent static-guard red on the Learning surfaces and the user ordered one home).
- **DEC-05** Guards extend the SPEC-87 pin file (rejected: new guard file — a second file for a 13-line deletion violates §1.11; rejected: touching SPEC-71's guard file — §1.14).

Acceptance (all × android/ios/web where machine-checkable):

- **ACC-04** Source scan: the `wisewallet_app_guide` block holds exactly one `content:` occurrence (`content: APP_GUIDE_CONTENT`); the stale inline opener (`content: \`Welcome to WiseWallet. This guide helps`) is absent; the `APP_GUIDE_CONTENT` import is present; every other entry (`app_guide_*`, `budgeting_101`, …) intact. Holds on android/ios/web.
- **ACC-S03** Reviewer on Android/iOS (Expo Go) confirms: `npm run lint` clean on the file; opening the App Guide article shows the identical body and TTS reads it identically. FAIL = lint red remains or any body/audio difference.
- **ACC-S04** Reviewer on Web confirms ACC-S03 identically. FAIL = any web-only deviation.

### v1.1 Deliverables (delta)

- **D-05** `app/(tabs)/learning-detail.tsx` ONLY: dead-literal deletion per CON-09. No other line changes.
- **D-06** `utils/themeBadgeException.test.ts`: extended with ACC-04 guards × android/ios/web (no new test file per DEC-05).
- **D-07** Docs after v1.1 implementation (AGENTS §1.8, post-FINAL only): `docs/savepoint.md` entry + `AGENTS.md` §3 status line.
