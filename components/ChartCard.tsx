import { Dimensions } from "react-native";
import { Card, Text } from "react-native-paper";
import { PieChart } from "react-native-chart-kit";
import { Transaction } from "../types";

export function ChartCard({ transactions }: { transactions: Transaction[] }) {
  const screenWidth = Dimensions.get("window").width;

  const expenses = transactions.filter((t) => t.type === "expense");
  
  if (expenses.length === 0) return null;

  // Group by category
  const dataMap = expenses.reduce((acc, curr) => {
    const cat = curr.category?.name || "Uncategorized";
    if (!acc[cat]) acc[cat] = 0;
    acc[cat] += curr.amount;
    return acc;
  }, {} as Record<string, number>);

  const colors = [
    "#e74c3c", "#f1c40f", "#3498db", "#9b59b6", "#2ecc71", "#e67e22"
  ];

  const data = Object.keys(dataMap).map((name, index) => ({
    name,
    population: dataMap[name],
    color: colors[index % colors.length],
    legendFontColor: "#7F7F7F",
    legendFontSize: 12,
  }));

  return (
    <Card style={{ margin: 16, marginTop: 8 }}>
      <Card.Content>
        <Text variant="titleMedium" style={{ marginBottom: 8 }}>Expenses Breakdown</Text>
        <PieChart
          data={data}
          width={screenWidth - 64}
          height={200}
          chartConfig={{
            backgroundColor: "#1cc910",
            backgroundGradientFrom: "#eff3ff",
            backgroundGradientTo: "#efefef",
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
