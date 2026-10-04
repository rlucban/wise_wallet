# Spec 49: "App Guide" Category in the Learning Tab

| Field | Value |
|---|---|
| ID | SPEC-49 |
| Title | "App Guide" Category in the Learning Tab |
| Status | **FINAL** (2026-10-04 per user call "final") |
| Owner | User (final authority) |
| Version | 1.0 |
| Scope | `utils/learningData.ts`, `app/(tabs)/learning.tsx`, `app/(tabs)/learning-detail.tsx` |
| Non-goals | TTS voice behavior, article content quality, new tabs, navigation changes |
| Normative source | This file. |

---

## 1. Context

The Capstone title pairs "Financial Management" with "Financial Literacy".
Today Learning only carries concept articles (`Budgeting`/`Savings`/`Debt`).
This spec adds a system-literacy category so the app teaches users how to use
WiseWallet itself.

---

## 2. Constraints

- **CON-01 (Topic):** `ArticleTopic` in `utils/learningData.ts` MUST add
  `"App Guide"`.
- **CON-02 (Filter chip):** `UNIFIED_FILTERS` in `learning.tsx` MUST append
  `"App Guide"` between `"Debt"` and the end; the existing
  `item.topic === activeFilter` branch MUST then include App Guide items.
- **CON-03 (Resources):** At least three new `LEARNING_RESOURCES` entries with
  `topic: "App Guide"`, valid `icon`, `minutes`, and `audience` ∈
  `"Students" | "Workers"`. Suggested ids/titles:
  - `guide_track_expenses` — "WiseWallet 101: Tracking Expenses"
  - `guide_allocations` — "How to Create & Manage Allocations"
  - `guide_scheduled_dues` — "Managing Scheduled Dues"
- **CON-04 (Content):** Each new id MUST have a matching
  `LEARNING_CONTENT[id] = { title, content }` entry in
  `learning-detail.tsx` so the detail screen and TTS work.
- **CON-05 (Tag styling):** `getPastelTagStyle` in `learning.tsx` MUST add an
  `"App Guide"` case so its pill renders a distinct pastel color instead of
  falling through to default.
- **CON-06 (Cross-Platform):** Android/iOS/Web render identically; TTS still
  uses `speakWithFemaleVoice`.

---

## 3. Acceptance

- **ACC-01 (Objective):** Selecting the `App Guide` chip filters the list to
  only the new guide entries; selecting `All` shows everything.
- **ACC-02 (Objective):** Opening a guide renders its title/content and the
  read-aloud button calls `speakWithFemaleVoice`.
- **ACC-03 (Subjective):** Reviewer confirms the App Guide tag pill has a
  distinct color and cards look consistent with existing ones.

---

## 4. Platform Matrix

| Platform | Objective Checks | Subjective Checks |
|---|---|---|
| **Android** | Filter + detail + TTS works | Chip color distinct |
| **iOS** | Same | Same |
| **Web** | Same | Same |

---

## 5. Deliverables

- **D-01 (`utils/learningData.ts`):** Add `"App Guide"` to `ArticleTopic` and
  three resource entries per CON-03.
- **D-02 (`app/(tabs)/learning.tsx`):** Append `"App Guide"` to
  `UNIFIED_FILTERS`; add tag style case.
- **D-03 (`app/(tabs)/learning-detail.tsx`):** Add three `LEARNING_CONTENT`
  entries matching the new ids.

---

## 6. References

- `specs/11-female-tts-voice-for-recommended-reading.md`
- `AGENTS.md §1.9`, `§1.10`
