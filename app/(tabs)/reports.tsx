import { useState, useCallback, useMemo } from "react";
import { View, ScrollView, Dimensions, TouchableOpacity } from "react-native";
import { Appbar, Text, useTheme, Menu } from "react-native-paper";
import { useFocusEffect } from "expo-router";
import { useTransactions } from "../../hooks/useTransactions";
import { useCurrency } from "../../context/CurrencyContext";
import { DonutChart } from "../../components/DonutChart";
import { MonthlyTrendChart } from "../../components/MonthlyTrendChart";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import { exportToCSV, exportToPDF } from "../../utils/exportUtils";
import { isWithinInterval, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear, format, subMonths, addMonths, addWeeks, subWeeks } from "date-fns";

const TREND_MONTHS = 6;

const EXPENSE_COLORS = ["#DC2626", "#F97316", "#F59E0B", "#EF4444", "#B91C1C", "#EA580C"];
const INCOME_COLORS = ["#16A34A", "#10B981", "#059669", "#22C55E", "#047857", "#34D399"];

const renderCategoryIcon = (name?: string): string => {
  const n = (name || "").toLowerCase();
  if (n.includes("food") || n.includes("mcdo")) return "silverware-fork-knife";
  if (n.includes("shop")) return "cart-outline";
  if (n.includes("bill") || n.includes("utility")) return "receipt";
  if (n.includes("transport")) return "car-outline";
  if (n.includes("entertain")) return "movie-open";
  if (n.includes("freelance") || n.includes("salary")) return "cash";
  if (n.includes("utang") || n.includes("john")) return "account-outline";
  return "cash";
};

type Period = "weekly" | "monthly" | "annually";

const PERIOD_LABELS: Record<Period, string> = {
  weekly: "Weekly",
  monthly: "Monthly",
  annually: "Yearly",
};

const CARD_SHADOW = {
  shadowColor: "#000",
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.06,
  shadowRadius: 4,
  elevation: 3,
};

