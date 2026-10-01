import fs from "fs";
import path from "path";
import type { Category, Transaction } from "../types";
import {
    buildCsvContent,
    buildReportFileName,
    buildReportHtml,
    computeReportTotals,
    csvCell,
    escapeHtml,
    formatReportDate,
    MANILA_UTC_OFFSET_HOURS,
    REPORT_COLUMNS,
} from "./reportFormat";
import {
    EXPENSE_CHART_COLOR,
    INCOME_CHART_COLOR,
    REPORT_PALETTE,
    rollUpCategories,
} from "./reportCharts";

let mockOS: "android" | "ios" | "web" = "android";

jest.mock("react-native", () => ({
    Platform: {
        get OS() {
            return mockOS;
        },
    },
}));

const FORMAT_PATH = path.resolve(__dirname, "reportFormat.ts");
const EXPORT_UTILS_PATH = path.resolve(__dirname, "exportUtils.ts");

const formatAmount = (amount: number) => `₱${amount.toFixed(2)}`;

const makeCategory = (name: string): Category => ({
    id: "cat-1",
    name,
    type: "expense",
    updatedAt: 1,
});

const makeTransaction = (overrides: Partial<Transaction> = {}): Transaction => ({
    id: "tx-1",
    amount: 100,
    date: "2025-10-15T02:30:00.000Z",
    type: "expense",
    updatedAt: 1,
    ...overrides,
});

// Quote-aware RFC 4180 reader. Deliberately not a `split(",")`: ACC-03 is about proving that
// commas, quotes, and newlines inside a field do not break the column layout, so the parser
// has to honour quoting the same way a spreadsheet does.
const parseCsv = (input: string): string[][] => {
    const rows: string[][] = [];
    let row: string[] = [];
    let field = "";
    let inQuotes = false;

    for (let index = 0; index < input.length; index += 1) {
        const char = input[index];

        if (inQuotes) {
            if (char === '"') {
                if (input[index + 1] === '"') {
                    field += '"';
                    index += 1;
                } else {
                    inQuotes = false;
                }
            } else {
                field += char;
            }
            continue;
        }

        if (char === '"') {
            inQuotes = true;
        } else if (char === ",") {
            row.push(field);
            field = "";
        } else if (char === "\n") {
            row.push(field);
            rows.push(row);
            row = [];
            field = "";
        } else {
            field += char;
        }
    }

    if (field !== "" || row.length > 0) {
        row.push(field);
        rows.push(row);
    }

    return rows;
};

const extractTh = (html: string): string[] => {
    const start = html.indexOf("<thead>");
    const head = html.slice(start, html.indexOf("</thead>"));
    return [...head.matchAll(/<th>([\s\S]*?)<\/th>/g)].map((match) => match[1]);
};

const INJECTION = `<script>alert(1)</script> & "quotes" 'apos'`;

const injectionFixture = (): Transaction[] => [
    makeTransaction({
        id: "tx-inject",
        type: "expense",
        category: makeCategory(INJECTION),
        paymentMethod: INJECTION,
        establishment: INJECTION,
        note: INJECTION,
    }),
];

