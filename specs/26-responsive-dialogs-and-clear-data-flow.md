# Spec 26: Responsive Dialogs for Web and Mobile, Dialog Dismissal, Button UI & Centered Alignment

| Field | Value |
|---|---|
| ID | SPEC-26 |
| Title | Responsive Dialogs for Web and Mobile, Dialog Dismissal, Button UI & Centered Alignment |
| Status | **FINAL** (2026-09-30 per user call "code this for me") |
| Owner | User (final authority) |
| Version | 1.3 |
| Scope | `app/(tabs)/settings.tsx`, `components/ConfirmDialog.tsx` |
| Non-goals | Modifying authentication tokens; altering database schemas; altering navigation guards |
| Normative source | This file. File+symbol cites are normative; `:line` numbers are hints only. |

---

## Terminology (RFC 2119)

The keywords **MUST**, **MUST NOT**, **SHOULD**, and **MAY** in this spec are
to be interpreted as described in RFC 2119. Informative prose is non-normative unless restated as a requirement.

---

## 1. Context

### 1.1 Problem

1. **Unconstrained Dialog Width on Web (Desktop / PWA)**:
   In `app/(tabs)/settings.tsx` and `components/ConfirmDialog.tsx`, `<Dialog>` components from `react-native-paper` lacked an explicit `maxWidth` and centering style on the dialog container itself. On web desktop viewports, dialogs stretched horizontally across the entire browser screen.
2. **Lingering / Stacked Dialog Window on Clear Data**:
   In `app/(tabs)/settings.tsx`, when the user successfully entered their PIN to clear data, `handleClearData` opened `showDeleteConfirmation(true)` but did not dismiss `showPinPrompt(false)`. As a result, the PIN dialog lingered underneath/behind the confirmation dialog.
3. **Flat Text Action Links Instead of Styled Buttons**:
   Action buttons in `showPinPrompt`, `showDeleteConfirmation`, and `showDeleteDialog` rendered as unstyled flat text buttons (`mode="text"` default), giving the appearance of plain text rather than distinct clickable buttons.
4. **Cloud Fetch for Local-only Accounts**:
   `executeClearData` executed remote `authFetch` calls unconditionally, causing network timeouts or errors for local-only accounts.
5. **Left-Aligned Text in Clear Data Modals**:
   In `showPinPrompt` and `showDeleteConfirmation`, titles and descriptions were left-aligned rather than centered, leading to an unbalanced visual layout on modal cards.
6. **Inaccurate Success Modal Copy**:
   The success modal title read `"Deleted Successfully"` instead of `"Cleared Successfully"` for the clear data operation.

---

## 2. Constraints

- **CON-01**: Dialogs in `app/(tabs)/settings.tsx` and `components/ConfirmDialog.tsx` MUST include responsive container styling with `maxWidth: 480`, `width: '90%'`, and `alignSelf: 'center'`.
- **CON-02**: In `handleClearData`, advancing to the confirmation modal MUST dismiss the PIN prompt (`setShowPinPrompt(false)`).
- **CON-03**: In `executeClearData`, `showDeleteConfirmation` and `showPinPrompt` MUST both be closed, and remote cloud deletions MUST be gated on `!isLocal`.
- **CON-04**: Dialog action buttons in `showPinPrompt`, `showDeleteConfirmation`, and `showDeleteDialog` MUST have tangible button styling:
  - Cancel actions MUST use `mode="outlined"`.
  - Destructive confirm actions (`Clear Data`, `CLEAR EVERYTHING`, `Delete Permanently`) MUST use `mode="contained"`, `buttonColor={paperTheme.colors.error}`, and `textColor="#fff"`.
- **CON-05**: In `showPinPrompt` and `showDeleteConfirmation`, titles, descriptions, and action button rows MUST be center-aligned (`textAlign: "center"`, `alignSelf: "center"`, `justifyContent: "center"`).
- **CON-06**: In `executeClearData`, upon successful completion, the success message title MUST display `"Cleared Successfully"`.
- **CON-07**: Cross-platform invariant: All changes MUST maintain parity across Web, Android, and iOS.
- **CON-08**: `npm run lint` MUST pass with 0 errors and 0 warnings.

---

## 3. Goal & Acceptance Criteria

### 3.1 Platform Matrix

| Platform | Objective Checks (`ACC-01`..`06`) | Subjective Reviewer Checks (`ACC-07`..`08`) |
|---|---|---|
| **Web** | `maxWidth: 480`, `width: '90%'`, `alignSelf: 'center'` applied; Cancel has `mode="outlined"`, confirm has `mode="contained"`; titles & descriptions centered; success title is `"Cleared Successfully"` | Reviewer verifies dialogs look like proper desktop modal cards with distinct buttons, fully centered text, and no lingering dialogs |
| **Android** | Dialogs centered within mobile bounds; buttons styled with Material 3 outline/fill; text centered | Reviewer verifies Material 3 modal fits within screen boundaries in Expo Go |
| **iOS** | Dialogs centered within mobile bounds; buttons styled with Material 3 outline/fill; text centered | Reviewer verifies Material 3 modal fits within screen boundaries in Expo Go |

