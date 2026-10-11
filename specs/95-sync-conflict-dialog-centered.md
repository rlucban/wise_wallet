# SPEC-95 — Sync Conflict Dialog Centered on Phone

| Field | Value |
|---|---|
| ID | SPEC-95 |
| Title | Wrap the Sync Conflict dialog so it centers on phone |
| Status | **FINAL v1.0** (marked FINAL by user 2026-10-11 — implementable) |
| Owner | User (final authority) |
| Version | 1.0 FINAL |
| Scope | `app/(tabs)/settings.tsx` `showConflictDialog` block ONLY + one new guard file `utils/syncConflictDialogCentered.test.ts` |
| Non-goals | No copy change; no handler/state change; no other dialog touched (verify/new-account/backup/message stay); no new deps |

RFC 2119 terminology (MUST/MUST NOT/SHOULD/MAY) applies. Informative prose ("today", "currently") is non-normative unless restated as a requirement.

## Context

User call 2026-10-11 with phone screenshot (Settings → backup flow): the `Sync Conflict` dialog (title + server-data copy + Merge / Keep Local Only / Keep Cloud Only / Cancel) sits low, bottom cut at the screen edge — *"ito din dapat naka center ito"*.

Today (source-traced): `showConflictDialog` (`settings.tsx:1693-1721`) is a bare Paper `<Dialog>` in the `Portal` — no `NativeModal`, no `KeyboardAvoidingView`, no `ScrollView`. Same low-position class SPEC-93 fixed for `showPinVerificationDialog` and SPEC-94 fixed for `showNewAccountDialog` (both now `NativeModal` + scrim + KAV + `ScrollView` + `Surface`). This dialog has no text input, so keyboard-avoidance is precautionary (content growth / small screens), not the reported bug — the reported bug is vertical centering. Its `Dialog.Actions` uses a column layout (`flexDirection: 'column'`, three full-width buttons + Cancel) — that layout MUST be preserved verbatim.

## Constraints

