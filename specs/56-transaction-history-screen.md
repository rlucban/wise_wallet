# Spec 56: Transaction History Screen for See All

| Field | Value |
|---|---|
| ID | SPEC-56 |
| Title | See All navigates to a GCash-style read-only Transaction History statement with receipt modal |
| Status | **FINAL v1.2** (marked by user 2026-10-06; implementable per AGENTS.md §1.1 — v1.0/v1.1 shipped as specified) |
| Owner | User (final authority) |
| Version | v1.2 |
| Scope | v1.0 (shipped): See All retarget + `app/transactions.tsx` + Stack registration + header back button. v1.1 (shipped): statement rebuild (month grouping + rich rows + receipt modal). v1.2: receipt-modal deletion + static rows (display-only delta, §5) |
| Non-goals | History filters/search/sort; `transaction-details.tsx` change; Home rows change; `Transaction` model change; dependencies; storage/API/extra routes |
| Normative source | This file. `AGENTS.md §4` is a pointer only. File+symbol cites are normative; `:line` numbers are hints only. |

> History: v1.0 FINAL + implemented 2026-10-06 (flat newest-first list, tap → details). v1.1 amends the screen only (same route): GCash-style month-grouped read-only statement + receipt modal. `specs/57-gcash-statement-history.md` (DRAFT, never FINAL) is SUPERSEDED by this v1.1 and MUST NOT be implemented — one home per §1.14. v1.2 FINAL + implementable (see §5).

## Terminology (RFC 2119)

The keywords **MUST**, **MUST NOT**, **SHOULD**, and **MAY** in this spec are to be interpreted as described in RFC 2119. Informative prose (examples, "today", "currently") is non-normative unless restated as a requirement.

## 1. Context

### 1.1 Problem

Home's Recent Activity shows the 6 newest transactions (`app/(tabs)/index.tsx:108-111` sorts newest-first then `slice(0, 6)`) but its See All button routes to `/reports` (`index.tsx:250`), which is a charts screen — not a transaction list. There is no `/transactions` route (glob `app/transactions*`: no match), so the full history has no home.

### 1.2 Precedents (read-only)

- New-screen pattern: `app/completed-dues.tsx:165-188` — `Appbar.Header` + `FlashList` + `EmptyState`; back via SPEC-42 helper (`:168` `<Appbar.BackAction onPress={() => safeGoBack(router)} />`, fallback `"/"` per `utils/backNavigation.ts:22-30`). SPEC-42 forbids raw `router.back()` (empty-history `GO_BACK` warning on web refresh).
- Reusable row list: `components/TransactionList.tsx:26-54` takes `transactions`, renders cards navigating to `/transaction-details?id=`, with `EmptyState` + web `boxShadow` handling.
- Stack registration: `app/_layout.tsx:216-230` lists each route as `<Stack.Screen name="..." />`; the new route MUST be added there (adds the route without touching existing screens).

### 1.3 Decisions (all called — nothing blocking)

- **OD-01 — Header title (v1.0, decided):** `"Transaction History"`. Shipped.
- **OD-02 — List scope (v1.0, decided):** complete history, newest-first, no filters/search. Shipped.
- **OD-03 — Grouping (v1.1, decided per user call):** group by calendar month, newest month first; items within a month newest-first. Each month renders as one clean card container with a month-year header (e.g. `October 2026`); rows carry their own date/time line.
- **OD-04 — Modal field mapping (v1.1, decided per user call):** Reference ID = full `id`; Category = `category?.name ?? "Others"`; Payment Method = `paymentMethod ?? "—"`; Date = locale date+time of `date`; Notes = `note || establishment || "—"`.
- **OD-05 — Home rows (v1.1, decided per user call):** Home Recent Activity rows keep pushing `/transaction-details` (editable) as-is; the read-only modal applies strictly within `/transactions`.

### 1.4 Model facts (read-only — no model change)

