# Spec 34: Replace Hardcoded `#fff` With the `onPrimary` Semantic Token

| Field | Value |
|---|---|
| ID | SPEC-34 |
| Title | Replace Hardcoded `#fff` With the `onPrimary` Semantic Token |
| Status | **FINAL** (approved by user 2026-09-30 — implement exactly this) |
| Owner | User (final authority) |
| Version | 1.0 — restores SPEC-12..16 / SPEC-17 invariant broken by SPEC-17 and SPEC-26 |
| Scope | The 5 hardcoded `"#fff"` literals flagged by `utils/themeColors.test.js` in `app/add-allocation.tsx`, `app/dues.tsx`, `app/add-due.tsx`, `app/savings.tsx`, `app/category-settings.tsx` |
| Non-goals | Hardcoded colors in files **not** in `themeColors.test.js`'s `FILES_TO_CHECK`; the `add-allocation` disabled-state token bug (ACC-07 notes it, does not fix it); the theme palette itself; any storage/API/nav change |
| Normative source | This file. File + symbol cites are normative; `:line` numbers are hints only. |

> History: created 2026-09-30 after `npm test` reported 15 failures
> (5 files x 3 platforms) in `utils/themeColors.test.js`.

## Terminology (RFC 2119)

**MUST**, **MUST NOT**, **SHOULD**, and **MAY** are to be interpreted as
described in RFC 2119. Informative prose is non-normative unless restated as
a requirement.

## 1. Context

### 1.1 Problem

`utils/themeColors.test.js` scans 8 files for hardcoded color literals
(hex, named CSS colors, `rgb()/rgba()`). SPEC-12..16 converted those files
to semantic `theme.colors.*` tokens; SPEC-17 (FAB styling) and SPEC-26
(dialog styling) later re-introduced a `"#fff"` literal into five of them,
so the scan now fails on all three platforms.

The 5 flagged sites, all of the same shape — foreground white on a
`theme.colors.primary` background:

| File | Site | Shape |
|---|---|---|
| `app/add-allocation.tsx` | `buttonTextColor` fallback | `: "#fff"` alongside `buttonBg = theme.colors.primary` |
| `app/dues.tsx` | `<FAB color=...>` | FAB `style.backgroundColor: theme.colors.primary` |
| `app/add-due.tsx` | `<Button color=...>` | `buttonColor={theme.colors.primary}` |
| `app/savings.tsx` | `<FAB color=...>` | FAB `style.backgroundColor: theme.colors.primary` |
| `app/category-settings.tsx` | `<FAB color=...>` | FAB `style.backgroundColor: theme.colors.primary` |

### 1.2 The correct token is `theme.colors.onPrimary`

`context/ThemeContext.tsx` already defines a correct MD3 `primary` /
`onPrimary` pair in both schemes:

- Light: `primary: '#1B3F7A'` (dark navy) + `onPrimary: '#FFFFFF'`
- Dark: `primary: '#4A90D9'` (light blue) + `onPrimary: '#001F4D'`

So `onPrimary` is visually identical to `#fff` in **light** mode and
**corrects** dark mode: white `#FFFFFF` on `#4A90D9` is ~2.2:1 (fails
WCAG AA), whereas `#001F4D` on `#4A90D9` is ~8:1 (passes).

This is the same decision already ratified in SPEC-13 `DEC-08`
(`selectedDayTextColor`/`selectedDotColor` = `theme.colors.onPrimary`).

## 2. Constraints (normative)

- **CON-01 — Semantic tokens only.** The 5 flagged sites MUST take their
  foreground color from `theme.colors.*`. No hex, named CSS color, or
  `rgb()/rgba()` literal may remain at those sites.
- **CON-02 — Light-mode appearance MUST NOT change.** `onPrimary` is
  `#FFFFFF` in the light scheme, so light-mode rendering MUST be
  pixel-identical to today.
- **CON-03 — Dark-mode contrast MUST improve.** The dark scheme MUST render
  these foregrounds as `theme.colors.onPrimary` (`#001F4D`), meeting WCAG
  AA (>= 4.5:1) against `theme.colors.primary` (`#4A90D9`).
