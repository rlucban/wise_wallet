import fs from "fs";
import path from "path";
import type { Transaction } from "../types";
import {
    buildBarChart,
    buildDonutSegments,
    bucketMonths,
    DEFAULT_BAR_PLOT,
    DONUT_RADIUS,
    EXPENSE_CHART_COLOR,
    formatReportMonth,
    INCOME_CHART_COLOR,
    MANILA_UTC_OFFSET_HOURS,
    MAX_CATEGORY_BUCKETS,
    MONTH_ABBREVIATIONS,
    OTHER_COLOR,
    OTHER_LABEL,
    REPORT_PALETTE,
    rollUpCategories,
    toManilaDate,
    type CategoryBucket,
} from "./reportCharts";

const CHARTS_PATH = path.resolve(__dirname, "reportCharts.ts");

const makeTransaction = (overrides: Partial<Transaction> = {}): Transaction => ({
    id: "tx-1",
    amount: 100,
    date: "2025-10-15T02:30:00.000Z",
    type: "expense",
    updatedAt: 1,
    ...overrides,
});

const tx = (
    name: string,
    type: "income" | "expense",
    amount: number,
    date = "2025-10-15T02:30:00.000Z"
): Transaction =>
    makeTransaction({
        category: { id: `cat-${name}`, name, type, updatedAt: 1 },
        type,
        amount,
        date,
    });

const bucket = (name: string, total: number, color = "#000000"): CategoryBucket => ({
    name,
    expense: total,
    income: 0,
    total,
    color,
});

const COORDINATE = /^-?\d+(\.\d{1,3})?$/;

// ACC-01 — the constants the rest of the report is built on.
describe("reportCharts constants (ACC-01)", () => {
    it("pins the Manila offset to a whole-hour +08:00", () => {
        expect(MANILA_UTC_OFFSET_HOURS).toBe(8);
    });

    it("uses a fixed 12-month abbreviation table", () => {
        expect(MONTH_ABBREVIATIONS).toHaveLength(12);
        expect(MONTH_ABBREVIATIONS[0]).toBe("Jan");
        expect(MONTH_ABBREVIATIONS[11]).toBe("Dec");
    });

    it("caps the category list at seven buckets", () => {
        expect(MAX_CATEGORY_BUCKETS).toBe(7);
    });

    it("returns null for an unparseable date instead of NaN parts", () => {
        expect(toManilaDate("nope")).toBeNull();
        expect(formatReportMonth("nope")).toBeNull();
    });
});

// ACC-04 — palette integrity, which is what keeps hue from meaning two things (CON-03).
describe("palette (ACC-04)", () => {
    it("has exactly seven categorical colors", () => {
        expect(REPORT_PALETTE).toHaveLength(7);
    });

    it("leads with the app primary so the largest category ties to the brand", () => {
        expect(REPORT_PALETTE[0]).toBe("#1B3F7A");
    });

    it("never reuses the bar chart's income or expense color", () => {
        expect(REPORT_PALETTE).not.toContain(EXPENSE_CHART_COLOR);
        expect(REPORT_PALETTE).not.toContain(INCOME_CHART_COLOR);
        expect(REPORT_PALETTE).not.toContain("#ef4444");
        expect(REPORT_PALETTE).not.toContain("#10b981");
    });

    it("keeps every color pairwise distinct, Other included", () => {
        const all = [...REPORT_PALETTE, OTHER_COLOR];

        expect(new Set(all).size).toBe(all.length);
    });

    it("uses a neutral grey for Other", () => {
        expect(OTHER_COLOR).toBe("#9AA0A6");
        expect(OTHER_LABEL).toBe("Other");
    });
});

