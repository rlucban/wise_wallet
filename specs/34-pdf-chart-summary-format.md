# Spec 34: PDF Chart Summary Format

| Field | Value |
|---|---|
| ID | SPEC-34 |
| Title | PDF Chart Summary Format (donut + monthly bars + color-coded category list) |
| Status | **FINAL** v1.1 (2026-10-02, user call) — implement exactly this. |
| Owner | User (final authority) |
| Version | 1.1 |
| Scope | The **PDF** export only: `utils/reportCharts.ts` (new), `utils/reportFormat.ts`, `utils/reportFormat.test.ts`. The CSV export is unchanged in output. |
| Non-goals | Not changing the on-screen Reports charts. Not changing `exportToPDF`'s signature. Not changing the CSV. Not adding a chart dependency. Not adding a per-transaction table to the CSV. |

## Terminology (RFC 2119)

**MUST / MUST NOT / SHALL** are absolute requirements. **SHOULD / SHOULD NOT** are
recommendations that may be overridden with a stated reason. **MAY** is optional. Behaviour
that is not governed by a MUST is a judgement call.

**Summary** — the first page of the PDF: header, totals strip, donut, monthly bar chart, and
the color-coded category list. **Appendix** — the per-transaction table that follows it.
**Bucket** — one aggregated row of category data, keyed by category *name*.

---

## 1. Context

### 1.1 What this changes

Spec 33 produced a correct but plain PDF: a header, a totals table, and a 7-column
per-transaction table. The user has now asked for the transaction table to be **replaced by
a donut chart and a bar graph**, with a **color-coded category list showing expense versus
income**, and the visual result to stay clean.

This supersedes parts of Spec 33: the PDF's main body is no longer a table (so DEC-02/03's
"range label + totals only" and CON-12's column parity in the body no longer describe the
whole document), and ACC-06/ACC-08's assertions about `<th>` parity and "Establishment and
Note columns exist" in the main view are replaced. Spec 33 stays FINAL for everything else —
the escaping, the Manila dates, the file name, the web iframe print, the font freeze, and
the accepted peso-glyph risk all carry over unchanged and are cited here as inherited.

Per the user's answers, the target layout is:

1. **Charts + appendix** — the per-transaction detail is **not** discarded. It moves to an
   appendix after the summary, so nothing that exists today becomes unreachable.
2. **Bar graph = monthly income vs expense trend** — grouped bars per month, mirroring
   `components/MonthlyTrendChart.tsx`, **not** a per-category diverging chart.
3. **Categorical palette** — hue identifies a category. This deliberately diverges from the
   on-screen Reports donut, which alternates only two shades of red and two of green by
   `i % 2` (`app/(tabs)/reports.tsx:123-129`) and is unreadable as donut slices.
4. **Top 7 + Other** — the 7 largest buckets by amount, remainder rolled into one grey
   "Other".

### 1.2 Why the charts are hand-written SVG

`react-native-svg@15.15.4` is a dependency but renders to native primitives and has no HTML
serializer; the PDF is generated as a standalone HTML string in a headless print context with
no React or RN tree mounted. `react-native-chart-kit` is present but only reachable through
`components/ChartCard.tsx`, which is **dead code** (not imported anywhere) and would still
need a serializer. Loading a chart library from a CDN inside a print document is
unacceptable: print engines block or asynchronously resolve external resources, so the chart
would frequently render empty.

Therefore the charts are **inline `<svg>` emitted as text**. This is the same technique
`components/DonutChart.tsx:4` and `components/MonthlyTrendChart.tsx:4` already use to draw
the on-screen versions, so the printed output stays structurally consistent with the app. The
markup MUST be self-contained: no external stylesheet, script, font, or image.

### 1.3 Donut technique, and why not `pathLength`

The donut is drawn as **stroked circles with `stroke-dasharray`**, not as filled wedge paths:

- `pathLength="100"` would let every segment be expressed as a clean percentage, but it
  depends on renderer support for that attribute on basic shapes. A silently-unsupported
  `pathLength` yields a wrong chart with no error, which is the worst failure mode for a
  print feature that can only be checked by eye. Not used.
- `stroke-dasharray` is universally supported. The cost is that the circumference must be
  computed, so the numbers in the output are not round. That is an acceptable trade: the
  numbers are produced by a pure function and asserted in tests (ACC-02).
