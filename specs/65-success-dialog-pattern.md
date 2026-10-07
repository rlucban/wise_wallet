# Spec 65: Success Dialog Pattern (Delete + Edit)

| Field | Value |
|---|---|
| ID | SPEC-65 |
| Title | Delete/edit success feedback as a white centered success dialog (ConfirmDialog success tone), not a toast |
| Status | **FINAL v1.0** (marked by user 2026-10-07 — "a final / code this for me", option A) |
| Owner | User (final authority) |
| Version | 1.0 |
| Scope | `components/ConfirmDialog.tsx` (new optional `tone` prop, defaults = current look) + success-path wiring in `app/transaction-details.tsx` (delete) + `app/edit-transaction.tsx` (edit) + `utils/successDialog.test.ts` (new, named by D-04) + consequential success-assertion rewrites in the two SPEC-36 feedback tests |
| Non-goals | Failure paths (delete error toast, edit error `Alert`); all other ConfirmDialog callers; global toast (SPEC-05 home); storage/API/routes/deps |
| Normative source | This file. `AGENTS.md §4` is a pointer only. File+symbol cites are normative; `:line` numbers are hints only. |

> History: v1.0 (2026-10-07) — user order on the details screenshot: delete/edit success "dapat ganito rin" as the white centered Delete-confirm dialog (option A chosen over per-screen local dialogs; the red error toast confirmed as design-reference only, source not in-tree). New spec number justified: no spec owns a success-dialog pattern (§1.14 one-home; SPEC-26 owns dialog responsive tokens only, retained).

## Terminology (RFC 2119)

The keywords **MUST**, **MUST NOT**, **SHOULD**, and **MAY** in this spec are to be interpreted as described in RFC 2119. Informative prose (examples, "today", "currently") is non-normative unless restated as a requirement.

## 1. Context

### 1.1 Problem

Delete/edit success currently fires the navy bottom toast (`showToast("Transaction deleted/updated successfully.")` + immediate back). The user wants success feedback to read as the white centered dialog (same card language as the Delete confirmation), not a transient toast.

### 1.2 Evidence (read-only, 2026-10-07)

- `components/ConfirmDialog.tsx:1-58` — always renders Cancel + red (`error`) contained confirm, default icon `alert-outline`; 8 callers pass no tone concept (verified by grep `<ConfirmDialog` — settings ×2, archived-allocations, dues, category-settings, payment-methods, savings, transaction-details). No test asserts its internals (grep `ConfirmDialog` in `utils/*.test.ts` = zero hits).
- `app/transaction-details.tsx:53-64` — delete success = `showToast` + `safeGoBack`; failure = error toast + stay (SPEC-36 D-W-10).
- `app/edit-transaction.tsx:154-173` — save success = `showToast` + `safeGoBack`; failure = `Alert` with resolved message (SPEC-36 D-W-14).
- Success icon `check-circle-outline` verified present in the installed MCI glyphmap (`MaterialCommunityIcons.json:1529`).

### 1.3 Overlap reconciliation (§1.13/§1.14)

- SPEC-36 D-W-10/D-W-14 (success toast + back) are **superseded for SUCCESS display only**; failure paths, server-message preference, and gating stay byte-identical.
- SPEC-26 (dialog responsive tokens `maxWidth 480/90%/center`) and SPEC-05 (global toast for all other flows) are cited, never re-normed.

## 2. Constraints (normative)

- **CON-01 — Bare-minimum (§1.11).** Only `D-*` files MAY change. No data-flow, validation, gating, or navigation-destination change.
- **CON-02 — Zero behavior change for existing callers.** The 6 non-target ConfirmDialog callers pass no `tone` and MUST render byte-identically (danger defaults).
- **CON-03 — No new dependencies (§1.12).** Paper `Dialog` + theme only.
- **CON-04 — Cross-platform (§1.5).** Android + iOS + Web; no native-only imports.
- **CON-05 — Vercel-deployable + Expo Go safe (§1.6/§1.7).** Web export clean; no red-box.
- **CON-06 — No contract break (§1.4).** Storage, API, routes unchanged.
- **CON-07 — TDD cross-platform (§1.10).** jest × android/ios/web + user-run Expo Go + web-export checks.
- **CON-08 — One home (§1.14).** SPEC-26/36/05 cited, never re-normed beyond the stated SUCCESS-display supersession.

## 3. Goal

### 3.1 Decisions (FINAL v1.0)

