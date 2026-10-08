# Spec 66: Center Requested Dialog Layouts

| Field | Value |
|---|---|
| ID | SPEC-66 |
| Title | Center Requested Dialog Layouts |
| Status | **v1.0 FINAL; v1.1 FINAL; v1.2 FINAL** (v1.2 marked by user 2026-10-08) |
| Owner | User (final authority) |
| Version | v1.0 FINAL; v1.1 FINAL keyboard-guard coordination; v1.2 FINAL native-modal host |
| Scope | Center the calculator, Settings account/security/clear-data, and Scheduled payment/alert dialogs on Android, iOS, and Web. |
| Non-goals | Changing dialog copy, controls, business logic, actions, colors, sizing, or navigation; centering unrelated dialogs; adding dependencies. |
| Normative source | This file when the applicable version is explicitly marked FINAL by the user. It proposes a separate vertical-centering change, superseding SPEC-65 CON-03/04 only for the dialogs listed here. |

> RFC 2119 keywords **MUST**, **MUST NOT**, **SHOULD**, and **MAY** in v1.0
> express active normative requirements. The v1.1 and v1.2 deltas are also
> active because the user marked both amendments FINAL.

> History: v1.0 FINAL 2026-10-08. v1.1 FINAL 2026-10-08 coordinates Clear
> Data PIN centering with SPEC-57 and adds the required existing-test update.
> v1.2 FINAL 2026-10-08 selects a React Native Modal host after Paper Modal
> centering remained bottom-stuck in device checks.

## 1. Context

The user reports that selected dialogs appear too low on the screen and asks
for their layout to be centered, without changing their contents or behavior.
Screenshots show Settings dialogs and the Scheduled "Insufficient Balance"
alert low on an iPhone. The user reports that the same dialog is centered on
Web, identifies the iPhone as a 14 Pro Max, and requests the behavior on
Android, iOS, and Web. Expo Go version was not provided.

The affected surfaces are owned by:

- `components/CalculatorDialog.tsx` — calculator modal. Its current full-screen
  container already declares `flex: 1`, `justifyContent: "center"`, and
  `alignItems: "center"`; preserve it unless verification finds it off-center.
- `app/(tabs)/settings.tsx` — Delete Account, Change Passcode, Clear Data PIN,
  and Clear Data confirmation Paper dialogs.
- `app/dues.tsx` — Pay/Receive payment-method Paper dialog and the alert Paper
  dialog used for Insufficient Balance.

SPEC-65 remains authoritative for all other dialogs and its horizontal-width
fix. SPEC-66 v1.0/v1.1 governs the separately scoped vertical-layout change
for the surfaces above.

## 2. Constraints

- **CON-01 — Requested surfaces only.** The implementation MUST center the
  calculator, the four named Settings dialog states, and the two Scheduled
  dialog states identified in §1. Unlisted dialogs MUST remain unchanged.
- **CON-02 — Layout only.** Dialog titles, messages, fields, buttons, colors,
  dimensions, action order, callbacks, validation, and navigation MUST remain
  unchanged. Only the layout/wrapper properties needed for centering MAY
  change.
- **CON-03 — Visible viewport centering.** With the software keyboard hidden,
  each requested dialog card MUST be centered horizontally and vertically in
  the app's available viewport, excluding operating-system status/navigation
  areas. The card and its actions MUST remain fully visible.
- **CON-04 — Calculator preservation.** `CalculatorDialog`'s existing centered
  layout MUST remain unchanged if it passes the visual checks; no gratuitous
  rewrite is allowed.
- **CON-05 — Cross-platform invariant.** Centering MUST work on Android, iOS,
  and Web without platform-specific visual regressions. No dependency, storage,
  API, route, or native-module changes are allowed. The app MUST remain Expo
  Go-safe and Vercel-exportable.
- **CON-06 — Diff discipline.** Production edits MUST be limited to
  `components/CalculatorDialog.tsx`, `app/(tabs)/settings.tsx`, and
  `app/dues.tsx`, and only where needed to satisfy CON-03. No shared centering
  abstraction or broad dialog migration is allowed. Test edits are limited to
  `utils/dialogCentering.test.ts` and the SPEC-57 guard update named by D-06.
