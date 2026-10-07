# Spec 67: Savings Archive Persistence (Backend Column)

| Field | Value |
|---|---|
| ID | SPEC-67 |
| Title | Persist `isArchived` on wallet-api `savingsItems` so archive/restore sticks on every surface (no app-code change) |
| Status | **FINAL v1.0** (marked by user 2026-10-07 — backend-column direction chosen over client overlay) |
| Owner | User (final authority; user applies the backend half — agent runs no CLIs per §1.3) |
| Version | 1.0 |
| Scope | wallet-api `savingsItems` ONLY: add `isArchived` column (migration + rollback), accept it on PUT (merge, not replace), include it on GET, bump `updatedAt` on write — plus app-side zero-change verification matrix |
| Non-goals | Any app code change (none needed — verified below); archive UI; balance formula; client overlay; routes beyond `savingsItems`; other tables |
| Normative source | This file. `AGENTS.md §4` is a pointer only. File+symbol cites are normative; `:line` numbers are hints only. |

> History: v1.0 (2026-10-07) — user report on web (`/savings`): archive flickers, item never reaches Archived, never leaves Active; archived must still deduct from available balance. Diagnosis (read in-tree): the app already sends `updateItem(id, { isArchived: true })` (web PUT body `{isArchived, userId}`, native local + queued update) and already sums UNFILTERED items everywhere — but the server has no `isArchived` column, so it drops the field and every refetch reverts the flag (web is worst-hit: API-direct, no local copy). Backend-column direction chosen by user over a client overlay (overlay would break multi-device consistency and fight SPEC-36 CON-W-03).

## Terminology (RFC 2119)

The keywords **MUST**, **MUST NOT**, **SHOULD**, and **MAY** in this spec are to be interpreted as described in RFC 2119. Informative prose is non-normative unless restated as a requirement.

## 1. Context

### 1.1 Diagnosis (app side, verified — zero change required)

