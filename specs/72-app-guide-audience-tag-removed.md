# SPEC-72 — Remove Audience Tag from the WiseWallet App Guide

| Field | Value |
|---|---|
| ID | SPEC-72 |
| Title | Remove Audience Tag from the WiseWallet App Guide |
| Status | **FINAL** (2026-10-10 per user call) |
| Owner | User (final authority) |
| Version | 1.0 |
| Scope | `utils/learningData.ts`, `utils/learningGuideContent.test.ts` |
| Non-goals | New audience value; new filter chip; list re-order; re-skin; changes to the other six Literacy articles; changes to SPEC-71's body/structure |
| Normative source | This file. File+symbol cites are normative; `:line` numbers are hints only. |

## Terminology (RFC 2119)

The keywords **MUST**, **MUST NOT**, **SHOULD**, and **MAY** in this spec are
to be interpreted as described in RFC 2119.

## 1. Context

`utils/learningData.ts:72-80` tags the App Guide resource
`wisewallet_app_guide` with `audience: "Students"`. As a result the card shows
a "Students" badge (`app/(tabs)/learning.tsx:215-221`) and the article appears
when the `For Students` filter is active (`learning.tsx:72`). The App Guide is
app guidance for everyone, not a students-focused article, so the tag is wrong.

Per the user call, the label is removed **entirely**: no Students and no
Workers badge, and the article appears only under `All` and `App Guide`.

## 2. Constraints (normative)

- **CON-01** Every change MUST remain Android + iOS + Web compatible; zero
  new `Platform.OS` branches.
- **CON-02** No new npm packages, native modules, dependencies, or fonts
  (§1.12).
- **CON-03** `app/(tabs)/learning.tsx` MUST be byte-identical: the
  `For Students` / `For Workers` filter branches (`:72/:74`) and the guarded
  badge (`item.audience &&`, `:215`) already degrade correctly when `audience`
  is absent — no new branch, no new copy.
- **CON-04** The other six Literacy articles and their audience tags
  (`learningData.ts`) MUST be unchanged.
- **CON-05** SPEC-71's expanded guide body and its docked-outline ACCs
  (ACC-01..03, ACC-05) MUST remain satisfied.
- **CON-06** No code changes may run before this spec is marked FINAL (§1.1).

## 3. Goal

The App Guide resource has no audience tag: no Students/Workers badge on its
card and no match under `For Students` / `For Workers`, on all platforms.

### Interaction matrix

| Surface | Action | Expected |
|---|---|---|
| Literacy (All) | Scroll list | App Guide card shows no Students/Workers badge |
| Literacy (For Students) | Select filter | App Guide absent; the 3 Students articles remain |
| Literacy (For Workers) | Select filter | App Guide absent; the 2 Workers articles remain |
| Literacy (App Guide) | Select filter | App Guide present |
| Detail | Open App Guide | Body unchanged (SPEC-71) |

### Decisions

- **DEC-01** Implement by making `audience` optional on
  `LearningResource` (`audience?: AudienceType`) and omitting the field on
  `wisewallet_app_guide`. `learning.tsx` needs zero edits (CON-03).

### Acceptance

**Objective (machine-checkable — jest, parameterized by `Platform.OS`)**

- **ACC-01** In the `utils/learningData.ts` source, the `wisewallet_app_guide`
  resource block (from its `id` to its closing `},`) contains no `audience:`
  line.
- **ACC-02** The source still contains exactly **6** `audience:` declarations
  (the other articles) and the interface still declares `audience?` optional.
- **ACC-03** `app/(tabs)/learning.tsx` is unchanged: still contains the two
  audience filter branches and the `item.audience &&` badge guard.
- **ACC-04** SPEC-71 unchanged guards still pass: `APP_GUIDE_CONTENT >= 3,000`
  chars, 11 docked headings in order, and the detail screen imports
  `APP_GUIDE_CONTENT` (single source).

**Subjective (manual reviewer — Expo Go Android/iOS + web export)**

- **ACC-05** Reviewer confirms the App Guide card shows no audience badge and
  does not appear under `For Students` on all three platforms; `For Workers`
  likewise; the six other articles' badges are unchanged.

### Platform matrix

| Acc | Android | iOS | Web |
|---|---|---|---|
| ACC-01..04 (Objective) | jest mock | jest mock | jest mock |
| ACC-05 (Subjective) | Expo Go | Expo Go | web export |

## 4. Deliverables

- **D-01** `utils/learningData.ts` — interface `audience: AudienceType` becomes
  `audience?: AudienceType`; delete the `audience: "Students",` line from the
  `wisewallet_app_guide` resource only. Nothing else in the file changes.
- **D-02** Extend `utils/learningGuideContent.test.ts` — add an ACC-01..03
  suite (source scans for the `wisewallet_app_guide` block missing `audience`,
  exactly 6 remaining `audience:` declarations, and `learning.tsx` unchanged),
  parameterized by `Platform.OS` like the existing suite.
- **D-03** `docs/savepoint.md` journal entry + `AGENTS.md` §3 status line.

## 5. Glossary

- **Audience tag:** the `audience` field on `LearningResource` rendered as the
  second badge (`Students`/`Workers`) on an article card.

## 6. References

- `AGENTS.md` (§1.1, §1.9–§1.12)
- `specs/71-financial-literacy-app-guide-redo.md` (superseded-by context; must stay green)
- `utils/learningData.ts`, `app/(tabs)/learning.tsx`, `utils/learningGuideContent.test.ts`
- `docs/savepoint.md`

## History

- **0.1 (2026-10-10)** — DRAFT. User call: remove the Students audience label
  from the App Guide entirely. No implementation until FINAL.
- **1.0 (2026-10-10)** — FINAL per user call. Implement exactly this spec.