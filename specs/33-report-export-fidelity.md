# Spec 33: Report Export Fidelity (PDF + CSV)

| Field | Value |
|---|---|
| ID | SPEC-33 |
| Title | Report Export Fidelity (PDF + CSV) |
| Status | **FINAL** v1.1 (2026-10-01, user call) — implement exactly this. |
| Owner | User (final authority) |
| Version | 1.1 |
| Scope | `utils/exportUtils.ts` (rewrite); new `utils/reportFormat.ts` + `utils/reportFormat.test.ts`; `app/(tabs)/reports.tsx` (export call site only) |
| Non-goals | The report screen's own cards, charts, and donut (`reports.tsx:97-178`); CSV file-naming (unchanged); any storage key, sync, API contract, navigation route, or dependency; Settings' JSON export/import (SPEC-22); whether the PDF matches the app's dark mode (a document stays light — DEC-09) |
| Normative source | This file. File+symbol cites are normative; `:line` numbers are hints only. |

> History: v0.1 (2026-10-01, DRAFT). Follows the investigation of `app/(tabs)/reports.tsx:390`
> → `utils/exportUtils.ts:38-102`, which found 10 defects. User calls already folded in
> (2026-10-01): (1) web fix = **hidden iframe print**; (2) PDF content = **range label +
> totals only**; (3) dates pinned to **en-PH + Asia/Manila**; (4) native filename =
> **rename via FileSystem, then share**; (5) bug 2's escaping fix covers **PDF and CSV**.
> Second round, same day: columns = **7 on both**; **font stack left unchanged** (defect 8
> becomes an accepted risk, DEC-11); **page-break control included** (DEC-10). v0.2 reflects
> those three rulings and reclassifies defect 8 from "fix the CSS" to "freeze the stack and
> verify on device".
>
> **v1.1 (2026-10-01, post-FINAL, non-normative addition).** User marked v0.2 FINAL. While
> reading `reports.tsx` for D-03 I confirmed an eleventh, previously unlisted case: the screen
> allows exporting a range with no transactions, which the old builder would print as a
> header with an empty body. Added **CON-20** + the ACC-06 empty-array clause + one coverage-map
> row. No existing requirement was relaxed, reordered, or removed; D-01..D-05 and CON-01..CON-19
> are byte-identical to the version the user approved.

## Terminology (RFC 2119)

The keywords **MUST**, **MUST NOT**, **SHOULD**, and **MAY** in this spec are to be
interpreted as described in RFC 2119. Informative prose is non-normative unless restated
as a requirement.

## 1. Context

### 1.1 The ten defects

`exportToPDF` (`utils/exportUtils.ts:38-102`) builds an HTML string and passes it to
`expo-print`. `exportToCSV` (`:7-36`) builds a CSV string. Numbered as reported:

| # | Defect | Site |
|---|---|---|
| 1 | **Web prints the wrong document.** `expo-print`'s web implementation ignores `options.html` entirely and calls `window.print()`, so the Reports screen is printed and the generated HTML is discarded. | `exportUtils.ts:90-91`; `node_modules/expo-print/build/ExponentPrint.web.js:8-13` |
| 2 | **No escaping in either export.** Category name, payment method, type, establishment, and note are interpolated raw. In the PDF this reaches the WKWebView/WebView `expo-print` renders, so `<` / `&` corrupt or inject markup; in the CSV a `"` inside a quoted field breaks the column layout. | `:41-45`, `:10` |
| 3 | **Dead CSS.** `.income` / `.expense` are declared but no `<tr>` ever receives a class, so income/expense are never colour-coded. | `:64-65` |
| 4 | **No filter context.** The PDF receives the period-filtered set (`reports.tsx:90-95`) but never states the range, so a monthly export is indistinguishable from an all-time one. | `:49-87` |
| 5 | **Missing content.** No income/expense/net totals, although the screen computes all three. The "report" is a bare row dump. | `:72-85` |
| 6 | **Device-dependent dates.** Bare `toLocaleDateString()` with no locale and no timezone: the printed format follows device settings, and a transaction stored near midnight UTC can print the wrong calendar day. | `:41`, `:71` |
| 7 | **Meaningless shared filename.** `printToFileAsync` writes an auto-named cache file which is shared as-is (`result.uri`), so a recipient gets e.g. `Print_17a2….pdf`. `result.numberOfPages` is ignored. | `:92-96` |
| 8 | **Peso glyph risk.** `formatAmount` emits `₱` (U+20B1) against `'Helvetica Neue', Helvetica, Arial`, none of which reliably ships U+20B1, so the sign can fall back or render as tofu. | `:58` |
| 9 | **Off-brand heading colour.** `h1 { color: #6200ee }` versus the app's `primary: '#1B3F7A'`. | `:59`; `context/ThemeContext.tsx` |
| 10 | **CSV and PDF disagree.** CSV has 7 columns (incl. Establishment, Note); the PDF has 5 — both are dropped. `Transaction.title` is in neither. | `:74-80` vs `:8` |