// ACC-01 — literal values for every export the deliverable names.
describe("reportFormat exports (ACC-01)", () => {
    it("exports the seven columns in the agreed order", () => {
        expect(REPORT_COLUMNS).toEqual([
            "Date",
            "Type",
            "Category",
            "Amount",
            "Payment Method",
            "Establishment",
            "Note",
        ]);
    });

    it("pins the Manila offset to a whole-hour +08:00", () => {
        expect(MANILA_UTC_OFFSET_HOURS).toBe(8);
    });

    it("escapes each HTML metacharacter exactly once", () => {
        expect(escapeHtml("&")).toBe("&amp;");
        expect(escapeHtml("<")).toBe("&lt;");
        expect(escapeHtml(">")).toBe("&gt;");
        expect(escapeHtml('"')).toBe("&quot;");
        expect(escapeHtml("'")).toBe("&#39;");
    });

    it("escapes a mixed string and leaves ordinary text alone", () => {
        expect(escapeHtml(INJECTION)).toBe(
            "&lt;script&gt;alert(1)&lt;/script&gt; &amp; &quot;quotes&quot; &#39;apos&#39;"
        );
        expect(escapeHtml("Jollibee, Taguig")).toBe("Jollibee, Taguig");
    });

    it("renders null and undefined as an empty string", () => {
        expect(escapeHtml(null)).toBe("");
        expect(escapeHtml(undefined)).toBe("");
        expect(escapeHtml("")).toBe("");
    });

    it("stringifies non-string values rather than throwing", () => {
        expect(escapeHtml(0)).toBe("0");
        expect(escapeHtml(1234.5)).toBe("1234.5");
        expect(escapeHtml(false)).toBe("false");
    });

    it("wraps every csvCell in quotes and doubles embedded quotes", () => {
        expect(csvCell("plain")).toBe('"plain"');
        expect(csvCell('say "hi"')).toBe('"say ""hi"""');
        expect(csvCell("a,b")).toBe('"a,b"');
        expect(csvCell("line1\nline2")).toBe('"line1\nline2"');
    });

    it("emits an empty quoted cell for null and undefined", () => {
        expect(csvCell(null)).toBe('""');
        expect(csvCell(undefined)).toBe('""');
        expect(csvCell(0)).toBe('"0"');
    });

    it("sums income, expense, and net from the type field", () => {
        const totals = computeReportTotals([
            makeTransaction({ type: "income", amount: 5000 }),
            makeTransaction({ type: "expense", amount: 1234.5 }),
            makeTransaction({ type: "expense", amount: 65.5 }),
        ]);

        expect(totals).toEqual({ income: 5000, expense: 1300, net: 3700 });
    });

    it("returns zeroed totals for an empty array", () => {
        expect(computeReportTotals([])).toEqual({ income: 0, expense: 0, net: 0 });
    });

    it("reports a negative net when expense exceeds income", () => {
        const totals = computeReportTotals([
            makeTransaction({ type: "income", amount: 100 }),
            makeTransaction({ type: "expense", amount: 250 }),
        ]);

        expect(totals.net).toBe(-150);
    });

    it("treats a missing amount as zero instead of NaN", () => {
        const totals = computeReportTotals([
            makeTransaction({ type: "expense", amount: undefined as unknown as number }),
        ]);

        expect(totals).toEqual({ income: 0, expense: 0, net: 0 });
    });

    it("slugs the range label into a meaningful file name", () => {
        expect(buildReportFileName("Oct 01 - Oct 31, 2025")).toBe(
            "WiseWallet_Report_Oct-01-Oct-31-2025.pdf"
        );
    });

    it("falls back to a readable slug when the label has no alphanumerics", () => {
        expect(buildReportFileName("   ")).toBe("WiseWallet_Report_All-Transactions.pdf");
        expect(buildReportFileName("***")).toBe("WiseWallet_Report_All-Transactions.pdf");
    });

    it("never lets path separators or traversal reach the file name", () => {
        expect(buildReportFileName("../../etc/passwd")).toBe(
            "WiseWallet_Report_etc-passwd.pdf"
        );
    });
});

// ACC-02 — no un-escaped markup from any supplied field reaches the document.
describe("buildReportHtml escaping (ACC-02)", () => {
    const html = buildReportHtml(injectionFixture(), formatAmount, "Oct 01 - Oct 31, 2025");

    it("escapes the injected script tag", () => {
        expect(html).toContain("&lt;script&gt;alert(1)&lt;/script&gt;");
    });

    it("contains no literal script tag from the transaction data", () => {
        expect(html).not.toContain("<script>");
    });

    it("escapes the ampersand and both quote styles", () => {
        expect(html).toContain("&amp; &quot;quotes&quot; &#39;apos&#39;");
        expect(html).not.toContain('"quotes"');
    });

    it("escapes the range label too, since it reaches the document as well", () => {
        const labelled = buildReportHtml(
            injectionFixture(),
            formatAmount,
            `<b>Oct</b> & "more"`
        );

        expect(labelled).toContain("&lt;b&gt;Oct&lt;/b&gt; &amp; &quot;more&quot;");
        expect(labelled).not.toContain("<b>Oct</b>");
    });
});

