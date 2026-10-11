# SPEC-70 — PDF/CSV Auto-Download to Default Directory (Format Frozen)

| Field | Value |
|---|---|
| ID | SPEC-70 |
| Title | PDF/CSV Auto-Download to Default Directory (Format Frozen) |
| Status | **FINAL** v1.1 (2026-10-10 plan-fix amendment — web dialog retained, success dialog + Share; see History) |
| Owner | User (final authority) |
| Version | v1.1 |
| Scope | Delivery mechanics of Reports PDF export (+ CSV parity): native silent-save to app files with fallback share/print only on failure; web print-to-PDF dialog retained (no byte-level PDF without new deps) |
| Non-goals | Any visual/filename change to the SPEC-34 PDF layout; new dependencies/permissions; system-level Downloads/Files integration; Cloud→Local changes; new routes/storage keys/API contract |
| Normative source | This file. File+symbol cites are normative; `:line` numbers are hints only. |

> History: requested 2026-10-10 ("PDF file error must be fixed, three platforms seamless, format untouched, auto-download to default directory"); clarification round 2026-10-10 (error = all platforms; delivery = save silently no sheet; format = frozen; scope = PDF+CSV); feasibility gate 2026-10-10 (literal silent-save-everywhere infeasible under §1.7/§1.12 — see DEC-02/DEC-03); user picked Option A (DRAFT v0.1); marked **FINAL v1.0** per user call 2026-10-10 (no normative change — status promotion only); amended to **v1.1** per plan-run `20261010-1200-spec70-pdf-auto-download.md` (unknown-1: blob+anchor cannot yield genuine PDF bytes without a library, so CON-04/D-01 revert to the retained iframe print-to-PDF dialog; unknown-2 + Discovery Option A: native success surfaces a confirmation dialog with filename + user-invoked Share action; CON-08 return-widening).

RFC 2119 terminology (MUST/MUST NOT/SHOULD/MAY) applies. Informative prose ("today", "currently") is non-normative unless restated as a requirement.

## Context

### Problem

Reports export is broken on all three platforms (user verdict 2026-10-10):

- **Web:** `exportToPDF` (`utils/exportUtils.ts`) prints via a hidden iframe (`printReportInIframe`) — the browser print dialog opens, no PDF file is downloaded. CSV already auto-downloads via blob anchor; PDF does not.
- **Native (Android/iOS):** `Print.printToFileAsync` → `copyAsync` → `Sharing.shareAsync`. On Android Expo Go the `copyAsync` from the print cache URI rejects (scoped-storage "isn't readable"); the file only exists via the share sheet — there is no silent auto-save. Dismissing the sheet leaves no file behind.
- The SPEC-34 PDF body (chart summary p.1 + appendix) itself is NOT the problem and MUST NOT change.

### Definitions

- **Default download directory (this spec):** the only silently writable location available under current deps — Web = browser default Downloads via the print-to-PDF Save-as-PDF destination (the only dep-free PDF path); Android/iOS = `FileSystem.documentDirectory` app files (`WiseWallet_Report_<slug>.pdf`). This is NOT the OS system Downloads/Files folder (see DEC-02).
- **Silent-first:** the native primary path saves with no share sheet and no print dialog; the native success confirmation dialog (filename + Share action) is part of success per DEC-05, not a fallback; share/print runs automatically ONLY as a failure fallback (see DEC-03 — disclosed deviation from the literal "no sheet" ask).
- **Format frozen:** `utils/reportFormat.ts` + `utils/reportCharts.ts` output (SPEC-34 layout, fonts, colors, columns, filename builder) stays byte-identical.

## Constraints

