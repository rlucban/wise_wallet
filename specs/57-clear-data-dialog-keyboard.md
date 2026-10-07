# SPEC-57 — Clear-Data PIN Dialog Keyboard Avoidance (Mobile)

| Field | Value |
|---|---|
| ID | SPEC-57 |
| Title | "Enter PIN to Clear Data" dialog stays visible above the mobile software keypad |
| Status | **FINAL** v0.1 (marked by user 2026-10-07; implementable per AGENTS.md §1.1) |
| Owner | User (final authority) |
| Version | v0.1 FINAL; v1.1 DRAFT amendment appended below (needs FINAL per §1.1) |
| Scope | `showPinPrompt` dialog only in `app/(tabs)/settings.tsx` (KeyboardAvoidingView wrap) + one guard test + journal |
| Non-goals | All other PIN dialogs (verify-sync, delete-account, change-passcode — user said "first"; each gets its own spec); app.json `softInputMode`; auth logic, copy, styling beyond the wrap |
| Normative source | This file (once marked FINAL). File+symbol cites are normative; `:line` numbers are hints only. |

> History: v0.1 DRAFT 2026-10-07 from user report (mobile keypad covers the
> Clear Data PIN dialog; web fine). FINAL 2026-10-07 per user call ("final").

## Terminology (RFC 2119)

The keywords **MUST**, **MUST NOT**, **SHOULD**, and **MAY** in this spec are
to be interpreted as described in RFC 2119. Informative prose (examples,
"today", "currently") is non-normative unless restated as a requirement.

## Context

### Problem

In one sentence: **on native, tapping the Clear Data PIN field raises the
software keypad over the dialog, hiding the PIN field and the Clear Data /
Cancel buttons; web is unaffected.**

### Evidence (verified read-only, this tree)

- `app/(tabs)/settings.tsx` `showPinPrompt` dialog — plain Paper `Dialog` +
  `TextInput`, no keyboard-avoidance wrapper (contrast `app/login.tsx:286`
  and `app/register.tsx:195`, which both wrap their forms in
  `KeyboardAvoidingView` with `behavior` iOS-padding / Android-height).
- Paper `Dialog` renders in a `Portal`/`Modal` whose window does not reliably
  resize for the keypad on its own — hence the explicit wrapper, matching
  the repo's existing auth-screen precedent.

### Notes (informative)

- "First" per the user call: the other PIN dialogs keep today's behavior;
  each is a separate future spec if the same symptom is confirmed there.

## Constraints (normative)

- **CON-57-01 — Bare-minimum diff (§1.11).** Only the `showPinPrompt`
  `Dialog` JSX (+ the `KeyboardAvoidingView` import) MAY change, plus the
  files named in D-*. No other dialog, no copy, no style, no logic.
- **CON-57-02 — Exact wrapper.** The `showPinPrompt` `Dialog` MUST be
  conditionally mounted as `{showPinPrompt && (<KeyboardAvoidingView
  behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
  <Dialog …/> </KeyboardAvoidingView>)}`. No `keyboardVerticalOffset`
  (centered dialog, nothing above it to clear).
  Correction 2026-10-07 (implementation finding, same intent): the wrapper
  MUST be gated on `showPinPrompt`. An always-mounted
  `KeyboardAvoidingView` with `flex: 1` renders a permanent full-height
  layer inside the `Portal`, which on web swallows scroll and taps (reported:
  "settings not scrollable or clickable"). `visible` lives on the inner
  `Dialog`, so it never unmounts the wrapper.
- **CON-57-03 — No new dependencies (§1.12).** `KeyboardAvoidingView` and
  `Platform` come from `react-native` (both already imported in this file;
  only the name is added to the import list).
- **CON-57-04 — Cross-platform invariant (§1.5).** Identical JSX on
  Android + iOS + Web (behavior prop is the only platform split, via the
  existing ternary pattern — no new `Platform.OS` branch structure). Web
  MUST show zero visual/behavioral change (no software keypad resizes there).