- Filled wedge `<path>` arcs (as in `components/DonutChart.tsx:88-94`) need `large-arc-flag`
  handling and a special case for the single-segment full circle. `stroke-dasharray` renders
  a full ring for free, so the empty and single-category cases need no branch.

Each segment is a `<circle>` with `fill="none"`, `stroke-width` fixed, the whole group
rotated `-90` about the centre so the first slice starts at 12 o'clock, and
`stroke-dasharray="<arc> <circumference>"` with `stroke-dashoffset="<negative offset>"`.
`stroke-linecap` MUST be `butt`; rounded caps would overlap neighbours and change the
apparent share.

### 1.4 The one meaningful color decision (DEC-03)

There are two plausible color schemes and they conflict, so this is stated rather than
left to taste:

- **Red/green already mean something** in this document: income and expense in the monthly
  bar chart.
- **If the donut also used red/green**, a red slice would read as "expense" in a chart where
  red and green are just arbitrary category identities, and the same hue would mean two
  different things on one page.

Resolution: **in the donut and the category list, hue identifies the category and never
income-versus-expense.** The palette deliberately excludes the two income/expense colors.
The category list shows an explicit expense column and an explicit income column, so the
type is always readable from text and never inferred from a swatch. Red and green are
reserved for the bar chart alone.

### 1.5 Month bucketing follows the same Manila rule as the dates

`formatReportDate` already pins every date to Asia/Manila (Spec 33 §1.3) because `Intl` is
unreliable in Hermes and this string is generated in the RN runtime, not the WebView. The
month buckets inherit that rule: a transaction at `2025-12-31T16:30:00.000Z` is **January
2026** in the bar chart, matching its `01/01/2026` cell in the appendix. Using UTC here
would put a row in the chart and a different month in the table beneath it.

Month labels come from a fixed 12-element array in source, never from `Intl` or
`toLocaleDateString`, for the same reason.

### 1.6 Rollback

Revert `utils/reportFormat.ts` and delete `utils/reportCharts.ts` and the added
`utils/reportFormat.test.ts` cases. `utils/exportUtils.ts` and `app/(tabs)/reports.tsx` are
untouched by this spec. No storage key, API contract, route, or dependency is involved, so
no migration.

---

## 2. Constraints (normative)

- **CON-01 — No new dependency.** `package.json` and `package-lock.json` MUST be unchanged.
  `expo-print`, `expo-sharing`, and `expo-file-system` remain the only export-path imports.
- **CON-02 — Hand-written SVG only.** The charts MUST be inline `<svg>` markup generated as
  text. No charting library, no `<canvas>` + `toDataURL`, no external image, no CDN, no
  `@import`, no remote font. `react-native-svg` MUST NOT be imported.
- **CON-03 — Hue means category, not type.** In the donut and the category list, color MUST
  identify a category only. The palette MUST NOT contain `#ef4444` or `#10b981` (the
  on-screen income/expense colors, `app/(tabs)/reports.tsx:15,17`), and the list MUST carry
  the expense and income amounts as separate labeled columns so the type is never inferred
  from a swatch. Red/green is reserved for the bar chart (DEC-03, §1.4).
- **CON-04 — Palette.** The categorical palette MUST be exactly 7 distinct hex values, plus a
  fixed grey `#9AA0A6` reserved for "Other". All 8 MUST be pairwise distinct. The first entry
  MUST be `#1B3F7A` so the largest category ties to the app's `primary`
  (`context/ThemeContext.tsx:13`).
- **CON-05 — Bucket key is the category name.** Buckets MUST be keyed by
  `t.category?.name || "Uncategorized"`, matching the on-screen screen's grouping
  (`app/(tabs)/reports.tsx:113`) rather than by category `id`. A category carrying both
  income and expense MUST appear as **one** bucket with two amounts, not two buckets. Each
  bucket carries `expense`, `income`, and `total = expense + income`.
- **CON-06 — One bucket per name in the list.** The category list MUST have exactly one row
  per bucket, with columns: swatch, name, expense, income, net. The list MUST NOT be keyed
  by `id` and MUST NOT split a name across two rows.