- **CON-07 — Verification.** A Jest guard MUST cover the requested layout
  surfaces for `Platform.OS` values `android`, `ios`, and `web`. The user runs
  Jest, lint, TypeScript, Expo Go checks, and Web export checks per AGENTS.md
  §1.3 and §1.10; the agent MUST NOT run CLIs.

## 3. Goal

| Platform | Objective (machine-checkable) | Subjective (reviewer check) |
|---|---|---|
| Android | **ACC-01:** The centering guard passes with `Platform.OS = "android"` and verifies all requested modal surfaces retain a full-viewport centering layout without bottom-offset positioning. | **ACC-S01:** In Expo Go, open Calculator; Settings → Delete Account, Change Passcode, Clear Data PIN, and Clear Data confirmation; Scheduled → Pay/Payment Method and trigger Insufficient Balance. Confirm each dialog is centered in the available screen and fully visible. Confirm content and actions behave as before. |
| iOS | **ACC-02:** The same centering guard passes with `Platform.OS = "ios"`. | **ACC-S02:** Repeat ACC-S01 in Expo Go on iPhone 14 Pro Max. Confirm the full dialog card is centered and no action is clipped by the screen edge. |
| Web | **ACC-03:** The same centering guard passes with `Platform.OS = "web"`. | **ACC-S03:** After Web export, repeat ACC-S01 in a browser at desktop and narrow/mobile widths. Confirm each dialog is centered in the viewport, remains fully visible, and existing interaction is unchanged. |

Resolved decisions (per user call 2026-10-08):

- **DEC-01:** The requested platforms are Android, iOS, and Web.
- **DEC-02:** The task is layout-only; dialog content and behavior are frozen.
- **DEC-03:** `CalculatorDialog` is included, but its current centered layout is
  preserved if it passes verification.
- **DEC-04:** SPEC-66 owns the Clear Data PIN card's centering;
  SPEC-57 owns its keyboard behavior. Amend SPEC-57 and update its existing
  guard before implementing the overlapping layout change.

### Acceptance criteria — Objective (machine-checkable)

- **ACC-01:** `utils/dialogCentering.test.ts` passes with `Platform.OS` mocked
  to `android`, `ios`, and `web`, and guards the centering layout for each
  requested surface without requiring any content or callback changes.
- **ACC-02:** The source guard confirms that centering is supplied by the
  viewport/modal layout and not by a bottom offset, translation, or
  platform-specific branch.
- **ACC-03:** The guard confirms the calculator's current full-viewport center
  declarations remain present.

### Acceptance criteria — Subjective (reviewer-judged)

- **ACC-S01..S03:** Follow the platform matrix above. Pass only when every
  requested dialog appears centered horizontally and vertically in the
  available viewport, remains fully visible, and retains its existing content
  and behavior.

## 4. Deliverables

- **D-01:** Update only necessary layout/wrapper properties in
  `app/(tabs)/settings.tsx` so the requested Settings dialogs satisfy CON-03.
- **D-02:** Update only necessary layout/wrapper properties in `app/dues.tsx`
  so the Payment Method and Insufficient Balance dialogs satisfy CON-03.
- **D-03:** Verify `components/CalculatorDialog.tsx` against CON-03; leave it
  unchanged if it already passes.
- **D-04:** Add `utils/dialogCentering.test.ts` for ACC-01..03, parameterized
  across Android, iOS, and Web, following existing source-guard conventions.
- **D-05:** Update `docs/savepoint.md` and append a matching Current status
  entry to `AGENTS.md` §3 after implementation and user-run validation.
- **D-06:** Update `utils/clearDataKeyboard.test.ts` per the
  finalized SPEC-57 wrapper amendment, preserving its cross-platform keyboard
  and conditional-mount assertions.

## 5. Glossary

- **Available viewport:** The app's visible layout area, excluding operating
  system status and navigation areas.
- **Dialog card:** The visible surface containing a dialog's title, content,
  and actions.
- **Layout-only change:** A change to positioning/alignment wrappers or styles
  that does not alter dialog contents, dimensions, or behavior.

## 6. References

- `specs/65-dialog-width-overflow-and-centering-diagnosis.md` (vertical report
  and prior evidence gate; this draft proposes a narrowly scoped supersession)
