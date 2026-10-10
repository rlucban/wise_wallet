# SPEC-72 — Hide Repair Transaction Duplicates Section

| Field | Value |
|---|---|
| ID | SPEC-72 |
| Title | Hide Repair Transaction Duplicates row; logic untouched |
| Status | FINAL (per user call 2026-10-10 — implementable) |
| Owner | User |
| Version | 1.0 FINAL |
| Scope | `app/(tabs)/settings.tsx` (one render guard) + one new guard file `utils/hideRepairSection.test.ts` |
| Non-goals | No logic, handler, dialog, copy, storage-key, API-contract, route, or dependency change; no change to any other Settings row; no SPEC-45 edit |

RFC 2119 terminology (MUST/MUST NOT/SHOULD) applies.

## Context

The Data Management card in Settings renders a `Repair Transaction Duplicates`
button (`app/(tabs)/settings.tsx:1386-1390`, `{!isLocal && (<Button
mode="outlined" icon="auto-fix" onPress={previewRepair} ...>)}`) that opens
the repair flow: `previewRepair` (`:732`) → `showRepairConfirm` confirm
dialog (`:1555`) → `executeRepair` (`:779`). User call 2026-10-10: hide this
section from the UI with no other changes — the flow stays in code, fully
restorable. (SPEC-45's repair-duplicates runbook is still NOT YET RUN per
`AGENTS.md` §3; hiding the button does not cancel or alter that runbook —
it only removes the in-app entry point. SPEC-45's document is not edited.)

## Constraints

- **CON-01** Every change MUST keep Android + iOS + Web working, stay
  Expo Go (latest) import-safe (no static native-only import), and stay
  Vercel-deployable (no Node-only APIs in app code).
- **CON-02** No new npm packages, native modules, fonts, or third-party code
  (AGENTS §1.12).
- **CON-03** The ONLY change is the render guard on the Repair button block
  (current line 1386): `{!isLocal && (` → `{SHOW_REPAIR_SECTION && (` plus
  module-scope `const SHOW_REPAIR_SECTION = false;` with a one-line
  `SPEC-72 hidden` comment. (Literal `{false && (` was the first attempt —
  it trips lint `no-constant-binary-expression` (user-pasted output); the
  named-false const is behavior-identical and still a one-line revert.)
  The button JSX itself (icon, label, `onPress`, props) MUST stay
  byte-identical inside the gate so the diff is trivially revertible.
- **CON-04** The repair logic MUST stay fully intact and referenced:
  `previewRepair`, `executeRepair`, `repairPreview` state, and the
  `showRepairConfirm` confirm dialog (`:1555`) MUST NOT be edited, moved,
  or deleted (still referenced → no lint/tsc unused-code fallout; the dialog
  is simply unreachable while the button is gated).
- **CON-05** No other Settings row changes: Backup/Restore, Export, Import,
  Clear All Data, and the whole Account card stay byte-identical.
- **CON-06** The gate MUST be unconditional (`false` — all platforms, all
  account types). No `Platform.OS` / `isLocal` branch may remain on or be
  added to this block. If implementation discovers a need for a platform
  branch, it MUST stop (CON-* + ACC-* + D-* amendment first, §1.10).
- **CON-07** No code, config, or dependency change before this spec is marked
  FINAL by the user (AGENTS §1.1, §1.10 CON-10 pattern).

## Goal

No Repair Transaction Duplicates row renders anywhere; the entire repair
flow remains in code, untouched and restorable by reverting one guard.

### Interaction matrix

| Surface | Action | Expected |
|---|---|---|
| Settings → Data Management (Cloud, Local, Web) | View card | No Repair row; Export/Import/Clear rows exactly as before |
| Settings | Any other screen/row | Pixel- and behavior-identical |
| Code | `previewRepair` / dialog / `executeRepair` | Present and unmodified (verified by source scan, not by UI) |

### Decisions

- **DEC-01** Gate (`{false && (`), NOT delete (user: "just hide ... no
  changes" — logic preserved, one-line revert restores the section).
- **DEC-02** The now-unreachable confirm dialog is deliberately left in
  place (CON-04) rather than gated or removed with the button.
- **DEC-03** New SPEC-72 file is the canonical home; SPEC-45's document is
  cross-referenced, never edited (§1.14 — no existing spec owns this UI).

### Acceptance

Objective — deterministic, machine-checkable (jest, parameterized by
`Platform.OS` = `android` / `ios` / `web` via mock):

- **ACC-01** Source scan: the Repair button block is guarded by
  `{SHOW_REPAIR_SECTION && (` (const declared `false` exactly once) with
  the button JSX intact (`icon="auto-fix"`, `onPress={previewRepair}`,
  label `Repair Transaction Duplicates`). Holds on android/ios/web.
- **ACC-02** Source scan: `previewRepair`, `executeRepair`,
  `setShowRepairConfirm(true)`, and the `Repair Duplicates?` confirm dialog
  are all still present. Holds on android/ios/web.
- **ACC-03** Source scan: no other Settings JSX changed; no new import, no
  `Platform.OS` branch on the block, no `authFetch`/`AsyncStorage`/dep
  change. Holds on android/ios/web.

Subjective — human-judged UX as observable reviewer checks (explicit
pass/fail observation steps, user-run per AGENTS §1.3 — agent never runs CLIs):

- **ACC-S01** Reviewer on Android/iOS (Expo Go, Cloud AND Local accounts)
  confirms: Data Management shows no Repair row; Export/Import/Clear rows
  render and work exactly as before; no red-box, no gap/overlap where the
  row was. FAIL = row visible on any account type, or neighboring rows
  disturbed.
- **ACC-S02** Reviewer on Web confirms ACC-S01 identically. FAIL = row
  visible on web.
- **ACC-S03** Reviewer confirms no other Settings section changed.
  FAIL = any unrelated visual/behavioral delta.

TDD coverage (§1.10): `utils/hideRepairSection.test.ts` covers
ACC-01..ACC-03 parameterized by `Platform.OS` (android/ios/web); ACC-S01..S03
are user-run manual checks exactly as written above (dynamic invisibility is
not jest-provable — the guards pin the gate + intact logic).

## Deliverables

- **D-01** `app/(tabs)/settings.tsx` ONLY: the one-guard change per CON-03.
  No other line in the file changes.
- **D-02** `utils/hideRepairSection.test.ts` (new file, named here
  per §1.11): guards for ACC-01..ACC-03 × android/ios/web.
- **D-03** Docs after implementation (AGENTS §1.8, post-FINAL only):
  `docs/savepoint.md` entry + `AGENTS.md` §3 status line. NOT part of the
  spec-writing step; no doc edit ships with the DRAFT.

## Glossary

- **Repair section:** the `Repair Transaction Duplicates` button row —
  the sole UI target (the gate).
- **Repair flow:** `previewRepair` → confirm dialog → `executeRepair` —
  deliberately preserved, unreachable while gated.

## References

- `AGENTS.md` (§1.9 spec format, §1.10 TDD/platform matrix, §1.11
  bare-minimum, §1.12 no new deps, §1.14 one home; §3 SPEC-45 runbook note)
- `specs/04-connection-status-vs-offline-mode.md` (template)
- `specs/45-api-source-of-truth.md` (repair-duplicates runbook home;
  document NOT amended)
- `app/(tabs)/settings.tsx:732-801` (repair logic), `:1386-1390` (button),
  `:1555-1565` (confirm dialog)
