# Spec 45: Fix `BottomTabBarProps` Type Import in Tab Layout

| Field | Value |
|---|---|
| ID | SPEC-45 |
| Title | Fix `BottomTabBarProps` Type Import in Tab Layout |
| Status | **FINAL** (2026-10-04 per user call "final") |
| Owner | User (final authority) |
| Version | 1.0 |
| Scope | `app/(tabs)/_layout.tsx` |
| Non-goals | Runtime behavior changes, dependency changes, tab UI changes |
| Normative source | This file. |

---

## Terminology (RFC 2119)

The keywords **MUST**, **MUST NOT**, **SHOULD**, and **MAY** in this spec are
to be interpreted as described in RFC 2119.

---

## 1. Context

`npx tsc --noEmit` fails with 6 errors in `app/(tabs)/_layout.tsx`:

- `TS2305`: `Module '"expo-router"' has no exported member 'BottomTabBarProps'`
  (expo-router SDK 57 does not re-export it from its root).
- `TS2339` x3: `state` / `descriptors` / `navigation` don't exist on
  `FloatingTabBarProps` (because the base type failed to resolve).
- `TS7006` x2: implicit `any` on `r` and `route` (same root cause).

`BottomTabBarProps` exists in expo-router's bundled fork at
`expo-router/build/react-navigation/bottom-tabs/types.d.ts` but is not
re-exported from the package root, so the import must come from the fork's
own index or be derived. expo-router has no `exports` map, so a deep import
would resolve — but it is fragile across upgrades.

---

## 2. Constraints

- **CON-01 (Type Source):** The props type MUST be obtained without a deep
  `expo-router/build/...` path. Preferred: derive from the `Tabs` component,
  e.g. `type BottomTabBarProps = Parameters<NonNullable<ComponentProps<typeof Tabs>["tabBar"]>>[0];`
  importing `ComponentProps` from `react`. (Deep import from
  `expo-router/build/react-navigation/bottom-tabs` is an acceptable
  fallback if the derived type errors.)
- **CON-02 (No Behavior Change):** `FloatingTabBar` props, destructuring,
  and all runtime code MUST be byte-identical; only the type import/alias
  changes.
- **CON-03 (Zero Errors):** `npx tsc --noEmit` MUST report 0 errors in
  `app/(tabs)/_layout.tsx`, and `npm run lint` MUST remain clean.

---

## 3. Goal & Acceptance Criteria

### 3.1 Interaction Matrix

| Concern | Before | After |
|---|---|---|
| Props type | Broken root import | Derived from `Tabs` `tabBar` prop type |
| tsc | 6 errors | 0 errors |
| Runtime | Unchanged | Unchanged |

### 3.2 Acceptance Criteria

- **ACC-01 (Objective):** `_layout.tsx` no longer imports `BottomTabBarProps`
  from `"expo-router"`.
- **ACC-02 (Objective):** `npx tsc --noEmit` passes with no errors in this file.
- **ACC-03 (Objective):** `npm run lint` clean.
- **ACC-04 (Subjective):** App boots in Expo Go and the floating tab bar
  behaves as before (Spec 40 sizing intact).

---

## 4. Platform Matrix

| Platform | Objective Checks | Subjective Checks |
|---|---|---|
| **Android** | tsc/lint clean | Tab bar renders normally |
| **iOS** | tsc/lint clean | Same |
| **Web** | tsc/lint clean | Same |

---

## 5. Deliverables

- **D-01 (`app/(tabs)/_layout.tsx`):** Replace the `BottomTabBarProps` import
  with a derived type alias; keep `FloatingTabBarProps` extension.

---

## 6. Glossary

- **Derived props type:** Extracting a prop signature from an existing
  component's `ComponentProps` instead of importing a named export.

---

## 7. References

- `expo-router/build/react-navigation/bottom-tabs/types.d.ts`
- `AGENTS.md §1.9`
