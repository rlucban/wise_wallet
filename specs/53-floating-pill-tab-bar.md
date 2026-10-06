# Spec 53: Floating Pill Tab Bar

| Field | Value |
|---|---|
| ID | SPEC-53 |
| Title | Replace standard bottom tab bar with custom floating pill tab bar + separate circular action button |
| Status | **FINAL v1.0** (marked by user 2026-10-06 + `code this for me`; OD-02..OD-05 closed on the proposed defaults DD-01..DD-05 per owner waiver — no Vercel token sheet was supplied) |
| Owner | User (final authority) |
| Version | 1.0 |

> History: v0.1 DRAFT (full OD set open); v0.2 DRAFT amendment (OD-01 called: `+` → `/add-transaction`; Home FAB removal folded in as DEC-06/D-04). v1.0 FINAL: OD-02..OD-05 closed on DD-01..DD-05 below; DEC-05 error fallback deleted as over-engineering (single custom-bar code path).
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