`types/index.ts:23-41`: `id`, `category?.name`, `paymentMethod?`, `date` (single string; time shown only if the stored value carries it), `note?`/`establishment?`. The v1.1 display maps onto these fields as-is (DEC-06).

## 2. Constraints (normative)

- **CON-01 — Bare-minimum (§1.11).** v1.0 touched only its `D-*` files (shipped). v1.1 MAY touch only `D-06`..`D-09` files. No Home change, no details-screen change, no model change.
- **CON-02 — No new dependencies (§1.12).** Reuse Paper (`Dialog`, badges), `FlashList`, theme, `formatAmount`, `safeGoBack`. No new packages, fonts, or native modules.
- **CON-02b — Read-only (v1.1).** The history screen and its modal MUST expose no Edit/Delete/Share affordance and MUST NOT navigate to any writer route. `transaction-details.tsx` stays reachable from Home rows only.
- **CON-03 — Cross-platform (§1.5).** Grouping is pure TS (no `Platform` branch); layout uses `Platform.select` shadows only. Receipt uses Paper `Dialog`, never a native modal. No native-only top-level imports.
- **CON-04 — Vercel-deployable + Expo Go safe (§1.6/§1.7).** File-based route only; web export clean; no red-box on import.
- **CON-05 — Back safety (§1.4 + SPEC-42).** Back button MUST call `safeGoBack(router)` (default fallback `"/"` = Home dashboard). Raw `router.back()` is forbidden. No existing route MAY be renamed/removed.
- **CON-06 — TDD cross-platform (§1.10).** `jest` parameterized by `Platform.OS` (android/ios/web) for machine-checkable guards + user-run Expo Go + web-export checks for rendered UI jest cannot prove.
- **CON-07 — One home (§1.14).** SPEC-42 (back nav) and SPEC-32/54/55 (neighbor screens) cross-referenced, never re-normed. SPEC-57 DRAFT is superseded by this v1.1 (see History) — no duplicate spec.
- **CON-08 — Ordering.** `D-01`..`D-05` shipped under v1.0 FINAL. `D-06`..`D-09` land only after this v1.1 FINAL mark (satisfied — marked 2026-10-06).

## 3. Goal

### 3.1 Decisions (v1.0 shipped; v1.1 FINAL)

- **DEC-01 (Retarget, v1.0 shipped).** `index.tsx:250` `router.push("/reports")` → `router.push("/transactions")`. Nothing else in the file.
- **DEC-02 (New screen, v1.0 shipped).** `app/transactions.tsx` with `Appbar.Header` (`Transaction History` + `BackAction` → `safeGoBack(router)`) over the full list newest-first; empty state preserved.
- **DEC-03 (Registration, v1.0 shipped).** `app/_layout.tsx` `<Stack.Screen name="transactions" />`. No other Stack change.
- **DEC-04 (Grouping, v1.1).** New pure `utils/transactionGroups.ts` exporting `groupTransactionsByMonth(transactions): TransactionMonthGroup[]` (`{ key: "YYYY-MM"; label: string e.g. "October 2026"; items: Transaction[] }`), months newest-first, items within a month newest-first. Screen renders one clean card container per month with the month-year header.
- **DEC-05 (Statement row, v1.1).** Each row keeps the category icon box and shows: Category name, payment-method badge, Date/Time line, and amount signed and colored (`+` income green / `-` expense red, existing palette). Tap opens the receipt modal; tap MUST NOT navigate.
- **DEC-06 (Receipt modal, v1.1).** Paper `Dialog` titled `Transaction Receipt` with rows Reference ID / Category / Payment Method / Date / Notes per the OD-04 mapping and a single `Close` button dismissing it. No other actions.
- **DEC-07 (Scope freeze, v1.1).** Home rows, `transaction-details.tsx`, and the data layer are untouched; read-only is a property of this screen's UI, not a data lock. Header title + `safeGoBack` + refetch + empty state are reused unchanged.

### 3.2 Interaction matrix