// ACC-03 — top 7 + Other rollup.
describe("rollUpCategories (ACC-03)", () => {
    it("keys buckets by category name, matching the on-screen grouping", () => {
        const buckets = rollUpCategories([tx("Food", "expense", 100), tx("Food", "expense", 50)]);

        expect(buckets).toHaveLength(1);
        expect(buckets[0].name).toBe("Food");
        expect(buckets[0].expense).toBe(150);
    });

    it("substitutes Uncategorized for a transaction with no category", () => {
        const buckets = rollUpCategories([makeTransaction({ amount: 10 })]);

        expect(buckets[0].name).toBe("Uncategorized");
    });

    it("keeps one bucket for a name that has both income and expense", () => {
        const buckets = rollUpCategories([
            tx("Shared", "expense", 100),
            tx("Shared", "income", 400),
        ]);

        expect(buckets).toHaveLength(1);
        expect(buckets[0]).toMatchObject({ name: "Shared", expense: 100, income: 400, total: 500 });
    });

    it("sorts by total descending", () => {
        const buckets = rollUpCategories([
            tx("Small", "expense", 10),
            tx("Big", "expense", 500),
            tx("Medium", "expense", 100),
        ]);

        expect(buckets.map((entry) => entry.name)).toEqual(["Big", "Medium", "Small"]);
    });

    it("breaks ties by name ascending so the output is deterministic", () => {
        const buckets = rollUpCategories([
            tx("Zebra", "expense", 100),
            tx("Alpha", "expense", 100),
            tx("Mango", "expense", 100),
        ]);

        expect(buckets.map((entry) => entry.name)).toEqual(["Alpha", "Mango", "Zebra"]);
    });

    it("produces no Other bucket when there are seven or fewer names", () => {
        const names = ["A", "B", "C", "D", "E", "F", "G"];
        const buckets = rollUpCategories(names.map((name) => tx(name, "expense", 10)));

        expect(buckets).toHaveLength(7);
        expect(buckets.map((entry) => entry.name)).not.toContain(OTHER_LABEL);
    });

    it("rolls a twelfth category into Other", () => {
        const names = "ABCDEFGHIJKL".split("");
        const buckets = rollUpCategories(names.map((name) => tx(name, "expense", 10)));

        expect(buckets).toHaveLength(8);
        expect(buckets[7].name).toBe(OTHER_LABEL);
        expect(buckets[7].total).toBe(50);
    });

    it("conserves the total across the shown buckets and Other", () => {
        const names = "ABCDEFGHIJKL".split("");
        const transactions = names.map((name, index) =>
            tx(name, "expense", (index + 1) * 10)
        );
        const expected = transactions.reduce((sum, entry) => sum + entry.amount, 0);

        const buckets = rollUpCategories(transactions);
        const carried = buckets.reduce((sum, entry) => sum + entry.total, 0);

        expect(carried).toBe(expected);
    });

    it("assigns palette colors by rank and reserves grey for Other", () => {
        const names = "ABCDEFGHIJKL".split("");
        const buckets = rollUpCategories(names.map((name) => tx(name, "expense", 10)));

        expect(buckets.slice(0, 7).map((entry) => entry.color)).toEqual([...REPORT_PALETTE]);
        expect(buckets[7].color).toBe(OTHER_COLOR);
    });

    it("sums both types into the Other bucket", () => {
        const big = "ABCDEFG".split("");
        const buckets = rollUpCategories([
            ...big.map((name) => tx(name, "expense", 1000)),
            tx("H", "income", 999),
            tx("I", "expense", 111),
        ]);

        expect(buckets).toHaveLength(8);
        expect(buckets[7]).toMatchObject({ name: OTHER_LABEL, income: 999, expense: 111 });
    });

    it("returns nothing for an empty transaction list", () => {
        expect(rollUpCategories([])).toEqual([]);
    });
});

