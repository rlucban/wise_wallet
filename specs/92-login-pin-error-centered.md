# SPEC-92 — Login PIN Validation Message Centered

| Field | Value |
|---|---|
| ID | SPEC-92 |
| Title | Center the login PIN validation message so it reads clearly |
| Status | **FINAL v1.0** (marked FINAL by user 2026-10-11 — implementable) |
| Owner | User (final authority) |
| Version | 1.0 FINAL |
| Scope | `app/login.tsx` PIN `HelperText` style ONLY + one new guard file `utils/loginPinErrorCentered.test.ts` |
| Non-goals | No copy change (same validation strings); no email/name error change (PIN only); no input/validation/button/login-flow change; no new deps |
| Normative source | This file. File+symbol cites are normative; `:line` numbers are hints only. |

RFC 2119 terminology (MUST/MUST NOT/SHOULD/MAY) applies. Informative prose ("today", "currently") is non-normative unless restated as a requirement.

## Context

User call 2026-10-11 (Tagalog): *"yung sa validation pag mali ininput na pin ni user sa login dapat nasa center yun para kita"* — when the entered PIN is wrong, the login validation message must be centered so it is clearly visible.

Today (source-traced): `app/login.tsx:353-355` renders the PIN error in a bare `<HelperText type="error" visible={!!pinError}>` with no style (left-aligned default), while the email error (`:326-328`) is likewise unstyled. The validation strings themselves (`Passcode must be exactly 4 digits`, incorrect-PIN copies) are not in scope.

## Constraints

- **CON-01** Every change MUST keep Android + iOS + Web working, stay Expo Go (latest) import-safe, and stay Vercel-deployable.
- **CON-02** No new npm packages, native modules, fonts, images, or third-party code (AGENTS §1.12).
- **CON-03** Bare-minimum diff (AGENTS §1.11). ONLY the PIN `HelperText` gains a centering style (`textAlign: "center"` — the same one-prop pattern used for centered dialog copy in-tree). Error strings, visibility logic, input, validation, buttons, and every other line stay byte-identical — including the email `HelperText`.
- **CON-04** Identical on Android, iOS, and Web — no `Platform.OS` / `Platform.select` branch. Any platform branch needs its own amendment first (§1.10).
- **CON-05** No code, config, or dependency change before this spec is marked FINAL by the user (AGENTS §1.1).

## Goal

Wrong-PIN feedback on login reads centered; everything else pixel-identical.

### Interaction matrix

| Surface | Today | After (FINAL) |
|---|---|---|
| Login PIN error | Left-aligned, unstyled | Centered (`textAlign: "center"`) |
| Login PIN strings/logic | As today | Byte-identical |
| Email error + rest | As today | Byte-identical |

### Decisions (FINAL — user marked final 2026-10-11 with no overriding calls; DRAFT proposals adopted as-is)

- **DEC-01 (FINAL)** PIN error only (rejected: centering the email error too — unasked).
- **DEC-02 (FINAL)** `textAlign: "center"` on the `HelperText` (rejected: restyling the input/border — unasked).

### Acceptance

Platform matrix (§1.10): every Objective guard holds on `android` / `ios` / `web` (jest `Platform.OS` mock — no platform branch in the change); every Subjective check is user-run on Expo Go (Android/iOS) + `expo export --platform web` (agent never runs CLIs per AGENTS §1.3).

Objective — deterministic, machine-checkable (jest source-scan guards):

- **ACC-01** `app/login.tsx` PIN `HelperText` holds `textAlign: "center"`; the email `HelperText` holds zero `textAlign`. Holds on android/ios/web.
- **ACC-02** PIN validation strings and visibility logic (`visible={!!pinError}`, `{pinError}`, `setPinError` calls) byte-identical; login button/handler/flow intact. Holds on android/ios/web.
- **ACC-03** Scope: no `Platform.OS` added, no new imports/deps, no other line changed. Holds on android/ios/web.

Subjective — human-judged UX as observable reviewer checks (explicit pass/fail, user-run):

- **ACC-S01** Reviewer on Android/iOS (Expo Go) confirms: wrong-PIN error renders centered and readable; correct-PIN login unaffected. FAIL = left-aligned error or any behavior change.
- **ACC-S02** Reviewer on Web confirms ACC-S01 identically with no console error. FAIL = any web-only deviation.

TDD coverage (§1.10): `utils/loginPinErrorCentered.test.ts` covers ACC-01..ACC-03 parameterized by `Platform.OS` (android/ios/web); ACC-S01/S02 are user-run manual checks exactly as written (centering pixels are not jest-renderable — guards pin the contract).

## Deliverables

- **D-01** `app/login.tsx` ONLY: centering style on the PIN `HelperText` per CON-03. No other line changes.
- **D-02** `utils/loginPinErrorCentered.test.ts` (new file, named here per §1.11): guards for ACC-01..ACC-03 × android/ios/web.
- **D-03** Docs after implementation (AGENTS §1.8, post-FINAL only): `docs/savepoint.md` entry + `AGENTS.md` §3 status line. NOT part of the spec-writing step; no doc edit ships with the DRAFT.

## Glossary

- **PIN error:** the `pinError` `HelperText` under the login PIN input (wrong/short PIN feedback).
- **Centered:** `textAlign: "center"` on that `HelperText` only.

## References

- `AGENTS.md` (§1.9 spec format, §1.10 TDD/platform matrix, §1.11 bare-minimum, §1.12 no new deps, §1.14 one home)
- `specs/04-connection-status-vs-offline-mode.md` (template)
- `app/login.tsx:35-36,154-162,330-355` (PIN state/validation/input/error)