### 1.2 Why defect 1 cannot be fixed with an argument

`node_modules/expo-print/build/ExponentPrint.web.js` in full:

```js
async print() { window.print(); },
async printToFileAsync() { window.print(); },
```

`options` is not read. `Print.js:24-26` routes `printAsync` straight to
`ExponentPrint.print(options)`, and `Print.js:66-68` routes `printToFileAsync` the same
way. There is therefore **no** value for the `html` option that changes web behaviour, and
`expo-print` must not be called on web at all. Per user call, web prints through an
off-screen `<iframe>` that owns the generated HTML (§3.3, D-02).

### 1.3 Why dates are formatted arithmetically instead of via `Intl`

Per user call the PDF pins dates to **en-PH + Asia/Manila**. Implementing that with
`toLocaleDateString('en-PH', { timeZone: 'Asia/Manila' })` would make the output depend on
the runtime's `Intl` data: Hermes on Android needs `hermes-intl` for full locale support and
silently falls back otherwise, and CLDR changes the en-PH year length between releases
(`MM/dd/yy` vs `MM/dd/y`). A report that prints different dates on different devices is the
defect being fixed.

Manila is **UTC+8 with no DST**, so the calendar date is exact arithmetic: shift the
timestamp by a fixed +8h and read the UTC components. `utils/reportFormat.ts` MUST do this
instead of calling `Intl`, which makes the format deterministic on every platform and
directly testable under jest's node environment (DEC-04).

The normative output format is explicitly **`MM/DD/YYYY` with a four-digit year**, stated
here rather than delegated to CLDR.

### 1.4 Why all string generation moves into a pure module

The repo's jest config is `roots: ['<rootDir>/utils']`, `testEnvironment: 'node'`
(`jest.config.js`), so it can test pure functions but cannot render React or touch a DOM.
The defects that matter most — unescaped user text, wrong dates, missing totals, missing
columns, unapplied classes (2, 3, 4, 5, 6, 10) — are all properties of the **generated
string**, not of the print call.

D-01 therefore moves every byte of HTML and CSV generation into a pure
`utils/reportFormat.ts`, leaving `utils/exportUtils.ts` responsible only for platform
mechanics (iframe print, `printToFileAsync`, `copyAsync`, `shareAsync`). What remains in
`exportUtils.ts` — DOM manipulation and native module calls — is genuinely untestable here
and is stated as a §1.10 gap with a user-run manual matrix (§3.1, ACC-07..ACC-10) rather
than covered by a test that cannot fail.

### 1.5 Pre-existing latent bug found while implementing

