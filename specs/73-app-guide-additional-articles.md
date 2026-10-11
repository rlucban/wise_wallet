# SPEC-73 — Additional WiseWallet App Guide Articles

| Field | Value |
|---|---|
| ID | SPEC-73 |
| Title | Additional WiseWallet App Guide Articles |
| Status | **FINAL** (2026-10-11 per user call) |
| Owner | User (final authority) |
| Version | 1.0 |
| Scope | `utils/learningData.ts`, `utils/learningGuideContent.ts`, `app/(tabs)/learning-detail.tsx`, `utils/learningGuideContent.test.ts`, `docs/savepoint.md`, `AGENTS.md` §3 |
| Non-goals | New filter chips; audience tags on the new guides; list re-ordering of the existing six audience articles; re-skin; new dependency; markdown renderer; changes to SPEC-71's existing `APP_GUIDE_CONTENT` body; changes to SPEC-72's audience removal |
| Normative source | This file. File+symbol cites are normative; `:line` numbers are hints only. |

> **Branch note.** Authored on branch `fix/pdf-multiplatform-download`. This spec
> **supersedes SPEC-71 CON-03 only** (the "guide MUST remain one article" rule)
> by allowing additional `App Guide` resources. Everything else in SPEC-71
> (the existing 11-section `APP_GUIDE_CONTENT` body, single-source import,
> §1.10 guards) and all of SPEC-72 stay in force and MUST remain green
> (§1.14 cross-reference, never duplicate).

## Terminology (RFC 2119)

The keywords **MUST**, **MUST NOT**, **SHOULD**, and **MAY** in this spec are
to be interpreted as described in RFC 2119. Informative prose is non-normative
unless restated as a requirement.

## 1. Context

### 1.1 Problem

Today the `App Guide` topic contains a **single** article, `wisewallet_app_guide`
(`utils/learningData.ts:73-79`), whose body is one 11-section overview
(`utils/learningGuideContent.ts`). SPEC-71 CON-03 deliberately locked the topic
to one article. New users who want a focused how-to for a specific feature have
only the long overview to scroll.

Per the user call (2026-10-11): add **four** focused App Guide articles alongside
the existing overview — *Getting Started*, *Managing Scheduled Dues*, *Savings
Allocations*, and *Reading Reports & Exporting* — so the App Guide topic holds
**five** cards. The overview is kept byte-identical.

### 1.2 Current state (non-normative, verified)

- `utils/learningData.ts` — 7 resources; only `wisewallet_app_guide` has
  `topic: "App Guide"`; `audience` is optional; exactly 6 `audience:` lines.
- `app/(tabs)/learning.tsx:12` — `UNIFIED_FILTERS` includes `"App Guide"`;
  topic filter at `:76`; card badges at `:210-221`.
- `app/(tabs)/learning-detail.tsx:9-106` — `LEARNING_CONTENT` keyed by id;
  `wisewallet_app_guide` reads `APP_GUIDE_CONTENT` (single source, SPEC-71).
- `utils/learningGuideContent.test.ts` — SPEC-71 ACC-01..05 + SPEC-72
  ACC-01..03 guards, parameterized `android`/`ios`/`web`.

## 2. Constraints (normative)

- **CON-01** Every change MUST remain Android + iOS + Web compatible; zero new
  `Platform.OS` branches.
- **CON-02** No new npm packages, native modules, dependencies, or fonts
  (§1.12). The plain-text single-`<Text>` body format MUST be reused — no
  markdown, no parser, no accordion/HTML.
- **CON-03** Exactly **four** new resources MUST be added, all
  `topic: "App Guide"`, all with **no `audience`** field:
  `app_guide_getting_started`, `app_guide_scheduled_dues`,
  `app_guide_allocations`, `app_guide_reports`. Their titles MUST be
  *Getting Started with WiseWallet*, *Managing Scheduled Dues*,
  *Savings Allocations*, and *Reading Reports & Exporting* respectively.
  No existing resource field is renamed, retyped, or reordered.
- **CON-04** The six existing audience articles and their audience tags
  (`learningData.ts`) MUST be unchanged; the total `audience:` count MUST stay
  **6**.
- **CON-05** New resources MUST be appended **after** `wisewallet_app_guide`
  in `utils/learningData.ts` (overview stays first among App Guide cards).
