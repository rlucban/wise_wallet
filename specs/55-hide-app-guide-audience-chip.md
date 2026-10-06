# Spec 55: Hide Audience Chip on App Guide Cards

| Field | Value |
|---|---|
| ID | SPEC-55 |
| Title | App Guide articles show only the App Guide tag (no Students/Workers chip) |
| Status | **FINAL v1.0** (marked by user 2026-10-06; implementable per AGENTS.md §1.1) |
| Owner | User (final authority) |
| Version | v1.0 |
| Scope | `app/(tabs)/learning.tsx` audience-chip render gate only (display-only) |
| Non-goals | Filtering logic change; `utils/learningData.ts` rows; `app/(tabs)/learning-detail.tsx`; filter chips; counts/empty states; dependencies; storage/API/routes |
| Normative source | This file. `AGENTS.md §4` is a pointer only. File+symbol cites are normative; `:line` numbers are hints only. |

## Terminology (RFC 2119)

The keywords **MUST**, **MUST NOT**, **SHOULD**, and **MAY** in this spec are to be interpreted as described in RFC 2119. Informative prose (examples, "today", "currently") is non-normative unless restated as a requirement.

## 1. Context

### 1.1 Problem

SPEC-54 split Learning into `WiseWallet App Guide` + `Recommended Reading` but reused the card JSX verbatim in both sections, including the unconditional `{item.audience && (...)}` chip (`app/(tabs)/learning.tsx:229-232` guides, `:307-310` literacy). The 3 guide rows carry `audience` solely for chip filtering (SPEC-54 DEC-01/DEC-03), so guides aimed at all users display a misleading secondary Students/Workers chip next to the `App Guide` tag.

### 1.2 Decisions locked at FINAL (no open items)

- Display-only: audience-chip filtering (`filteredGuides`/`filteredLiteracy` predicates) stays byte-identical.
- Guide data rows (`audience` values) stay untouched — they drive filtering, not display.
- Literacy cards keep their audience chip unchanged.

## 2. Constraints (normative)

- **CON-01 — Bare-minimum (§1.11).** Only `D-*` files MAY change, and within `learning.tsx` only the audience-chip condition lines. No filter, count, empty-state, detail, or style change.
- **CON-02 — No new dependencies (§1.12).** No new packages, imports, or components.
- **CON-03 — Cross-platform (§1.5).** Render branch MUST be pure JSX conditional, identical on Android + iOS + Web. No `Platform.OS` branch, no native-only import.
- **CON-04 — Vercel-deployable + Expo Go safe (§1.6/§1.7).** No layout API change; web export and Expo Go behavior unchanged apart from the hidden chip.
- **CON-05 — No contract break (§1.4).** Storage, `wallet-api`, routes, and `LearningResource` shape unchanged.
- **CON-06 — TDD cross-platform (§1.10).** Extend the existing `jest` suite parameterized by `Platform.OS` (android/ios/web) + user-run Expo Go + web-export checks.
- **CON-07 — One home (§1.14).** SPEC-54 (sections/filtering) is cross-referenced, never re-normed. No duplicate spec.
- **CON-08 — Ordering.** `D-01`..`D-03` land only after `D-00` (satisfied — FINAL marked 2026-10-06).

## 3. Goal

### 3.1 Decisions

- **DEC-01 (Chip gate).** Both card copies gate the audience chip on the article topic: render it only when `item.topic !== "App Guide"` (single condition change per copy; guide section cards then show the `App Guide` tag alone).
- **DEC-02 (Filtering frozen).** `filteredGuides` / `filteredLiteracy` predicates stay byte-identical; `For Students` / `For Workers` chips still filter guides behind the scenes.

### 3.2 Interaction matrix

| # | Card | Before | After |
|---|---|---|---|
| 1 | Guide (`App Guide`) | `App Guide` tag + audience chip | `App Guide` tag only |
| 2 | Literacy (`Budgeting`/`Savings`/`Debt`) | topic tag + audience chip | unchanged |
| 3 | Chips + search | filter both sections | unchanged |

### 3.3 Acceptance criteria

Objective (jest, `Platform.OS` = android/ios/web):

| ID | Check |
|---|---|
| ACC-01 | No unconditional `{item.audience && (` remains; each copy gates on `item.topic !== "App Guide"` |
| ACC-02 | Literacy chip rendering intact (audience badge JSX still present behind the gate) |
| ACC-03 | Filter predicates byte-identical (guide early-return + audience branches + topic branch unchanged) |
| ACC-04 | `npm test` 0 failed; `npm run lint` clean; `npx tsc --noEmit` clean (user-run per §1.3) |

Subjective (reviewer-observed, Expo Go + web export):

- **ACC-S01:** Android/iOS Expo Go — each of the 3 guide cards shows the `App Guide` tag with no second chip; literacy cards still show both chips.
- **ACC-S02:** Web export — same; `For Students`/`For Workers` chips still filter the guide list (chip hidden but filtering live), no layout gap where the chip was.

## 4. Deliverables

- **D-00:** FINAL mark (done 2026-10-06). Gates `D-01`..`D-03`.
- **D-01 (`app/(tabs)/learning.tsx`):** gate both audience-chip conditions per DEC-01. Nothing else in the file.
- **D-02 (`utils/learningSections.test.ts`):** extend with ACC-01..ACC-03 guards × android/ios/web.
- **D-03:** Journal — `docs/savepoint.md` + `AGENTS.md` §3 entry.

## Glossary

| Term | Meaning |
|---|---|
| Audience chip | Secondary `Students`/`Workers` badge beside the topic tag |
| Chip gate | `item.topic !== "App Guide"` condition hiding the audience chip on guides |

## References

- `app/(tabs)/learning.tsx:229-232,307-310` (chip lines under change); `:60-99` (predicates, frozen)
- `utils/learningData.ts` (rows, untouched) · `specs/54-learning-app-guide-sections.md` (DEC-01/DEC-03 owner)
- `AGENTS.md §1` (spec-first, no CLI, invariants, TDD, bare-minimum, docs)
