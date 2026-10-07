# Spec 69: Pay Dialog Single-Open + Flicker-Free Open

| Field | Value |
|---|---|
| ID | SPEC-69 |
| Title | Pay/Receive dialog presentation and single-open behavior |
| Status | **FINAL v1.3** (user approved "FINAL, code all five dialogs" 2026-10-07) |
| Owner | User (final authority) |
| Version | 1.3 |
| Scope | `app/dues.tsx` Pay/Receive open path and confirmation + shared alert modal shells, presentation, and `utils/payDialogOpen.test.ts` |
| Non-goals | Pay-method list contents and pass-through (SPEC-47), alert content/callback/validation flow, Pay-row button color (SPEC-68 v1.1: outlined stays), balance validation + `recordTransaction` (SPEC-46/48), storage keys, `wallet-api` contract, routes, dependencies |
| Normative source | This file. `AGENTS.md §4` is a pointer only. File+symbol cites are normative; `:line` numbers are hints only. |

> History: v0.1 DRAFT (2026-10-07) — user screenshots show two overlapping `Pay "Testing"?` dialogs + flicker on web (`localhost:8081/dues`). New number justified: no existing spec owns the pay-open sequence (§1.14 one-home; SPEC-47/48/26/68 cited, never re-normed).
>
> v1.0 FINAL (2026-10-07) — user calls: OD-1 (a) fetch-then-open, OD-2 dedicated `payOpening` flag (SPEC-48 `payBusy` untouched). No other change from v0.1.
>
> v1.1 FINAL (2026-10-07) — user requested a polished Receive/Pay Confirmation Modal and explicitly authorized marking the spec FINAL and coding it. Adds presentation requirements in §4. This spec is the canonical home for the Pay/Receive modal's visual design; it supersedes SPEC-26 v1.4's Pay-dialog container-only restriction and SPEC-47's unspecified picker presentation only for this modal. Their other requirements remain unchanged.
>
> v1.2 FINAL (2026-10-07) — user screenshot review requested a darker amount badge. The badge now uses the theme primary/onPrimary pair, matching the Confirm action and preserving contrast; other v1.1 presentation and behavior remain unchanged.
>
> v1.3 FINAL (2026-10-07) — user approved centered RN modal shells for the Pay/Receive and shared dues alert dialogs. Existing layout, copy, open/payment/alert behavior, and responsive width remain unchanged.

## Terminology (RFC 2119)

The keywords **MUST**, **MUST NOT**, **SHOULD**, and **MAY** in this spec are to be interpreted as described in RFC 2119. Informative prose (examples, "today", "currently") is non-normative unless restated as a requirement.

## 1. Context

### 1.1 Problem

Tapping Pay shows the `Pay "…"?` dialog twice-overlapping with a visible flicker, instead of one stable dialog.

### 1.2 Evidence (read-only, 2026-10-07)

- Exactly ONE Pay `Dialog` exists in-tree (`app/dues.tsx:645`, `visible={!!payTarget}`; grep `Dialog visible` hits only `:645` Pay + `:682` alert). A second static instance is therefore ruled out — the doubling is sequential (open → re-render → resize), not structural.
- `openPayDialog` (`app/dues.tsx:241-255`) sets state in 3 steps: `setPayTarget(due)` (dialog mounts immediately with the 2-item `FALLBACK_PAY_METHODS`), `setPayMethod("Cash")`, then after `await authFetch("paymentMethods")` swaps to the 6-item API list (`setPayMethods` + `setPayMethod(data[0].name)`). Both screenshots show all 6 chips (Cash/BPI Debit/UnionBank/GCash/Maya/Visa Card), i.e. post-fetch frames. Each step re-renders; the 2→6 chip swap re-measures and re-centers the Paper `Dialog` on web, which reads as flicker/doubling mid-animation.
- No busy guard covers the OPEN path: SPEC-48 guards Confirm/`recordTransaction` (`payBusy`), but the row Pay button (`:438-446`) has only `disabled={payBusy}` — `payBusy` is false while `openPayDialog` is fetching, so double-taps re-fire the whole fetch-swap sequence.

### 1.3 Decisions (FINAL v1.0)

- **OD-1 (a) fetch-then-open.** Dialog mounts once with the final list; brief disabled/loading on the tapped Pay button covers the fetch delay.
- **OD-2 dedicated `payOpening` flag.** New `useState(false)` in `DuesScreen`; SPEC-48 `payBusy` (Confirm/`recordTransaction`) untouched.

