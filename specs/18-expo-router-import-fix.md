# Spec 18: Fix expo/router Import in dues.tsx

| Field | Value |
|---|---|
| ID | SPEC-18 |
| Title | Fix expo/router Import in dues.tsx |
| Status | **FINAL** |
| Owner | AI Agent |
| Version | 1.0 |
| Scope | Import path correction in `app/dues.tsx` |
| Non-goals | No changes to runtime logic, UI, or other files |

## Terminology (RFC 2119)

The keywords **MUST**, **MUST NOT**, **SHOULD**, and **MAY** in this spec are to be interpreted as described in RFC 2119. Informative prose is non-normative unless restated as a requirement.

## 1. Context

The `dues.tsx` screen at `app/dues.tsx:5` imports `useRouter` and `useFocusEffect` from `"expo/router"`, but the correct package path is `"expo-router"`. All other screens in the codebase use `from "expo-router"` (e.g., `savings.tsx:5`, `index.tsx:5`, `calendar.tsx:4`, `notifications.tsx:5`). This incorrect import path causes the bundling failure:

```
Web Bundling failed 1379ms node_modules\expo-router\entry.js (1 module)
Unable to resolve "expo/router" from "app\dues.tsx"
```

The `expo-router` package provides navigation and routing hooks for Expo Router file-based routing. The subpath `expo/router` does not exist as a resolvable module.

## 2. Constraints (normative)

- **CON-01 — Import path correctness.** The import in `dues.tsx` MUST use `from "expo-router"` (the correct package name), not `from "expo/router"` (nonexistent subpath). This is a pure import path correction with zero runtime behavior change.

- **CON-02 — Cross-platform invariance.** The fix MUST keep Android + iOS + Web working. `expo-router` is a core Expo package available on all platforms. No platform-specific code is affected.

- **CON-03 — No behavioral change.** This fix changes only the import assertion; all `useRouter` and `useFocusEffect` usage patterns remain identical.

## 3. Goal

Correct the import path in `app/dues.tsx` from `from "expo/router"` to `from "expo-router"` so that the module resolves successfully and the Web bundling error is resolved, matching the pattern used by all other 21 screens in the codebase that import from `expo-router`.

## 4. Deliverables

- **D-01:** Change line 5 in `app/dues.tsx` from `import { useRouter, useFocusEffect } from "expo/router";` to `import { useRouter, useFocusEffect } from "expo-router";`

## Glossary

| Term | Meaning |
|---|---|
| `expo-router` | The Expo Router package providing file-based navigation routing |
| `expo/router` | Nonexistent import path; causes module resolution failure |

## References

- `app/dues.tsx:5` — incorrect import path
- `app/savings.tsx:5` — correct import: `from "expo-router"`
- `app/index.tsx:5` — correct import: `from "expo-router"`
- `app/calendar.tsx:4` — correct import: `from "expo-router"`
- `app/notifications.tsx:5` — correct import: `from "expo-router"`
- 21 other screens using `from "expo-router"` (grepconfirmed)