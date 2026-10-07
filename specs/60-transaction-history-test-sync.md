# Spec 60: Transaction History Test Sync to v1.2 Static Rows

| Field | Value |
|---|---|
| ID | SPEC-60 |
| Title | Sync `transactionHistory.test.ts` ACC-03 to SPEC-56 v1.2 (receipt modal deleted) |
| Status | **FINAL v1.0** (marked by user 2026-10-07 — "SPEC-60 FINAL, code this for me") |
| Owner | User (final authority) |
| Version | 0.1 |
| Scope | `utils/transactionHistory.test.ts` ACC-03 guard only |
| Non-goals | No app-code change (`app/transactions.tsx` already v1.2-correct); no grouping change; no Home/details change; no storage/API/route/dep change |

> History: v0.1 DRAFT (2026-10-07) — user jest run shows 3 failing (android/ios/web) on ACC-03 which still expects the v1.1 receipt modal SPEC-56 v1.2 deleted.

## Terminology (RFC 2119)

The keywords **MUST**, **MUST NOT**, **SHOULD**, and **MAY** in this spec are to be interpreted as described in RFC 2119. Informative prose (examples, "today", "currently") is non-normative unless restated as a requirement.

## 1. Context

### 1.1 Problem

`npx jest` (user-run 2026-10-07): 1 suite failed, 3 tests failed, 638 passed. All 3 failures are the same guard — `transactionHistory.test.ts:41` expects `"Transaction Receipt"` — but `app/transactions.tsx` no longer contains it: SPEC-56 v1.2 (FINAL, DEC-08) deleted the receipt `Dialog`, `ReceiptRow`, and `selected` state and converted rows to plain `View`. The v1.2 implementation updated the sibling suite (`transactionGroups.test.ts` D-11, ACC-10 absence guards) but left this file's ACC-03 on its v1.1 text. Stale guard, correct app code.

### 1.2 Evidence (read-only, 2026-10-07)

- `utils/transactionHistory.test.ts:38-44` ACC-03 asserts `toContain("Transaction Receipt")` (v1.1 modal title per SPEC-56 DEC-06).
- `app/transactions.tsx` (user-pasted full source in failing output): zero `Transaction Receipt` / `Dialog` / `Modal` / `TouchableOpacity` / `Pressable` / `setSelected` / `Receipt`; sole `onPress` is header `BackAction` → `safeGoBack` — exactly SPEC-56 v1.2 DEC-08/ACC-10.
- `specs/56-transaction-history-screen.md §5` (FINAL v1.2): D-11 covered `transactionGroups.test.ts`; no D-item touched `transactionHistory.test.ts` — the miss.

### 1.3 Decisions (proposed — needs FINAL call)

- **OD-01 (proposed: rewrite ACC-03, no app change).** ACC-03 becomes the `transactionHistory.test.ts` mirror of SPEC-56 ACC-10: keep the `groupTransactionsByMonth` presence check; replace the `"Transaction Receipt"` presence check with absence checks (`Receipt`, `Dialog`, `Modal`, `TouchableOpacity`, `Pressable`, `setSelected`); keep the existing `slice(0, 6)` + `/transaction-details?id=` absence checks. No other test in the file changes.

## 2. Constraints (normative)

- **CON-01 — Bare-minimum (§1.11).** Only `D-*` files MAY change. No app, grouping, Home, details, model, storage, API, route, or dependency change.
- **CON-02 — No new dependencies (§1.12).** No package, font, or native-module change.
- **CON-03 — Cross-platform (§1.5).** Guard MUST stay parameterized by `Platform.OS` (android/ios/web via existing mock); no platform branch added.
- **CON-04 — Vercel-deployable + Expo Go safe (§1.6/§1.7).** Test-only change: zero runtime, bundle, or native impact.
- **CON-05 — No contract break (§1.4).** Storage keys, API contract, routes untouched.
- **CON-06 — TDD cross-platform (§1.10).** Machine-checkable (jest × 3 OS) + user-run `npm run lint` + `npx tsc --noEmit` (test file is type-checked).
- **CON-07 — One home (§1.14).** SPEC-56 owns screen behavior (DEC-08/ACC-10 normative for the UI); this spec owns only the stale guard and MUST mirror ACC-10 verbatim in intent, never re-norm the screen.

## 3. Goal

### 3.1 Decisions (DRAFT — FINAL call pending)

- **DEC-01 (ACC-03 rewrite, proposed).** `utils/transactionHistory.test.ts` ACC-03 becomes:
  `toContain("groupTransactionsByMonth")` + `not.toContain` each of `Transaction Receipt`, `Receipt`, `Dialog`, `Modal`, `TouchableOpacity`, `Pressable`, `setSelected` + existing `not.toContain("slice(0, 6)")` + `not.toContain("/transaction-details?id=")`. Title comment updated to cite v1.2 static rows (no modal).

### 3.2 Interaction matrix

| # | State | Behavior |
|---|---|---|
| 1 | `npx jest utils/transactionHistory.test.ts` | 12/12 pass (4 guards × 3 OS); full suite 0 failed |
| 2 | App UI | Byte-identical — no visual or behavior change on any platform |

### 3.3 Acceptance criteria

Objective (jest, `Platform.OS` = android/ios/web):

| ID | Check |
|---|---|
| ACC-01 | ACC-03 contains zero `toContain("Transaction Receipt")` and contains all 7 absence checks (`Receipt`, `Dialog`, `Modal`, `TouchableOpacity`, `Pressable`, `setSelected`, plus retained `slice(0, 6)` / `/transaction-details?id=`) |
| ACC-02 | `npx jest` 0 failed; `npm run lint` clean; `npx tsc --noEmit` clean (user-run per §1.3) |

Subjective (reviewer-observed):

- **ACC-S01:** Reviewer confirms zero UI change — `/transactions` rows still static, no modal, month cards unchanged (test-only change).

## 4. Deliverables

- **D-01:** `utils/transactionHistory.test.ts` — ACC-03 rewrite per DEC-01. Nothing else in the file.
- **D-02:** Journal — `docs/savepoint.md` + `AGENTS.md` §3 entry (one line each).

## Glossary

| Term | Meaning |
|---|---|
| Stale guard | A passing-at-ship test assertion invalidated by a later FINAL amendment (here v1.2) without a matching test update |
| ACC-10 mirror | The absence-guard set SPEC-56 v1.2 ACC-10 norms for the screen, mirrored here for the stale suite |

## References

- `utils/transactionHistory.test.ts:38-44` (stale ACC-03 under change)
- `specs/56-transaction-history-screen.md §5` (v1.2 FINAL: DEC-08, ACC-10, D-10..D-12)
- `app/transactions.tsx` (v1.2 static rows — correct, untouched)
- `utils/transactionGroups.test.ts` (D-11 absence-guard precedent)
- `AGENTS.md §1` (spec-first, bare-minimum, one home, docs)
