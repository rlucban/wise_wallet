# SPEC-71 — Financial Literacy App Guide Redo (Expanded Single Guide)

| Field | Value |
|---|---|
| ID | SPEC-71 |
| Title | Financial Literacy App Guide Redo (Expanded Single Guide) |
| Status | **FINAL** (2026-10-10 per user call) |
| Owner | User (final authority) |
| Version | 1.0 |
| Scope | `app/(tabs)/learning-detail.tsx`, new `utils/learningGuideContent.ts`, new `utils/learningGuideContent.test.ts`, `docs/savepoint.md` |
| Non-goals | New filter chips; new articles; list re-ordering; re-skin; new dependency; markdown renderer; interactive/accordion body; SPEC-63's non-literacy work (Sort, Reports icon, Dashboard FAB, Dues/Completed-Dues, Dark-mode surface) |
| Normative source | This file. File+symbol cites are normative; `:line` numbers are hints only. |

> **Branch note.** This spec is authored on branch `fix/pdf-multiplatform-download`
> and supersedes SPEC-63 **D-03/D-04 only** (WiseWallet app guide article +
> `App Guide` topic/filter) in this branch. SPEC-63's remaining deliverables are
> untouched and are cross-referenced here, never duplicated (§1.14). The
> `App Guide` chip in `app/(tabs)/learning.tsx:12` and the single resource in
> `utils/learningData.ts:72-80` remain — this spec expands the article body, not
> the navigation model.

## Terminology (RFC 2119)

The keywords **MUST**, **MUST NOT**, **SHOULD**, and **MAY** in this spec are
to be interpreted as described in RFC 2119. Informative prose is non-normative
unless restated as a requirement.

## 1. Context

### 1.1 Problem

SPEC-63 (D-03/D-04) added Financial Literacy's WiseWallet app guide: one
resource entry `wisewallet_app_guide` (topic `App Guide`) and a matching filter
chip. Today that article is a single short body in
`app/(tabs)/learning-detail.tsx:9-24` — roughly five mini-blocks
(Getting Started, a 7-step walkthrough, one Pro Tip) and under ~1,000
characters. It is a promo walkthrough, not a guide: it does not cover
Categories/Payment Methods, Dues details, Allocation archiving, Reports
export, Calendar/Notifications, Passcode/Security, or Settings/Data, despite
the app having 17 routes and a full offline/cloud model.

The single guide needs a real, much deeper structure — sectioned by feature,
in the existing plain-text article format — so new users can actually learn
the app from the Literacy tab. Per the user call, the structure comes first
(an ordered, docked section outline), the rich prose is a follow-up, the list
order/UI is unchanged, and the article keeps full parity (TTS read-aloud,
bookmarking) plus §1.10 platform tests.

### 1.2 Current state (non-normative, verified)

- `utils/learningData.ts:72-80` — `wisewallet_app_guide`, `topic: "App Guide"`, `audience: "Students"`.
- `app/(tabs)/learning.tsx:12` — `UNIFIED_FILTERS` includes `"App Guide"`; topic filter at `:76`; tag colors default branch at `:107-108`.
- `app/(tabs)/learning-detail.tsx:8-24` — `LEARNING_CONTENT.wisewallet_app_guide` = the short body; read-aloud uses `topic.content` (`:147`); blank-line-lettered blocks already render via a single `<Text>` (`:204`).
- `utils/learningSpeechLifecycle.test.ts`, `utils/tabBarFloat.test.ts`, `utils/themeColors.test.js` — existing guards that must keep passing.

## 2. Constraints (normative)

- **CON-01** Every change MUST remain Android + iOS + Web compatible; no `Platform.OS` branch may introduce platform-only content or copy.
- **CON-02** No new npm packages, native modules, or fonts (§1.12). The plain-text single-`<Text>` body format MUST be reused — no markdown, no parser, no accordion/HTML.
- **CON-03** The guide MUST remain **one** article: id `wisewallet_app_guide`, `topic "App Guide"`, `title "WiseWallet App Guide"`. MUST NOT add, remove, or rename resource entries, filter chips, badges, or list ordering in `utils/learningData.ts` or `app/(tabs)/learning.tsx` (user decision: keep current order/UI).
- **CON-04** The full expanded body, and only that body, MUST be the TTS read-aloud source on the detail screen (`speakWithFemaleVoice`, SPEC-11 path). SPEC-64 stop-on-navigation-away and the SPEC-63 bookmark flow MUST remain untouched.
- **CON-05** Section structure MUST follow the existing convention: blank-line-separated blocks; a block whose first line is unindented and ends with `:` is a section heading. All other lines are body lines. No numbered-sentinel or new markup.
- **CON-06** The expanded body MUST be a pure, statically-imported constant under `utils/` so the `roots: utils` jest setup can assert on it without rendering React Native.
- **CON-07** Structure-first ships terse but functional guidance: every docked section MUST carry real feature steps (2+ per section) plus one end `Pro Tips` block. MUST NOT ship empty sections, lorem text, or literal `TODO` markers rendered to users. The rich original prose pass is explicitly deferred to D-02.
- **CON-08** The jest guard MUST be parameterized by `Platform.OS` (`android` | `ios` | `web` mock) per §1.10 and MUST assert on the `ACC-*` objects below (deterministic counts/lengths/order only — never snapshots of prose).
- **CON-09** No code changes may run before this spec is marked FINAL (§1.1).

