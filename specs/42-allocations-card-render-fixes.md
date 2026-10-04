# Spec 42: Allocations Card Rendering Fixes (Missing Icon Glyph & Raw Unicode)

| Field | Value |
|---|---|
| ID | SPEC-42 |
| Title | Allocations Card Rendering Fixes |
| Status | **FINAL** (2026-10-04 per user call "FINAL") |
| Owner | User (final authority) |
| Version | 1.0 |
| Scope | `app/savings.tsx` |
| Non-goals | Layout/geometry changes beyond the two fixes, color changes, new dependencies |
| Normative source | This file. File+symbol cites are normative; `:line` numbers are hints only. |

---

## Terminology (RFC 2119)

The keywords **MUST**, **MUST NOT**, **SHOULD**, and **MAY** in this spec are
to be interpreted as described in RFC 2119.

---

## 1. Context

Two rendering defects are visible on completed allocation cards in
`app/savings.tsx`:

1. **Missing icon glyph (`?`):** The completed-goal circle uses
   `MaterialCommunityIcons name="checkmark-circle"`, which is not a valid
   MaterialCommunityIcons glyph name; the icon font renders its fallback
   (`?`). The valid name is `check-circle`.
2. **Raw unicode text:** The progress label contains the literal characters
   `\u2022` in JSX text (`... \u2022 100% Reached`), which JSX renders
   verbatim instead of as a bullet. It renders only as a bullet when inside
   a JS string expression (`{"\u2022"}`) or as the literal `•` character.

---

## 2. Constraints

- **CON-01 (Icon Name):** The completed-card checkmark icon MUST use
  `name="check-circle"`. Any other `checkmark-circle` usage in this file MUST
  be corrected the same way.
- **CON-02 (Bullet):** The progress label MUST render an actual bullet
  `•` between the amount and `100% Reached`, either as the literal character
  in a JS expression (`{"\u2022"}`) or the raw `•` character inside the JSX
  text. The literal backslash sequence `\u2022` MUST NOT appear as JSX text.
- **CON-03 (No Layout Drift):** Card geometry, colors, sizes (48px circle,
  28px icon), and spacing MUST remain unchanged.
- **CON-04 (Cross-Platform):** Fix MUST render on Android, iOS, and Web.

---

## 3. Goal & Acceptance Criteria

### 3.1 Interaction Matrix

| Element | Before | After |
|---|---|---|
| Completed card icon | `?` fallback glyph | Green `check-circle` glyph |
| Progress label | `₱600.00 / ₱600.00 \u2022 100% Reached` | `₱600.00 / ₱600.00 • 100% Reached` |

### 3.2 Acceptance Criteria

- **ACC-01 (Objective):** `app/savings.tsx` contains no `checkmark-circle`
  and no literal `\u2022` JSX text.
- **ACC-02 (Objective):** The completed card renders `MaterialCommunityIcons`
  with `name="check-circle"`.
- **ACC-03 (Subjective):** Reviewer confirms on Expo Go / web export that the
  completed card shows a proper check circle (not `?`) and the label shows a
  real bullet dot.

---

## 4. Platform Matrix

| Platform | Objective Checks (`ACC-01..02`) | Subjective Checks (`ACC-03`) |
|---|---|---|
| **Android** | Icon name + bullet fixed | Glyph and bullet visible |
| **iOS** | Same | Same |
| **Web** | Same | Same |

---

## 5. Deliverables

- **D-01 (`app/savings.tsx`):** Replace `name="checkmark-circle"` with
  `name="check-circle"`, and replace the literal `\u2022` JSX text with
  `{"\u2022"}` (or the literal `•` character).

---

## 6. Glossary

- **Fallback glyph:** The `?` icon MaterialCommunityIcons draws for an
  unknown glyph name.

---

## 7. References

- `AGENTS.md §1.1`, `§1.9`
