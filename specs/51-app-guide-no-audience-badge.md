# Spec 51: Remove Audience Badges from App Guide Cards

| Field | Value |
|---|---|
| ID | SPEC-51 |
| Title | Remove Audience Badges from App Guide Cards |
| Status | **FINAL** (2026-10-04 per user call "final") |
| Owner | User (final authority) |
| Version | 1.0 |
| Scope | `utils/learningData.ts` |
| Non-goals | Badge rendering changes for literacy articles, filter behavior (`For Students`/`For Workers` chips still filter by `audience`) |
| Normative source | This file. |

---

## 1. Context

App Guide cards currently carry a redundant audience badge (`Students` /
`Workers`) alongside the `App Guide` tag. The guides are general system
instructions for all users.

---

## 2. Constraints

- **CON-01:** `LearningResource.audience` MUST become optional
  (`audience?: AudienceType`).
- **CON-02:** The three App Guide entries in `LEARNING_RESOURCES` MUST omit
  the `audience` field entirely.
- **CON-03:** Literacy article entries MUST keep their `audience` values, so
  the `For Students` / `For Workers` chips keep working. (Note: with no
  audience, App Guide cards simply won't match those chips — acceptable.)
- **CON-04:** `app/(tabs)/learning.tsx` already guards
  `{item.audience && (...)}`, so no rendering change is required beyond the
  type widening.

---

## 3. Acceptance

- **ACC-01 (Objective):** The three App Guide entries have no `audience`
  field; `LearningResource.audience` is optional.
- **ACC-02 (Objective):** `npx tsc --noEmit` clean (the learning.tsx guard
  already handles undefined).
- **ACC-03 (Subjective):** App Guide cards show only the `App Guide` tag;
  literacy cards still show their audience badge.

---

## 4. Deliverables

- **D-01 (`utils/learningData.ts`):** Make `audience` optional; drop it from
  the three App Guide entries.

---

## 5. References

- `specs/49-app-guide-learning-category.md`
- `specs/50-learning-section-grouping.md`
- `AGENTS.md §1.9`
