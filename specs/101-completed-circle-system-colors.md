# SPEC-101: Completed Allocation Circle — System Colors, Green Removed

| Field | Value |
|-------|-------|
| **ID** | SPEC-101 |
| **Title** | Completed Allocation Circle — System Colors, Green Removed |
| **Status** | FINAL v1.1 (v1.0 per user call 2026-10-12; v1.1 color-swap per user call 2026-10-12 — implementable) |
| **Owner** | @rcluc |
| **Version** | 1.1 FINAL |
| **Scope** | `app/savings.tsx` (Completed card middle circle only: container `backgroundColor` + icon `color`) + new guard file `utils/completedCircleColors.test.ts` |
| **Non-goals** | No change to the `Goal Reached` badge, the green full progress bar, Active cards, Archived screen, layout, sizes, or copy; no dependency change |

---

## Conventions

The key words **MUST**, **MUST NOT**, **REQUIRED**, **SHALL**, **SHALL NOT**, **SHOULD**, **SHOULD NOT**, **RECOMMENDED**, **MAY**, and **OPTIONAL** in this document are to be interpreted as described in RFC 2119.

---

## Context

Follow-up to SPEC-100 (user screenshot 2026-10-12, web `/savings`): the check glyph now renders, but the user finds the Completed card's middle circle ugly — the light-green disc (`ec.successContainer || theme.colors.tertiaryContainer`) must go, and the check must be black in the system's color. Code site: the "Green Checkmark Circle" `View` + `MaterialCommunityIcons name="check-circle"` in the `completedItems` map (`app/savings.tsx`, same block SPEC-100 touched).

**User decisions captured (2026-10-12):**
- Icon color: theme `onSurface` (black in light mode, white in dark — survives dark mode).
- Circle background: `surfaceVariant`, matching the Active cards' middle circle.
- Scope is the side circle only — the `Goal Reached` badge and the full progress bar keep their green.

---

## Constraints

| ID | Constraint |
|----|------------|
| **CON-01** | The screen **MUST** remain fully functional on **Android, iOS, and Web** (Expo SDK 57); Expo Go import-safe; Vercel-deployable. |
| **CON-02** | The circle container `backgroundColor` **MUST** become exactly `theme.colors.surfaceVariant` (the `ec.successContainer \|\| theme.colors.tertiaryContainer` expression is removed from this `View` only). |
| **CON-03** | The icon `color` **MUST** be exactly `theme.colors.primary` — the system's blue (v1.1 amendment per user call 2026-10-12: v1.0's `onSurface` black did not read as intended; supersedes DEC-01's black for this icon only). |
| **CON-04** | Icon name (`check-circle`), size (`28`), circle geometry (48/24/`marginRight: 12`), badge, progress bar, copy, and layout **MUST** stay byte-identical. |
| **CON-05** | The `ec` (`ExtendedColors`) local **MUST** stay — badge and progress bar still use it (no unused-var lint break). |
| **CON-06** | No new import, dep, or `Platform.OS` branch — theme colors resolve per-platform identically. |
| **CON-07** | No code, config, or dependency change before this spec is marked **FINAL** by the user (AGENTS §1.1). |
| **CON-08** | **MUST** follow the SPEC-04 template and the AGENTS.md §1.10 platform matrix (Objective vs Subjective). |

---

## Goal

The Completed card's side circle matches the Active cards' gray disc with a system-colored check; all other green accents stay.

### Interaction Matrix

