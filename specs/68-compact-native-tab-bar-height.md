# Spec 68: Compact Native Tab Bar Height

| Field | Value |
|---|---|
| ID | SPEC-68 |
| Title | Compact Native Tab Bar Height |
| Status | **v1.0 FINAL; v1.1 FINAL; v1.2 DRAFT** (v1.2 requires explicit user FINAL approval) |
| Owner | User (final authority) |
| Version | v1.0 FINAL 68pt; v1.1 FINAL 64pt; v1.2 DRAFT responsive native float gap |
| Scope | Reduce the bottom floating tab pill's content height on Android/iOS while preserving its Web height and all safe-area behavior. |
| Non-goals | Changing tab order, labels, icons, typography, pill width/margins, 32pt float gap, colors, shadows, animation, FAB position, routes, screen clearance, or dependencies. |
| Normative source | v1.0 and v1.1 are FINAL. The v1.2 amendment becomes normative only after explicit user FINAL approval. |

> RFC 2119 keywords **MUST**, **MUST NOT**, **SHOULD**, and **MAY** express
> normative requirements in v1.0 and v1.1 are active. The v1.2 DRAFT delta is
> inactive until the user explicitly marks it FINAL.

> History: v1.0 FINAL 2026-10-08 (native 68pt / Web 78pt). v1.1 FINAL
> 2026-10-08 responds to the user's visual report that the native pill remains
> too tall; option A retains stacked labels at 64pt native content. v1.2 DRAFT
> proposes reducing the native float gap while keeping Web unchanged.

## 1. Context

The user reports that the floating tab pill looks too tall on phone screens,
with excess empty space below the labels, while the Web layout looks correct.
The current geometry uses `TAB_BAR_CONTENT_HEIGHT = 78` on every platform and
adds `insets.bottom` to the total height. The native bar therefore measures
102pt at a 24pt inset and 112pt at a 34pt home-indicator inset; Web remains
78pt because its bottom inset is zero.

SPEC-32 owns safe-area and label-fit metrics. SPEC-52 owns the floating pill
appearance, SPEC-55 owns the 78pt content height and 32pt float gap, and
SPEC-56 owns absolute overlay positioning and 160pt screen clearance. This
spec proposes changing only native content height; safe-area padding and the
Web height remain as they are.

## 2. Constraints

- **CON-68-01 — Native compact height.** Android and iOS MUST use a
  `TAB_BAR_CONTENT_HEIGHT` of 68pt. Web MUST retain 78pt. Total bar height
  MUST equal the platform content height plus `insets.bottom`.
- **CON-68-02 — Safe-area and label fit.** `paddingBottom` MUST continue to
  equal `insets.bottom`; the home-indicator/gesture area MUST NOT be removed or
  counted twice. Native `usableHeight` at content height 68 MUST be 54pt and
  MUST fit icon+label requirements through `fontScale` 1.5 (`requiredHeight`
  is at most 50pt).
- **CON-68-03 — Web unchanged.** Web MUST retain its current 78pt content
  height and 78pt total height at zero inset. No Web-specific visual change is
  allowed.
- **CON-68-04 — Other tab geometry frozen.** SPEC-32 label metrics,
  SPEC-52/55 pill radius, width/margins, 32pt float gap, theme colors, shadows,
  and press easing MUST remain unchanged. SPEC-56's absolute overlay and all
  five 160pt clearances MUST remain unchanged.
- **CON-68-05 — Minimal cross-platform change.** Only
  `utils/tabBarMetrics.ts`, `app/(tabs)/_layout.tsx`, the corresponding
  `utils/tabBarMetrics.test.ts` guards, and the documentation paths named in
  D-*. No new dependency, storage, API, route, or native module.
- **CON-68-06 — Metrics shape.** `getTabBarMetrics` MUST keep its existing
  return-object shape. The selected content height is derived as
  `height - insetsBottom`; no new result field is allowed.
- **CON-68-07 — Verification.** Jest MUST parameterize Android, iOS, and Web
  values. The user runs Jest, lint, TypeScript, Expo Go, and Web-export checks
  per AGENTS.md §1.3 and §1.10; the agent MUST NOT run CLIs.

