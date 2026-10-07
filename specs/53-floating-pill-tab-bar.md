# Spec 53: Floating Pill Tab Bar

| Field | Value |
|---|---|
| ID | SPEC-53 |
| Title | Replace standard bottom tab bar with custom floating pill tab bar + separate circular action button |
| Status | **FINAL v1.0** (marked by user 2026-10-06 + `code this for me`; OD-02..OD-05 closed on the proposed defaults DD-01..DD-05 per owner waiver — no Vercel token sheet was supplied) |
| Owner | User (final authority) |
| Version | 1.0 |

> History: v0.1 DRAFT (full OD set open); v0.2 DRAFT amendment (OD-01 called: `+` → `/add-transaction`; Home FAB removal folded in as DEC-06/D-04). v1.0 FINAL: OD-02..OD-05 closed on DD-01..DD-05 below; DEC-05 error fallback deleted as over-engineering (single custom-bar code path). v1.1 DRAFT (§5, pending FINAL mark): floating pill restored as canonical — SPEC-58 centering folded in, SPEC-59/61 superseded for bar layout, SPEC-62 DRAFT retired (see §5.1). No new spec number per owner order + §1.14 one-home.
| Scope | `app/(tabs)/_layout.tsx` custom `tabBar` prop (floating rounded container, active-tab pill, separate circular `+`) + removal of the in-screen Home `+ Transaction` FAB (`app/(tabs)/index.tsx:315-321`); one new component file max |
| Non-goals | Tab destinations/order/titles/icons; `learning-detail` `href: null`; storage keys; `wallet-api` contract; sync; new dependencies; SPEC-32 label-fit geometry unless explicitly superseded below |
| Normative source | This file. `AGENTS.md §4` is a pointer only. File+symbol cites are normative; `:line` numbers are hints only. |

## Terminology (RFC 2119)

The keywords **MUST**, **MUST NOT**, **SHOULD**, and **MAY** in this spec are to be interpreted as described in RFC 2119. Informative prose (examples, "today", "currently") is non-normative unless restated as a requirement. "Vercel reference" means the live Vercel deployment the request cites as the desired look; no screenshot or token sheet for it exists in-tree, so parity with it is non-normative until the user supplies the tokens in `DEC-*`.

## 1. Context

### 1.1 Problem

`localhost:8081` renders the standard expo-router bottom tab bar: full-width `tabBarStyle` (`app/(tabs)/_layout.tsx:18-26` — `surface` background, top border, `height`/`paddingTop`/`paddingBottom` from `getTabBarMetrics(insets.bottom)` per SPEC-32) with four tabs (Home `home-variant`, Reports `chart-bar`, Learning `school`, Settings `cog`; `learning-detail` hidden via `href: null`).

The request is a presentation refactor of that bar only:

- a floating rounded container with soft shadows (detached from the screen edges, not a full-width top-bordered strip);
- an active-tab indicator pill (soft blue highlight behind/beneath the active tab);
- a separate floating circular `+` button on the right side;
- end state visually matches the Vercel live deployment.

### 1.2 Evidence (read-only, 2026-10-06)

- `app/(tabs)/_layout.tsx:1-77` uses `Tabs screenOptions` + per-screen `tabBarIcon`; there is **no** `tabBar` prop and no custom tab component anywhere in-tree (`components/` has 15 files, none tab-related; grep `tabBar|Floating|pill|CustomTab` finds only SPEC-32 geometry, category pills, and dues FAB).
- SPEC-32 (`specs/32-tab-bar-label-visibility.md`) owns the current geometry: `utils/tabBarMetrics.ts` (`TAB_BAR_CONTENT_HEIGHT = 68`, `height = 68 + insets.bottom`) + `_layout.tsx` destructuring. Any custom bar supersedes or reuses that geometry — it MUST say which (see `DEC-04`, `CON-08`).
- In-screen primary action today: `app/(tabs)/index.tsx:315-321` renders a rectangular `FAB` (`icon="plus"`, `label="Transaction"`, `router.push("/add-transaction")`) absolutely positioned over the Home body. Per user call (v0.2) this FAB is DELETED and the tab bar's circular `+` becomes the sole primary action trigger (same destination) — see DEC-06.
- v0.2 user calls locked: `+` destination = `/add-transaction` (OD-01 closed); container background = light (theme surface family — exact token still TBD in OD-02). Still unknown: pill/container radii, shadow values, pill highlight token, labels, SPEC-32 disposition, web layout.