- **DEC-01 (tone prop).** `ConfirmDialog` gains optional `tone?: "danger" | "success"` (default `"danger"`). Danger = current rendering verbatim (icon default `alert-outline`, Cancel shown, confirm `buttonColor: theme.colors.error`). Success = icon default `check-circle-outline`, Cancel hidden, confirm `buttonColor: theme.colors.primary` with caller-passed `confirmLabel`. Responsive tokens (`maxWidth 480/90%/center`, centered title/message/actions) identical in both tones.
- **DEC-02 (delete wiring).** `transaction-details.tsx`: new `successVisible` state. Delete success → close confirm + open success dialog (`tone="success"`, title `"Deleted Successfully"`, message `"The transaction has been deleted."`, `confirmLabel="OK"`); OK **and** backdrop-dismiss both run one handler (hide + `safeGoBack` — the row is gone, so dismiss MUST NOT strand the user on a deleted transaction). `showToast("Transaction deleted successfully.")` deleted; failure path (error toast + stay) retained.
- **DEC-03 (edit wiring).** `edit-transaction.tsx`: new `successVisible` state. Save success → open success dialog (`tone="success"`, title `"Updated Successfully"`, message `"Your changes have been saved."`, `confirmLabel="OK"`); dismiss (OK or backdrop) → hide + `safeGoBack`. `showToast("Transaction updated successfully.")` deleted; the now-unused `useToast` import/binding removed (lint-required, same D). Failure `Alert` retained.
- **DEC-04 (untouched callers).** The other 6 call sites pass no `tone` (danger defaults apply, files untouched).

### 3.2 Interaction matrix (FINAL v1.0)

| # | State | Behavior |
|---|---|---|
| 1 | Delete succeeds | Confirm closes → white success dialog (check icon, OK) → OK/backdrop → back to previous screen |
| 2 | Delete fails | Error toast, stay on screen (unchanged) |
| 3 | Edit save succeeds | White success dialog (check icon, OK) → OK/backdrop → back |
| 4 | Edit save fails | `Alert` with resolved message (unchanged) |
| 5 | Any other ConfirmDialog | Red danger look, Cancel + confirm (unchanged) |

### 3.3 Acceptance criteria (FINAL v1.0)

Objective (jest, `Platform.OS` = android/ios/web):

| ID | Check |
|---|---|
| ACC-01 | `ConfirmDialog` carries `tone` with `"danger"` default; danger branch keeps `theme.colors.error` + Cancel; success branch uses `theme.colors.primary` + hides Cancel + defaults to `check-circle-outline` (source-text guards) |
| ACC-02 | Details delete success opens `tone="success"` dialog (`"Deleted Successfully"` + `OK`) and backs on dismiss with zero deleted-success `showToast`; failure toast + gating retained (source-text guards) |
| ACC-03 | Edit save success opens `tone="success"` dialog (`"Updated Successfully"` + `OK`) and backs on dismiss with zero updated-success `showToast`; failure `Alert` + validators retained (source-text guards) |
| ACC-04 | The other 6 call sites contain zero `tone=` (danger defaults intact); `useToast` imports retained on both screens (failure paths still toast) |
| ACC-05 | `npm test` 0 failed; `npm run lint` clean; `npx tsc --noEmit` clean (user-run per §1.3) |

Subjective (reviewer-observed, Expo Go + web export):

- **ACC-S01:** Phone + web, light + dark: delete → white centered success dialog (check icon, single OK) → OK/backdrop lands back; edit ditto. Danger dialogs (delete confirm, clear-data, dues) unchanged everywhere.

### 3.4 Deliverables (FINAL v1.0)

- **D-01 (`components/ConfirmDialog.tsx`):** `tone` prop per DEC-01. Nothing else in the file.
- **D-02 (`app/transaction-details.tsx`):** DEC-02 (state + success dialog + handler swap). Failure toast, gating, layout (SPEC-64) untouched.
- **D-03 (`app/edit-transaction.tsx`):** DEC-03 (state + success dialog + handler swap). Validators, failure `Alert`, form untouched.
- **D-04 (tests):** new `utils/successDialog.test.ts` (ACC-01..ACC-04 × android/ios/web) + consequential rewrites of the success assertions in `utils/transactionDeleteFeedback.test.ts` + `utils/transactionEditFeedback.test.ts` (failure assertions retained).
- **D-05 (journal):** `docs/savepoint.md` + `AGENTS.md` §3 entry.

## Glossary

| Term | Meaning |
|---|---|
| Success tone | `ConfirmDialog` `tone="success"`: check icon, primary OK button, no Cancel |
| Danger tone | Default: alert icon, Cancel + red confirm (today's look, all current callers) |
| Success dismiss | OK or backdrop tap on a success dialog (always navigates back) |

## References

- `components/ConfirmDialog.tsx:1-58` (component under extension)
- `app/transaction-details.tsx:53-64` (delete flow), `app/edit-transaction.tsx:154-173` (save flow)
- `specs/26-responsive-dialogs-and-clear-data-flow.md` (dialog tokens owner)
- `specs/36-web-platform-invariants.md` §9 (D-W-10/D-W-14 feedback owners — success display superseded)
- `specs/05-multi-device-behavior.md` §7 (global toast owner — other flows untouched)
- `AGENTS.md §1` (spec-first, bare-minimum, one home, docs)
