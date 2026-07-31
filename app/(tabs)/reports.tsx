import { useState, useCallback, useMemo } from "react";
import { View, ScrollView, Dimensions } from "react-native";
import { Appbar, Text, Card, useTheme, Button, Menu } from "react-native-paper";
import { useFocusEffect } from "expo-router";
import { PieChart } from "react-native-chart-kit";
import { useTransactions } from "../../hooks/useTransactions";
import { useCurrency } from "../../context/CurrencyContext";
import { PaymentMethodChart } from "../../components/PaymentMethodChart";
import { exportToCSV, exportToPDF } from "../../utils/exportUtils";
import { isWithinInterval, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear } from "date-fns";

export default function ReportsScreen() {
  const theme = useTheme();
  const { transactions = [], refetch } = useTransactions();
  const { formatAmount } = useCurrency();
  const screenWidth = Dimensions.get("window").width;

  const [period, setPeriod] = useState<"weekly" | "monthly" | "annually" | "all">("monthly");
  const [menuVisible, setMenuVisible] = useState(false);

  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [refetch])
  );

  const filteredTransactions = useMemo(() => {
    const now = new Date();
    let start: Date, end: Date;

    switch (period) {
      case "weekly":
        start = startOfWeek(now);
        end = endOfWeek(now);
        break;
      case "monthly":
        start = startOfMonth(now);
        end = endOfMonth(now);
        break;
      case "annually":
        start = startOfYear(now);
        end = endOfYear(now);
        break;
      default:
        return transactions;
    }

    return transactions.filter(t => {
      const d = new Date(t.date);
      return isWithinInterval(d, { start, end });
    });
  }, [transactions, period]);
  const income = filteredTransactions.filter(t => t.type === "income").reduce((sum, t) => sum + (t.amount || 0), 0);
  const expense = filteredTransactions.filter(t => t.type === "expense").reduce((sum, t) => sum + (t.amount || 0), 0);

  const pieData = [
    {
      name: "Income",
      population: income,
      color: theme.colors.primary,
      legendFontColor: theme.colors.onSurfaceVariant,
      legendFontSize: 12
    },
    {
      name: "Expense",
      population: expense,
      color: theme.colors.error,
      legendFontColor: theme.colors.onSurfaceVariant,
      legendFontSize: 12
    }
  ];

  // Group by category for Category Pie Chart
  const categoryDataMap = filteredTransactions
    .filter(t => t.type === "expense")
    .reduce((acc: Record<string, number>, t) => {
      const cat = t.category?.name || "Uncategorized";
      acc[cat] = (acc[cat] || 0) + t.amount;
      return acc;
    }, {});

  const CATEGORY_COLORS = [
    theme.colors.primary, theme.colors.error, theme.colors.tertiary,
    theme.colors.secondary, theme.colors.onSurfaceVariant, theme.colors.outline,
  ];
  const categoryPieData = Object.keys(categoryDataMap).map((cat, i) => ({
    name: cat,
    population: categoryDataMap[cat],
    color: CATEGORY_COLORS[i % CATEGORY_COLORS.length],
    legendFontColor: theme.colors.onSurfaceVariant,
    legendFontSize: 11
  }));

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <Appbar.Header style={{ backgroundColor: theme.colors.background, elevation: 0 }}>
        <Appbar.Content title="Financial Reports" titleStyle={{ fontWeight: "700" }} />
        <Menu
          visible={menuVisible}
          onDismiss={() => setMenuVisible(false)}
          anchor={
            <Button 
                mode="outlined" 
                onPress={() => setMenuVisible(true)} 
                icon="calendar-range"
                style={{ marginRight: 8 }}
            >
              {period.toUpperCase()}
            </Button>
          }
        >
          <Menu.Item onPress={() => { setPeriod("weekly"); setMenuVisible(false); }} title="Weekly" />
          <Menu.Item onPress={() => { setPeriod("monthly"); setMenuVisible(false); }} title="Monthly" />
          <Menu.Item onPress={() => { setPeriod("annually"); setMenuVisible(false); }} title="Annually" />
          <Menu.Item onPress={() => { setPeriod("all"); setMenuVisible(false); }} title="All Time" />
        </Menu>
      </Appbar.Header>

      <ScrollView contentContainerStyle={{ padding: 16 }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 16 }}>
          <Card style={{ flex: 1, marginRight: 8, backgroundColor: theme.colors.primaryContainer }}>
            <Card.Content>
              <Text variant="labelSmall" style={{ color: theme.colors.onPrimaryContainer }}>Total Income</Text>
              <Text variant="titleLarge" style={{ color: theme.colors.onPrimaryContainer, fontWeight: "700" }}>{formatAmount(income)}</Text>
            </Card.Content>
          </Card>
          <Card style={{ flex: 1, marginLeft: 8, backgroundColor: theme.colors.errorContainer }}>
            <Card.Content>
              <Text variant="labelSmall" style={{ color: theme.colors.onErrorContainer }}>Total Expense</Text>
              <Text variant="titleLarge" style={{ color: theme.colors.onErrorContainer, fontWeight: "700" }}>{formatAmount(expense)}</Text>
            </Card.Content>
          </Card>
        </View>

        <Card style={{ marginBottom: 16 }}>
          <Card.Content>
            <Text variant="titleMedium" style={{ marginBottom: 16, fontWeight: "700" }}>Income vs Expense</Text>
            {income === 0 && expense === 0 ? (
                <View style={{ height: 200, justifyContent: "center", alignItems: "center" }}>
                    <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>No data for this period</Text>
                </View>
            ) : (
                <PieChart
                    data={pieData}
                    width={screenWidth - 64}
                    height={200}
                    chartConfig={{
                        color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
                    }}
                    accessor={"population"}
                    backgroundColor={"transparent"}
                    paddingLeft={"15"}
                    center={[10, 0]}
                    absolute
                />
            )}
          </Card.Content>
        </Card>

        {categoryPieData.length > 0 && (
          <Card style={{ marginBottom: 16 }}>
            <Card.Content>
              <Text variant="titleMedium" style={{ marginBottom: 16, fontWeight: "700" }}>Expense by Category</Text>
              <PieChart
                data={categoryPieData}
                width={screenWidth - 64}
                height={200}
                chartConfig={{
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
        )}

        <Card style={{ marginBottom: 16 }}>
          <Card.Content>
            <Text variant="titleMedium" style={{ marginBottom: 12, fontWeight: "700" }}>Export Data</Text>
            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginBottom: 16 }}>
              Download your transaction history for the selected period.
            </Text>
            <View style={{ flexDirection: "row", gap: 12 }}>
              <Button
                mode="contained-tonal"
                icon="file-excel"
                onPress={() => exportToCSV(filteredTransactions)}
                style={{ flex: 1 }}
              >
                CSV
              </Button>
              <Button
                mode="contained-tonal"
                icon="file-pdf-box"
                onPress={() => exportToPDF(filteredTransactions, formatAmount)}
                style={{ flex: 1 }}
              >
                PDF
              </Button>
            </View>
          </Card.Content>
        </Card>

        <PaymentMethodChart transactions={filteredTransactions} />
      </ScrollView>
    </View>
  );
}
