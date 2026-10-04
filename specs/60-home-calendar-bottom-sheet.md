# Spec 60: Home Calendar Opens as Floating Bottom Sheet (Option A)

| Field | Value |
|---|---|
| ID | SPEC-60 |
| Title | Home Calendar Opens as Floating Bottom Sheet |
| Status | **AWAITING FINAL** (draft 2026-10-04) |
| Owner | User (final authority) |
| Version | 1.0 |
| Scope | `app/(tabs)/index.tsx`, `app/calendar.tsx`, new `components/CalendarDaySheet.tsx` |
| Non-goals | /dues changes, new routes, tab bar changes, transaction editing |
| Normative source | This file. |

---

## 1. Context

Today the Home header calendar button pushes `/calendar`, a full-screen
page. The user prefers Option A: tapping it opens a floating bottom-sheet
style modal over the Home screen, with the calendar as a spacious card and
the selected day's transactions listed beneath. The standalone
`/calendar` route remains registered and still works.

---

## 2. Constraints

- **CON-01 (Sheet):** Tapping the header calendar button on Home MUST open a
  modal sheet (`Modal`/`Portal` from react-native-paper) with a semi-transparent
  backdrop, rounded top corners (`borderTopLeftRadius`/`borderTopRightRadius: 20`),
  and surface background, covering most of the viewport (e.g. 90% height).
- **CON-02 (Reuse):** Extract the existing Calendar + selected-date summary
  card + day transactions + FinancialTip content into a new
  `components/CalendarDaySheet.tsx` used by BOTH the Home modal AND
  `app/calendar.tsx`. No duplicated calendar logic.
- **CON-03 (Calendar card styling):** Inside the sheet, the monthly grid
  MUST sit in a card with white/`theme.colors.surface` background,
  `borderRadius: 16`, subtle elevation, and horizontal padding so the week
  columns aren't squashed.
- **CON-04 (Selected date banner):** The selected-date summary card MUST
  appear directly under the calendar card with consistent margin.
- **CON-05 (List spacing):** The day transaction list MUST keep card
  separation and `paddingBottom` clearance for bottom controls.
- **CON-06 (Dismissal):** Tapping the backdrop or a close action MUST close
  the sheet without navigation; the Home header button reopens it.
- **CON-07 (Route intact):** `/calendar` route MUST still render the page
  (now composed from the same sheet component body, without the Modal wrapper).
- **CON-08 (Cross-Platform):** Expo Go / iOS / Android / Web must not crash;
  the sheet degrades gracefully on web (centered dialog-style overlay is OK).

---

## 3. Acceptance

- **ACC-01 (Objective):** Home calendar button sets local state that renders
  a Paper `Modal` containing `CalendarDaySheet`.
- **ACC-02 (Objective):** `app/calendar.tsx` and the Home modal share the
  same `CalendarDaySheet` component (no duplicated Calendar wiring).
- **ACC-03 (Objective):** `/calendar` route still renders and is reachable
  (imports + registers).
- **ACC-04 (Subjective):** Reviewer confirms the sheet has a dimmed backdrop,
  rounded top, spacious calendar card, and readable day list on
  Android/iOS/Web.

---

## 4. Platform Matrix

| Platform | Objective Checks | Subjective Checks |
|---|---|---|
| **Android** | ACC-01..03 | Sheet slides/feels like bottom sheet |
| **iOS** | Same | Same |
| **Web** | Same | Overlay centered, no layout break |

---

## 5. Deliverables

- **D-01 (`components/CalendarDaySheet.tsx`):** Extract shared Calendar +
  selected-date card + FinancialTip + day transactions UI.
- **D-02 (`app/(tabs)/index.tsx`):** Header calendar button opens the modal
  sheet instead of pushing `/calendar`.
- **D-03 (`app/calendar.tsx`):** Route page renders `CalendarDaySheet`
  directly (page header + scroll preserved).

---

## 6. References

- `specs/58-home-calendar-shortcut.md`, `specs/59-home-header-pill.md`
- `AGENTS.md §1.9`
