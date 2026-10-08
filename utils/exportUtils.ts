import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import * as FileSystem from "expo-file-system/legacy";
import { Transaction } from "../types";
import { Platform } from "react-native";
import { buildCsvContent, buildReportFileName, buildReportHtml } from "./reportFormat";

const PDF_MIME_TYPE = "application/pdf";
const PDF_UTI = "com.adobe.pdf";
const PRINT_FRAME_CLEANUP_MS = 1000;

const requireDocumentDirectory = (): string => {
    const directory = FileSystem.documentDirectory;
    if (!directory) {
        throw new Error("Local file storage is unavailable on this device.");
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

export const exportToCSV = async (transactions: Transaction[]) => {
    const csvContent = buildCsvContent(transactions);
    const fileName = `WiseWallet_Export_${new Date().toISOString().slice(0, 10)}.csv`;

    if (Platform.OS === 'web') {
        const encodedUri = encodeURI("data:text/csv;charset=utf-8," + csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", fileName);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        return;
    }

    try {
        const fileUri = `${requireDocumentDirectory()}${fileName}`;
        await FileSystem.writeAsStringAsync(fileUri, csvContent, { encoding: "utf8" });
        await Sharing.shareAsync(fileUri);
    } catch (error) {
        console.error("Error exporting to CSV:", error);
        throw error;
    }
};

export const exportToPDF = async (
    transactions: Transaction[],
    formatAmount: (amount: number) => string,
    rangeLabel: string
) => {
    const htmlContent = buildReportHtml(transactions, formatAmount, rangeLabel);

    try {
        if (Platform.OS === "web") {
            printReportInIframe(htmlContent);
            return;
        }

        const result = await Print.printToFileAsync({ html: htmlContent });
        if (!result || !result.uri) return;

        let shareUri = result.uri;
        try {
            const reportUri = `${requireDocumentDirectory()}${buildReportFileName(rangeLabel)}`;
            await FileSystem.deleteAsync(reportUri, { idempotent: true });
            await FileSystem.copyAsync({ from: result.uri, to: reportUri });
            shareUri = reportUri;
        } catch (copyError) {
            if (process.env.EXPO_PUBLIC_ADMIN_TOGGLE === "true") {
                console.warn("Report copy unavailable, sharing print file directly:", copyError);
            }
        }
        try {
            await Sharing.shareAsync(shareUri, {
                mimeType: PDF_MIME_TYPE,
                UTI: PDF_UTI,
                dialogTitle: "Share transaction report",
            });
        } catch (shareError) {
            if (process.env.EXPO_PUBLIC_ADMIN_TOGGLE === "true") {
                console.warn("Report share unavailable, opening print dialog:", shareError);
            }
            await Print.printAsync({ html: htmlContent });
        }
    } catch (error) {
        console.error("Error exporting to PDF:", error);
        throw error;
    }
};
