# Spec 68: Scheduled Screen Material 3 Polish

| Field | Value |
|---|---|
| ID | SPEC-68 |
| Title | Scheduled filter, total card, upcoming cards/actions/badges, and Pay dialog M3 polish |
| Status | **FINAL v1.2** (Pay-dialog acceptance synchronized with SPEC-69 v1.1 FINAL) |
| Owner | User (final authority) |
| Version | 1.2 |
| Scope | `app/dues.tsx` styles/props only (filter bar, month total card, upcoming cards, action buttons, status badges, Pay dialog presentation) + `utils/scheduledPolish.test.ts` |
| Non-goals | Pay/balance logic, anchor/busy math, completed screen, edit modal, date picker, FAB, storage keys, `wallet-api` contract, routes, dependencies |
| Normative source | This file. `AGENTS.md §4` is a pointer only. File+symbol cites are normative; `:line` numbers are hints only. |

> History: v1.0 (2026-10-07) — user order on the Scheduled screen (`app/dues.tsx`, header title "Scheduled"; no `app/scheduled.tsx` exists in-tree): plain rectangular filter bar, heavy reddish total block, flat list cards with raw outlined Pay chip, square (`borderRadius: 4`) badges, plain Pay-method chips with no selected checkmark. New number justified: no existing spec owns Scheduled M3 polish (§1.14 one-home; overlapping specs retained as constraints, never re-normed).
>
> v1.1 (2026-10-07) — user correction on the v1.0 screenshot: Pay color MUST NOT change ("diko sinabeng palitan"). DEC-03/ACC-03/matrix-row-3/glossary amended: Pay stays `mode="outlined"` with its `theme` outline override; only `borderRadius: 12` shape is added. Nothing else changes.
>
> v1.2 FINAL (2026-10-07) — synchronized the Pay-dialog acceptance with SPEC-69 v1.1 FINAL: the wrapping Chip picker is now a fixed two-column Pressable option grid. ACC-05 retains the rounded selected option, visible checkmark, centered bold title, and unchanged Cancel/Confirm modes, but no longer requires Chip-only props. SPEC-69 owns detailed Pay/Receive modal presentation; all other SPEC-68 requirements remain unchanged.

## Terminology (RFC 2119)

The keywords **MUST**, **MUST NOT**, **SHOULD**, and **MAY** in this spec are to be interpreted as described in RFC 2119. Informative prose (examples, "today", "currently") is non-normative unless restated as a requirement.

## 1. Context

### 1.1 Problem

The Scheduled screen works but reads dated against Material 3: the filter bar is a plain rectangular `SegmentedButtons` with no rounding; the Week/Month total is a heavy `errorContainer` block; upcoming cards are flat (no elevation); the Pay action is a raw `mode="outlined"` chip next to bare `IconButton`s; `OVERDUE` / `DUE` / `RECEIVABLE` / `AUTO-RENEW` tags are square (`borderRadius: 4`); and the Pay dialog's method chips have no selected checkmark, border rounding, or card-padding polish (Cancel-text + Confirm-contained already correct, retained).

### 1.2 Evidence (read-only, 2026-10-07)

- `app/dues.tsx:476-486` — filter `SegmentedButtons` (default Paper theming, no `style` rounding).
- `app/dues.tsx:488-499` — total `Card` (`flex: 1, padding: 12, borderRadius: 12`, `errorContainer` bg + `onErrorContainer` text).
- `app/dues.tsx:362` — upcoming `Card` (`marginBottom: 12, borderRadius: 16`, `surface` bg, no `elevation` key).
- `app/dues.tsx:437-449` — actions row (`flexWrap: wrap, gap: 4`): Pay `Button mode="outlined" compact` + `pencil-outline` / `delete` `IconButton`s (no `mode`).
- `app/dues.tsx:396-434` — badges: `OVERDUE` (`error`/`errorContainer`), `DUE`/`RECEIVABLE` (`primary`/`primaryContainer`), `AUTO-RENEW` (`surfaceVariant`, `tertiary` bolt) — all `borderRadius: 4`, `paddingHorizontal: 6`, `paddingVertical: 2`.
- `app/dues.tsx:642-677` — Pay `Dialog` (SPEC-26 `styles.dialog` retained): `Title` centered, `Content` amount + `labelLarge` + wrap chip grid (`flexWrap: wrap, gap: 8, justifyContent: center`), `Chip mode="outlined"` with `selected` but no `icon` and no rounding; `Actions` centered, Cancel `mode="text"`, Confirm `mode="contained"` (`disabled={!payTarget || payBusy}`).
- No `app/scheduled.tsx` exists (glob `app/*sched*.*` empty; screen file is `app/dues.tsx`).

