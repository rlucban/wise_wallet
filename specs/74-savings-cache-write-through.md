# SPEC-74 — Savings Mutations Write Through the In-Memory Cache

| Field | Value |
|---|---|
| ID | SPEC-74 |
| Title | Savings mutations write through the in-memory cache |
| Status | **FINAL** (2026-10-10 — approved by user: "Just fix it") |
| Owner | User |
| Version | 1.0 |
| Scope (this repo) | `hooks/useSavings.ts`, `utils/savingsArchive.test.ts`, `docs/savepoint.md` |
| Non-goals | Changing fetch/lifecycle/seeding logic; touching other hooks that use the same cache pattern (`useDues` — noted as adjacent rot); rewiring SPEC-73 merge guards; new dependencies or abstractions |

## Terminology (RFC 2119)

The keywords **MUST**, **MUST NOT**, **SHOULD**, and **MAY** in this spec are
interpreted as described in RFC 2119.

## 1. Context

After an allocation mutation the change "doesn't show immediately" — it only
appears after a reload. Root cause (verified):

- `useSavings` keeps a module-level `_savingsCache = { userId, items }`
  (SPEC-60/66) that seeds state on mount (`items.length === 0`) and is served
  to the next screen instance (e.g. entering the Archived screen).
- The cache is **only written by `fetchItems`** (web guard path, native local
  path, merged path). `addItem`, `updateItem`, and `deleteItem` update React
  state optimistically but never write the cache.
- Consequence: leaving and re-entering a savings surface (or opening
  `archived-allocations`) first renders stale-committed data, then depends on
  the focus `refetch()` to catch up. On web that is a network round-trip that
  can lag or fail; a reload wipes the module cache and re-mounts with a fresh
  fetch, which is why the data only "shows up" after reload.

`itemsRef` (SPEC-73) mirrors committed state for the web field-union guard and
has the same staleness window.

## 2. Constraints (normative)

- **CON-01** The fix MUST be write-through only: after each optimistic state
  update in `addItem` / `updateItem` / `deleteItem`, the resulting array MUST
  immediately replace both `itemsRef.current` and `_savingsCache.items`
  (guarded on a present `activeUserId`, matching the cache's `userId`).
- **CON-02** No lifecycle, seeding, refetch, or SPEC-73 merge-guard logic MUST
  change. The existing `setItems((prev) => ...)` call shapes stay byte-identical
  (keeps `savingsArchive.test.ts` G4's count of 2).
- **CON-03** Scope is `hooks/useSavings.ts` + its guard suite + journals only
  (this repo). No dependencies, no storage keys, no route/API change;
  Android + iOS + Web.
- **CON-04** The write-through MUST be idempotent for sequential user actions
  (map/filter/concat over `itemsRef.current`), since rapid double-dispatch may
  occur before the next render.

## 3. Goal

A savings mutation reflected in React state is reflected in the next screen
mount immediately — no stale first paint, no reliance on the focus refetch,
and no reload needed.

### Decisions

- **DEC-01** Write through both `itemsRef.current` and `_savingsCache` in each
  of the six mutation sites (add ×2, update ×2, delete ×2), derived from
  `itemsRef.current` (the committed-state mirror), rather than recomputing
  inside the `setItems` updater.
- **DEC-02** Keep the existing functional `setItems` lines untouched
  (CON-02) and append the write-through beneath them (bare-minimum, §1.11).

### Acceptance

**Objective (machine-checkable — jest, parameterized by `Platform.OS`)**

- **ACC-01** `hooks/useSavings.ts` contains exactly 6
  `_savingsCache = { userId: activeUserId, items: itemsRef.current };`
  occurrences (add ×2, update ×2, delete ×2).
- **ACC-02** `itemsRef` writes present for all three mutation kinds:
  `[...itemsRef.current, newItem]` ×2, `itemsRef.current.map` ×2,
  `itemsRef.current.filter` ×2.
- **ACC-03** SPEC-73 G4 still passes (two optimistic
  `setItems((prev) => prev.map((g) => (g.id === id ? { ...g, ...updates } : g)))`
  lines remain); all other G1..G9 guards green.

**Subjective (manual reviewer — Expo Go Android/iOS + web export)**

- **ACC-04** Archive an allocation on Savings → immediately open Archived:
  it renders there on the first frame (no blank-then-pop, no reload).
- **ACC-05** Restore it on Archived → immediately open Savings: it is Active
  on the first frame; goal amounts still present.

### Platform matrix

| Acc | Android | iOS | Web |
|---|---|---|---|
| ACC-01..03 (Objective) | jest | jest | jest |
| ACC-04, ACC-05 | Expo Go | Expo Go | web export |

## 4. Deliverables

- **D-74-01** `hooks/useSavings.ts` — six write-through sites (CON-01):
  in `addItem` (web + native), after `setItems((prev) => [...prev, newItem])`
  append `itemsRef.current = [...itemsRef.current, newItem];` +
  cache write; in `updateItem` (web + native), after the optimistic map,
  append `itemsRef.current = itemsRef.current.map((g) => (g.id === id ? { ...g, ...updates } : g));` +
  cache write; in `deleteItem` (web + native), after the optimistic filter,
  append `itemsRef.current = itemsRef.current.filter((g) => g.id !== id);` +
  cache write. Each cache write: `if (activeUserId) _savingsCache = { userId: activeUserId, items: itemsRef.current };`.
  Nothing else changes.
- **D-74-02** `utils/savingsArchive.test.ts` — add `G10` (ACC-01, ACC-02)
  inside the existing × android/ios/web `runSuite`.
- **D-74-03** Journals — `docs/savepoint.md` entry + `AGENTS.md` §3 status.

## 5. Glossary

- **Write-through:** mutation handlers update the module cache
  (`_savingsCache`) and `itemsRef` in the same tick as the optimistic React
  state update, so the next mount seeds the new state rather than the old.
- **Committed state:** the `items` render-committed from React; `itemsRef`
  mirrors it after each render.

## 6. References

- `docs/savepoint.md` (2026-10-10 SPEC-73; SPEC-60/66 cache, SPEC-62 GET cache)
- `hooks/useSavings.ts`, `utils/savingsArchive.test.ts`
- `AGENTS.md` §1.11 (bare-minimum diffs), §1.12 (no new deps)

## History

- **1.0 (2026-10-10)** — FINAL per user instruction "Just fix it" following
  the reproduced stale-seed trace. Write-through only; no lifecycle change.