## 3. Goal

| Platform | Objective (machine-checkable) | Subjective (reviewer check) |
|---|---|---|
| Android | **ACC-68-01:** At inset 34, `height` is 102, `paddingBottom` is 34, `usableHeight` is 54, and derived content height (`height - inset`) is 68; `fits` is true through fontScale 1.5. | **ACC-68-S01:** In Expo Go on an Android phone, confirm the pill is visibly shorter with less empty space below labels; labels remain readable, the gesture area is clear, and the FAB remains beside the pill. |
| iOS | **ACC-68-02:** At inset 34, metrics match Android: height 102, paddingBottom 34, usableHeight 54, derived content height 68; `fits` is true through fontScale 1.5. | **ACC-68-S02:** In Expo Go on iPhone 14 Pro Max, confirm the pill is visibly shorter, all labels remain legible, the home indicator has clear space, and no screen content is obscured. |
| Web | **ACC-68-03:** At inset 0, `height` remains 78, `paddingBottom` is 0, `usableHeight` is 64, and derived content height is 78; existing label layout is unchanged. | **ACC-68-S03:** In Web export, confirm the tab pill's size and position look unchanged and all tab labels remain usable. |

### Resolved decisions

- **DEC-68-01:** Android/iOS native content height becomes 68pt; Web stays
  78pt.
- **DEC-68-02:** Keep the safe-area inset in both total height and
  `paddingBottom`; compact only the content portion of the pill.

### Acceptance criteria — Objective

- **ACC-68-01..03:** `utils/tabBarMetrics.test.ts` asserts literal native and
  Web metrics, safe-area preservation, and label fit through fontScale 1.5,
  parameterized for `Platform.OS` `android`/`ios`/`web`.
- **ACC-68-04:** Source guards confirm the current margin, overlay position,
  32pt float, capsule radius, and 160pt clearances remain unchanged.
- **ACC-68-05:** User-run TypeScript and lint checks pass without new warnings.

### Acceptance criteria — Subjective

- **ACC-68-S01..S03:** Follow the platform matrix above. Pass only if the
  native pill is shorter without clipped labels or home-indicator overlap, and
  Web remains visually unchanged.

## 4. Deliverables

- **D-68-01:** Extend `getTabBarMetrics` with an explicit content-height input
  (defaulting to the current 78pt value), preserving its pure/platform-agnostic
  return shape; have `_layout.tsx` choose 68pt on Android/iOS and 78pt on Web.
- **D-68-02:** Update `utils/tabBarMetrics.test.ts` for literal platform
  metrics and fontScale 1.0–1.5 fit, retaining the existing safe-area and
  no-nested-provider guards.
- **D-68-03:** Update `utils/tabBarFloat.test.ts` only if a metric-source
  assertion needs to reflect the explicit content-height selection; preserve
  every existing SPEC-52/55/56 guard.
- **D-68-04:** After user-run validation, update `docs/savepoint.md` and append
  a matching Current status entry to `AGENTS.md` §3.

## 5. Glossary

- **Content height:** Tab-bar height excluding the operating-system bottom
  safe-area inset.
- **Total height:** Content height plus `insets.bottom`.
- **Usable height:** Total height minus top/bottom padding and tab-item
  padding; this is the space available to the icon and label.

## 6. References

- `specs/32-tab-bar-label-visibility.md` (safe-area and label-fit owner)
- `specs/52-floating-tab-bar.md` (pill geometry and styling)
- `specs/55-remove-veil-raise-enlarge-tab-bar.md` (78pt height / 32pt float)
- `specs/56-overlay-tab-bar-and-clearance.md` (absolute overlay / clearance)
- `specs/63-ui-batch-settings-reports-literacy-dashboard-scheduled-dark-mode.md` (FAB adjacency)
- `utils/tabBarMetrics.ts`
- `utils/tabBarMetrics.test.ts`
- `app/(tabs)/_layout.tsx`
- `AGENTS.md` §1.1, §1.3, §1.5, §1.9, §1.10, §1.11, §1.14