- Write path: `app/savings.tsx:230-237` → `hooks/useSavings.ts:154-184` (`PUT savingsItems/{id}` `{isArchived, userId}` on web; local upsert + queued update on native). Restore is symmetric (`app/archived-allocations.tsx:38`, `{isArchived: false}`). No app change needed once the server persists the field.
- Revert path: web `fetchItems` (`useSavings.ts:52-61`) is GET-replace; native merge (`:67-99`) compares `updatedAt`. Both re-derive the flag from the server row — so persistence lives or dies server-side.
- Balance (user ask #3): ALREADY deducts archived everywhere — `components/SummaryCard.tsx:33`, `app/savings.tsx:23`, `app/dues.tsx:270`, `app/add-transaction.tsx:73` all reduce over UNFILTERED `items`. No formula change; the perceived wrongness is the revert bug's side effect (item visibly back in Active while totals still reserve it).
- Adjacent rot (NOT in scope, noted only): `migrateSavingsItem`'s legacy-shape branch (`useSavings.ts:14-28`) rebuilds the row field-by-field and drops `isArchived` for pre-`balance` rows. Needs its own spec if legacy rows still exist.

### 1.2 Backend requirements (DEC-01, FINAL — applied by user to wallet-api)

- **DEC-01a (migration).** Add `isArchived BOOLEAN NOT NULL DEFAULT FALSE` to the `savingsItems` table (Supabase/Postgres). Backward-compatible: old rows read `false`, old clients ignore the key (§1.4). Rollback: `ALTER TABLE savingsItems DROP COLUMN isArchived;` (app degrades to today's revert behavior; Export-first before migrating).
- **DEC-01b (PUT merge).** `PUT savingsItems/{id}` MUST merge provided fields (PATCH semantics — never whole-row replace) and MUST accept + persist `isArchived` (boolean; coerce `"true"/1` if the stack delivers strings). MUST bump `updatedAt` (server time) on every write so native LWW merge orders correctly.
- **DEC-01c (GET include).** `GET savingsItems?userId=` MUST include `isArchived` on every row. Validation schemas (zod/joi, if any) MUST allow the key (not strip it).

## 2. Constraints (normative)

- **CON-01 — No app code in this spec (§1.11).** If verification reveals an app-side gap, it gets its own spec; this spec MUST NOT be stretched to cover it.
- **CON-02 — Backward compatible (§1.4).** Optional column, default false; no existing key renamed/removed; no route change.
- **CON-03 — No new dependencies.** Neither side.
- **CON-04 — User-run backend (§1.3).** Migration + API edits + curl checks are executed by the user; agent supplies exact text only.

## 3. Goal

### 3.1 Verification matrix (user-run — the acceptance gate)

| # | Check (web AND native, after backend deploy) |
|---|---|
| V-01 | Archive `hf hgf` → leaves Active immediately, appears under Archived (header icon), survives reload + tab switch + navigation (no flicker, no return) |
| V-02 | Restore from Archived → returns to Active, survives reload |
| V-03 | Archived row's balance still reserved: dashboard Available + savings/dues/add-transaction math unchanged by archive state (archived deducts) |
| V-04 | `curl` PUT `savingsItems/{id}` `{"isArchived":true}` → `ok:true`; GET row shows `"isArchived":true`; PUT `{"isArchived":false}` flips it back |

Objective:

| ID | Check |
|---|---|
| ACC-01 | V-01..V-04 all pass on web + native (user-run, reported back) |
| ACC-02 | `npm run lint` clean; `npx tsc --noEmit` clean; `npx jest` 0 failed (app untouched — confirms zero drift) |

Subjective:

- **ACC-S01:** Reviewer confirms archive/restore feels instant and permanent (no flicker), balances consistent across Dashboard/Allocations/Dues/Add-transaction.

### 3.2 Deliverables

- **D-01 (user, wallet-api):** migration SQL + PUT/GET/zod changes per DEC-01 (text supplied in §1.2; adapt table/route names to the actual backend tree).
- **D-02 (user, app):** V-01..V-04 + ACC-02 runs, results pasted back.
- **D-03 (journal):** `docs/savepoint.md` + `AGENTS.md` §3 entry.

## 4. Backend runbook (exact text — user runs, adapt names to the wallet-api tree)

Supabase SQL editor (Postgres):

```sql
ALTER TABLE "savingsItems"
  ADD COLUMN IF NOT EXISTS "isArchived" BOOLEAN NOT NULL DEFAULT FALSE;

-- verify:
SELECT column_name, data_type, column_default
  FROM information_schema.columns
  WHERE table_name = 'savingsItems';

-- ROLLBACK (only if the column itself causes harm):
-- ALTER TABLE "savingsItems" DROP COLUMN "isArchived";
```

API checklist (Express route for `savingsItems`):

1. PUT `/:id` merges the body into the row (never whole-row replace), accepts `isArchived` (boolean — coerce string/number forms), sets `updatedAt` to server now.
2. GET `?userId=` selects + returns `isArchived` on every row.
3. Any request validator (zod/joi) allows `isArchived` (must not strip unknown keys on these routes).

curl checks (fill `API`, `TOKEN`, `UID`, `ID`):

```sh
curl -X PUT "$API/savingsItems/ID" \
  -H "Authorization: Bearer TOKEN" -H "Content-Type: application/json" \
  -d '{"isArchived":true,"userId":"UID"}'
# expect ok:true (or 200 with the row)

curl "$API/savingsItems?userId=UID" -H "Authorization: Bearer TOKEN"
# expect the row to carry "isArchived": true
```

If the backend tree names the table/routes differently (e.g. snake_case), adapt the identifiers — the contract (DEC-01a/b/c) is what is normative, not the literal names above.

## Glossary

| Term | Meaning |
|---|---|
| Revert bug | Archive flag lost on refetch because the server drops the unknown field |
| Flicker | Optimistic archived render followed by refetch revert to Active |

## References

- `app/savings.tsx:230-237` (archive writer), `app/archived-allocations.tsx:26-38` (archive read + restore)
- `hooks/useSavings.ts:49-108` (fetch/merge), `:154-184` (update paths)
- `components/SummaryCard.tsx:33` (+ `app/savings.tsx:23`, `app/dues.tsx:270`, `app/add-transaction.tsx:73`) — unfiltered reserve sums
- `specs/27-allocation-archive-functionality.md`, `specs/28-dedicated-archived-allocations-screen.md` (archive UI owners — untouched)
- `specs/36-web-platform-invariants.md` CON-W-03 (web API-direct — the reason a client overlay was rejected)
- `AGENTS.md §1` (spec-first, no CLI, one home, docs)