// ACC-03 — RFC 4180 quoting keeps the column layout intact.
describe("buildCsvContent quoting (ACC-03)", () => {
    it("emits a seven-field header row", () => {
        const rows = parseCsv(buildCsvContent([]));

        expect(rows).toHaveLength(1);
        expect(rows[0]).toHaveLength(7);
    });

    it("keeps seven fields per row when a note holds a comma, quotes, and a newline", () => {
        const transactions = [
            makeTransaction({ note: 'Lunch, "team" meeting\nsecond line' }),
            makeTransaction({ id: "tx-2", establishment: "Mall of Asia, Level 3" }),
        ];

        const rows = parseCsv(buildCsvContent(transactions));

        expect(rows).toHaveLength(3);
        rows.forEach((row) => expect(row).toHaveLength(7));
    });

    it("round-trips the embedded punctuation through a quote-aware read", () => {
        const note = 'Lunch, "team" meeting\nsecond line';
        const rows = parseCsv(buildCsvContent([makeTransaction({ note })]));

        expect(rows[1][6]).toBe(note);
    });

    it("round-trips a value made only of quotes", () => {
        const single = '"';
        const quadruple = '""""';

        const singleRows = parseCsv(buildCsvContent([makeTransaction({ establishment: single })]));
        const quadrupleRows = parseCsv(
            buildCsvContent([makeTransaction({ establishment: quadruple })])
        );

        expect(singleRows[1][5]).toBe(single);
        expect(quadrupleRows[1][5]).toBe(quadruple);
    });

    it("doubles a lone quote into the four-character field a spreadsheet expects", () => {
        const [header, row] = buildCsvContent([makeTransaction({ establishment: '"' })]).split("\n");

        expect(row.split(",")[5]).toBe('"' + '""' + '"');
        expect(header.split(",")[0]).toBe('"Date"');
    });

    it("substitutes Uncategorized when a transaction has no category", () => {
        const rows = parseCsv(buildCsvContent([makeTransaction({ category: undefined })]));

        expect(rows[1][2]).toBe("Uncategorized");
    });

    it("emits empty cells for absent optional fields rather than undefined", () => {
        const rows = parseCsv(
            buildCsvContent([
                makeTransaction({ paymentMethod: undefined, establishment: undefined, note: undefined }),
            ])
        );

        expect(rows[1].slice(4)).toEqual(["", "", ""]);
    });

    it("keeps a zero amount as 0 rather than an empty cell", () => {
        const rows = parseCsv(buildCsvContent([makeTransaction({ amount: 0 })]));

        expect(rows[1][3]).toBe("0");
    });
});

