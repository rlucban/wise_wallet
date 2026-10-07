# SPEC-53 — Auth Button Label Contrast (Login + Register)

| Field | Value |
|---|---|
| ID | SPEC-53 |
| Title | White labels on indigo auth buttons (`app/login.tsx`, `app/register.tsx`) |
| Status | **FINAL** v0.1 (marked by user 2026-10-07; implementable per AGENTS.md §1.1) |
| Owner | User (final authority) |
| Version | v0.1 DRAFT |
| Scope | Button `labelStyle` color only in `app/login.tsx` + `app/register.tsx` (primary, mode-selector-active, dialog-contained buttons) + one guard test + journal |
| Non-goals | Button backgrounds, shapes, layout, copy, dialog behavior, auth logic, theming of the auth screens, any other screen |
| Normative source | This file (once marked FINAL). File+symbol cites are normative; `:line` numbers are hints only. |

> History: v0.1 DRAFT 2026-10-07 from user report (button text hard to read
> on blue buttons). FINAL 2026-10-07 per user call ("final") — content unchanged.

## Terminology (RFC 2119)

The keywords **MUST**, **MUST NOT**, **SHOULD**, and **MAY** in this spec are
to be interpreted as described in RFC 2119. Informative prose (examples,
"today", "currently") is non-normative unless restated as a requirement.

## Context

### Problem

In one sentence: **the Login/Register contained buttons paint indigo
backgrounds (`#3949ab`) but leave the label color to the theme default, so
the text can render dark-on-indigo and is hard to read.**

### Evidence (verified read-only, this tree)

- `app/login.tsx:481-488` — `primaryBtn` sets `backgroundColor: '#3949ab'`
  with no `labelStyle`; the `Login` button (`:352-360`) inherits the theme
  label color.
- `app/register.tsx:408-413` — `modeBtnActive` sets the same indigo with no
  label override; the active Online/Offline button (`:210-229`) has the same
  defect. Same `primaryBtn` shape (`:423-430`) for `Register` (`:282-291`).
- Both files' dialog `contained` buttons (`login.tsx:264-281`,
  `register.tsx:173-190`, incl. the fallback `OK`) have no label override.
- `outlined`/`text` buttons are theme-driven and unaffected (out of scope).
- These screens are gradient-indigo in all modes (not theme-driven), so a
  pinned light label is correct in light + dark alike.

### Notes (informative)

- SPEC-27 moved nine labels to `theme.colors.onPrimary`, but these two
  screens were out of its scope. This spec uses the literal from the user's
  call (`#fff`, already used for logo/tagline text in both files) instead of
  introducing a theme hook — smallest diff, same visual result on these
  unthemed screens.

## Constraints (normative)

- **CON-53-01 — Bare-minimum diff (§1.11).** Only `labelStyle` on the buttons
  named in D-53-01/D-53-02 MAY change, plus the
  files named in D-*. No background, shape, layout, copy, or logic change.
- **CON-53-02 — Exact color.** Added label styles MUST be exactly
  `{ color: "#fff" }`. No other color value appears.
- **CON-53-03 — No new dependencies (§1.12).** No new imports (no theme
  hook — the StyleSheet stays static, matching the files' existing style).
- **CON-53-04 — Cross-platform invariant (§1.5).** `labelStyle` is
  platform-neutral; identical on Android + iOS + Web. No `Platform` branch.
- **CON-53-05 — Expo Go safe (§1.7) / Vercel-deployable (§1.6).** Style-only
  change; nothing new at import time.
- **CON-53-06 — TDD with cross-platform coverage (§1.10).** Source-text
  guards (screens cannot render under `roots: utils`) across
  `android`/`ios`/`web` + user-run visual matrix. No platform-only behavior
  exists, so no per-platform CON is needed.
- **CON-53-07 — Docs (§1.8).** `docs/savepoint.md` + `AGENTS.md` §3 entry.
  Status flips to FINAL only on explicit user call.

## Goal

### Interaction matrix

| Button | Before | After (all platforms, light + dark) |
|---|---|---|
| Login / Register primary (contained, indigo) | theme-default label, can clash | white label |
| Mode selector active (contained, indigo) | theme-default label, can clash | white label |
| Mode selector inactive (outlined) | unchanged | unchanged |
| Dialog non-cancel + OK (contained) | theme-default label | white label |
| Dialog cancel / switch links (text) | unchanged | unchanged |

### Decisions

- **DEC-53-01 (RECOMMENDED):** literal `#fff` over `theme.colors.onPrimary`
  — these screens have no theme hook and a fixed indigo gradient; adding one
  is churn for zero visual difference.
- **DEC-53-02 (RECOMMENDED):** dialog contained buttons included — same
  defect, same one-line fix, same files.

### Acceptance

Objective (machine-checkable):

| ID | Android | iOS | Web | Check |
|----|---------|-----|-----|-------|
| ACC-01 | ✅ | ✅ | ✅ | Source-text guard: every `mode="contained"` Button in both files carries a white label style; no other `labelStyle` color added |
| ACC-02 | ✅ | ✅ | ✅ | `jest` 0 failed, `lint` clean, `tsc` clean; no dep/route/storage/logic change |

Subjective (reviewer-observed, Expo Go + web export):

- **ACC-S01:** Login/Register primary labels read clearly white-on-indigo in light and dark mode.
- **ACC-S02:** active mode-selector button label is white; inactive stays theme-outlined.
- **ACC-S03:** dialog contained buttons (incl. OK) read white; cancel/text buttons unchanged.

## Deliverables

- **D-53-01 (`app/login.tsx`, label styles only):** white `labelStyle` on the
  Login primary button + dialog contained buttons (non-cancel + OK).
- **D-53-02 (`app/register.tsx`, label styles only):** white `labelStyle` on
  the Register primary button, the active mode-selector button, + dialog
  contained buttons (non-cancel + OK).
- **D-53-03 (new `utils/authButtonLabels.test.ts`):** ACC-01 across
  `android`/`ios`/`web` (source-text guards, repo precedent).
- **D-53-04 (docs):** `docs/savepoint.md` + `AGENTS.md` §3 entry per §1.8.
  Status flips to FINAL only on explicit user call.

## Glossary

- **Contained button:** Paper `mode="contained"` — filled background; its label defaults to the theme's contained-label color unless overridden.
- **`labelStyle`:** Paper Button prop styling the text label (distinct from `style`, which styles the button surface).

## References

- `app/login.tsx:352-360,481-488` (primary) · `app/login.tsx:264-281` (dialog buttons) · `app/register.tsx:210-229,282-291,423-430` (mode + primary) · `app/register.tsx:173-190` (dialog buttons).
- `specs/27-theme-onprimary-label-colors.md` (prior label-contrast work; these screens were out of scope there).
