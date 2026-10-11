import fs from "fs";
import path from "path";
import type { Transaction } from "../types";

let mockOS: "android" | "ios" | "web" = "android";
let mockDocs: string | null = "file:///docs/";
let mockCache: string | null = "file:///cache/";

jest.mock("react-native", () => ({
    Platform: {
        get OS() {
            return mockOS;
        },
    },
}));

jest.mock("expo-print", () => ({
    printToFileAsync: jest.fn(),
    printAsync: jest.fn(),
}));

jest.mock("expo-sharing", () => ({
    shareAsync: jest.fn(),
}));

jest.mock("expo-file-system/legacy", () => ({
    get documentDirectory() {
        return mockDocs;
    },
    get cacheDirectory() {
        return mockCache;
    },
    deleteAsync: jest.fn(),
    copyAsync: jest.fn(),
    writeAsStringAsync: jest.fn(),
}));

import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import * as FileSystem from "expo-file-system/legacy";
import { exportToCSV, exportToPDF, shareSavedReport } from "./exportUtils";
import { buildReportFileName, buildReportHtml } from "./reportFormat";

const printToFileAsync = Print.printToFileAsync as unknown as jest.Mock;
const printAsync = Print.printAsync as unknown as jest.Mock;
const shareAsync = Sharing.shareAsync as unknown as jest.Mock;
const deleteAsync = FileSystem.deleteAsync as unknown as jest.Mock;
const copyAsync = FileSystem.copyAsync as unknown as jest.Mock;
const writeAsStringAsync = FileSystem.writeAsStringAsync as unknown as jest.Mock;

const EXPORT_UTILS_PATH = path.resolve(__dirname, "exportUtils.ts");
const REPORT_FORMAT_PATH = path.resolve(__dirname, "reportFormat.ts");
const REPORTS_SCREEN_PATH = path.resolve(__dirname, "../app/(tabs)/reports.tsx");

const formatAmount = (amount: number) => `₱${amount.toFixed(2)}`;

const makeTransaction = (overrides: Partial<Transaction> = {}): Transaction => ({
    id: "tx-1",
    amount: 100,
    date: "2025-10-15T02:30:00.000Z",
    type: "expense",
    updatedAt: 1,
    ...overrides,
});

const transactions = [makeTransaction()];

beforeEach(() => {
    jest.resetAllMocks();
    jest.spyOn(console, "error").mockImplementation(() => undefined);
    mockOS = "android";
    mockDocs = "file:///docs/";
    mockCache = "file:///cache/";
});

