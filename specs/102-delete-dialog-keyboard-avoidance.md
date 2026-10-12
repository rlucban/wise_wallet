# SPEC-102: Delete Account Dialog — Keyboard Covers Verify PIN on Phones

| Field | Value |
|-------|-------|
| **ID** | SPEC-102 |
| **Title** | Delete Account Dialog — Keyboard Covers Verify PIN on Phones |
| **Status** | FINAL (per user call 2026-10-12 — implementable) |
| **Owner** | @rcluc |
| **Version** | 1.0 FINAL |
| **Scope** | `app/(tabs)/settings.tsx` (`showDeleteDialog` NativeModal wrapper only) + new guard file `utils/deleteDialogKeyboard.test.ts` |
| **Non-goals** | No change to dialog content, copies, validation, verify/delete handlers, or any other dialog; no new pattern (strict SPEC-93/94/95 mirror); no dependency change |

---

## Conventions

The key words **MUST**, **MUST NOT**, **REQUIRED**, **SHALL**, **SHALL NOT**, **SHOULD**, **SHOULD NOT**, **RECOMMENDED**, **MAY**, and **OPTIONAL** in this document are to be interpreted as described in RFC 2119.

---

## Context

User report (2026-10-12, Android + iPhone): in Settings → Delete Account, tapping the PIN field opens the keyboard and the **Verify PIN button disappears** underneath it — the flow cannot proceed on a phone. Code trace: the `showDeleteDialog` NativeModal (`app/(tabs)/settings.tsx:1495-1575`) renders its `Surface` directly inside the centered scrim `View` with **no `KeyboardAvoidingView` and no `ScrollView`**. It is the only center dialog in settings still unwrapped — the verify (`showPinVerificationDialog`), new-account (`showNewAccountDialog`), and conflict (`showConflictDialog`) dialogs all received the NativeModal + scrim + KAV + ScrollView + `Surface` treatment (SPEC-93/94/95) and do not exhibit this. On a phone viewport the keyboard covers the lower half of the fixed-centered `Surface`, hiding Verify PIN (and, once verified and the checkbox row appears, the actions too).

**User decisions captured (2026-10-12):**
- Failing control: the **Verify PIN** button when the keyboard opens.
- Devices: **both** Android and iPhone.

---

## Constraints