`FileSystem.documentDirectory` is typed `string | null`
(`expo-file-system/build/legacy/FileSystem.d.ts:7`), but `exportUtils.ts:27` interpolates it
unguarded into a template literal, which would produce a path like
`nullWiseWallet_Export_….csv` if it were ever null. D-02 adds the guard. Relatedly,
`FileSystem.EncodingType` accepts a plain `'utf8'`
(`FileSystem.types.d.ts:231`), so the existing
`FileSystem.EncodingType ? … : "utf8" as unknown as FileSystem.EncodingType` guard at
`:30` is unnecessary and casts away type safety; D-02 replaces it with a plain `'utf8'`.

### 1.6 Rollback

Revert `utils/exportUtils.ts` and `app/(tabs)/reports.tsx`, and delete
`utils/reportFormat.ts` + `utils/reportFormat.test.ts`. `exportToPDF`'s third parameter is
additive and optional-by-default, so the call site reverts with the function. No storage,
API, or route change is involved, so rollback is a clean code revert at any time.

## 2. Constraints (normative)

- **CON-01 — `expo-print` MUST NOT be called on web.** `utils/exportUtils.ts` MUST NOT
  import-and-call `expo-print` inside a `Platform.OS === 'web'` branch. The web branch MUST
  use the iframe path of D-02.
- **CON-02 — The iframe MUST be removed.** The web print path MUST remove its `<iframe>`
  from the document on completion, on `afterprint`, and on a bounded timeout, so repeated
  exports cannot accumulate hidden nodes. The iframe MUST be `aria-hidden` and sized `0×0`
  and positioned off-screen so it is never focusable, announced, or visible.
- **CON-03 — All user-supplied text MUST be escaped.** Every interpolated
  `Transaction` field and the formatted amount MUST pass through `escapeHtml` before it
  enters `htmlContent`. This covers `type`, `category.name`, `paymentMethod`,
  `establishment`, `note`, and `formatAmount(amount)`. Double-escaping an
  already-escaped string is the accepted, documented behaviour.
- **CON-04 — CSV quoting MUST be RFC 4180.** Every CSV field MUST be emitted through
  `csvCell`, which MUST wrap the value in `"` and MUST double any embedded `"`. A field
  containing `,`, a newline, or a `"` therefore MUST NOT break the column layout. Numeric
  and already-formatted fields MUST go through `csvCell` as well, so the file has one
  consistent quoting rule.
- **CON-05 — Dates MUST be deterministic.** `formatReportDate` MUST compute the
  **Asia/Manila (UTC+8, no DST)** calendar date and format it as **`MM/DD/YYYY`** with a
  four-digit year, using string arithmetic only. It MUST NOT call `toLocaleDateString`,
  `Intl`, or read the device locale or timezone. Both the PDF row dates, the PDF
  "Generated on" line, and the CSV `Date` column MUST use it.
- **CON-06 — PDF MUST state its range.** `exportToPDF` MUST accept a range label and MUST
  render it in the document. `app/(tabs)/reports.tsx` MUST pass `currentRange.label`.
- **CON-07 — PDF MUST contain totals.** The PDF MUST render income, expense, and net
  totals derived from the **same** transaction array it renders rows for.
- **CON-08 — `.income` / `.expense` MUST be applied.** Every `<tr>` MUST carry the class
  matching its `type`, so the existing declarations stop being dead. The CSS MUST also set
  `print-color-adjust: exact` / `-webkit-print-color-adjust: exact`, without which browsers
  strip the table background and the income/expense colours from the printed output.
- **CON-09 — Native MUST share a named file.** The native path MUST copy
  `printToFileAsync`'s cache URI to `FileSystem.documentDirectory` under a meaningful name
  via `FileSystem.copyAsync({ from, to })`, then share that URI. `documentDirectory` MUST be
  null-guarded. `result.numberOfPages` MAY be read but MUST NOT block the share.
- **CON-10 — Font stack MUST remain unchanged.** The document's `font-family` MUST stay
  exactly `'Helvetica Neue', Helvetica, Arial, sans-serif`. Defect 8 (the peso sign U+20B1
  may be absent from Helvetica, so it could fall back or render as tofu) is **not** fixed by
  a font change — per user call 2026-10-01 the stack is left alone. It is handled as a
  documented accepted risk verified on device: DEC-11 and ACC-08. No font-related CSS
  statement other than this line's value is permitted.
