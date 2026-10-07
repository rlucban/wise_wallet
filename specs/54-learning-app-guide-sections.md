# Spec 54: Learning App-Guide vs Recommended Reading Sections

| Field | Value |
|---|---|
| ID | SPEC-54 |
| Title | Separate WiseWallet App Guide from Recommended Reading on the Learning screen |
| Status | **FINAL v1.0** (marked by user 2026-10-06; implementable per AGENTS.md §1.1 — OD-01..OD-04 approved as drafted) |
| Owner | User (final authority) |
| Version | v1.0 |
| Scope | `app/(tabs)/learning.tsx` section split + `utils/learningData.ts` guide rows + `app/(tabs)/learning-detail.tsx` guide bodies + one new `utils/` test |
| Non-goals | New dependencies; filter-chip set change; TTS voice change (SPEC-11 untouched); bookmark persistence change; storage keys; `wallet-api` contract; routes |
| Normative source | This file. `AGENTS.md §4` is a pointer only. File+symbol cites are normative; `:line` numbers are hints only. |

## Terminology (RFC 2119)

The keywords **MUST**, **MUST NOT**, **SHOULD**, and **MAY** in this spec are to be interpreted as described in RFC 2119. Informative prose (examples, "today", "currently") is non-normative unless restated as a requirement. "App guide" = article explaining how to use WiseWallet features (e.g. App Overview, How to Log Dues, Managing Savings Goals). "Literacy article" = general financial tip (the 6 existing rows).

## 1. Context

### 1.1 Problem

`app/(tabs)/learning.tsx:60-78` derives one `filteredResources` list feeding one `Recommended Reading` header + one global count + one grid (`:162-238`). `utils/learningData.ts:1-72` holds only 6 literacy rows (`Budgeting`/`Savings`/`Debt`); `ArticleTopic` has no app-guide member and zero guide rows/bodies exist. `app/(tabs)/learning-detail.tsx:8-101` keys bodies by the same 6 ids. App-usage guidance therefore has nowhere to live except mixed in with financial tips.

### 1.2 Open decisions (BLOCKING — user call required before FINAL)

- **OD-01 — Guide copy.** The 3 starter guides below are placeholders. User MUST supply final titles/descriptions/bodies (or approve the placeholders as final) before `D-00`. No invented financial advice beyond app usage.
- **OD-02 — Model.** Draft uses `topic: "App Guide"` (DEC-01). Alternative (rejected unless user calls it): new `kind: "app-guide" | "literacy"` field. Confirm at FINAL.
- **OD-03 — Topic-chip behavior.** Draft: guide section respects search + audience chips and ignores `Budgeting`/`Savings`/`Debt` chips (DEC-03). Confirm, or call the alternative (guides hidden whenever a topic chip is active vs. an added `App Guide` chip — the latter is out of scope for v0.1).
- **OD-04 — Counts/empty states.** Draft: per-section counts + per-section empty cards (DEC-04). Confirm, or call combined-count variant.

## 2. Constraints (normative)

- **CON-01 — Bare-minimum (§1.11).** Only `D-*` files MAY change. No filter-chip additions, no card-layout redesign, no TTS/bookmark logic change.
- **CON-02 — No new dependencies (§1.12).** Reuse `expo-router`, `react-native-paper`, `MaterialCommunityIcons`, `expo-speech` via existing `speechVoice` helpers. No new packages, fonts, or native modules.
- **CON-03 — Cross-platform (§1.5).** Sections render on Android + iOS + Web with the existing `isDesktop` grid/list branch. No native-only imports; no Node APIs in app code.
- **CON-04 — Vercel-deployable + Expo Go safe (§1.6/§1.7).** Web export stays clean; Expo Go MUST NOT red-box; TTS failure degrades silently per existing `handlePlayAudio` behavior.
- **CON-05 — No contract break (§1.4).** Storage keys, `wallet-api` contract, AsyncStorage shapes, routes (`/(tabs)/learning-detail?id=`), and native deps stay unchanged. Detail ids MUST be unique kebab-case strings.
- **CON-06 — TDD cross-platform (§1.10).** `jest` parameterized by `Platform.OS` (`android`/`ios`/`web` via mock) for machine-checkable guards + user-run Expo Go + web-export checks for rendered sections jest cannot prove.
- **CON-07 — One home (§1.14).** SPEC-11 (female TTS voice) and SPEC-16 (learning contrast) are cross-referenced, never re-normed. No duplicate learning-section spec elsewhere.
- **CON-08 — Guide badge fallback.** `getPastelTagStyle` (`learning.tsx:80-102`) MUST NOT gain new branches unless the FINAL copy requires them; `topic: "App Guide"` uses the existing `default` surfaceVariant badge.
- **CON-09 — Ordering.** `D-01`..`D-05` land only after `D-00` (FINAL with `OD-01`..`OD-04` called and guide copy approved).

## 3. Goal

### 3.1 Decisions (draft — confirm at FINAL)

