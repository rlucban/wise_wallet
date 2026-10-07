# SPEC-55 — Remove Tab Bar Veil, Raise and Enlarge the Floating Pill

| Field | Value |
|---|---|
| ID | SPEC-55 |
| Title | Remove the glassy veil ("footer") layer, raise the float to 32px, enlarge the pill to 78px |
| Status | **FINAL** v0.1 (marked by user 2026-10-07; implementable per AGENTS.md §1.1) |
| Owner | User (final authority) |
| Version | v0.1 DRAFT |
| Scope | `app/(tabs)/_layout.tsx` (remove veil + `marginBottom`), `utils/tabBarMetrics.ts` (`TAB_BAR_CONTENT_HEIGHT`), `utils/tabBarMetrics.test.ts`, `utils/tabBarFloat.test.ts`, delete `utils/tabBarVeil.test.ts`, journal |
| Non-goals | Any screen body, route, storage, API, dependency, label typography, tints, dark tonal lift, shadow values, press easing; edge-to-edge (non-floating) bar |
| Normative source | This file (once marked FINAL). File+symbol cites are normative; `:line` numbers are hints only. |

> History: v0.1 DRAFT 2026-10-07 from user calls ("remove the footer so the
> navbar is more prominent, then raise it above the footer position a bit
> more"; option B = veil + chunkier pill). No normative content before
> FINAL mark.

## Terminology (RFC 2119)

The keywords **MUST**, **MUST NOT**, **SHOULD**, and **MAY** in this spec are
to be interpreted as described in RFC 2119. Informative prose (examples,
"today", "currently") is non-normative unless restated as a requirement.

## Context

### Problem

In one sentence: **SPEC-54's veil reads as a muddy footer strip that competes
with the pill, so it goes away, and the pill itself must get bigger and sit
higher so the floating navbar reads as the primary navigation.**

### Evidence (verified read-only, this tree)

- `app/(tabs)/_layout.tsx` — `TabBarVeil` + `tabBarBackground` (SPEC-54
  D-54-01) render the gradient + blur glyphs inside the pill's own box;
  `marginBottom: 20`; `height` comes from `getTabBarMetrics`.
- `utils/tabBarMetrics.ts:25` — `TAB_BAR_CONTENT_HEIGHT = 68`; `usableHeight
  = height − 4 − inset − 10 = 54` vs `requiredHeight = 43` at fontScale 1.
- `utils/tabBarMetrics.test.ts` pins the literals `68`/`54`/`102` in five
  places (`:36-41`, `:47-52`, `:57-63`, `:86`, `:139-146`, `:155-167`) and
  the `fits=false` boundary at `fontScale` 2.0 (`:126-132`).
- `BottomTabItem.js:140-146` — `tabVerticalUiKit` is
  `justifyContent: 'flex-start'`, `alignItems: 'center'`, `padding: 5`, so
  icons/labels are top-aligned inside the bar: raising the pill moves the
  whole navbar without shifting labels.
- `BottomTabBar.js` — when `tabBarBackground` is **absent** the library sets
  its own `backgroundColor: colors.card` and adds a hairline top border,
  both of which `tabBarStyle` overrides (it is applied last). The current
  `tabBarStyle` already carries an explicit `backgroundColor` and
  `borderTopWidth: 0`, so removing the veil needs no compensating style.

### Notes (informative)

- Raising `marginBottom` 20 → 32 keeps the pill's bottom edge just above a
  34px home indicator and clear of an Android gesture bar; the inset-aware
  `paddingBottom` (SPEC-32) is untouched.
- Enlarging to 78 is a pure headroom increase: `usableHeight` 54 → 64
  against `requiredHeight` 43, so ACC-01's fit invariant gets safer, not
  riskier. Capsule radius follows automatically (`height / 2`).

## Constraints (normative)

- **CON-55-01 — Bare-minimum diff (§1.11).** Only the removal of
  `TabBarVeil`, its `tabBarBackground` screenOption, the now-unused
  `LinearGradient` import, `marginBottom`, `TAB_BAR_CONTENT_HEIGHT`, and the
  test literals named in D-55-02/D-55-03 MAY change. No other line.
- **CON-55-02 — No new dependencies (§1.12).** `package.json` /
  `package-lock.json` unchanged; `expo-linear-gradient` remains a direct
  dependency (used by `login.tsx`/`register.tsx`), it is merely no longer
  imported here.
- **CON-55-03 — Veil removal is total.** `TabBarVeil`, `tabBarBackground`, and
  the `expo-linear-gradient` import MUST be gone from
  `app/(tabs)/_layout.tsx`; no gradient, haze glyph, or translucent layer
  may remain in the bar. `LinearGradient` MUST NOT be reintroduced elsewhere
  in this file.
- **CON-55-04 — SPEC-32 amendment (named).** `TAB_BAR_CONTENT_HEIGHT`
  `68 → 78` and its doc-comment table updated. Every other SPEC-32
  constraint stays in force: `paddingTop = 4`, `TAB_ITEM_PADDING = 5`,
  `ICON_HEIGHT = 28`, `LABEL_FONT_SIZE = 12` + `fontWeight: "600"`, no
  font-scale lock, no nested `SafeAreaProvider`, `fontScale` stays a
  parameter (no `PixelRatio`), platform-agnostic helper (no `Platform`).
  SPEC-52's capsule (`borderRadius: height / 2`), `marginHorizontal: 16`,
  dark tonal background, shadow values, and press easing MUST remain.
- **CON-55-05 — Fit invariant still holds, boundary re-pinned.**
  `usableHeight` MUST be ≥ `requiredHeight` for `fontScale` 1.0–1.5 at
  `insetsBottom` 0/24/34 (`64 ≥ 43` and `64 ≥ 50`). The `fits=false`
  boundary test MUST move from `fontScale` 2.0 to **3.0** (at 2.0,
  `required = 57 ≤ 64`, so 2.0 no longer demonstrates the failure mode).
- **CON-55-06 — Float height.** `marginBottom: 20 → 32`.
- **CON-55-07 — Guard preservation.** The still-valid SPEC-54 guards (no
  `expo-blur`, no `backdropFilter`, no `boxShadow`, import allow-list) MUST
  be carried into `utils/tabBarFloat.test.ts` when
  `utils/tabBarVeil.test.ts` is deleted — no guard is silently dropped.
- **CON-55-08 — Cross-platform / Expo Go / Vercel (§1.5–§1.7).** No new
  platform branch; web MUST NOT gain a warning (SPEC-06 parity).
- **CON-55-09 — TDD with cross-platform coverage (§1.10).** `jest`
  parameterized by `android`/`ios`/`web` + user-run visual matrix.
- **CON-55-10 — Docs (§1.8).** `docs/savepoint.md` + `AGENTS.md` §3 entry.
  Status flips to FINAL only on explicit user call.

## Goal

### Interaction matrix

| Platform | Bar face | Size | Float | Motion / safe area |
|---|---|---|---|---|
| Android | solid surface, no veil | 78 + inset (was 68) | 32px (was 20) | press easing kept; inset math untouched |
| iOS | same | 78 + inset | 32px | clears home indicator |
| Web | same, no veil | 78 + inset | 32px | no new warnings |

### Decisions

- **DEC-55-01 (RECOMMENDED — user call B):** remove the veil entirely rather
  than lighten it — the pill's solid tone on a tonal background is the
  prominence the user asked for; translucency fought the icons.
- **DEC-55-02 (RECOMMENDED):** enlarge via `TAB_BAR_CONTENT_HEIGHT` (the
  metric SPEC-32 already owns) rather than adding a local height override,
  so the fit invariant keeps being tested instead of bypassed.
- **DEC-55-03 (RECOMMENDED):** `marginBottom` as a fixed 32 rather than
  inset-relative arithmetic — one number, predictable across devices, and
  the safe-area clearance stays SPEC-32's job.
- **DEC-55-04 (RECOMMENDED):** delete `utils/tabBarVeil.test.ts` and fold its
  surviving guards into `utils/tabBarFloat.test.ts` — one float-related
  suite, no orphaned file (§1.14 one-home-per-behavior).

### Acceptance

Objective (machine-checkable):

| ID | Android | iOS | Web | Check |
|----|---------|-----|-----|-------|
| ACC-01 | ✅ | ✅ | ✅ | `_layout.tsx` contains no `TabBarVeil`, no `tabBarBackground`, no `expo-linear-gradient`; `utils/tabBarVeil.test.ts` does not exist |
| ACC-02 | ✅ | ✅ | ✅ | `getTabBarMetrics` returns `height 78/102/112`, `usableHeight 64`, `fits true` for insets 0/24/34; `TAB_BAR_CONTENT_HEIGHT === 78`; fontScale 3.0 → `fits === false` |
| ACC-03 | ✅ | ✅ | ✅ | `_layout.tsx` has `marginBottom: 32`, keeps explicit `backgroundColor`, `borderTopWidth: 0`, `borderRadius: height / 2`, `marginHorizontal: 16`, shadow + press easing; capsule radius 39/51/56 |
| ACC-04 | ✅ | ✅ | ✅ | `utils/tabBarFloat.test.ts` carries the no-`expo-blur` / no-`backdropFilter` / no-`boxShadow` / import-allow-list guards (CON-55-07) |
| ACC-05 | ✅ | ✅ | ✅ | `jest` 0 failed, `lint` clean, `tsc` clean; no dependency/storage-key/route change |

Subjective (reviewer-observed, Expo Go + web export):

- **ACC-S01:** the bar is a clean solid pill — no gradient, no blur glyphs, no grey strip competing with the icons.
- **ACC-S02:** the pill is visibly larger than v1.1 and sits clearly higher; icons and labels still centered, fully legible, nothing clipped.
- **ACC-S03:** labels still render on Android/iOS (SPEC-32 no-regression) and tapping still dips-and-eases.

## Deliverables

- **D-55-01 (`app/(tabs)/_layout.tsx`):** delete `TabBarVeil`,
  `tabBarBackground`, the `LinearGradient` import; `marginBottom: 32`.
  Nothing else in the file.
- **D-55-02 (`utils/tabBarMetrics.ts`):** `TAB_BAR_CONTENT_HEIGHT = 78` +
  its doc-comment table/notes updated (CON-55-04).
- **D-55-03 (`utils/tabBarMetrics.test.ts` + `utils/tabBarFloat.test.ts`):**
  literals 68→78, 54→64, 102→112; boundary test to `fontScale` 3.0
  (ACC-02); capsule 39/51/56; import the SPEC-54 guards (ACC-04); delete
  `utils/tabBarVeil.test.ts` (CON-55-01/03).
- **D-55-04 (user-run matrix + docs):** ACC-S01..S03 (Expo Go + web export),
  `docs/savepoint.md` + `AGENTS.md` §3 per §1.8.

## Glossary

- **Veil:** SPEC-54's gradient + blur-glyph layer behind/inside the pill; removed here.
- **Chunky pill:** `TAB_BAR_CONTENT_HEIGHT` raised so the bar has more vertical presence.
- **Fit invariant:** `usableHeight >= requiredHeight`; the reason a taller bar is safe here.

## References

- `app/(tabs)/_layout.tsx` (SPEC-52 v1.1 + SPEC-54 D-54-01 surface) · `utils/tabBarMetrics.ts:25,89-106` · `utils/tabBarMetrics.test.ts:36-41,47-52,57-63,86,126-132,139-167` · `node_modules/expo-router/build/react-navigation/bottom-tabs/views/BottomTabItem.js:140-146` · `node_modules/expo-router/build/react-navigation/bottom-tabs/views/BottomTabBar.js` (tabBarStyle applied last; hairline/`colors.card` when `tabBarBackground` absent).
- `specs/54-tab-bar-soft-edge-and-float.md` (the veil this removes) · `specs/52-floating-tab-bar.md` (owns the pill; v1.1 preserved) · `specs/32-tab-bar-label-visibility.md` (owns metrics; `TAB_BAR_CONTENT_HEIGHT` amended here) · `specs/06-web-warning-cleanup.md` (no web warnings).