- **CON-11 — Heading colour MUST match the app.** The `h1` colour MUST be `#1B3F7A`, the
  app's `primary` in `context/ThemeContext.tsx` (`CustomLightTheme.primary`), and MUST NOT
  be `#6200ee`. The document is always light-themed regardless of the app's dark-mode state.
- **CON-12 — PDF and CSV columns MUST agree.** Both MUST emit the same seven fields in the
  same order: Date, Type, Category, Amount, Payment Method, Establishment, Note. Adding or
  dropping a column MUST happen to both or neither.
- **CON-13 — Platform-agnostic module.** `utils/reportFormat.ts` MUST NOT import
  `react-native`, `expo-print`, `expo-sharing`, or `expo-file-system`, and MUST contain no
  `Platform.OS` branch. Only `import type` from `../types` is permitted, so the module
  stays pure and node-testable.
- **CON-14 — No new dependency.** `expo-print@~57.0.2`, `expo-sharing@~57.0.22`, and
  `expo-file-system@~57.0.7` are already direct dependencies (`package.json:27,34,37`).
  `package.json` and `package-lock.json` MUST be unchanged.
- **CON-15 — Signature compatibility.** `exportToPDF`'s new range-label parameter MUST be
  added after the existing two, MUST be required at the call site, and MUST NOT reorder or
  rename the existing `transactions` / `formatAmount` parameters. `exportToCSV`'s signature
  MUST NOT change.
- **CON-16 — No error-handling regression.** Both exports MUST keep their
  `console.error` + rethrow contract, and the web iframe path MUST throw a plain `Error`
  when the iframe's document or window cannot be reached, rather than failing silently.
- **CON-17 — Expo Go and Vercel safe.** No new native module, no top-level native import,
  no Node-only API, no secrets. `expo export --platform web` MUST still succeed and the web
  build MUST NOT reference `document` outside the guarded web branch.
- **CON-18 — No lint weakening.** `eslint.config.js` and `utils/themeColors.test.js`
  untouched; no new `any`; no new `@typescript-eslint` suppression.
- **CON-19 — Verification gates.** `npm test`, `npm run lint`, and `npx tsc --noEmit` MUST
  be clean. (The user runs the commands; the agent does not — AGENTS.md §1.3.)
- **CON-20 — Empty periods MUST NOT print a bare header.** The Reports screen permits
  exporting a range with no transactions. `buildReportHtml` MUST still render the `<thead>`
  and the summary block, and MUST render exactly one body row of
  `<td colspan="7">No transactions in this period.</td>`. `buildCsvContent` MUST emit the
  header line only (a data row would be a lie). Copy is fixed here; the empty-state
  trigger is the same `transactions.length === 0` check on both builders.

## 3. Goal

Both exports produce correct, self-describing, deterministic documents on Android, iOS, and
Web: the web PDF prints the report instead of the screen, no user-entered text can corrupt
either file, dates are identical on every device, the PDF states its range and its totals,
and a shared PDF carries a meaningful name.

### 3.1 Platform matrix

| Platform | Objective (machine-checkable) | Subjective (reviewer observation) |
|---|---|---|
| **Android** | ACC-01, ACC-02, ACC-03, ACC-04, ACC-05, ACC-06 | ACC-07, ACC-08, ACC-09, ACC-10, ACC-11 |
| **iOS** | ACC-01, ACC-02, ACC-03, ACC-04, ACC-05, ACC-06 | ACC-07, ACC-08, ACC-09, ACC-10, ACC-11 |
| **Web** (`expo export --platform web`) | ACC-01, ACC-02, ACC-03, ACC-04, ACC-05, ACC-06 | ACC-07, ACC-08, ACC-11 |

