import type { Transaction } from "../types";

export const MANILA_UTC_OFFSET_HOURS = 8;

export const MONTH_ABBREVIATIONS = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
] as const;

export const REPORT_PALETTE = [
    "#1B3F7A",
    "#2E86C1",
    "#7D3C98",
    "#16A085",
    "#B9770E",
    "#C05621",
    "#5D6D7E",
] as const;

export const OTHER_COLOR = "#9AA0A6";
export const OTHER_LABEL = "Other";

export const INCOME_CHART_COLOR = "#10b981";
export const EXPENSE_CHART_COLOR = "#ef4444";

export const MAX_CATEGORY_BUCKETS = 7;

export const DONUT_RADIUS = 78;
export const DONUT_STROKE_WIDTH = 30;

export const UNCATEGORIZED_LABEL = "Uncategorized";

export interface CategoryBucket {
    name: string;
    expense: number;
    income: number;
    total: number;
    color: string;
}

export interface DonutSegment {
    dasharray: string;
    dashoffset: number;
    color: string;
}

export interface MonthBucket {
    key: string;
    label: string;
    year: number;
    income: number;
    expense: number;
}

export interface BarRect {
    x: number;
    y: number;
    width: number;
    height: number;
    color: string;
}

export interface BarChartGroup {
    x: number;
    width: number;
    label: string;
    key: string;
}

export interface BarChartGridline {
    y: number;
    value: number;
}

export interface BarChartResult {
    rects: BarRect[];
    groups: BarChartGroup[];
    gridlines: BarChartGridline[];
    maxValue: number;
    baselineY: number;
    plotHeight: number;
}

export interface BarChartPlot {
    width: number;
    height: number;
    padTop: number;
    padRight: number;
    padBottom: number;
    padLeft: number;
}

export const DEFAULT_BAR_PLOT: BarChartPlot = {
    width: 640,
    height: 220,
    padTop: 16,
    padRight: 12,
    padBottom: 28,
    padLeft: 56,
};

const round3 = (value: number): number => Number(value.toFixed(3));

const INCOME_GROUP_OFFSET = 0.2;
const EXPENSE_GROUP_OFFSET = 0.52;
const MAX_BAR_WIDTH = 14;
const BAR_GROUP_RATIO = 0.3;

export const toManilaDate = (iso: string): Date | null => {
    const epochMs = new Date(iso).getTime();
    if (Number.isNaN(epochMs)) return null;
    return new Date(epochMs + MANILA_UTC_OFFSET_HOURS * 60 * 60 * 1000);
};

export const formatReportMonth = (
    iso: string
): { key: string; label: string; year: number } | null => {
    const manila = toManilaDate(iso);
    if (!manila) return null;

    const year = manila.getUTCFullYear();
    const monthIndex = manila.getUTCMonth();

    return {
        key: `${year}-${String(monthIndex + 1).padStart(2, "0")}`,
        label: MONTH_ABBREVIATIONS[monthIndex],
        year,
    };
};

export const rollUpCategories = (transactions: Transaction[]): CategoryBucket[] => {
    const totals = new Map<string, { expense: number; income: number }>();

    for (const transaction of transactions) {
        const name = transaction.category?.name || UNCATEGORIZED_LABEL;
        const amount = transaction.amount || 0;
        const current = totals.get(name) ?? { expense: 0, income: 0 };

        if (transaction.type === "income") current.income += amount;
        else if (transaction.type === "expense") current.expense += amount;

        totals.set(name, current);
    }

    const ranked = [...totals.entries()]
        .map(([name, value]) => ({
            name,
            expense: value.expense,
            income: value.income,
            total: value.expense + value.income,
        }))
        .sort((a, b) => (b.total - a.total) || a.name.localeCompare(b.name));

    const shown: CategoryBucket[] = ranked.slice(0, MAX_CATEGORY_BUCKETS).map((bucket, index) => ({
        ...bucket,
        color: REPORT_PALETTE[index],
    }));

    const rest = ranked.slice(MAX_CATEGORY_BUCKETS);
    if (rest.length > 0) {
        shown.push({
            name: OTHER_LABEL,
            expense: rest.reduce((sum, bucket) => sum + bucket.expense, 0),
            income: rest.reduce((sum, bucket) => sum + bucket.income, 0),
            total: rest.reduce((sum, bucket) => sum + bucket.total, 0),
            color: OTHER_COLOR,
        });
    }

    return shown;
};

