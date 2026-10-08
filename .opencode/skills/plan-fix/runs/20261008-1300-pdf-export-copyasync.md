---
skill: plan-fix
story: PDF export fails on Expo Go mobile — cache/Print file unreadable at copyAsync + uncaught rejection at call site
repo: D:\hobby\wise_wallet
calibration: {1: "C", 2: "B", 3: "B", 4: "B", 5: "A", 6: "A"}
workflow: B
decision: Option A (copy-with-direct-share fallback + call-site catch)
status: ready-for-implement-fix
pending: handoff
---

# Plan

## Progress

| id | question | answer |
|----|----------|--------|
| story | What should I plan? | PDF export copyAsync unreadable (Android Expo Go, iOS same class) + uncaught rejection at reports.tsx:406 |
| scope | Platform scope | Expo Go mobile, Android confirmed, iOS same class |
| unknown-1 | Frequency/volume | Deterministic: zero success on mobile, web works |

## Pending
- discovery-option-select

## Decisions
- Approved option: A (copy-with-direct-share fallback + call-site catch, signature frozen kept).
- Invariant preservation:
  - Spec-first: preserved — slices implement only this approved proposal; a FINAL spec edit under specs/ precedes implement-fix if repo rule requires it (SPEC-33 CON-15/CON-20 signature freeze honored).
  - No auto-pilot: preserved — stop after plan; handoff only on explicit yes.
  - Agent never runs CLIs: preserved — user runs npm test and pastes output; user runs Expo Go matrix.
  - No breaking changes: preserved — exportToPDF signature, report filename when copy works, share-sheet behavior, routes, storage keys, deps untouched.
  - Android+iOS+Web: preserved — mobile print/copy path fixed; web iframe path byte-identical.
  - Expo Go testable: preserved — every failure path ends in an in-app dialog, never uncaught/red-box.
  - Bare-minimum + no new deps: preserved — utils/exportUtils.ts fallback + reports.tsx PDF catch only; existing expo-print/sharing/file-system.
  - TDD: preserved — jest source-scan guards (copy-fallback branch, single share call, call-site catch) + user-run Expo Go + web-export matrix.
  - Ask-before-update: preserved — this plan is a prompt; files change only via implement-fix handoff.
- Layering order: utils (exportToPDF fallback) → app screen (reports.tsx PDF onPress catch); repositories/sync/server untouched.
- Gold paths read: specs/33-report-export-fidelity.md (signature/file-name freeze); utils/reportFormat.test.ts:778 (call-site assertion pattern).
- Proof command: npm test (package.json scripts.test = jest).
- Who implements: Agent (Code it) — each slice still needs explicit Apply this slice.

## Scan

Path-PDF: app/(tabs)/reports.tsx:406 onPress (fire-and-forget, no await/catch) → utils/exportUtils.ts:82 exportToPDF → :95 Print.printToFileAsync → :100 FileSystem.copyAsync from cache/Print uri (REJECTS on Expo Go Android: "isn't readable") → :107 console.error + rethrow → uncaught promise rejection (second paste = first paste's cause).
Proof: none covering exportUtils behavior (utils/reportFormat.test.ts:778 asserts the call-site string only; no exportUtils suite in npm test). Command: npm test.
Teach: print writes into the app cache dir; legacy copyAsync cannot read that entry under Expo Go scoped storage, so the copy dies after a successful print; the fire-and-forget onPress (reports.tsx:399 CSV / :406 PDF) turns the rethrow into an uncaught rejection instead of a dialog.
Lens:
- Spec-first applies + utils/exportUtils.ts + app/(tabs)/reports.tsx (SPEC-33 CON-15/CON-20 freeze exportToPDF signature — fix must keep it).
- No breaking changes applies + WiseWallet_Report_<slug>.pdf name + share-sheet behavior must stay.
- Android+iOS+Web applies + mobile print/copy path only; web iframe path untouched.
- Expo Go testable applies + failure must degrade to an in-app dialog, never red-box/uncaught.
- Bare-minimum + no new deps applies + two small slices, existing expo-print/sharing/file-system only.
- TDD applies + jest source-scan guards plus user-run Expo Go matrix (print/fs not jest-renderable).
- Agent never runs CLIs applies + user runs npm test and pastes output.
- Ask-before-update applies + no code written.

## Plan
- Slice 1 (utils layer, utils/exportUtils.ts): copy-with-direct-share fallback in exportToPDF; exactly one shareAsync per export; signature, web branch, CSV path unchanged. APPLIED.
- Slice 2 (app layer, app/(tabs)/reports.tsx): PDF onPress awaits exportToPDF inside try/catch → error dialog; CSV button unchanged. APPLIED.
- Slice 3 AMENDMENT (utils layer, utils/exportUtils.ts): share wrapped in try/catch; on share failure Print.printAsync({html}) OS-dialog fallback, return normally; print failure still rethrows to Slice 2 dialog. Amends SPEC-33 D-02 flow (spec text edit owned by user). APPLIED.
- Slice 5 AMENDMENT (utils layer, utils/exportUtils.ts): both fallback warns gated on EXPO_PUBLIC_ADMIN_TOGGLE === "true" (SPEC-44 pattern); silent otherwise; behavior unchanged. APPLIED.
- Proof per slice: user runs npm test, pastes output; new jest guards + user-run Expo Go Android matrix (+ iOS if available) + web-export regression.
