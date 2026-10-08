---
skill: plan-fix
story: "Center the calculator, Settings Delete/Clear/Change Passcode, and Scheduled Payment Method/Insufficient Balance dialogs on Android, iOS, and Web; layout-only per FINAL SPEC-66"
repo: C:\Users\rcluc\Downloads\wise_wallet
calibration: {1: "A — Compact card", 2: "A — Diagram", 3: "D — Explain everything, collapsed", 4: "A — SCAN → VISUAL → APPROVE → BUILD", 5: "B — Implementing…, one visual summary at the end", 6: "A — Teach"}
workflow:
decision: "Per FINAL SPEC-66 v1.2 / SPEC-57 v1.3, replace only selected Settings and Scheduled Paper Dialog roots with React Native Modal full-screen hosts, centered card/backdrop, preserving content/handlers/sizing/dismissal/keyboard behavior; Calculator remains verify-only unless it fails D-03"
status: implementing
pending: calculator-slice-approval
---

# Plan

## Progress

| id | question | answer |
|----|----------|--------|
| calibration-use | Use last calibration? | A — Use it (A, A, D, A, B, A) |
| scan | Read call sites and owners | Completed; SPEC-66 FINAL; source paths below |
| visual | Layout approach | A — explicit centered Modal wrappers for selected Settings/Scheduled dialogs; calculator verification-only |
| plan-done | Is this plan done? | A — Done |
| handoff | Run implement-fix with this file? | A — Yes |
| who-implements | Who applies the slices? | A — User implements; agent proposes only |
| slice-1 | Apply Settings layout proposal? | A — User will apply; agent made no code edits |
| who-implements-update | Updated implementation instruction | User said "code this for me"; agent now proposes/edits, with per-slice approval |
| slice-1-approval | Apply S1? | A — Apply this slice |
| slice-1-result | S1 Settings layout | User's latest screenshot shows Change Passcode also bottom-stuck. Agent edge-pinned all four transparent Modal content containers (`position:absolute`, top/right/bottom/left 0) to center independently of intrinsic/flex sizing; editor diagnostics clean; device retest pending |
| spec-overlap | SPEC-57 vs SPEC-66 | User pasted Jest: 33 suites passed, 1 failed; 718 tests passed, 6 failed. `clearDataKeyboard.test.ts` failures enforce SPEC-57's exact KAV flex:1/Dialog wrapper; SPEC-66 D-01 overlaps this same Clear Data PIN surface. Paused pending canonical decision. |
| spec-canonical | Governing spec for Clear Data PIN centering | B — SPEC-66 governs; amend SPEC-57 and its guard, then finalize before code resumes |
| spec-amendment | Normative reconciliation | Drafted SPEC-57 v1.2 + SPEC-66 v1.1; `clearDataKeyboard.test.ts` remains untouched until both amendments are FINAL |
| spec-final | Finalize reconciled specs | User said FINAL; SPEC-57 v1.2 and SPEC-66 v1.1 marked FINAL |
| guard-slice | Update failing guard | D-06 included in S4; A — Apply this slice |
| guard-result | SPEC-57 regression guard | User-run `npx jest utils/clearDataKeyboard.test.ts`: 1 suite, 12/12 passed; `npm run lint`: clean |
| visual-failure | S1 centering | User reports `npx tsc --noEmit` and lint pass but Settings dialog remains bottom-stuck after Paper Modal flex, intrinsic-size, and absolute-fill variants. Further Paper style guessing paused; changing to React Native Modal requires finalized spec amendment because SPEC-57 v1.2 names Paper Modal. |
| native-modal-amendment | User chose A | Drafted SPEC-66 v1.2 and SPEC-57 v1.3 for React Native Modal host; no code/test changes until both are explicitly FINAL |
| native-modal-final | Finalize native host | User said FINAL; SPEC-66 v1.2 and SPEC-57 v1.3 marked FINAL |
| native-modal-settings | Apply Settings host slice | A — Apply this slice; four Settings hosts converted to RN Modal with full-screen backdrop/dismissal; editor diagnostics clean |
| native-modal-guard | Update keyboard guard | A — Apply this slice; test now asserts NativeModal, overlay/dismissal, one inner KAV, and retained PIN action; editor diagnostics clean |
| calculator-failure | D-03 visual check | User reports Calculator is also bottom-stuck; centering-only adjustment authorized by D-03 and the latest request |
| calculator-host | D-03 host adjustment | A — Apply this slice; CalculatorDialog now uses NativeModal full-screen centered host; editor diagnostics clean |