Web is exempt from ACC-09/ACC-10 (no `printToFileAsync`, no share sheet) and ACC-11 (Expo
Go is native-only), but MUST satisfy the rest, including ACC-05 (web export must still
succeed).

### 3.2 Acceptance criteria (Objective — machine-checkable)

| ID | Platform | Criterion |
|---|---|---|
| **ACC-01** | all | `utils/reportFormat.test.ts` covers `escapeHtml`, `csvCell`, `formatReportDate`, `computeReportTotals`, `buildReportFileName`, `buildCsvContent`, and `buildReportHtml`, asserting literal values and exact substrings. `npm test` reports `0 failed` and the total rises by exactly the number of tests the file declares. |
| **ACC-02** | all | `buildReportHtml` output contains no un-escaped `<` from any supplied `Transaction` field. Asserted with a fixture whose `category.name`, `paymentMethod`, `establishment`, and `note` are `<script>alert(1)</script> & "quotes" 'apos'`: the output contains `&lt;script&gt;` and contains no literal `<script>`. |
| **ACC-03** | all | `csvCell` doubles embedded `"`, wraps every field in `"`, and `buildCsvContent` output for the ACC-02 fixture parses back to 7 fields per row even though the note contains `,`, `"`, and a newline. Asserted by a field-count check, not by eyeball. |
| **ACC-04** | all | `formatReportDate` returns `MM/DD/YYYY` in Asia/Manila. Asserted on discriminating UTC inputs that straddle Manila midnight — `2025-12-31T16:30:00.000Z` → `01/01/2026`, `2025-12-31T17:00:00.000Z` → `01/01/2026`, `2025-12-31T15:59:59.999Z` → `12/31/2025` — and the same values MUST be embedded in both the PDF and the CSV output. |
| **ACC-05** | all | `utils/reportFormat.ts` contains no `react-native`, `expo-print`, `expo-sharing`, or `expo-file-system` import and no `Platform.OS` (source-text guard, mirroring ACC-04 in SPEC-32). `expo export --platform web` still succeeds, and `utils/exportUtils.ts` references `document`/`iframe` only inside the web branch. |
| **ACC-06** | all | `buildReportHtml` output contains: the range label; income, expense, and net totals formatted by the injected `formatAmount`; `class="income"` and `class="expense"` on the corresponding `<tr>`s; the 7 column headers; `#1B3F7A`; `print-color-adjust`; `break-inside: avoid`;   `display: table-header-group`; the unchanged `font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif`; and no `#6200ee`. `buildCsvContent` output contains the same 7 headers as the PDF. With an empty array, both outputs still contain the 7 headers, and the HTML additionally contains one `<td colspan="7">` row with the CON-20 empty-state copy. |

### 3.3 Acceptance criteria (Subjective — reviewer observation, per platform)

| ID | Platform | Test procedure | Pass condition |
|---|---|---|---|
| **ACC-07** | all | Reports screen → set a period with transactions → tap **PDF**. | The output is the **transaction report**, not the Reports screen. Android/iOS: the share sheet opens with the PDF. Web: the browser print dialog opens and its preview shows the report. |
| **ACC-08** | all | Read the produced PDF/CSV. | The header shows the range that was selected; an income/expense/net summary is present; income and expense rows are visually distinct; Establishment and Note columns exist; the heading is dark navy, not purple; the `₱` renders as a peso sign with no tofu box. |
| **ACC-09** | Android/iOS | Complete the share flow and inspect the file name in the target app. | The file is named like `WiseWallet_Report_Oct-01-Oct-31-2025.pdf`, not `Print_….pdf`. It opens as a valid PDF. |
| **ACC-10** | Android/iOS | Export twice with the same range. | Both exports succeed; the second does not fail because a file of the same name already exists. |
| **ACC-11** | Android/iOS | Run in Expo Go and export both formats. | No red box. A note or category containing `<` and `"` renders escaped in the PDF and does not break the CSV's columns. |

### 3.4 Decisions