## 3. Goal

Expand the single WiseWallet `App Guide` article into a feature-complete,
structured walkthrough while leaving the Literacy list, chips, and card UI
byte-identical.

### Interaction matrix

| Surface | Action | Expected |
|---|---|---|
| Literacy | Tap the `App Guide` chip | Shows the one App Guide article (unchanged) |
| Literacy | Open *WiseWallet App Guide* | Detail renders an expanded, sectioned body (11 sections) |
| Detail | Scroll + read | Each section heading followed by real feature steps; no empty blocks |
| Detail | Tap play | Full expanded body is read aloud (female voice), stops on navigation away |
| Detail | Tap bookmark | Unchanged bookmark behavior (list-level) |
| Web | `expo export --platform web` | Same expanded body; no red-box; spec-06 clean styles |

### Decisions

- **DEC-01** Redo = content-expansion of the existing single article. No new article per feature, no new filter chip, no dedicated section — the user's "expand the single guide" choice governs SCOPE-63 D-03/D-04 supersession.
- **DEC-02** Docked outline is 11 ordered sections (see D-01). Terse functional bullets ship now ("structure, content later"); the rich-prose rewrite is the follow-up D-02.
- **DEC-03** Structure metadata is derived from the body string in tests (split on `\n\n`, heading = first unindented line ending in `:`), not duplicated in a second data structure — one home per fact (§1.14).
- **DEC-04** Body moves to a new pure module `utils/learningGuideContent.ts`; `learning-detail.tsx` imports it. A `D-*` item names the file, and it exists solely so the §1.10 jest guard can run under `roots: utils` without rendering a component.

### Acceptance

**Objective (machine-checkable — jest, parameterized by `Platform.OS`)**

- **ACC-01** The exported constant `APP_GUIDE_CONTENT` from `utils/learningGuideContent.ts` splits into **at least 11** blank-line blocks, and the heading (first unindented line ending in `:`) of the first 10 blocks equals, in order: `Getting Started`, `Using the Dashboard`, `Adding and Editing Transactions`, `Managing Categories and Payment Methods`, `Tracking Scheduled Dues`, `Building Allocations`, `Reading Reports and Exporting`, `Using the Calendar and Notifications`, `Protecting Your Account`, `Managing Settings and Data`; the last block's first line is `Pro Tips:`.
- **ACC-02** `APP_GUIDE_CONTENT.length` is **≥ 3,000** characters (was < ~1,000) and each of the 11 blocks contains at least 2 body lines after its heading.
- **ACC-03** `APP_GUIDE_CONTENT` contains no literal `TODO(` and no empty (`/\s+/`-only) body block.
- **ACC-04** `utils/learningData.ts` is byte-identical (resource count, `wisewallet_app_guide` fields, `LEARNING_CATEGORIES`), and `app/(tabs)/learning.tsx` still contains `"App Guide"` in `UNIFIED_FILTERS` and no list-order churn (guard scan on the two files).
- **ACC-05** `app/(tabs)/learning-detail.tsx` imports `APP_GUIDE_CONTENT` and `LEARNING_CONTENT.wisewallet_app_guide.content === APP_GUIDE_CONTENT` (single source; `topic.content` drives the read-aloud unchanged).

**Subjective (manual reviewer checks — Expo Go Android/iOS + `expo export --platform web`)**

- **ACC-06** Reviewer opens `App Guide` and confirms: the article reads top-to-bottom as coherent expand guide; every one of the 11 docked headings appears in the body text; no section shows empty/filler text; scrolling is smooth; no red-box in Expo Go, no console warning on web (SPEC-06 class).
- **ACC-07** Reviewer taps play: the full body is read aloud (female voice, SPEC-11); leaving the screen stops playback (SPEC-64); replay after returning works.

### Platform matrix

