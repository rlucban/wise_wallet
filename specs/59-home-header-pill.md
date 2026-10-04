# Spec 59: Floating Header Pill for Calendar + Notification Actions

| Field | Value |
|---|---|
| ID | SPEC-59 |
| Title | Floating Header Pill for Calendar + Notification Actions |
| Status | **FINAL** (2026-10-04 per user call "final"; DEC-01 keeps `/calendar`) |
| Owner | User (final authority) |
| Version | 1.0 |
| Scope | `app/(tabs)/index.tsx` |
| Non-goals | New screens, route changes, bottom tab bar changes, badge logic changes |
| Normative source | This file. |

---

## 1. Context

Spec 58 added a bare calendar IconButton next to the bell. The user now
wants both grouped inside a floating rounded pill that visually matches the
floating bottom tab bar.

---

## 2. Constraints

- **CON-01 (Pill container):** Both buttons MUST be wrapped in one View with:
  `flexDirection: "row"`, `alignItems: "center"`, rounded-full radius
  (`borderRadius: 999` or high value), `backgroundColor: theme.colors.surface`
  (white in light mode, matches tab bar), horizontal padding ~4–8, and the
  same shadow/elevation model as the floating tab bar (`boxShadow` on web,
  `shadowColor/Opacity 0.10/Radius 8/elevation 6` native).
- **CON-02 (Placement):** The pill sits in the same header row as the date,
  top-right, vertically centered with the date block.
- **CON-03 (Behavior):** Calendar → `router.push("/calendar")` (per Spec 58
  DEC-01; NOT `/dues`). Bell → `/notifications`, red unread badge preserved
  exactly (position/color/count).
- **CON-04 (Icons):** Both icons keep `size={24}` and default contrast color;
  no borders on individual buttons.
- **CON-05 (Dependency):** No new imports required (View/StyleSheet exist);
  use `Platform.select` for the web-vs-native shadow parity with the tab bar.

---

## 3. Acceptance

- **ACC-01 (Objective):** Calendar + bell render inside one shared pill View
  in the Home header; badge still shows unread count when > 0.
- **ACC-02 (Subjective):** Reviewer confirms the header pill echoes the
  floating tab bar's look (radius, surface, shadow) on Android/iOS/Web.

---

## 4. Platform Matrix

| Platform | Objective Checks | Subjective Checks |
|---|---|---|
| **Android** | ACC-01 | Pill floats cleanly, matches tab bar |
| **iOS** | Same | Same |
| **Web** | Same | Same (boxShadow renders) |

---

## 5. Deliverables

- **D-01 (`app/(tabs)/index.tsx`):** Wrap the two IconButtons in a shared
  pill-styled View per CON-01..05.

---

## 6. Decision

- **DEC-01 (Route discrepancy):** Spec 58 sent calendar to `/calendar`; this
  prompt mentions `/dues`. DEC: keep `/calendar`; flag for user to override.

---

## 7. References

- `specs/38-floating-pill-tab-bar.md`, `specs/58-home-calendar-shortcut.md`
