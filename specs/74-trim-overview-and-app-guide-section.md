# SPEC-74 — Trim App Guide Overview, Dedicated App Guide Section, Peach Topic Color

| Field | Value |
|---|---|
| ID | SPEC-74 |
| Title | Trim App Guide Overview, Dedicated App Guide Section, Peach Topic Color |
| Status | **FINAL** (2026-10-11 per user call) |
| Owner | User (final authority) |
| Version | 1.0 |
| Scope | `utils/learningGuideContent.ts`, `app/(tabs)/learning.tsx`, `utils/learningGuideContent.test.ts`, `docs/savepoint.md`, `AGENTS.md` §3 |
| Non-goals | New filter chips; new App Guide articles; changes to the four SPEC-73 article bodies; reordering the six audience articles; re-skin; new dependency; markdown renderer; changes to SPEC-72's audience removal; SPEC-71's read-aloud / SPEC-64 lifecycle paths |
| Normative source | This file. File+symbol cites are normative; `:line` numbers are hints only. |

> **Branch note.** Authored on branch `fix/pdf-multiplatform-download`. This spec
> **supersedes SPEC-71 ACC-01/ACC-02** (the 11-block / ≥3,000-char overview
> outline) and **SPEC-73 ACC-05** (which re-asserted that outline) with a
> **7-block** trimmed overview. SPEC-73's four new articles, SPEC-72's audience
> removal, and SPEC-71's single-source read-aloud paths stay in force and MUST
> remain green (§1.14 cross-reference, never duplicate).

## Terminology (RFC 2119)

The keywords **MUST**, **MUST NOT**, **SHOULD**, and **MAY** in this spec are
to be interpreted as described in RFC 2119. Informative prose is non-normative
unless restated as a requirement.

## 1. Context

### 1.1 Problem

SPEC-73 added four focused App Guide articles (*Getting Started*, *Managing
Scheduled Dues*, *Savings Allocations*, *Reading Reports & Exporting*) beside the
`wisewallet_app_guide` overview (`utils/learningData.ts`). The overview still
repeats those four topics in its own 11-section body
(`utils/learningGuideContent.ts`), and all App Guide cards are mixed into the
single **Recommended Reading** list on `app/(tabs)/learning.tsx`. The App Guide
topic badge has no distinct color (it falls through to the neutral `default`
branch of `getPastelTagStyle`).

Per the user call (2026-10-11):
1. **Trim** the overview — remove the four sections now owned by their own
   articles.
2. **Split the list** — App Guide cards render in a new section beneath
   Recommended Reading; Recommended Reading keeps only non-App-Guide articles.
3. **Color** the App Guide topic badge **peach** (`#FFDAB9` background, `#5D4037`
   text), fixed in light and dark.

### 1.2 Current state (non-normative, verified)

- `utils/learningGuideContent.ts` — `APP_GUIDE_CONTENT` = 11 blocks: *Getting
  Started*, *Using the Dashboard*, *Adding and Editing Transactions*, *Managing
  Categories and Payment Methods*, *Tracking Scheduled Dues*, *Building
  Allocations*, *Reading Reports and Exporting*, *Using the Calendar and
  Notifications*, *Protecting Your Account*, *Managing Settings and Data*,
  *Pro Tips*.
- `app/(tabs)/learning.tsx` — one **Recommended Reading** section renders
  `filteredResources` (`:171-246`); `getPastelTagStyle` (`:88-110`) has no
  `App Guide` case.
- `utils/learningGuideContent.test.ts` — SPEC-71 `REQUIRED_HEADINGS` (11) and
  `ACC-01`/`ACC-02`; SPEC-73 `ACC-05` asserts `blocks.length >= 11`.

## 2. Constraints (normative)

- **CON-01** Every change MUST remain Android + iOS + Web compatible; zero new
  `Platform.OS` branches.
- **CON-02** No new npm packages, native modules, dependencies, or fonts
  (§1.12). The plain-text single-`<Text>` body format and existing card UI
  styles MUST be reused.
- **CON-03** `APP_GUIDE_CONTENT` MUST be trimmed to exactly **seven** blocks by
  removing the four sections that have dedicated articles: *Getting Started*,
  *Tracking Scheduled Dues*, *Building Allocations*, *Reading Reports and
  Exporting*. The remaining seven blocks MUST keep their existing text and order:
  *Using the Dashboard*, *Adding and Editing Transactions*, *Managing Categories
  and Payment Methods*, *Using the Calendar and Notifications*, *Protecting Your
  Account*, *Managing Settings and Data*, *Pro Tips*.