// ACC-02 — donut arc geometry.
describe("buildDonutSegments (ACC-02)", () => {
    const buckets = [bucket("A", 50, "#111111"), bucket("B", 30, "#222222"), bucket("C", 20, "#333333")];
    const segments = buildDonutSegments(buckets);
    const circumference = 2 * Math.PI * DONUT_RADIUS;

    const arcOf = (segment: { dasharray: string }) => Number(segment.dasharray.split(" ")[0]);

    it("emits one segment per bucket", () => {
        expect(segments).toHaveLength(3);
    });

    it("weights each segment by its share of the total", () => {
        expect(arcOf(segments[0]) / circumference).toBeCloseTo(0.5, 3);
        expect(arcOf(segments[1]) / circumference).toBeCloseTo(0.3, 3);
        expect(arcOf(segments[2]) / circumference).toBeCloseTo(0.2, 3);
    });

    it("draws arcs that sum to the full circumference", () => {
        const drawn = segments.reduce((sum, segment) => sum + arcOf(segment), 0);

        expect(drawn).toBeCloseTo(circumference, 2);
    });

    it("pads every dasharray with the full circumference so arcs do not repeat", () => {
        segments.forEach((segment) => {
            expect(segment.dasharray).toBe(
                `${arcOf(segment)} ${Number(circumference.toFixed(3))}`
            );
        });
    });

    it("accumulates the dashoffset so segments do not overlap", () => {
        expect(segments[0].dashoffset).toBe(0);
        expect(segments[1].dashoffset).toBe(-arcOf(segments[0]));
        expect(segments[2].dashoffset).toBeCloseTo(-(arcOf(segments[0]) + arcOf(segments[1])), 2);
    });

    it("keeps every dashoffset finite", () => {
        segments.forEach((segment) => {
            expect(Number.isFinite(segment.dashoffset)).toBe(true);
        });
    });

    it("carries the bucket color through unchanged", () => {
        expect(segments.map((segment) => segment.color)).toEqual(["#111111", "#222222", "#333333"]);
    });

    it("renders a single bucket as a full ring without a special case", () => {
        const single = buildDonutSegments([bucket("Only", 100)]);

        expect(single).toHaveLength(1);
        expect(arcOf(single[0])).toBeCloseTo(circumference, 2);
    });

    it("emits nothing when there is no data to draw", () => {
        expect(buildDonutSegments([])).toEqual([]);
        expect(buildDonutSegments([bucket("Zero", 0)])).toEqual([]);
    });

    it("renders a zero-weight bucket as a zero-length arc, leaving the rest proportional", () => {
        const mixed = buildDonutSegments([
            bucket("Zero", 0),
            bucket("Half", 50),
            bucket("Rest", 50),
        ]);

        expect(mixed).toHaveLength(3);
        expect(arcOf(mixed[0])).toBe(0);
        expect(arcOf(mixed[1]) / circumference).toBeCloseTo(0.5, 3);
    });
});

// ACC-05 — Manila month bucketing.
describe("bucketMonths (ACC-05)", () => {
    it("buckets a post-midnight UTC instant as the Manila month", () => {
        const months = bucketMonths([makeTransaction({ date: "2025-12-31T16:30:00.000Z" })]);

        expect(months[0].key).toBe("2026-01");
        expect(months[0].label).toBe("Jan");
        expect(months[0].year).toBe(2026);
    });

    it("buckets a pre-midnight UTC instant as the previous month", () => {
        const months = bucketMonths([makeTransaction({ date: "2025-12-31T15:59:59.999Z" })]);

        expect(months[0].key).toBe("2025-12");
    });

    it("orders months oldest first regardless of input order", () => {
        const months = bucketMonths([
            tx("A", "expense", 10, "2025-03-05T04:00:00.000Z"),
            tx("B", "expense", 10, "2025-01-05T04:00:00.000Z"),
            tx("C", "expense", 10, "2025-02-05T04:00:00.000Z"),
        ]);

        expect(months.map((month) => month.key)).toEqual(["2025-01", "2025-02", "2025-03"]);
    });

    it("omits months with no data instead of inserting empty bars", () => {
        const months = bucketMonths([
            tx("A", "expense", 10, "2025-01-05T04:00:00.000Z"),
            tx("B", "expense", 10, "2025-11-05T04:00:00.000Z"),
        ]);

        expect(months).toHaveLength(2);
    });

    it("keeps both types separate within a month", () => {
        const months = bucketMonths([
            tx("A", "income", 900, "2025-05-05T04:00:00.000Z"),
            tx("B", "expense", 250, "2025-05-20T04:00:00.000Z"),
        ]);

        expect(months[0]).toMatchObject({ key: "2025-05", income: 900, expense: 250 });
    });

    it("sums repeated transactions in the same month", () => {
        const months = bucketMonths([
            tx("A", "expense", 100, "2025-05-05T04:00:00.000Z"),
            tx("B", "expense", 250, "2025-05-20T04:00:00.000Z"),
        ]);

        expect(months[0].expense).toBe(350);
    });

    it("skips an unparseable date rather than producing a NaN key", () => {
        const months = bucketMonths([
            makeTransaction({ date: "nope" }),
            tx("A", "expense", 10, "2025-05-05T04:00:00.000Z"),
        ]);

        expect(months.map((month) => month.key)).toEqual(["2025-05"]);
    });

    it("returns nothing for an empty list", () => {
        expect(bucketMonths([])).toEqual([]);
    });
});