| # | Action | Result |
|---|---|---|
| 1 | Home → See All (v1.0) | lands on `/transactions` showing the complete history newest-first |
| 2 | Tap a row (v1.1) | receipt modal opens with the 5 mapped fields; background list unchanged; no navigation |
| 3 | Modal Close / dismiss (v1.1) | modal closes; no navigation, no write |
| 4 | Header back (warm history) | returns to previous screen via `router.back()` |
| 5 | Header back (empty history, e.g. web refresh) | `router.replace("/")` → Home dashboard, no `GO_BACK` warning |
| 6 | Zero transactions | empty state (same copy as Home list) |

### 3.3 Acceptance criteria

Objective (jest, `Platform.OS` = android/ios/web):

| ID | Check |
|---|---|
| ACC-01 | `index.tsx` See All pushes `/transactions`; zero `router.push("/reports")` on that button (v1.0, still holds) |
| ACC-02 | `app/transactions.tsx`: header with `Transaction History` title + `safeGoBack(router)` back action; no raw `router.back()` (v1.0, still holds) |
| ACC-03 | (v1.0 — SUPERSEDED by ACC-07 below) flat list with row tap to `/transaction-details?id=` |
| ACC-04 | `app/_layout.tsx` registers `<Stack.Screen name="transactions" />`; no existing Screen renamed/removed (v1.0, still holds) |
| ACC-05 | `npm test` 0 failed; `npm run lint` clean; `npx tsc --noEmit` clean (user-run per §1.3) |
| ACC-06 | `groupTransactionsByMonth` groups out-of-order fixtures into newest-first months/items (behavior test, all 3 OS mocks) |
| ACC-07 | Screen renders month-grouped containers + statement fields (method badge, signed colored amount); zero `/transaction-details` navigation remains on this screen |
| ACC-08 | Modal contains the 5 mapped labels + exactly one `Close` action; zero Edit/Delete/Share affordances on this screen |
| ACC-09 | `transaction-details.tsx` + `index.tsx` byte-identical to v1.0 state (Home rows still push details) |

Subjective (reviewer-observed, Expo Go + web export):

- **ACC-S01:** Android/iOS Expo Go — See All → full history; back → Home; empty state on a fresh account. (v1.0, still holds)
- **ACC-S02:** Web export — same; direct-load `/transactions` + back → Home with no console `GO_BACK` warning. (v1.0, still holds)
- **ACC-S03 (v1.1):** Android/iOS Expo Go — groups read as month statement cards; rows show Category, method badge, Date/Time, signed colored amount; tap → clean receipt with the 5 mapped fields; Close is the only action.
- **ACC-S04 (v1.1):** Web export — same at mobile + desktop widths; dialog dismisses via Close, backdrop, and Escape with no console warning.

## 4. Deliverables

- **D-00:** v1.0 FINAL (OD-01..OD-02 called, shipped). Gates nothing further.
- **D-01 (`app/(tabs)/index.tsx`, v1.0 shipped):** one-line retarget per DEC-01.
- **D-02 (`app/transactions.tsx`, v1.0 shipped):** screen per DEC-02.
- **D-03 (`app/_layout.tsx`, v1.0 shipped):** Stack registration per DEC-03.
- **D-04 (`utils/transactionHistory.test.ts`, v1.0 shipped):** ACC-01..ACC-04 × android/ios/web (source-text guards).
- **D-05 (v1.0 journal, shipped):** `docs/savepoint.md` + `AGENTS.md` §3 entry.
- **D-06 (`utils/transactionGroups.ts`, new, v1.1):** pure month-grouping helper per DEC-04 (no `react-native` import).
- **D-07 (`app/transactions.tsx`, v1.1):** grouped cards + statement rows + receipt modal per DEC-05/DEC-06. Header, refetch, and empty state reused unchanged.
- **D-08 (`utils/transactionGroups.test.ts`, new, v1.1):** ACC-06 behavior tests + ACC-07..ACC-09 source guards × android/ios/web.
- **D-09 (v1.1 journal):** `docs/savepoint.md` + `AGENTS.md` §3 entry (incl. OD-03..OD-05 calls).

