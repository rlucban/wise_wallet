# SPEC-54 — Floating Tab Bar: Soft Edge Veil + Higher Float

| Field | Value |
|---|---|
| ID | SPEC-54 |
| Title | Soft gradient "blurred edge" behind the floating pill + raise the float; static and sticky |
| Status | **FINAL** v0.1 (marked by user 2026-10-07; implementable per AGENTS.md §1.1) |
| Owner | User (final authority) |
| Version | v0.1 DRAFT |
| Scope | `app/(tabs)/_layout.tsx` only (`TabBarVeil` component, `tabBarBackground` wiring, `marginBottom`) + one guard test + journal |
| Non-goals | True backdrop blur / `expo-blur` (rejected, DEC-54-01); `backdropFilter`; removing v1.1 press easing (DEC-54-04); tab metrics, labels, tints, order, capsule radius, dark lift; any screen body, route, storage, API, or dependency |
| Normative source | This file (once marked FINAL). File+symbol cites are normative; `:line` numbers are hints only. |

> History: v0.1 DRAFT 2026-10-07 from user calls ("add blurred edges",
> "float a bit higher", "static and sticky"; option A selected). No normative
> content before FINAL mark.
> FINAL 2026-10-07 per user call ("final -> autopilot").

## Terminology (RFC 2119)

The keywords **MUST**, **MUST NOT**, **SHOULD**, and **MAY** in this spec are
to be interpreted as described in RFC 2119. Informative prose (examples,
"today", "currently") is non-normative unless restated as a requirement.

## Context

### Problem

In one sentence: **the floating pill's edges read hard against the page, and
the user wants a blurred-edge look, a slightly higher float, and the bar to
stay motionless and pinned.**

### Evidence (verified read-only, this tree)

- `app/(tabs)/_layout.tsx` (SPEC-52 v1.1) — the bar is an in-flow pill
  (`marginHorizontal: 16`, `marginBottom: 12`, `borderRadius: height / 2`)
  with a hard surface edge; `tabBarBackground` is **not** set, so the bar has
  no background layer of its own beyond `tabBarStyle`.
- `expo-linear-gradient@~57.0.2` **is** a direct dependency (`package.json`)
  and already renders correctly on Android, iOS, and web in
  `app/login.tsx:11,285` and `app/register.tsx:9,194`.
- `expo-blur` is **NOT** installed — a real backdrop blur is a new native
  dependency (§1.12) plus a native view inside the tab bar (§1.7 risk).
- `@expo/vector-icons@^15.1.1` is installed and
  `MaterialCommunityIcons.d.ts` exists in its `build` directory, so
  `@expo/vector-icons/MaterialCommunityIcons` is importable with no new dep.
- The bar is already static and always pinned: it is in-flow (CON-52-03), so
  nothing to do for "sticky"/"static" except raise it and add the veil.

### Notes (informative)

- "Static" is read as *no continuous/looping motion* (DEC-54-04): the v1.1
  press easing stays, because a tap response is not idle motion and removing
  it would regress v1.1 without being asked.
- "Sticky" is already satisfied by the in-flow pill — no scroll-hide behavior
  exists to remove.

## Constraints (normative)

- **CON-54-01 — Bare-minimum diff (§1.11).** Only the new `TabBarVeil`
  component, the `tabBarBackground` screenOption, `marginBottom`, and the
  `LinearGradient` + `MaterialCommunityIcons` imports in
  `app/(tabs)/_layout.tsx` MAY change, plus the files named in D-*. Nothing
  else in the file.
- **CON-54-02 — No new dependency (§1.12).** MUST use
  `expo-linear-gradient` and `@expo/vector-icons` (both already direct deps).
  `package.json` / `package-lock.json` MUST be unchanged. `expo-blur` MUST
  NOT be added (DEC-54-01).
- **CON-54-03 — SPEC-52 invariants preserved.** Capsule
  `borderRadius: height / 2`, `marginHorizontal: 16`, `height`/`paddingTop`/
  `paddingBottom` from `getTabBarMetrics`, tints, labels, titles, icon
  renderers, `learning-detail` `href: null`, dark tonal background
  (CON-52-15), and the v1.1 shadow + press easing MUST all remain unchanged.
  SPEC-32 metrics/labels remain frozen.
- **CON-54-04 — Veil is additive and non-interactive.** `TabBarVeil` MUST be
  an absolutely-positioned, pointer-transparent sibling layer rendered via
  `tabBarBackground`; it MUST NOT intercept touches (so tab taps and the
  press easing keep working), MUST NOT set `tabBarStyle.backgroundColor` to
  anything but the SPEC-52 values, and MUST NOT alter the bar's height.
- **CON-54-05 — Veil visual spec (exact, tunable pre-FINAL only).**
  Vertical `LinearGradient` from `colors={["transparent", "transparent", surface]}` with
  `locations={[0, 0.45, 1]}`, `opacity: 0.85`, containing a centered row of
  three `MaterialCommunityIcons` names `"blur"` (`blur-variant`, `variant: "rounded"`,
  `size: 24`, `color: paperTheme.colors.outline`, `opacity: 0.18`) and
  `"blur-off"` (`blur-variant`, `variant: "rounded"`). Total veil height
  `height + 24`. The veil surface MUST be the same resolved surface the pill
  uses (`theme.dark ? surfaceContainerHigh : surface`), so the two layers
  cannot disagree across themes.
- **CON-54-06 — Higher float (exact).** `marginBottom: 12 → 20`. Safe-area
  math is unchanged (SPEC-32 owns it); this is purely external spacing.
