# Spec 64: Transaction Details Screen Polish

| Field | Value |
|---|---|
| ID | SPEC-64 |
| Title | Center + cap details layout on desktop, polish hero card/icon/rows, format payment-method values |
| Status | **FINAL v1.0 for D-01..D-06** (marked by user 2026-10-07 — "update the spec if needed, mark it as FINAL, and code this for me"); **OD-T1 CALLED as option (a)** 2026-10-07 ("Global to bottom") — toast work lives in SPEC-05 §7 (canonical home), this file cross-references only |
| Owner | User (final authority) |
| Version | 1.0 |
| Scope | `app/transaction-details.tsx` layout/styles only (container cap, hero card + icon size, detail rows, one local value formatter) + `utils/formatMethod.ts` (new pure helper, named by D-04) + `utils/transactionDetails.test.ts` (new, named by D-05) |
| Non-goals | Data fetching, edit/delete flows, legacy-ID gating, navigation (`safeGoBack`), toast positioning (OD-T1 OPEN); storage keys; `wallet-api` contract; new dependencies; routes |
| Normative source | This file. `AGENTS.md §4` is a pointer only. File+symbol cites are normative; `:line` numbers are hints only. |

> History: v1.0 (2026-10-07) — user order on the desktop web screenshot (`localhost:8081/transaction-details`): full-width stretched cards, small hero icon, raw `bank_transfer` value, centered toast over the card. New spec number justified: no existing spec owns the details-screen layout (§1.14 one-home; SPEC-30/31 own only the hero icon's color + icon-name mapping, both retained as constraints).

## Terminology (RFC 2119)

The keywords **MUST**, **MUST NOT**, **SHOULD**, and **MAY** in this spec are to be interpreted as described in RFC 2119. Informative prose (examples, "today", "currently") is non-normative unless restated as a requirement.

## 1. Context

### 1.1 Problem

On desktop viewports the Transaction Details screen stretches full-width: hero card and details card span the whole window, the hero icon reads small, detail rows are loose, the payment method renders its raw storage value (`bank_transfer`), and the feedback toast floats centered over the card content.

### 1.2 Evidence (read-only, 2026-10-07)

- `app/transaction-details.tsx:212-280` — `container` (`flex: 1`, `paddingHorizontal: 16`, hardcoded `#f9fafb` bg); `scrollContainer` (`flexGrow: 1` only — no width cap); `heroCard` (`borderRadius: 20`, no elevation key); `heroContent` (`padding: 24` — already meets the padding ask); `amountIcon` (64×64, `size={32}` icon); `detailRow` (key-value + `borderBottomWidth: 1` dividers, `marginBottom: 16` on every row incl. the last); payment method renders `{transaction.paymentMethod || "Cash"}` verbatim (`:185-190`).
- No formatter exists in-tree for method values (`bank_transfer` appears only as an edit-form dropdown value and a chart color key).
- The screenshot toast ("Transaction updated successfully.") is the **global** `ToastContext` Snackbar (`context/ToastContext.tsx:27-45` — `wrapperStyle` full-height centering per SPEC-05 §5, navy skin per §6), fired from the edit screen. It is NOT owned by this screen.

## 2. Constraints (normative)

- **CON-01 — Bare-minimum (§1.11).** Only `D-*` files MAY change. No data-flow, writer, gating, or navigation change.
- **CON-02 — Retained behavior.** SPEC-30 (hero icon color `#16A34A`/`#DC2626`), SPEC-31 (`renderCategoryIcon` mapping), SPEC-45 (`isLegacyId`/`isScheduled` writer gating), SPEC-42 (`safeGoBack`) MUST stay byte-identical. Only the icon's box size + glyph size MAY change.
- **CON-03 — No new dependencies (§1.12).** RN + Paper + theme only.
- **CON-04 — Cross-platform (§1.5).** Android + iOS + Web; no native-only imports; no Node-only APIs in app code.
- **CON-05 — Vercel-deployable + Expo Go safe (§1.6/§1.7).** Web export clean; no red-box on import.
- **CON-06 — No contract break (§1.4).** Storage keys, API contract, routes unchanged.
- **CON-07 — TDD cross-platform (§1.10).** jest × android/ios/web + user-run Expo Go + web-export checks.
- **CON-08 — One home (§1.14).** SPEC-30/31 (icon color/name), SPEC-05 (toast position/skin) cited, never re-normed. Toast slice stays OPEN per §3.4.
- **CON-09 — Theme over hex where themed.** New/changed colors MUST use theme tokens unless matching an existing hardcoded row token byte-identically (CON-02).

## 3. Goal

### 3.1 Decisions (FINAL v1.0)

- **DEC-01 (centered cap).** `scrollContainer` gains `width: "100%"` + `maxWidth: 600` + `alignSelf: "center"` (Appbar stays full-width; phones fluid, desktop capped). `container` padding/bg untouched.
- **DEC-02 (hero card).** `heroCard` gains `elevation: 2` (Android depth; iOS uses Paper's default shadow). `borderRadius: 20` + `heroContent padding: 24` retained. `amountIcon` box `64 → 80` (square, `borderRadius: 16`), glyph `size 32 → 40`; colors, bg, `marginBottom` retained.
- **DEC-03 (rows).** `detailRow` keeps key-value + divider pattern; value gains `textAlign: "right"` + `flexShrink: 1` (long values wrap instead of pushing); the LAST row (`CATEGORY`) drops its divider + bottom margin (no trailing hairline/gap inside the card). All other rows byte-identical.
- **DEC-04 (formatter).** New pure `utils/formatMethod.ts` exporting `formatMethodLabel(value: string): string` — split on `/[_\-\s]+/`, capitalize each token's first letter, join with single spaces (`"bank_transfer" → "Bank Transfer"`, `"cash" → "Cash"`). Details screen applies it as `{formatMethodLabel(transaction.paymentMethod) || "Cash"}` — hmm, precise wiring: `{transaction.paymentMethod ? formatMethodLabel(transaction.paymentMethod) : "Cash"}` (empty/whitespace-only input returns `""`, so the `"Cash"` fallback is preserved at the call site). No other screen touches it.

### 3.2 Interaction matrix (FINAL v1.0)

| # | State | Behavior |
|---|---|---|
| 1 | Desktop wide | Content column capped at 600, centered; Appbar full-width |
| 2 | Phone narrow | Fluid full-width minus 16px gutters (unchanged look, tidier rows) |
| 3 | Any method value | Raw ids render titled (`bank_transfer → Bank Transfer`); unset renders `Cash` |
| 4 | Last row | No divider, no trailing gap; other rows unchanged |

### 3.3 Acceptance criteria (FINAL v1.0)

Objective (jest, `Platform.OS` = android/ios/web):

| ID | Check |
|---|---|
| ACC-01 | `scrollContainer` carries `maxWidth: 600` + `alignSelf: "center"` + `width: "100%"`; Appbar block untouched (source-text guards) |
| ACC-02 | `heroCard` carries `elevation: 2`; icon box `80` + glyph `size={40}`; icon colors + `renderCategoryIcon` + `padding: 24` retained (source-text guards) |
| ACC-03 | Value style carries `textAlign: "right"` + `flexShrink: 1`; last (CATEGORY) row renders without divider/margin (source-text guards) |
| ACC-04 | `formatMethodLabel("bank_transfer") === "Bank Transfer"`, `("cash") === "Cash"`, `("  ") === ""`; details screen calls it with the `"Cash"` fallback intact (unit + guard) |
| ACC-05 | `npm test` 0 failed; `npm run lint` clean; `npx tsc --noEmit` clean (user-run per §1.3) |

Subjective (reviewer-observed, Expo Go + web export):

- **ACC-S01:** Desktop web — column capped/centered, hero elevated with larger icon, rows tidy with dividers, `Bank Transfer` titled. Phone — same content, fluid, nothing crowded.

### 3.4 Toast slice — OPEN (OD-T1, §1.13 overlap gate)

The requested `bottom: 24` toast position overlaps **SPEC-05 §5/§6 (FINAL)**, which norms the global toast as centered + navy. Per §1.13 the gate FAILS on overlap — **no toast code until the user calls OD-T1**. Options:

- **(a) Amend SPEC-05 (global):** toast moves to bottom on **all** surfaces (details, edit, dues, …). Widest blast radius; contradicts the user's own centered/navy FINAL orders — needs explicit override.
- **(b) Details-local bottom Snackbar:** new local `Snackbar` in `transaction-details.tsx` (`bottom: 24`) for messages **this screen fires** (delete success/failure). Disclosed limit: the screenshot's `"Transaction updated successfully."` is fired by the **edit** screen through the global system, so it would stay centered under (b).
- **(c) Keep centered:** decline the toast slice; SPEC-05 stands.

### 3.5 Deliverables (FINAL v1.0, toast excluded)

- **D-01 (`app/transaction-details.tsx`):** DEC-01 container cap keys. Nothing else in this slice.
- **D-02 (`app/transaction-details.tsx`):** DEC-02 hero elevation + icon size keys. Nothing else in this slice.
- **D-03 (`app/transaction-details.tsx`):** DEC-03 row value keys + last-row divider/margin drop. Nothing else in this slice.
- **D-04 (`utils/formatMethod.ts` new + one-line call-site wiring):** DEC-04. No other caller.
- **D-05 (`utils/transactionDetails.test.ts` new):** ACC-01..ACC-04 × android/ios/web. No other test file touched.
- **D-06 (journal):** `docs/savepoint.md` + `AGENTS.md` §3 entry.

## Glossary

| Term | Meaning |
|---|---|
| Centered cap | `width 100% + maxWidth 600 + alignSelf center` content column (SPEC-26 dialog pattern, cited only) |
| Hero card | Top summary card (icon + amount + type + category) |
| Raw method value | Storage/API id such as `bank_transfer` (edit-form dropdown value) |
| Global toast | `ToastContext` Snackbar — SPEC-05 home, centered + navy |

## References

- `app/transaction-details.tsx:212-280` (styles under change)
- `context/ToastContext.tsx:27-45` (global toast — SPEC-05 home, untouched)
- `specs/30-fix-transaction-details-hero-icon-and-revert-dashboard-green.md` (icon color owner)
- `specs/31-unify-transaction-category-icon-in-details.md` (icon mapping owner)
- `specs/05-multi-device-behavior.md` §5/§6 (toast position/skin owner)
- `AGENTS.md §1` (spec-first, bare-minimum, one home, docs)