- **CON-01 — Format freeze.** Implementation MUST NOT change `buildReportHtml` output, `reportCharts.ts` geometry, the SPEC-34 page order (chart summary → appendix), the 7 appendix columns/order, the Helvetica stack, `#1B3F7A` heading, peso handling (DEC-11 accepted risk), or `buildReportFileName`. Delivery-only diff.
- **CON-02 — No new dependencies.** Implementation MUST use only pre-existing `expo-print`, `expo-sharing`, `expo-file-system/legacy`. It MUST NOT add `expo-media-library`, SAF, `expo-file-system/next`, or any npm/native module unless a FINAL amendment names it per AGENTS.md §1.12.
- **CON-03 — Expo Go + Vercel safe.** Nothing MAY crash Expo Go on import (no static native-only imports at top level; lazy-load with try/catch). Web output MUST keep `expo export --platform web` working: no Node-only APIs in app code.
- **CON-04 — Web print-to-PDF retained.** On `Platform.OS === "web"`, `exportToPDF` MUST keep the `printReportInIframe` path (SPEC-33): it MUST NOT call `expo-print` on web, MUST NOT download any blob-as-PDF (an HTML blob saved as `.pdf` is not a valid PDF and is FORBIDDEN), and MUST NOT auto-open any other dialog. The browser print dialog with a Save-as-PDF destination is the web delivery. (Amended v1.1: the v1.0 blob+anchor primary is withdrawn — infeasible without a PDF library under CON-02.)
- **CON-05 — Native silent-save primary, sheet only on failure.** On Android/iOS, implementation MUST write/copy the PDF (and CSV) to `requireDocumentDirectory()` silently first and return success without opening any sheet when the write succeeds. `Sharing.shareAsync` / `Print.printAsync` MAY run ONLY when the silent write fails (fallback chain). A successful save MUST NOT open a share sheet. A native success MUST resolve the saved file uri to the caller (see CON-08); the caller surfaces the D-04 confirmation dialog.
- **CON-06 — CSV parity.** The same silent-first + fallback-only contract (CON-05) MUST apply to `exportToCSV` (web CSV blob-anchor download unchanged). CSV content builder and web filename pattern stay unchanged.
- **CON-07 — Awaited errors, no silent swallowing.** Every call site (notably `app/(tabs)/reports.tsx` export handlers) MUST `await` the export in try/catch and surface a re-triable error dialog on failure. Fire-and-forget export calls are FORBIDDEN. `console.warn` stays gated on `EXPO_PUBLIC_ADMIN_TOGGLE`; `console.error + rethrow` on hard failure.
- **CON-08 — No breaking changes.** Storage keys (`user_{id}_*`), API contract, routes, and `exportToPDF`'s `(transactions, formatAmount, rangeLabel)` signature MUST stay compatible. `exportToPDF`/`exportToCSV` MAY widen their resolved value to the saved file uri (`null` on the web-dialog path); existing awaiters ignoring the value are unaffected. No migration.

## Goal

Silent-first native delivery + CSV parity with zero layout change; web keeps its print-to-PDF dialog.

**Decisions:**

- **DEC-01 — Iframe print retained on web (amended v1.1).** The v1.0 blob+anchor primary is withdrawn: browsers cannot mint genuine PDF bytes from HTML silently without a library (CON-02 forbids adding one), and an HTML blob named `.pdf` would be a corrupt file. The dep-free web delivery remains the iframe print-to-PDF dialog, whose Save-as-PDF destination lands in browser Downloads.
- **DEC-02 — App-files directory IS the "default" on native.** System Downloads/Files auto-save is impossible in Expo Go without new permissions/modules (§1.7/§1.12); `documentDirectory` is the closest silently writable target. The spec redefines "default download directory" accordingly rather than adding deps.
- **DEC-03 — Fallback sheet disclosed deviation.** Literal "never show a sheet" is rejected: when silent save fails (scoped-storage denial, null `documentDirectory`), the implementation falls back to share/print + error dialog instead of losing the file. No sheet or dialog opens automatically on the success path except the D-04 confirmation dialog.
- **DEC-04 — CSV in scope.** User verdict: same fix for CSV. Content/builders frozen; only native CSV delivery converges on CON-05.
- **DEC-05 — Success dialog + user-invoked Share (unknown-2, Discovery Option A).** The app-private file is unreachable without system UI, so native success surfaces a confirmation dialog naming the saved file with a Share button. The sheet opens only on explicit user tap — never automatically — preserving silent-first.

