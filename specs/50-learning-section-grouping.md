# Spec 50: Learning Screen Section Grouping (Literacy vs App Guide)

| Field | Value |
|---|---|
| ID | SPEC-50 |
| Title | Learning Screen Section Grouping |
| Status | **FINAL** (2026-10-04 per user call "final") |
| Owner | User (final authority) |
| Version | 1.0 |
| Scope | `app/(tabs)/learning.tsx` |
| Non-goals | Changing filters, search behavior, card design, routes, TTS |
| Normative source | This file. |

---

## 1. Context

Articles and App Guide cards currently render in one flat grid under
"Recommended Reading". User wants grouped section headers. Decision (user
call): two labeled sections in one scroll — not sub-tabs.

---

## 2. Constraints

- **CON-01 (Grouping):** The articles block MUST split `filteredResources`
  into two groups: `topic === "App Guide"` vs everything else, rendered under
  headers "App User Guide" (or "WiseWallet App Guide") and "Financial
  Literacy" respectively. Non-App-Guide items keep their existing
  order/filter behavior.
- **CON-02 (Section Headers):** Each group MUST render a `Text variant="titleMedium"`
  header with the existing `sectionTitle` style, plus a small count label
  (`N articles`), using the same visual language as the current
  "Recommended Reading" header row.
- **CON-03 (Empty section hidden):** A group with zero items MUST NOT render
  its header. When both groups are empty, the existing empty card MUST show.
- **CON-04 (Filter compatibility):** Selecting the `App Guide` chip shows
  only the App Guide section; `All` shows both; topic chips (Budgeting/…)
  show only the Financial Literacy section.
- **CON-05 (Card rendering unchanged):** The card JSX (icon, badges, TTS
  button, bookmark) MUST be extracted into a single render function reused
  by both groups — no visual regression.
- **CON-06 (Cross-Platform):** Desktop grid / mobile list behavior preserved
  per group.

---

## 3. Acceptance

- **ACC-01 (Objective):** With `All` filter, the screen shows two headers:
  "Financial Literacy" and "WiseWallet App Guide", each followed by its own
  cards/grid.
- **ACC-02 (Objective):** With `App Guide` filter only the guide header + its
  3 cards render; with `Budgeting` only "Financial Literacy" renders.
- **ACC-03 (Subjective):** Reviewer confirms spacing/typography between
  sections match existing section styles and nothing overlaps.

---

## 4. Platform Matrix

| Platform | Objective Checks | Subjective Checks |
|---|---|---|
| **Android** | Grouping + filters correct | Sections clearly separated |
| **iOS** | Same | Same |
| **Web** | Desktop grid applies per group | Same |

---

## 5. Deliverables

- **D-01 (`app/(tabs)/learning.tsx`):** Refactor the articles block into two
  grouped sections per CON-01..05, reusing one card renderer.

---

## 6. References

- `specs/49-app-guide-learning-category.md`
- `AGENTS.md §1.9`