---

## Amendment v1.2 — Responsive Native Float Gap (DRAFT, needs FINAL)

> v1.0 and v1.1 remain FINAL. This amendment supersedes only the native
> 32pt float-gap and native FAB vertical-alignment requirements; Web remains
> unchanged. It is inactive until the user explicitly marks v1.2 FINAL.

### Context

The user supplied a phone screenshot after the native height reduction and
reported that the tab pill still looks visually unchanged. The screenshot
shows a large gap below the floating pill. The remaining visible gap is the
native `marginBottom: 32` from SPEC-55 plus the safe-area space retained inside
the pill. The requested adjustment is to reduce only the native float gap,
while preserving the home-indicator inset and moving the adjacent `+` FAB with
the pill. Web currently looks correct and MUST not change.

### Constraints (delta, normative only after FINAL)

- **CON-68-14 — Responsive float gap.** Android and iOS MUST use an 8pt
  `tabBarStyle.marginBottom`; Web MUST retain 32pt. The safe-area inset MUST
  remain in the bar height and `paddingBottom` exactly as v1.0/v1.1 require.
- **CON-68-15 — FAB follows the pill.** The Dashboard `+` FAB's vertical
  center MUST remain aligned with the tab pill's vertical center. Its bottom
  formula MUST use the same platform-selected float gap as the pill; horizontal
  position, diameter, color, and action MUST remain unchanged.
- **CON-68-16 — Remaining geometry frozen.** Native content height 64pt, Web
  content height 78pt, stacked labels, label metrics, horizontal margins,
  capsule radius, colors, shadows, easing, absolute overlay, and all 160pt
  screen clearances MUST remain unchanged.
- **CON-68-17 — Safe-area clearance.** The pill MUST retain the existing
  inset-aware bottom padding and remain above the OS home/gesture indicator;
  the 8pt value is the gap below the bar frame, not a replacement for the
  safe-area inset.
- **CON-68-18 — Cross-platform verification.** Tests MUST assert 8pt on
  Android/iOS and 32pt on Web, plus matching FAB gap selection, parameterized
  by `Platform.OS`. Existing SPEC-52/55/56 guards MUST remain active.

### Decision

- **DEC-68-04 (DRAFT):** Use an 8pt native float gap and retain the 32pt Web
  gap; compute the FAB vertical offset from the same selected gap.

### Acceptance criteria (delta)

Objective:

- **ACC-68-09:** For Android/iOS, source guard finds the native 8pt gap and
  Web 32pt gap selection in `_layout.tsx`.
- **ACC-68-10:** FAB and tab pill use the same selected gap; the existing
  height-derived vertical centering formula is preserved.
- **ACC-68-11:** `utils/tabBarFloat.test.ts` passes for Android/iOS/Web and
  retains capsule, overlay, safe-area, press animation, and clearance guards.

Subjective:

- **ACC-68-S08:** On iPhone 14 Pro Max, confirm the pill sits closer to the
  home indicator with a smaller bottom gap, labels remain readable, and the
  `+` FAB stays vertically aligned beside the pill.
- **ACC-68-S09:** On Web, confirm the pill and FAB positions are unchanged.

### Deliverables (delta)

- **D-68-08:** In `app/(tabs)/_layout.tsx`, select native 8pt / Web 32pt
  float gap and use it for both `tabBarStyle.marginBottom` and the FAB's
  vertical-centering formula.
- **D-68-09:** Update `utils/tabBarFloat.test.ts` to assert per-platform gap
  and FAB alignment while preserving existing guards.
- **D-68-10:** After user-run validation, update `docs/savepoint.md` and
  append a matching Current status entry to `AGENTS.md` §3.

### References (delta)

- `specs/55-remove-veil-raise-enlarge-tab-bar.md` (32pt Web/native base gap)
- `specs/56-overlay-tab-bar-and-clearance.md` (160pt scroll/FAB clearance)
- `specs/63-ui-batch-settings-reports-literacy-dashboard-scheduled-dark-mode.md` (FAB beside pill)
- `app/(tabs)/_layout.tsx`
- `utils/tabBarFloat.test.ts`