- **DEC-01 (Model, draft).** Extend `ArticleTopic` with `"App Guide"`; no new fields. The 6 literacy rows stay byte-identical; 3 new rows carry `topic: "App Guide"` with `audience` set per article (draft: `Students` for Overview, `Workers` for Dues, `Students` for Savings Goals — confirm with copy).
- **DEC-02 (Starter guides, draft — copy TBD per OD-01).** `app_overview` ("App Overview"), `how_to_log_dues` ("How to Log Dues"), `managing_savings_goals` ("Managing Savings Goals"), each with `minutes` + MCI `icon` + one-line `description`; bodies added to `LEARNING_CONTENT` describing only in-app flows.
- **DEC-03 (Filtering, draft).** One shared `matchesSearch` + audience match for both sections. Topic-chip match applies to the literacy section only; the guide section ignores `Budgeting`/`Savings`/`Debt` chips (visible whenever search + audience match). `All`/`For Students`/`For Workers` behave as today for both sections.
- **DEC-04 (Rendering, draft).** Two stacked sections below Daily Insight, each with own header + count + grid/list + empty card: `WiseWallet App Guide` first, `Recommended Reading` second. Card layout, TTS, bookmarks, and `router.push({ pathname: "/(tabs)/learning-detail", params: { id } })` are reused unchanged per article.

### 3.2 Interaction matrix

| # | Filter | Search | Guide section | Literacy section |
|---|---|---|---|---|
| 1 | `All` | blank | all 3 guides | all 6 articles |
| 2 | `For Students` / `For Workers` | blank | guides with that audience | articles with that audience |
| 3 | `Budgeting` / `Savings` / `Debt` | blank | guides still shown (search+audience only) | articles with that topic |
| 4 | any | non-blank | guides matching title/description | articles matching title/description |
| 5 | any | no matches | guide empty card | literacy empty card |

### 3.3 Acceptance criteria

Objective (jest, `Platform.OS` = android/ios/web):

| ID | Check |
|---|---|
| ACC-01 | `learningData.ts` exports 3 guide rows with `topic: "App Guide"` and unique ids; 6 literacy rows unchanged |
| ACC-02 | `learning.tsx` renders `WiseWallet App Guide` header before `Recommended Reading` (source order guard) |
| ACC-03 | Guide list derives from topic match (not literacy topics); literacy filter logic byte-identical apart from the split |
| ACC-04 | `learning-detail.tsx` contains bodies for all 3 guide ids; unknown-id path unchanged |
| ACC-05 | `npm test` 0 failed; `npm run lint` clean; `npx tsc --noEmit` clean (user-run per §1.3) |

Subjective (reviewer-observed, Expo Go + web export):

- **ACC-S01:** Android/iOS Expo Go — two headers in order, per-section counts correct, guides never mixed into literacy cards, under `All` and under each chip + a search query.
- **ACC-S02:** Web export (mobile + desktop widths) — same two sections; desktop grid / mobile list preserved per section; no console warnings from the split.
- **ACC-S03:** Reviewer opens each guide → detail body matches the FINAL copy; TTS + bookmark behave as on literacy cards.

## 4. Deliverables

- **D-00:** User marks FINAL with `OD-01`..`OD-04` called and guide copy approved. Gates `D-01`..`D-05`.
- **D-01 (`utils/learningData.ts`):** `ArticleTopic` += `"App Guide"` + 3 guide rows (FINAL copy). Nothing else.
- **D-02 (`app/(tabs)/learning.tsx`):** derived guide/literacy lists per DEC-03 + two sections per DEC-04 (headers, counts, empty cards). Card/TTS/bookmark code reused, not rewritten.
- **D-03 (`app/(tabs)/learning-detail.tsx`):** 3 guide bodies in `LEARNING_CONTENT`. Nothing else.
- **D-04 (`utils/learningSections.test.ts`, new):** ACC-01..ACC-04 × android/ios/web (source-text + data-shape guards; pixels covered by ACC-S01..S03).
- **D-05:** Journal — `docs/savepoint.md` + `AGENTS.md` §3 entry (incl. OD calls and copy source).

## Glossary

| Term | Meaning |
|---|---|
| App guide | Article with `topic: "App Guide"` describing in-app flows; rendered under its own header |
| Literacy article | Existing 6 rows (`Budgeting`/`Savings`/`Debt`); rendered under `Recommended Reading` |
| Per-section count | `Showing N articles` line rendered independently inside each section |
| FINAL copy | User-approved guide titles/descriptions/bodies (OD-01); placeholders are non-normative until then |

## References

- `app/(tabs)/learning.tsx:12-13,60-78,80-102,162-238` (filters, badge fallback, single section under change)
- `utils/learningData.ts:1-72` (type + 6 rows under change)
- `app/(tabs)/learning-detail.tsx:8-101,103-186` (body map + detail renderer)
- `specs/11-female-tts-voice-for-recommended-reading.md` (TTS owner), `specs/16-theme-contrast-learning.md` (learning contrast neighbor)
- `AGENTS.md §1` (spec-first, no CLI, invariants, TDD, bare-minimum, docs)