export const buildDonutSegments = (
    buckets: CategoryBucket[],
    radius: number = DONUT_RADIUS
): DonutSegment[] => {
    const grandTotal = buckets.reduce((sum, bucket) => sum + bucket.total, 0);
    if (grandTotal <= 0) return [];

    const circumference = 2 * Math.PI * radius;
    let consumed = 0;

    return buckets.map((bucket) => {
        const arc = (bucket.total / grandTotal) * circumference;
        const segment: DonutSegment = {
            dasharray: `${round3(arc)} ${round3(circumference)}`,
            dashoffset: round3(-consumed),
            color: bucket.color,
        };
        consumed += arc;
        return segment;
    });
};

export const bucketMonths = (transactions: Transaction[]): MonthBucket[] => {
    const totals = new Map<string, MonthBucket>();

    for (const transaction of transactions) {
        const month = formatReportMonth(transaction.date);
        if (!month) continue;

        const amount = transaction.amount || 0;
        const current = totals.get(month.key) ?? { ...month, income: 0, expense: 0 };

        if (transaction.type === "income") current.income += amount;
        else if (transaction.type === "expense") current.expense += amount;

        totals.set(month.key, current);
    }

    return [...totals.values()].sort((a, b) => a.key.localeCompare(b.key));
};

export const buildBarChart = (
    months: MonthBucket[],
    plot: BarChartPlot = DEFAULT_BAR_PLOT
): BarChartResult => {
    const plotLeft = plot.padLeft;
    const plotRight = plot.width - plot.padRight;
    const plotTop = plot.padTop;
    const baselineY = plot.height - plot.padBottom;
    const plotWidth = Math.max(plotRight - plotLeft, 0);
    const plotHeight = Math.max(baselineY - plotTop, 0);

    const maxValue = months.reduce(
        (max, month) => Math.max(max, month.income, month.expense),
        0
    );

    const groupWidth = months.length > 0 ? plotWidth / months.length : 0;
    const barWidth = Math.min(MAX_BAR_WIDTH, groupWidth * BAR_GROUP_RATIO);

    const rects: BarRect[] = [];
    const groups: BarChartGroup[] = [];

    months.forEach((month, index) => {
        const groupX = plotLeft + index * groupWidth;
        groups.push({ x: round3(groupX), width: round3(groupWidth), label: month.label, key: month.key });

        if (maxValue <= 0) return;

        const entries: { value: number; offset: number; color: string }[] = [
            { value: month.income, offset: INCOME_GROUP_OFFSET, color: INCOME_CHART_COLOR },
            { value: month.expense, offset: EXPENSE_GROUP_OFFSET, color: EXPENSE_CHART_COLOR },
        ];

        entries.forEach((entry) => {
            const value = entry.value > 0 ? entry.value : 0;
            const height = round3((value / maxValue) * plotHeight);

            rects.push({
                x: round3(groupX + groupWidth * entry.offset),
                y: round3(baselineY - height),
                width: round3(barWidth),
                height,
                color: entry.color,
            });
        });
    });

    const gridlines: BarChartGridline[] =
        maxValue > 0
            ? [
                  { y: round3(baselineY), value: 0 },
                  { y: round3(baselineY - plotHeight / 2), value: round3(maxValue / 2) },
                  { y: round3(plotTop), value: round3(maxValue) },
              ]
            : [];

    return {
        rects,
        groups,
        gridlines,
        maxValue: round3(maxValue),
        baselineY: round3(baselineY),
        plotHeight: round3(plotHeight),
    };
};
