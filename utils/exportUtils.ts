import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import * as FileSystem from "expo-file-system/legacy";
import { Transaction } from "../types";
import { Platform } from "react-native";

export const exportToCSV = async (transactions: Transaction[]) => {
    const header = "Date,Type,Category,Amount,Payment Method,Establishment,Note\n";
    const rows = transactions.map(t => {
        return `${new Date(t.date).toLocaleDateString()},${t.type},${t.category?.name || "Uncategorized"},${t.amount},${t.paymentMethod || ""},"${t.establishment || ""}","${t.note || ""}"`;
    }).join("\n");

    const csvContent = header + rows;
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

    const fileUri = `${FileSystem.documentDirectory}${fileName}`;

    try {
        await FileSystem.writeAsStringAsync(fileUri, csvContent, { encoding: FileSystem.EncodingType ? FileSystem.EncodingType.UTF8 : "utf8" as unknown as FileSystem.EncodingType });
        await Sharing.shareAsync(fileUri);
    } catch (error) {
        console.error("Error exporting to CSV:", error);
        throw error;
    }
};

export const exportToPDF = async (transactions: Transaction[], formatAmount: (amount: number) => string) => {
    const htmlRows = transactions.map(t => `
    <tr>
      <td>${new Date(t.date).toLocaleDateString()}</td>
      <td>${t.type}</td>
      <td>${t.category?.name || "Uncategorized"}</td>
      <td>${formatAmount(t.amount)}</td>
      <td>${t.paymentMethod || ""}</td>
    </tr>
  `).join("");

    const htmlContent = `
    <html>
      <head>
        <style>
          body { font-family: 'Helvetica', sans-serif; padding: 20px; }
          h1 { color: #6200ee; text-align: center; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          th { background-color: #f2f2f2; }
          .income { color: green; }
          .expense { color: red; }
        </style>
      </head>
      <body>
        <h1>WiseWallet Transaction Report</h1>
        <p>Generated on: ${new Date().toLocaleDateString()}</p>
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Type</th>
              <th>Category</th>
              <th>Amount</th>
              <th>Method</th>
            </tr>
          </thead>
          <tbody>
            ${htmlRows}
          </tbody>
        </table>
      </body>
    </html>
  `;

    try {
        const { uri } = await Print.printToFileAsync({ html: htmlContent });
        await Sharing.shareAsync(uri);
    } catch (error) {
        console.error("Error exporting to PDF:", error);
        throw error;
    }
};