- **CON-57-05 — Expo Go safe (§1.7) / Vercel-deployable (§1.6).** No new
  native import, no Node API, no secrets.
- **CON-57-06 — TDD with cross-platform coverage (§1.10).** Source-text
  guard × `android`/`ios`/`web` + user-run device matrix (jest cannot raise
  a keypad).
- **CON-57-07 — Docs (§1.8).** `docs/savepoint.md` + `AGENTS.md` §3 entry.
  Status flips to FINAL only on explicit user call.

## Goal

### Interaction matrix

| Platform | Tap PIN field | Keypad up | Dialog + buttons |
|---|---|---|---|
| Android | focus | resizes | fully visible, both buttons tappable |
| iOS | focus | padding shifts | fully visible, both buttons tappable |
| Web | focus | n/a (no resize) | byte-identical to today |

### Decisions

- **DEC-57-01 (RECOMMENDED):** `KeyboardAvoidingView` wrapper over an
  `app.json` `android:windowSoftInputMode` change — rejected because it is
  global native config affecting every screen (heavier review, rebuild
  implications) for a one-dialog defect.
- **DEC-57-02 (RECOMMENDED):** no `keyboardVerticalOffset` — the dialog is
  centered with no header above it; an offset would just push it off-center.

### Acceptance

Objective (machine-checkable):

| ID | Android | iOS | Web | Check |
|----|---------|-----|-----|-------|
| ACC-01 | ✅ | ✅ | ✅ | Source-text guard: `showPinPrompt` gated `KeyboardAvoidingView` wrapper with the exact behavior ternary and `flex: 1` |
| ACC-02 | ✅ | ✅ | ✅ | Exactly one wrapper (one open + one close tag), enclosing the `showPinPrompt` dialog and its `handleClearData` button; no other dialog wrapped |
| ACC-03 | ✅ | ✅ | ✅ | `jest` 0 failed, `lint` clean, `tsc` clean; no dep/route/storage/logic change |

Subjective (reviewer-observed, Expo Go + web export):

- **ACC-S01 (Android):** open Clear Data → tap PIN → keypad covers nothing; PIN field + Cancel + Clear Data all visible and tappable; dismissing the keypad leaves the dialog intact.
- **ACC-S02 (iOS):** same as S01.
- **ACC-S03 (Web):** dialog looks and behaves exactly as before.

## Deliverables

- **D-57-01 (`app/(tabs)/settings.tsx`):** `KeyboardAvoidingView` added to
  the `react-native` import; `showPinPrompt` `Dialog` wrapped per CON-57-02.
  Nothing else in the file.
- **D-57-02 (new `utils/clearDataKeyboard.test.ts`):** ACC-01..02 across
  `android`/`ios`/`web`.
- **D-57-03 (user-run matrix):** ACC-S01..S03 (Expo Go Android+iOS + web export).
- **D-57-04 (docs):** `docs/savepoint.md` + `AGENTS.md` §3 entry per §1.8.

## Glossary

- **showPinPrompt:** the "Enter PIN to Clear Data" dialog state + JSX in `app/(tabs)/settings.tsx`.
- **KeyboardAvoidingView:** RN component that shrinks/shifts its subtree when the software keypad appears.

---

## Amendment v1.1 — Confirm-first reorder + blocking loader + PIN hygiene (DRAFT, needs FINAL)

> v0.1 above stays FINAL and untouched. Only this section is DRAFT. No
> normative change takes effect until the user marks v1.1 FINAL.

### Problem

In one sentence: **the PIN gate fires before intent is confirmed, nothing
blocks navigation during the wipe, and the typed PIN lingers in the field
after cancel or success.**

### Constraints (delta, normative)

- **CON-57-11 — Confirm-first order (exact).** The Clear All Data button MUST
  open `showDeleteConfirmation` ("Are you absolutely sure?") first; its
  confirm action MUST open `showPinPrompt` ("Enter PIN to Clear Data")
  instead of executing; a successful PIN verify MUST call
  `executeClearData` directly (no second confirm screen). Cancel at either
  dialog aborts with zero deletion.