// ACC-04 — deterministic Asia/Manila dates on inputs that straddle Manila midnight.
describe("formatReportDate (ACC-04)", () => {
    it("rolls forward at 16:30Z, which is already 00:30 in Manila", () => {
        expect(formatReportDate("2025-12-31T16:30:00.000Z")).toBe("01/01/2026");
    });

    it("rolls forward at 17:00Z, the exact Manila midnight boundary", () => {
        expect(formatReportDate("2025-12-31T17:00:00.000Z")).toBe("01/01/2026");
    });

    it("stays on the previous day one millisecond before that boundary", () => {
        expect(formatReportDate("2025-12-31T15:59:59.999Z")).toBe("12/31/2025");
    });

    it("zero-pads month and day to a fixed MM/DD/YYYY shape", () => {
        expect(formatReportDate("2025-01-05T04:00:00.000Z")).toBe("01/05/2025");
        expect(formatReportDate("2025-11-30T20:00:00.000Z")).toBe("12/01/2025");
    });

    it("does not drift for an afternoon UTC time on the same calendar day", () => {
        expect(formatReportDate("2025-10-15T02:30:00.000Z")).toBe("10/15/2025");
    });

    it("returns an empty string for an unparseable date", () => {
        expect(formatReportDate("not-a-date")).toBe("");
    });

    it("embeds the same Manila date in the PDF rows and the CSV column", () => {
        const transactions = [
            makeTransaction({ date: "2025-12-31T16:30:00.000Z", type: "income", amount: 10 }),
            makeTransaction({ id: "tx-2", date: "2025-12-31T15:59:59.999Z", type: "expense", amount: 20 }),
        ];

        const html = buildReportHtml(transactions, formatAmount, "Dec 2025");
        const csvRows = parseCsv(buildCsvContent(transactions));

        expect(html).toContain("<td>01/01/2026</td>");
        expect(html).toContain("<td>12/31/2025</td>");
        expect(csvRows[1][0]).toBe("01/01/2026");
        expect(csvRows[2][0]).toBe("12/31/2025");
    });

    it("uses the same formatter for the Generated on line", () => {
        const html = buildReportHtml([], formatAmount, "Dec 2025");
        const generatedOn = html.match(/Generated on: ([0-9/]+)</);

        expect(generatedOn).not.toBeNull();
        expect(formatReportDate(new Date().toISOString())).toBe(generatedOn?.[1]);
    });
});

// ACC-06 — the document states its range, its totals, and its own styling contract.
describe("buildReportHtml content (ACC-06)", () => {
    const transactions = [
        makeTransaction({ type: "income", amount: 5000, category: makeCategory("Salary") }),
        makeTransaction({
            id: "tx-2",
            type: "expense",
            amount: 1250,
            establishment: "Jollibee",
            note: "lunch",
        }),
    ];
    const html = buildReportHtml(transactions, formatAmount, "Oct 01 - Oct 31, 2025");

    it("states the selected range", () => {
        expect(html).toContain("Oct 01 - Oct 31, 2025");
    });

    it("renders the three totals through the injected formatter", () => {
        expect(html).toContain("Total Income");
        expect(html).toContain("Total Expense");
        expect(html).toContain("Net");
        expect(html).toContain("+₱5000.00");
        expect(html).toContain("-₱1250.00");
        expect(html).toContain("+₱3750.00");
    });

    it("gives the net a negative sign and expense tone when the period is in the red", () => {
        const losing = buildReportHtml(
            [makeTransaction({ type: "expense", amount: 200 })],
            formatAmount,
            "Oct 2025"
        );

        expect(losing).toContain("-₱200.00");
        expect(losing).toContain('<span class="stat-value expense">-₱200.00</span>');
    });

    it("applies a class to every data row so the colour CSS is not dead", () => {
        expect(html).toContain('<tr class="income">');
        expect(html).toContain('<tr class="expense">');
    });

    it("keeps the named income and expense colours", () => {
        expect(html).toContain(".income { color: green; }");
        expect(html).toContain(".expense { color: red; }");
    });

    it("asks the print engine to keep backgrounds and text colours", () => {
        expect(html).toContain("print-color-adjust: exact");
        expect(html).toContain("-webkit-print-color-adjust: exact");
    });

    it("repeats the header on each page and avoids splitting a row", () => {
        expect(html).toContain("display: table-header-group");
        expect(html).toContain("break-inside: avoid");
    });

    it("uses the app primary colour for the heading and never the old purple", () => {
        expect(html).toContain("#1B3F7A");
        expect(html).not.toContain("#6200ee");
    });

    it("leaves the font family exactly as it was", () => {
        expect(html).toContain(
            "font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif"
        );
    });

    it("emits the same seven headers as the CSV", () => {
        expect(extractTh(html)).toEqual([...REPORT_COLUMNS]);
        expect(parseCsv(buildCsvContent(transactions))[0]).toEqual([...REPORT_COLUMNS]);
    });

    it("renders the amount column through the injected formatter", () => {
        expect(html).toContain("<td>₱5000.00</td>");
    });

    it("escapes the formatted amount as well, since a formatter can emit markup", () => {
        const markup = buildReportHtml(
            [makeTransaction({ amount: 1 })],
            () => "<b>1</b>",
            "Oct 2025"
        );

        expect(markup).toContain("&lt;b&gt;1&lt;/b&gt;");
        expect(markup).not.toContain("<b>1</b>");
    });
});

