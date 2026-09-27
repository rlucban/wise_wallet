# SPEC-18: Scheduled Dues — Auto-Process Logic, Mobile Layout & Icon Fixes

| Field | Value |
|-------|-------|
| **ID** | SPEC-18 |
| **Title** | Scheduled Dues — Auto-Process Logic, Mobile Layout & Icon Fixes |
| **Status** | FINAL |
| **Owner** | @rcluc |
| **Version** | 1.0 |
| **Scope** | `app/add-due.tsx`, `app/dues.tsx`, `utils/financialLiteracy.ts` |
| **Non-goals** | No changes to due storage, no API changes, no new dependencies |

---

## Conventions

The key words **MUST**, **MUST NOT**, **REQUIRED**, **SHALL**, **SHALL NOT**, **SHOULD**, **SHOULD NOT**, **RECOMMENDED**, **MAY**, and **OPTIONAL** in this document are to be interpreted as described in RFC 2119.

---

## Context

The **Scheduled Dues** feature has two screens:
- **Add Due** (`app/add-due.tsx`) — create new scheduled items
- **Dues List** (`app/dues.tsx`) — view, edit, pay, delete scheduled items

Current issues:
1. **Auto-Process checkbox** is always visible/enabled even for "Once" frequency (where auto-process makes no sense — there's no next occurrence to create).
2. **Mobile layout** on dues list cards squeezes the insight/projection text vertically; status badges ("OVERDUE", "DUE") collide with action buttons on narrow screens.
3. **Raw emojis** (`💡`) used in insight strings instead of proper vector icons.

---

## Constraints

| ID | Constraint |
|----|------------|
| **CON-01** | **MUST** work on Android, iOS, and Web (Expo SDK 57). |
| **CON-02** | **MUST** use existing `react-native-paper` and `react-native-vector-icons/MaterialCommunityIcons` — no new icon libraries. |
| **CON-03** | **MUST NOT** change the `Due` type or storage schema. |
| **CON-04** | **MUST** keep semantic theming (`theme.colors.*`) — no hardcoded hex colors. |
| **CON-05** | **MUST** follow existing code patterns (hooks, context, repository). |

---

## Goal

### Interaction Matrix

| User Action | Current Behavior | New Behavior |
|-------------|------------------|--------------|
| User selects **"Once"** frequency on Add Due / Edit modal | Auto-Process checkbox visible and enabled | Auto-Process checkbox **hidden** (or disabled + unchecked) |
| User switches frequency from "weekly" → "once" | Auto-Process stays checked | Auto-Process **automatically unchecked and hidden** |
| User switches frequency from "once" → "weekly" | Auto-Process hidden | Auto-Process **shown** (unchecked by default) |
| Mobile view of due card | Insight text squeezed; badges overlap buttons | **Two-row layout**: Top = title/date/amount/freq/badges/actions; Bottom = full-width insight with wrap; badges have reserved space |
| Insight text displayed | `💡 This weekly item adds up to...` | **Icon + text**: `Lightbulb` icon (amber) + message, no emoji |

### Decisions

| ID | Decision |
|----|----------|
| **DEC-01** | Auto-Process checkbox **hidden** (not just disabled) when frequency === "once" — cleaner UI, no confusion. |
| **DEC-02** | When frequency changes to "once", `setAutoProcess(false)` called automatically. |
| **DEC-03** | Due card layout restructured: `flexDirection: "column"` container; top row uses `flexDirection: "row"` with `flexWrap: "wrap"` for badges/actions; bottom row is full-width insight block with `flex: 1`, `flexWrap: "wrap"`. |
| **DEC-04** | Replace `💡` prefix with `<MaterialCommunityIcons name="lightbulb" size={14} color={theme.colors.warning} />` (or `amber` equivalent via `theme.colors.warning`). |
| **DEC-05** | Status badges ("OVERDUE", "DUE", auto-process lightning) rendered in a dedicated badge row above action buttons to prevent collision. |

### Acceptance Criteria

| ID | Criterion | Type |
|----|-----------|------|
| **ACC-01** | On Add Due screen: frequency "once" → Auto-Process row not rendered. | Objective |
| **ACC-02** | On Add Due screen: frequency "weekly" → Auto-Process row rendered, unchecked by default. | Objective |
| **ACC-03** | On Add Due screen: changing frequency to "once" → `autoProcess` set to `false`. | Objective |
| **ACC-04** | On Edit modal (in dues.tsx): same Auto-Process conditional behavior as Add Due. | Objective |
| **ACC-05** | Due card (upcoming) on mobile: insight text wraps to next line, no vertical squeeze; badges don't overlap Pay/Edit/Delete buttons. | Subjective (reviewer confirms on device/Emulator) |
| **ACC-06** | Insight text shows `lightbulb` icon (amber/warning color) instead of `💡` emoji. | Objective |
| **ACC-07** | All existing functionality preserved: create, edit, pay, delete, auto-process next occurrence. | Objective |
| **ACC-08** | Lint clean (`npm run lint`), TypeScript clean (`npx tsc --noEmit`). | Objective |

---

## Deliverables

| ID | Deliverable |
|----|-------------|
| **D-01** | `app/add-due.tsx`: Wrap Auto-Process row in `{frequency !== "once" && (...)}`; add `useEffect` or `onValueChange` handler to `setAutoProcess(false)` when frequency becomes "once". |
| **D-02** | `app/dues.tsx` (edit modal): Same conditional Auto-Process render + auto-uncheck logic. |
| **D-03** | `app/dues.tsx` `renderItem` (upcoming): Restructure card content into two main sections: (1) top flex-row with title, date/amount/freq, badges row, actions; (2) bottom full-width insight block with icon + text, `flexWrap: "wrap"`. |
| **D-04** | `app/dues.tsx`: Replace `💡 {getRecurringProjectionMessage(...)}` with `<View style={{flexDirection: "row", alignItems: "flex-start", marginTop: 8}}><MaterialCommunityIcons name="lightbulb" size={14} color={theme.colors.warning} style={{marginRight: 6, marginTop: 1}}/><Text variant="bodySmall" style={{color: theme.colors.onSurfaceVariant, fontWeight: "600", flex: 1, flexWrap: "wrap"}}>{getRecurringProjectionMessage(...)}</Text></View>` |
| **D-05** | `app/dues.tsx`: Status badges (OVERDUE, DUE, lightning) moved into a dedicated row above action buttons with `flexWrap: "wrap"` and `gap: 4`. |
| **D-06** | `utils/financialLiteracy.ts`: `getRecurringProjectionMessage` returns plain string (no emoji) — already compliant, no change needed. |
| **D-07** | Verify no regressions: create due with each frequency, edit due, pay due with auto-process on/off, delete due. |

---

## Glossary

| Term | Definition |
|------|------------|
| **Auto-Process** | When enabled, paying a recurring due automatically creates the next occurrence. |
| **Frequency** | `once` \| `weekly` \| `biweekly` \| `monthly` \| `yearly`. |
| **Insight/Projection** | Yearly cost estimate shown on recurring due cards. |

---

## References

- `app/add-due.tsx` (lines 102-114, 128-135)
- `app/dues.tsx` (lines 111-114, 292-377, 510-522, 536-538)
- `utils/financialLiteracy.ts` (lines 311-330)
- `specs/07-completed-due-locking-and-auto-progression.md` (auto-process behavior reference)