- **CON-07 — Top 7 + Other.** Buckets MUST be sorted by `total` descending, ties broken by
  name ascending (stable, deterministic). The first 7 are shown individually; the remainder,
  if any, MUST collapse into a single bucket named `Other` colored `#9AA0A6`, appearing last.
  When there are 7 or fewer buckets, `Other` MUST NOT appear. The sum of the shown buckets
  plus `Other` MUST equal the sum of all buckets.
- **CON-08 — The donut shows one slice per shown bucket, `total`-weighted.** A slice's share
  MUST be `bucket.total / sum(shownBucketTotals)`, including `Other`. Because buckets are
  `total`-weighted, a bucket holding both types is one slice.
- **CON-09 — Monthly buckets in Manila, ascending.** Months MUST be derived with the same
  UTC+8 rule as `formatReportDate` (Spec 33 CON-05), keyed `YYYY-MM`, and MUST be emitted
  oldest-first with no gaps **between the first and last month that has data**. A month with
  no transactions MUST NOT appear, so a sparse period does not render a run of empty bars.
- **CON-10 — Bars are grouped, not stacked.** Each month MUST render at most two bars side
  by side: income then expense, in that order, both anchored to a shared baseline. Bar
  heights MUST be proportional to their value against the chart's single maximum, which is
  the largest income **or** expense month in the period. The chart MUST NOT use a secondary
  axis, a stacked total, or a different scale per month.
- **CON-11 — No `NaN` in the output.** Every emitted coordinate, width, height, offset, and
  share MUST be a finite number. A period where every value is zero MUST render a valid chart
  with no bars and an explicit empty-state message, never a `NaN` attribute.
- **CON-12 — Appendix keeps the seven fields.** The appendix MUST keep the same 7 fields in
  the same order as the CSV: Date, Type, Category, Amount, Payment Method, Establishment,
  Note. Spec 33's column parity is relocated, not dropped: the PDF and the CSV still agree,
  and the parity test still passes (ACC-08).
- **CON-13 — Appendix starts on a new page.** The appendix heading MUST carry
  `break-before: page` so the summary is never split across a page boundary by the table.
  The appendix table MUST keep `thead { display: table-header-group }` and
  `tr { break-inside: avoid }` from Spec 33 so headers repeat and rows do not split.
- **CON-14 — Escaping is unchanged.** All text entering the document — including category
  names in the donut legend, the list, the bar-chart month labels, and the `Other` label —
  MUST pass through `escapeHtml`. The formatted amount in the list and in the y-axis labels
  MUST be escaped as well. The SVG is generated from computed numbers and fixed literals and
  MUST NOT interpolate user text into an attribute.
- **CON-15 — Font stack frozen.** `font-family` MUST stay exactly
  `'Helvetica Neue', Helvetica, Arial, sans-serif`. The peso-glyph risk (U+20B1) is the same
  accepted risk as Spec 33 DEC-11, verified by ACC-12. This spec adds no font change.
- **CON-16 — Heading color.** The `h1` color MUST remain `#1B3F7A`. The document stays
  light-themed regardless of the app's dark-mode state.
- **CON-17 — Colors must survive printing.** The document MUST keep
  `print-color-adjust: exact` and `-webkit-print-color-adjust: exact`, without which browsers
  strip the slice fills, bar fills, and swatches from the printed output.
- **CON-18 — Empty period.** With no transactions, the document MUST still render the
  header, the range label, the totals strip, both chart frames with their empty-state
  messages, the category list with its empty-state row, and the appendix with its single
  `<td colspan="7">` row (Spec 33 CON-20). No donut segment and no bar may be emitted.
- **CON-19 — Purity and platform safety.** `utils/reportCharts.ts` MUST NOT import
  `react-native`, `expo-print`, `expo-sharing`, `expo-file-system`, or `../types` as a value,
  MUST contain no `Platform.OS`, and MUST NOT use `Intl`, `toLocaleDateString`, `Math.random`,
  or `Date.now` — the last two because a nondeterministic chart cannot be asserted and a
  timestamp makes the output unstable. `import type` from `../types` is permitted. Neither
  new module may add a top-level native import, so Expo Go is unaffected.
- **CON-20 — Signature and call site frozen.** `exportToPDF` MUST keep its Spec 33 v1.1
  signature `(transactions, formatAmount, rangeLabel)`. `utils/exportUtils.ts` and
  `app/(tabs)/reports.tsx` MUST NOT change; the web iframe print, the native
  `deleteAsync` + `copyAsync` + `shareAsync` path, and the file name all carry over.