- **CON-01** Every change MUST keep Android + iOS + Web working, stay Expo Go (latest) import-safe, and stay Vercel-deployable.
- **CON-02** No new npm packages, native modules, fonts, images, or third-party code (AGENTS §1.12). `NativeModal`/`KeyboardAvoidingView`/`ScrollView`/`Pressable` all already imported in this file (`settings.tsx:2`).
- **CON-03** Bare-minimum diff (AGENTS §1.11). ONLY the `showConflictDialog` block: wrap it in the SPEC-93/94 precedent (`NativeModal` transparent/fade/`overFullScreen` + scrim `View` (`rgba(0, 0, 0, 0.32)`, as other modals in this file) + tap-outside `Pressable` + `KeyboardAvoidingView` iOS-padding/else-height + `ScrollView` flex/bounded + persistTaps + `Surface`/`Dialog` inside; `onRequestClose` mirrors today's `onDismiss` exactly — close only, no state clearing; Cancel and the three resolution buttons keep their own handlers). Title/copy/column-Actions layout/buttons/handlers/loading/disabled states byte-identical.
- **CON-04** Identical on Android, iOS, and Web — no new `Platform.OS` branch beyond the KAV ternary (register/login/SPEC-57 precedent). Any other platform branch needs its own amendment first (§1.10).
- **CON-05** No code, config, or dependency change before this spec is marked FINAL by the user (AGENTS §1.1).

## Goal

Sync Conflict dialog centered on phone; everything else pixel-identical.

### Interaction matrix

| Surface | Today | After (FINAL) |
|---|---|---|
| Position on phone | Low, bottom cut at screen edge | Centered in viewport |
| Title/copy/buttons/layout | As today | Byte-identical |
| Other dialogs/flows | As today | Byte-identical |

### Decisions (FINAL — user marked final 2026-10-11; DRAFT DEC-01(a) + DEC-02 adopted as-is)

- **DEC-01 (FINAL)** Full NativeModal+KAV+ScrollView mirror of SPEC-93/94 (one precedent for all sync-flow dialogs; KAV/ScrollView precautionary — no input today, but harmless and keeps a single wrap pattern; rejected: lighter wrap without KAV/ScrollView — smaller diff but a second pattern to maintain; rejected: leaving bare — the reported bug).
- **DEC-02 (FINAL)** Column Actions layout preserved verbatim (the three full-width resolution buttons + Cancel stay stacked; rejected: re-laying out to a row — out of scope, changes the resolving UX).

### Acceptance

Platform matrix (§1.10): every Objective guard holds on `android` / `ios` / `web` (jest `Platform.OS` mock); every Subjective check is user-run on Expo Go (Android/iOS) + `expo export --platform web` (agent never runs CLIs per AGENTS §1.3).

Objective — deterministic, machine-checkable (jest source-scan guards):

- **ACC-01** The `showConflictDialog` block holds a `NativeModal` (transparent/fade/`overFullScreen`, dismiss wiring) + dim `View` + tap-outside `Pressable` + `KeyboardAvoidingView` (iOS-padding/else-height ternary) + `ScrollView` (flex, persistTaps) + `Surface`/`Dialog` inside. Holds on android/ios/web.
- **ACC-02** Title (`Sync Conflict`), copy, column `Actions` layout (`flexDirection: 'column'`), all four buttons (Merge (Last Write Wins) / Keep Local Only / Keep Cloud Only / Cancel with handlers `handleMergeLWW`, `handleManualBackup`, `performRestore`, loading/disabled states) byte-identical. Holds on android/ios/web.
- **ACC-03** Scope: no other dialog block touched (`showPinVerificationDialog`, `showNewAccountDialog`, `showBackupDialog` byte-identical); no new imports/deps/`Platform` branch beyond the KAV ternary. Holds on android/ios/web.

Subjective — human-judged UX as observable reviewer checks (explicit pass/fail, user-run):

- **ACC-S01** Reviewer on iOS (Expo Go, phone, Cloud account → backup → Sync Conflict) confirms: dialog centered in viewport, all four actions reachable without scrolling on a normal-height phone; each resolution flow completes identically. FAIL = low/clipped dialog or untappable action.
- **ACC-S02** Reviewer on Android + Web confirms ACC-S01 identically with no console error. FAIL = any platform-only deviation.

TDD coverage (§1.10): `utils/syncConflictDialogCentered.test.ts` covers ACC-01..ACC-03 parameterized by `Platform.OS` (android/ios/web); ACC-S01/S02 are user-run manual checks exactly as written (centering is not jest-renderable — guards pin the contract).

## Deliverables

- **D-01** `app/(tabs)/settings.tsx` ONLY: `showConflictDialog` wrap per CON-03 (DEC-01a + DEC-02). No other line changes.
- **D-02** `utils/syncConflictDialogCentered.test.ts` (new file, named here per §1.11): guards for ACC-01..ACC-03 × android/ios/web. `blockOf()` MUST anchor on the opener (`lastIndexOf("<NativeModal", anchor)`, SPEC-93 test-harness lesson — never slice from `visible=` and assert the opener).
- **D-03** Docs after implementation (AGENTS §1.8, post-FINAL only): `docs/savepoint.md` entry + `AGENTS.md` §3 status line. NOT part of the spec-writing step; no doc edit ships with the DRAFT.

## Glossary

- **Sync Conflict dialog:** the `showConflictDialog` block (`Sync Conflict` title, three resolution buttons + Cancel in column layout).
- **Wrap:** NativeModal + dim + tap-outside + KAV + ScrollView around the existing `Surface`/`Dialog`, per the SPEC-93/94 precedent.

## References

- `AGENTS.md` (§1.9 spec format, §1.10 TDD/platform matrix, §1.11 bare-minimum, §1.12 no new deps, §1.14 one home)
- `specs/04-connection-status-vs-offline-mode.md` (template)
- `specs/93-make-online-dialog-centered.md` (sibling wrap precedent — mirrored, NOT amended)
- `specs/94-create-cloud-account-dialog-centered.md` (sibling wrap precedent — mirrored, NOT amended)
- `app/(tabs)/settings.tsx:1693-1721` (`showConflictDialog` block)
