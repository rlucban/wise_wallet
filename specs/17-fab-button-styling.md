# Spec 17: FAB and Primary Button Styling Consistency

| Field | Value |
|---|---|
| ID | SPEC-17 |
| Title | FAB and Primary Button Styling Consistency |
| Status | **FINAL** (approved 2026-09-26) |
| Owner | User (final authority) |
| Version | 1.1 |
| Scope | FAB styling on `/dues`, `/savings`; SegmentedButtons on `/dues`; Pay/Receive button on `/dues` item cards |
| Non-goals | Changing global theme; modifying Home screen FAB (already correct) |
| Normative source | This file. |

> History: created 2026-09-26 per user request; finalized 2026-09-26.

## Terminology (RFC 2119)

The keywords **MUST**, **MUST NOT**, **SHOULD**, and **MAY** in this spec are to be interpreted as described in RFC 2119.

## 1. Context

### 1.1 Reference: Home Screen FAB (Correct)

`app/(tabs)/index.tsx:315-321`:
```tsx
<FAB
  icon="plus"
  label="Transaction"
  style={{ position: "absolute", margin: 20, right: 0, bottom: 20, borderRadius: 20, backgroundColor: theme.colors.primary }}
  color="#fff"
  onPress={() => router.push("/add-transaction")}
/>
```
Uses `backgroundColor: theme.colors.primary` inside the `style` prop with white (`#fff`) text/icon.

### 1.2 Current State

**`app/dues.tsx:643-650`** — Broken styling:
`backgroundColor` passed as an invalid JSX prop to `<FAB>` instead of inside `style`, causing React Native Paper to render a washed-out light container with white text:
```tsx
<FAB
  icon="plus"
  label="Due"
  style={{ position: "absolute", margin: 20, right: 0, bottom: 20, borderRadius: 20 }}
  backgroundColor={theme.colors.primary}
  color={theme.colors.onPrimary}
  onPress={() => router.push("/add-due")}
/>
```

**`app/savings.tsx:552-559`** — Broken styling:
Same issue; `backgroundColor` passed as a JSX prop instead of inside `style`:
```tsx
<FAB
  icon="plus"
  label="New Allocation"
  style={{ position: "absolute", margin: 16, right: 0, bottom: 0, borderRadius: 16 }}
  backgroundColor={theme.colors.primary}
  color={theme.colors.onPrimary}
  onPress={() => router.push("/add-allocation")}
/>
```

**`app/dues.tsx:422-430`** — SegmentedButtons uses default Paper theming (correct).

**`app/dues.tsx:362-364`** — Pay/Receive button:
```tsx
<Button mode="outlined" compact onPress={() => recordTransaction(due)} style={{ marginRight: 4 }}>
  {due.type === "income" ? "Receive" : "Pay"}
</Button>
```

## 2. Constraints (normative)

- **CON-01** — All FABs MUST set `backgroundColor: theme.colors.primary` inside their `style` prop (NOT as a direct component prop, which React Native Paper ignores).
- **CON-02** — FAB text/icon color MUST be `#fff` or `theme.colors.onPrimary` (`color="#fff"`).
- **CON-03** — FAB border radius SHOULD be consistent (`20` matching Home).
- **CON-04** — SegmentedButtons active tab MUST maintain high contrast (Paper default).
- **CON-05** — Use semantic theme tokens (`theme.colors.*`).

## 3. Goal

Align all FABs on `/dues` and `/savings` to match Home screen's solid primary styling.

### Acceptance criteria (Objective)

| ID | Criterion |
|---|---|
| **ACC-01** | `app/dues.tsx` FAB has `backgroundColor: theme.colors.primary` in `style` and `color="#fff"`. |
| **ACC-02** | `app/dues.tsx` FAB has `borderRadius: 20` (matching Home). |
| **ACC-03** | `app/savings.tsx` FAB has `backgroundColor: theme.colors.primary` in `style` and `color="#fff"`. |
| **ACC-04** | `app/savings.tsx` FAB has `borderRadius: 20` (matching Home). |
| **ACC-05** | No invalid `backgroundColor` props on `<FAB>` elements. |

### Acceptance criteria (Subjective)

| ID | Criterion |
|---|---|
| **ACC-06** | Reviewer confirms FABs on `/dues` and `/savings` visually match Home screen FAB with crisp white text over solid primary blue background. |

## 4. Deliverables

- **D-01** — `app/dues.tsx`: Fix FAB styling per ACC-01, ACC-02, ACC-05.
- **D-02** — `app/savings.tsx`: Fix FAB styling per ACC-03, ACC-04, ACC-05.

## References

- `app/(tabs)/index.tsx:315-321` — Reference FAB
- `app/dues.tsx:637` — Dues FAB
- `app/savings.tsx:552-559` — Savings FAB
- `app/dues.tsx:362-364` — Pay/Receive button
- `app/dues.tsx:422-430` — SegmentedButtons