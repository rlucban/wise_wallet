# Spec 28: Dedicated Archived Allocations Screen & Header Navigation

| Field | Value |
|---|---|
| ID | SPEC-28 |
| Title | Dedicated Archived Allocations Screen & Header Navigation |
| Status | **FINAL** (2026-09-30 per user call "code this for me") |
| Owner | User (final authority) |
| Version | 1.0 |
| Scope | `app/savings.tsx`, `app/archived-allocations.tsx`, `app/_layout.tsx` |
| Non-goals | Altering database schemas; modifying storage keys |
| Normative source | This file. File+symbol cites are normative; `:line` numbers are hints only. |

---

## Terminology (RFC 2119)

The keywords **MUST**, **MUST NOT**, **SHOULD**, and **MAY** in this spec are
to be interpreted as described in RFC 2119. Informative prose is non-normative unless restated as a requirement.

---

## 1. Context

### 1.1 Problem

In SPEC-27, archived allocations were rendered inline at the bottom of `app/savings.tsx`. The user requested that archived allocations be moved to their own dedicated page accessible via an Archive button on the top-right of the header in `app/savings.tsx`. This keeps the main `/savings` screen focused purely on active allocations while providing a dedicated, distraction-free management view for archived allocations.

---

## 2. Constraints

- **CON-01**: In `app/savings.tsx`, the `Appbar.Header` MUST render an `Appbar.Action` icon button on the right side (`icon="archive-outline"`) that navigates to `/archived-allocations`.
- **CON-02**: In `app/savings.tsx`, the inline "Archived Allocations" section MUST be removed. The screen displays only active and completed in-progress allocations.
- **CON-03**: A new route `app/archived-allocations.tsx` MUST be created and registered in `app/_layout.tsx`.
- **CON-04**: In `app/archived-allocations.tsx`:
  - `Appbar.Header` MUST include `Appbar.BackAction` (navigating back via `router.back()`) and title `"Archived Allocations"`.
  - Top summary card MUST display the total archived amount (`formatAmount(totalArchived)`).
  - When no items are archived, an `EmptyState` (`icon="archive-outline"`, title="No archived allocations", subtitle="Archived allocations will appear here") MUST be displayed.
  - Each archived card MUST be read-only: no Edit (pencil) button, no money transfer buttons.
  - Each archived card MUST provide Restore (`archive-arrow-up-outline`) and Delete Permanently (`delete-forever-outline`) actions.
  - Delete Permanently MUST trigger `ConfirmDialog` before removing the item via `deleteItem`.
- **CON-05**: Cross-platform invariant: Parity across Web, Android, and iOS.
- **CON-06**: `npm run lint` MUST pass with 0 errors and 0 warnings.

---

## 3. Goal & Acceptance Criteria

### 3.1 Platform Matrix

| Platform | Objective Checks (`ACC-01`..`05`) | Subjective Reviewer Checks (`ACC-06`..`07`) |
|---|---|---|
| **Web** | Header action routes to `/archived-allocations`; separate page renders archived cards with restore/delete | Reviewer verifies smooth navigation and clean desktop web UI |
| **Android** | Header action routes to `/archived-allocations`; separate page renders archived cards with restore/delete | Reviewer verifies Material 3 screen transition in Expo Go |
| **iOS** | Header action routes to `/archived-allocations`; separate page renders archived cards with restore/delete | Reviewer verifies Material 3 screen transition in Expo Go |

### 3.2 Acceptance Criteria

- **ACC-01**: In `app/savings.tsx`, header has `<Appbar.Action icon="archive-outline" onPress={() => router.push("/archived-allocations")} />`.
- **ACC-02**: In `app/savings.tsx`, inline archived section is removed.
- **ACC-03**: `app/archived-allocations.tsx` is created, displaying archived items with total archived amount, Restore, and Delete Permanently.
- **ACC-04**: `app/_layout.tsx` includes `<Stack.Screen name="archived-allocations" />`.
- **ACC-05**: `npm run lint` passes with 0 errors and 0 warnings.

---

## 4. Deliverables

- **D-01 (`app/savings.tsx`)**: Add header archive action button; remove inline archived list.
- **D-02 (`app/archived-allocations.tsx`)**: Dedicated archived allocations screen.
- **D-03 (`app/_layout.tsx`)**: Register `archived-allocations` route.
- **D-04 (`docs/savepoint.md` & `AGENTS.md`)**: Update documentation.

---

## 5. References

- [savings.tsx](file:///c:/Users/rcluc/Downloads/wise_wallet/app/savings.tsx)
- [_layout.tsx](file:///c:/Users/rcluc/Downloads/wise_wallet/app/_layout.tsx)
