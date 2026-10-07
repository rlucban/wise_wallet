# Spec 61: In-Flow Docked Tab Bar (No Content Overlay)

| Field | Value |
|---|---|
| ID | SPEC-61 |
| Title | Docked bar lays out in-flow so it never covers screen content |
| Status | **FINAL v1.0** (marked by user 2026-10-07 — "spec 61 fina[l], code this for me") |
| Owner | User (final authority) |
| Version | 0.1 |
| Scope | `components/FloatingTabBar.tsx` outer positioning only + tab-bar test guards |
| Non-goals | Bar visuals (docked tokens per SPEC-59 stay); tab destinations/icons/labels; `+` placement/destination; screen paddings; storage/API/route/dep change |

> History: v0.1 DRAFT (2026-10-07) — user on SPEC-59 build (Home screenshot): "na dock naman eh di naman yan yung gusto ko, dapat hindi nakikita na parang nag scroll at dapat di natatakpan content." Root cause: the docked bar kept `position: "absolute"`, so it overlays content — list scrolls underneath it and the last rows hide behind it.

## Terminology (RFC 2119)

The keywords **MUST**, **MUST NOT**, **SHOULD**, and **MAY** in this spec are to be interpreted as described in RFC 2119. Informative prose (examples, "today", "currently") is non-normative unless restated as a requirement.

## 1. Context

### 1.1 Problem

SPEC-59 docked the bar visually (full-width, bottom edge, top border) but left it `position: "absolute, left: 0, right: 0, bottom: 0"` — an overlay. Screen scroll content extends underneath it: while scrolling, rows visibly slide behind the bar ("parang nag scroll") and end-of-list content sits covered by it. Requirement: the bar occupies its own layout space (in-flow) so content always ends above it and nothing is ever covered.

### 1.2 Evidence (read-only, 2026-10-07)

- `components/FloatingTabBar.tsx:47-59` outer `View` still carries `position: "absolute", left: 0, right: 0, bottom: 0` (carried over from the floating shells of SPEC-53/58; SPEC-59 changed the offsets/tokens but not the positioning scheme).
- React Navigation lays a custom `tabBar` below the scene container in normal flow when it is not absolutely positioned (the pre-SPEC-53 standard bar behaved exactly so — never covered content). Absolute positioning opts out of that flow.
- Alternative (per-screen bottom padding = bar height) rejected: touches ~17 screens, fragile, duplicates navigator layout.

### 1.3 Decisions (proposed — needs FINAL call)

- **OD-01 (proposed: in-flow, drop absolute).** Delete `position`/`left`/`right`/`bottom` from the outer shell; keep everything else (surface, top border, SPEC-32 height/paddings, inner rows, pill, `+`). The navigator then reserves the bar's space and content can never slide under it.

## 2. Constraints (normative)

- **CON-01 — Bare-minimum (§1.11).** Only `D-*` files MAY change. No visual-token, tab, `+`, screen-padding, storage, API, route, or dependency change.
- **CON-02 — No new dependencies (§1.12).** No package/font/native-module change.
- **CON-03 — Cross-platform (§1.5).** Same in-flow layout on Android + iOS + Web; no `Platform` branch added (none needed — the `Platform` import stays removed).
- **CON-04 — Vercel-deployable + Expo Go safe (§1.6/§1.7).** Web export clean; no red-box on import.
- **CON-05 — No contract break (§1.4).** Storage keys, API contract, routes unchanged.
- **CON-06 — TDD cross-platform (§1.10).** jest × android/ios/web + user-run Expo Go + web-export checks.
- **CON-07 — One home (§1.14).** SPEC-59 owns docked visuals; this spec owns positioning only and MUST NOT re-norm tokens. SPEC-53/58 stay superseded for layout.

## 3. Goal

### 3.1 Decisions (DRAFT — FINAL call pending)

- **DEC-01 (in-flow shell, proposed).** Outer `View` style becomes: `backgroundColor: theme.colors.surface`, `borderTopWidth: 1`, `borderTopColor: theme.colors.surfaceVariant`, `height: metrics.height`, `paddingTop: metrics.paddingTop`, `paddingBottom: metrics.paddingBottom` — with zero `position`/`left`/`right`/`bottom` keys. Inner middle row, flat tab row, pill buttons, and `+` (`marginRight: 8`) byte-identical.

### 3.2 Interaction matrix

| # | State | Behavior |
|---|---|---|
| 1 | Any tab, list scrolled to end | Last row fully visible above the bar; zero pixels hidden behind it |
| 2 | Any tab, mid-scroll | Rows stop at the bar's top border; nothing slides underneath ("no scroll-under look") |
| 3 | Short content (no scroll) | Bar sits at the bottom edge exactly as today; no gap, no shift |
| 4 | Rotation / resize / safe-area | Bar keeps SPEC-32 height; content area shrinks/grows, never overlaps |

### 3.3 Acceptance criteria

Objective (jest, `Platform.OS` = android/ios/web):

| ID | Check |
|---|---|
| ACC-01 | Zero overlay positioning: source contains zero `position:` + zero `"absolute"` + zero `bottom:` in `components/FloatingTabBar.tsx`; retains `borderTopWidth: 1` + `metrics.height` + single `router.push("/add-transaction")` |
| ACC-02 | `npm test` 0 failed; `npm run lint` clean; `npx tsc --noEmit` clean (user-run per §1.3) |

Subjective (reviewer-observed, Expo Go + web export):

- **ACC-S01:** Home scrolled to end (phone + web desktop): last transaction fully readable, bar never covers content; mid-scroll shows rows ending at the bar border, none sliding under.
- **ACC-S02:** All four tabs + short screens (e.g. empty states): bar at bottom edge, no overlap, no layout jump vs SPEC-59 build.

## 4. Deliverables

- **D-01:** `components/FloatingTabBar.tsx` — outer shell positioning removal per DEC-01. Nothing else in the file.
- **D-02:** `utils/floatingTabBar.test.ts` — ACC-01 guard swap (overlay-absence) × android/ios/web; all other guards retained.
- **D-03:** Journal — `docs/savepoint.md` + `AGENTS.md` §3 entry.

## Glossary

| Term | Meaning |
|---|---|
| In-flow | Bar participates in navigator layout (space reserved; content ends above it) |
| Overlay | `position: absolute` bar (drawn over content; content scrolls underneath) |
| Scroll-under look | Rows visibly sliding behind the bar while scrolling (the reported defect) |

## References

- `components/FloatingTabBar.tsx:47-59` (outer shell under change)
- `specs/59-docked-tab-bar.md` (FINAL — docked visuals owner; positioning amended here)
- `specs/53-floating-pill-tab-bar.md`, `specs/58-floating-tab-bar-centering.md` (layout-superseded)
- `utils/tabBarMetrics.ts` (SPEC-32 height owner, unchanged)
- `AGENTS.md §1` (spec-first, bare-minimum, one home, docs)