## 2. Constraints (normative)

- **CON-01 — Bare-minimum (§1.11).** Only `D-*` files MAY change. No handler, validation, anchor, busy, gating, navigation, or copy change beyond the style/prop keys listed in `DEC-*`.
- **CON-02 — Retained behavior.** SPEC-48 (anchor `max(today, scheduled)`, `payBusy` guards, `AUTO-RENEW` copy, `autoProcess` field), SPEC-07 (completed lock), SPEC-32 (completed-dues routing + `dueId`), SPEC-46 (category sanitize), SPEC-47 (pay-method fetch + `Cash`/`Unknown` fallback), SPEC-26 v1.4 (`styles.dialog` container), SPEC-12/27 (theme tokens) MUST stay byte-identical except the listed keys. Pay/edit/delete `onPress`, `disabled`, dialog dismiss/confirm flow MUST NOT change.
- **CON-03 — No new dependencies (§1.12).** RN + Paper + theme only. No new imports.
- **CON-04 — Cross-platform (§1.5).** Android + iOS + Web; no native-only imports; no Node-only APIs in app code.
- **CON-05 — Vercel-deployable + Expo Go safe (§1.6/§1.7).** Web export clean; no red-box on import.
- **CON-06 — No contract break (§1.4).** Storage keys, API contract, routes unchanged.
- **CON-07 — TDD cross-platform (§1.10).** jest × android/ios/web + user-run Expo Go + web-export checks. No platform-only behavior: every `DEC-*` ships with a `CON-*` + `ACC-*` + `D-*`.
- **CON-08 — One home (§1.14).** SPEC-18 (card layout/emoji), SPEC-48 (anchor/busy/rename), SPEC-26 (dialog container), SPEC-47 (method list) cited, never re-normed.
- **CON-09 — Theme over hex.** New/changed colors MUST use theme tokens. No hardcoded hex.

## 3. Goal

### 3.1 Decisions (FINAL v1.1)

- **DEC-01 (filter bar).** Filter `SegmentedButtons` gains `style={{ borderRadius: 16 }}` — rounded segmented control with Paper's built-in active highlight. Value/buttons/`onValueChange` untouched.
- **DEC-02 (total card).** Total `Card` leaves the heavy reddish block: `backgroundColor` `errorContainer → primaryContainer`, text `onErrorContainer → onPrimaryContainer` (both lines), `borderRadius` `12 → 16`, `padding` `12 → 16`, gains `elevation: 1` (subtle M3 lift). Label (`Week`/`Month Total`) + amount copy untouched.
- **DEC-03 (upcoming cards + actions).** Upcoming `Card` gains `elevation: 1`; `borderRadius: 16` + `surface` bg retained. Actions row keeps layout; Pay `Button` stays `mode="outlined"` with its `theme` outline override byte-identical (v1.1 revert — color MUST NOT change) and gains `style={{ borderRadius: 12 }}` shape only; `compact` + `disabled={payBusy}` + `onPress` retained. Edit/delete `IconButton`s byte-identical (already subtle).
- **DEC-04 (badges).** All three badge containers go pill: `borderRadius` `4 → 12`, `paddingHorizontal` `6 → 8`, `paddingVertical` `2 → 4`. Colors/copy byte-identical (`OVERDUE` error/errorContainer; `DUE`/`RECEIVABLE` primary/primaryContainer; `AUTO-RENEW` surfaceVariant + tertiary bolt).
- **DEC-05 (Pay dialog options + polish).** Per SPEC-69 v1.1, payment methods use accessible Pressable options in the fixed two-column grid; the selected option has a checkmark and rounded border. Dialog `Title` retains `fontWeight: "700"` and centered text; Cancel `mode="text"`, Confirm `mode="contained"`, and the disabled guard remain unchanged.

