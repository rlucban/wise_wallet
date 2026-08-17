import { useState, useCallback, useMemo } from "react";
import { View, ScrollView, Dimensions } from "react-native";
import { Appbar, Text, Card, useTheme, Button, Menu } from "react-native-paper";
import { useFocusEffect } from "expo-router";
import { useTransactions } from "../../hooks/useTransactions";
import { useCurrency } from "../../context/CurrencyContext";
import { DonutChart } from "../../components/DonutChart";
import { MonthlyTrendChart } from "../../components/MonthlyTrendChart";
import { PaymentMethodChart } from "../../components/PaymentMethodChart";
import { FinancialTip } from "../../components/FinancialTip";
import { exportToCSV, exportToPDF } from "../../utils/exportUtils";
import { getPeriodFinancialTips } from "../../utils/financialLiteracy";
import { isWithinInterval, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear, format, subMonths } from "date-fns";

const TREND_MONTHS = 6;

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

  // Monthly trend (last 6 months) for Income vs Expense bar chart
  const trend = useMemo(() => {
    const months = Array.from({ length: TREND_MONTHS }, (_, i) => {
      const d = subMonths(new Date(), TREND_MONTHS - 1 - i);
      return { key: format(d, "yyyy-MM"), label: format(d, "MMM") };
    });
    const indexByKey = new Map(months.map((m, i) => [m.key, i]));
    const incomeByMonth = new Array<number>(TREND_MONTHS).fill(0);
    const expenseByMonth = new Array<number>(TREND_MONTHS).fill(0);

    filteredTransactions.forEach((t) => {
      const idx = indexByKey.get(format(new Date(t.date), "yyyy-MM"));
      if (idx === undefined) return;
      if (t.type === "income") {
        incomeByMonth[idx] += t.amount || 0;
      } else {
        expenseByMonth[idx] += t.amount || 0;
      }
    });

    return {
      labels: months.map((m) => m.label),
      income: incomeByMonth,
      expense: expenseByMonth,
    };
  }, [filteredTransactions]);

  // Group by category for Category Donut Chart
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
  const categorySegments = Object.keys(categoryDataMap).map((cat, i) => ({
    name: cat,
    value: categoryDataMap[cat],
    color: CATEGORY_COLORS[i % CATEGORY_COLORS.length],
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

        <FinancialTip
          title="💡 Period Insight"
          dateBased={false}
          extraTips={getPeriodFinancialTips(period, income, expense, formatAmount)}
          showFooter={false}
          style={{ margin: 0, marginBottom: 16 }}
        />

        <Card style={{ marginBottom: 16 }}>
          <Card.Content>
            <Text variant="titleMedium" style={{ marginBottom: 16, fontWeight: "700" }}>Income vs Expense</Text>
            <DonutChart
              data={[
                { name: "Income", value: income, color: theme.colors.primary },
                { name: "Expense", value: expense, color: theme.colors.error },
              ]}
              width={screenWidth - 64}
              height={200}
              formatValue={formatAmount}
              centerValue={formatAmount(income - expense)}
              centerCaption="Net"
              emptyMessage="No data for this period"
              mutedColor={theme.colors.onSurfaceVariant}
              textColor={theme.colors.onSurface}
            />
          </Card.Content>
        </Card>

        <Card style={{ marginBottom: 16 }}>
          <Card.Content>
            <Text variant="titleMedium" style={{ marginBottom: 16, fontWeight: "700" }}>Monthly Income vs Expense</Text>
            <MonthlyTrendChart
              labels={trend.labels}
              income={trend.income}
              expense={trend.expense}
              width={screenWidth - 64}
              formatValue={formatAmount}
            />
          </Card.Content>
        </Card>

        <Card style={{ marginBottom: 16 }}>
          <Card.Content>
            <Text variant="titleMedium" style={{ marginBottom: 16, fontWeight: "700" }}>Expense by Category</Text>
            <DonutChart
              data={categorySegments}
              width={screenWidth - 64}
              height={200}
              formatValue={formatAmount}
              centerValue={formatAmount(expense)}
              centerCaption="Total Expenses"
              emptyMessage="No expenses recorded in this period"
              mutedColor={theme.colors.onSurfaceVariant}
              textColor={theme.colors.onSurface}
            />
          </Card.Content>
        </Card>

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