- **CON-06** `utils/learning.tsx` MUST be byte-identical: the `App Guide`
  filter (`item.topic === "App Guide"`) and the `item.audience &&` badge guard
  already render the new cards with no code change.
- **CON-07** Each new body MUST live as a pure, statically-imported string
  constant in `utils/learningGuideContent.ts` (existing module; `roots: utils`
  jest can assert it). `app/(tabs)/learning-detail.tsx` MUST import them and
  map each new id; no inline body strings.
- **CON-08** The existing `APP_GUIDE_CONTENT` body and its SPEC-71 ACC-01..03
  outline (11 blocks, headings in order, ≥3,000 chars) MUST be byte-identical
  and stay green.
- **CON-09** Each new body MUST use the existing block convention
  (blank-line-separated; first line a heading ending in `:`) and MUST carry
  real feature steps — no empty sections, lorem text, or literal `TODO`.
- **CON-10** The full new bodies, and only those bodies, MUST be the TTS
  read-aloud source for their detail screens (`speakWithFemaleVoice`, SPEC-11);
  SPEC-64 stop-on-navigation-away and the bookmark flow MUST remain untouched.
- **CON-11** The jest guard MUST be parameterized by `Platform.OS`
  (`android` | `ios` | `web`) per §1.10 and MUST assert deterministic
  counts/ids/order only — never snapshots of prose.
- **CON-12** No code changes may run before this spec is marked FINAL (§1.1).

## 3. Goal

The `App Guide` topic shows five cards — the existing overview plus four new
focused articles — each opening a sectioned body with working read-aloud, while
the list surface, chips, and the existing overview stay byte-identical.

### Interaction matrix

| Surface | Action | Expected |
|---|---|---|
| Literacy | Tap the `App Guide` chip | Shows all five App Guide cards |
| Literacy | Scroll list | Existing overview first, then the four new cards |
| Detail | Open any new card | Renders that article's sectioned body |
| Detail | Tap play | Full body read aloud (female voice); stops on nav away |
| Web | `expo export --platform web` | Same five cards/bodies; no red-box; SPEC-06 clean |

### Decisions

- **DEC-01** Four new articles only (user multi-select). No interactive or
  "Expand the single guide" reading — SPEC-71 CON-03 is superseded narrowly to
  permit these four additions.
- **DEC-02** Content stays in `utils/learningGuideContent.ts` as four new
  exported constants (one per article) beside `APP_GUIDE_CONTENT`, keeping one
  home per body and the `roots: utils` guard (§1.14).
- **DEC-03** New resources are appended after `wisewallet_app_guide`; no
  reordering of the six audience articles (CON-04/CON-05).
- **DEC-04** `learning.tsx` needs zero edits (CON-06): the existing topic
  filter and guarded badge already cover the new cards.

### Acceptance

**Objective (machine-checkable — jest, parameterized by `Platform.OS`)**

- **ACC-01** `utils/learningData.ts` contains the four ids
  `app_guide_getting_started`, `app_guide_scheduled_dues`,
  `app_guide_allocations`, `app_guide_reports`, each block carrying
  `topic: "App Guide"` and **no** `audience:` line, and each placed **after**
  `id: "wisewallet_app_guide"`.
- **ACC-02** The source still contains exactly **6** `audience:` declarations,
  the interface still declares `audience?` optional, and
  `LEARNING_CATEGORIES` is unchanged.
- **ACC-03** Each of the four new exported content constants exists,
  is **non-empty**, and splits into **at least 3** blank-line blocks whose
  headings (first line, ending in `:`) are unique and each followed by ≥2 body
  lines; none contains a literal `TODO(`.
- **ACC-04** `app/(tabs)/learning-detail.tsx` imports the four new constants
  and `LEARNING_CONTENT` maps all four new ids to their constants (single
  source; `topic.content` drives read-aloud).
- **ACC-05** SPEC-71/72 guards still pass: `APP_GUIDE_CONTENT` is unchanged
  (11 headings in order, ≥3,000 chars), `learning.tsx` still contains the
  `App Guide` chip and the audience filter branches, and the
  `wisewallet_app_guide` block has no `audience`.

**Subjective (manual reviewer checks — Expo Go Android/iOS + web export)**

- **ACC-06** Reviewer selects `App Guide` and confirms five cards render in
  order (overview first) with no audience badge and no red-box in Expo Go / no
  console warning on web (SPEC-06 class).