### 1.3 Decisions (all called — FINAL)

- **OD-01 — `+` destination: CALLED (v0.2).** Destination is `/add-transaction` (the deleted Home FAB's route). The button lives in the tab bar, so it is visible on every tab route including `learning-detail` (same presence as today's standard bar) — no per-screen exception.
- **OD-02 — Visual tokens: CLOSED on defaults DD-01/DD-02 (v1.0, owner waiver).** **DD-01 container:** light `theme.colors.surface` background, `borderRadius: 28`, side margins `16`, `12` above the bottom safe-area inset, soft shadow `elevation: 8` / iOS `shadowOpacity: 0.12` + `shadowRadius: 12` + `shadowOffset 0×4` / web `boxShadow: 0 8px 24px rgba(0,0,0,0.12)`. **DD-02 pill:** `theme.colors.primaryContainer` background, `borderRadius: 20`, icon+label in `theme.colors.primary`, inactive tabs in `theme.colors.outline`.
- **OD-03 — Labels: CLOSED (v1.0, default DD-03).** Labels kept (`fontSize: 12`, `fontWeight: 600`, always visible); SPEC-32 intact.
- **OD-04 — SPEC-32 fate: CLOSED (v1.0, default DD-04).** `getTabBarMetrics` is reused by the new component for its bottom offset; `app/(tabs)/_layout.tsx`'s SPEC-32 wiring is retained untouched (its suite stays green); visible geometry is owned by the component. No file deleted.
- **OD-05 — Web layout: CLOSED (v1.0, default DD-05).** Same floating bar on web, centered with `maxWidth: 560`.
- **OD-03 — Labels: CLOSED (v1.0, default DD-03).** Labels kept (`fontSize: 12`, `fontWeight: 600`, always visible); SPEC-32 intact.
- **OD-04 — SPEC-32 fate: CLOSED (v1.0, default DD-04).** `getTabBarMetrics` is reused by the new component for its bottom offset; `app/(tabs)/_layout.tsx`'s SPEC-32 wiring is retained untouched (its suite stays green); visible geometry is owned by the component. No file deleted.
- **OD-05 — Web layout: CLOSED (v1.0, default DD-05).** Same floating bar on web, centered with `maxWidth: 560`.

## 2. Constraints (normative)

- **CON-01 — Bare-minimum (§1.11).** Only `D-*` files MAY change. No tab destination/order/title/icon change, no `learning-detail` change, no Home body change apart from the FAB deletion (D-04).
- **CON-02 — No new dependencies (§1.12).** Reuse `expo-router` `Tabs` `tabBar` prop, `react-native-paper` theme (+ `FAB`/`IconButton` if the circular `+` builds on them), `MaterialCommunityIcons`, `react-native-safe-area-context` (already a dep). No new npm packages, fonts, or native modules.
- **CON-03 — Cross-platform (§1.5).** The custom bar MUST work on Android + iOS + Web via `Platform.OS`/`Platform.select` branches only. MUST NOT statically import a native-only module at file top level; web MUST NOT use `NativeModules`/native-only APIs.
- **CON-04 — Vercel-deployable + Expo Go safe (§1.6/§1.7).** `expo export --platform web` MUST stay clean (shadows via `Platform.select`: `elevation` native + `boxShadow` web, per SPEC-06 precedent); Expo Go MUST NOT red-box on import; unavailable features degrade with an in-app fallback, never a crash.
- **CON-05 — No contract break (§1.4).** Storage keys (`user_{id}_*`), `wallet-api` contract, AsyncStorage shapes, navigation routes, and native deps MUST stay unchanged. Route names used by the bar MUST be the existing ones.
- **CON-06 — TDD cross-platform (§1.10).** `jest` parameterized by `Platform.OS` (`android`/`ios`/`web` via mock) for machine-checkable logic + user-run manual checks in Expo Go and `expo export --platform web` for rendered visuals jest cannot prove.
- **CON-07 — One home (§1.14).** SPEC-32 (geometry), SPEC-06 (shadow/`boxShadow` web precedent), SPEC-17 (FAB styling precedent) are cross-referenced, never re-normed. No duplicate tab-bar spec/slice elsewhere.
- **CON-08 — SPEC-32 disposition.** The spec MUST state in `DEC-04` whether `utils/tabBarMetrics.ts` + its test are reused, kept as fallback, or removed — and `D-*` MUST name every touched file. Silent drift (leaving the import wired to a dead style) is forbidden.
- **CON-09 — Ordering.** `D-01`..`D-05` land only after `D-00` (satisfied — FINAL marked 2026-10-06).

