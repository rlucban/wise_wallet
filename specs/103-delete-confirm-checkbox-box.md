# SPEC-103: Delete Account Checkbox — Explicit Box Instead of Checkbox.Item

| Field | Value |
|-------|-------|
| **ID** | SPEC-103 |
| **Title** | Delete Account Checkbox — Explicit Box Instead of Checkbox.Item |
| **Status** | FINAL v1.1 (v1.0 per user call 2026-10-12; v1.1 variant-fix per user call 2026-10-12 — implementable) |
| **Owner** | @rcluc |
| **Version** | 1.1 FINAL |
| **Scope** | `app/(tabs)/settings.tsx` (delete-confirm `Checkbox.Item` block only) + new guard file `utils/deleteConfirmCheckbox.test.ts` |
| **Non-goals** | No change to label copy, toggle behavior, verify flow, actions, or disabled gating; no change to any other checkbox/switch in settings; no dependency change |

---

## Conventions

The key words **MUST**, **MUST NOT**, **REQUIRED**, **SHALL**, **SHALL NOT**, **SHOULD**, **SHOULD NOT**, **RECOMMENDED**, **MAY**, and **OPTIONAL** in this document are to be interpreted as described in RFC 2119.

---

## Context

User screenshots (2026-10-12, iPhone, Delete Account dialog after PIN verified): the confirm row `I understand this action is permanent and cannot be undone` shows **no box while unchecked** (screenshot 1) and a **detached floating check at the right edge while checked** (screenshot 2) — the user expects a proper button box at that spot. Code site: a Paper `Checkbox.Item` (`app/(tabs)/settings.tsx:1560-1566`, trailing position default). Static review rules out theme (`onSurfaceVariant #3A3E4A` is visibly dark on white — `ThemeContext.tsx:34`) and glyphs (the checked state proves the font + trailing slot render), leaving `Checkbox.Item`'s internal row layout swallowing/misplacing the control box on a narrow phone viewport. The deterministic fix is an explicit row — standalone Paper `Checkbox` with pinned colors beside the label `Text` — so the box renders in the same spot in both states regardless of `Item` internals.

