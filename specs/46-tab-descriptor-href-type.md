# Spec 46: Type `href` on Tab Descriptor Options

| Field | Value |
|---|---|
| ID | SPEC-46 |
| Title | Type `href` on Tab Descriptor Options |
| Status | **FINAL** (2026-10-04 per user call "final") |
| Owner | User (final authority) |
| Version | 1.0 |
| Scope | `app/(tabs)/_layout.tsx` |
| Non-goals | Runtime change, dependency change, UI change |
| Normative source | This file. |

---

## 1. Context

After Spec 45, `npx tsc --noEmit` reports one remaining error:
`TS2339: Property 'href' does not exist on type 'BottomTabNavigationOptions'`
at `app/(tabs)/_layout.tsx:37`. The forked type does not declare `href`, but
expo-router injects it at runtime (used to hide `learning-detail`).

---

## 2. Constraints

- **CON-01:** Replace the direct `options?.href` access with a narrow cast,
  e.g. `(descriptors[r.key]?.options as { href?: string | null } | undefined)?.href !== null`.
- **CON-02:** No runtime behavior change; the filter semantics stay
  "hide routes whose `href` is explicitly `null`, plus `learning-detail`".
- **CON-03:** `npx tsc --noEmit` and `npm run lint` MUST be clean.

---

## 3. Acceptance

- **ACC-01 (Objective):** tsc reports 0 errors project-wide.
- **ACC-02 (Objective):** lint clean.
- **ACC-03 (Subjective):** Floating tab bar still hides `learning-detail`
  and shows the four tabs.

---

## 4. Deliverables

- **D-01 (`app/(tabs)/_layout.tsx`):** Apply the CON-01 cast.

---

## 5. References

- `specs/45-bottomtabbarprops-type-fix.md`
- `AGENTS.md §1.9`