- **CON-57-12 — PIN dialog centered like the confirm dialog.** `showPinPrompt`
  Content MUST use the existing `styles.dialogContent` + centered text
  (matching `showDeleteConfirmation`); no new style values. (Paper centers
  the dialog frame vertically already; this aligns the interior.)
- **CON-57-13 — Blocking loader.** While `executeClearData` runs, a
  full-screen overlay (`Portal` + `Modal dismissable={false}` with a
  no-op `onDismiss`, `ActivityIndicator` + exact text `"Clearing data…"`)
  MUST cover the screen so the user cannot navigate away mid-wipe. It MUST
  be driven by a dedicated clear-specific boolean (not the shared
  `isSyncing`, which backup/restore also use), set true on entry and false
  in `finally`.
- **CON-57-14 — PIN hygiene (exact).** `pinInput` MUST be cleared on
  (a) `showPinPrompt` dismiss/close for any reason, (b) the
  successful-verify transition into execute, and (c) `executeClearData`
  completion (success or failure). A failed verify keeps the dialog open
  with the typed PIN intact for retry (DEC-57-05).
- **CON-57-15 — Scope.** Only `showPinPrompt`/`showDeleteConfirmation`
  wiring, the loader overlay, PIN-state clears, and centering MAY change,
  plus D-57-12/D-57-13 files. Gate rule (SPEC-51), keyboard wrap (v0.1),
  and all other dialogs stay frozen.

### Decisions

- **DEC-57-03 (user call):** confirm-first — intent is proven before the
  credential is asked.
- **DEC-57-04:** dedicated loader boolean over `isSyncing` — the overlay
  must never appear for backup/restore and must never be cleared by them.
- **DEC-57-05:** failed-verify retry keeps the PIN — the dialog never closes
  on failure, so clearing there would only punish retry.

### Acceptance

Objective (machine-checkable):

| ID | Android | iOS | Web | Check |
|----|---------|-----|-----|-------|
| ACC-11 | ✅ | ✅ | ✅ | Source-text guard: Clear All Data button opens `showDeleteConfirmation`; the confirm action opens `showPinPrompt`; successful verify calls `executeClearData` with no intermediate confirm |
| ACC-12 | ✅ | ✅ | ✅ | Source-text guard: overlay is `dismissable={false}` with no-op dismiss, visible tied to the dedicated boolean set/reset in `executeClearData` entry/`finally` |
| ACC-13 | ✅ | ✅ | ✅ | Source-text guard: PIN cleared on dialog dismiss, on verify-success transition, and in execute `finally`; failed-verify path contains no clear |
| ACC-14 | ✅ | ✅ | ✅ | `jest` 0 failed, `lint` clean, `tsc` clean; no dep/route/storage/logic change beyond the above |

Subjective (reviewer-observed, Expo Go + web export):

- **ACC-S11:** tap Clear All Data → confirm screen → confirm → PIN screen → correct PIN → loader covers the screen until the success message; Back/hardware-back during load does nothing.
- **ACC-S12:** cancel at either dialog (or tap outside) → zero deletion; reopening shows an empty PIN field; after a completed wipe the field is empty.
- **ACC-S13:** PIN dialog interior centered like the confirm dialog on all three platforms.

### Deliverables

- **D-57-11 (`app/(tabs)/settings.tsx` only):** reorder wiring + centering +
  loader overlay + PIN clears per CON-57-11..14. Nothing else in the file.
- **D-57-12 (`utils/clearDataKeyboard.test.ts`, extend):** ACC-11..13 across
  `android`/`ios`/`web`.
- **D-57-13 (docs):** `docs/savepoint.md` + `AGENTS.md` §3 entry per §1.8.

## References

- `app/(tabs)/settings.tsx` (gate + dialog) · `app/login.tsx:286` and `app/register.tsx:195` (wrapper precedent) · `specs/51-pin-gate-verification-parity.md` (owns the gate rule — untouched here).