## 2. Constraints (normative)

- **CON-01 — Bare-minimum (§1.11).** Only `D-*` files MAY change. No method-list, validation, anchor, busy-settle, color, copy, or navigation change.
- **CON-02 — Retained behavior.** SPEC-68 v1.1 (Pay `outlined` color, `r12` shape), SPEC-47 (API list + `Cash`/`Unknown` fallback), SPEC-48 (`payBusy` on Confirm/`recordTransaction`), SPEC-26 v1.4 (responsive bounds), SPEC-46 (category sanitize) MUST stay byte-identical except the open-sequence keys in `DEC-*` and v1.3 shells. Insufficient-balance + success alert content/callback flow untouched.
- **CON-03 — No new dependencies (§1.12).** RN + Paper + theme only. No new imports.
- **CON-04 — Cross-platform (§1.5).** Android + iOS + Web; no native-only imports; no Node-only APIs in app code.
- **CON-05 — Vercel-deployable + Expo Go safe (§1.6/§1.7).** Web export clean; no red-box on import.
- **CON-06 — No contract break (§1.4).** Storage keys, API contract, routes unchanged.
- **CON-07 — TDD cross-platform (§1.10).** jest × android/ios/web + user-run Expo Go + web-export checks. No platform-only behavior: every `DEC-*` ships with a `CON-*` + `ACC-*` + `D-*`.
- **CON-08 — One home (§1.14).** SPEC-47/48/26/68 cited, never re-normed.
- **CON-09 — Theme over hex.** Any new color MUST use theme tokens.
- **CON-10 — Modal visual owner (v1.1).** The Pay/Receive modal presentation MUST follow §4. This supersedes only prior constraints on this modal's presentation; API/fallback behavior (SPEC-47), responsive width cap (SPEC-26), and open/confirm behavior (§3) remain in force.

## 3. Goal (FINAL v1.0)

### 3.1 Decisions (FINAL v1.0)

- **DEC-01 (fetch-then-open, recommended).** `openPayDialog` MUST `await` the `paymentMethods` fetch (falling back to `FALLBACK_PAY_METHODS` on `!ok`/throw, logic unchanged) BEFORE the first `setPayTarget(due)`. The dialog therefore mounts exactly once, already holding the final list. The interim `setPayMethod("Cash")` default goes away; selection is set once from the resolved list.
- **DEC-02 (open busy, dedicated flag).** New `payOpening` state (`useState(false)`): set `true` on entry (second tap returns early while `true`), `false` in `finally` on settle including fetch failure. Row Pay buttons gain `disabled={payBusy || payOpening}` (`payBusy` retained for SPEC-48). `payBusy` itself untouched.
- **DEC-03 (single instance).** No duplicate Pay/Receive shell may be added; `visible={!!payTarget}` stays the sole Pay/Receive mount condition. v1.3 changes the shell component to RN `Modal` without changing this condition.

### 3.2 Interaction matrix (FINAL v1.0)

| # | State | Behavior |
|---|---|---|
| 1 | Tap Pay (online, methods OK) | Brief disabled/loading on the tapped Pay button → ONE dialog with the 6-method list, no resize jump |
| 2 | Tap Pay (offline/API fail) | Same single open with `Cash`/`Unknown` fallback (SPEC-47 fallback retained) |
| 3 | Double-tap Pay | Exactly one fetch + one dialog |
| 4 | Confirm flow | Unchanged (SPEC-48 `payBusy`, validation, alert dialogs) |

### 3.3 Acceptance criteria (FINAL v1.0)

Objective (jest source-text guards, `Platform.OS` = android/ios/web):

| ID | Check |
|---|---|
| ACC-01 | First `setPayTarget(` in `openPayDialog` occurs AFTER the `authFetch("paymentMethods")` resolution (order guard) |
| ACC-02 | Dedicated `payOpening` state exists; row Pay button carries `disabled={payBusy \|\| payOpening}`; flag set `true` on entry with early return, reset `false` in `finally` (source-text guards) |
| ACC-03 | Exactly one Pay/Receive shell is controlled by `visible={!!payTarget}`; no Paper `Dialog` wrapper remains for that shell (count guard) |
| ACC-04 | `FALLBACK_PAY_METHODS` + `setPayMethod(data[0].name)` fallback logic retained; Pay `outlined` + `theme` + `r12` retained |
| ACC-05 | `npm test` 0 failed; `npm run lint` clean; `npx tsc --noEmit` clean (user-run per §1.3) |

