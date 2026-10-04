# Spec 63: Quick Calculator Modal (Header Shortcut)

| Field | Value |
|---|---|
| ID | SPEC-63 |
| Title | Quick Calculator Modal (Header Shortcut) |
| Status | **FINAL** (2026-10-05 per user call) |
| Owner | User (final authority) |
| Version | 1.0 |
| Scope | `app/(tabs)/index.tsx`, new `components/CalculatorModal.tsx`, new `utils/calculationUtils.ts` |
| Non-goals | Financial calculations beyond basic arithmetic, storage, API calls, theme changes |
| Normative source | This file. |

---

## 1. Context

The Home screen header currently features a Calendar shortcut button that opens the calendar modal (per SPEC-62). User research indicates a need for a faster way to perform basic calculations without leaving the dashboard. Replacing the Calendar icon with a Calculator icon in the header provides a Quick Calculator Modal that centers on the screen, offering basic arithmetic operations (addition, subtraction, multiplication, division) with Clear and Equals functions. This reduces friction for users who need quick math (e.g., splitting bills, computing percentages) while staying within the app context.

---

## 2. Constraints

- **CON-01 (Header icon replacement):** The Calendar icon in the top-right header floating pill of `app/(tabs)/index.tsx` is replaced with a Calculator icon (`calculator-outline`). The existing calendar modal and `/calendar` route are unaffected and remain reachable.
- **CON-02 (Modal presentation):** The Calculator Modal uses a centered fixed-overlay presentation (`position: 'fixed'`, `inset: 0`, `zIndex: 1000`) with a dimmed backdrop overlay. On mobile phones, it centers vertically and horizontally with flexible width. On laptop/desktop web (`width >= 768px`), the modal width is limited to `maxWidth: '380px'` and centered.
- **CON-03 (Calculator logic):** A new pure utility `utils/calculationUtils.ts` exports `add`, `subtract`, `multiply`, `divide`, `formatResult` functions with no React/RN dependencies. The modal state (display value, previous operator, waitingForSecondOperand) is managed entirely in the modal component using this utility.
- **CON-04 (Responsive dimensions):** 
  - **Mobile Screens (`width < 768px`):** Modal width `width: '90%'`, max height `maxHeight: '80vh'`, auto-adjusting height, safe-area bottom padding to never get cut off behind browser address bar.
  - **Laptop/Desktop Web Screens (`width >= 768px`):** Modal `maxWidth: '380px'`, `maxHeight: '80vh'`, centered with `margin: 'auto'` vertically and horizontally.
- **CON-05 (Visual styling):** The modal card uses `borderRadius: 16`, theme primary blue accent color (`#0F2C59` or `#1E40AF`) for operational/action buttons and use a neutral text color (`#212121` or theme `onBackground`). The backdrop has `backgroundColor: 'rgba(0,0,0,0.4)'`.
- **CON-06 (TDD / cross-platform coverage, AGENTS.md §1.10):** New `utils/calculationUtils.test.ts` asserts `add`, `subtract`, `multiply`, `divide` results across `android`/`ios`/`web` (via `jest.mock`, pattern from `passcodeValidation.test.ts`). Modal rendering guards assert: no `List.Item`, no `dayTransactions.map`, CalculatorModal exists, correct icon swap, responsive width/height per platform.
- **CON-07 (Preserve behavior):** Tapping the Calculator icon opens the modal; tapping outside the modal (on the dimmed backdrop) closes it. The Calendar route `/calendar` and Calendar header button remain fully functional. No changes to authentication, storage keys, or API contracts.

---

## 3. Acceptance