## Pending

- calculator-validation (user-run checks and iPhone visual check of Calculator; then proceed to S4 guard approval)

## Decisions

Approved 2026-10-08: **Option A — explicit full-viewport centering wrappers**
for the selected Settings and Scheduled dialog surfaces. Per FINAL SPEC-66
v1.2 and SPEC-57 v1.3, the wrapper host is now React Native's built-in `Modal`
with a full-screen centered view and pressable backdrop, rather than Paper's
Portal Modal. Preserve all dialog content, copy, handlers, validation, actions,
sizing, outside dismissal, Android back dismissal, and keyboard behavior; no
platform-specific tree. Calculator's Paper Portal Modal is reported failing
D-03, so convert it to the same host while preserving its calculator state and
keypad. Fixed offsets are rejected because they cannot keep dialogs of
different heights centered.

How this plan preserves each applicable invariant:

- FINAL spec prerequisite (AGENTS.md §1.1): SPEC-66 was explicitly marked
	FINAL before this plan proposal.
- No agent CLI (AGENTS.md §1.3): user runs the listed checks and provides
	output; agent does not execute terminal commands.
- Android + iOS + Web (AGENTS.md §1.5/§1.10): use one viewport-centered layout
	on every platform and the required platform matrix/manual checks.
- Vercel/Web export (AGENTS.md §1.6): no native-only code or Node APIs; Web
	export is a required manual check.
- Bare-minimum diffs (AGENTS.md §1.11): touch only SPEC-66 D-01..D-08 paths;
	edit Calculator only because the user reports D-03 failure.
- No dependencies (AGENTS.md §1.12): use existing React Native Paper Modal.
- Storage/API/routes/native dependency compatibility (AGENTS.md §1.4): no data
	or navigation path changes.
- Documentation after approved changes (.agents/rules/wisewallet.md): D-05
	updates both savepoint and AGENTS status after verification.
- Ask before code changes (.agents/rules/wisewallet.md): this is a plan only;
	implementation still requires its separate handoff and per-slice approval.

Layering order from repository.md: screen owners in `app/` first
(`settings.tsx`, then `dues.tsx`); `components/CalculatorDialog.tsx` is a
verification-only component check; `utils/` test; then documentation.

Gold paths: `specs/04-connection-status-vs-offline-mode.md` for normative spec
format; `components/CalculatorDialog.tsx` for the existing centered Modal
pattern; `utils/dialogSurfaceWidth.test.ts` for cross-platform source guards.

Proof command: `npm test` (from repository.md). User additionally runs
`npm run lint`, `npx tsc --noEmit`, Expo Go Android/iOS checks, and Web export
checks per SPEC-66/AGENTS.md. No agent CLI execution.

## Scan

