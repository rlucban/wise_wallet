# SPEC-52 — Floating Bottom Tab Bar (iOS-like Pill)

| Field | Value |
|---|---|
| ID | SPEC-52 |
| Title | Floating iOS-like bottom tab bar (detached pill, in-flow, `tabBarStyle`-only) |
| Status | **FINAL** v0.1 (marked by user 2026-10-07; implementable per AGENTS.md §1.1) |
| Owner | User (final authority) |
| Version | v1.1 FINAL — v0.1 base + v1.1 amendment (shadow, press, dark lift, capsule), both FINAL per user call 2026-10-07 |
| Scope | `app/(tabs)/_layout.tsx` `tabBarStyle` object only (+ `Platform` import) + one source-text guard test + journal |
| Non-goals | Blur/translucency; custom tab-bar component; tab titles, icons, order, label typography; label metrics/typography (SPEC-32 owned); any screen body; new deps/routes/storage/API |
| Normative source | This file (once marked FINAL). File+symbol cites are normative; `:line` numbers are hints only. |

> History: v0.1 DRAFT 2026-10-07 from plan-fix run `20261007-session.md`
> (Track B, Option A). No normative content before FINAL mark.
> FINAL 2026-10-07 per user call ("Final") — content unchanged.

## Terminology (RFC 2119)

The keywords **MUST**, **MUST NOT**, **SHOULD**, and **MAY** in this spec are
to be interpreted as described in RFC 2119. Informative prose (examples,
"today", "currently") is non-normative unless restated as a requirement.

## Context

### Problem

In one sentence: **the bottom tab bar is a full-bleed edge-to-edge
rectangle, and the request is an iOS-like floating pill that stays at the
bottom — without re-breaking label visibility (SPEC-32), safe-area insets,
or web parity.**

### Evidence (verified read-only, this tree)

- `app/(tabs)/_layout.tsx:1-31` — full-bleed `tabBarStyle`
  (`backgroundColor: surface`, `borderTopWidth: 1`,
  `borderTopColor: surfaceVariant`, `elevation: 0`, metric-driven
  `height`/`paddingTop`/`paddingBottom`).
- `utils/tabBarMetrics.ts:89-106` — `height = 68 + insets.bottom`,
  `paddingBottom = insets.bottom`; the fits invariant (`usableHeight 54 ≥
  required 43`) is what keeps labels visible (SPEC-32).
- SPEC-32 §1.2c — `tabBarStyle` is applied last and wins over the library's
  own inset handling; any new `tabBarStyle` key composes the same way.
- Overlap declared (§1.14): SPEC-32 CON-06 freezes `borderTopWidth`,
  `borderTopColor`, and `elevation`. A pill has no top border and needs a
  float shadow, so this spec **amends SPEC-32 CON-06 in exactly the three
  values named in CON-52-02**; every other SPEC-32 constraint stays in force
  and this spec governs only the amended values.

### Notes (informative)

- No blur/translucency: that needs a native blur module (Expo Go + new-dep
  risk). The pill is solid `theme.colors.surface`, so dark mode adapts free.
- Web keeps its side-by-icon label layout (SPEC-32 DEC-05, untouched); only
  the bar container becomes a pill.

## Constraints (normative)

- **CON-52-01 — Bare-minimum diff (§1.11).** Only the `tabBarStyle` object
  in `app/(tabs)/_layout.tsx` (+ the `Platform` import from `react-native`)
  MAY change, plus the files named in D-*. No other line in the file.
- **CON-52-02 — SPEC-32 preserved except the named amendment.** Metrics file
  untouched; `height`/`paddingTop`/`paddingBottom` destructuring intact;
  fits invariant holds; titles, icons, order, `learning-detail href: null`,
  `tabBarLabelStyle`, tints, `backgroundColor` value, no font-scale lock, no
  nested `SafeAreaProvider`, web label layout — all unchanged. Amended only:
  `borderTopWidth: 1 → 0`, `borderTopColor` removed, `elevation: 0 →
  platform shadow` exactly per CON-52-04.
- **CON-52-03 — In-flow only.** The style MUST NOT set `position: "absolute"`.
  An overlaying bar can cover the bottom of scrollable screens; an in-flow
  pill with external margins cannot. Float look, zero overlap risk.