- `components/CalculatorDialog.tsx`
- `app/(tabs)/settings.tsx`
- `app/dues.tsx`
- `utils/dialogSurfaceWidth.test.ts` (cross-platform source-guard convention)
- `AGENTS.md` §1.1, §1.3, §1.9, §1.10, §1.11, §1.14

---

## Amendment v1.2 — Full-Screen React Native Modal Host (DRAFT, needs FINAL)

> v1.0 and v1.1 remain FINAL. This amendment proposes a different modal host
> only for the six SPEC-66 target surfaces. No v1.2 normative change takes
> effect until the user explicitly marks it FINAL.

### Context

The selected Settings dialogs remained bottom-stuck on iPhone after Paper
`Modal` content-container flex, intrinsic-size centering, and edge-pinned
centering variants. The user confirmed the issue persists. This indicates that
centering only the Paper modal content is insufficient on the reported iOS
surface. The proposed root-level change is to use React Native's built-in
`Modal` for the selected dialog hosts, which owns a full-screen platform modal
window; the visible card remains a Paper `Surface`.

### Constraints (delta, normative only after FINAL)

- **CON-66-08 — Modal host.** The four Settings dialogs and two Scheduled
  dialogs in CON-01 MUST use React Native's built-in `Modal` as their outer
  full-screen host, not Paper `Modal` or Paper `Portal` geometry. The centered
  viewport MUST use a flexible full-screen layout, a transparent/dim backdrop,
  and centered intrinsic card placement. No fixed vertical offset is allowed.
- **CON-66-09 — Dismissal parity.** Tapping outside the card MUST continue to
  dismiss each dialog. Android back handling MUST call the existing dismissal
  action. Taps inside the card MUST NOT trigger backdrop dismissal.
- **CON-66-10 — Existing UI preserved.** Dialog children, copy, actions,
  validation, state, handlers, card sizing, theme-backed surface, and keyboard
  behavior MUST remain unchanged. The transition MUST remain a fade. No new
  dependency or native-only module is allowed.
- **CON-66-11 — Cross-platform.** The same dialog-tree behavior MUST work on
  Android, iOS, and Web. The native modal MUST remain Expo Go-safe and Web
  exportable. Any platform limitation MUST be reported before implementation,
  not hidden behind an unapproved platform branch.

### Decision

- **DEC-05 (DRAFT):** Use React Native's built-in `Modal` for the target
  surfaces because the user-reported iOS issue persisted through Paper Modal
  layout variants. Keep Paper `Surface` for the dialog card.

### Acceptance criteria (delta)

Objective:

- **ACC-04:** `utils/dialogCentering.test.ts` asserts all target dialog hosts
  use the full-screen React Native Modal wrapper with flexible centering,
  transparent backdrop, and no bottom/translation offset; parameterized for
  Android, iOS, and Web.
- **ACC-05:** The guard asserts the original modal content and dismissal
  handlers remain connected and that card presses cannot invoke backdrop
  dismissal.
- **ACC-06:** `utils/clearDataKeyboard.test.ts` enforces the SPEC-57 v1.3
  NativeModal → KeyboardAvoidingView → PIN card structure without weakening
  the conditional-mount and one-wrapper checks.

Subjective:

- **ACC-S04:** On Expo Go Android and iOS, open each target dialog; confirm the
  card is centered in the full phone viewport, the dim backdrop covers the
  screen, outside taps dismiss, inside taps do not dismiss, and existing
  controls work.
- **ACC-S05:** On Web export, repeat the same checks at desktop and narrow
  mobile widths; confirm no scroll/tap blocking when closed.

### Deliverables (delta)

- **D-07:** In `app/(tabs)/settings.tsx` and `app/dues.tsx`, use the native
  React Native Modal host for only the named target surfaces, preserving
  content and dismissal behavior per CON-66-08..11.
- **D-08:** Update `utils/dialogCentering.test.ts` and
  `utils/clearDataKeyboard.test.ts` for ACC-04..06; preserve existing
  cross-platform coverage and assertions.

### References (delta)

- `specs/57-clear-data-dialog-keyboard.md` (Clear Data PIN keyboard behavior)
- `components/CalculatorDialog.tsx` (existing full-screen centering intent)
- `utils/clearDataKeyboard.test.ts` (Clear Data PIN wrapper guard)