| Acc | Android | iOS | Web |
|---|---|---|---|
| ACC-01..05 (Objective) | jest mock | jest mock | jest mock |
| ACC-06 (Subjective) | Expo Go | Expo Go | web export |
| ACC-07 (Subjective) | Expo Go | Expo Go | web export |

## 4. Deliverables

- **D-01** New `utils/learningGuideContent.ts` — pure module exporting:
  - `APP_GUIDE_CONTENT: string` — the expanded body implementing the docked 11-section outline in this exact order:
    1. `Getting Started` — onboarding, opening balance, first login/register, account mode (Online/Local, SPEC-04).
    2. `Using the Dashboard` — Available-to-Spend balance, highlights, recent activity, circle `+` add, floating tab bar (SPEC-63/69).
    3. `Adding and Editing Transactions` — income vs expense, amount cap ₱10M (SPEC-amount), category, payment method, establishment/note, date, receipt photo; edit/delete on details; scheduled-due deletion lock (SPEC-32).
    4. `Managing Categories and Payment Methods` — custom categories, Sort by Name/Type/Recent (SPEC-63), payment methods.
    5. `Tracking Scheduled Dues` — add due with date picker (SPEC-08), recurring/one-time, pay flow + payment-method picker (SPEC-47), auto-renew, completed dues (SPEC-32/48).
    6. `Building Allocations` — goal amount + progress bar, transfer, archive/restore/delete permanently (SPEC-27/28).
    7. `Reading Reports and Exporting` — income-vs-expense donut, monthly trend, category breakdown, selected-period caption, CSV/PDF export (SPEC-33/34/70).
    8. `Using the Calendar and Notifications` — calendar navigation, local reminders.
    9. `Protecting Your Account` — 4-digit passcode, change passcode (SPEC-35), session-kill handling (SPEC-05), Make Online (SPEC-04).
    10. `Managing Settings and Data` — export/import, clear data, dark mode, PHP currency, auto-backup.
    11. `Pro Tips:` — closing guidance (record promptly, review reports, keep passcode private).
    Each of sections 1–10 MUST carry at least two terse functional steps; section 11 closes with 2+ tips. Terse steps, not full prose (deferred to D-02).
- **D-02** (deferred follow-up, not this implement) Enrich the D-01 outline into rich original prose per section. Blocked on approval of D-01's structure. Own spec note appended to `docs/savepoint.md` only — no code.
- **D-03** New `utils/learningGuideContent.test.ts` — jest, parameterized by `Platform.OS` mock (`android`/`ios`/`web`), asserting ACC-01..03 directly; ACC-04 via the existing gate-scanner pattern (read `utils/learningData.ts` + `app/(tabs)/learning.tsx` source); ACC-05 via a read of `app/(tabs)/learning-detail.tsx` source. No prose snapshots.
- **D-04** `app/(tabs)/learning-detail.tsx` — replace the inline `wisewallet_app_guide` body with the imported `APP_GUIDE_CONTENT` (single-source, CON-06). No other file change: `Speech`, `speakWithFemaleVoice`, SPEC-64/11 paths, and the rest of `LEARNING_CONTENT` byte-identical.
- **D-05** `docs/savepoint.md` — journal entry (this spec DRAFT, then FINAL+implement status; supersedes SPEC-63 D-03/D-04 in this branch per §1.14).

## 5. Glossary

- **Docked outline:** the ordered 11-heading structure contract in D-01 that the implementation must satisfy; content prose is a follow-up.
- **Single guide:** the one `wisewallet_app_guide` article under the existing `App Guide` topic/filter.
- **§1.10 guard:** the standing rule requiring a platform matrix and `Platform.OS`-parameterized jest coverage plus Expo Go/web-export manual checks.

## 6. References

- `AGENTS.md` (§1.1, §1.9–§1.12, §1.14)
- `specs/04-connection-status-vs-offline-mode.md` (template; account mode)
- `specs/63-ui-batch-settings-reports-literacy-dashboard-scheduled-dark-mode.md` (D-03/D-04 superseded here; remainder untouched)
- `specs/11-female-tts-voice-for-recommended-reading.md` (SPEC-11 read-aloud)
- `specs/64-stop-learning-voice-on-navigation-away.md` (playback lifecycle)
- `docs/savepoint.md`

## History

- **0.1 (2026-10-10)** — DRAFT. User call: expand the single guide; structure first, rich prose later; keep current list order/UI; full TTS/bookmark parity + §1.10 tests. Branch `fix/pdf-multiplatform-download`. Supersedes SPEC-63 D-03/D-04 in this branch. No implementation until FINAL.
- **1.0 (2026-10-10)** — FINAL per user call. Implement exactly this spec.