### 3.2 Interaction matrix (FINAL v1.1)

| # | State | Behavior |
|---|---|---|
| 1 | Filter Week/Month/All | Rounded control; active segment highlighted by Paper; list + total filter unchanged |
| 2 | Week/Month filter | Sleek primary-tinted total card (elevated, 16px radius, balanced padding, soft label + bold amount) |
| 3 | Upcoming rows | Elevated 16px cards; Pay = outlined (color unchanged, v1.1) with rounded shape; pencil/trash = subtle icon buttons; pill badges |
| 4 | Pay dialog | Two-column method-option grid; selected method shows check + rounded border; Cancel text / Confirm filled; flow unchanged |

### 3.3 Acceptance criteria (FINAL v1.1)

Objective (jest source-text guards, `Platform.OS` = android/ios/web):

| ID | Check |
|---|---|
| ACC-01 | Filter `SegmentedButtons` carries `borderRadius: 16` |
| ACC-02 | Total card carries `primaryContainer` + `onPrimaryContainer` + `borderRadius: 16` + `padding: 16` + `elevation: 1`; `errorContainer` absent from the total block |
| ACC-03 | Upcoming card carries `elevation: 1` + `borderRadius: 16`; Pay button stays `mode="outlined"` (v1.1, color unchanged) + `borderRadius: 12` + `theme` outline override; edit/delete `IconButton`s retained |
| ACC-04 | Badges carry `borderRadius: 12` (pill) at all three sites; `OVERDUE`/`DUE`/`RECEIVABLE`/`AUTO-RENEW` copy + colors retained |
| ACC-05 | Pay-method options expose selected accessibility state and selected checkmark, and retain rounded styling; Title carries `fontWeight: "700"` + centered; Cancel `mode="text"` + Confirm `mode="contained"` retained |
| ACC-06 | `npm test` 0 failed; `npm run lint` clean; `npx tsc --noEmit` clean (user-run per §1.3) |

Subjective (reviewer-observed, Expo Go + web export):

- **ACC-S01:** Phone — rounded filter, sleek primary total card, elevated rows, outlined Pay (original color) with rounded shape, pill badges, Pay chips with check on selection.
- **ACC-S02:** Web desktop (`expo export --platform web`) — same, no full-bleed, no red-box, dialog capped via retained `styles.dialog`.

### 3.4 Deliverables (FINAL v1.1)

- **D-01 (`app/dues.tsx`):** DEC-01..DEC-05 style/prop keys only. Nothing else in the file.
- **D-02 (`utils/scheduledPolish.test.ts`):** ACC-01..ACC-05 × android/ios/web, including the SPEC-69 v1.1-compatible Pay-option assertions.
- **D-03 (journal):** `docs/savepoint.md` + `AGENTS.md` §3 entry.

## Glossary

| Term | Meaning |
|---|---|
| Pill badge | Fully-rounded status tag (`borderRadius: 12` + 8/4 padding) |
| Pay-method option grid | Two-column Pressable picker with accessible selected state, checkmark, and rounded border (detailed in SPEC-69 v1.1) |
| Outlined Pay | `Button mode="outlined"` with `theme` outline override (color unchanged, v1.1) + `borderRadius: 12` shape |

## References

- `app/dues.tsx:362,396-449,476-499,642-677` (blocks under change)
- `specs/18-scheduled-dues-fixes.md` (card layout owner)
- `specs/48-paid-due-visibility.md` (anchor/busy/rename owner)
- `specs/26-responsive-dialogs-and-clear-data-flow.md` §6 v1.4 (dialog container owner)
- `specs/47-due-payment-method-picker.md` (method list owner)
- `specs/69-pay-dialog-single-open-flicker-free.md` v1.1 (Pay/Receive dialog visual-design owner)
- `specs/64-transaction-details-polish.md` (polish/test pattern)
- `AGENTS.md §1` (spec-first, bare-minimum, one home, docs)