- **ACC-01 (Objective):** `app/(tabs)/index.tsx` header replaces `Calendar` icon with `Calculator` icon; on press, a `CalculatorModal` opens.
- **ACC-02 (Objective):** No `Calendar` related code is removed from the calendar modal or `/calendar` route; both remain functional.
- **ACC-03 (Objective):** `utils/calculationUtils.ts` exports `add`, `subtract`, `multiply`, `divide`, `formatResult` with no runtime errors on android/ios/web.
- **ACC-04 (Subjective):** On iPhone (Expo Go + iOS Safari web), Android, and desktop web, the calculator modal appears centered with a dimmed backdrop — rounded card, primary blue accent buttons, and a responsive layout that never gets cut off by the browser address bar.
- **ACC-05 (Objective):** Mobile: modal width `90%`, height auto within `80vh`; Laptop/desktop: modal `maxWidth: 380px`, centered with `margin: auto`.
- **ACC-06 (Objective):** Tapping the dimmed backdrop closes the modal; tapping Clear resets the display; tapping Equals computes and displays the result using the utility functions.

---

## 4. Platform Matrix

| Platform | Objective Checks | Subjective Checks |
|---|---|---|
| **Android** | ACC-01..03, 05..06 (D-04 jest guards) | Centered modal with blue accent buttons; no address-bar cutoff (ACC-05) |
| **iOS** | ACC-01..03, 05..06 (D-04 jest guards) | Centered modal with blue accent buttons; no address-bar cutoff (ACC-05) |
| **Web (iOS Safari / desktop)** | ACC-01..03, 05..06 (D-04 jest guards) | Backdrop dims full viewport; card centered; on >=768px screens, maxWidth 380px and centered (ACC-05) |

---

## 5. Deliverables

- **D-01 (`app/(tabs)/index.tsx`):** Replace the Calendar icon in the header with a Calculator icon; on press, toggle `calculatorModalVisible` state and render `<CalculatorModal />`; ensure the `/calendar` route and Calendar header button remain fully functional.
- **D-02 (`components/CalculatorModal.tsx`):** New component with internal state for display value, previous operator, and waitingForSecondOperand. Renders a grid of buttons: digits 0-9, operations (+, -, ×, ÷), Clear (C), Equals (=). Uses `utils/calculationUtils.ts` for computation. Modal presentation: fixed-overlay centered with dimmed backdrop; responsive width/height per CON-04.
- **D-03 (`utils/calculationUtils.ts`, new):** Pure utility functions: `add(a, b)`, `subtract(a, b)`, `multiply(a, b)`, `divide(a, b)` (returns `null` on divide-by-zero), `formatResult(num)` (formats to 2 decimal places or integer). No React/RN imports.
- **D-04 (`utils/calculationUtils.test.ts`, new):** Source-guard jest tests per CON-06 asserting `add`, `subtract`, `multiply`, `divide` results — parameterized by `Platform.OS` android/ios/web via `jest.mock` (pattern from `passcodeValidation.test.ts`); Modal rendering guards asserting ACC-01..03, ACC-05..06.

---

## 6. History

- **v1.0 (FINAL 2026-10-05 per user call):** Initial spec for Quick Calculator Modal replacing Calendar header shortcut. CON-01..CON-07. Deliverables D-01..D-04. Source-guard jest tests for machine-checkable acceptance (§1.10).

---

## 7. References

- `specs/62-simplified-calendar-modal.md` (Calendar Modal predecessor, shares modal presentation pattern)
- `specs/60-home-calendar-bottom-sheet.md` (modal presentation precedent)
- `utils/passcodeValidation.test.ts` (Platform.OS parameterization precedent)
- `AGENTS.md §1.9`, `§1.10`

---

## 7. References

- `specs/62-simplified-calendar-modal.md` (Calendar Modal predecessor, shares modal presentation pattern)
- `specs/60-home-calendar-bottom-sheet.md` (modal presentation precedent)
- `utils/passcodeValidation.test.ts` (Platform.OS parameterization precedent)
- `AGENTS.md §1.9`, `§1.10`

---

Old spec data for reference: `specs/63-quick-calculator-modal.md` (draft 2026-10-05, AWAITING FINAL, v1.0)

---

## 7. References

- `specs/62-simplified-calendar-modal.md` (Calendar Modal predecessor, shares modal presentation pattern)
- `specs/60-home-calendar-bottom-sheet.md` (modal presentation precedent)
- `utils/passcodeValidation.test.ts` (Platform.OS parameterization precedent)
- `AGENTS.md §1.9`, `§1.10`