Subjective (reviewer-observed, Expo Go + web export):

- **ACC-S01:** Web desktop — tap Pay → one stable dialog, no double, no flicker; double-tap → still one dialog.
- **ACC-S02:** Phone (Expo Go) — same; offline → single dialog with `Cash`/`Unknown`.

### 3.4 Deliverables (FINAL v1.0)

- **D-01 (`app/dues.tsx`):** DEC-01..DEC-03 open-sequence keys only. Nothing else in the file.
- **D-02 (`utils/payDialogOpen.test.ts` new):** ACC-01..ACC-04 × android/ios/web. No other test file touched.
- **D-03 (journal):** `docs/savepoint.md` + `AGENTS.md` §3 entry.

## 4. v1.1 Amendment — Pay/Receive Confirmation Modal Presentation (FINAL)

### 4.1 Goal

Present a clear title and amount hierarchy, evenly aligned payment-method choices, and distinct bottom actions while retaining the existing responsive dialog width and all pay behavior.

### 4.2 Constraints

- **CON-11 — Header and amount.** The title MUST be bold at `fontSize: 20`. The due amount MUST be prominent in a summary badge, not tiny grey supporting text. The badge MUST use `theme.colors.primary` for its fill and `theme.colors.onPrimary` for both label and amount text.
- **CON-12 — Method grid.** Methods MUST render in a two-column wrapping grid with `flexDirection: "row"`, `flexWrap: "wrap"`, `gap: 10`, and `justifyContent: "space-between"`. Each option MUST have consistent width and height. The selected option MUST have a visible primary-colored border/fill and a checkmark.
- **CON-13 — Container and actions.** The Pay/Receive dialog MUST use 24px internal padding, 20px rounded corners, and a subtle shadow. Cancel and Confirm MUST be aligned in a bottom action row with standard horizontal spacing. The existing responsive `maxWidth: 480`, `width: "90%"`, and centered alignment MUST remain.
- **CON-14 — Scope preservation.** Payment method loading/fallback/selection, transaction submission, `payBusy`/`payOpening`, alert dialog, and Pay-row button styling MUST remain unchanged. Colors MUST use theme tokens. No dependencies or native-only imports.
- **CON-15 — Cross-platform and TDD.** Android, iOS, and Web MUST retain equivalent selection and modal behavior; Jest source guards MUST run under each mocked `Platform.OS`. Visual checks are manual in Expo Go and web export.

### 4.3 Platform Matrix and Acceptance

| Platform | Objective checks | Subjective reviewer checks |
|---|---|---|
| Android | ACC-06..ACC-09 source guards pass under `Platform.OS="android"` | ACC-S03: In Expo Go, title and amount are easy to scan, two-column methods align, selection is obvious, and buttons fit inside the modal. |
| iOS | ACC-06..ACC-09 source guards pass under `Platform.OS="ios"` | ACC-S03: same visual checks in Expo Go on iOS. |
| Web | ACC-06..ACC-09 source guards pass under `Platform.OS="web"` | ACC-S04: On desktop and narrow viewport, the modal stays centered and capped; method grid and actions do not overflow. |

| ID | Objective acceptance |
|---|---|
| ACC-06 | Pay/Receive title has `fontSize: 20` and bold weight; amount summary uses `theme.colors.primary` fill with `theme.colors.onPrimary` text. |
| ACC-07 | Method options use the specified wrapping two-column grid, consistent dimensions, and visible selected border/fill plus checkmark. |
| ACC-08 | Pay dialog has 24px internal padding, 20px corner radius, subtle shadow, preserves the 480px/90% responsive cap, and uses a spaced bottom action row. |
| ACC-09 | Existing open/fallback/confirm behavior guards remain valid; `npm run lint`, `npx jest utils/payDialogOpen.test.ts`, and `npx tsc --noEmit` pass (user-run per §1.3). |

### 4.4 Deliverables

- **D-04 (`app/dues.tsx`):** Restyle only the Pay/Receive `Dialog` and add the required themed option-grid styles. Preserve behavior and the alert dialog.
- **D-05 (`utils/payDialogOpen.test.ts`):** Extend existing Android/iOS/Web guards for ACC-06..ACC-08; preserve existing SPEC-69 guards.
- **D-06 (journal):** Update `docs/savepoint.md` and `AGENTS.md` §3.

## Glossary

