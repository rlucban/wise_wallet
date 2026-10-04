# Spec 61: Center Dialogs on iOS Web with Fixed Overlay

| Field | Value |
|---|---|
| ID | SPEC-61 |
| Title | Center Dialogs on iOS Web with Fixed Overlay |
| Status | **AWAITING FINAL** (draft 2026-10-04) |
| Owner | User (final authority) |
| Version | 1.0 |
| Scope | `app/(tabs)/settings.tsx`, new `components/CenteredDialogModal.tsx` |
| Non-goals | Dialog content, validation, routes, badge logic, native Android/iOS visual rework |
| Normative source | This file. |

---

## 1. Context

On iOS Safari web, the `Dialog` instances in settings.tsx (Delete Account,
PIN prompts, Set Passcode, Clear Data) render pinned toward the top/bottom
edges instead of centered. Root cause is the RNW Modal fallback used by
Paper's `Dialog`. All dialogs already carry `styles.dialog` (maxWidth 480,
width 90%, centered) so styling the card alone does not fix it.

---

## 2. Constraints

- **CON-01 (Helper):** Create `components/CenteredDialogModal.tsx`: a Paper
  `Modal` whose `contentContainerStyle` is a full-screen fixed overlay
  (`flex: 1`, `justifyContent: "center"`, `alignItems: "center"`,
  `backgroundColor: "rgba(0,0,0,0.5)"`, `padding: 16`) wrapping a card View
  (`backgroundColor: theme.colors.surface`, `borderRadius: 16`,
  `width: "90%"`, `maxWidth: 400–480`, `padding: 20`). It MUST forward
  `visible`, `onDismiss`, and `children`.
- **CON-02 (Apply to settings.tsx):** Replace every Paper `Dialog` usage in
  settings.tsx with `CenteredDialogModal`, mapping:
  `Dialog.Title` → title Text (`variant="titleLarge"`),
  `Dialog.Icon` → small icon above title,
  `Dialog.Content` → `variant="bodyMedium"` Text/body,
  `Dialog.Actions` → row of Buttons (right-aligned; keep `flexDirection: 'column'`
  variants where used). Existing `styles.dialog` becomes unnecessary.
- **CON-03 (Backdrop):** The dim overlay is part of the Modal's
  contentContainerStyle so iOS Safari shows a true full-viewport dimmed
  layer; tapping outside the card closes via `onDismiss` (wrap sheet in a
  Pressable behind the card like Spec 60, or set `onDismiss` on the Modal
  and make the dim area a Pressable).
- **CON-04 (Preserve behavior):** All visibility state variables, validation
  messages, and button actions stay byte-for-byte equivalent.
- **CON-05 (Cross-Platform):** Android/iOS/Web all center the card; the
  helper must not crash Expo Go.
- **CON-06 (Theming):** Use `useTheme()` surface/background; respect both
  light and dark mode.

---

## 3. Acceptance

- **ACC-01 (Objective):** `CenteredDialogModal.tsx` exists and is imported
  by settings.tsx; no `<Dialog` remains in settings.tsx.
- **ACC-02 (Objective):** All existing Dialog call sites compile with the
  same visible/onDismiss/state wiring (tsc clean).
- **ACC-03 (Subjective):** On iOS Safari (and desktop web) the Set Passcode,
  Clear Data PIN, and Delete Account modals render centered with a dimmed
  full-screen overlay and rounded cards.

---

## 4. Platform Matrix

| Platform | Objective Checks | Subjective Checks |
|---|---|---|
| **Android** | ACC-01..02 | Centered modal |
| **iOS** | ACC-01..02 | Centered modal |
| **Web (iOS Safari)** | ACC-01..02 | No top/bottom pinning; dim overlay fills viewport |

---

## 5. Deliverables

- **D-01 (`components/CenteredDialogModal.tsx`):** New helper per CON-01.
- **D-02 (`app/(tabs)/settings.tsx`):** Swap all `<Dialog>` blocks to
  `<CenteredDialogModal>` per CON-02..04 (title/icon/content/actions mapped).
- **D-03:** Verify `npx tsc --noEmit` + `npm run lint` clean.

---

## 6. References

- `specs/26-responsive-dialogs-and-clear-data-flow.md` (original dialog rule)
- `specs/60-home-calendar-bottom-sheet.md` (Modal overlay pattern)