- **CON-21 — No lint weakening.** `eslint.config.js` and `utils/themeColors.test.js` MUST be
  untouched. `utils/reportFormat.ts` and `utils/reportCharts.ts` are not in that test's
  `FILES_TO_CHECK` list, so the hex palette is permitted there without amending the linter.
- **CON-22 — Verification gates.** `npm test`, `npm run lint`, and `npx tsc --noEmit` MUST be
  clean. The user runs the commands (AGENTS.md §1.3).

---

## 3. Goal

The exported PDF opens on a page that reads as a finished report: the selected range, three
totals, a donut of category composition, a monthly income-versus-expense bar chart, and a
color-coded list showing each category's expense and income side by side. The per-transaction
detail follows as an appendix. Nothing that the current export shows becomes unreachable.

### 3.1 Platform matrix

| Platform | Objective (machine-checkable) | Subjective (reviewer observation) |
|---|---|---|
| **Android** (Expo Go + dev build) | ACC-01, ACC-02, ACC-03, ACC-04, ACC-05, ACC-06, ACC-07, ACC-08, ACC-09, ACC-10, ACC-11 | ACC-13, ACC-14, ACC-15, ACC-16 |
| **iOS** (Expo Go + dev build) | ACC-01, ACC-02, ACC-03, ACC-04, ACC-05, ACC-06, ACC-07, ACC-08, ACC-09, ACC-10, ACC-11 | ACC-13, ACC-14, ACC-15, ACC-16 |
| **Web** (`expo export --platform web`) | ACC-01, ACC-02, ACC-03, ACC-04, ACC-05, ACC-06, ACC-07, ACC-08, ACC-09, ACC-10, ACC-12 | ACC-14, ACC-15, ACC-16 |

ACC-11 (Expo Go, no red box) and ACC-13 (share sheet, named file, repeat export) are
native-only. ACC-12 (web print preview shows charts) is web-only. Everything else is
platform-invariant by construction (CON-19), which ACC-10 proves by asserting
byte-identical output across all three.

### 3.2 Acceptance criteria (Objective — machine-checkable)

| ID | Platform | Criterion |
|---|---|---|
| **ACC-01** | all | `utils/reportCharts.test.ts` and `utils/reportFormat.test.ts` cover every export named in D-01/D-02 with literal expected values. `npm test` reports `0 failed` and the total rises by exactly the number of tests declared. |
| **ACC-02** | all | `buildDonutSegments` returns one entry per shown bucket with a `dasharray` string, a finite numeric `dashoffset`, and a `color` from the palette. Summed arc lengths equal the circumference within `0.01`. The output contains `rotate(-90` and `stroke-linecap="butt"`, and contains no `pathLength`. |
| **ACC-03** | all | With 20 transactions across 12 category names, `rollUpCategories` returns 8 buckets: 7 sorted by `total` desc, then `Other` in `#9AA0A6`. The 7 individual totals plus `Other.total` equal the input sum. With 5 names, no `Other` is produced. Ties are broken by name ascending. |
| **ACC-04** | all | The 8 palette values are pairwise distinct, the first is `#1B3F7A`, and none is `#ef4444` or `#10b981`. `Other` is `#9AA0A6`. |
| **ACC-05** | all | `bucketMonths` returns ascending `YYYY-MM` keys with no internal gaps, using the Manila rule: `2025-12-31T16:30:00.000Z` buckets as `2026-01`, not `2025-12`. Labels come from a fixed 12-element array, and a source-text guard asserts no `Intl` / `toLocaleDateString`. |
| **ACC-06** | all | `buildBarChart` emits a `height` of `0` rather than a negative or `NaN` value for a zero month; every emitted `x`, `y`, `width`, and `height` matches `/^-?\d+(\.\d{1,3})?$/`; the single chart maximum is the largest income or expense month; income precedes expense within a group; and an all-zero period emits no `<rect>` and one empty-state message. |
| **ACC-07** | all | Every category name in the PDF passes through `escapeHtml`. A fixture with a category name of `<script>alert(1)</script> & "q"` produces `&lt;script&gt;` in the list row, in the donut legend, and no literal `<script>`. The formatted amount is escaped in the list and the y-axis labels. |
| **ACC-08** | all | The appendix still emits the same 7 headers as `buildCsvContent`, in the same order, and the Spec 33 parity test still passes. The appendix heading carries `break-before: page`; `thead` carries `display: table-header-group`; rows carry `break-inside: avoid`. |
| **ACC-09** | all | `buildReportHtml` output contains the range label, the income/expense/net totals, `print-color-adjust: exact`, `font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif`, `#1B3F7A`, and no `#6200ee`. Spec 33's ACC-06 assertions that survive this spec remain green. |
| **ACC-10** | all | Under `Platform.OS` = android / ios / web (mocked), `buildReportHtml` and `buildCsvContent` return byte-identical strings. `utils/reportCharts.ts` contains no `react-native` / `expo-*` import, no `Platform.OS`, and no `Math.random` / `Date.now`. |
| **ACC-11** | Android/iOS | The app starts in Expo Go and the module graph is unchanged, so no new native module is evaluated on import. The existing no-red-box behavior is preserved. |
| **ACC-12** | web | `expo export --platform web` still succeeds, and `utils/exportUtils.ts` is byte-identical to its Spec 33 state, so `document` / `iframe` remain confined to the web branch. |