export default function ReportsScreen() {
  const theme = useTheme();
  const { transactions = [], refetch } = useTransactions();
  const { formatAmount } = useCurrency();
  const screenWidth = Dimensions.get("window").width;

  const [period, setPeriod] = useState<Period>("monthly");
  const [menuVisible, setMenuVisible] = useState(false);
  const [offsetDate, setOffsetDate] = useState(new Date());

  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [refetch])
  );

  const currentRange = useMemo(() => {
    let start: Date, end: Date;
    switch (period) {
      case "weekly":
        start = startOfWeek(offsetDate, { weekStartsOn: 1 });
        end = endOfWeek(offsetDate, { weekStartsOn: 1 });
        break;
      case "annually": {
        start = startOfYear(offsetDate);
        end = endOfYear(offsetDate);
        break;
      }
      default: {
        start = startOfMonth(offsetDate);
        end = endOfMonth(offsetDate);
        break;
      }
    }
    return { start, end, label: `${format(start, "MMM dd")} - ${format(end, "MMM dd, yyyy")}` };
  }, [period, offsetDate]);

  const filteredTransactions = useMemo(() => {
    return transactions.filter((t) => {
      const d = new Date(t.date);
      return isWithinInterval(d, { start: currentRange.start, end: currentRange.end });
    });
  }, [transactions, currentRange]);

  const income = useMemo(
    () => filteredTransactions.filter((t) => t.type === "income").reduce((sum, t) => sum + (t.amount || 0), 0),
    [filteredTransactions]
  );
  const expense = useMemo(
    () => filteredTransactions.filter((t) => t.type === "expense").reduce((sum, t) => sum + (t.amount || 0), 0),
    [filteredTransactions]
  );
  const net = income - expense;

  // Combined donut segments: expense categories + income categories
  const combinedSegments = useMemo(() => {
    const expMap: Record<string, number> = {};
    const incMap: Record<string, number> = {};

    filteredTransactions.forEach((t) => {
      const cat = t.category?.name || "Uncategorized";
      if (t.type === "expense") {
        expMap[cat] = (expMap[cat] || 0) + t.amount;
      } else {
        incMap[cat] = (incMap[cat] || 0) + t.amount;
      }
    });

    const segments: { name: string; value: number; color: string; type: "expense" | "income" }[] = [];

    Object.keys(expMap).forEach((cat, i) => {
      segments.push({ name: cat, value: expMap[cat], color: EXPENSE_COLORS[i % EXPENSE_COLORS.length], type: "expense" });
    });

    Object.keys(incMap).forEach((cat, i) => {
      segments.push({ name: cat, value: incMap[cat], color: INCOME_COLORS[i % INCOME_COLORS.length], type: "income" });
    });

    return segments;
  }, [filteredTransactions]);

  const donutData = useMemo(() => {
    return combinedSegments.map((s) => ({ name: `${s.name} (${s.type === "expense" ? "Exp" : "Inc"})`, value: s.value, color: s.color }));
  }, [combinedSegments]);

  // Separate breakdowns
  const expenseBreakdown = useMemo(() => {
    return combinedSegments
      .filter((s) => s.type === "expense")
      .sort((a, b) => b.value - a.value);
  }, [combinedSegments]);

  const incomeBreakdown = useMemo(() => {
    return combinedSegments
      .filter((s) => s.type === "income")
      .sort((a, b) => b.value - a.value);
  }, [combinedSegments]);

  const totalAll = expense + income;

  const trend = useMemo(() => {
    const base = offsetDate;
    const months = Array.from({ length: TREND_MONTHS }, (_, i) => {
      const d = subMonths(base, TREND_MONTHS - 1 - i);
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
  }, [filteredTransactions, offsetDate]);

  const shiftPeriod = useCallback((direction: "left" | "right") => {
    const delta = direction === "left" ? -1 : 1;
    setOffsetDate((prev) => {
      switch (period) {
        case "weekly":
          return delta > 0 ? addWeeks(prev, 1) : subWeeks(prev, 1);
        case "annually":
          return new Date(prev.getFullYear() + delta, prev.getMonth(), prev.getDate());
        default:
          return delta > 0 ? addMonths(prev, 1) : subMonths(prev, 1);
      }
    });
  }, [period]);

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <Appbar.Header style={{ backgroundColor: theme.colors.background, elevation: 0 }}>
        <Appbar.Content title="Reports" titleStyle={{ fontWeight: "700" }} />
        <Menu
          visible={menuVisible}
          onDismiss={() => setMenuVisible(false)}
          anchor={
            <TouchableOpacity
              onPress={() => setMenuVisible(true)}
              style={{ flexDirection: "row", alignItems: "center", marginRight: 8, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#CBD5E1", shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 2, elevation: 2 }}
            >
              <Text variant="labelLarge" style={{ fontWeight: "600", color: "#1E3A8A", marginRight: 4 }}>
                {PERIOD_LABELS[period]}
              </Text>
              <MaterialCommunityIcons name="chevron-down" size={18} color="#1E3A8A" />
            </TouchableOpacity>
          }
        >
          <Menu.Item onPress={() => { setPeriod("weekly"); setOffsetDate(new Date()); setMenuVisible(false); }} title="Weekly" leadingIcon="calendar-week" />
          <Menu.Item onPress={() => { setPeriod("monthly"); setOffsetDate(new Date()); setMenuVisible(false); }} title="Monthly" leadingIcon="calendar-month" />
          <Menu.Item onPress={() => { setPeriod("annually"); setOffsetDate(new Date()); setMenuVisible(false); }} title="Yearly" leadingIcon="calendar-year" />
        </Menu>
      </Appbar.Header>

      {/* Full-Width Navy Date Banner */}
      <View style={{ marginHorizontal: 16, marginTop: 12, backgroundColor: "#1E3A8A", borderRadius: 12, flexDirection: "row", alignItems: "center", paddingVertical: 14, paddingHorizontal: 8 }}>
        <TouchableOpacity onPress={() => shiftPeriod("left")} style={{ padding: 8 }}>
          <MaterialCommunityIcons name="chevron-left" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text variant="titleMedium" style={{ flex: 1, textAlign: "center", color: "#FFFFFF", fontWeight: "700" }}>
          {currentRange.label}
        </Text>
        <TouchableOpacity onPress={() => shiftPeriod("right")} style={{ padding: 8 }}>
          <MaterialCommunityIcons name="chevron-right" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 32 }}>
        {/* 3-Column Summary Cards */}
        <View style={{ flexDirection: "row", paddingHorizontal: 16, paddingTop: 16, gap: 10 }}>
          {/* Expense Card */}
          <View style={{ flex: 1, backgroundColor: "#fff", borderRadius: 16, padding: 16, ...CARD_SHADOW }}>
            <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: "#FEE2E2", justifyContent: "center", alignItems: "center", marginBottom: 10 }}>
              <MaterialCommunityIcons name="arrow-down-circle" size={22} color="#DC2626" />
            </View>
            <Text variant="labelSmall" style={{ color: "#94A3B8", fontWeight: "600", letterSpacing: 0.5 }}>EXPENSE</Text>
            <Text variant="titleMedium" style={{ color: "#DC2626", fontWeight: "800", marginTop: 4 }}>{formatAmount(expense)}</Text>
          </View>

          {/* Income Card */}
          <View style={{ flex: 1, backgroundColor: "#fff", borderRadius: 16, padding: 16, ...CARD_SHADOW }}>
            <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: "#DCFCE7", justifyContent: "center", alignItems: "center", marginBottom: 10 }}>
              <MaterialCommunityIcons name="arrow-up-circle" size={22} color="#16A34A" />
            </View>
            <Text variant="labelSmall" style={{ color: "#94A3B8", fontWeight: "600", letterSpacing: 0.5 }}>INCOME</Text>
            <Text variant="titleMedium" style={{ color: "#16A34A", fontWeight: "800", marginTop: 4 }}>{formatAmount(income)}</Text>
          </View>

          {/* Total Card */}
          <View style={{ flex: 1, backgroundColor: "#fff", borderRadius: 16, padding: 16, ...CARD_SHADOW }}>
            <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: "#DBEAFE", justifyContent: "center", alignItems: "center", marginBottom: 10 }}>
              <MaterialCommunityIcons name="wallet-outline" size={22} color="#1E3A8A" />
            </View>
            <Text variant="labelSmall" style={{ color: "#94A3B8", fontWeight: "600", letterSpacing: 0.5 }}>TOTAL</Text>
            <Text variant="titleMedium" style={{ color: "#1E3A8A", fontWeight: "800", marginTop: 4 }}>
              {net >= 0 ? "+" : ""}{formatAmount(net)}
            </Text>
          </View>
        </View>

        {/* Monthly Expense by Month (Bar Graph) */}
        <View style={{ marginHorizontal: 16, marginTop: 16, backgroundColor: "#fff", borderRadius: 16, padding: 20, ...CARD_SHADOW }}>
          <Text variant="titleMedium" style={{ marginBottom: 16, fontWeight: "700", color: "#1E293B" }}>Monthly Expense by Month</Text>
          <MonthlyTrendChart
            labels={trend.labels}
            income={trend.income}
            expense={trend.expense}
            width={screenWidth - 96}
            formatValue={formatAmount}
          />
        </View>

        {/* Income vs Expenses (Pie graph) */}
        <View style={{ marginHorizontal: 16, marginTop: 16, backgroundColor: "#fff", borderRadius: 16, padding: 20, alignItems: "center", ...CARD_SHADOW }}>
          <Text variant="titleMedium" style={{ fontWeight: "700", color: "#1E293B", marginBottom: 16, alignSelf: "flex-start" }}>
            Income vs Expenses
          </Text>

          <DonutChart
            data={donutData}
            width={screenWidth - 96}
            height={220}
            formatValue={formatAmount}
            centerValue={formatAmount(totalAll)}
            centerCaption="Total"
            emptyMessage="No data this period"
            mutedColor="#94A3B8"
            textColor="#1E293B"
          />
        </View>

        {/* Expense Breakdown */}
        {expenseBreakdown.length > 0 && (
          <View style={{ marginHorizontal: 16, marginTop: 16, backgroundColor: "#fff", borderRadius: 16, padding: 20, ...CARD_SHADOW }}>
            <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 16 }}>
              <View style={{ width: 28, height: 28, borderRadius: 8, backgroundColor: "#FEE2E2", justifyContent: "center", alignItems: "center", marginRight: 8 }}>
                <MaterialCommunityIcons name="arrow-down-circle" size={16} color="#DC2626" />
              </View>
              <Text variant="titleMedium" style={{ fontWeight: "700", color: "#1E293B" }}>Expense Categories</Text>
            </View>

            {expenseBreakdown.map((item, i) => {
              const pct = expense > 0 ? ((item.value / expense) * 100) : 0;
              return (
                <View key={i} style={{ flexDirection: "row", alignItems: "center", marginBottom: i < expenseBreakdown.length - 1 ? 14 : 0 }}>
                  <View style={{ width: 36, height: 36, borderRadius: 8, backgroundColor: "#FEF2F2", justifyContent: "center", alignItems: "center", marginRight: 10 }}>
                    <MaterialCommunityIcons name={renderCategoryIcon(item.name)} size={18} color={item.color} />
                  </View>
                  <View style={{ flex: 1, marginRight: 10 }}>
                    <Text variant="bodySmall" style={{ fontWeight: "600", color: "#1E293B" }}>{item.name}</Text>
                    <View style={{ height: 5, backgroundColor: "#FEE2E2", borderRadius: 3, marginTop: 5, overflow: "hidden" }}>
                      <View style={{ height: "100%", width: `${Math.max(pct, 2)}%`, backgroundColor: item.color, borderRadius: 3 }} />
                    </View>
                  </View>
                  <View style={{ alignItems: "flex-end" }}>
                    <Text variant="bodySmall" style={{ fontWeight: "700", color: "#DC2626" }}>-{formatAmount(item.value)}</Text>
                    <Text variant="labelSmall" style={{ color: "#94A3B8", marginTop: 1 }}>{pct.toFixed(1)}%</Text>
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {/* Income Breakdown */}
        {incomeBreakdown.length > 0 && (
          <View style={{ marginHorizontal: 16, marginTop: 16, backgroundColor: "#fff", borderRadius: 16, padding: 20, ...CARD_SHADOW }}>
            <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 16 }}>
              <View style={{ width: 28, height: 28, borderRadius: 8, backgroundColor: "#DCFCE7", justifyContent: "center", alignItems: "center", marginRight: 8 }}>
                <MaterialCommunityIcons name="arrow-up-circle" size={16} color="#16A34A" />
              </View>
              <Text variant="titleMedium" style={{ fontWeight: "700", color: "#1E293B" }}>Income Sources</Text>
            </View>

            {incomeBreakdown.map((item, i) => {
              const pct = income > 0 ? ((item.value / income) * 100) : 0;
              return (
                <View key={i} style={{ flexDirection: "row", alignItems: "center", marginBottom: i < incomeBreakdown.length - 1 ? 14 : 0 }}>
                  <View style={{ width: 36, height: 36, borderRadius: 8, backgroundColor: "#F0FDF4", justifyContent: "center", alignItems: "center", marginRight: 10 }}>
                    <MaterialCommunityIcons name={renderCategoryIcon(item.name)} size={18} color={item.color} />
                  </View>
                  <View style={{ flex: 1, marginRight: 10 }}>
                    <Text variant="bodySmall" style={{ fontWeight: "600", color: "#1E293B" }}>{item.name}</Text>
                    <View style={{ height: 5, backgroundColor: "#DCFCE7", borderRadius: 3, marginTop: 5, overflow: "hidden" }}>
                      <View style={{ height: "100%", width: `${Math.max(pct, 2)}%`, backgroundColor: item.color, borderRadius: 3 }} />
                    </View>
                  </View>
                  <View style={{ alignItems: "flex-end" }}>
                    <Text variant="bodySmall" style={{ fontWeight: "700", color: "#16A34A" }}>+{formatAmount(item.value)}</Text>
                    <Text variant="labelSmall" style={{ color: "#94A3B8", marginTop: 1 }}>{pct.toFixed(1)}%</Text>
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {/* Export */}
        <View style={{ marginHorizontal: 16, marginTop: 16, backgroundColor: "#fff", borderRadius: 16, padding: 20, ...CARD_SHADOW }}>
          <Text variant="titleMedium" style={{ marginBottom: 12, fontWeight: "700", color: "#1E293B" }}>Export Data</Text>
          <View style={{ flexDirection: "row", gap: 12 }}>
            <TouchableOpacity
              style={{ flex: 1, paddingVertical: 14, borderRadius: 10, backgroundColor: "#F1F5F9", alignItems: "center" }}
              onPress={() => exportToCSV(filteredTransactions)}
            >
              <MaterialCommunityIcons name="file-excel" size={22} color="#1E3A8A" />
              <Text variant="labelSmall" style={{ fontWeight: "700", color: "#1E3A8A", marginTop: 4 }}>CSV</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={{ flex: 1, paddingVertical: 14, borderRadius: 10, backgroundColor: "#F1F5F9", alignItems: "center" }}
              onPress={() => exportToPDF(filteredTransactions, formatAmount)}
            >
              <MaterialCommunityIcons name="file-pdf-box" size={22} color="#DC2626" />
              <Text variant="labelSmall" style={{ fontWeight: "700", color: "#DC2626", marginTop: 4 }}>PDF</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
