# Spec 09: Fix Default Category for Scheduled Due Transactions

| Field | Value |
|---|---|
| ID | SPEC-09 |
| Title | Fix Default Category for Scheduled Due Transactions |
| Status | **FINAL** (2026-09-23 per user call) |
| Owner | User (final authority) |
| Version | 1.0 |
| Scope | Category fallback in `recordTransaction()` when a due has no explicit category |
| Non-goals | New seeded category in AsyncStorage; changes to add-due or edit-due category selection UI; changes to dashboard rendering logic |
| Normative source | This file. File+symbol cites are normative; `:line` numbers are hints only. |

## Terminology (RFC 2119)

The keywords **MUST**, **MUST NOT**, **SHOULD**, and **MAY** in this spec are
to be interpreted as described in RFC 2119. Informative prose (examples,
"today", "currently") is non-normative unless restated as a requirement.

## 1. Context

### 1.1 Problem

When a user saves a scheduled due without selecting an explicit category
(category is optional), and later taps "Pay" / "Receive", the resulting
transaction appears in "Recent Activity" on the home dashboard with the
category label **"Food"** — the first expense category in the default list.

This happens because `recordTransaction()` in `app/dues.tsx:227` falls back
to:

```typescript
categories.find((c) => c.type === (item.type || "expense"))
```

Which silently picks whatever category happens to be first for that type.
The user never chose "Food" — it's an unintended default.

### 1.2 Root cause

| Step | What happens |
|---|---|
| 1. User creates due | `addDue()` saves with `categoryId: undefined`, `categoryName: undefined` |
| 2. User taps Pay/Receive | `recordTransaction()` runs |
| 3. Category resolution | `item.categoryId` → undefined; `item.categoryName` → undefined; `categories.find(type === "expense")` → **"Food"** (first match) |
| 4. Transaction created | `category: { id: "1", name: "Food", ... }` |
| 5. Dashboard renders | Shows "Food" in Recent Activity (line 156: `item.category?.name \|\| "Others"`) |

## 2. Constraints (normative)

- **CON-01 — Synthetic fallback category.** When a due has no `categoryId`
  and no `categoryName`, `recordTransaction()` MUST create a synthetic
  category object with `name: "Add Scheduled"` instead of finding the first
  matching category from the categories list.
- **CON-02 — Explicit categories preserved.** When a due HAS a `categoryId`
  or `categoryName`, the existing resolution logic MUST remain unchanged.
  Only the final fallback (no category at all) is affected.
- **CON-03 — No storage changes.** The "Add Scheduled" label MUST NOT be
  seeded into AsyncStorage as a user-visible category. It is a synthetic
  fallback used only when rendering due-originated transactions.
- **CON-04 — Standing repo invariants (AGENTS.md §1).** The implementation MUST
  keep Android + iOS + Web working; MUST keep web Vercel-deployable; MUST NOT
  introduce breaking changes to storage keys, the API contract, AsyncStorage
  shapes, routes, or native deps.

## 3. Goal

Replace the silent "Food" default with the user-visible label "Add Scheduled"
for transactions created from scheduled dues that have no explicit category.

### 3.1 Interaction matrix

| Due categoryId | Due categoryName | Fallback used | Displayed label |
|---|---|---|---|
| Set (e.g. "1") | — | Lookup by ID | Category name (e.g. "Food") |
| — | Set (e.g. "Gym") | Synthetic from name | Category name (e.g. "Gym") |
| — | — | **New fallback** | **"Add Scheduled"** |

### Acceptance criteria — Objective (machine-checkable)

- **ACC-01 (jest):** `recordTransaction()` called on a due with
  `categoryId: undefined` and `categoryName: undefined` creates a
  transaction with `category.name === "Add Scheduled"`.
- **ACC-02 (jest):** `recordTransaction()` called on a due with
  `categoryId: "1"` creates a transaction with the looked-up category name
  (e.g. "Food") — existing behavior preserved.
- **ACC-03 (jest):** `recordTransaction()` called on a due with
  `categoryName: "Gym"` creates a transaction with
  `category.name === "Gym"` — existing behavior preserved.
- **ACC-04 (jest):** The synthetic "Add Scheduled" category has
  `type` matching the due's `type`.

### Acceptance criteria — Subjective (human-judged UX)

- **ACC-05 (Expo Go, Android + iOS):** Reviewer creates a due without
  selecting a category, taps Pay/Receive, and confirms "Add Scheduled"
  appears in Recent Activity instead of "Food".
- **ACC-06 (web export):** Reviewer confirms same behavior on web.

## 4. Deliverables

- **D-01 — Fix fallback category in `recordTransaction()`** (`app/dues.tsx`):
  Replace the final fallback in the `dueCategory` resolution chain
  (line 227):

  **Before:**
  ```typescript
  categories.find((c) => c.type === (item.type || "expense")) ||
  { id: "8", name: "Others", type: "expense", updatedAt: 0 };
  ```

  **After:**
  ```typescript
  { id: "scheduled", name: "Add Scheduled", type: item.type || "expense", updatedAt: 0 };
  ```

  This removes the `categories.find(...)` fallback entirely. When no
  category is set on the due, the synthetic "Add Scheduled" category is
  used. The hardcoded `"Others"` fallback (id: "8") is also removed since
  the synthetic category now serves as the terminal fallback.

## Glossary

| Term | Meaning |
|---|---|
| Synthetic category | A Category object constructed at runtime, not stored in AsyncStorage |
| `recordTransaction()` | Function in `app/dues.tsx` that creates a Transaction from a Due when the user taps Pay/Receive |
| Fallback category | The category assigned when a due has no explicit `categoryId` or `categoryName` |

## References

- `app/dues.tsx:220-266` — `recordTransaction()` function (category resolution at lines 222-228).
- `app/(tabs)/index.tsx:156` — Dashboard Recent Activity category display (`item.category?.name || "Others"`).
- `types/index.ts:23-41` — Transaction type (category field is optional `Category` object).
- `types/index.ts:43-54` — Due type (`categoryId?: string`, `categoryName?: string`).
- `edit-transaction.tsx:14-24` — Default categories list (Food is first expense).
- `AGENTS.md §1` — working agreements.