| Element | Before | After |
|---------|--------|-------|
| Completed middle circle background | Light green (`successContainer \|\| tertiaryContainer`) | Gray `surfaceVariant` (Active-card match) |
| Completed check icon color | Green-tinted (`onSuccessContainer \|\| onTertiaryContainer`) | `primary` system blue (v1.1; v1.0's `onSurface` black superseded) |
| `Goal Reached` badge | Green | Unchanged |
| Completed full progress bar | Green | Unchanged |
| Active cards | Gray disc + `%` | Unchanged |

### Decisions

| ID | Decision |
|----|----------|
| **DEC-01** | v1.0 chose `onSurface` (user call 2026-10-12); v1.1 switches to `theme.colors.primary` (user call 2026-10-12 — the black did not read as intended on-device). Primary is the app's system blue (FAB/archive precedent) and stays visible on the gray disc in both modes. |
| **DEC-02** | `surfaceVariant`, not transparent (user call 2026-10-12) — the disc keeps its shape language shared with Active cards. |
| **DEC-03** | Badge + progress bar untouched (user scoped "green sa gilid" to the side circle; bare-minimum §1.11). |
| **DEC-04** | New SPEC-101 file owns the recolor; SPEC-100 keeps the glyph name; no document edited after FINAL (§1.14). |

### Acceptance Criteria

| ID | Criterion | Type |
|----|-----------|------|
| **ACC-01** | Source scan of `app/savings.tsx`: the Completed circle `View` uses `backgroundColor: theme.colors.surfaceVariant`; the check icon uses `color={theme.colors.primary}`. | Objective |
| **ACC-02** | Source scan: no other line in the Completed card block changed — `name="check-circle"`, `size={28}`, badge (`Goal Reached`), progress-bar color expression, and the `ec` declaration all intact. | Objective |
| **ACC-03** | Source scan: no new import, no new dep, no `Platform.OS` branch. | Objective |
| **ACC-S01** | Reviewer on Android/iOS (Expo Go): Completed card side circle is gray with a system-blue check; badge + bar still green. FAIL = any remaining green disc or non-blue check. | Subjective |
| **ACC-S02** | Reviewer on Web: identical to ACC-S01, no console error. Reviewer spot-checks dark mode: blue check stays visible on the gray disc. FAIL = any web-only deviation or low-contrast dark-mode check. | Subjective |

---

## Platform Matrix (AGENTS.md §1.10)

| Platform | Objective (machine-checkable) | Subjective (reviewer-observed) |
|----------|-------------------------------|-------------------------------|
| **Android** | ACC-01..ACC-03 pass with `Platform.OS === "android"`. | Expo Go light mode: gray disc + black check; badge/bar green (ACC-S01). |
| **iOS** | Same guards with `Platform.OS === "ios"`. | Expo Go: identical to Android (ACC-S01). |
| **Web** | Same guards with `Platform.OS === "web"`. | Web export: identical + dark-mode visibility spot-check, no console error (ACC-S02). |

TDD coverage (§1.10): new `utils/completedCircleColors.test.ts` covers ACC-01..ACC-03 parameterized by `Platform.OS` (`android`/`ios`/`web` via mock); ACC-S01/S02 are user-run manual checks exactly as written above (theme color resolution is not jest-provable — guards pin the token names + untouched neighbors).

---

## Deliverables

| ID | Deliverable |
|----|-------------|
| **D-01** | `app/savings.tsx` ONLY: circle `backgroundColor` → `theme.colors.surfaceVariant`; icon `color` → `theme.colors.onSurface` (v1.0), then → `theme.colors.primary` (v1.1 system-blue amendment). No other line in the file changes. |
| **D-02** | New `utils/completedCircleColors.test.ts` (named here per §1.11): guards for ACC-01..ACC-03 × android/ios/web. |
| **D-03** | Docs after implementation (AGENTS §1.8, post-FINAL only): `docs/savepoint.md` entry + `AGENTS.md` §3 status line. NOT part of the spec-writing step; no doc edit ships with the DRAFT. |

---

## Glossary

| Term | Definition |
|------|------------|
| **Side circle** | The Completed card's 48px middle disc (was green, now gray). |
| **`surfaceVariant` / `onSurface`** | Paper theme tokens: gray container shared with Active circles; on-surface text/icon color (black light / white dark). |
| **`ec`** | Local `ExtendedColors` cast still required by the badge + progress bar. |

---

## References

- `app/savings.tsx` Completed card block (SPEC-100 `check-circle` site; badge + full progress bar — untouched)
- User screenshot 2026-10-12 (green disc + green check, web `/savings`)
- `specs/100-completed-allocation-check-icon.md` (glyph owner; unedited)
- `AGENTS.md` §1.1 (spec-first), §1.9 (spec format), §1.10 (platform matrix + TDD), §1.11 (bare-minimum), §1.12 (no new deps), §1.14 (one home)