- **ACC-07** Reviewer opens each new article and confirms the body reads
  top-to-bottom with no empty/filler section; play reads the full body aloud
  (SPEC-11) and leaving the screen stops playback (SPEC-64).

### Platform matrix

| Acc | Android | iOS | Web |
|---|---|---|---|
| ACC-01..05 (Objective) | jest mock | jest mock | jest mock |
| ACC-06 (Subjective) | Expo Go | Expo Go | web export |
| ACC-07 (Subjective) | Expo Go | Expo Go | web export |

## 4. Deliverables

- **D-01** `utils/learningData.ts` — append four `LearningResource` entries
  after `wisewallet_app_guide` (CON-05), all `topic: "App Guide"`, no
  `audience`, each with a MaterialCommunityIcons `icon`, short `description`,
  and `minutes`:
  1. `app_guide_getting_started` — *Getting Started with WiseWallet*
     (`flag-checkered`).
  2. `app_guide_scheduled_dues` — *Managing Scheduled Dues*
     (`calendar-clock`).
  3. `app_guide_allocations` — *Savings Allocations* (`target`).
  4. `app_guide_reports` — *Reading Reports & Exporting* (`chart-donut`).
- **D-02** `utils/learningGuideContent.ts` — add four exported constants
  `APP_GUIDE_GETTING_STARTED_CONTENT`, `APP_GUIDE_SCHEDULED_DUES_CONTENT`,
  `APP_GUIDE_ALLOCATIONS_CONTENT`, `APP_GUIDE_REPORTS_CONTENT` (CON-07/CON-09),
  each a sectioned body whose headings are drawn from the corresponding
  SPEC-71 overview section (Getting Started covers onboarding/opening balance/
  account mode/first transaction; Scheduled Dues covers creating/recurring vs
  one-time/paying/completed/auto-renew; Allocations covers creating/progress/
  transfers/archiving; Reports covers summary/donut/trend/category breakdown/
  CSV-PDF export). `APP_GUIDE_CONTENT` is byte-identical.
- **D-03** `app/(tabs)/learning-detail.tsx` — import the four new constants and
  add four `LEARNING_CONTENT` entries mapping `id → { title, content }`.
  `Speech`, `speakWithFemaleVoice`, SPEC-64/11 paths, and the existing six
  entries are byte-identical.
- **D-04** `utils/learningGuideContent.test.ts` — extend the existing
  `runSuite` (× `android`/`ios`/`web`) with a SPEC-73 group asserting
  ACC-01..04 (source scans + constant checks); ACC-05 via the existing
  SPEC-71/72 suites. No prose snapshots.
- **D-05** `docs/savepoint.md` journal entry + `AGENTS.md` §3 status line
  (§1.8).

## 5. Glossary

- **App Guide topic:** the `App Guide` `ArticleTopic`/filter chip that lists
  WiseWallet how-to articles.
- **Single guide:** the pre-existing `wisewallet_app_guide` overview, retained
  first among the App Guide cards.
- **§1.10 guard:** the standing rule requiring a platform matrix and
  `Platform.OS`-parameterized jest coverage plus Expo Go/web-export manual
  checks.

## 6. References

- `AGENTS.md` (§1.1, §1.8–§1.12, §1.14)
- `specs/71-financial-literacy-app-guide-redo.md` (CON-03 superseded narrowly; body/guards retained)
- `specs/72-app-guide-audience-tag-removed.md` (audience removal retained)
- `specs/11-female-tts-voice-for-recommended-reading.md` (SPEC-11 read-aloud)
- `specs/64-stop-learning-voice-on-navigation-away.md` (playback lifecycle)
- `utils/learningData.ts`, `utils/learningGuideContent.ts`, `app/(tabs)/learning-detail.tsx`, `utils/learningGuideContent.test.ts`
- `docs/savepoint.md`

## History

- **0.1 (2026-10-11)** — DRAFT. User call: add four focused App Guide articles
  (Getting Started, Managing Scheduled Dues, Savings Allocations, Reading
  Reports & Exporting); keep the existing overview as-is; supersede SPEC-71
  CON-03 narrowly. Branch `fix/pdf-multiplatform-download`. No implementation
  until FINAL.
- **1.0 (2026-10-11)** — FINAL per user call. Implement exactly this spec.
