# Spec 07: Transaction Details Text Node Fix

| Field | Value |
|---|---|
| ID | SPEC-07 |
| Title | Fix Unexpected Text Node in Transaction Details Screen |
| Status | **FINAL** (2026-09-24 per user call) |
| Owner | User (final authority) |
| Version | 1.0 |
| Scope | Remove stray "." text node between `<Card>` and `<Card.Content>` in `app/transaction-details.tsx:66` |
| Non-goals | No other UI changes; no logic changes; no new features |
| Normative source | This file. `AGENTS.md §4` is a pointer only. |

## Terminology (RFC 2119)

The keywords **MUST**, **MUST NOT**, **SHOULD**, and **MAY** in this spec are to be interpreted as described in RFC 2119.

## 1. Context

### 1.1 Problem

The `app/transaction-details.tsx` screen throws a React Native console error:

```
Unexpected text node: . A text node cannot be a child of a <View>.
app/transaction-details.tsx (66:11)
```

At line 66, there is a stray "." character between the `<Card>` opening tag and `<Card.Content>` that React Native interprets as a raw text node. In React Native, raw text nodes cannot be direct children of View-based components (like `Card`) — they must be wrapped in a `<Text>` component.

### 1.2 Current Code (lines 64-66)

```tsx
<Card style={{ marginBottom: 16 }}>
  <Card.Content>
```

The "." appears at column 11 of line 66 (inside `<Card.Content>`), suggesting a stray character in the source.

## 2. Constraints (normative)

- **CON-01 — Minimal fix.** The fix MUST only remove the stray "." character. No other code changes.
- **CON-02 — Cross-platform invariant.** The fix MUST keep Android + iOS + Web working (per AGENTS.md §1.5).
- **CON-03 — No breaking changes.** Storage keys, API contracts, routes, and native deps MUST remain unchanged (per AGENTS.md §1.4).
- **CON-04 — Expo Go safe.** The fix MUST NOT crash Expo Go on import (per AGENTS.md §1.7).

## 3. Goal

Eliminate the console error by removing the stray text node, restoring clean rendering of the Transaction Details screen on all platforms.

### Acceptance criteria

- **ACC-01 (objective):** The console error "Unexpected text node: . A text node cannot be a child of a <View>" no longer appears when navigating to Transaction Details.
- **ACC-02 (objective):** The Transaction Details screen renders correctly on Android, iOS, and Web (verified via `expo export --platform web` and Expo Go).
- **ACC-03 (subjective):** Reviewer confirms no visual regression in the Card layout (category, date, payment method, establishment, split info, note sections all display as before).

## 4. Deliverables

- **D-01 — Remove stray "."** in `app/transaction-details.tsx` at line 66 (between `<Card>` and `<Card.Content>`).
- **D-02 — Lint clean.** Run `npm run lint` — must pass with zero errors/warnings.

## Glossary

| Term | Meaning |
|---|---|
| Text node | Raw text content in JSX not wrapped in a `<Text>` component |
| View-based component | React Native component that renders as a native View (e.g., View, Card, ScrollView) |

## References

- `app/transaction-details.tsx:64-66` — location of the bug
- `AGENTS.md §1` — working agreements (spec-first, no CLI, invariants, docs)
- React Native docs: "Text nodes cannot be children of View"