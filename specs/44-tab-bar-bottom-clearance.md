# Spec 44: Bottom Clearance for Floating Tab Bar on Scrollable Tab Screens

| Field | Value |
|---|---|
| ID | SPEC-44 |
| Title | Bottom Clearance for Floating Tab Bar on Scrollable Tab Screens |
| Status | **FINAL** (2026-10-04 per user call) |
| Owner | User (final authority) |
| Version | 1.0 |
| Scope | `app/(tabs)/reports.tsx`, `app/(tabs)/settings.tsx`, `app/(tabs)/learning.tsx`, `app/(tabs)/index.tsx`, `utils/tabBarMetrics.ts`, `utils/tabBarMetrics.test.ts` |
| Non-goals | Changing the floating tab bar itself, route changes, non-tab screens (they have their own back navigation and no floating bar) |
| Normative source | This file. |

---

## Terminology (RFC 2119)

The keywords **MUST**, **MUST NOT**, **SHOULD**, and **MAY** in this spec are
to be interpreted as described in RFC 2119.

---

## 1. Context

The floating pill tab bar (Spec 38/39/40) is `position: "absolute"` and
overlays screen content. Scrollable tab screens whose scroll content ends
near the bottom edge get their last controls (Reports' Export buttons,
Settings' Help & FAQ, Learning's list tail) hidden behind the bar.
Current state: `index.tsx` uses `paddingBottom: 100`, `learning.tsx` uses
`paddingBottom: 40`, `reports.tsx` uses `paddingBottom: 32`, `settings.tsx`
uses `padding: 16` only.

---

## 2. Constraints

- **CON-01 (Shared Constant):** A new pure exported constant
  `TAB_BAR_CONTENT_CLEARANCE = 100` MUST live in `utils/tabBarMetrics.ts`
  (no `react-native` import, no `Platform` branching).
- **CON-02 (Apply on All Tab Screens):** The main scroll container of
  `app/(tabs)/reports.tsx`, `app/(tabs)/settings.tsx`,
  `app/(tabs)/learning.tsx`, and `app/(tabs)/index.tsx` MUST use
  `paddingBottom: TAB_BAR_CONTENT_CLEARANCE` (index.tsx's existing literal
  `100` replaced with the constant; learning's `40` and reports' `32`
  raised; settings' `padding: 16` becomes
  `{ padding: 16, paddingBottom: TAB_BAR_CONTENT_CLEARANCE }`).
- **CON-03 (Inner scroll views untouched):** Nested horizontal/vertical
  chip scrollers (e.g. learning.tsx `filterChipsContainer`) MUST NOT change.
- **CON-04 (Tests):** `utils/tabBarMetrics.test.ts` MUST assert
  `TAB_BAR_CONTENT_CLEARANCE === 100` across `Platform.OS`
  android/ios/web (same parameterized suite pattern).
- **CON-05 (Cross-Platform):** Android/iOS/Web all scroll past the bar.

---

## 3. Goal & Acceptance Criteria

### 3.1 Interaction Matrix

| Screen | Before | After |
|---|---|---|
| index.tsx | `paddingBottom: 100` literal | `TAB_BAR_CONTENT_CLEARANCE` |
| reports.tsx | `paddingBottom: 32` | `TAB_BAR_CONTENT_CLEARANCE` |
| settings.tsx | `padding: 16` | `padding: 16` + `paddingBottom: TAB_BAR_CONTENT_CLEARANCE` |
| learning.tsx | `paddingBottom: 40` | `TAB_BAR_CONTENT_CLEARANCE` |

### 3.2 Acceptance Criteria

- **ACC-01 (Objective):** All four tab screens import and use
  `TAB_BAR_CONTENT_CLEARANCE` for their main scroll container.
- **ACC-02 (Objective):** New parameterized jest assertion passes; full
  suite green.
- **ACC-03 (Subjective):** Reviewer scrolls to the bottom on each tab and
  confirms the last element clears the floating bar on Android, iOS, Web.

---

## 4. Platform Matrix

| Platform | Objective Checks | Subjective Checks |
|---|---|---|
| **Android** | ACC-01..02 | Lowest control fully visible above bar |
| **iOS** | ACC-01..02 | Same |
| **Web** | ACC-01..02 | Same (desktop + mobile widths) |

---

## 5. Deliverables

- **D-01 (`utils/tabBarMetrics.ts`):** Export `TAB_BAR_CONTENT_CLEARANCE = 100`.
- **D-02 (4 tab screens):** Swap literal paddingBottom values for the constant.
- **D-03 (`utils/tabBarMetrics.test.ts`):** Add parameterized assertion.

---

## 6. Glossary

- **Clearance:** Extra scroll content height at the bottom so overlaying
  chrome does not cover the last items.

---

## 7. References

- `specs/32-tab-bar-label-visibility.md`, `specs/40-floating-tab-bar-sizing.md`
- `AGENTS.md §1.9`, `§1.10`
