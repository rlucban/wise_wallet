# Spec 59: Docked Full-Width Tab Bar (Replace Floating Pill)

| Field | Value |
|---|---|
| ID | SPEC-59 |
| Title | Replace the floating pill tab bar with a docked full-width bar |
| Status | **FINAL v1.0** (OD-01..OD-03 called by user 2026-10-07 — "SPEC-59 OD: b/a/full-bleed") |
| Owner | User (final authority) |
| Version | 0.1 |
| Scope | Bottom tab bar presentation only (`components/FloatingTabBar.tsx` replace-or-rewrite + `_layout.tsx` wiring + tab-bar tests) |
| Non-goals | Tab destinations/order/titles/icons; `learning-detail` `href: null`; `+` destination (`/add-transaction` unchanged); storage keys; `wallet-api` contract; sync; new dependencies |

> History: v0.1 DRAFT (2026-10-07) — user call "A" on the SPEC-58 follow-up ("pangit parang naka lutang ... dapat hindi"): wants Option A docked full-width, not floating. v1.0 FINAL (2026-10-07) — OD-01 called (b), OD-02 called (a), OD-03 called (full-bleed) per user "SPEC-59 OD: b/a/full-bleed". SPEC-53 (floating pill) + SPEC-58 (floating centering) are SUPERSEDED for the bar layout only (tokens/tests cited, never re-normed).

## Terminology (RFC 2119)

The keywords **MUST**, **MUST NOT**, **SHOULD**, and **MAY** in this spec are to be interpreted as described in RFC 2119. Informative prose (examples, "today", "currently") is non-normative unless restated as a requirement.

## 1. Context

### 1.1 Problem

SPEC-53 built a floating pill + separate circular `+`; SPEC-58 centered it on wide web (verified centered in the 2026-10-07 Reports screenshot). User verdict: the floating look is ugly ("pangit parang naka lutang") and wants it not floating — Option A: docked full-width bar attached to the bottom edge.

### 1.2 Evidence (read-only, 2026-10-07)

- `components/FloatingTabBar.tsx` (post-SPEC-58): outer absolute centering shell (`left: 0, right: 0`) + inner `maxWidth: 560` row + pill container (r28, surface, DD-01 shadows) + separate circular `+`.
- `app/(tabs)/_layout.tsx`: `tabBar={FloatingTabBar}` + retained SPEC-32 `tabBarStyle` keys (currently shadowed by the custom bar).
- Precedent for docked geometry: SPEC-32 `utils/tabBarMetrics.ts` (`height = 68 + insets.bottom`) — reusable for a docked bar.

### 1.3 Decisions (all called — FINAL)

- **OD-01 — `+` placement when docked: CALLED (b).** Keep the separate circular `+` button docked right of the tab row (same component, same `router.push("/add-transaction")`), now sitting inside the docked bar instead of beside a floating pill.
- **OD-02 — Active indicator when docked: CALLED (a).** Keep the soft pill (`theme.colors.primaryContainer` background r20, icon+label `theme.colors.primary`; inactive `theme.colors.outline`) — SPEC-53 DD-02 tokens unchanged, only the container around it docks.
- **OD-03 — Docked tokens: CALLED (full-bleed).** Full-bleed `theme.colors.surface` + top border (pre-SPEC-53 standard-bar style: `borderTopWidth: 1`, `borderTopColor: theme.colors.surfaceVariant`), SPEC-32 height (`getTabBarMetrics(insets.bottom)`). No `maxWidth` cap, no detached margins, no floating shadow gap.

## 2. Constraints (normative)

- **CON-01 — Bare-minimum (§1.11).** Only `D-*` files MAY change once FINAL. No destination/order/title/icon, storage, API, sync, or route change.
- **CON-02 — No new dependencies (§1.12).** Reuse `Tabs` `tabBar` prop, Paper theme, `MaterialCommunityIcons`, `getTabBarMetrics`. No new packages/fonts/native modules.
- **CON-03 — Cross-platform (§1.5).** Android + iOS + Web via `Platform.select` only; no native-only top-level import; web no `NativeModules`.
- **CON-04 — Vercel-deployable + Expo Go safe (§1.6/§1.7).** Web export clean; no red-box on import.
- **CON-05 — No contract break (§1.4).** Storage keys, API contract, routes unchanged.
- **CON-06 — TDD cross-platform (§1.10).** jest × android/ios/web + user-run Expo Go + web-export checks.
- **CON-07 — One home (§1.14).** SPEC-53/58 (floating), SPEC-32 (geometry), SPEC-06 (shadows) cross-referenced, never re-normed. At FINAL, this file records the supersede line; the old files are not edited.
- **CON-08 — Ordering.** No `D-*` lands until OD-01..OD-03 are called and this spec is marked FINAL.