- **DEC-01 — Hidden iframe, not a new window and not `document.body` swap** (user call).
  An off-screen iframe is the only option that prints the generated HTML without a popup
  blocker, without destroying app state, and without disabling the feature.
- **DEC-02 — Range label + totals only** (user call). Per-category subtotals and the
  monthly trend table are out of scope; the report gains the context it was missing without
  becoming a re-implementation of the screen.
- **DEC-03 — Totals are computed inside the export util, not passed in.** Deriving income,
  expense, and net from the same array that produces the rows (CON-07) keeps the PDF
  self-consistent and keeps `exportToPDF` callable from anywhere. The screen's own
  `income`/`expense`/`net` (`reports.tsx:97-106`) remain as they are for the cards; ACC-01
  pins the util's arithmetic against a hand-computed fixture so the two definitions cannot
  drift unnoticed.
- **DEC-04 — Dates by arithmetic, not `Intl`** (§1.3). `Asia/Manila` is a fixed +08:00 with
  no DST, so the calendar date is exact; this removes the Hermes `hermes-intl` fallback and
  the CLDR year-length drift from a user-facing document.
- **DEC-05 — Explicit `MM/DD/YYYY`, four-digit year.** Chosen over "whatever `en-PH`
  currently means" so the output cannot change under a CLDR upgrade. `MM/DD/YYYY` matches
  the en-PH convention the user selected.
- **DEC-06 — Rename by copy, not by base64 round-trip** (user call).
  `FileSystem.copyAsync({ from, to })` (`FileSystem.d.ts:76`, `RelocatingOptions` at
  `FileSystem.types.d.ts:267-276`) is the direct API. Reading and re-writing base64 would
  buffer the whole document in JS for no benefit. The cache file is left in place, matching
  its documented lifecycle.
- **DEC-07 — PDF and CSV share `computeReportTotals` and `formatReportDate`.** One
  definition of each, so the two files cannot disagree about dates or arithmetic.
- **DEC-08 — Seven columns on both, `title` still excluded** (§3.5 default 1). Matching CSV
  to PDF is the actual defect; adding `title` is a separate product decision.
- **DEC-09 — The document is always light-themed.** Dark mode is an app-level presentation
  state; a printed/shared report should be stable regardless of who exported it.
- **DEC-10 — Row page-break control is included** (beyond the ten defects, flagged and
  confirmed by the user). Two declarations in the CSS block D-01 already rewrites: `thead {
  display: table-header-group }` and `tr { break-inside: avoid; page-break-inside: avoid }`,
  so a row is not split across A4 pages.
- **DEC-11 — Defect 8 is an accepted risk, not a code change** (user call). Whether U+20B1
  resolves depends on the fonts the platform's print engine picks, which cannot be
  determined from source and was not reproducible here, so changing the font stack would be
  an unverified guess. The stack is therefore frozen by CON-10 and the defect is covered by
  an observable reviewer check instead: ACC-08 requires the reviewer to confirm the `₱`
  renders as a peso sign on a real Android and iOS device. If it tofus there, that is the
  evidence that justifies a font change — in a follow-up spec, not a guess here.
- **DEC-12 — Income/expense keep their existing named colours.** The declarations stay
  `green` / `red` rather than being converted to hex. Named colours are valid CSS, the
  conversion is presentational only, and the user's declined font change (DEC-11) signals a
  preference not to alter the document's visual design beyond what a defect requires. The
  fix for defect 3 is applying the classes (CON-08), not restyling them.

### 3.5 Resolved defaults (all confirmed 2026-10-01)

The three items that were not part of the user's first five answers have been ruled on:

1. **Columns — CONFIRMED, 7 on both exports** (DEC-08): Date, Type, Category, Amount,
   Payment Method, Establishment, Note. `Transaction.title` stays excluded from both, as
   today.