// ACC-06 — bar geometry.
describe("buildBarChart (ACC-06)", () => {
    const plot = DEFAULT_BAR_PLOT;
    const baselineY = plot.height - plot.padBottom;
    const plotHeight = plot.height - plot.padBottom - plot.padTop;

    const months = [
        { key: "2025-01", label: "Jan", year: 2025, income: 1000, expense: 400 },
        { key: "2025-02", label: "Feb", year: 2025, income: 0, expense: 800 },
    ];

    const chart = buildBarChart(months, plot);

    it("scales against the largest income or expense month", () => {
        expect(chart.maxValue).toBe(1000);
    });

    it("draws two bars per month, income then expense", () => {
        expect(chart.rects).toHaveLength(4);
    });

    it("places income before expense within a group", () => {
        expect(chart.rects[0].x).toBeLessThan(chart.rects[1].x);
        expect(chart.rects[2].x).toBeLessThan(chart.rects[3].x);
    });

    it("colors income and expense with the app's chart colors", () => {
        expect(chart.rects[0].color).toBe(INCOME_CHART_COLOR);
        expect(chart.rects[1].color).toBe(EXPENSE_CHART_COLOR);
    });

    it("anchors every bar to the shared baseline", () => {
        chart.rects.forEach((rect) => {
            expect(Number((rect.y + rect.height).toFixed(3))).toBe(baselineY);
        });
    });

    it("scales bar heights proportionally", () => {
        const janIncome = chart.rects[0];
        const febExpense = chart.rects[3];

        expect(janIncome.height).toBe(plotHeight);
        expect(febExpense.height).toBeCloseTo(plotHeight * 0.8, 1);
    });

    it("emits a height of zero for a zero month rather than a negative or NaN", () => {
        const febIncome = chart.rects[2];

        expect(febIncome.height).toBe(0);
        expect(Number.isNaN(febIncome.height)).toBe(false);
    });

    it("keeps every coordinate a finite three-decimal number", () => {
        chart.rects.forEach((rect) => {
            [rect.x, rect.y, rect.width, rect.height].forEach((value) => {
                expect(String(value)).toMatch(COORDINATE);
                expect(Number.isFinite(value)).toBe(true);
            });
        });
    });

    it("caps the bar width so a single month does not become a slab", () => {
        const single = buildBarChart([months[0]], plot);

        expect(single.rects[0].width).toBe(14);
    });

    it("draws three gridlines when there is data", () => {
        expect(chart.gridlines).toHaveLength(3);
        expect(chart.gridlines[0].value).toBe(0);
        expect(chart.gridlines[2].value).toBe(1000);
    });

    it("emits no bars and no gridlines when every month is zero", () => {
        const zeroed = buildBarChart(
            [{ key: "2025-01", label: "Jan", year: 2025, income: 0, expense: 0 }],
            plot
        );

        expect(zeroed.rects).toEqual([]);
        expect(zeroed.gridlines).toEqual([]);
        expect(zeroed.maxValue).toBe(0);
    });

    it("handles an empty month list without dividing by zero", () => {
        const empty = buildBarChart([], plot);

        expect(empty.rects).toEqual([]);
        expect(empty.groups).toEqual([]);
        expect(empty.maxValue).toBe(0);
        expect(Number.isFinite(empty.baselineY)).toBe(true);
    });

    it("labels every group with its month abbreviation", () => {
        expect(chart.groups.map((group) => group.label)).toEqual(["Jan", "Feb"]);
    });
});

// ACC-10 / CON-19 — the module must stay pure, deterministic, and platform-free.
describe("module boundaries (ACC-10, CON-19)", () => {
    const source = fs.readFileSync(CHARTS_PATH, "utf8");

    it("imports nothing from react-native or any expo module", () => {
        expect(source).not.toMatch(/from\s+["']react-native["']/);
        expect(source).not.toMatch(/from\s+["']expo-/);
        expect(source).not.toContain("react-native-svg");
    });

    it("brings in the Transaction type with a type-only import", () => {
        expect(source).toMatch(/import type \{[^}]*Transaction[^}]*\} from ["']\.\.\/types["']/);
    });

    it("contains no Platform branch", () => {
        expect(source).not.toContain("Platform");
    });

    it("uses no locale-dependent or nondeterministic source", () => {
        expect(source).not.toContain("Intl");
        expect(source).not.toContain("toLocaleDateString");
        expect(source).not.toContain("Math.random");
        expect(source).not.toContain("Date.now");
    });

    it("rounds emitted geometry so float noise cannot reach the document", () => {
        expect(source).toContain("toFixed(3)");
    });
});
