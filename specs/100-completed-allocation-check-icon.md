# SPEC-100: Completed Allocation Card — Broken Checkmark Icon Renders "?"

| Field | Value |
|-------|-------|
| **ID** | SPEC-100 |
| **Title** | Completed Allocation Card — Broken Checkmark Icon Renders "?" |
| **Status** | FINAL v1.1 (v1.0 per user call 2026-10-12; v1.1 stale-pin repair per user call 2026-10-12 — implementable) |
| **Owner** | @rcluc |
| **Version** | 1.1 FINAL |
| **Scope** | `app/savings.tsx` (one icon-name prop) + new guard file `utils/completedCheckIcon.test.ts` |
| **Non-goals** | No layout/color/copy change; no change to Active cards, Archived screen, or any other icon; no dependency change |

---

## Conventions

The key words **MUST**, **MUST NOT**, **REQUIRED**, **SHALL**, **SHALL NOT**, **SHOULD**, **SHOULD NOT**, **RECOMMENDED**, **MAY**, and **OPTIONAL** in this document are to be interpreted as described in RFC 2119.

---

## Context

User screenshot (2026-10-12, web `/savings`): a Completed allocation card (`₱110.00 / ₱110.00 100% Reached`, `Goal Reached` badge) shows a green circle containing **`?`** instead of the intended checkmark. Code trace: the Completed card's "Green Checkmark Circle" (`app/savings.tsx:456`) renders `<MaterialCommunityIcons name="checkmark-circle" …/>` — but `checkmark-circle` is an **Ionicons** name, absent from the MaterialCommunityIcons glyph map. When the name is missing, `react-native-vector-icons` renders `?` (user-visible on all platforms; screenshot-proven on web). The correct MaterialCommunityIcons name is `check-circle`. Repo-wide scan confirms exactly **one** occurrence of the bad name — no other screen is affected.

**User decision captured (2026-10-12):** the circle keeps the check **icon** (design intent) — rejected: replacing it with `100%` text (the card copy already states `100% Reached`).

---

## Constraints

| ID | Constraint |
|----|------------|
| **CON-01** | The screen **MUST** remain fully functional on **Android, iOS, and Web** (Expo SDK 57); Expo Go import-safe; Vercel-deployable. |
| **CON-02** | The fix **MUST** be exactly `name="checkmark-circle"` → `name="check-circle"` on the Completed card's icon — one prop, no other character in the file changes. |
| **CON-03** | Circle size (`28`), color (`ec.onSuccessContainer \|\| theme.colors.onTertiaryContainer`), container, badge, copy, and layout **MUST** stay byte-identical. |
| **CON-04** | No new import, dep, or `Platform.OS` branch — identical glyph on all platforms. |
| **CON-05** | No code, config, or dependency change before this spec is marked **FINAL** by the user (AGENTS §1.1). |
| **CON-06** | **MUST** follow the SPEC-04 template and the AGENTS.md §1.10 platform matrix (Objective vs Subjective). |

---

## Goal

The Completed card's green circle shows a checkmark on every platform; no `?` anywhere in the app.

### Interaction Matrix

| Surface | State | Expected |
|---------|-------|----------|
| Allocations → Completed card | Any View | Green circle shows a check glyph (was: `?`) |
| Allocations → Active cards | Any View | Unchanged (liquid-fill `%` circle intact) |
| Whole repo | Source scan | Zero `checkmark-circle` occurrences remain |

### Decisions

| ID | Decision |
|----|----------|
| **DEC-01** | Rename to `check-circle` (the MC glyph), not an arbitrary other check variant — smallest correct name, same visual weight as the `28` size already tuned for. |
| **DEC-02** | Keep the icon (user call 2026-10-12) — rejected: `100%` text, which would duplicate the adjacent `100% Reached` copy. |
| **DEC-03** | New SPEC-100 file owns the rename; no other spec document touched (§1.14). |

### Acceptance Criteria

| ID | Criterion | Type |
|----|-----------|------|
| **ACC-01** | Source scan of `app/savings.tsx`: contains `name="check-circle"` on the Completed card icon; contains zero `checkmark-circle` anywhere in the file. | Objective |
| **ACC-02** | Source scan repo-wide (`app/`, `components/`): zero `checkmark-circle` occurrences remain. | Objective |
| **ACC-03** | Source scan: the icon tag carries `name="check-circle"` at `size={28}` (v1.1: color excluded — SPEC-101 v1.1 recolored to `primary` and owns that pin via `completedCircleColors.test.ts` ACC-01). | Objective |
| **ACC-S01** | Reviewer on Android/iOS (Expo Go): Completed card shows a check glyph in the green circle, no `?`. FAIL = any `?` or missing glyph. | Subjective |
| **ACC-S02** | Reviewer on Web: identical to ACC-S01, no console error. FAIL = any web-only deviation. | Subjective |

---

## Platform Matrix (AGENTS.md §1.10)

| Platform | Objective (machine-checkable) | Subjective (reviewer-observed) |
|----------|-------------------------------|-------------------------------|
| **Android** | ACC-01..ACC-03 pass with `Platform.OS === "android"`. | Expo Go: check glyph visible, no `?` (ACC-S01). |
| **iOS** | Same guards with `Platform.OS === "ios"`. | Expo Go: identical to Android (ACC-S01). |
| **Web** | Same guards with `Platform.OS === "web"`. | Web export: identical, no console error (ACC-S02). |

TDD coverage (§1.10): new `utils/completedCheckIcon.test.ts` covers ACC-01..ACC-03 parameterized by `Platform.OS` (`android`/`ios`/`web` via mock); ACC-S01/S02 are user-run manual checks exactly as written above (glyph rendering is not jest-provable — guards pin the name + single-occurrence + line-otherwise-identical).

---

## Deliverables

| ID | Deliverable |
|----|-------------|
| **D-01** | `app/savings.tsx` ONLY: `name="checkmark-circle"` → `name="check-circle"` (one prop). No other line in the file changes. |
| **D-02** | `utils/completedCheckIcon.test.ts`: guards for ACC-01..ACC-03 × android/ios/web (v1.0 new file; v1.1 narrows ACC-03 to tag/name/size — color moved to SPEC-101). |
| **D-03** | Docs after implementation (AGENTS §1.8, post-FINAL only): `docs/savepoint.md` entry + `AGENTS.md` §3 status line. NOT part of the spec-writing step; no doc edit ships with the DRAFT. |

---

## Glossary

| Term | Definition |
|------|------------|
| **Glyph map** | The font's name→character table; a name missing from it renders `?` in `react-native-vector-icons`. |
| **`checkmark-circle`** | An Ionicons glyph name — invalid in the MaterialCommunityIcons set used here. |
| **`check-circle`** | The correct MaterialCommunityIcons check-in-circle glyph. |

---

## References

- `app/savings.tsx:456` (the broken icon — sole repo-wide occurrence, grep-verified)
- User screenshot 2026-10-12 (`?` in the Completed card's green circle, web `/savings`)
- `AGENTS.md` §1.1 (spec-first), §1.9 (spec format), §1.10 (platform matrix + TDD), §1.11 (bare-minimum), §1.12 (no new deps), §1.14 (one home)
