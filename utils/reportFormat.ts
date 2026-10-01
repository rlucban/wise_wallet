import type { Transaction } from "../types";
import {
    buildBarChart,
    buildDonutSegments,
    bucketMonths,
    DEFAULT_BAR_PLOT,
    DONUT_RADIUS,
    DONUT_STROKE_WIDTH,
    EXPENSE_CHART_COLOR,
    INCOME_CHART_COLOR,
    MANILA_UTC_OFFSET_HOURS,
    rollUpCategories,
    toManilaDate,
    type CategoryBucket,
} from "./reportCharts";

export { MANILA_UTC_OFFSET_HOURS };

const REPORT_PRIMARY_COLOR = "#1B3F7A";

const EMPTY_CATEGORY_LABEL = "Uncategorized";

const EMPTY_PERIOD_COPY = "No transactions in this period.";

const DEFAULT_FILE_NAME_SLUG = "All-Transactions";

const DONUT_SIZE = 200;
const DONUT_CENTER = DONUT_SIZE / 2;
const BAR_GRID_COLOR = "#E5E7EB";
const BAR_LABEL_COLOR = "#6B7280";

export const REPORT_COLUMNS = [
    "Date",
    "Type",
    "Category",
    "Amount",
    "Payment Method",
    "Establishment",
    "Note",
] as const;

const HTML_ESCAPES: Record<string, string> = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
};

export interface ReportTotals {
    income: number;
    expense: number;
    net: number;
}

const isBlank = (value: unknown): boolean => value === null || value === undefined;