- **CON-52-04 — Exact geometry (tunable pre-FINAL only).** `marginHorizontal:
  16`, `marginBottom: 12`, `borderRadius: 24`; iOS `shadowColor: "#000"`,
  `shadowOffset: { width: 0, height: 4 }`, `shadowOpacity: 0.15`,
  `shadowRadius: 12`; Android `elevation: 4`; web emits no shadow props at
  all (SPEC-06 parity — flat pill on web). Selected via `Platform.select`
  with a `default: {}` branch. After the FINAL mark these numbers are exact.
- **CON-52-05 — No new dependencies (§1.12).** `Platform` from
  `react-native` only (not a native-only module). No blur, no extra package.
- **CON-52-06 — Expo Go safe (§1.7) / Vercel-deployable (§1.6).** No new
  native import, no Node APIs, no secrets; `expo export --platform web`
  MUST still succeed with no new console warnings.
- **CON-52-07 — TDD with cross-platform coverage (§1.10).** Source-text
  guards (repo precedent — screens cannot render under `roots: utils`) +
  `Platform.OS`-parameterized cases + user-run Expo Go + web-export matrix.
  No platform-only behavior exists beyond the shadow selection, which has
  its own CON + ACC + D.

## Goal

### Interaction matrix

| Platform | Bar container | Labels/icons/taps | Shadow | Safe area |
|---|---|---|---|---|
| Android | detached pill, margins + radius | unchanged, taps navigate as today | `elevation: 4` | inset preserved via SPEC-32 padding; 12px gap above gesture bar |
| iOS | detached pill, margins + radius | unchanged | iOS shadow props | pill clears the home indicator via the same inset math |
| Web | detached pill, margins + radius | side-by-icon layout unchanged | none (flat) | `insets.bottom = 0`; geometry identical otherwise |

### Decisions

- **DEC-52-01 (RECOMMENDED):** in-flow margins instead of `position:
  absolute` — the float look without any chance of covering screen content
  (rejected alternative: absolute + screen padding compensation — more files,
  per-screen risk, for no visual gain worth it).
- **DEC-52-02 (RECOMMENDED):** solid theme surface instead of blur —
  dark-mode-correct with zero native risk (rejected: blur module).
- **DEC-52-03 (RECOMMENDED):** web gets no shadow — SPEC-06 already fought
  web shadow warnings; a flat pill is the parity-safe choice (rejected:
  `boxShadow` string — warning risk for zero depth-cue need on desktop).
- **DEC-52-04 (PROPOSED NUMBERS):** 16 / 12 / 24 / shadow values above are
  starting points the user MAY adjust before the FINAL mark; structure
  (margins + radius + platform shadow, in-flow) is frozen.

### Acceptance

Objective (machine-checkable):

| ID | Android | iOS | Web | Check |
|----|---------|-----|-----|-------|
| ACC-01 | ✅ | ✅ | ✅ | Source-text guard: `tabBarStyle` contains the exact CON-52-04 values, no `position: "absolute"`, `Platform.select` with ios/android/default, and the SPEC-32 destructuring + all frozen values intact |
| ACC-02 | ✅ | ✅ | ✅ | Existing `tabBarMetrics` suite green — fits invariant unbroken by the pill |
| ACC-03 | ✅ | ✅ | ✅ | Web branch of the select emits zero shadow props (SPEC-06 parity guard) |
| ACC-04 | ✅ | ✅ | ✅ | `jest` 0 failed, `lint` clean, `tsc` clean; no dep/route/storage change |

Subjective (reviewer-observed, Expo Go + web export):

- **ACC-S01:** pill is visibly detached (gap on left, right, bottom) on all four tabs; bar stays at the bottom in every orientation.
- **ACC-S02:** scrolling Settings/Reports to the very bottom leaves the last element fully visible above the pill (no overlap, CON-52-03 proof).
- **ACC-S03:** dark mode pill uses the dark surface; labels still fully visible (SPEC-32 no-regression); home-indicator clearance on notched iOS.
- **ACC-S04:** web export shows the pill with no new console warnings.

