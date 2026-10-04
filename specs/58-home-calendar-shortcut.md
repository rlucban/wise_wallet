# Spec 58: Calendar Shortcut Icon in Home Header

| Field | Value |
|---|---|
| ID | SPEC-58 |
| Title | Calendar Shortcut Icon in Home Header |
| Status | **FINAL** (2026-10-04 per user call "final") |
| Owner | User (final authority) |
| Version | 1.0 |
| Scope | `app/(tabs)/index.tsx` |
| Non-goals | New screens, dues/calendar behavior changes, other headers |
| Normative source | This file. |

---

## 1. Context

The Home header currently has a single notification bell `IconButton`.
A calendar shortcut next to it gives one-tap access to dates/scheduled
sdues without hunting through menus.

---

## 2. Constraints

- **CON-01 (Placement):** A calendar `IconButton` (`icon="calendar-outline"`)
  MUST sit immediately to the right of the bell button (or immediately left,
  depending on reading order — implement left of bell is acceptable but
  document it). [DEC: calendar first, then bell — see below.]
- **CON-02 (Action):** Tapping it MUST `router.push("/calendar")`. If the
  existing calendar route differs, use the existing route (`/calendar`).
- **CON-03 (Styling parity):** Same size (`24`), same default icon color as
  the bell, same touch target (`IconButton` default), no extra background or
  border (to stay consistent with the current bare-icon header). If we later
  box the bell, box this too.
- **CON-04 (Cross-Platform):** Android/iOS/Web identical.

---

## 3. Decision

- **DEC-01 (Route):** Calendar shortcut opens the existing calendar screen
  via `router.push("/calendar")` rather than `/dues`, because the app already
  has a dedicated Calendar route; `/dues` remains reachable from the Home
  quick-actions row.

---

## 4. Acceptance

- **ACC-01 (Objective):** A `calendar-outline` `IconButton` is rendered in
  the Home header beside the bell; its `onPress` routes to `/calendar`.
- **ACC-02 (Subjective):** Reviewer sees a clean, evenly-spaced calendar icon
  matching the bell's size and color on Android/iOS/Web.

---

## 5. Platform Matrix

| Platform | Objective Checks | Subjective Checks |
|---|---|---|
| **Android** | ACC-01 | Icon matches bell |
| **iOS** | Same | Same |
| **Web** | Same | Same |

---

## 6. Deliverables

- **D-01 (`app/(tabs)/index.tsx`):** Add the calendar `IconButton` next to
  the bell with matching styling.

---

## 7. References

- `AGENTS.md §1.9`