2. **Font stack — CONFIRMED, left alone** (CON-10, DEC-11): stays
   `'Helvetica Neue', Helvetica, Arial, sans-serif`. Defect 8 becomes an accepted,
   device-verified risk rather than a speculative CSS change.
3. **Income/expense colours — named `green` / `red` retained** (DEC-12); only the class
   application and the `print-color-adjust` fix land.

## 4. Deliverables

- **D-01 — `utils/reportFormat.ts` (new, pure).** Exports `MANILA_UTC_OFFSET_HOURS = 8`,
  `escapeHtml(value: unknown): string`, `csvCell(value: unknown): string`,
  `formatReportDate(iso: string): string`, `ReportTotals`,
  `computeReportTotals(transactions: Transaction[]): ReportTotals`,
  `buildReportFileName(rangeLabel: string): string`, `buildCsvContent(transactions):
  string`, and `buildReportHtml(transactions, formatAmount, rangeLabel): string`.
  CON-03, CON-04, CON-05, CON-07, CON-08, CON-10, CON-11, CON-12, CON-13, CON-20. Constants
  carrying the app's `primary` cite `context/ThemeContext.tsx`. `formatAmount` is injected,
  not imported, to keep the module pure (the currency hook is not available here).
- **D-02 — `utils/exportUtils.ts` (rewrite).** Becomes thin orchestration. Web branch: the
  CON-02 iframe print, and **no** `expo-print` call (CON-01). Native branch:
  `printToFileAsync` → `copyAsync` to a `buildReportFileName`-derived path with a
  null-guarded `documentDirectory` → `shareAsync` with `mimeType: 'application/pdf'` and
  `UTI: 'com.adobe.pdf'` (CON-09). CSV: `csvCell` per field, plain `'utf8'` (CON-04, §1.5).
  `console.error` + rethrow preserved (CON-16).
- **D-03 — `app/(tabs)/reports.tsx` (call site only).** `exportToPDF(filteredTransactions,
  formatAmount, currentRange.label)` (CON-06, CON-15). No change to the cards, charts, or
  filters.
- **D-04 — `utils/reportFormat.test.ts` (new).** Covers ACC-01..ACC-04 and ACC-06: escaping,
  RFC 4180 round-trip field counts, the three Manila-midnight date cases, totals arithmetic,
  filename slugging, PDF/CSV header parity, class application, colour/font assertions, and
  the CON-13 source-text guard. Stays in `utils/` for `roots`; excluded from app `tsc` by
  the pre-existing `**/*.test.ts` exclude (SPEC-07).
- **D-05 — Documentation.** Append the implementation entry to `docs/savepoint.md` and a
  `Current status` bullet to `AGENTS.md` §3 (AGENTS.md §1.8), noting the §1.6 rollback and
  the §1.4 testability limit.

## 4.1 Coverage map

| Defect | Resolved by |
|---|---|
| 1 web prints the wrong document | D-02 (iframe print; CON-01, CON-02, DEC-01) |
| 2 no escaping (PDF **and** CSV) | D-01 `escapeHtml`/`csvCell` (CON-03, CON-04) + D-02 |
| 3 dead `.income`/`.expense` CSS | D-01 class application + `print-color-adjust` (CON-08) |
| 4 no filter context | D-03 passes `currentRange.label` → D-01 renders it (CON-06) |
| 5 missing totals | D-01 `computeReportTotals` + summary block (CON-07, DEC-02/03) |
| 6 device-dependent dates | D-01 `formatReportDate` (CON-05, DEC-04/05) |
| 7 meaningless shared filename | D-02 `copyAsync` + `shareAsync` (CON-09, DEC-06) |
| 8 peso glyph risk | **Accepted risk, not a code change** — font stack frozen (CON-10), verified by ACC-08 on device (DEC-11) |
| 9 off-brand heading colour | D-01 `#1B3F7A` (CON-11) |
| 10 CSV/PDF column mismatch | D-01 shared 7-field list (CON-12, DEC-08) |
| *(11 page-break, beyond the ten)* | D-01 CSS (DEC-10, confirmed) |
| *latent `documentDirectory` null* | D-02 guard (§1.5) |
| *unnecessary `as unknown as` cast* | D-02 plain `'utf8'` (§1.5) |
| *empty period prints a bare header* | D-01 `colspan="7"` row + header-only CSV (CON-20, v1.1) |