### 3.3 Acceptance criteria (Subjective — reviewer observation, per platform)

| ID | Platform | Test procedure | Pass condition |
|---|---|---|---|
| **ACC-13** | Android/iOS | Reports → a period with transactions → tap **PDF** → complete the share flow. | The document is the **chart report**, not the Reports screen. The share sheet opens with `WiseWallet_Report_<slug>.pdf`. Exporting the same range twice both succeed. |
| **ACC-14** | all | Look at page 1 of the produced PDF. | It reads as one clean system: the donut and the bar chart sit side by side or stacked without overlapping, no label is clipped, no text runs off the page edge, and there is no leftover empty table where the transaction table used to be. |
| **ACC-15** | all | Match each donut slice color to its list row, and confirm income/expense colors in the bar chart. | Every slice has a matching swatch in the list, and no slice uses the bar chart's income green or expense red, so red/green never means two things on the page. |
| **ACC-16** | all | Read the whole PDF, then read the same period in the app. | The totals match the app's cards for that range, the category amounts match, the appendix still lists every transaction with its note, establishment, and payment method, and the `₱` renders with no tofu box (the Spec 33 accepted risk). |

### 3.4 Decisions

- **DEC-01 — Charts + appendix, not charts-only.** The per-transaction table moves to page 2+
  rather than being deleted. The user could have asked for a table-free PDF; keeping the data
  reachable costs one page break and loses nothing.
- **DEC-02 — The bar chart is the monthly trend, not a per-category diverging chart.** Chosen
  by the user. It answers "how did spending move over the period", which a per-category chart
  cannot. The expense-versus-income comparison the user asked for is carried by the category
  list's two amount columns.
- **DEC-03 — Hue means category; red/green means income/expense.** §1.4. A single color
  language per role, so no swatch is ambiguous.
- **DEC-04 — One bucket per category name.** CON-05/06. Matching the on-screen grouping keeps
  the PDF and the app telling the same story; a name carrying both types shows both amounts in
  one row instead of splitting.
- **DEC-05 — Top 7 + Other.** Chosen by the user. A 20-slice donut is unreadable, so the cap
  is a legibility requirement, not a data loss: `Other` still carries the exact summed amount.
- **DEC-06 — Buckets are `total`-weighted, not split by type.** Keeps one slice per category
  (CON-08) and matches the app's combined donut. The expense/income split is in the list.
- **DEC-07 — `stroke-dasharray` over `pathLength` or wedge paths.** §1.3. Robustness across
  unknown print renderers beats prettier output for a feature verified by eye.
- **DEC-08 — Gridlines are minimal.** The bar chart draws a baseline, the maximum-value label,
  and a single mid gridline. More gridlines read as clutter at A4 width and the user asked for
  a clean result.
- **DEC-09 — Months with no data are omitted, not zeroed.** CON-09. A year with three active
  months shows three groups, not twelve with nine empty.
