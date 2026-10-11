---
skill: plan-fix
story: SPEC-70 FINAL v1.0 — PDF/CSV auto-download to default directory, SPEC-34 format frozen (Option A)
repo: C:\Users\angel\source\repos\wise_wallet
calibration: {1: "C", 2: "B", 3: "B", 4: "B", 5: "A", 6: "A"}
workflow: B
decision: Option A (native silent-save + success dialog with Share action; fallback-only share/print; CSV parity; web PDF unchanged via amendment)
status: completed
pending: none
---

# Plan

## Progress

| id | question | answer |
|----|----------|--------|
| story | What should I plan? | SPEC-70 FINAL v1.0 (D-01..D-06); web blob+anchor PDF download, native documentDirectory silent-save with share/print fallback-only, CSV parity, format frozen, no new deps |
| calibration-reuse | Use last calibration (1C 2B 3B 4B 5A 6A)? | Use it |
| unknown-1 | Web true-PDF bytes without new deps — which option? | Keep print-to-PDF dialog (amend CON-04/D-01; seamless fix lands on native+CSV) |
| unknown-2 | Native silent-success feedback — what? | Success dialog + filename |
| discovery-option-select | Which discovery option? | Option A dialog+Share |
| plan-done | Is this plan done? | Done |
| handoff | Plan ready — run implement-fix with it? | Yes |
| who-implements | Who implements the slices? | Agent (Code it) — each slice needs explicit Apply this slice |

## Pending

- unknown-1 (web true-PDF bytes without new deps) — answered
- unknown-2 (native silent-success feedback) — answered
- discovery-option-select — answered
- plan-done

## Decisions

- Approved option: A (native silent-save + success dialog with filename + user-invoked Share action; share/print fallback-only on failure; CSV same + awaited handlers; web PDF path unchanged via CON-04/D-01 amendment).
- Prerequisite (user-owned): FINAL amendment to `specs/70-pdf-auto-download-to-default-directory.md` — CON-04/D-01 web blob+anchor replaced by retained iframe print-to-PDF dialog; subjective web row reworded; D-04 extended with success dialog + Share action; CON-08 return-widening noted (`exportToPDF`/`exportToCSV` resolve the saved uri, `null` on web-dialog path — existing awaiters unaffected).
- Invariant preservation:
  - Spec-first: preserved — slices implement only this proposal + the amended FINAL SPEC-70; amendment lands before any implement-fix slice.
  - No auto-pilot: preserved — stop after plan; implement-fix handoff only on explicit yes; one slice per turn thereafter.
  - Agent never runs CLIs: preserved — user runs npm test / lint / tsc / Expo Go + web-export matrix and pastes output.
  - No breaking changes: preserved — export signatures call-compatible, report filename/columns/layout, routes, storage keys, API contract untouched.
  - Android+iOS+Web: preserved — native delivery fixed; web PDF byte-identical; CSV web blob-anchor untouched.
  - Expo Go testable: preserved — no new imports; every path ends in dialog/toast, never red-box; success dialog + failure dialog are Paper components.
  - Vercel-deployable: preserved — web path adds no Node APIs.
  - Bare-minimum + no new deps: preserved — exportUtils + reports handlers + one test file; existing expo-print/sharing/file-system only.
  - TDD: preserved — `utils/exportDownload.test.ts` Platform.OS-parameterized (ACC-01..05) + user-run device matrix (ACC-S01..S03).
  - Ask-before-update: preserved — this plan is a prompt; files change only via implement-fix handoff.
- Layering order: utils (`utils/exportUtils.ts` PDF, then CSV) → app screen (`app/(tabs)/reports.tsx` handlers/dialogs) → utils test (`utils/exportDownload.test.ts`) → docs (`docs/savepoint.md`, `AGENTS.md §3`).
- Gold paths read: `specs/33-report-export-fidelity.md`; `specs/34-pdf-chart-summary-format.md`; `utils/reportFormat.test.ts` (builder-guard pattern); prior run `20261008-1300-pdf-export-copyasync.md`.
- Proof command: npm test (package.json scripts.test = jest).
- In-scope: `utils/exportUtils.ts` (D-01/D-02), `app/(tabs)/reports.tsx` handlers/dialogs (D-04), `utils/exportDownload.test.ts` new (D-05), `docs/savepoint.md` + `AGENTS.md §3` (D-06), SPEC-70 prerequisite amendment (user-owned).
- Out-of-scope: `utils/reportFormat.ts`, `utils/reportCharts.ts` (CON-01 frozen); routes/storage/API/deps; web PDF bytes (deferred by unknown-1 verdict); CSV builders/filenames.
- Who implements: Agent (Code it) — each slice still needs explicit Apply this slice.