- **CON-04** No other content constant is edited; the four SPEC-73 article
  bodies (`APP_GUIDE_GETTING_STARTED_CONTENT`, `APP_GUIDE_SCHEDULED_DUES_CONTENT`,
  `APP_GUIDE_ALLOCATIONS_CONTENT`, `APP_GUIDE_REPORTS_CONTENT`) are
  byte-identical.
- **CON-05** On `app/(tabs)/learning.tsx`, the **Recommended Reading** section
  MUST list only resources whose `topic !== "App Guide"`, and a new **App Guide**
  section MUST render those resources (`topic === "App Guide"`) beneath the
  Recommended Reading section, using the existing article-card rendering.
- **CON-06** Recommended Reading MUST remain visible (showing its existing empty
  card) when no non-App-Guide resource matches the active filter/search. The new
  App Guide section MUST be hidden when it has zero items.
- **CON-07** The App Guide topic badge MUST use a fixed peach background
  `#FFDAB9` with text `#5D4037`, in both light and dark mode, via a new
  `case "App Guide"` in `getPastelTagStyle`. No other topic's color changes.
- **CON-08** `utils/learningData.ts` MUST be byte-identical (resource count 11,
  ids, topics, audience count 6).
- **CON-09** The TTS read-aloud source for the overview MUST remain the trimmed
  `APP_GUIDE_CONTENT` (single source, SPEC-71/SPEC-11); SPEC-64
  stop-on-navigation-away and the bookmark flow MUST remain untouched.
- **CON-10** The jest guards MUST remain parameterized by `Platform.OS`
  (`android` | `ios` | `web`) per §1.10 and MUST assert deterministic
  counts/ids/colors/order only — never snapshots of prose.
- **CON-11** No code changes may run before this spec is marked FINAL (§1.1).

## 3. Goal

The overview is a 7-section "everything else" guide; the Learning screen shows
Recommended Reading (non-App-Guide) followed by a dedicated App Guide section
with peach-badged cards; the four focused articles and all existing guards stay
green.

### Interaction matrix

| Surface | Action | Expected |
|---|---|---|
| Literacy (All) | Scroll | Recommended Reading (6 audience articles) then **App Guide** section (5 cards) |
| Literacy | Select `App Guide` chip | Recommended Reading shows its empty card; App Guide section shows 5 peach cards |
| Literacy | Select `For Students` / `For Workers` | Recommended Reading shows those articles; App Guide section hidden |
| Literacy | Select `Budgeting` / `Savings` / `Debt` | Recommended Reading shows those articles; App Guide section hidden |
| Literacy | Search a non-App-Guide term | Matching audience articles in Recommended Reading only |
| Detail | Open the overview | Body is the 7-section trimmed overview (starts *Using the Dashboard*) |
| Detail | Open any focused article | Body unchanged (SPEC-73) |
| Web | `expo export --platform web` | Same sections/colors; no red-box; SPEC-06 clean |

### Decisions

- **DEC-01** Trim = delete exactly the four sections named in CON-03; no new
  intro prose, no rewrite of the remaining seven blocks.
- **DEC-02** List split is by `topic` (`"App Guide"` vs not) using the existing
  `filteredResources`; the App Guide section reuses the existing card markup via
  a shared local render helper (one home per card, §1.14).
- **DEC-03** Peach is a fixed literal (`#FFDAB9` / `#5D4037`) so it is identical
  in light and dark (user call); AGENTS theme-contrast specs are not amended.
- **DEC-04** Recommended Reading stays visible when empty (user call); the App
  Guide section hides when empty (CON-06).

### Acceptance

**Objective (machine-checkable — jest, parameterized by `Platform.OS`)**

- **ACC-01** `APP_GUIDE_CONTENT` splits into exactly **7** blocks; headings in
  order are `Using the Dashboard`, `Adding and Editing Transactions`,
  `Managing Categories and Payment Methods`, `Using the Calendar and
  Notifications`, `Protecting Your Account`, `Managing Settings and Data`, and
  the last block's first line is `Pro Tips:`. The headings `Getting Started`,
  `Tracking Scheduled Dues`, `Building Allocations`, and
  `Reading Reports and Exporting` MUST be absent.
- **ACC-02** `APP_GUIDE_CONTENT.length` is **≥ 1,500** characters and each of the
  7 blocks has **≥ 2** body lines after its heading; no `TODO(` marker.
- **ACC-03** `app/(tabs)/learning.tsx` source shows the topic split: it filters
  `topic !== "App Guide"` for Recommended Reading and `topic === "App Guide"`
  for the new section, and the App Guide section title `"App Guide"` is rendered
  after the `"Recommended Reading"` title (source scan).