**v1.1 correction (2026-10-12):** the v1.0 diagnosis was wrong. User proof after v1.0 shipped (phone reloaded): web shows the box, iPhone shows text-only. Library-source trace (`node_modules/react-native-paper/src/components/Checkbox/`): `Checkbox.tsx:66-70` picks `CheckboxIOS` on iOS and `CheckboxAndroid` elsewhere; `CheckboxIOS.tsx:62-63` renders unchecked with `opacity: 0` (Apple-style no-box) and its Props lack `uncheckedColor` entirely (v1.0's pinned color was silently ignored on iPhone); `CheckboxAndroid.tsx:116-120` renders the `checkbox-blank-outline` box. This also explains the original `Checkbox.Item` symptom (Item uses the same platform Checkbox — the "detached check" was the iOS checked style). The v1.1 fix forces the boxed variant via the library-supported `<Checkbox.Android>` subcomponent — same props, no new import.

**User decision captured (2026-10-12):** a visible button box must sit at the check's spot (trailing/right) — "dapat may button box don".

---

## Constraints

| ID | Constraint |
|----|------------|
| **CON-01** | The screen **MUST** remain fully functional on **Android, iOS, and Web** (Expo SDK 57); Expo Go import-safe; Vercel-deployable. |
| **CON-02** | The `Checkbox.Item` **MUST** stay replaced by the explicit row from v1.0, with one change: the control **MUST** be `<Checkbox.Android>` (not bare `<Checkbox>`) — forcing the boxed Material variant on all platforms including iOS. Row shape, label `Text`, `status`, `onPress`, pinned `color`/`uncheckedColor` per v1.0 CON-03. |
| **CON-03** | The standalone `Checkbox` **MUST** pin `color={paperTheme.colors.primary}` and `uncheckedColor={paperTheme.colors.onSurfaceVariant}` explicitly (no reliance on `Item` defaults). |
| **CON-04** | Box position stays **trailing (right)**, matching where the check appears today. Label copy, toggle behavior, `deleteConfirmed` state, and the `disabled={isSyncing \|\| !pinVerified \|\| !deleteConfirmed}` gate **MUST** stay byte-identical. |
| **CON-05** | No new import (`Checkbox`, `Text`, `View` already imported), no new dep, no `Platform.OS` branch, no other settings row touched. |
| **CON-06** | No code, config, or dependency change before this spec is marked **FINAL** by the user (AGENTS §1.1). |
| **CON-07** | **MUST** follow the SPEC-04 template and the AGENTS.md §1.10 platform matrix (Objective vs Subjective). |

---

## Goal

The confirm row always shows a tappable box at the right in both states; checking/unchecking flips the same box in place; the delete gate behaves exactly as before.

### Interaction Matrix

| State | Expected |
|-------|----------|
| PIN verified, unconfirmed | Empty box visible at right; Delete Permanently disabled (unchanged) |
| Tap box or row | Box checks in place; Delete Permanently enables (unchanged logic) |
| Tap again | Box unchecks in place; Delete Permanently disables (unchanged logic) |
| Long label, narrow phone | Label wraps; box stays pinned at right, same vertical center |

### Decisions

| ID | Decision |
|----|----------|
| **DEC-01** | Explicit `Checkbox` + `Text` row (v1.0) with the variant forced to `.Android` (v1.1 — rejected: bare `<Checkbox>`, which resolves to the box-less iOS variant on iPhone; rejected: styling props on `Checkbox.Item`; rejected: custom-built box — Paper's `Checkbox.Android` keeps native a11y/ripple with zero new code). |
| **DEC-02** | Trailing position kept (user call 2026-10-12 — "don", where the check appears today). |
| **DEC-03** | Explicit `color`/`uncheckedColor` pinned (rejected: relying on defaults again — the report proves defaults cannot be trusted here). |
| **DEC-04** | New SPEC-103 file owns the row; no other spec document touched (§1.14). |

### Acceptance Criteria

| ID | Criterion | Type |
|----|-----------|------|
| **ACC-01** | Source scan of `app/(tabs)/settings.tsx`: the delete-confirm block contains a standalone `<Checkbox.Android` with `status={deleteConfirmed ? "checked" : "unchecked"}`, the identical toggle `onPress`, and explicit `color`/`uncheckedColor`; contains zero `Checkbox.Item` in the delete block and zero bare `<Checkbox` control (only `Checkbox.Android`). | Objective |
| **ACC-02** | Source scan: label copy byte-identical (`I understand this action is permanent and cannot be undone`), `deleteConfirmed` state + `Delete Permanently` disabled gate byte-identical, no new import. | Objective |
| **ACC-03** | Source scan: no `Platform.OS` branch added, no other `Checkbox`/`Switch` in settings touched. | Objective |
| **ACC-S01** | Reviewer on iPhone + Android (Expo Go): after PIN verify, an empty box is visible at the right of the confirm text; tapping it checks/unchecks in place; Delete Permanently enables only when checked. FAIL = missing box in either state or moved position. | Subjective |
| **ACC-S02** | Reviewer on Web: identical to ACC-S01, no console error. FAIL = any web-only deviation. | Subjective |

---

## Platform Matrix (AGENTS.md §1.10)

| Platform | Objective (machine-checkable) | Subjective (reviewer-observed) |
|----------|-------------------------------|-------------------------------|
| **Android** | ACC-01..ACC-03 pass with `Platform.OS === "android"`. | Expo Go: box visible both states, in-place toggle (ACC-S01). |
| **iOS** | Same guards with `Platform.OS === "ios"`. | Expo Go: identical to Android (ACC-S01). |
| **Web** | Same guards with `Platform.OS === "web"`. | Web export: identical, no console error (ACC-S02). |

TDD coverage (§1.10): new `utils/deleteConfirmCheckbox.test.ts` covers ACC-01..ACC-03 parameterized by `Platform.OS` (`android`/`ios`/`web` via mock); ACC-S01/S02 are user-run manual checks exactly as written above (box visibility/layout is not jest-provable — guards pin the explicit control + copy + gate).

---

## Deliverables

| ID | Deliverable |
|----|-------------|
| **D-01** | `app/(tabs)/settings.tsx` ONLY: delete-confirm `Checkbox.Item` → explicit `Checkbox` + `Text` row per CON-02/CON-03/CON-04 (v1.0), with the control as `<Checkbox.Android>` (v1.1 variant force). No other line in the file changes. |
| **D-02** | `utils/deleteConfirmCheckbox.test.ts`: guards for ACC-01..ACC-03 × android/ios/web (v1.0 new file; v1.1 re-pins ACC-01 to `Checkbox.Android`). |
| **D-03** | Docs after implementation (AGENTS §1.8, post-FINAL only): `docs/savepoint.md` entry + `AGENTS.md` §3 status line. NOT part of the spec-writing step; no doc edit ships with the DRAFT. |

---

## Glossary

| Term | Definition |
|------|------------|
| **Checkbox.Item** | Paper's combined label+box row — its internal layout is the prime suspect for the swallowed box. |
| **Explicit row** | A hand-laid `View` with a standalone `Checkbox` and label `Text` — full control over both. |
| **Trailing** | Box pinned at the row's right end, where the check appears today. |

---

## References

- `app/(tabs)/settings.tsx:1560-1566` (delete-confirm `Checkbox.Item` — the suspect block)
- `context/ThemeContext.tsx:34` (`onSurfaceVariant #3A3E4A` — theme ruled out)
- User screenshots 2026-10-12 (missing unchecked box; detached checked check, iPhone)
- `AGENTS.md` §1.1 (spec-first), §1.9 (spec format), §1.10 (platform matrix + TDD), §1.11 (bare-minimum), §1.12 (no new deps), §1.14 (one home)