### 3.2 Acceptance Criteria

- **ACC-01**: In `components/ConfirmDialog.tsx`, `<Dialog>` includes `style={{ maxWidth: 480, width: "90%", alignSelf: "center" }}`.
- **ACC-02**: In `app/(tabs)/settings.tsx`, all `<Dialog>` elements include `style={styles.dialog}` (`maxWidth: 480, width: "90%", alignSelf: "center"`).
- **ACC-03**: In `app/(tabs)/settings.tsx`, `handleClearData` dismisses `showPinPrompt` before opening `showDeleteConfirmation`.
- **ACC-04**: In `app/(tabs)/settings.tsx`, `showDeleteConfirmation` and `showPinPrompt` action buttons are styled with `mode="outlined"` for Cancel and `mode="contained"` with error color for destructive actions.
- **ACC-05**: In `app/(tabs)/settings.tsx`, `showPinPrompt` and `showDeleteConfirmation` titles and body descriptions have `textAlign: "center"`, and action rows have `justifyContent: "center"`.
- **ACC-06**: In `executeClearData`, cloud deletion is skipped when `isLocal` is true, and on success `showMessage` displays title `"Cleared Successfully"`.
- **ACC-07**: `npm run lint` passes with 0 errors and 0 warnings.

---

## 4. Deliverables

- **D-01 (`components/ConfirmDialog.tsx`)**: Responsive dialog container styling.
- **D-02 (`app/(tabs)/settings.tsx`)**:
  - Add `styles.dialog` to all dialogs.
  - Fix modal transition in `handleClearData` (`setShowPinPrompt(false)`).
  - Gate cloud deletion on `!isLocal` in `executeClearData`.
  - Apply `mode="outlined"` to Cancel and `mode="contained"` with error background to `Clear Data`, `CLEAR EVERYTHING`, and `Delete Permanently`.
  - Apply `textAlign: "center"` and `alignSelf: "center"` to titles and descriptions in `showPinPrompt` and `showDeleteConfirmation`, and `justifyContent: "center"` to actions.
  - Update success message title to `"Cleared Successfully"`.
- **D-03 (`docs/savepoint.md` & `AGENTS.md`)**: Update change log and current status entries.

---

## 5. References

- [settings.tsx](file:///c:/Users/rcluc/Downloads/wise_wallet/app/(tabs)/settings.tsx)
- [ConfirmDialog.tsx](file:///c:/Users/rcluc/Downloads/wise_wallet/components/ConfirmDialog.tsx)

---

## 6. v1.4 Amendment — Dues dialogs responsive parity (FINAL v1.4 per user call 2026-10-07: "SPEC-26 v1.4 FINAL, code this for me")

### 6.1 Context

- Screenshot 2026-10-07 (`/dues`, web desktop): the Pay `"fdsfsf?"` dialog spans nearly the full viewport width. `app/dues.tsx:643` (Pay dialog) and `:680` (alert dialog) carry no responsive container style — dues.tsx has no `styles.dialog` entry at all — unlike the SPEC-26 D-01/D-02 dialogs. Same defect class as §1.1 problem 1, new screens. Payment chips already wrap (`flexWrap: "wrap"`, `:652`) and titles/actions are already centered — unaffected, untouched.
- Note: if Pay → Confirm still errors after this, that flow is SPEC-46 v1.2 (synthetic `categoryId` sanitize — implemented, awaiting user ACC-S06 verification), not this amendment.

### 6.2 Constraints (FINAL v1.4)

- **CON-09:** Only the two Dialog containers plus the `StyleSheet` addition in `app/dues.tsx` MAY change (StyleSheet import to be verified at implementation). Chip layout, pay logic, alert copy/buttons, FAB, and list rendering MUST stay byte-identical. Cross-platform (Android + iOS + Web); `npm run lint` clean.

### 6.3 Goal

- **DEC-05:** Add `styles.dialog` (`maxWidth: 480`, `width: "90%"`, `alignSelf: "center"` — SPEC-26 CON-01 tokens verbatim) and apply `style={styles.dialog}` to the Pay dialog and the alert dialog. No alignment, copy, or button change.

Objective (jest/manual, `Platform.OS` = android/ios/web):

| ID | Check |
|---|---|
| ACC-09 | Both dues Dialogs carry `style={styles.dialog}` and `styles.dialog` holds the three CON-01 tokens (source-text guard) |
| ACC-10 | `npm run lint` clean; `npx tsc --noEmit` clean; `npx jest` 0 failed (user-run per §1.3) |

Subjective (reviewer-observed, Expo Go + web export):

- **ACC-S07:** Phone + web desktop — Pay and alert dialogs render as capped centered cards like the settings dialogs; chips wrap on narrow widths; no full-bleed dialog on desktop.

### 6.4 Deliverables

- **D-04 (`app/dues.tsx`):** StyleSheet import + `styles.dialog` + two `style` props per DEC-05. Nothing else in the file.
- **D-05 (journal):** `docs/savepoint.md` + `AGENTS.md` §3 entry.
