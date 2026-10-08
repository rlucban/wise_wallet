# SPEC-69 — Custom Floating Tab Bar + FAB Dock

| Field | Value |
|---|---|
| ID | SPEC-69 |
| Title | Custom Floating Tab Bar + FAB Dock |
| Status | FINAL |
| Owner | User |
| Version | v1.0 |
| Scope | Bottom tab bar rendering, FAB placement, scroll clearance |
| Non-goals | Route/storage/API/dependency changes; dark-mode re-skins beyond the existing theme |

RFC 2119 terminology (MUST/MUST NOT/SHOULD) applies.

## Context

The bundled expo-router bottom-tabs fork renders a fixed 28px icon box above a
label. The screenshot showed a washed-out, oversized pill and a detached +
button clipping the capsule; the previous absolute-positioned FAB touching the
capsule edge needs replacing.

## Constraints

- **CON-01** Every tab screen ScrollView/FlatList `contentContainerStyle` MUST
  set `paddingBottom: 110` so cards scroll fully above the floating dock.
- **CON-02** `components/FloatingTabBar.tsx` MUST style the pill container with
  `paddingHorizontal: 10`, `paddingVertical: 8`, `gap: 4`.
- **CON-03** The active tab item MUST use a background pill:
  `backgroundColor: "#E8DEF8"`, `borderRadius: 20`, `paddingHorizontal: 4`,
  `paddingVertical: 8`. Each tab has `paddingVertical: 8`.
- **CON-06** Every tab label MUST render on a single line
  (`numberOfLines={1}`, `fontSize: 11`, `lineHeight: 14`) so the trailing
  letter of wide titles (`Reports`, `Settings`, `Learning`) is never wrapped
  onto a second line and does not drop to the bar's bottom edge on narrow
  Android screens.
- **CON-04** The tab bar and FAB MUST be wrapped in a flex row:
  `flexDirection: "row"`, `alignItems: "center"`, `gap: 12`, with the FAB
  beside the dock — no overlap, no touching the capsule edge.
- **CON-05** `expo-router` TABS SHALL delegate to the custom bar via
  `tabBar={(props) => <FloatingTabBar {...props} />}`. No `tabBarStyle`,
  `tabBarButton`, or absolute FAB placement remains in `_layout.tsx`.

## Goal

Replace the library-drawn tab bar with a compact custom pill + a FAB docked
beside it, and give every tab screen enough bottom padding to clear it.

| Check | Platform | Detail |
|---|---|---|
| Objective | Android / iOS / Web | All four tab screens (`index`, `reports`, `learning`, `settings`) read `paddingBottom: 110`. |
| Objective | Android / iOS / Web | `components/FloatingTabBar.tsx` contains the CON-02..CON-04 style literals. |
| Objective | Android / iOS / Web | `_layout.tsx` wires `tabBar={(props) => <FloatingTabBar ...`, no `tabBarStyle`/`tabBarButton`/FAB absolute block. |
| Subjective | Android / iOS / Web | Reviewer confirms the active tab reads as a distinct lavender pill, the FAB never overlaps the capsule, and list items clear the dock when scrolled to the end. |

## Deliverables

- **D-01** `app/(tabs)/index.tsx` — `FlashList` `contentContainerStyle` set to `paddingBottom: 110`.
- **D-02** `app/(tabs)/settings.tsx` — root `ScrollView` `paddingBottom: 110`.
- **D-03** `app/(tabs)/reports.tsx` — root `ScrollView` `paddingBottom: 110`.
- **D-04** `app/(tabs)/learning.tsx` — `styles.scrollContent.paddingBottom` set to `110`.
- **D-05** `components/FloatingTabBar.tsx` — new custom dock (pill + FAB row).
- **D-06** `app/(tabs)/_layout.tsx` — `tabBar` delegation; old tab-bar styling and standalone FAB removed.
- **D-07** Guards: `utils/tabBarFloat.test.ts` + ACC-05 of
  `utils/tabBarMetrics.test.ts` updated to guard the new contract (the old
  hardcoded metric/metro pins in `_layout.tsx` are superseded).

## Glossary

- Dock — the floating bottom tab bar pill together with the FAB.
- Capsule/pill — the rounded background behind the four tabs.

## References

- `specs/04-connection-status-vs-offline-mode.md` (template).
- Superseded pins: `specs/32-tab-bar-label-visibility.md`, `specs/52-floating-tab-bar.md`,
  `specs/55-remove-veil-raise-enlarge-tab-bar.md`, `specs/56-overlay-tab-bar-and-clearance.md`,
  `specs/68-compact-native-tab-bar-height.md` (only their `_layout.tsx` source pins and the
  `paddingBottom: 160` clearance values are superseded by SPEC-69).
