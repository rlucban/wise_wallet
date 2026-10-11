# SPEC-93 — Make Online Dialog Centered + Keyboard-Safe on Phone

| Field | Value |
|---|---|
| ID | SPEC-93 |
| Title | Wrap the Make Online / Verify-PIN dialog so it centers and clears the keyboard |
| Status | **FINAL v1.0** (marked FINAL by user 2026-10-11 — implementable) |
| Owner | User (final authority) |
| Version | 1.0 FINAL |
| Scope | `app/(tabs)/settings.tsx` `showPinVerificationDialog` block ONLY + one new guard file `utils/makeOnlineDialogCentered.test.ts` |
| Non-goals | No copy change; no verify/state/handler change; no other dialog touched (backup/conflict/new-account/message stay); no Step-1/lock change; no new deps |
| Normative source | This file. File+symbol cites are normative; `:line` numbers are hints only. |

RFC 2119 terminology (MUST/MUST NOT/SHOULD/MAY) applies. Informative prose ("today", "currently") is non-normative unless restated as a requirement.

## Context

User call 2026-10-11 with phone screenshot (offline Local account → Make Online): the dialog (title + irreversibility copy + PIN prompt + Current PIN box + Cancel/Verify & Sync) sits low, bottom cut at the screen edge — *"dapat nasa center ito"*.

Today (source-traced): `showPinVerificationDialog` (`settings.tsx:1602-1628`) is a bare Paper `<Dialog>` in the `Portal` — no `NativeModal`, no `KeyboardAvoidingView`, no `ScrollView` (unlike the change dialog after SPEC-89 v1.1–v1.4 and the SPEC-57 Clear-Data dialog). On phone with the keyboard open for the Current PIN field, nothing shifts or scrolls it — actions end up covered. The block serves both titles (`Make Online` for Local, `Verify Account PIN` for Cloud) — one JSX block, fixed together.

## Constraints

- **CON-01** Every change MUST keep Android + iOS + Web working, stay Expo Go (latest) import-safe, and stay Vercel-deployable.
- **CON-02** No new npm packages, native modules, fonts, images, or third-party code (AGENTS §1.12). `NativeModal`/`KeyboardAvoidingView`/`ScrollView`/`Pressable` all already imported in this file.
- **CON-03** Bare-minimum diff (AGENTS §1.11). ONLY the `showPinVerificationDialog` block: wrap it in the change-dialog precedent (`NativeModal` transparent/fade/`overFullScreen` + scrim `View` (`rgba(0, 0, 0, 0.32)`, as other modals in this file) + tap-outside `Pressable` + `KeyboardAvoidingView` iOS-padding/else-height + `ScrollView` flex/bounded + persistTaps + `Surface`/`Dialog` inside; `onRequestClose` mirrors today's `onDismiss` exactly — close only, no input clearing (corrected at FINAL-mark: `onDismiss` never cleared; Cancel keeps its own clearing). Title/copy/inputs/error/buttons/handlers/loading/disabled states byte-identical.
- **CON-04** Identical on Android, iOS, and Web — no new `Platform.OS` branch beyond the KAV ternary (register/login/SPEC-57 precedent). Any other platform branch needs its own amendment first (§1.10).
- **CON-05** No code, config, or dependency change before this spec is marked FINAL by the user (AGENTS §1.1).

## Goal

Make Online dialog centered with keyboard open; everything else pixel-identical.

### Interaction matrix

| Surface | Today | After (FINAL) |
|---|---|---|
| Position, keyboard up | Low, bottom cut/covered | Centered, shifts + scrolls clear |
| Titles/copy/inputs/buttons | As today | Byte-identical |
| Other dialogs/flows | As today | Byte-identical |

### Decisions (FINAL — user marked final 2026-10-11 with no overriding calls; DRAFT proposals adopted as-is)

- **DEC-01 (FINAL)** Full NativeModal+KAV+ScrollView mirror of the change dialog (rejected: KAV-only — disproven on tall content; rejected: leaving bare — the reported bug).
- **DEC-02 (FINAL)** Both titles in one change (single JSX block — inseparable; rejected: splitting the dialog per mode).

### Acceptance

Platform matrix (§1.10): every Objective guard holds on `android` / `ios` / `web` (jest `Platform.OS` mock); every Subjective check is user-run on Expo Go (Android/iOS) + `expo export --platform web` (agent never runs CLIs per AGENTS §1.3).

Objective — deterministic, machine-checkable (jest source-scan guards):

- **ACC-01** The `showPinVerificationDialog` block holds a `NativeModal` (transparent/fade/`overFullScreen`, dismiss wiring) + dim `View` + tap-outside `Pressable` + `KeyboardAvoidingView` (iOS-padding/else-height ternary) + `ScrollView` (flex, persistTaps) + `Surface`/`Dialog` inside. Holds on android/ios/web.
- **ACC-02** Both titles, both copies, PIN prompt/input/error, Cancel/Verify & Sync (loading/disabled/handler) byte-identical. Holds on android/ios/web.
- **ACC-03** Scope: no other dialog block touched; no new imports/deps/`Platform` branch beyond the KAV ternary. Holds on android/ios/web.

Subjective — human-judged UX as observable reviewer checks (explicit pass/fail, user-run):

- **ACC-S01** Reviewer on iOS (Expo Go, phone, Local account) confirms: Make Online dialog centered with keyboard up, Current PIN + Verify & Sync reachable (scroll if needed); flow completes identically. FAIL = low/clipped dialog or untappable action.
- **ACC-S02** Reviewer on Android + Web confirms ACC-S01 identically (Cloud `Verify Account PIN` title included) with no console error. FAIL = any platform-only deviation.

TDD coverage (§1.10): `utils/makeOnlineDialogCentered.test.ts` covers ACC-01..ACC-03 parameterized by `Platform.OS` (android/ios/web); ACC-S01/S02 are user-run manual checks exactly as written (keyboard/centering are not jest-renderable — guards pin the contract).

## Deliverables

- **D-01** `app/(tabs)/settings.tsx` ONLY: `showPinVerificationDialog` wrap per CON-03. No other line changes.
- **D-02** `utils/makeOnlineDialogCentered.test.ts` (new file, named here per §1.11): guards for ACC-01..ACC-03 × android/ios/web.
- **D-03** Docs after implementation (AGENTS §1.8, post-FINAL only): `docs/savepoint.md` entry + `AGENTS.md` §3 status line. NOT part of the spec-writing step; no doc edit ships with the DRAFT.

## Glossary

- **Make Online dialog:** the `showPinVerificationDialog` block (`Make Online` title for Local, `Verify Account PIN` for Cloud).
- **Wrap:** NativeModal + dim + tap-outside + KAV + ScrollView around the existing `Surface`/`Dialog`, per the change-dialog precedent.

## References

- `AGENTS.md` (§1.9 spec format, §1.10 TDD/platform matrix, §1.11 bare-minimum, §1.12 no new deps, §1.14 one home)
- `specs/04-connection-status-vs-offline-mode.md` (template)
- `specs/89-change-passcode-ios-entry-ui.md` v1.1–v1.4 (wrap precedent — mirrored, NOT amended)
- `specs/57-clear-data-dialog-keyboard.md` (SPEC-57 — second precedent; NOT amended)
- `app/(tabs)/settings.tsx:1602-1628` (`showPinVerificationDialog` block)