```text
Path: entry -> state/handler -> modal surface

Home Calculator button -> calculatorVisible -> CalculatorDialog -> Paper Modal
	app/(tabs)/index.tsx -> components/CalculatorDialog.tsx
	Proof: current Modal contentContainerStyle has flex:1, justifyContent:center,
	alignItems:center. Verify visually; leave unchanged if it passes D-03.

Settings Delete Account button -> handleDeleteAccount -> showDeleteDialog
	-> Paper Dialog with styles.dialog
	app/(tabs)/settings.tsx

Settings Clear All Data -> showPinPrompt -> conditional KeyboardAvoidingView
	-> Paper Dialog; successful PIN opens showDeleteConfirmation -> Paper Dialog
	app/(tabs)/settings.tsx

Settings Change Passcode button -> showChangePasscodeDialog -> Paper Dialog
	app/(tabs)/settings.tsx

Scheduled Pay -> openPayDialog -> payTarget -> Paper Dialog with payment-method
	chips; Confirm -> recordTransaction(due, method) -> insufficient balance
	branch sets alertDialog -> second Paper Dialog
	app/dues.tsx

Proof: no existing runtime/UI test exercises modal geometry. The nearest
automated precedent is utils/dialogSurfaceWidth.test.ts, a source guard.
Command from repository.md Tests: npm test. Manual proof comes from the
SPEC-66 Expo Go and Web-export ACC-S rows; the agent must not run CLIs.

Teach: Paper Dialog owns its own modal wrapper, while styles.dialog affects
the card. The calculator already demonstrates a full-viewport centering
container with Paper Modal. Why it matters: card alignment alone cannot prove
the portal's available viewport is centered. When: use the outer modal layout
as the unit of verification. Alternative: a fixed vertical offset, rejected
because variable dialog heights would not stay centered.

Lens:
- FINAL-spec prerequisite — applies; SPEC-66 is now FINAL and controls these
	listed dialogs, while SPEC-65 remains governing for all other dialogs.
- Agent runs no CLI — applies; user runs npm test, lint, tsc, Expo Go, and Web
	export checks and supplies output.
- Storage/API/routes/native dependencies — n/a; layout-only D-01..D-04 do not
	touch these contracts.
- Android + iOS + Web — applies; ACC-01..03 and ACC-S01..03 cover all three.
- No static native-only import — n/a; no native module is proposed.
- Vercel/Web export — applies; Web visual check is required, no Node APIs.
- Bare-minimum diff — applies; only SPEC-66 D-01..D-04 paths; calculator is
	verification-only if already centered.
- No new dependencies — applies; existing Paper Modal and Jest only.
- AsyncStorage source of truth — n/a; no data writes.
- Provider Data/Actions split — n/a; no context/provider change.
- LWW sync — n/a; no sync path.
- Documentation after implementation — applies; D-05 updates savepoint and
	AGENTS status after implementation/verification.
- Ask before touching code — applies; this plan writes no product code. A
	later implementation slice still requires the approved handoff.
```

## Plan

### Decision

Use React Native's built-in `Modal` for the selected full-screen hosts per
FINAL SPEC-66 v1.2; keep Paper `Surface` for cards. Preserve current content,
copy, fields, buttons, sizing, callbacks, validation, keyboard behavior, and
dismissal parity. Verify Calculator's existing centered layout; edit it only if
D-03 fails. No platform-specific branch. If card appearance or dismissal
behavior cannot be preserved inside scope, stop and ask rather than broadening.

### In-scope paths

- `app/(tabs)/settings.tsx` — D-01 only: Delete Account, Change Passcode,
  Clear Data PIN, and Clear Data confirmation.
- `app/dues.tsx` — D-02 only: Payment Method and Insufficient Balance dialogs.
- `components/CalculatorDialog.tsx` — D-03; user reports current Paper Modal
	fails centering, so replace only its host with the finalized NativeModal
	pattern while preserving calculator state and keypad behavior.
- `utils/dialogCentering.test.ts` — D-04, parameterized for android/ios/web.
- `utils/clearDataKeyboard.test.ts` — D-06, update the existing SPEC-57 wrapper guard only.
- `docs/savepoint.md` and `AGENTS.md` §3 — D-05, after validation.

### Out-of-scope paths and behavior

- Any dialog not explicitly listed above, including `components/ConfirmDialog.tsx`.
- Dialog content, dimensions, appearance, actions, validation, handlers, payment
  logic, keyboard behavior, and navigation.
- New shared abstractions, dependencies, storage/API changes, route changes, or
	changes outside SPEC-66 D-01..D-08.
- SPEC-65 requirements for dialogs not listed in SPEC-66.

### Slices

1. **S1 — Settings layout (D-01):** update only the four specified dialog
	layouts in `app/(tabs)/settings.tsx`.
2. **S2 — Scheduled layout (D-02):** update only Payment Method and
	Insufficient Balance dialog layouts in `app/dues.tsx`.
3. **S3 — Calculator centering (D-03):** replace only the Paper Portal host in
	`components/CalculatorDialog.tsx` with the finalized NativeModal overlay;
	preserve expression state, keypad, visual card, and callbacks.
4. **S4 — Regression guards (D-04, D-06, D-08):** add
	`utils/dialogCentering.test.ts` and update
	`utils/clearDataKeyboard.test.ts` for Settings, Scheduled, and Calculator
	NativeModal structure across Android/iOS/Web.
5. **S5 — Documentation (D-05):** after user-run validation, update
	`docs/savepoint.md` and append `AGENTS.md` §3 status.

### Proof

- User-run `npm test`, `npm run lint`, and `npx tsc --noEmit`.
- Expo Go manual verification on Android and iOS, then Web export/browser
  verification per SPEC-66 ACC-S01..S03.
- The agent does not run CLIs. Stop after each approved implementation slice.