import { useState } from "react";
import { ScrollView, useWindowDimensions, View } from "react-native";
import { Text, useTheme, Card } from "react-native-paper";
import { Calendar } from "react-native-calendars";
import { useTransactions } from "../hooks/useTransactions";
import { useCurrencyActions } from "../context/CurrencyContext";
import { FinancialTip } from "./FinancialTip";
import { getDayFinancialTips } from "../utils/financialLiteracy";

export default function CalendarDaySheet() {
  const theme = useTheme();
  const { transactions } = useTransactions();
  const { formatAmount } = useCurrencyActions();
  const { height: windowHeight } = useWindowDimensions();

  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);

  const markedDates: Record<string, { marked?: boolean; dotColor?: string; selected?: boolean; selectedColor?: string }> = transactions.reduce((acc, t) => {
    const date = t.date.split("T")[0];
    acc[date] = {
      marked: true,
      dotColor: t.type === "income" ? theme.colors.primary : theme.colors.error
    };
    return acc;
  }, {} as Record<string, { marked?: boolean; dotColor?: string; selected?: boolean; selectedColor?: string }>);

  markedDates[selectedDate] = {
    ...markedDates[selectedDate],
    selected: true,
    selectedColor: theme.colors.primary
  };

  const dayTransactions = transactions.filter((t) => t.date.startsWith(selectedDate));

  const totalIncome = dayTransactions.filter(t => t.type === "income").reduce((s, t) => s + t.amount, 0);
  const totalExpense = dayTransactions.filter(t => t.type === "expense").reduce((s, t) => s + t.amount, 0);

  return (
    <ScrollView
      style={{ flex: 1, maxHeight: windowHeight * 0.8 }}
      contentContainerStyle={{ padding: 16, paddingBottom: 16 }}
      showsVerticalScrollIndicator={false}
    >
      <Card style={{ marginBottom: 16, borderRadius: 16, elevation: 2 }}>
        <Card.Content style={{ padding: 8 }}>
          <Calendar
            onDayPress={(day) => setSelectedDate(day.dateString)}
            markedDates={markedDates}
            theme={{
              todayTextColor: theme.colors.primary,
              arrowColor: theme.colors.primary,
              selectedDayBackgroundColor: theme.colors.primary,
            }}
          />
        </Card.Content>
      </Card>

      <Card style={{ marginBottom: 16 }}>
        <Card.Content>
          <Text variant="titleMedium" style={{ marginBottom: 8 }}>
            {new Date(selectedDate).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
          </Text>
          <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
            <Text style={{ color: theme.colors.primary }}>Income: +{formatAmount(totalIncome)}</Text>
            <Text style={{ color: theme.colors.error }}>Expense: -{formatAmount(totalExpense)}</Text>
          </View>
        </Card.Content>
      </Card>

      <FinancialTip
        date={new Date(selectedDate + "T00:00:00")}
        extraTips={getDayFinancialTips(selectedDate, transactions, formatAmount)}
        showFooter={false}
        style={{ margin: 0, marginBottom: 16 }}
      />
    </ScrollView>
  );
}