## 3. Goal

### 3.1 Decisions (FINAL)

- **DEC-01 (Bar, FINAL).** Docked full-width bar attached to the bottom edge in `components/FloatingTabBar.tsx` (rewritten in place — file kept so `app/(tabs)/_layout.tsx` wiring is untouched): outer `View` `position: "absolute", left: 0, right: 0, bottom: 0` with `backgroundColor: theme.colors.surface`, `borderTopWidth: 1`, `borderTopColor: theme.colors.surfaceVariant`, height + paddings from `getTabBarMetrics(insets.bottom)`; inner row `flexDirection: "row", alignItems: "center"` full-bleed (zero `maxWidth`, zero side margins, zero `borderRadius`, zero floating shadow). Tab mapping, labels (12/600), icons, `learning-detail` filter, and `pressTab` byte-identical.
- **DEC-02 (`+`, FINAL per OD-01 b).** Separate circular `+` kept (`mode="contained"`, `primary`/`onPrimary`, `router.push("/add-transaction")` single wire) docked right inside the bar row with `marginRight` gutter; only its surrounding layout changes.
- **DEC-03 (SPEC-32, FINAL).** `getTabBarMetrics(insets.bottom)` supplies docked height/paddings; `utils/tabBarMetrics.ts` + its suite untouched; `app/(tabs)/_layout.tsx` untouched.

### 3.2 Interaction matrix (DRAFT)

| # | State | Behavior |
|---|---|---|
| 1 | Any tab focused | Active indicator per OD-02; others inactive |
| 2 | Tap inactive tab | Standard navigation; indicator moves |
| 3 | Tap `+` | Navigates to `/add-transaction` from any tab |
| 4 | Narrow vs wide web | Full-bleed docked on both (no 560 cap, no centering shell) |

### 3.3 Acceptance criteria (FINAL)

Objective (jest, `Platform.OS` = android/ios/web):

| ID | Check |
|---|---|
| ACC-01 | Bar is docked: source contains `bottom: 0` + `borderTopWidth: 1` and zero `maxWidth: 560` + zero floating centering shell (`alignItems: "center"` on the absolute layer) + zero `borderRadius: CONTAINER_RADIUS` on the bar container |
| ACC-02 | `+` has exactly one `router.push("/add-transaction")` wire, docked inside the bar row |
| ACC-03 | Four icon names unchanged; no `NativeModules`/`require(`; `getTabBarMetrics` used for height |
| ACC-04 | `npm test` 0 failed; `npm run lint` clean; `npx tsc --noEmit` clean (user-run per §1.3) |

Subjective (reviewer-observed, Expo Go + web export):

- **ACC-S01:** Bar is attached to the bottom edge full-width on phones + web desktop (no float gap by eye).
- **ACC-S02:** Tabs + `+` tappable on every route; labels legible at default + large text.

## 4. Deliverables (FINAL)

- **D-01:** `components/FloatingTabBar.tsx` — in-place rewrite to docked per DEC-01/DEC-02 (file kept, `_layout.tsx` untouched). Tab mapping, pill tokens, `+` wire, and `getTabBarMetrics` offset otherwise unchanged.
- **D-02:** `utils/floatingTabBar.test.ts` — replace SPEC-58 centering guards with ACC-01..ACC-03 docked guards × android/ios/web (SPEC-53 ACC-01..ACC-05+ACC-07 retained).
- **D-03:** Journal — `docs/savepoint.md` + `AGENTS.md` §3 entry.

## Glossary

| Term | Meaning |
|---|---|
| Docked | Full-width bar attached to the bottom edge (no detached margins / float gap) |
| Floating | Current SPEC-53/58 detached pill + gap + shadow |
| `+` | Sole primary-action affordance → `/add-transaction` (placement TBD in OD-01) |

## References

- `components/FloatingTabBar.tsx` (floating bar under replacement)
- `app/(tabs)/_layout.tsx` (wiring)
- `utils/tabBarMetrics.ts` (SPEC-32 docked-geometry precedent)
- `specs/53-floating-pill-tab-bar.md`, `specs/58-floating-tab-bar-centering.md` (superseded at FINAL for layout only)
- `specs/32-tab-bar-label-visibility.md`, `specs/06-web-warning-cleanup.md`
- `AGENTS.md §1` (spec-first, bare-minimum, one home, docs)