- **CON-54-07 — Cross-platform invariant (§1.5).** Identical output on
  Android, iOS, Web; `LinearGradient` is already platform-safe (§1.5) and no
  `Platform.OS` branch is added. Web MUST NOT emit `backdropFilter`,
  `boxShadow`, or any other SPEC-06-rejected prop.
- **CON-54-08 — Expo Go safe (§1.7) / Vercel-deployable (§1.6).** No new
  native import; `LinearGradient` and `@expo/vector-icons` already load in
  Expo Go on this project. No Node-only API, no secrets.
- **CON-54-09 — TDD with cross-platform coverage (§1.10).** Source-text
  guards × `android`/`ios`/`web` (screens cannot render under
  `roots: utils`) + user-run visual matrix. No platform-only behavior exists
  in this spec, so no per-platform CON is needed.
- **CON-54-10 — Docs (§1.8).** `docs/savepoint.md` + `AGENTS.md` §3 entry.
  Status flips to FINAL only on explicit user call.

## Goal

### Interaction matrix

| Platform | Edge look | Float height | Motion | Pinned |
|---|---|---|---|---|
| Android | gradient veil + haze glyphs, hard edge softened | 20px above system bar | press easing only | yes (in-flow) |
| iOS | same | 20px above home indicator | press easing only | yes |
| Web | same, no web-only props | 20px above viewport edge | press easing only | yes |

### Decisions

- **DEC-54-01 (RECOMMENDED — user call "A"):** gradient veil via
  `tabBarBackground` over true `expo-blur`; rejected because it is a new
  native dependency, puts a native view inside the tab bar, and needs
  `backdropFilter` on web (platform-only behavior §1.10 forbids cheaply).
- **DEC-54-02 (RECOMMENDED):** two haze glyphs plus a fade rather than a
  heavy blur — legible hint of depth with zero new dep and no perf cost.
- **DEC-54-03 (RECOMMENDED):** the veil sits **behind and around** the pill
  (fade + glyphs visible around the rounded edges) instead of tinting the
  pill face — keeps icon tints and label contrast untouched (SPEC-32).
- **DEC-54-04 (RECOMMENDED — user call A):** "static" = no looping/ambient
  motion; the v1.1 press easing stays. Removal needs its own spec.
- **DEC-54-05 (RECOMMENDED):** `marginBottom` 12 → 20 (a clear "float higher"
  step without crowding the home indicator).

### Acceptance

Objective (machine-checkable):

| ID | Android | iOS | Web | Check |
|----|---------|-----|-----|-------|
| ACC-01 | ✅ | ✅ | ✅ | Source-text guard: `tabBarBackground` wired to `TabBarVeil`; `LinearGradient` + `colors`/`locations`/`opacity` per CON-54-05; both icon names present; `pointerEvents: "none"`; `position: "absolute"` present only inside the veil |
| ACC-02 | ✅ | ✅ | ✅ | Source-text guard: `marginBottom: 20`; the v1.1/SPEC-52 values still intact (`borderRadius: height / 2`, `marginHorizontal: 16`, `surfaceContainerHigh`, `elevation: 8`, `dip(0.85, 120)`, `dip(1, 180)`) |
| ACC-03 | ✅ | ✅ | ✅ | Source-text guard: no `expo-blur`, no `backdropFilter`, no `boxShadow`, no new import outside `expo-linear-gradient` / `@expo/vector-icons/...` / `react-native` |
| ACC-04 | ✅ | ✅ | ✅ | `jest` 0 failed, `lint` clean, `tsc` clean; `package.json` unchanged |

Subjective (reviewer-observed, Expo Go + web export):

- **ACC-S01:** the pill's edges read soft/blurred against the page — a visible gradient haze around the rounded ends, no hard cut-off line.
- **ACC-S02:** the bar sits visibly higher off the bottom edge than v1.1, and does not crowd the home indicator (iOS) or gesture bar (Android).
- **ACC-S03:** the bar never drifts, bounces, or animates on its own; taps still dip-and-ease; tabs remain tappable everywhere on the bar (nothing intercepts touches).
- **ACC-S04:** dark mode veil matches the pill tone (no seam between veil and pill); web export adds no console warnings.

## Deliverables

- **D-54-01 (`app/(tabs)/_layout.tsx` only):** `TabBarVeil` component per
  CON-54-04/05 + `tabBarBackground` wiring + `marginBottom: 20`. Nothing
  else in the file.
- **D-54-02 (new `utils/tabBarVeil.test.ts`):** ACC-01..03 across
  `android`/`ios`/`web`.
- **D-54-03 (user-run matrix):** ACC-S01..S04 (Expo Go + web export).
- **D-54-04 (docs):** `docs/savepoint.md` + `AGENTS.md` §3 entry per §1.8.

## Glossary

- **Veil:** the gradient + haze-glyph layer rendered behind the pill via `tabBarBackground`; the zero-dependency stand-in for a backdrop blur.
- **Haze glyphs:** low-opacity `MaterialCommunityIcons` blur marks that sell the blurred-edge look.
- **Higher float:** larger `marginBottom` between the pill and the screen edge.
- **Static:** no ambient/looping motion (press feedback is not ambient).

## References

- `app/(tabs)/_layout.tsx` (SPEC-52 v1.1 surface) · `app/login.tsx:11,285` and `app/register.tsx:9,194` (`LinearGradient` precedent, all platforms) · `package.json` (`expo-linear-gradient`, `@expo/vector-icons` present; `expo-blur` absent).
- `specs/52-floating-tab-bar.md` (owns the pill; v1.1 CON-52-15/16 + press easing preserved here) · `specs/32-tab-bar-label-visibility.md` (owns metrics/labels) · `specs/06-web-warning-cleanup.md` (web prop-warning parity — why `backdropFilter`/`boxShadow` are excluded).