| ID | Constraint |
|----|------------|
| **CON-01** | The screen **MUST** remain fully functional on **Android, iOS, and Web** (Expo SDK 57); Expo Go import-safe; Vercel-deployable. |
| **CON-02** | The fix **MUST** mirror the SPEC-93/94/95 wrapper byte-for-shape: `KeyboardAvoidingView` with `behavior={Platform.OS === "ios" ? "padding" : "height"}` + `style={{ flex: 1, width: "100%" }}`, containing a `ScrollView` with `style={{ flex: 1, width: "100%" }}`, `contentContainerStyle={{ flexGrow: 1, justifyContent: "center", alignItems: "center", width: "100%" }}`, `keyboardShouldPersistTaps="handled"`, containing the existing `Surface`. No new wrapper pattern. |
| **CON-03** | Dialog **content MUST** stay byte-identical: title, warning/description copies, PIN label + `TextInput`, error text, Verify PIN button, PIN-verified row, checkbox, Cancel / Delete Permanently actions, handlers, and disabled/loading expressions. |
| **CON-04** | The modal chrome (transparent, fade, overFullScreen, scrim `rgba(0, 0, 0, 0.32)`, dismiss `Pressable`, `onRequestClose`) **MUST** stay byte-identical; no conditional-mount change (sibling KAV dialogs are always-mounted the same way — SPEC-57's concern was screen-level KAV, not in-modal). |
| **CON-05** | No new import (`KeyboardAvoidingView`, `ScrollView`, `Platform` already imported for the sibling dialogs), no new dep, no other dialog touched. |
| **CON-06** | No code, config, or dependency change before this spec is marked **FINAL** by the user (AGENTS §1.1). |
| **CON-07** | **MUST** follow the SPEC-04 template and the AGENTS.md §1.10 platform matrix (Objective vs Subjective). |

---

## Goal

With the keyboard open on a phone, every Delete Account control (PIN field, Verify PIN, checkbox, Cancel, Delete Permanently) stays reachable via the standard KAV shift + scroll; keyboard-closed rendering is pixel-identical to today.

### Interaction Matrix

| State | Expected |
|-------|----------|
| Keyboard closed (all platforms) | Dialog renders centered exactly as today |
| Keyboard open, phone | Surface shifts/scrolls; Verify PIN button reachable (was: covered) |
| PIN verified (checkbox row added, taller content) | Checkbox + Cancel + Delete Permanently reachable via scroll |
| Modal closed, web | No swallowed scroll/taps (wrapper lives in-modal only) |

### Decisions

| ID | Decision |
|----|----------|
| **DEC-01** | Strict SPEC-93/94/95 mirror (user-visible bug, fourth instance of the solved class) — rejected: a bespoke keyboard offset, which would introduce a second pattern to maintain. |
| **DEC-02** | Content frozen (CON-03) — this spec fixes reachability only; any copy/behavior change to the delete flow needs its own spec. |
| **DEC-03** | New SPEC-102 file owns the delete-dialog wrap; SPEC-93/94/95 keep their dialogs; no document edited after FINAL (§1.14). |

### Acceptance Criteria

| ID | Criterion | Type |
|----|-----------|------|
| **ACC-01** | Source scan of `app/(tabs)/settings.tsx`: the `showDeleteDialog` block contains the KAV (`behavior={Platform.OS === "ios" ? "padding" : "height"}`) + ScrollView (`keyboardShouldPersistTaps="handled"`, centered `contentContainerStyle`) wrap around its `Surface`, shaped exactly like the sibling dialogs. | Objective |
| **ACC-02** | Source scan: delete-dialog content byte-identical — Verify PIN button, PIN-verified row, checkbox label, Cancel / Delete Permanently actions, handlers, and disabled/loading props all present and unchanged; sibling dialogs untouched. | Objective |
| **ACC-03** | Source scan: no new import line, no new dep, no other modal chrome change. | Objective |
| **ACC-S01** | Reviewer on Android + iPhone (Expo Go): Delete Account → tap PIN field → keyboard opens → Verify PIN reachable (scroll if needed); enter PIN → verify → checkbox appears → Delete Permanently reachable. FAIL = any control covered and unreachable. | Subjective |
| **ACC-S02** | Reviewer on Web: keyboard-closed dialog pixel-identical to today; modal-closed page scroll/taps normal; no console error. FAIL = any visual regression or swallowed interaction. | Subjective |

---

## Platform Matrix (AGENTS.md §1.10)

| Platform | Objective (machine-checkable) | Subjective (reviewer-observed) |
|----------|-------------------------------|-------------------------------|
| **Android** | ACC-01..ACC-03 pass with `Platform.OS === "android"`. | Expo Go: `behavior="height"` shift, all controls reachable (ACC-S01). |
| **iOS** | Same guards with `Platform.OS === "ios"`. | Expo Go: `behavior="padding"` shift, all controls reachable (ACC-S01). |
| **Web** | Same guards with `Platform.OS === "web"`. | Web export: closed-state identical, no swallowed scroll/taps (ACC-S02). |

TDD coverage (§1.10): new `utils/deleteDialogKeyboard.test.ts` covers ACC-01..ACC-03 parameterized by `Platform.OS` (`android`/`ios`/`web` via mock); ACC-S01/S02 are user-run manual checks exactly as written above (keyboard overlap is not jest-provable — guards pin the wrapper shape + frozen content).

---

## Deliverables

| ID | Deliverable |
|----|-------------|
| **D-01** | `app/(tabs)/settings.tsx` ONLY: wrap the `showDeleteDialog` `Surface` in the SPEC-93/94/95 KAV + ScrollView structure. No other line in the file changes. |
| **D-02** | New `utils/deleteDialogKeyboard.test.ts` (named here per §1.11): guards for ACC-01..ACC-03 × android/ios/web. |
| **D-03** | Docs after implementation (AGENTS §1.8, post-FINAL only): `docs/savepoint.md` entry + `AGENTS.md` §3 status line. NOT part of the spec-writing step; no doc edit ships with the DRAFT. |

---

## Glossary

| Term | Definition |
|------|------------|
| **KAV** | `KeyboardAvoidingView` — shifts content above the keyboard (`padding` iOS / `height` Android per repo precedent). |
| **Scrim** | The `rgba(0, 0, 0, 0.32)` full-screen dismiss layer behind the `Surface`. |
| **SPEC-93/94/95 mirror** | The exact KAV + ScrollView + `Surface` nesting already FINAL in the three sibling dialogs. |

---

## References

- `app/(tabs)/settings.tsx:1495-1575` (`showDeleteDialog` — the unwrapped site)
- `app/(tabs)/settings.tsx:1612-1620` (SPEC-93 wrap — the mirror source; 94/95 identical in shape)
- `specs/93-make-online-dialog-centered.md`, `specs/94-create-cloud-account-dialog-centered.md`, `specs/95-sync-conflict-dialog-centered.md` (pattern owners; unedited)
- `specs/57-clear-data-dialog-keyboard.md` (always-mounted-KAV concern — in-modal scope, not applicable)
- `AGENTS.md` §1.1 (spec-first), §1.9 (spec format), §1.10 (platform matrix + TDD), §1.11 (bare-minimum), §1.12 (no new deps), §1.14 (one home)
