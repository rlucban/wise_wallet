import { Dimensions } from "react-native";
import { Card, Text } from "react-native-paper";
import { DonutChart } from "./DonutChart";
import { useCurrency } from "../context/CurrencyContext";
import { Transaction } from "../types";

const PAYMENT_COLORS: Record<string, string> = {
  cash: "#4CAF50",
  card: "#2196F3",
  bank_transfer: "#9C27B0",
  e_wallet: "#FF9800",
};

export function PaymentMethodChart({ transactions }: { transactions: Transaction[] }) {
  const screenWidth = Dimensions.get("window").width;
  const { formatAmount } = useCurrency();

  const expenses = transactions.filter((t) => t.type === "expense");

  // Group by payment method
  const dataMap = expenses.reduce((acc, curr) => {
    const method = curr.paymentMethod || "cash";
    if (!acc[method]) acc[method] = 0;
    acc[method] += curr.amount || 0;
    return acc;
  }, {} as Record<string, number>);

  const segments = Object.keys(dataMap).map((method) => ({
    name: method.charAt(0).toUpperCase() + method.slice(1).replace("_", " "),
    value: dataMap[method],
    color: PAYMENT_COLORS[method.toLowerCase()] || "#607D8B",
  }));

  const total = segments.reduce((sum, s) => sum + s.value, 0);

  return (
    <Card style={{ margin: 16, marginTop: 8 }}>
      <Card.Content>
        <Text variant="titleMedium" style={{ marginBottom: 8 }}>Payment Methods</Text>
        <DonutChart
          data={segments}
          width={screenWidth - 64}
          height={180}
          formatValue={formatAmount}
          centerValue={formatAmount(total)}
          centerCaption="Spent"
          emptyMessage="No expense data for this period"
        />
      </Card.Content>
    </Card>
  );
}