- **DEC-10 — No `exportToPDF` signature change.** The range label is already available from
  Spec 33, so the call site and `exportUtils.ts` are untouched. This is a pure rendering
  change, which keeps the rollback to two files.
- **DEC-11 — The peso glyph risk is carried forward unchanged.** Adding charts adds more
  `₱`-bearing labels to the page, which does not change the font situation, so CON-15 freezes
  the stack and ACC-16 verifies on device. It remains an accepted risk, not a fix.

### 3.5 Accepted risks

- **Segmentation seams.** `stroke-dasharray` values are rounded to 3 decimals
  (ACC-02), so adjacent slices can show a sub-pixel gap at some zoom levels. Invisible at
  print resolution, but a reviewer looking at a zoomed screen preview may notice. Fixing it
  would mean overlapping arcs and a visibly wrong share.
- **Font-metric-dependent SVG text.** Month labels and legend text sit inside the `<svg>` and
  are sized in the print engine's font, which is the frozen Helvetica stack. Very long
  category names are truncated with an ellipsis in the donut legend rather than allowed to
  collide; the full name always appears in the list. ACC-14 checks this by eye.

---

## 4. Deliverables

- **D-01 — `utils/reportCharts.ts` (new, pure).** Geometry and aggregation only; no HTML.
  Exports:
  - `REPORT_PALETTE` — the 7 hex values (CON-04), first `#1B3F7A`.
  - `OTHER_COLOR = '#9AA0A6'` and `OTHER_LABEL = 'Other'`.
  - `INCOME_CHART_COLOR = '#10b981'`, `EXPENSE_CHART_COLOR = '#ef4444'` — mirroring
    `components/MonthlyTrendChart.tsx:6-7` and `app/(tabs)/reports.tsx:15,17` (CON-03).
  - `MONTH_ABBREVIATIONS` — the fixed 12-element array, e.g. `Jan`…`Dec`.
  - `CategoryBucket { name, expense, income, total, color }`, `MAX_CATEGORY_BUCKETS = 7`.
  - `rollUpCategories(transactions): CategoryBucket[]` — CON-05/06/07.
  - `DonutSegment { dasharray, dashoffset, color }`,
    `buildDonutSegments(buckets, radius = DONUT_RADIUS): DonutSegment[]` — CON-08.
  - `MonthBucket { key, label, income, expense }`, `bucketMonths(transactions): MonthBucket[]`
    — CON-09.
  - `BarRect { x, y, width, height, color }`, `buildBarChart(months, plot): { rects, maxValue }`
    — CON-10/11.
  - `formatReportMonth(iso): { key, label }` — Manila, no `Intl` (§1.5).
- **D-02 — `utils/reportFormat.ts` (extended).** Keeps every Spec 33 export and behavior
  (`escapeHtml`, `csvCell`, `formatReportDate`, `computeReportTotals`,
  `buildReportFileName`, `buildCsvContent`, `buildReportHtml`, `REPORT_COLUMNS`,
  `REPORT_PRIMARY_COLOR`). Adds `buildDonutSvg`, `buildBarChartSvg`, `buildCategoryListHtml`,
  `buildTotalsHtml`, and `buildAppendixHtml`; `buildReportHtml` composes them into: header →
  totals strip → donut + bar chart → category list → page break → appendix. Adds the chart CSS
  and the `break-before: page` rule. Renders every number via `.toFixed(2)` or
  `.toFixed(3)` so no float noise reaches the document (CON-11). Imports
  `utils/reportCharts.ts`; stays pure and `import type`-only (CON-19).
- **D-03 — `utils/reportCharts.test.ts` (new).** Covers ACC-02..ACC-07 and the ACC-10 source
  guards: donut arc math, top-7+Other rollup, palette distinctness, Manila month bucketing,
  bar geometry including the zero and all-zero cases, and the no-`Intl`/no-`Platform.OS`
  source-text guards.
- **D-04 — `utils/reportFormat.test.ts` (extended).** Adds the composition, escaping-in-charts,
  appendix-parity, and empty-period assertions of ACC-01, ACC-07, ACC-08, ACC-09, ACC-10.
  Existing Spec 33 cases MUST keep passing; the two that the new layout supersedes
  (the `<th>`-parity and `colspan="7"`-in-the-body cases) are retargeted to the appendix
  rather than deleted, so the coverage is preserved and relocated.