describe.each(["android", "ios", "web"])("export delivery (%s)", (os) => {
    beforeEach(() => {
        mockOS = os as typeof mockOS;
    });

    describe("exportToPDF", () => {
        it("native success saves silently, resolves the saved uri, and opens no sheet (ACC-02)", async () => {
            if (os === "web") return;
            printToFileAsync.mockResolvedValue({ uri: "file:///cache/print-1.pdf" });
            deleteAsync.mockResolvedValue(undefined);
            copyAsync.mockResolvedValue(undefined);

            const saved = await exportToPDF(transactions, formatAmount, "Oct 2025");

            const expectedUri = `file:///docs/${buildReportFileName("Oct 2025")}`;
            expect(saved).toBe(expectedUri);
            expect(copyAsync).toHaveBeenCalledWith({
                from: "file:///cache/print-1.pdf",
                to: expectedUri,
            });
            expect(shareAsync).not.toHaveBeenCalled();
            expect(printAsync).not.toHaveBeenCalled();
        });

        it("native write failure falls back to share, then print only if share rejects (ACC-03)", async () => {
            if (os === "web") return;
            printToFileAsync.mockResolvedValue({ uri: "file:///cache/print-2.pdf" });
            deleteAsync.mockResolvedValue(undefined);
            copyAsync.mockRejectedValue(new Error("isn't readable"));

            shareAsync.mockResolvedValue(undefined);
            const first = await exportToPDF(transactions, formatAmount, "Oct 2025");
            expect(first).toBeNull();
            expect(shareAsync).toHaveBeenCalledTimes(1);
            expect(printAsync).not.toHaveBeenCalled();

            jest.resetAllMocks();
            printToFileAsync.mockResolvedValue({ uri: "file:///cache/print-3.pdf" });
            deleteAsync.mockResolvedValue(undefined);
            copyAsync.mockRejectedValue(new Error("isn't readable"));
            shareAsync.mockRejectedValue(new Error("no share"));
            printAsync.mockResolvedValue(undefined);

            const second = await exportToPDF(transactions, formatAmount, "Oct 2025");
            expect(second).toBeNull();
            expect(shareAsync).toHaveBeenCalledTimes(1);
            expect(printAsync).toHaveBeenCalledTimes(1);
        });

        it("native total failure rethrows to the caller dialog (ACC-03)", async () => {
            if (os === "web") return;
            printToFileAsync.mockRejectedValue(new Error("print exploded"));

            await expect(exportToPDF(transactions, formatAmount, "Oct 2025")).rejects.toThrow(
                "print exploded"
            );
            expect(shareAsync).not.toHaveBeenCalled();
        });

        it("web uses the print dialog only, never a blob/anchor or expo-print (ACC-01)", async () => {
            if (os !== "web") return;

            const frameDocument = {
                open: jest.fn(),
                write: jest.fn(),
                close: jest.fn(),
            };
            const frameWindow = {
                addEventListener: jest.fn(),
                focus: jest.fn(),
                print: jest.fn(),
                document: frameDocument,
            };
            const frame = {
                setAttribute: jest.fn(),
                style: {} as Record<string, string>,
                parentNode: null as unknown,
                contentWindow: frameWindow,
                contentDocument: frameDocument,
            };
            const body = {
                appendChild: jest.fn((node: unknown) => {
                    (node as { parentNode: unknown }).parentNode = body;
                }),
                removeChild: jest.fn(),
            };
            const createElement = jest.fn((tag: string) => {
                if (tag === "a") throw new Error("web PDF must not create an anchor download");
                return frame;
            });
            (globalThis as { document?: unknown }).document = { createElement, body };

            const result = await exportToPDF(transactions, formatAmount, "Oct 2025");

            expect(result).toBeNull();
            expect(createElement).toHaveBeenCalledWith("iframe");
            expect(frameWindow.print).toHaveBeenCalledTimes(1);
            expect(printToFileAsync).not.toHaveBeenCalled();
            expect(printAsync).not.toHaveBeenCalled();
            expect(shareAsync).not.toHaveBeenCalled();

            delete (globalThis as { document?: unknown }).document;
        });

        it("passes the untouched SPEC-34 html to the printer (ACC-04 freeze)", async () => {
            if (os === "web") return;
            printToFileAsync.mockResolvedValue({ uri: "file:///cache/print-4.pdf" });
            deleteAsync.mockResolvedValue(undefined);
            copyAsync.mockResolvedValue(undefined);

            await exportToPDF(transactions, formatAmount, "Oct 2025");

            expect(printToFileAsync).toHaveBeenCalledWith({
                html: buildReportHtml(transactions, formatAmount, "Oct 2025"),
            });
        });
    });

    describe("exportToCSV", () => {
        it("native success saves silently and opens no sheet (ACC-02 parity)", async () => {
            if (os === "web") return;
            writeAsStringAsync.mockResolvedValue(undefined);

            const saved = await exportToCSV(transactions);

            expect(saved).toMatch(/^file:\/\/\/docs\/WiseWallet_Export_\d{4}-\d{2}-\d{2}\.csv$/);
            expect(shareAsync).not.toHaveBeenCalled();
        });

        it("native write failure falls back to a cache share (ACC-03 parity)", async () => {
            if (os === "web") return;
            writeAsStringAsync.mockRejectedValueOnce(new Error("no docs"));
            writeAsStringAsync.mockResolvedValueOnce(undefined);
            shareAsync.mockResolvedValue(undefined);

            const saved = await exportToCSV(transactions);

            expect(saved).toBeNull();
            expect(writeAsStringAsync).toHaveBeenCalledTimes(2);
            expect(shareAsync).toHaveBeenCalledTimes(1);
        });

        it("native write failure rethrows when the fallback share also fails", async () => {
            if (os === "web") return;
            writeAsStringAsync.mockRejectedValue(new Error("no storage"));

            await expect(exportToCSV(transactions)).rejects.toThrow("no storage");
        });

        it("web keeps the blob-anchor download (unchanged)", async () => {
            if (os !== "web") return;
            const link = { setAttribute: jest.fn(), click: jest.fn() };
            const body = { appendChild: jest.fn(), removeChild: jest.fn() };
            const createElement = jest.fn(() => link);
            (globalThis as { document?: unknown }).document = { createElement, body };

            const result = await exportToCSV(transactions);

            expect(result).toBeNull();
            expect(link.setAttribute).toHaveBeenCalledWith("download", expect.stringMatching(/\.csv$/));
            expect(link.click).toHaveBeenCalledTimes(1);

            delete (globalThis as { document?: unknown }).document;
        });
    });
});

describe("shareSavedReport", () => {
    it("shares a PDF with mime + UTI and a CSV without UTI", async () => {
        shareAsync.mockResolvedValue(undefined);

        await shareSavedReport("file:///docs/report.pdf", "pdf");
        expect(shareAsync).toHaveBeenCalledWith(
            "file:///docs/report.pdf",
            expect.objectContaining({ mimeType: "application/pdf", UTI: "com.adobe.pdf" })
        );

        await shareSavedReport("file:///docs/data.csv", "csv");
        expect(shareAsync).toHaveBeenCalledWith(
            "file:///docs/data.csv",
            expect.objectContaining({ mimeType: "text/csv" })
        );
    });
});

describe("delivery source guards (ACC-01/04/05)", () => {
    const exportUtils = fs.readFileSync(EXPORT_UTILS_PATH, "utf8");
    const reportFormat = fs.readFileSync(REPORT_FORMAT_PATH, "utf8");
    const reportsScreen = fs.readFileSync(REPORTS_SCREEN_PATH, "utf8");

    it("keeps the format builders frozen and out of the delivery layer", () => {
        expect(reportFormat).toContain("export const buildReportHtml");
        expect(reportFormat).toContain("export const buildReportFileName");
        expect(exportUtils).not.toContain("reportCharts");
        expect(exportUtils).not.toContain("<svg");
    });

    it("does not create a PDF blob/anchor on the web path", () => {
        expect(exportUtils).not.toMatch(/application\/pdf[^\n]*blob/i);
        expect(exportUtils).not.toContain('download", buildReportFileName');
    });

    it("awaits every export call (no fire-and-forget)", () => {
        expect(reportsScreen).toContain("await exportToPDF(");
        expect(reportsScreen).toContain("await exportToCSV(");
        expect(reportsScreen).not.toContain("onPress={() => exportToCSV(");
    });
});