- **ACC-04** In `app/(tabs)/learning.tsx`, `getPastelTagStyle` has a
  `case "App Guide":` returning background `#FFDAB9` and text color `#5D4037`
  (source scan).
- **ACC-05** The four SPEC-73 article constants are present and non-empty, and
  `app/(tabs)/learning-detail.tsx` still imports and maps all four; SPEC-72's
  guide block has no `audience` and `audience:` count is 6.

**Subjective (manual reviewer checks — Expo Go Android/iOS + web export)**

- **ACC-06** Reviewer on the Learning screen confirms: Recommended Reading shows
  only non-App-Guide articles; a titled **App Guide** section sits directly
  beneath it with the 5 App Guide cards, each with a peach topic badge that is
  legible in light and dark; selecting `App Guide` leaves Recommended Reading's
  empty card visible above the 5 cards; selecting an audience/topic filter hides
  the App Guide section. No red-box in Expo Go, no console warning on web
  (SPEC-06 class).
- **ACC-07** Reviewer opens *WiseWallet App Guide* and confirms the body now has
  seven sections (starts with *Using the Dashboard*, ends with *Pro Tips*), reads
  aloud the trimmed body (SPEC-11), and stops on navigation away (SPEC-64).

### Platform matrix

| Acc | Android | iOS | Web |
|---|---|---|---|
| ACC-01..05 (Objective) | jest mock | jest mock | jest mock |
| ACC-06 (Subjective) | Expo Go | Expo Go | web export |
| ACC-07 (Subjective) | Expo Go | Expo Go | web export |

## 4. Deliverables

- **D-01** `utils/learningGuideContent.ts` — delete the four blocks named in
  CON-03 from `APP_GUIDE_CONTENT`; leave the other seven blocks byte-identical
  (CON-03/CON-04).
- **D-02** `app/(tabs)/learning.tsx` —
  1. Derive `recommendedResources` (`topic !== "App Guide"`) and
     `appGuideResources` (`topic === "App Guide"`) from `filteredResources`
     (CON-05).
  2. Extract the existing card `map` body into a local `renderArticleList(items)`
     helper reused by both sections (DEC-02).
  3. Recommended Reading renders `recommendedResources` and remains visible when
     empty (CON-06).
  4. A new section titled `App Guide` renders `appGuideResources` beneath
     Recommended Reading, hidden when empty (CON-05/CON-06).
  5. `getPastelTagStyle` gains `case "App Guide": return { backgroundColor:
     "#FFDAB9", textColor: "#5D4037" };` (CON-07).
- **D-03** `utils/learningGuideContent.test.ts` — update the SPEC-71
  `ACC-01`/`ACC-02` guards and the SPEC-73 `ACC-05` guard to the trimmed
  7-block outline (ACC-01/ACC-02 of this spec), and add SPEC-74 `ACC-03`/`ACC-04`
  source-scan guards; keep the existing × `android`/`ios`/`web` suite.
- **D-04** `docs/savepoint.md` journal entry + `AGENTS.md` §3 status line
  (§1.8).

## 5. Glossary

- **Overview:** the retained `wisewallet_app_guide` article, now a 7-section
  "everything else" guide.
- **App Guide section:** the new Learning-screen section listing App Guide
  cards beneath Recommended Reading.
- **Peach:** the fixed badge color `#FFDAB9` with text `#5D4037`.

## 6. References

- `AGENTS.md` (§1.1, §1.8–§1.12, §1.14)
- `specs/71-financial-literacy-app-guide-redo.md` (ACC-01/ACC-02 superseded; body/single-source retained)
- `specs/72-app-guide-audience-tag-removed.md` (retained)
- `specs/73-app-guide-additional-articles.md` (ACC-05 superseded; four articles retained)
- `specs/11-female-tts-voice-for-recommended-reading.md`, `specs/64-stop-learning-voice-on-navigation-away.md`
- `utils/learningGuideContent.ts`, `app/(tabs)/learning.tsx`, `utils/learningGuideContent.test.ts`
- `docs/savepoint.md`

## History

- **0.1 (2026-10-11)** — DRAFT. User call: trim the overview to the sections
  without their own article; render App Guide cards in a new section beneath
  Recommended Reading (Recommended Reading stays visible when empty); App Guide
  topic badge fixed peach `#FFDAB9` / `#5D4037`. Supersedes SPEC-71
  ACC-01/ACC-02 and SPEC-73 ACC-05. No implementation until FINAL.
- **1.0 (2026-10-11)** — FINAL per user call. Implement exactly this spec.