// CON-20 — an empty period must not print a bare header.
describe("empty period (CON-20)", () => {
    const html = buildReportHtml([], formatAmount, "Oct 01 - Oct 31, 2025");

    it("keeps the header row", () => {
        expect(extractTh(html)).toEqual([...REPORT_COLUMNS]);
    });

    it("keeps the summary block with zeroed totals", () => {
        expect(html).toContain("Total Income");
        expect(html).toContain("+₱0.00");
    });

    it("renders exactly one full-width row with the agreed copy", () => {
        expect(html).toContain('<td colspan="7">No transactions in this period.</td>');
        expect(html.match(/colspan="7"/g)).toHaveLength(1);
    });

    it("renders no income or expense data rows", () => {
        expect(html).not.toContain('<tr class="income">');
        expect(html).not.toContain('<tr class="expense">');
    });

    it("emits the header line only in the CSV", () => {
        const rows = parseCsv(buildCsvContent([]));

        expect(rows).toHaveLength(1);
        expect(rows[0]).toEqual([...REPORT_COLUMNS]);
    });
});

// ACC-05 — source-text guards. The module's platform-invariance is the reason one
// unparameterised run is valid for Android, iOS, and Web, so it is asserted, not assumed.
describe("module boundaries (ACC-05, CON-13)", () => {
    const source = fs.readFileSync(FORMAT_PATH, "utf8");

    it("imports nothing from react-native or any expo module", () => {
        expect(source).not.toMatch(/from\s+["']react-native["']/);
        expect(source).not.toMatch(/from\s+["']expo-print["']/);
        expect(source).not.toMatch(/from\s+["']expo-sharing["']/);
        expect(source).not.toMatch(/from\s+["']expo-file-system/);
    });

    it("contains no Platform.OS branch", () => {
        expect(source).not.toContain("Platform.OS");
        expect(source).not.toContain("Platform.");
    });

    it("brings in the Transaction type with a type-only import", () => {
        expect(source).toMatch(/import type \{[^}]*Transaction[^}]*\} from ["']\.\.\/types["']/);
        expect(source).not.toMatch(/^import \{[^}]*Transaction/m);
    });

    it("does not reach for the device locale or timezone", () => {
        expect(source).not.toContain("toLocaleDateString");
        expect(source).not.toContain("Intl");
        expect(source).not.toContain("getTimezoneOffset");
    });

    it("keeps the iframe and document usage inside the web branch of exportUtils", () => {
        const exportUtils = fs.readFileSync(EXPORT_UTILS_PATH, "utf8");

        expect(exportUtils).toContain('Platform.OS === "web"');
        expect(exportUtils).not.toMatch(/document\.body\.innerHTML/);
        expect(exportUtils).not.toMatch(/Print\.printAsync/);
    });
});

// §1.10 / DEC-13 — the outputs must be byte-identical on all three platforms, which is what
// lets ACC-01..ACC-06 run once instead of per-platform.
describe("platform invariance", () => {
    const transactions = [
        makeTransaction({ type: "income", amount: 5000 }),
        makeTransaction({ id: "tx-2", type: "expense", amount: 1250, note: 'a, "b"' }),
    ];

    const PLATFORMS: ("android" | "ios" | "web")[] = ["android", "ios", "web"];

    it("produces the same HTML and CSV on android, ios, and web", () => {
        const rendered = PLATFORMS.map((os) => {
            mockOS = os;
            return {
                os,
                html: buildReportHtml(transactions, formatAmount, "Oct 2025"),
                csv: buildCsvContent(transactions),
            };
        });

        expect(rendered[1].html).toBe(rendered[0].html);
        expect(rendered[2].html).toBe(rendered[0].html);
        expect(rendered[1].csv).toBe(rendered[0].csv);
        expect(rendered[2].csv).toBe(rendered[0].csv);
    });

    it("produces the same Manila dates on all three platforms", () => {
        const dates = PLATFORMS.map((os) => {
            mockOS = os;
            return formatReportDate("2025-12-31T16:30:00.000Z");
        });

        expect(dates).toEqual(["01/01/2026", "01/01/2026", "01/01/2026"]);
    });
});

// ACC-02 / ACC-06 — the summary is charts, not a table.
describe("summary composition (ACC-02, ACC-06)", () => {
    const transactions = [
        makeTransaction({ type: "income", amount: 5000, category: makeCategory("Salary") }),
        makeTransaction({
            id: "tx-2",
            type: "expense",
            amount: 1250,
            category: makeCategory("Food"),
            establishment: "Jollibee",
            note: "lunch",
        }),
        makeTransaction({
            id: "tx-3",
            type: "expense",
            amount: 300,
            category: makeCategory("Transport"),
            date: "2025-11-04T02:30:00.000Z",
        }),
    ];
    const html = buildReportHtml(transactions, formatAmount, "Oct 01 - Nov 30, 2025");

    it("draws the donut as stroked circles, not wedge paths", () => {
        expect(html).toContain("<circle");
        expect(html).toContain("stroke-dasharray=");
        expect(html).toContain("rotate(-90");
    });

    it("does not rely on pathLength, which fails silently when unsupported", () => {
        expect(html).not.toContain("pathLength");
    });

    it("uses butt caps so adjacent slices do not overlap", () => {
        expect(html).toContain('stroke-linecap="butt"');
    });

    it("emits one circle per category in the rollup", () => {
        const rollup = rollUpCategories(transactions);

        expect(rollup).toHaveLength(3);
        expect(html.match(/<circle/g)).toHaveLength(3);
    });

    it("draws two bars per month across the period", () => {
        expect(html).toContain("Monthly Trend");
        expect(html.match(/<rect/g)?.length).toBeGreaterThanOrEqual(4);
    });

    it("labels the bar chart months with the fixed abbreviations", () => {
        expect(html).toContain(">Oct<");
        expect(html).toContain(">Nov<");
    });

    it("keys the bar chart and legend off the app's income and expense colors", () => {
        expect(html).toContain(`background-color: ${INCOME_CHART_COLOR}`);
        expect(html).toContain(`background-color: ${EXPENSE_CHART_COLOR}`);
    });

    it("keeps the three totals in a strip above the charts", () => {
        expect(html).toContain('class="stats"');
        expect(html).toContain("Total Income");
        expect(html).toContain("Total Expense");
    });

    it("gives the summary one row per category, with expense and income columns", () => {
        expect(html).toContain('class="list"');
        expect(html).toContain(">Category<");
        expect(html).toContain(">Expense<");
        expect(html).toContain(">Income<");
        expect(html).toContain(">Net<");
    });

    it("shows a swatch for every category row so the donut and list agree", () => {
        const swatches = html.match(/class="swatch"/g) || [];

        expect(swatches).toHaveLength(3);
        expect(html).toContain(`background-color: ${REPORT_PALETTE[0]}`);
    });

    it("never paints a category swatch with the bar chart's income or expense color", () => {
        const swatchColors = [...html.matchAll(/class="swatch" style="background-color: (#\w+)"/g)].map(
            (match) => match[1]
        );

        swatchColors.forEach((color) => {
            expect(color).not.toBe(INCOME_CHART_COLOR);
            expect(color).not.toBe(EXPENSE_CHART_COLOR);
        });
    });

    it("keeps expense and income as separate amounts on one row", () => {
        expect(html).toContain('<td class="num">₱5000.00</td>');
        expect(html).toContain('<td class="num">₱1250.00</td>');
    });
});

// ACC-07 — user text reaching the charts.
describe("chart text escaping (ACC-07)", () => {
    const html = buildReportHtml(injectionFixture(), formatAmount, "Oct 2025");

    it("escapes a category name in the list row", () => {
        expect(html).toContain("&lt;script&gt;alert(1)&lt;/script&gt;");
    });

    it("emits no literal script tag from any chart or list text", () => {
        expect(html).not.toContain("<script>");
    });

    it("escapes the y-axis amount labels", () => {
        const markup = buildReportHtml(
            [makeTransaction({ amount: 100 })],
            () => "<b>x</b>",
            "Oct 2025"
        );

        expect(markup).toContain("&lt;b&gt;x&lt;/b&gt;");
        expect(markup).not.toContain("<b>x</b>");
    });

    it("interpolates no user text into an SVG attribute", () => {
        const svgBlocks = [...html.matchAll(/<svg[\s\S]*?<\/svg>/g)].map((match) => match[0]);

        expect(svgBlocks.length).toBeGreaterThan(0);
        svgBlocks.forEach((block) => {
            expect(block).not.toContain(INJECTION);
            expect(block).not.toContain("<script>");
        });
    });
});

// ACC-08 — the appendix keeps the CSV's seven fields, on its own page.
describe("appendix parity (ACC-08)", () => {
    const transactions = [
        makeTransaction({ type: "income", amount: 5000, category: makeCategory("Salary") }),
        makeTransaction({ id: "tx-2", type: "expense", amount: 1250, note: "lunch" }),
    ];
    const html = buildReportHtml(transactions, formatAmount, "Oct 2025");

    it("keeps the same seven headers as the CSV, in the same order", () => {
        expect(extractTh(html)).toEqual([...REPORT_COLUMNS]);
        expect(parseCsv(buildCsvContent(transactions))[0]).toEqual([...REPORT_COLUMNS]);
    });

    it("starts the appendix on a new page", () => {
        expect(html).toContain("break-before: page");
        expect(html).toContain("Transaction Details");
    });

    it("repeats the header on each page and never splits a row", () => {
        expect(html).toContain("display: table-header-group");
        expect(html).toContain("break-inside: avoid");
    });

    it("still lists every transaction, with its note", () => {
        expect(html).toContain("Transaction Details");
        expect(html).toContain("<td>lunch</td>");
        expect(html.match(/<tr class="(income|expense)">/g)).toHaveLength(2);
    });
});

// ACC-18 / CON-18 — the empty period still renders a complete, valid document.
describe("empty period charts (CON-18)", () => {
    const html = buildReportHtml([], formatAmount, "Oct 01 - Oct 31, 2025");

    it("draws no donut slice", () => {
        expect(html).not.toContain("<circle");
    });

    it("draws no bar", () => {
        expect(html).not.toMatch(/<rect[^>]*fill="#(10b981|ef4444)"/);
    });

    it("shows an empty-state message in both chart frames", () => {
        const emptyStates = html.match(/No transactions in this period\./g) || [];

        expect(emptyStates.length).toBeGreaterThanOrEqual(3);
    });

    it("shows an empty-state row in the category list", () => {
        expect(html).toContain('<td class="empty" colspan="5">');
    });

    it("keeps the appendix header with a single full-width row", () => {
        expect(extractTh(html)).toEqual([...REPORT_COLUMNS]);
        expect(html).toContain('<td colspan="7">No transactions in this period.</td>');
    });

    it("emits no NaN anywhere in the document", () => {
        expect(html).not.toContain("NaN");
        expect(html).not.toContain("undefined");
    });
});