export const escapeHtml = (value: unknown): string => {
    if (isBlank(value)) return "";
    return String(value).replace(/[&<>"']/g, (char) => HTML_ESCAPES[char]);
};

export const csvCell = (value: unknown): string => {
    if (isBlank(value)) return '""';
    return `"${String(value).replace(/"/g, '""')}"`;
};

export const formatReportDate = (iso: string): string => {
    const manila = toManilaDate(iso);
    if (!manila) return "";

    const month = String(manila.getUTCMonth() + 1).padStart(2, "0");
    const day = String(manila.getUTCDate()).padStart(2, "0");
    return `${month}/${day}/${manila.getUTCFullYear()}`;
};

export const computeReportTotals = (transactions: Transaction[]): ReportTotals => {
    let income = 0;
    let expense = 0;

    for (const transaction of transactions) {
        const amount = transaction.amount || 0;
        if (transaction.type === "income") income += amount;
        else if (transaction.type === "expense") expense += amount;
    }

    return { income, expense, net: income - expense };
};

export const buildReportFileName = (rangeLabel: string): string => {
    const slug = rangeLabel
        .replace(/[^a-zA-Z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");

    return `WiseWallet_Report_${slug || DEFAULT_FILE_NAME_SLUG}.pdf`;
};

const toCsvFields = (transaction: Transaction): string[] => [
    formatReportDate(transaction.date),
    transaction.type,
    transaction.category?.name || EMPTY_CATEGORY_LABEL,
    String(transaction.amount ?? 0),
    transaction.paymentMethod || "",
    transaction.establishment || "",
    transaction.note || "",
];

export const buildCsvContent = (transactions: Transaction[]): string => {
    const lines = [REPORT_COLUMNS.map(csvCell).join(",")];

    for (const transaction of transactions) {
        lines.push(toCsvFields(transaction).map(csvCell).join(","));
    }

    return lines.join("\n");
};

const signedAmount = (value: number, formatAmount: (amount: number) => string): string => {
    const sign = value < 0 ? "-" : "+";
    return `${sign}${formatAmount(Math.abs(value))}`;
};

const toneFor = (value: number): string => (value < 0 ? "expense" : "income");

const emptyFrame = (width: number, height: number): string => `
      <rect x="0" y="0" width="${width}" height="${height}" fill="none" stroke="${BAR_GRID_COLOR}" stroke-width="1" stroke-dasharray="4 3" />
      <text x="${width / 2}" y="${height / 2}" text-anchor="middle" font-size="11" fill="${BAR_LABEL_COLOR}">${escapeHtml(EMPTY_PERIOD_COPY)}</text>`;

export const buildDonutSvg = (buckets: CategoryBucket[]): string => {
    const segments = buildDonutSegments(buckets);
    const body =
        segments.length > 0
            ? segments
                  .map(
                      (segment) =>
                          `      <circle cx="${DONUT_CENTER}" cy="${DONUT_CENTER}" r="${DONUT_RADIUS}" stroke="${segment.color}" stroke-width="${DONUT_STROKE_WIDTH}" stroke-dasharray="${segment.dasharray}" stroke-dashoffset="${segment.dashoffset}" />`
                  )
                  .join("\n")
            : emptyFrame(DONUT_SIZE, DONUT_SIZE);

    return `<svg class="donut" viewBox="0 0 ${DONUT_SIZE} ${DONUT_SIZE}" width="${DONUT_SIZE}" height="${DONUT_SIZE}" role="img" aria-label="Category share of total activity">
  <g transform="rotate(-90 ${DONUT_CENTER} ${DONUT_CENTER})" fill="none" stroke-linecap="butt">
${body}
  </g>
</svg>`;
};

export const buildBarChartSvg = (
    transactions: Transaction[],
    formatAmount: (amount: number) => string
): string => {
    const plot = DEFAULT_BAR_PLOT;
    const months = bucketMonths(transactions);
    const chart = buildBarChart(months, plot);

    if (months.length === 0 || chart.maxValue <= 0) {
        return `<svg class="bars" viewBox="0 0 ${plot.width} ${plot.height}" width="${plot.width}" height="${plot.height}" role="img" aria-label="Monthly income and expense">
${emptyFrame(plot.width, plot.height)}
</svg>`;
    }

    const gridlines = chart.gridlines
        .map(
            (line) =>
                `      <line x1="${plot.padLeft}" y1="${line.y}" x2="${plot.width - plot.padRight}" y2="${line.y}" stroke="${BAR_GRID_COLOR}" stroke-width="1" />
      <text x="${plot.padLeft - 6}" y="${line.y + 3}" text-anchor="end" font-size="9" fill="${BAR_LABEL_COLOR}">${escapeHtml(formatAmount(line.value))}</text>`
        )
        .join("\n");

    const rects = chart.rects
        .map(
            (rect) =>
                `      <rect x="${rect.x}" y="${rect.y}" width="${rect.width}" height="${rect.height}" fill="${rect.color}" />`
        )
        .join("\n");

    const labels = chart.groups
        .map(
            (group) =>
                `      <text x="${Number((group.x + group.width / 2).toFixed(3))}" y="${chart.baselineY + 14}" text-anchor="middle" font-size="10" fill="${BAR_LABEL_COLOR}">${escapeHtml(group.label)}</text>`
        )
        .join("\n");

    return `<svg class="bars" viewBox="0 0 ${plot.width} ${plot.height}" width="${plot.width}" height="${plot.height}" role="img" aria-label="Monthly income and expense">
  <g>
${gridlines}
${rects}
${labels}
  </g>
</svg>`;
};

const buildTotalsHtml = (
    totals: ReportTotals,
    formatAmount: (amount: number) => string
): string => {
    const cells = [
        { label: "Total Income", value: formatAmount(totals.income), className: "income" },
        { label: "Total Expense", value: formatAmount(totals.expense), className: "expense" },
        {
            label: "Net",
            value: signedAmount(totals.net, formatAmount),
            className: toneFor(totals.net),
        },
    ];

    const body = cells
        .map(
            (cell) => `        <div class="stat">
          <span class="stat-label">${escapeHtml(cell.label)}</span>
          <span class="stat-value ${cell.className}">${escapeHtml(cell.value)}</span>
        </div>`
        )
        .join("\n");

    return `    <div class="stats">
${body}
    </div>`;
};

const buildCategoryListHtml = (
    buckets: CategoryBucket[],
    formatAmount: (amount: number) => string
): string => {
    const head = `          <tr>
            <td class="col-head swatch-col"></td>
            <td class="col-head">Category</td>
            <td class="col-head num">Expense</td>
            <td class="col-head num">Income</td>
            <td class="col-head num">Net</td>
          </tr>`;

    if (buckets.length === 0) {
        return `      <table class="list">
        <tbody>
${head}
          <tr>
            <td class="empty" colspan="5">${escapeHtml(EMPTY_PERIOD_COPY)}</td>
          </tr>
        </tbody>
      </table>`;
    }

    const rows = buckets
        .map(
            (bucket) => `          <tr>
            <td class="swatch-col"><span class="swatch" style="background-color: ${bucket.color}"></span></td>
            <td>${escapeHtml(bucket.name)}</td>
            <td class="num">${escapeHtml(formatAmount(bucket.expense))}</td>
            <td class="num">${escapeHtml(formatAmount(bucket.income))}</td>
            <td class="num">${escapeHtml(signedAmount(bucket.income - bucket.expense, formatAmount))}</td>
          </tr>`
        )
        .join("\n");

    return `      <table class="list">
        <tbody>
${head}
${rows}
        </tbody>
      </table>`;
};

const buildAppendixRowsHtml = (
    transactions: Transaction[],
    formatAmount: (amount: number) => string
): string => {
    if (transactions.length === 0) {
        return `          <tr>
            <td colspan="7">${EMPTY_PERIOD_COPY}</td>
          </tr>`;
    }

    return transactions
        .map((transaction) => {
            const cells = [
                formatReportDate(transaction.date),
                transaction.type,
                transaction.category?.name || EMPTY_CATEGORY_LABEL,
                formatAmount(transaction.amount ?? 0),
                transaction.paymentMethod || "",
                transaction.establishment || "",
                transaction.note || "",
            ]
                .map(escapeHtml)
                .map((value) => `            <td>${value}</td>`)
                .join("\n");

            return `          <tr class="${transaction.type}">
${cells}
          </tr>`;
        })
        .join("\n");
};

const buildAppendixHtml = (
    transactions: Transaction[],
    formatAmount: (amount: number) => string
): string => {
    const headerCells = REPORT_COLUMNS.map(
        (column) => `          <th>${escapeHtml(column)}</th>`
    ).join("\n");

    return `    <h2 class="appendix-heading">Transaction Details</h2>
    <table class="appendix">
      <thead>
        <tr>
${headerCells}
        </tr>
      </thead>
      <tbody>
${buildAppendixRowsHtml(transactions, formatAmount)}
      </tbody>
    </table>`;
};

export const buildReportHtml = (
    transactions: Transaction[],
    formatAmount: (amount: number) => string,
    rangeLabel: string
): string => {
    const totals = computeReportTotals(transactions);
    const buckets = rollUpCategories(transactions);

    return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>WiseWallet Transaction Report</title>
    <style>
      * { margin: 0; padding: 0; box-sizing: border-box; }
      @page { size: A4; margin: 15mm; }
      body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #333; line-height: 1.4; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      h1 { color: ${REPORT_PRIMARY_COLOR}; text-align: center; margin-bottom: 4px; font-size: 22px; }
      h2 { color: ${REPORT_PRIMARY_COLOR}; font-size: 15px; margin: 20px 0 8px; }
      .date { text-align: center; color: #666; margin-bottom: 14px; font-size: 13px; }
      .range { text-align: center; color: #333; margin-bottom: 4px; font-size: 14px; font-weight: 600; }
      .stats { display: flex; gap: 10px; margin: 14px 0 18px; }
      .stat { flex: 1 1 0; border: 1px solid #e5e7eb; border-radius: 8px; padding: 9px 12px; }
      .stat-label { display: block; font-size: 11px; color: ${BAR_LABEL_COLOR}; text-transform: uppercase; letter-spacing: 0.4px; }
      .stat-value { display: block; font-size: 17px; font-weight: 700; margin-top: 2px; }
      .charts { display: flex; align-items: flex-start; gap: 22px; }
      .donut-col { flex: 0 0 ${DONUT_SIZE}px; }
      .list-col { flex: 1 1 auto; min-width: 0; }
      .donut { display: block; }
      .bars { display: block; width: 100%; height: auto; }
      .legend { display: flex; gap: 16px; margin: 6px 0 10px; font-size: 11px; color: ${BAR_LABEL_COLOR}; }
      .legend-item { display: flex; align-items: center; gap: 5px; }
      .legend-swatch { width: 10px; height: 10px; border-radius: 2px; display: inline-block; }
      table.list { width: 100%; border-collapse: collapse; font-size: 12px; }
      table.list td, table.list th { border-bottom: 1px solid #ececec; padding: 5px 7px; text-align: left; }
      .col-head { font-weight: 600; color: ${BAR_LABEL_COLOR}; font-size: 11px; text-transform: uppercase; letter-spacing: 0.3px; border-bottom: 1px solid #d7d7d7; }
      .swatch-col { width: 18px; }
      .swatch { display: inline-block; width: 10px; height: 10px; border-radius: 2px; }
      .num { text-align: right; white-space: nowrap; }
      .empty { text-align: center; color: ${BAR_LABEL_COLOR}; padding: 14px 0; }
      .income { color: green; }
      .expense { color: red; }
      .appendix-heading { break-before: page; page-break-before: always; }
      table.appendix { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 11px; }
      table.appendix th, table.appendix td { border: 1px solid #ddd; padding: 5px 7px; text-align: left; }
      table.appendix th { background-color: #f2f2f2; font-weight: 600; }
      thead { display: table-header-group; }
      tr { break-inside: avoid; page-break-inside: avoid; }
    </style>
  </head>
  <body>
    <h1>WiseWallet Transaction Report</h1>
    <p class="range">${escapeHtml(rangeLabel)}</p>
    <p class="date">Generated on: ${escapeHtml(formatReportDate(new Date().toISOString()))}</p>
${buildTotalsHtml(totals, formatAmount)}
    <div class="charts">
      <div class="donut-col">
${buildDonutSvg(buckets)}
      </div>
      <div class="list-col">
${buildCategoryListHtml(buckets, formatAmount)}
      </div>
    </div>
    <h2>Monthly Trend</h2>
    <div class="legend">
      <span class="legend-item"><span class="legend-swatch" style="background-color: ${INCOME_CHART_COLOR}"></span>Income</span>
      <span class="legend-item"><span class="legend-swatch" style="background-color: ${EXPENSE_CHART_COLOR}"></span>Expense</span>
    </div>
${buildBarChartSvg(transactions, formatAmount)}
${buildAppendixHtml(transactions, formatAmount)}
  </body>
</html>`;
};
