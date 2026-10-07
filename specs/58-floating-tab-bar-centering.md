# Spec 58: Floating Tab Bar Centering + Flexible Web Layout

| Field | Value |
|---|---|
| ID | SPEC-58 |
| Title | Center the floating pill tab bar on wide web + keep it fluid on mobile |
| Status | **FINAL v1.0** (marked by user 2026-10-07 — Option A) |
| Owner | User (final authority) |
| Version | 1.0 |
| Scope | `components/FloatingTabBar.tsx` outer/inner layout only (centering shell + constrained content row); `utils/floatingTabBar.test.ts` guards only |
| Non-goals | Tab destinations/order/titles/icons; pill/container radii, colors, shadows, labels; `+` destination (`/add-transaction`); SPEC-32 geometry values; storage keys; `wallet-api` contract; new dependencies; any other screen |

> History: v1.0 FINAL — user report (2026-10-07, screenshot `localhost:8081` wide web): bar sticks to the left, not centered; request: "wala sa gitna yung navigation sa baba at dapat flexible yan". Owner call: Option A (two-layer centering shell). No other option considered after call.

## Terminology (RFC 2119)

The keywords **MUST**, **MUST NOT**, **SHOULD**, and **MAY** in this spec are to be interpreted as described in RFC 2119. Informative prose (examples, "today", "currently") is non-normative unless restated as a requirement.

## 1. Context

### 1.1 Problem

On wide web (`localhost:8081` desktop, screenshot 2026-10-07) the floating pill tab bar + circular `+` renders left-anchored with empty space on the right — it is not centered. Requirement: centered on wide screens, fluid (full-width minus gutters) on narrow screens.

### 1.2 Evidence (read-only, 2026-10-07)

- `components/FloatingTabBar.tsx:48-60` outer `View`:
  `position: "absolute", left: 16, right: 16, bottom: metrics.paddingBottom + 12, flexDirection: "row", alignItems: "center"` + web `{ alignSelf: "center", width: "100%", maxWidth: 560 }`.
- `alignSelf: "center"` has no effect on an absolutely-positioned element (out-of-flow); `left: 16` anchors the box to the left. `width: "100%"` + `left`/`right` conflict on RN Web, so `maxWidth: 560` caps the width but the box stays left-anchored — exactly the screenshot.
- SPEC-53 OD-05 intent ("centered with `maxWidth: 560`") is not achieved by the current style keys.

### 1.3 Decisions (called — FINAL)

