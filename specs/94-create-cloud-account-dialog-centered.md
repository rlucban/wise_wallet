# SPEC-94 — Create Cloud Account Dialog Centered on Phone

| Field | Value |
|---|---|
| ID | SPEC-94 |
| Title | Wrap the Create Cloud Account dialog so it centers on phone |
| Status | **FINAL v1.0** (marked FINAL by user 2026-10-11 — implementable) |
| Owner | User (final authority) |
| Version | 1.0 FINAL |
| Scope | `app/(tabs)/settings.tsx` `showNewAccountDialog` block ONLY + one new guard file `utils/createCloudAccountDialogCentered.test.ts` |
| Non-goals | No copy change; no handler/state change; no other dialog touched (verify/backup/conflict/message stay); no new deps |

RFC 2119 terminology (MUST/MUST NOT/SHOULD/MAY) applies. Informative prose ("today", "currently") is non-normative unless restated as a requirement.

## Context

User call 2026-10-11 with phone screenshot (Settings → Make Online flow): the `Create Cloud Account` dialog (title + migration copy + unaffected-data note + Cancel / Create New & Migrate) sits low, bottom cut at the screen edge — *"ito rin dapat nasa center to"*.

Today (source-traced): `showNewAccountDialog` (`settings.tsx:1652-1669`) is a bare Paper `<Dialog>` in the `Portal` — no `NativeModal`, no `KeyboardAvoidingView`, no `ScrollView`. Same low-position class SPEC-93 just fixed for the sibling `showPinVerificationDialog` block (`settings.tsx:1602-1650`, now `NativeModal` + scrim + KAV + `ScrollView` + `Surface`). The block serves both titles (`Create Cloud Account` for Local, `PIN Doesn't Match` for Cloud) — one JSX block, fixed together. This dialog has no text input, so keyboard-avoidance is precautionary (content growth / small screens), not the reported bug — the reported bug is vertical centering.

## Constraints