## Deliverables

- **D-52-01 (`app/(tabs)/_layout.tsx`, style only):** exact CON-52-04
  `tabBarStyle` + `Platform` import. Nothing else in the file.
- **D-52-02 (new `utils/tabBarFloat.test.ts`):** ACC-01..03 source-text +
  `Platform.OS` (`android`/`ios`/`web`) guards. Only new file allowed.
- **D-52-03 (user-run matrix):** ACC-S01..S04 (Expo Go + web export).
- **D-52-04 (docs):** `docs/savepoint.md` + `AGENTS.md` §3 entry per §1.8
  (incl. the SPEC-32 CON-06 amendment note). Status flips to FINAL only on
  explicit user call.

## Glossary

- **Pill:** detached rounded bar (margins + `borderRadius`), vs full-bleed edge-to-edge rect.
- **In-flow:** bar occupies layout space (margins push siblings); never overlays screen content.
- **CON-06 amendment:** the only SPEC-32 values this spec changes (border + elevation); everything else in SPEC-32 stays normative.

## References

- `app/(tabs)/_layout.tsx:1-31` (style under change) · `utils/tabBarMetrics.ts:89-106` (untouched — cited to forbid touching).
- `specs/32-tab-bar-label-visibility.md` (owns metrics/labels; CON-06 amended here in three named values — §1.14 overlap declared, SPEC-52 governs the amended values) · `specs/06-web-warning-cleanup.md` (web shadow-warning parity).

---

## Amendment v1.1 — Deeper shadow + eased press + dark lift + capsule (FINAL 2026-10-07)

> v1.0 above stays FINAL and untouched. FINAL 2026-10-07 per user call
> ("Final -> autopilot -> DONE"); content unchanged at the flip.

### Problem

In one sentence: **the v1.0 pill reads flat and taps feel dead — it needs a
deeper drop shadow and an eased press-down on the tab icons, without
re-breaking SPEC-32, SPEC-06 (web warnings), or Expo Go safety.**

### Constraints (delta, normative)

- **CON-52-11 — Shadow values superseded (exact, tunable pre-FINAL only).**
  iOS `shadowOpacity: 0.15 → 0.25`, `shadowRadius: 12 → 16`,
  `shadowOffset.height: 4 → 6`; Android `elevation: 4 → 8`. Web stays flat
  (CON-52-04 unchanged). All other v1.0 geometry (16/12/24) frozen.
- **CON-52-15 — Dark-mode pill color (exact).** `tabBarStyle.backgroundColor`
  MUST be `theme.dark ? theme.colors.surfaceContainerHigh : theme.colors.surface`
  — a tonal lift, no tint change. `surfaceContainerHigh` ships in the MD3
  base themes (the app spreads `MD3DarkTheme.colors`, `context/ThemeContext.tsx:51-64`),
  so no theme edit is needed. `theme.dark` is the MD3 boolean flag
  (`MD3Theme.dark`), correct for both the custom dark theme and any default;
  no `isDarkMode` from context is needed and `ThemeContext.tsx` MUST NOT be
  edited. Active/inactive tints, label color, and the light-mode value MUST
  remain exactly as v1.0/SPEC-32 froze them (CON-52-02).
  Tonal rationale (informative): dark pill was `surface` `#161B22` against
  `background` `#0D1117` — a 1.06:1 lift, visually flat; `surfaceContainerHigh`
  raises it one tonal step and keeps M3 elevation semantics.
- **CON-52-12 — Press animation shape.** Inline `tabBarButton` in
  `app/(tabs)/_layout.tsx` only (no new file, §1.11): icon scales 1 → 0.85
  on press-in (~120 ms) and eases back on press-out (~180 ms,
  `Easing.out(Easing.quad)`). `Animated` + `Easing` import from
  `react-native` only (no new dep, §1.12). Tints, labels, order, badges,
  accessibility props, and navigation behavior MUST pass through unchanged.
- **CON-52-13 — JS driver, everywhere.** `useNativeDriver: false`
  explicitly: a 150 ms scale pulse is cheap on the JS thread, and the native
  driver logs a fallback WARN on web (SPEC-06) — the exact warning class
  this repo already cleaned. No `Platform` branch for the animation itself.