## Glossary

| Term | Meaning |
|---|---|
| Report | The HTML document rendered to PDF by `expo-print` on native and by an iframe print on web. |
| Range label | `currentRange.label` from `reports.tsx:87`, e.g. `"Oct 01 - Oct 31, 2025"`; the human description of the active period filter. |
| Manila date | The UTC+8 calendar day of a timestamp. Manila observes no DST, so +08:00 is exact. |
| `escapeHtml` | Escaping `& < > " '` to entities for safe interpolation into HTML text and attribute positions. |
| `csvCell` | RFC 4180 quoting: wrap in `"`, double embedded `"`. |
| `print-color-adjust` | CSS property that stops browsers stripping backgrounds and text colours from printed output; without it the table header fill and income/expense colours vanish. |
| `printToFileAsync` | `expo-print` native API rendering HTML to a PDF in the app cache directory; returns `{ uri, numberOfPages }`. |
| `copyAsync` | `expo-file-system/legacy` API (`{ from, to }`) used to give the cached PDF a meaningful name. |
| `result.numberOfPages` | Page count returned by `printToFileAsync`; ignored today (defect 7). |

## References

- `app/(tabs)/reports.tsx:383` — CSV call site; `:390` — PDF call site (D-03); `:69-88` — `currentRange` / label (CON-06); `:90-95` — `filteredTransactions` (CON-06/07); `:97-106` — screen-side income/expense/net (DEC-03)
- `utils/exportUtils.ts:7-36` — `exportToCSV` (CON-04, §1.5); `:38-102` — `exportToPDF`, defects 1/3/4/5/6/7/8/9/10 at `:90-91,64-65,49-87,72-85,41,71,92-96,58,59,74-80`; `:27` — unguarded `documentDirectory` (§1.5); `:30` — unnecessary `as unknown as` (§1.5)
- `node_modules/expo-print/build/ExponentPrint.web.js:8-13` — `window.print()`, `options` ignored (§1.2); `.../Print.js:24-26,66-68` — routing (CON-01)
- `node_modules/expo-file-system/build/legacy/FileSystem.d.ts:7` — `documentDirectory: string | null`; `:58` — `writeAsStringAsync`; `:76` — `copyAsync`; `FileSystem.types.d.ts:231` — `encoding` accepts `'utf8'`; `:267-276` — `RelocatingOptions` (CON-04, CON-09, §1.5, DEC-06)
- `node_modules/expo-sharing/build/Sharing.types.d.ts:1-15` — `mimeType` / `UTI` / share-dialog title (D-02)
- `node_modules/expo-print/build/Print.types.d.ts:79-124` — `FilePrintOptions.html`, `FilePrintResult.uri` / `.numberOfPages` (defect 7)
- `context/ThemeContext.tsx` — `CustomLightTheme.primary = '#1B3F7A'` (CON-11)
- `types/index.ts:1-41` — `Transaction` (all seven exported fields; `PaymentMethod = string` at `:3`, so no object-coercion bug); `:23-41` — `title` and `splitInfo` excluded by DEC-08
- `jest.config.js` — `roots: ['<rootDir>/utils']`, `testEnvironment: 'node'` (§1.4); `package.json:27,34,37` — existing deps (CON-14)
- `specs/22-settings-export-import-json.md` — separate JSON export feature (non-goal)
- `AGENTS.md` §1.1 (spec-first), §1.3 (agent runs no CLIs), §1.4 (breaking changes + rollback), §1.5 (cross-platform), §1.7 (Expo Go), §1.8 (docs), §1.9 (spec format), §1.10 (spec-first + TDD platform matrix)