| Check | Platform | Detail |
|---|---|---|
| Objective | Web | `exportToPDF` web branch uses `printReportInIframe` only; zero `Print.*` calls; zero blob/anchor PDF downloads. |
| Objective | Android / iOS | On silent-write success the PDF (and CSV) file exists under `documentDirectory`, the call resolves the saved uri, and `Sharing.shareAsync` / `Print.printAsync` are NOT called; on write failure exactly one fallback runs (share, then print for PDF) followed by throw-to-dialog. |
| Objective | Android / iOS / Web | `reportFormat.ts` / `reportCharts.ts` outputs byte-identical to pre-change (format guard test); filename builder unchanged; `exportToPDF` signature unchanged. |
| Objective | Android / iOS / Web | All export call sites `await` in try/catch (repo-wide scan: zero fire-and-forget export calls); jest guards parameterized by `Platform.OS` (`android`/`ios`/`web` via mock). |
| Subjective | Web | Reviewer on `npm run web` taps Export PDF → the print dialog opens → choosing Save-as-PDF lands a `.pdf` in browser Downloads showing the unchanged SPEC-34 layout; reviewer confirms no red-box in Expo Go. |
| Subjective | Android / iOS | Reviewer in Expo Go taps Export PDF/CSV → success shows a confirmation dialog with the filename and a Share action (no automatic share sheet); file is present in app files; on forced failure (e.g. denied/blocked) reviewer gets exactly one fallback (share or print) then a re-triable error dialog — never a silent loss, never a crash. |

Acceptance:

- **ACC-01 (web path):** mocked web export asserts the iframe-print path with zero `Print.*` calls and zero blob downloads; manual check confirms Save-as-PDF lands in Downloads.
- **ACC-02 (native silent success):** mocked `FileSystem` success asserts file write + saved-uri resolution + zero `shareAsync`/`printAsync` calls.
- **ACC-03 (native fallback):** mocked write-failure asserts share attempted once, print only if share rejects, then rethrow; admin-gated warn only.
- **ACC-04 (freeze):** byte-identical HTML/CSV output across `Platform.OS` android/ios/web; filename builder unchanged.
- **ACC-05 (awaited):** repo scan finds no un-awaited `exportToPDF`/`exportToCSV` call.
- **ACC-S01..S03 (manual, user-run per §1.3):** S01 web Chrome print-to-PDF matrix; S02 Android Expo Go silent-save + fallback; S03 iOS Expo Go silent-save + fallback — all with unchanged layout.

## Deliverables

- **D-01** `utils/exportUtils.ts` (web): PDF path UNCHANGED — `printReportInIframe` retained as the delivery (v1.1 amendment; blob+anchor withdrawn); no `expo-print` on web.
- **D-02** `utils/exportUtils.ts` (native): PDF silent-write primary resolving the saved uri; share/print strictly fallback-on-failure; null-`documentDirectory` throws to dialog.
- **D-03** `utils/exportUtils.ts` (CSV): same silent-first + fallback-only convergence; builders/filenames untouched.
- **D-04** `app/(tabs)/reports.tsx`: export handlers `await` in try/catch with re-triable error dialog (no fire-and-forget); native success shows a confirmation dialog with the saved filename + Share action (user-invoked `Sharing.shareAsync` on the saved uri).
- **D-05** `utils/exportDownload.test.ts` (new): ACC-01..05 + ACC-S support guards × android/ios/web (`Platform.OS` parameterized); format byte-identity guard.
- **D-06** Docs: `docs/savepoint.md` journal + AGENTS.md §3 `Current status` entry on implementation.

## Glossary

- Silent-first — native save succeeds with no automatic sheet or print dialog; the confirmation dialog (filename + Share action) is part of success, not a fallback; share/print auto-run only on failure.
- App files — `FileSystem.documentDirectory`, the only silently writable native target under current deps.
- Fallback chain — share sheet, then OS print dialog (PDF), then error dialog; each step runs only if the prior failed.
- Format frozen — SPEC-34 chart-summary + appendix layout, styles, columns, and filename byte-identical.

## References

- `utils/exportUtils.ts` (orchestration; web iframe vs native print→copy→share).
- `utils/reportFormat.ts`, `utils/reportCharts.ts` (frozen body; `import type`-only purity).
- `app/(tabs)/reports.tsx` (call site; `handleExportPDF` try/catch).
- `specs/33-report-export-fidelity.md` FINAL v1.1 (escaping, Manila dates, filename, iframe, font freeze, CON-14 no-new-deps).
- `specs/34-pdf-chart-summary-format.md` FINAL v1.1 (chart summary + appendix; supersedes SPEC-33 PDF body only).
- Plan-run `.opencode/skills/plan-fix/runs/20261008-1300-pdf-export-copyasync.md` (copyAsync unreadable evidence; direct-share + print fallbacks).
- AGENTS.md §1 (spec-first/no-autopilot/no-agent-CLI/bare-minimum/no-new-deps), §1.10 (platform matrix + TDD).