## Scan

```text
Path-PDF: app/(tabs)/reports.tsx:155 handleExportPDF → :157 await exportToPDF → utils/exportUtils.ts:82 exportToPDF → :87 buildReportHtml → web :91 printReportInIframe (dialog only, no file); native :95 Print.printToFileAsync → :100-102 copyAsync (REJECTS on Expo Go: cache uri unreadable) → :104-108 direct-share fallback → :110-120 share try/catch → Print.printAsync fallback.
Path-CSV: app/(tabs)/reports.tsx:407 onPress={() => exportToCSV(...)} (fire-and-forget, violates CON-07) → utils/exportUtils.ts:57 exportToCSV (web blob-anchor ok; native write+share, no failure fallback).
Proof: none covering exportUtils behavior (reportFormat.test.ts guards builders only; no exportUtils suite). Command: npm test.
Teach: print writes into the app cache dir; legacy copyAsync cannot read that entry under Expo Go scoped storage, so the copy dies after a successful print. On web, expo-print ignores `html` (prints the screen), hence the iframe path — and browsers cannot mint genuine PDF bytes from HTML silently without a PDF library, which CON-02 forbids.
Lens:
- Spec-first (FINAL SPEC-70) applies + utils/exportUtils.ts + app/(tabs)/reports.tsx (CON-01/CON-08 freeze layout, filename, signature).
- No breaking changes applies + WiseWallet_Report_<slug>.pdf name + routes/storage/API untouched.
- Android+iOS+Web applies + web branch and native branch both change.
- Expo Go testable applies + every failure ends in an in-app dialog, never red-box/uncaught (CON-07).
- Vercel-deployable applies + web path uses DOM blob/anchor only, no Node APIs.
- Bare-minimum + no new deps applies + delivery-only slices with existing expo-print/sharing/file-system.
- TDD applies + utils/exportDownload.test.ts (Platform.OS-parameterized) + user-run Expo Go + web-export matrix.
- Agent never runs CLIs applies + user runs npm test, lint, tsc, device matrix.
- Ask-before-update applies + no code written in plan-fix.
```

## Plan

- Prerequisite (user-owned, before any slice): FINAL amendment to `specs/70-pdf-auto-download-to-default-directory.md` — CON-04/D-01 web blob+anchor → retained iframe print-to-PDF dialog; subjective web row reworded; D-04 extended with success dialog + Share action; CON-08 return-widening (resolve saved uri, `null` on web-dialog path). APPLIED (v1.1).
- Slice 1 (utils layer, `utils/exportUtils.ts`): `exportToPDF` native silent-save primary (resolve saved uri); share/print fallback-only on failure; web branch byte-identical; signature call-compatible. (superseded — see Prerequisite/2-3)
- Slice 2 (utils layer, `utils/exportUtils.ts`): `exportToCSV` same silent-first + fallback-only; web blob-anchor and builders untouched. APPLIED (with slice-2 PDF + slice-3 CSV).
- Slice 3 (app layer, `app/(tabs)/reports.tsx`): CSV `onPress` await/catch fix (CON-07); success dialogs with filename + Share action for PDF/CSV; failure dialogs unchanged in copy. APPLIED.
- Slice 4 (test, `utils/exportDownload.test.ts` new): ACC-01..05 guards × android/ios/web (silent-success zero-share, fallback chain, freeze byte-identity, awaited call sites). APPLIED.
- Slice 5 (docs): `docs/savepoint.md` journal + `AGENTS.md §3` status entry (D-06). APPLIED.
- Repair (post-slice, test-run driven): `tsconfig.test.json` lib `["ES2020"]` → `["ES2020", "DOM"]` — ts-jest compiles `utils/exportUtils.ts` (imported by `exportDownload.test.ts`) under the test program, whose web paths reference `document`; app tsconfig already includes DOM via expo base. Casts hardened `as unknown as jest.Mock` per `speechVoice.test.ts`. Test-infra only, no runtime/config-for-app change.