- **OD-01 — Approach: CALLED (Option A).** Two-layer: outer centering shell + inner constrained content row. Options B (`left: 50%` + translate) rejected for native/safe-area quirks.
- **OD-02 — Cap: CALLED (keep 560).** `maxWidth: 560` unchanged from SPEC-53 DD-05. No new token.
- **OD-03 — Gutters: CALLED (keep 16).** Narrow-screen gutters stay 16 each side (today's `left: 16 / right: 16` visual preserved via inner `paddingHorizontal: 16`).

## 2. Constraints (normative)

- **CON-01 — Bare-minimum (§1.11).** Only `D-*` files MAY change. No pill/container radius, color, shadow, label, icon, route, or SPEC-32 metric change. No refactoring beyond the outer/inner style re-map.
- **CON-02 — No new dependencies (§1.12).** No new npm packages, fonts, or native modules. Reuse `react-native` `View`/`Platform`, existing theme, existing `getTabBarMetrics`.
- **CON-03 — Cross-platform (§1.5).** MUST work on Android + iOS + Web via `Platform.select`/`Platform.OS` branches only. MUST NOT statically import a native-only module at file top-level; web MUST NOT use `NativeModules`/native-only APIs.
- **CON-04 — Vercel-deployable + Expo Go safe (§1.6/§1.7).** `expo export --platform web` MUST stay clean; Expo Go MUST NOT red-box on import. No Node-only APIs in app code.
- **CON-05 — No contract break (§1.4).** Storage keys, `wallet-api` contract, AsyncStorage shapes, navigation routes, native deps MUST stay unchanged.
- **CON-06 — TDD cross-platform (§1.10).** `jest` parameterized by `Platform.OS` (`android`/`ios`/`web` via mock) for machine-checkable logic + user-run manual checks in Expo Go and web export for rendered visuals jest cannot prove.
- **CON-07 — One home (§1.14).** SPEC-53 (floating bar owner), SPEC-32 (geometry), SPEC-06 (shadow precedent) are cross-referenced, never re-normed. No duplicate tab-bar spec/slice elsewhere.
- **CON-08 — Absolute-positioning rule.** The outer absolutely-positioned shell MUST NOT rely on `alignSelf: "center"` for centering; centering MUST come from `left: 0, right: 0` + `alignItems: "center"` on the shell and `width: "100%"` + `maxWidth: 560` on the inner row. `left: 16 / right: 16` MUST NOT remain on the absolute shell.

## 3. Goal

### 3.1 Decisions (FINAL)

- **DEC-01 (Shell).** Outer `View` becomes a pure centering shell: `position: "absolute", left: 0, right: 0, bottom: metrics.paddingBottom + 12, alignItems: "center"`. No `flexDirection: "row"`, no `left: 16 / right: 16`, no `alignSelf`, no `width`/`maxWidth` on this layer.
- **DEC-02 (Content row).** New (or re-pathed) inner `View`: `flexDirection: "row", alignItems: "center", width: "100%", maxWidth: 560, paddingHorizontal: 16`. It wraps the existing pill container (`flex: 1` unchanged) + the existing circular `+` (`marginLeft: 12` unchanged). Visual tokens, tab mapping, `pressTab`, and `router.push("/add-transaction")` byte-identical.
- **DEC-03 (SPEC-32).** `getTabBarMetrics(insets.bottom)` bottom offset reused unchanged; `app/(tabs)/_layout.tsx` untouched.

### 3.2 Interaction matrix

| # | State | Behavior |
|---|---|---|
| 1 | Narrow viewport (< 592px, e.g. phones) | Bar spans full width minus 16px gutters each side; pill + `+` same as today, only centered by construction |
| 2 | Wide viewport (≥ 592px, web desktop) | Inner row caps at 560px and sits horizontally centered; equal empty space left/right; `+` stays attached right of the pill inside the cap |
| 3 | Any tab focused / tap tab / tap `+` | Unchanged (SPEC-53 matrix rows 1-4 govern) |
| 4 | Android / iOS tablets | Same as row 2 by construction (centered cap); no phone regression |

### 3.3 Acceptance criteria

Objective (jest, `Platform.OS` = android/ios/web):

| ID | Check |
|---|---|
| ACC-01 | Outer absolute shell contains `left: 0` + `right: 0` + `alignItems: "center"` and contains zero `left: 16` / `right: 16` on the absolute layer (source-text guard) |
| ACC-02 | Inner content row contains `width: "100%"` + `maxWidth: 560` + `paddingHorizontal: 16` + `flexDirection: "row"` (source-text guard) |
| ACC-03 | No visual/behavior regression: pill container `flex: 1` retained; `+` single `router.push("/add-transaction")` retained (exactly 1 hit); four icon names unchanged; no `NativeModules`/`require(`; `getTabBarMetrics` still used for bottom offset |
| ACC-04 | `npm test` 0 failed; `npm run lint` clean; `npx tsc --noEmit` clean (user-run per §1.3) |

Subjective (reviewer-observed, Expo Go + web export):

- **ACC-S01:** Web desktop wide (≥ 1000px, `expo export --platform web` or `localhost:8081`): reviewer confirms pill + `+` block is horizontally centered (equal left/right gaps by eye/ruler), max ~560px wide, not left-docked.
- **ACC-S02:** Web narrow (~390px) + Android/iOS Expo Go phones: reviewer confirms bar spans width minus ~16px gutters, no clipping, no overlap with content, tabs + `+` all tappable.
- **ACC-S03:** Reviewer confirms no visual change to pill color/radius/shadow/labels/icons — only position/width changed.

## 4. Deliverables

- **D-01:** `components/FloatingTabBar.tsx` — DEC-01 + DEC-02 style re-map only. Nothing else in the file changes.
- **D-02:** `utils/floatingTabBar.test.ts` — extend with ACC-01..ACC-03 × android/ios/web (source-text guards; rendered pixels covered by ACC-S01..S03, not jest). No other test file touched.
- **D-03:** Journal — `docs/savepoint.md` + `AGENTS.md` §3 entry (one line each).

## Glossary

| Term | Meaning |
|---|---|
| Centering shell | Outer `position: absolute, left: 0, right: 0` view whose only job is horizontal centering via `alignItems: "center"` |
| Content row | Inner `width: 100%, maxWidth: 560` row holding the pill container + circular `+` |
| Flexible | Fluid full-width minus gutters below 560 + capped-centered above (no fixed pixel position) |
| Left-docked | Current bug: bar pinned to `left: 16` on wide screens |

## References

- `components/FloatingTabBar.tsx:48-60` (outer shell under change)
- `specs/53-floating-pill-tab-bar.md` (floating bar owner; OD-05/DD-05 `maxWidth: 560` intent)
- `specs/32-tab-bar-label-visibility.md` (`utils/tabBarMetrics.ts` geometry owner)
- `specs/06-web-warning-cleanup.md` (`boxShadow` web precedent)
- `utils/floatingTabBar.test.ts` (guards to extend)
- `vercel.json` (web build: `expo export --platform web` → `dist`)
- `AGENTS.md §1` (spec-first, no CLI, invariants, TDD, bare-minimum, docs)