---

## Amendment v1.1 — Tighter Stacked Native Pill (DRAFT, needs FINAL)

> v1.0 stays FINAL. This amendment supersedes v1.0 DEC-68-01 and
> CON-68-01/02 only for native content height and remaining label headroom.
> Web height and all safe-area rules remain unchanged. No v1.1 normative
> change takes effect until the user explicitly marks it FINAL.

### Context

The user reports that the v1.0 native content height of 68pt still looks too
tall in the phone screenshot. The user selected option A: retain the familiar
stacked icon-above-label layout and reduce the native content height further.
At 64pt content height, the existing formula yields `usableHeight = 50pt`:
`64 - paddingTop 4 - item paddings 10`. This exactly meets the 50pt
icon-plus-label requirement at fontScale 1.5. The Web height remains 78pt.

### Constraints (delta, normative only after FINAL)

- **CON-68-08 — Tighter native height.** Android and iOS MUST use 64pt content
  height. Web MUST remain at 78pt. Total height MUST continue to equal content
  height plus `insets.bottom`.
- **CON-68-09 — Safe-area and labels.** Bottom padding MUST remain exactly
  `insets.bottom`. Stacked icon-above-label layout and label typography MUST
  remain unchanged. Native `usableHeight` MUST be 50pt and MUST be greater
  than or equal to the existing required height through fontScale 1.5. At
  fontScale 1.5, zero spare headroom is accepted by this amendment.
- **CON-68-10 — Web unchanged.** Web MUST retain 78pt content height and the
  existing Web tab layout, spacing, and appearance.
- **CON-68-11 — All other geometry frozen.** SPEC-52/55/56 values remain
  unchanged: capsule radius, horizontal margins, 32pt float gap, colors,
  shadows, press easing, absolute overlay, FAB adjacency, and 160pt scroll
  clearances.
- **CON-68-12 — Test honesty.** The metrics tests MUST assert `fits=true`
  through fontScale 1.5, but MUST NOT require positive headroom for native at
  fontScale 1.5. The Web default metrics continue to assert 64pt usable height.

### Decision

- **DEC-68-03:** Native content height becomes 64pt with the stacked
  label layout preserved; Web remains 78pt. Exact-fit headroom at fontScale
  1.5 is accepted.

### Acceptance criteria (delta)

Objective:

- **ACC-68-06:** For Android/iOS at inset 34, metrics return height 98,
  paddingBottom 34, usableHeight 50, and derived content height 64. The
  `fits` flag is true through fontScale 1.5.
- **ACC-68-07:** For Web at inset 0, metrics remain height 78,
  paddingBottom 0, usableHeight 64, and derived content height 78.
- **ACC-68-08:** Jest runs the native and Web metric assertions under
  `Platform.OS` `android`, `ios`, and `web`; all existing safe-area, label
  visibility, floating pill, and clearance guards remain active.

Subjective:

- **ACC-68-S06:** In Expo Go on iPhone 14 Pro Max, confirm the stacked pill is
  visibly shorter, labels remain fully readable, and the home indicator is
  clear.
- **ACC-68-S07:** In Web export, confirm the pill looks unchanged from v1.0.

### Deliverables (delta)

- **D-68-05:** Set the native content-height constant to 64pt; keep the Web
  content-height constant at 78pt.
- **D-68-06:** Update the focused metrics expectations and relax only the
  positive-headroom assertion for native fontScale 1.5; preserve all other
  fit, inset, source, pill-geometry, and clearance assertions.
- **D-68-07:** After validation, update `docs/savepoint.md` and append the
  result to `AGENTS.md` §3.

### References (delta)

- `utils/tabBarMetrics.ts`
- `utils/tabBarMetrics.test.ts`
- `app/(tabs)/_layout.tsx`
- `specs/32-tab-bar-label-visibility.md` (label-fit contract)