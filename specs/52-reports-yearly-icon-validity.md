# Spec 52: Reports Yearly Period Icon Validity

| Field | Value |
|---|---|
| ID | SPEC-52 |
| Title | Reports Yearly period menu icon uses a valid MaterialCommunityIcons name |
| Status | **FINAL v1.0** (marked by user 2026-10-06; implementable per AGENTS.md §1.1) |
| Owner | User (final authority) |
| Version | v1.0 |
| Scope | `app/(tabs)/reports.tsx` Yearly `Menu.Item` `leadingIcon` only (one-line icon-name fix) |
| Non-goals | Ionicons migration; `periodOptions` array refactor; Weekly/Monthly icon change; storage keys; `wallet-api` contract; routes; dependencies |
| Normative source | This file. `AGENTS.md §4` is a pointer only. File+symbol cites are normative; `:line` numbers are hints only. |

## Terminology (RFC 2119)

The keywords **MUST**, **MUST NOT**, **SHOULD**, and **MAY** in this spec are to be interpreted as described in RFC 2119. Informative prose (examples, "today", "currently") is non-normative unless restated as a requirement.

## 1. Context

### 1.1 Problem

The Reports period picker (`app/(tabs)/reports.tsx:198-231`) renders three Paper `Menu.Item` rows via `MaterialCommunityIcons` (`reports.tsx:9`):

- Weekly → `leadingIcon="calendar-week"` (`:228`)
- Monthly → `leadingIcon="calendar-month"` (`:229`)
- Yearly → `leadingIcon="calendar-year"` (`:230`)

`calendar-year` is not a valid glyph in the installed `MaterialCommunityIcons` set, so the Yearly row renders a blank/missing icon (and risks a web `WARN` of the class cleaned up by SPEC-06). Weekly and Monthly are unaffected.

The request (`periodOptions` snippet with `calendar-outline`) asks to give Yearly a valid calendar icon name. The snippet's `periodOptions` array does not exist in the tree (grep: zero matches) and its Ionicons framing does not match the file's actual `MaterialCommunityIcons` import — so this spec pins the fix to the existing import and the Yearly row only.

### 1.2 User decisions (draft — confirm at FINAL)

- Fix Yearly only; Weekly (`calendar-week`) and Monthly (`calendar-month`) stay byte-identical.
- Stay on `MaterialCommunityIcons`; do not introduce an Ionicons import.
- Replacement glyph: `calendar-outline` (valid MCI glyph, generic calendar, matches the requested snippet).

## 2. Constraints (normative)

- **CON-01 — Bare-minimum (§1.11).** Only `D-*` files MAY change. No refactor to a `periodOptions` array, no Weekly/Monthly touch, no style/copy change.
- **CON-02 — No new dependencies (§1.12).** No new npm packages, fonts, native modules, or icon-library imports. The `MaterialCommunityIcons` import at `reports.tsx:9` is reused as-is.
- **CON-03 — Cross-platform (§1.5).** Paper `Menu` + `MaterialCommunityIcons` MUST work on Android + iOS + Web. No native-only import, no `Platform.OS` branch needed; no Node-only APIs in app code.
- **CON-04 — Vercel-deployable + Expo Go safe (§1.6/§1.7).** Web export MUST stay clean (no new web `WARN`); Expo Go MUST NOT red-box on import.
- **CON-05 — No contract break (§1.4).** Storage keys (`user_{id}_*`), `wallet-api` contract, AsyncStorage shapes, navigation routes, and native deps MUST stay unchanged.
- **CON-06 — TDD cross-platform (§1.10).** `jest` parameterized by `Platform.OS` (`android`/`ios`/`web` via mock) for the machine-checkable guards + user-run manual checks in Expo Go and `expo export --platform web` for the render paths jest cannot prove.
- **CON-07 — One home (§1.14).** SPEC-06 (web warning cleanup) and SPEC-33/34 (reports export/charts) are cross-referenced, never re-normed. No duplicate spec/slice elsewhere.
- **CON-08 — Ordering.** `D-01`..`D-03` land only after `D-00` (user marks FINAL).

## 3. Goal

### 3.1 Decisions

- **DEC-01 (Replacement glyph, draft).** `app/(tabs)/reports.tsx:230` `leadingIcon` becomes `"calendar-outline"`.
- **DEC-02 (Scope lock, draft).** `:228` (Weekly) and `:229` (Monthly) stay byte-identical; no new array, helper, or abstraction is introduced.

### 3.2 Interaction matrix

| Row | Before | After | Behavior |
|---|---|---|---|
| Weekly | `calendar-week` | unchanged | icon renders as today |
| Monthly | `calendar-month` | unchanged | icon renders as today |
| Yearly | `calendar-year` (invalid) | `calendar-outline` (valid) | icon renders; no blank row; no new warning |

### 3.3 Acceptance criteria

Objective (jest, `Platform.OS` = android/ios/web — source-text guards, since jest cannot render glyphs):

| ID | Check |
|---|---|
| ACC-01 | `app/(tabs)/reports.tsx` contains zero occurrences of `calendar-year` |
| ACC-02 | The Yearly (`annually`) `Menu.Item` carries `leadingIcon="calendar-outline"` |
| ACC-03 | Weekly/Monthly rows still carry `calendar-week` / `calendar-month` respectively (no scope creep) |
| ACC-04 | `npm test` 0 failed; `npm run lint` clean; `npx tsc --noEmit` clean (user-run per §1.3) |

Subjective (reviewer-observed, Expo Go + web export):

- **ACC-S01:** Android/iOS Expo Go — open Reports → period menu → Weekly, Monthly, Yearly rows all show a calendar icon; Yearly is no longer blank.
- **ACC-S02:** Web export (`expo export --platform web`) — same three rows show icons; console shows no new icon/warning attributable to the period menu.
- **ACC-S03:** Reviewer confirms no visual/copy/layout change beyond the Yearly glyph (bare-minimum diff).

## 4. Deliverables

- **D-00:** User marks this spec FINAL (status flip). Gates `D-01`..`D-03`.
- **D-01 (`app/(tabs)/reports.tsx`):** one-line change only — `:230` `leadingIcon="calendar-year"` → `leadingIcon="calendar-outline"`. Nothing else in the file.
- **D-02 (`utils/reportsPeriodIcon.test.ts`):** `ACC-01`..`ACC-03` × android/ios/web (source-text guards; SPEC-07 tsc-exclusion respected). No behavior code in `utils/`.
- **D-03 (journal):** `docs/savepoint.md` + `AGENTS.md` §3 entry after implementation (per §1.8).

## Glossary

| Term | Meaning |
|---|---|
| `leadingIcon` | React Native Paper `Menu.Item` prop rendering the row icon via the vector-icon set |
| MaterialCommunityIcons | Icon set already imported at `reports.tsx:9`; canonical set for this fix |
| `calendar-year` | Current Yearly icon name; treated as invalid (renders blank) |
| `calendar-outline` | Replacement valid MCI glyph for the Yearly row (DEC-01) |

## References

- `app/(tabs)/reports.tsx:9` (MaterialCommunityIcons import), `:198-231` (period `Menu`), `:228-230` (the three `leadingIcon` values)
- `specs/06-web-warning-cleanup.md` (icon/warning precedent)
- `specs/33-report-export-fidelity.md`, `specs/34-pdf-chart-summary-format.md` (reports scope neighbors — untouched)
- `AGENTS.md §1` (spec-first, no CLI, invariants, TDD, bare-minimum, docs)