## 3. Goal

### 3.1 Decisions (FINAL)

- **DEC-01 (Component home, draft).** New `components/FloatingTabBar.tsx` (single new file max) receiving the `Tabs` `tabBar` props (`state`, `descriptors`, `navigation`); `app/(tabs)/_layout.tsx` passes it via the `tabBar` prop. No other new files/helpers.
- **DEC-02 (Container, draft — tokens TBD per OD-02).** Floating rounded container: theme surface background, `borderRadius` ≥ pill radius, horizontal margins + bottom offset above `insets.bottom`, soft shadow (`elevation` native / `boxShadow` web). Full-width strip + top border from the current `tabBarStyle` is gone.
- **DEC-03 (Active pill + action button, draft — tokens TBD per OD-02).** Active tab gets a soft-blue pill highlight (proposed token: `theme.colors.primaryContainer`, text/icon `theme.colors.primary` or `onPrimaryContainer` — user to confirm); inactive tabs use the current inactive tint. A separate floating circular `+` button sits to the right of the container and routes to `/add-transaction` (OD-01 called v0.2 — the deleted Home FAB's route, now the sole primary action).
- **DEC-04 (SPEC-32 fate, draft — confirm per OD-04).** Proposed: `getTabBarMetrics(insets.bottom)` continues to supply the container's height/bottom offset (geometry reused, style keys re-mapped to the floating container); `utils/tabBarMetrics.test.ts` is extended, not deleted.
- **DEC-05 (Fallback, draft).** If the custom bar ever fails to render, `Tabs` MUST fall back to the current standard bar (today's `_layout.tsx` output) rather than rendering nothing.
- **DEC-06 (Home FAB removal, called v0.2).** Delete the `FAB` block at `app/(tabs)/index.tsx:315-321` (`icon="plus"`, `label="Transaction"`) entirely; nothing else in the file changes. After removal the tab bar `+` is the only `add-transaction` entry point from Home.

### 3.2 Interaction matrix

| # | State | Behavior |
|---|---|---|
| 1 | Any tab focused | Its icon+label sits inside the soft-blue pill; others render inactive |
| 2 | Tap inactive tab | Standard `Tabs` navigation fires; pill moves; routes unchanged |
| 3 | Tap `+` | Navigates to `/add-transaction` (single route, all platforms; sole Home entry point after DEC-06) |
| 4 | `learning-detail` open | `+` visible (lives in the tab bar); pill selection follows focused route, no dead highlight |
| 5 | Bar render path | Single custom-bar path (no fallback; DEC-05 deleted in v1.0) |
| 6 | Home body | No in-screen FAB; content bottom padding re-claimed by the deletion (no overlap with the floating bar) |

### 3.3 Acceptance criteria

Objective (jest, `Platform.OS` = android/ios/web):

| ID | Check |
|---|---|
| ACC-01 | `_layout.tsx` sets the `Tabs` `tabBar` prop to the new component; no `tabBar` prop → fail |
| ACC-02 | Active route resolves to the pill-highlighted tab (unit-testable mapping, all three OS mocks) |
| ACC-03 | `+` button wires a single navigation to the `/add-transaction` route literal (source-text guard) |
| ACC-04 | Zero `calendar-year`-class invalid icon regressions: the four tab icon names are unchanged (`home-variant`, `chart-bar`, `school`, `cog`) |
| ACC-05 | No new dependency/import: no new entry in `package.json`, no native-only top-level import in the new component (source-text guards) |
| ACC-06 | `npm test` 0 failed; `npm run lint` clean; `npx tsc --noEmit` clean (user-run per §1.3) |
| ACC-07 | `app/(tabs)/index.tsx` contains zero `FAB`/`add-transaction` entry points (Home FAB block gone); the tab bar `+` is the sole trigger |

Subjective (reviewer-observed, Expo Go + web export):

- **ACC-S01:** Android/iOS Expo Go — bar floats (detached, rounded, soft shadow), active tab shows the soft-blue pill, `+` sits separate-circular on the right; taps navigate correctly on every tab.
- **ACC-S02:** Web export — same floating composition at mobile and desktop widths (per OD-05 call); no console icon/shadow warnings; `+` reachable by mouse + keyboard.
- **ACC-S03:** Reviewer confirms the bar matches the pinned DD-01/DD-02 tokens (no Vercel sheet was supplied, so token fidelity — not screenshot parity — governs); SPEC-32 labels still legible at default and large text sizes.

## 4. Deliverables

- **D-00:** FINAL marked 2026-10-06 (`code this for me`; OD-02..OD-05 closed on DD-01..DD-05 per owner waiver). Gates `D-01`..`D-05`.
- **D-01:** `components/FloatingTabBar.tsx` (new, single file): floating container + active pill + circular `+` → `/add-transaction`, theme-driven, `Platform.select` shadows, Expo-Go-safe imports only. Props typed as the fork's exact `BottomTabBarProps` via `import type` from `expo-router/build/react-navigation/bottom-tabs` (type-only, erased at runtime — the fork vendors its own core types, nominally incompatible with `@react-navigation/native`, and core's default event map resolves `emit` to `never`; tsc TS2322/TS7006-driven, user-pasted proof). Structure is a hook-free default-export shell returning `<FloatingTabBarThemed/>` — the fork plain-calls `tabBar()` (`BottomTabView.js:154`), so hooks in the shell have no fiber (user-pasted invalid-hook-call proof).
- **D-02:** `app/(tabs)/_layout.tsx`: wire navigator-level `tabBar={FloatingTabBar}` prop (NOT inside `screenOptions` — expo-router 57's per-screen options type rejects it, tsc TS2353) + import. SPEC-32 screenOptions/test wiring retained untouched.
- **D-03:** `utils/floatingTabBar.test.ts` (new): ACC-01..ACC-05 + ACC-07 × android/ios/web (mapping + source-text guards; rendered pixels covered by ACC-S01..S03, not jest). `utils/tabBarMetrics.test.ts` touched only if DEC-04 says so.
- **D-04:** `app/(tabs)/index.tsx`: delete the Home `FAB` block (`:315-321`) per DEC-06. Nothing else in the file.
- **D-05:** Journal — `docs/savepoint.md` + `AGENTS.md` §3 entry (incl. OD calls, token sheet, and SPEC-32 disposition).

## 5. v1.1 Amendment — Floating Pill, Centered, In-Flow (FINAL v1.1 per user call "final - code this for me" 2026-10-07)

### 5.1 Context (overlap reconciliation per §1.13/§1.14)

- User verdict chain on the same bar: floating wanted (v1.0) → "wala sa gitna ... flexible" (SPEC-58 centered it) → "pangit ... lutang" (SPEC-59 docked it) → "di natatakpan content" (SPEC-61 made it in-flow) → "dapat nga naka float" (SPEC-62 DRAFT). Standing end state: floating + centered/flexible + never covers content.
- Canonical home for tab-bar layout is this file. SPEC-58 (centering) is folded in; SPEC-59 (docked) and SPEC-61 (in-flow docked) are superseded for bar layout; SPEC-62 (DRAFT, never FINAL) is retired — its stopped half-state in the tree is completed under this amendment and its file is deleted per D-15. No new spec number per owner order.
- Working-tree note (2026-10-07): the stopped SPEC-62 run already applied the wrapper/row/pill hunks to `components/FloatingTabBar.tsx`; pending under this amendment: `+` `marginRight` removal, test-guard rewrite, SPEC-62 file deletion, journal.

### 5.2 Decisions (FINAL v1.1 — content fixed)

- **DEC-10 (wrapper, in-flow + gutters).** Outer `View`: zero `position`/`left`/`right`/`bottom`; `alignItems: "center"`, `paddingHorizontal: 16`, `paddingBottom: metrics.paddingBottom + 12`, transparent (no `backgroundColor` — screen bg shows through the gutters).
- **DEC-11 (inner row, centered-cap).** Middle `View`: `flexDirection: "row"`, `alignItems: "center"`, `width: "100%"`, `maxWidth: 560`.
- **DEC-12 (pill + `+`, verbatim v1.0 tokens).** Pill container `flex: 1` (`surface`, `borderRadius: 28` via `CONTAINER_RADIUS`, p8, DD-01 `Platform.select` shadows); tab mapping, labels 12/600, icons, `learning-detail` filter, `pressTab` unchanged; circular `+` keeps its single `router.push("/add-transaction")` with `marginLeft: 12` and zero `marginRight`. No new tokens.

### 5.3 Acceptance criteria (FINAL v1.1)

Objective (jest, `Platform.OS` = android/ios/web):

| ID | Check |
|---|---|
| ACC-11 | Floating + in-flow: source contains `maxWidth: 560` + `borderRadius: 28` (or `CONTAINER_RADIUS`) + `boxShadow` + exactly one `router.push("/add-transaction")`; contains zero `position:` + zero `"absolute"` + zero `bottom:` + zero `borderTopWidth` |
| ACC-12 | `npm test` 0 failed; `npm run lint` clean; `npx tsc --noEmit` clean (user-run per §1.3) |

Subjective (reviewer-observed, Expo Go + web export):

- **ACC-S05:** Phone + web desktop show the v1.0 floating look (detached rounded pill + separate `+`), centered on desktop / guttered on mobile.
- **ACC-S06:** Any list scrolled to end: last row fully readable, nothing hidden behind the bar, nothing sliding under it; short screens: bar floats above the bottom edge with a clear gap.

### 5.4 Deliverables (FINAL v1.1)

- **D-13 (`components/FloatingTabBar.tsx`):** finish alignment per DEC-10..DEC-12 — remove the leftover `marginRight: 8` on the `+`; verify wrapper/row/pill match (already in tree from the stopped run). Nothing else in the file.
- **D-14 (`utils/floatingTabBar.test.ts`):** rewrite the shell guards to ACC-11 × android/ios/web; all other guards retained.
- **D-15 (delete `specs/62-floating-tab-bar-in-flow.md`):** DRAFT never FINAL, content folded into this §5, zero references elsewhere — one-home restore.
- **D-16 (journal):** `docs/savepoint.md` + `AGENTS.md` §3 entry.

### 5.5 Terms (amendment-local)

- **Floating (in-flow):** detached rounded pill with gutters on all sides, laid out in navigator flow — looks floating, never overlays.
- **Superseded (layout only):** SPEC-59/61 no longer govern the bar; kept as history, not implemented further.

## 6. v1.2 Amendment — Taller floating bar (FINAL v1.2 per user call 2026-10-07: "SPEC-53 v1.2 FINAL, code this for me")

### 6.1 Context (evidence 2026-10-07)

- Phone screenshot (Expo Go, Home): the floating pill + separate `+` render, but the bar height reads too small ("super liit sa phone ng height").
- Reference mock (2nd photo): floating rounded pill (4 tabs, soft active highlight, comfortable height) + separate circular `+` — "like this dapat yung feature design". Current structure already matches (pill + highlight + separate `+`); only the vertical size is short.
- Proposed: pill container `paddingVertical: 8 → 12` + tab buttons `paddingVertical: 8 → 12` (≈ +8px bar height). Icons (22), labels (12/600), colors, `+` button, centering (`maxWidth: 560`), and in-flow positioning all untouched.

### 6.2 Constraints (FINAL v1.2)

- **CON-09 — Padding-only.** Only the two `paddingVertical` values in `components/FloatingTabBar.tsx` MAY change. Icons, labels, colors, pill radii, shadows, `+` button, centering, and in-flow shell MUST stay byte-identical. SPEC-32 geometry (standard-bar wiring) untouched. Cross-platform; `npm run lint` clean.

### 6.3 Goal (FINAL v1.2)

- **DEC-06:** Pill container `paddingVertical: 12`; tab `TouchableOpacity` `paddingVertical: 12`. Nothing else.

Objective (jest, `Platform.OS` = android/ios/web):

| ID | Check |
|---|---|
| ACC-12 | Pill container carries `paddingVertical: 12` and tab buttons carry `paddingVertical: 12`; icons `22`, label `12`, `maxWidth: 560`, `PILL_RADIUS` intact (source-text guards) |
| ACC-13 | `npm test` 0 failed; `npm run lint` clean; `npx tsc --noEmit` clean (user-run per §1.3) |

Subjective (reviewer-observed, Expo Go + web export):

- **ACC-S07:** Phone: bar visibly taller, proportions close to the reference mock; tabs + `+` tappable, no crowding, no overlap with list content. Desktop unchanged apart from the same +8px.

### 6.4 Deliverables (FINAL v1.2)

- **D-17 (`components/FloatingTabBar.tsx`):** two `paddingVertical` values per DEC-06. Nothing else in the file.
- **D-18 (`utils/floatingTabBar.test.ts`, extend):** ACC-12 guards × android/ios/web. No new test file.
- **D-19 (journal):** `docs/savepoint.md` + `AGENTS.md` §3 entry.

## 7. v1.3 Amendment — Fixed navy bar in both modes (FINAL v1.3 per user call 2026-10-07: "SPEC-53 v1.3 FINAL, code this for me")

### 7.1 Context (evidence 2026-10-07)

- Dark-mode phone screenshot: the pill follows `surface` (`#161B22` — near-black), while light mode shows white. User order: one consistent color in both modes, and not white even in light mode ("kung naka dark mode ganon din ang kulay ... kung hindi naka dark mode edi hindi puti") — read as the navy brand direction already approved for the toast (SPEC-05 §6).
- Theme pairs (`context/ThemeContext.tsx`): light `primary #1B3F7A` + `onPrimary #FFFFFF`; dark `primary #4A90D9` + `onPrimary #001F4D`. Active pill (`primaryContainer` + `primary` icon/label) stays legible on both navies, so it is untouched.

### 7.2 Constraints (FINAL v1.3)

- **CON-10 — Color-only.** Only bar-background + inactive icon/label colors in `components/FloatingTabBar.tsx` MAY change. Active pill, `+` button, padding (v1.2), centering, in-flow shell MUST stay byte-identical. Active/inactive hierarchy MUST survive in both modes via theme pairs (no hardcoded hex). Cross-platform; `npm run lint` clean.

### 7.3 Goal (FINAL v1.3)

- **DEC-07:** Bar container `backgroundColor: theme.colors.surface → theme.colors.primary` (navy in both modes). Inactive tab icon + label `theme.colors.outline → theme.colors.onPrimary` (the theme's own on-primary pair). Everything else untouched.

Objective (jest, `Platform.OS` = android/ios/web):

| ID | Check |
|---|---|
| ACC-14 | Bar container background is `theme.colors.primary` with zero `theme.colors.surface` on the bar shell; inactive icon/label use `onPrimary`; active pill (`primaryContainer` + `primary`) retained (source-text guards) |
| ACC-15 | `npm test` 0 failed; `npm run lint` clean; `npx tsc --noEmit` clean (user-run per §1.3) |

Subjective (reviewer-observed, Expo Go + web export):

- **ACC-S08:** Light + dark mode, phone + web: identical navy pill in both modes (never white, never black); active tab highlighted, inactive tabs legible, `+` unchanged.

### 7.4 Deliverables (FINAL v1.3)

- **D-20 (`components/FloatingTabBar.tsx`):** two color swaps per DEC-07. Nothing else in the file.
- **D-21 (`utils/floatingTabBar.test.ts`, extend):** ACC-14 guards × android/ios/web. No new test file.
- **D-22 (journal):** `docs/savepoint.md` + `AGENTS.md` §3 entry.

## 8. v1.4 Amendment — Surface bar + transparent active (FINAL v1.4 per user call 2026-10-07: "final / code this for me")

### 8.1 Context (evidence 2026-10-07)

- v1.3 made the bar `primary` in both modes (light `#1B3F7A` navy, dark `#4A90D9` blue). User verdict with 2 phone screenshots (light Home, dark Settings): "bat mo naman iniba color ng navigation ... yung white kasi sa baba yung dapat baguhin if naging dark mode ... white lang background tas parang transparent lang pag nililipat pero may color yung icon pag pinipindot".
- Read as: revert the v1.3 navy direction. Bar background follows `surface` (white light / `#161B22` dark); active tab has no pill fill (`transparent`), only its icon+label take the `primary` color; inactive tabs are neutral gray. Confirmed via 3-way question 2026-10-07: (1) surface White/Dark — yes; (2) transparent + colored icon — yes; (3) `+` stays `primary` — keep.
- Canonical home for bar color is this file per §1.14. v1.3 §7 is superseded for colors only (layout/height/in-flow/`+`/SPEC-32 untouched). No new spec number.

### 8.2 Constraints (FINAL v1.4)

- **CON-11 — Color-only.** Only bar-background + active-pill + inactive icon/label tokens in `components/FloatingTabBar.tsx` MAY change. Padding (v1.2), `CONTAINER_RADIUS`/`PILL_RADIUS`, `maxWidth: 560`, in-flow shell, `+` button (`containerColor primary` / `iconColor onPrimary` / `marginLeft: 12`), icons, labels, `pressTab`, `learning-detail` filter, SPEC-32 wiring MUST stay byte-identical. No hardcoded hex; theme pairs only. Cross-platform; `npm run lint` clean.

### 8.3 Goal (FINAL v1.4)

- **DEC-08:** Bar container `backgroundColor: theme.colors.primary → theme.colors.surface` (white light, dark surface dark). Active pill `focused ? theme.colors.primaryContainer : "transparent" → "transparent"` (no fill in either state). Inactive icon + label `theme.colors.onPrimary → theme.colors.onSurfaceVariant` (readable gray on white and on dark). Focused icon + label stay `theme.colors.primary`. `+` button untouched.

Objective (jest, `Platform.OS` = android/ios/web):

| ID | Check |
|---|---|
| ACC-16 | Bar shell carries `backgroundColor: theme.colors.surface` with zero `backgroundColor: theme.colors.primary`; pill background is `"transparent"` with zero `theme.colors.primaryContainer`; inactive icon/label use `theme.colors.onSurfaceVariant`; focused icon/label retain `theme.colors.primary`; `+` keeps `containerColor={theme.colors.primary}` + `iconColor={theme.colors.onPrimary}` (source-text guards) |
| ACC-17 | `npm test` 0 failed; `npm run lint` clean; `npx tsc --noEmit` clean (user-run per §1.3) |

Subjective (reviewer-observed, Expo Go + web export):

- **ACC-S09:** Light mode phone + web: white bar, active tab icon+label navy with no pill fill, inactive tabs gray. Dark mode: dark-surface bar, active tab icon+label light-blue with no fill, inactive tabs gray. `+` unchanged (navy/blue circle). No overlay, no crowding.

### 8.4 Deliverables (FINAL v1.4)

- **D-23 (`components/FloatingTabBar.tsx`):** color swaps per DEC-08 only (1 container line + 1 pill line + 2 inactive lines). Nothing else in the file.
- **D-24 (`utils/floatingTabBar.test.ts`, extend):** ACC-16 guards × android/ios/web. No new test file.
- **D-25 (journal):** `docs/savepoint.md` + `AGENTS.md` §3 entry.

## Glossary

| Term | Meaning |
|---|---|
| Floating container | Detached rounded bar replacing the full-width top-bordered strip |
| Active pill | Soft-blue highlight behind the focused tab (token pinned at FINAL) |
| Circular `+` | Separate floating action button right of the container → `/add-transaction` (OD-01 called v0.2) |
| Home FAB (removed) | Deleted `app/(tabs)/index.tsx:315-321` rectangular `+ Transaction` button (DEC-06) |
| Vercel reference | User-supplied screenshot/tokens of the live deployment; non-normative until attached at FINAL |
| Fallback | Today's standard bar, rendered only if the custom bar fails (DEC-05) |

## References

- `app/(tabs)/_layout.tsx:1-77` (current standard bar under change; `:18-26` style, `:33-74` tabs)
- `app/(tabs)/index.tsx:315-321` (Home FAB under deletion, DEC-06)
- `utils/tabBarMetrics.ts` + `utils/tabBarMetrics.test.ts` (SPEC-32 geometry — disposition per DEC-04)
- `specs/32-tab-bar-label-visibility.md` (geometry owner), `specs/06-web-warning-cleanup.md` (`boxShadow` precedent), `specs/17-fab-button-styling.md` (FAB precedent)
- `vercel.json` (web build: `expo export --platform web` → `dist`)
- `AGENTS.md §1` (spec-first, no CLI, invariants, TDD, bare-minimum, docs)
