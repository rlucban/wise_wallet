import { Dimensions } from "react-native";
import { Card, Text } from "react-native-paper";
import { PieChart } from "react-native-chart-kit";
import { Transaction } from "../types";

const PAYMENT_COLORS: Record<string, string> = {
  cash: "#4CAF50",
  card: "#2196F3",
  bank_transfer: "#9C27B0",
  e_wallet: "#FF9800",
};

export function PaymentMethodChart({ transactions }: { transactions: Transaction[] }) {
  const screenWidth = Dimensions.get("window").width;

  const expenses = transactions.filter((t) => t.type === "expense");
  
  if (expenses.length === 0) return null;

  // Group by payment method
  const dataMap = expenses.reduce((acc, curr) => {
    const method = curr.paymentMethod || "cash";
    if (!acc[method]) acc[method] = 0;
    acc[method] += curr.amount || 0;
    return acc;
  }, {} as Record<string, number>);

  const data = Object.keys(dataMap).map((method) => ({
    name: method.charAt(0).toUpperCase() + method.slice(1).replace("_", " "),
    population: dataMap[method],
    color: PAYMENT_COLORS[method.toLowerCase()] || "#" + Math.floor(Math.random()*16777215).toString(16), // Fallback to random color
    legendFontColor: "#7F7F7F",
    legendFontSize: 12,
  }));

  if (data.length === 0) return null;

  return (
    <Card style={{ margin: 16, marginTop: 8 }}>
      <Card.Content>
        <Text variant="titleMedium" style={{ marginBottom: 8 }}>Payment Methods</Text>
        <PieChart
          data={data}
          width={screenWidth - 64}
          height={180}
          chartConfig={{
            backgroundColor: "#fff",
            backgroundGradientFrom: "#fff",
            backgroundGradientTo: "#fff",
            color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
          }}
          accessor={"population"}
          backgroundColor={"transparent"}
          paddingLeft={"15"}
          center={[10, 0]}
          absolute
        />
      </Card.Content>
    </Card>
  );
}