| Term | Meaning |
|---|---|
| Fetch-then-open | `authFetch("paymentMethods")` resolves before the first `setPayTarget` — one mount, final list |
| Open busy | Row Pay disabled via dedicated `payOpening` flag while the open-fetch is in flight (SPEC-48 Confirm `payBusy` untouched) |
| Sequential doubling | Flicker from mount → re-render → resize, not a second `Dialog` instance |
| Pay/Receive modal | The sole `Dialog` controlled by `payTarget`, for both income and expense dues |

## References

- `app/dues.tsx:241-255` (open sequence), `:438-446` (row Pay), `:644-679` (sole Pay `Dialog`)
- `specs/47-due-payment-method-picker.md` (method list owner)
- `specs/48-paid-due-visibility.md` (Confirm busy owner)
- `specs/26-responsive-dialogs-and-clear-data-flow.md` §6 v1.4 (dialog container owner)
- `specs/68-scheduled-screen-material3-polish.md` v1.1 (Pay color/shape owner)
- `specs/26-responsive-dialogs-and-clear-data-flow.md` v1.4 (responsive width cap retained; Pay visual scope superseded by §4 only)
- `specs/47-due-payment-method-picker.md` (method data and behavior retained; presentation governed by §4)
- `AGENTS.md §1` (spec-first, bare-minimum, one home, docs)

## 5. v1.3 Amendment — Center Scheduled Confirmation and Alert Dialogs (FINAL)

### 5.1 Context

The user's iPhone screenshots show both the Pay/Receive confirmation (`payTarget`) and the Insufficient Balance alert (`alertDialog.visible`) Paper dialogs anchored near the bottom of the screen. SPEC-69 owns these two Scheduled dialogs; SPEC-26 v1.4 responsive bounds, SPEC-47 picker behavior, SPEC-48 pay guard, and SPEC-46 transaction behavior remain constraints. This amendment supersedes §3 DEC-03/ACC-03 and §4 D-04 only as to the native modal shell; content and behavior remain governed by those sections.

### 5.2 Constraints

- **CON-16 — Shell-only scope.** Only the shells for the Pay/Receive confirmation and the shared dues `alertDialog` MAY change. Open/fetch sequencing, payment selection, all alert titles/copy, dismiss and confirm callbacks, validation, and pay/transaction behavior MUST remain unchanged.
- **CON-17 — Centered RN shell.** Both dialogs MUST use RN core `Modal` with transparent full-screen overlay, centered card, backdrop tap handling, and `onRequestClose` wired to the existing dismiss behavior. The card MUST preserve SPEC-26 responsive bounds (`width: "90%"`, `maxWidth: 480`, centered alignment), surface theme, and fit the phone viewport.
- **CON-18 — Cross-platform/TDD.** Android, iOS, and Web MUST use the same shell behavior. No new dependency or native-only import. Jest guards MUST cover all three mocked `Platform.OS` values; Expo Go phone + Web export checks remain user-run.

### 5.3 Goal and Acceptance

| Platform | Objective | Subjective reviewer check |
|---|---|---|
| Android | ACC-10 passes with `Platform.OS="android"` | ACC-S05: Pay/Receive and Insufficient Balance cards are centered on the phone; method grid/actions fit; backdrop and Android back dismiss correctly. |
| iOS | ACC-10 passes with `Platform.OS="ios"` | ACC-S05: same checks in Expo Go on iPhone; neither dialog is bottom-anchored. |
| Web | ACC-10 passes with `Platform.OS="web"` | ACC-S06: both dialogs stay centered and capped at 480px; existing alert content and payment flow work. |

| ID | Check |
|---|---|
| ACC-10 | Pay/Receive and shared dues alert use centered RN shells and no longer render as Paper `Dialog`s; one Pay/Receive shell remains, with existing open/fallback/selection/confirm guards intact. |
| ACC-11 | User-run `npx jest utils/payDialogOpen.test.ts`, full Jest, lint, TypeScript, Expo Go, and Web export pass. |

### 5.4 Deliverables

- **D-07 (`app/dues.tsx`):** Convert only the Pay/Receive and shared alert modal shells to the centered RN shell. Keep content, callbacks, and business logic unchanged.
- **D-08 (`utils/payDialogOpen.test.ts`):** Update the Paper-Dialog-specific count guard and add RN-shell guards for ACC-10 × Android/iOS/Web; retain all open/payment behavior guards.
- **D-09 (journal):** Update `docs/savepoint.md` and `AGENTS.md` §3.