## 5. v1.2 Amendment — Static Rows, No Modal (FINAL)

### 5.1 Decisions (FINAL)

- **DEC-08 (Modal deletion + static rows, FINAL).** In `app/transactions.tsx`: delete the receipt `Dialog` block, the `ReceiptRow` helper, and the `selected`/`setSelected` state; convert statement rows from `TouchableOpacity` (with `onPress`/`activeOpacity`) to plain `View`; remove `Modal`-family and touchable imports that become unused (`Dialog`, `Button`, `TouchableOpacity`, `useState` — only if unused after the edit; `Button`/`Dialog` have no other use on this screen). Month-group cards, statement fields (icon, Category, method badge, Date/Time, signed colored amount), header + `safeGoBack`, refetch, and empty state stay unchanged. No `Modal`, `TouchableOpacity`, or `Pressable` may remain on this screen.
- **DEC-09 (Scope freeze, FINAL).** Home rows, `transaction-details.tsx`, `utils/transactionGroups.ts`, and the data layer are untouched.

### 5.2 Acceptance criteria (FINAL)

Objective (jest, `Platform.OS` = android/ios/web):

| ID | Check |
|---|---|
| ACC-10 | `app/transactions.tsx` contains zero of: `Dialog`, `Modal`, `TouchableOpacity`, `Pressable`, `setSelected`, `Receipt`; the sole remaining `onPress` is the header `BackAction` → `safeGoBack`; month grouping + statement fields intact |
| ACC-11 | `npm test` 0 failed; `npm run lint` clean; `npx tsc --noEmit` clean (user-run per §1.3) |

Subjective (reviewer-observed, Expo Go + web export):

- **ACC-S05 (v1.2):** rows show no press feedback and open nothing; no modal exists; month cards, fields, back → Home, and empty state unchanged.

### 5.3 Deliverables (FINAL)

- **D-10 (`app/transactions.tsx`, v1.2):** modal deletion + static rows per DEC-08. Nothing else in the file.
- **D-11 (`utils/transactionGroups.test.ts`, v1.2):** replace modal-presence guards with modal-absence guards (ACC-10) × android/ios/web; ACC-06 grouping behavior untouched.
- **D-12 (v1.2 journal):** `docs/savepoint.md` + `AGENTS.md` §3 entry. (Ordering satisfied — v1.2 marked FINAL 2026-10-06.)

## Glossary

| Term | Meaning |
|---|---|
| See All | Home Recent Activity button, now bound to `/transactions` (v1.0) |
| Transaction History | `/transactions` route: v1.0 flat list; v1.1 month-grouped read-only statement |
| Month group | `{ key: "YYYY-MM"; label e.g. "October 2026"; items }` bucket, newest month first |
| Statement row | Category + method badge + Date/Time + signed colored amount; tap opens receipt |
| Receipt modal | `Dialog` with Reference ID / Category / Payment Method / Date / Notes + Close only |
| safeGoBack | SPEC-42 empty-history-safe back helper (fallback `"/"`) |

## References

- `app/(tabs)/index.tsx:108-111` (6-item slice), `:250` (retargeted v1.0)
- `app/transactions.tsx` (v1.0 flat list; rebuilt v1.1) · `types/index.ts:23-41` (field map)
- `app/completed-dues.tsx:165-188` (screen precedent), `:168` (back precedent)
- `app/transaction-details.tsx` (untouched writer) · `utils/backNavigation.ts:22-30` (fallback)
- `app/_layout.tsx:216-230` (Stack registration) · `specs/42-go-back-after-web-refresh.md` (back-nav owner)
- `specs/57-gcash-statement-history.md` — SUPERSEDED DRAFT, do not implement (one home: this file)
- `AGENTS.md §1` (spec-first, no CLI, invariants, TDD, bare-minimum, docs)