- **D-05 — Documentation.** Append the implementation entry to `docs/savepoint.md` and a
  `Current status` bullet to `AGENTS.md` §3 (AGENTS.md §1.8), recording that this supersedes
  Spec 33's PDF body layout, that the peso risk is carried forward, and that the appendix is
  why no data was dropped.

### 4.1 Coverage map

| Item | Resolved by |
|---|---|
| Donut replaces the table as the summary's centerpiece | D-01 `buildDonutSegments` + D-02 `buildDonutSvg` (CON-08, DEC-07) |
| Bar graph = monthly income vs expense | D-01 `bucketMonths`/`buildBarChart` + D-02 (CON-09/10, DEC-02) |
| Color-coded categories, expense vs income | D-01 `rollUpCategories` + D-02 `buildCategoryListHtml` (CON-03/05/06, DEC-03/04) |
| Many categories stay legible | D-01 rollup cap (CON-07, DEC-05) |
| Per-transaction data not lost | D-02 `buildAppendixHtml` + CON-12/13 (DEC-01) |
| PDF/CSV column parity preserved | CON-12, ACC-08 (relocated from Spec 33 CON-12) |
| XSS / broken layout from user text | D-02 via inherited `escapeHtml` (CON-14) |
| Colors survive the print pipeline | CON-17 |
| Empty period renders cleanly | D-02 empty-state branches (CON-18) |
| No `NaN` in emitted coordinates | D-01 `.toFixed`, D-02 rounding (CON-11) |
| Deterministic, testable, platform-invariant | D-01 purity + ACC-10 (CON-19) |
| No new dependency | CON-01 |
| `exportToPDF` and the web print path untouched | CON-20, DEC-10 |
| `themeColors.test.js` not weakened | CON-21 |
| Peso glyph | Inherited accepted risk (DEC-11, ACC-16) |

---

## Glossary

**Bucket** — one aggregated category row, keyed by category name, carrying `expense`,
`income`, and `total`. **Summary** — page 1 of the PDF. **Appendix** — the per-transaction
table after the summary. **Other** — the single rolled-up bucket for the categories beyond the
top 7. **Month bucket** — one calendar month of income and expense totals. **Stroke
dasharray** — the SVG technique that draws an arc by insetting a dashed pattern along a
circle's path. **pathLength** — an SVG attribute that rescales a path's length; deliberately
unused here (DEC-07).

## History

> **v1.1 (2026-10-02, post-FINAL, non-normative).** User marked v0.1 FINAL ("change the PDF
> format"). One signature amended while implementing D-01: v0.1 specified
> `buildDonutSegments(buckets, radius = 78, strokeWidth = 30)`, but the arc geometry depends
> only on the radius — the stroke width never enters the dasharray. A trailing parameter that
> is never read is permanent `@typescript-eslint/no-unused-vars` debt, so the parameter was
> dropped and `DONUT_STROKE_WIDTH` is now exported as a constant the renderer reads directly.
> No constraint, acceptance criterion, decision, or deliverable was relaxed, reordered, or
> removed.

## References

- `specs/33-report-export-fidelity.md` — the export spec this one amends. CON-03
  (escaping), CON-05 (Manila dates), CON-10 (font freeze), CON-11 (`#1B3F7A`), CON-20
  (empty period), and DEC-11 (peso risk) are inherited unchanged.
- `utils/reportFormat.ts` — all current report string generation; the composition target.
- `utils/exportUtils.ts` — web iframe print and native share path; unchanged by this spec.
- `components/DonutChart.tsx:4,58-60,88-94` — the on-screen donut; `outerR`/`thickness`
  proportions and the stroked-arc technique.
- `components/MonthlyTrendChart.tsx:6-7,18,67,105-106` — the on-screen bar chart; the income
  and expense colors, padding, `barWidth` cap, and group offsets mirrored here.
- `app/(tabs)/reports.tsx:15-18,113,123-129,135` — on-screen colors and the name-based
  grouping CON-05 follows.
- `context/ThemeContext.tsx:13` — `primary: '#1B3F7A'`, the palette's first entry (CON-04).
- `utils/themeColors.test.js:4-13` — `FILES_TO_CHECK`; neither new module is listed (CON-21).
- `types/index.ts:23-41` — `Transaction`, the input to both new modules.