- **CON-52-16 — True capsule edge (exact).** `tabBarStyle.borderRadius`
  MUST be `height / 2`, computed from the already-destructured SPEC-32
  `height` — replacing the v1.0 constant `24`. Rationale: v1.0's 24 on a
  68px bar reads as a rounded rectangle, not a pill; half the height is the
  only radius that is a perfect capsule at every inset (34 at `insets.bottom`
  0, 46 at 24, 51 at 34), and it adapts with no second constant to keep in
  sync. `marginHorizontal: 16`, `marginBottom: 12`, and CON-52-15's
  background MUST NOT change. Label/icon alignment is unchanged (the library
  centers content in the bar), so no label metrics change (SPEC-32 intact).
- **CON-52-14 — Scope.** Only the `tabBarStyle` shadow values + the
  `tabBarStyle.backgroundColor` + `tabBarStyle.borderRadius` + the
  `tabBarButton` component + its `screenOptions` wiring MAY change, plus
  D-52-12/D-52-13 files. Metrics, fits, labels, tints — still frozen per
  CON-52-02.

### Decisions

- **DEC-52-05 (RECOMMENDED):** one inline `tabBarButton` wrapper over
  per-tab icon renderers (4× duplication) or CSS transitions (web-only —
  §1.10 forbids platform-only behavior without full CON/ACC/D).
- **DEC-52-06 (RECOMMENDED):** JS driver over native (warning-free on all
  three platforms; DEC-52-03's reasoning extended to motion).
- **DEC-52-07 (RECOMMENDED — user call "A"):** dark pill = tonal
  `surfaceContainerHigh` (CON-52-15) over a brand-color pill; rejected
  `primary` because active icons are already `primary` (would force a SPEC-32
  tint amendment and read as one flat mass).

### Acceptance

Objective (machine-checkable):

| ID | Android | iOS | Web | Check |
|----|---------|-----|-----|-------|
| ACC-11 | ✅ | ✅ | ✅ | Source-text guard: exact v1.1 shadow values present; `tabBarButton` + `Animated` + `Easing` + `useNativeDriver: false` present; tints/labels/metrics strings intact |
| ACC-12 | ✅ | ✅ | ✅ | Source-text guard: `theme.dark ? theme.colors.surfaceContainerHigh : theme.colors.surface` present as the only background value; `ThemeContext.tsx` byte-identical; no new `isDarkMode` import |
| ACC-13 | ✅ | ✅ | ✅ | Source-text guard: `borderRadius: height / 2` present and the literal `borderRadius: 24` absent; capsule math asserted in `utils/tabBarFloat.test.ts` for `insetsBottom` 0/24/34 → 34/46/51 |
| ACC-14 | ✅ | ✅ | ✅ | `jest` 0 failed, `lint` clean, `tsc` clean; no dep/route/storage change |

Subjective (reviewer-observed, Expo Go + web export):

- **ACC-S11:** tapping any tab visibly dips (press) and eases back on release — same feel on Android, iOS, web click.
- **ACC-S12:** pill shadow is visibly deeper than v1.0 in light and dark; no new console warnings on web.

- **ACC-S13:** dark mode — pill is visibly lifted off the page background
  (no longer flat `#161B22`), tints and labels unchanged; light mode is
  visually identical to v1.0 apart from the rounder ends.
- **ACC-S14:** the pill's left/right ends are true semicircles at default and
  large font scale, on Android, iOS, and web; no corner looks clipped or
  over-rounded; icons and labels still centered and fully visible.

### Deliverables

- **D-52-11 (`app/(tabs)/_layout.tsx` only):** v1.1 shadow values + dark-mode
  tonal background (CON-52-15) + capsule `borderRadius: height / 2`
  (CON-52-16) + inline `tabBarButton` (Animated scale, props/a11y
  passthrough) wired in `screenOptions`. Nothing else in the file.
- **D-52-12 (`utils/tabBarFloat.test.ts`, extend):** ACC-11 across
  `android`/`ios`/`web`.
- **D-52-13 (docs):** `docs/savepoint.md` + `AGENTS.md` §3 entry per §1.8.