- **CON-01** Every change MUST keep Android + iOS + Web working, stay Expo Go (latest) import-safe, and stay Vercel-deployable.
- **CON-02** No new npm packages, native modules, fonts, images, or third-party code (AGENTS §1.12). `NativeModal`/`KeyboardAvoidingView`/`ScrollView`/`Pressable` all already imported in this file (`settings.tsx:2`).
- **CON-03** Bare-minimum diff (AGENTS §1.11). ONLY the `showNewAccountDialog` block: wrap it in the SPEC-93 precedent (`NativeModal` transparent/fade/`overFullScreen` + scrim `View` (`rgba(0, 0, 0, 0.32)`, as other modals in this file) + tap-outside `Pressable` + `KeyboardAvoidingView` iOS-padding/else-height + `ScrollView` flex/bounded + persistTaps + `Surface`/`Dialog` inside; `onRequestClose` mirrors today's `onDismiss` exactly — close only, no state clearing; Cancel keeps its own handler). Titles/copy/note/buttons/handlers/loading/disabled states byte-identical.
- **CON-04** Identical on Android, iOS, and Web — no new `Platform.OS` branch beyond the KAV ternary (register/login/SPEC-57 precedent). Any other platform branch needs its own amendment first (§1.10).
- **CON-05** No code, config, or dependency change before this spec is marked FINAL by the user (AGENTS §1.1).

## Goal

Create Cloud Account dialog centered on phone; everything else pixel-identical.

### Interaction matrix

| Surface | Today | After (FINAL) |
|---|---|---|
| Position on phone | Low, bottom cut at screen edge | Centered in viewport |
| Titles/copy/note/buttons | As today | Byte-identical |
| Other dialogs/flows | As today | Byte-identical |

### Decisions (FINAL — user marked final 2026-10-11; DRAFT DEC-01(a) adopted as-is)

- **DEC-01 (FINAL)** Full NativeModal+KAV+ScrollView mirror of SPEC-93 (one precedent for all Make-Online-flow dialogs; KAV/ScrollView precautionary — no input today, but harmless and keeps a single wrap pattern; rejected: lighter wrap without KAV/ScrollView — smaller diff but a second pattern to maintain; rejected: leaving bare — the reported bug).
- **DEC-02 (FINAL)** Both titles in one change (single JSX block — inseparable; rejected: splitting the dialog per mode).

### Acceptance

Platform matrix (§1.10): every Objective guard holds on `android` / `ios` / `web` (jest `Platform.OS` mock); every Subjective check is user-run on Expo Go (Android/iOS) + `expo export --platform web` (agent never runs CLIs per AGENTS §1.3).

Objective — deterministic, machine-checkable (jest source-scan guards):

- **ACC-01** The `showNewAccountDialog` block holds a `NativeModal` (transparent/fade/`overFullScreen`, dismiss wiring) + dim `View` + tap-outside `Pressable` + `KeyboardAvoidingView` (iOS-padding/else-height ternary) + `ScrollView` (flex, persistTaps) + `Surface`/`Dialog` inside. Holds on android/ios/web.
- **ACC-02** Both titles (`Create Cloud Account` / `PIN Doesn't Match`), both copies, unaffected-data note, Cancel / Create New & Migrate (loading/disabled/handler `createNewAccountAndMigrate`) byte-identical. Holds on android/ios/web.
- **ACC-03** Scope: no other dialog block touched (`showPinVerificationDialog`, `showBackupDialog`, `showConflictDialog` byte-identical); no new imports/deps/`Platform` branch beyond the KAV ternary. Holds on android/ios/web.

Subjective — human-judged UX as observable reviewer checks (explicit pass/fail, user-run):

- **ACC-S01** Reviewer on iOS (Expo Go, phone, Local account → Make Online → Create Cloud Account) confirms: dialog centered in viewport, both buttons reachable without scrolling on a normal-height phone; flow completes identically. FAIL = low/clipped dialog or untappable action.
- **ACC-S02** Reviewer on Android + Web confirms ACC-S01 identically (Cloud `PIN Doesn't Match` title included) with no console error. FAIL = any platform-only deviation.

TDD coverage (§1.10): `utils/createCloudAccountDialogCentered.test.ts` covers ACC-01..ACC-03 parameterized by `Platform.OS` (android/ios/web); ACC-S01/S02 are user-run manual checks exactly as written (centering is not jest-renderable — guards pin the contract).

## Deliverables

- **D-01** `app/(tabs)/settings.tsx` ONLY: `showNewAccountDialog` wrap per CON-03 (DEC-01a). No other line changes.
- **D-02** `utils/createCloudAccountDialogCentered.test.ts` (new file, named here per §1.11): guards for ACC-01..ACC-03 × android/ios/web. `blockOf()` MUST anchor on the opener (`lastIndexOf("<NativeModal", anchor)`, SPEC-93 test-harness lesson — never slice from `visible=` and assert the opener).
- **D-03** Docs after implementation (AGENTS §1.8, post-FINAL only): `docs/savepoint.md` entry + `AGENTS.md` §3 status line. NOT part of the spec-writing step; no doc edit ships with the DRAFT.

## Glossary

- **Create Cloud Account dialog:** the `showNewAccountDialog` block (`Create Cloud Account` title for Local, `PIN Doesn't Match` for Cloud).
- **Wrap:** NativeModal + dim + tap-outside + KAV + ScrollView around the existing `Surface`/`Dialog`, per the SPEC-93 precedent.

## References

- `AGENTS.md` (§1.9 spec format, §1.10 TDD/platform matrix, §1.11 bare-minimum, §1.12 no new deps, §1.14 one home)
- `specs/04-connection-status-vs-offline-mode.md` (template)
- `specs/93-make-online-dialog-centered.md` (sibling wrap precedent — mirrored, NOT amended)
- `specs/89-change-passcode-ios-entry-ui.md` v1.1–v1.4 (original wrap precedent, NOT amended)
- `app/(tabs)/settings.tsx:1652-1669` (`showNewAccountDialog` block)
- `app/(tabs)/settings.tsx:1602-1650` (SPEC-93 wrapped sibling, post-fix shape)
