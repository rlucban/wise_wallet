import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import * as FileSystem from "expo-file-system/legacy";
import { Transaction } from "../types";
import { Platform } from "react-native";
import { buildCsvContent, buildReportFileName, buildReportHtml } from "./reportFormat";

const PDF_MIME_TYPE = "application/pdf";
const PDF_UTI = "com.adobe.pdf";
const PRINT_FRAME_CLEANUP_MS = 1000;

const warnIfAdmin = (message: string, error: unknown): void => {
    if (process.env.EXPO_PUBLIC_ADMIN_TOGGLE === "true") {
        console.warn(message, error);
    }
};

const requireDirectory = (directory: string | null, message: string): string => {
    if (!directory) {
        throw new Error(message);
    }
    return directory;
};

const printReportInIframe = (htmlContent: string): void => {
    const iframe = document.createElement("iframe");
    iframe.setAttribute("aria-hidden", "true");
    iframe.setAttribute("title", "Report print frame");
    iframe.style.position = "fixed";
    iframe.style.top = "0";
    iframe.style.left = "0";
    iframe.style.width = "0";
    iframe.style.height = "0";
    iframe.style.border = "0";
    document.body.appendChild(iframe);

    const removeFrame = () => {
        if (iframe.parentNode) iframe.parentNode.removeChild(iframe);
    };

    const frameWindow = iframe.contentWindow;
    if (!frameWindow) {
        removeFrame();
        throw new Error("Unable to open a print window for this report.");
    }

    frameWindow.addEventListener("afterprint", removeFrame, { once: true });

    const frameDocument = iframe.contentDocument ?? frameWindow.document;
    frameDocument.open();
    frameDocument.write(htmlContent);
    frameDocument.close();

    try {
        frameWindow.focus();
        frameWindow.print();
    } finally {
        setTimeout(removeFrame, PRINT_FRAME_CLEANUP_MS);
    }
};

export const shareSavedReport = async (uri: string, kind: "pdf" | "csv"): Promise<void> => {
    await Sharing.shareAsync(
        uri,
        kind === "pdf"
            ? { mimeType: PDF_MIME_TYPE, UTI: PDF_UTI, dialogTitle: "Share transaction report" }
            : { mimeType: "text/csv", dialogTitle: "Share transaction data" }
    );
};

export const exportToCSV = async (transactions: Transaction[]): Promise<string | null> => {
    const csvContent = buildCsvContent(transactions);
    const fileName = `WiseWallet_Export_${new Date().toISOString().slice(0, 10)}.csv`;

    if (Platform.OS === "web") {
        const encodedUri = encodeURI("data:text/csv;charset=utf-8," + csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", fileName);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        return null;
    }

    try {
        const fileUri = `${requireDirectory(
            FileSystem.documentDirectory,
            "Local file storage is unavailable on this device."
        )}${fileName}`;
        await FileSystem.writeAsStringAsync(fileUri, csvContent, { encoding: "utf8" });
        return fileUri;
    } catch (writeError) {
        warnIfAdmin("CSV save unavailable, sharing file directly:", writeError);
        try {
            const cacheUri = `${requireDirectory(
                FileSystem.cacheDirectory,
                "Local file storage is unavailable on this device."
            )}${fileName}`;
            await FileSystem.writeAsStringAsync(cacheUri, csvContent, { encoding: "utf8" });
            await Sharing.shareAsync(cacheUri, { mimeType: "text/csv", dialogTitle: "Share transaction data" });
            return null;
        } catch (fallbackError) {
            console.error("Error exporting to CSV:", fallbackError);
            throw fallbackError;
        }
    }
};

export const exportToPDF = async (
    transactions: Transaction[],
    formatAmount: (amount: number) => string,
    rangeLabel: string
): Promise<string | null> => {
    const htmlContent = buildReportHtml(transactions, formatAmount, rangeLabel);

    try {
        if (Platform.OS === "web") {
            printReportInIframe(htmlContent);
            return null;
        }

        const result = await Print.printToFileAsync({ html: htmlContent });
        if (!result || !result.uri) {
            throw new Error("The report could not be generated.");
        }

        try {
            const reportUri = `${requireDirectory(
                FileSystem.documentDirectory,
                "Local file storage is unavailable on this device."
            )}${buildReportFileName(rangeLabel)}`;
            await FileSystem.deleteAsync(reportUri, { idempotent: true });
            await FileSystem.copyAsync({ from: result.uri, to: reportUri });
            return reportUri;
        } catch (copyError) {
            warnIfAdmin("Report copy unavailable, sharing print file directly:", copyError);
        }

        try {
            await Sharing.shareAsync(result.uri, {
                mimeType: PDF_MIME_TYPE,
                UTI: PDF_UTI,
                dialogTitle: "Share transaction report",
            });
            return null;
        } catch (shareError) {
            warnIfAdmin("Report share unavailable, opening print dialog:", shareError);
        }

        await Print.printAsync({ html: htmlContent });
        return null;
    } catch (error) {
        console.error("Error exporting to PDF:", error);
        throw error;
    }
};