- **CON-04 — Cross-platform parity.** The change MUST be identical on
  Android, iOS, and Web. No `Platform.OS` branch is required or permitted
  for this change.
- **CON-05 — Expo Go safe.** No new imports, no new native modules, no
  static import of a native-only package. `useTheme()` is already in scope
  in all 5 files.
- **CON-06 — No behavior, copy, or layout change.** Labels ("Due", "New
  Allocation", "Save Scheduled Due", "Create Allocation"), handlers, FAB
  position/size, and disabled logic MUST be untouched.
- **CON-07 — No global theme change.** `context/ThemeContext.tsx` MUST NOT
  be modified; the palette is already correct.
- **CON-08 — No storage / API / navigation / dependency change.** This is
  a purely visual token swap.
- **CON-09 — Scope fence.** Only the 5 sites in the table in §1.1 may be
  edited. Hardcoded colors in files outside `themeColors.test.js`'s
  `FILES_TO_CHECK` (e.g. `app/(tabs)/settings.tsx` `textColor="#fff"`,
  `app/transaction-details.tsx`, `app/notifications.tsx`,
  `app/(tabs)/reports.tsx`, `components/SummaryCard.tsx`) are out of scope
  and MUST NOT be touched by this spec.

## 3. Goal

Replace the 5 hardcoded `"#fff"` literals with `theme.colors.onPrimary` so
`npm test` passes on all three platforms, with no light-mode visual change
and an improved dark-mode contrast.

### 3.1 Platform matrix

| | Android | iOS | Web (`expo export --platform web`) |
|---|---|---|---|
| **Objective** (ACC-01..06) | identical behavior | identical behavior | identical behavior |
| **Subjective** (ACC-07..10) | reviewer observation in Expo Go | reviewer observation in Expo Go | reviewer observation in browser |

The 5 sites are pure color-value substitutions with no `Platform.OS`
branch, so objective criteria are platform-invariant; the matrix records
that invariance rather than three implementations.

### Acceptance criteria (Objective — machine-checkable)

| ID | Criterion |
|---|---|
| **ACC-01** | `utils/themeColors.test.js` reports **0** violations in all 8 scanned files, on each of `android`, `ios`, and `web` (15/15 pass; currently 15 fail). |
| **ACC-02** | `app/add-allocation.tsx` `buttonTextColor` resolves to `theme.colors.onPrimary` in its enabled branch. |
| **ACC-03** | `app/dues.tsx`, `app/savings.tsx`, and `app/category-settings.tsx` each have exactly one FAB foreground passed as `theme.colors.onPrimary`, with `style.backgroundColor: theme.colors.primary` unchanged. |
| **ACC-04** | `app/add-due.tsx` "Save Scheduled Due" `Button` foreground is `theme.colors.onPrimary`, with `buttonColor={theme.colors.primary}` unchanged. |
| **ACC-05** | `grep -n '#fff' app/add-allocation.tsx app/dues.tsx app/add-due.tsx app/savings.tsx app/category-settings.tsx` returns no matches. |
| **ACC-06** | `npm run lint` is clean, and `git diff --stat` shows changes confined to the 5 files listed in §1.1 (plus `docs/savepoint.md` and `AGENTS.md` §3 per rule §1.8). |

### Acceptance criteria (Subjective — reviewer-observed UX)

Each is a pass/fail observation by the reviewer.

| ID | Criterion |
|---|---|
| **ACC-07** | **Light mode, all 5 sites, all 3 platforms** — reviewer opens `/dues`, `/savings`, `/category-settings`, `/add-due`, `/add-allocation` and confirms each button/FAB label is **white on dark navy** and fully legible, i.e. visually unchanged from before this spec. *Pass = label reads white; fail = any label tinted, dimmed, or unreadable.* |
| **ACC-08** | **Dark mode, all 5 sites, all 3 platforms** — reviewer toggles dark mode and confirms each label renders **dark navy on light blue** with no "washed out" white-on-pale-blue appearance. *Pass = dark label clearly readable; fail = label appears white/faint and hard to read.* |
| **ACC-09** | **Non-regression** — reviewer confirms no other screen changed appearance, and that no Expo Go red-box appears on any of the 5 screens. *Pass = no red-box, no unexpected diff.* |
| **ACC-10** | **Known-issue disclosure** — reviewer is told that `app/add-allocation.tsx`'s **disabled** button state is a separate pre-existing bug (`disabledBg` and `disabledText` are both `theme.colors.onSurface`, so the disabled label is invisible against its own background). This spec MUST NOT change it; it is recorded here for a follow-up spec. *Pass = reviewer acknowledges the disabled state is unchanged and is filed separately.* |

### Decisions

- **DEC-01:** Use `theme.colors.onPrimary`, not `#fff`, `theme.colors.surface`,
  or `theme.colors.background`. `onPrimary` is the MD3-defined foreground for
  `primary` and is already the ratified choice in SPEC-13 `DEC-08`.
- **DEC-02:** Do **not** fix `app/add-allocation.tsx`'s disabled-state tokens
  in this spec (ACC-10). Bundling an unrequested behavior fix would violate
  AGENTS.md §1.2 "no auto-pilot".
- **DEC-03:** Do **not** extend `FILES_TO_CHECK` in `utils/themeColors.test.js`.
  Widening the scan surfaces ~100 pre-existing literals across
  `settings.tsx`, `reports.tsx`, `notifications.tsx`, `login.tsx`,
  `register.tsx`, `onboarding.tsx`, and 10+ components — a separate spec.
- **DEC-04:** No new test file. `utils/themeColors.test.js` already encodes
  ACC-01 across all three platforms; a duplicate test would add no coverage.

## 4. Deliverables

- **D-01** — `app/add-allocation.tsx`: `buttonTextColor` enabled-branch
  fallback `#fff` → `theme.colors.onPrimary`.
- **D-02** — `app/dues.tsx`: FAB `color="#fff"` → `color={theme.colors.onPrimary}`.
- **D-03** — `app/savings.tsx`: FAB `color="#fff"` → `color={theme.colors.onPrimary}`.
- **D-04** — `app/category-settings.tsx`: FAB `color="#fff"` → `color={theme.colors.onPrimary}`.
- **D-05** — `app/add-due.tsx`: "Save Scheduled Due" `Button` `color="#fff"` →
  `color={theme.colors.onPrimary}`.
- **D-06** — Docs: append a `Current status` entry to `AGENTS.md` §3 and a
  `docs/savepoint.md` journal entry (AGENTS.md §1.8).
- **D-07** — Verification commands handed to the user (AGENTS.md §1.3 — the
  agent does not run CLIs): `npm test`, `npm run lint`.

## 5. Glossary

| Term | Meaning |
|---|---|
| Semantic token | A `theme.colors.*` value that adapts to light/dark automatically. |
| Hardcoded color | A literal hex string (`#fff`, `#1E3A8A`), named CSS color (`white`, `gray`), or `rgb()/rgba()` call. |
| `onPrimary` | MD3 foreground token for content drawn on `primary`. |
| WCAG AA (normal text) | Contrast ratio >= 4.5:1. |
| Scan file | One of the 8 entries in `themeColors.test.js`'s `FILES_TO_CHECK`. |

## 6. References

- `utils/themeColors.test.js` — the failing scan (8 files x 3 platforms)
- `context/ThemeContext.tsx:13-14, 55-56` — light/dark `primary` + `onPrimary`
- `app/dues.tsx:650, 655` and `app/add-due.tsx:235, 240` — `onPrimary` already
  used for calendar `selectedDayTextColor` / `selectedDotColor`
- `specs/13-theme-contrast-add-due.md` — `CON-05` (onPrimary for text on
  primary) and `DEC-08`
- `specs/17-fab-button-styling.md`, `specs/26-responsive-dialogs-and-clear-data-flow.md`
  — the specs that reintroduced the literals
- `AGENTS.md` §1.1 (spec-first), §1.3 (user runs CLIs), §1.8 (document after
  approved changes), §1.9/§1.10 (spec format + platform matrix)
