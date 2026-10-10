# SPEC-75 — Savings Instances React to Shared Cache Writes

| Field | Value |
|---|---|
| ID | SPEC-75 |
| Title | `useSavings` instances react to shared cache writes (fixes kept-mounted Active list) |
| Status | **FINAL** (2026-10-10 — user call: "use the same fix on the active allocations"; confirmed surface = Active list on Savings screen) |
| Owner | User |
| Version | 1.0 |
| Scope (this repo) | `hooks/useSavings.ts`, `utils/savingsArchive.test.ts`, `docs/savepoint.md` |
| Non-goals | Removing the focus `refetch()`; touching fetch/lifecycle/seeding (SPEC-60/SPE-74); the `useDues` parallel cache (own spec); new dependencies or abstractions beyond one notifier helper |

## Terminology (RFC 2119)

The keywords **MUST**, **MUST NOT**, **SHOULD**, and **MAY** are interpreted as
described in RFC 2119.

## 1. Context

SPEC-74 makes `addItem`/`updateItem`/`deleteItem` write through to the shared
module cache `_savingsCache`. That fixed the **next mount** seeding stale data.
It does **not** reach a `useSavings` instance that is already mounted:

- The Savings screen stays mounted while `archived-allocations` (a pushed stack
  screen) restores an allocation, and while `add-allocation` completes a create.
- The Dashboard tab stays mounted and drives `SummaryCard` from its own
  `useSavings` instance.
- None of those mounted instances observe the `_savingsCache` replacement; they
  only converge via their own `useFocusEffect` refetch (async, network-bound on
  web) or a full reload (fresh mount seeds the cache).

Result: the **Active list on the Savings screen** — and the Dashboard summary —
can show the pre-mutation state until a reload (or a slow refetch) lands, which
is exactly the report that prompted this spec.

## 2. Constraints (normative)

- **CON-01** Every mounted `useSavings` instance MUST be re-seeded from
  `_savingsCache` (state + `itemsRef`) whenever the cache is replaced for the
  same `activeUserId`. Cross-instance, no reload, no refetch required.
- **CON-02** The mutating instance MUST keep its existing SPEC-74 behavior;
  receiving its own notify is a harmless idempotent re-seed (same content).
- **CON-03** The subscription MUST be inert when `activeUserId` is absent
  (signed out / other user) and MUST be cleaned up on unmount.
- **CON-04** No change to fetch, seed, focus-refetch, or SPEC-73 guards;
  `refetch()` stays as the reconciliation source of truth.
- **CON-05** Android + iOS + Web; no dependency, storage-key, route, or API
  change. One module notifier helper only (CON-02, D-75-01).

## 3. Goal

A mutation performed in any savings surface (Savings, Archived, add, another
device sync) is reflected immediately in **every** mounted `useSavings` surface
— Active list on Savings, Archived screen, Dashboard summary — with no reload
and no focus-refetch wait.

### Decisions

- **DEC-01** Publish a module-level `notifySavingsCacheChanged()` (a `Set` of
  no-arg listeners); every SPEC-74 write-through site emits it immediately
  after the cache replacement.
- **DEC-02** Each hook instance subscribes once per `activeUserId` and, on
  notify, re-seeds `items` + `itemsRef` from the matching `_savingsCache`
  entry (guard on `userId`).

### Acceptance

**Objective (machine-checkable — jest, parameterized by `Platform.OS`)**

- **ACC-01** `hooks/useSavings.ts` contains exactly 6
  `notifySavingsCacheChanged();` occurrences (one per SPEC-74 write-through
  site).
- **ACC-02** The module declares a listener set + no-arg notifier; the hook has
  an `activeUserId`-guarded subscription effect that adds a listener re-seeding
  `items`/`itemsRef` from `_savingsCache` and removes it on cleanup.
- **ACC-03** SPEC-74 `G10` count (6 cache writes) still passes; G1..G9 green.

**Subjective (manual reviewer — Expo Go Android/iOS + web export)**

- **ACC-04** With Savings mounted, restore an allocation in Archived → return
  to Savings: the item is in the Active list immediately (no reload, no wait).
- **ACC-05** Create an allocation in add-allocation → return to Savings: it
  appears immediately.
- **ACC-06** Archive on Savings → Dashboard summary drops the allocation
  immediately (no tab refetch wait).

### Platform matrix

| Acc | Android | iOS | Web |
|---|---|---|---|
| ACC-01..03 (Objective) | jest | jest | jest |
| ACC-04..ACC-06 | Expo Go | Expo Go | web export |

## 4. Deliverables

- **D-75-01** `hooks/useSavings.ts` —
  (a) module-level `const _savingsCacheListeners = new Set<() => void>();` plus
  `function notifySavingsCacheChanged(): void { _savingsCacheListeners.forEach((l) => l()); }`;
  (b) a `useEffect([activeUserId])` subscription: when `activeUserId` is set,
  add a listener that — if `_savingsCache?.userId === activeUserId` — sets
  `itemsRef.current = _savingsCache.items` and `setItems(_savingsCache.items)`;
  remove the listener on cleanup;
  (c) append `notifySavingsCacheChanged();` as the final line of each of the six
  SPEC-74 write-through blocks.
  Nothing else changes.
- **D-75-02** `utils/savingsArchive.test.ts` — add `G11` (ACC-01, ACC-02)
  inside the existing × android/ios/web `runSuite`.
- **D-75-03** Journals — `docs/savepoint.md` entry + `AGENTS.md` §3 status.

## 5. Glossary

- **Module notifier:** a `Set` of listener callbacks at module scope that any
  instance can invoke; `useSavings` uses it to broadcast cache replacements
  across mounted instances of the same user.

## 6. References

- `docs/savepoint.md` (2026-10-10 SPEC-74 write-through; SPEC-60/66 cache)
- `hooks/useSavings.ts`, `utils/savingsArchive.test.ts`
- `AGENTS.md` §1.11 (bare-minimum diffs), §1.12 (no new deps)

## History

- **1.0 (2026-10-10)** — FINAL per user call (Active list on Savings screen
  still stale; SPEC-74 write-through doesn't reach mounted instances).
  Subscriber for shared-cache replacements; refetch stays the reconciler.