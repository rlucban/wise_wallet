import { useState, useCallback } from "react";
import { View, ScrollView } from "react-native";
import { Appbar, Text, List, FAB, useTheme, Card, Divider } from "react-native-paper";
import { useRouter, useFocusEffect } from "expo-router";
import { Calendar } from "react-native-calendars";
import { useTransactions } from "../hooks/useTransactions";

export default function CalendarScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { transactions, refetch } = useTransactions();

  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);

  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [refetch])
  );

  // Build marked dates from transactions
  const markedDates: Record<string, { marked?: boolean; dotColor?: string; selected?: boolean; selectedColor?: string }> = transactions.reduce((acc, t) => {
    const date = t.date.split("T")[0];
    acc[date] = {
      marked: true,
      dotColor: t.type === "income" ? theme.colors.primary : theme.colors.error
    };
    return acc;
  }, {} as Record<string, { marked?: boolean; dotColor?: string; selected?: boolean; selectedColor?: string }>);

  // Add selection styling
  markedDates[selectedDate] = {
    ...markedDates[selectedDate],
    selected: true,
    selectedColor: theme.colors.primary
  };

  // Filter transactions for the selected date
  const dayTransactions = transactions.filter((t) => t.date.startsWith(selectedDate));

  const totalIncome = dayTransactions.filter(t => t.type === "income").reduce((s, t) => s + t.amount, 0);
  const totalExpense = dayTransactions.filter(t => t.type === "expense").reduce((s, t) => s + t.amount, 0);

  return (
    <View style={{ flex: 1, backgroundColor: "#f5f5f5" }}>
      <Appbar.Header>
        <Appbar.BackAction onPress={() => router.back()} />
        <Appbar.Content title="Calendar" />
      </Appbar.Header>

      <Calendar
        onDayPress={(day) => setSelectedDate(day.dateString)}
        markedDates={markedDates}
        theme={{
          todayTextColor: theme.colors.primary,
          arrowColor: theme.colors.primary,
          selectedDayBackgroundColor: theme.colors.primary,
        }}
      />

      <ScrollView style={{ flex: 1, padding: 16 }}>
        <Card style={{ marginBottom: 16 }}>
          <Card.Content>
            <Text variant="titleMedium" style={{ marginBottom: 8 }}>
              {new Date(selectedDate).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
            </Text>
            <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
              <Text style={{ color: theme.colors.primary }}>Income: +${totalIncome.toFixed(2)}</Text>
              <Text style={{ color: theme.colors.error }}>Expense: -${totalExpense.toFixed(2)}</Text>
            </View>
          </Card.Content>
        </Card>

        {dayTransactions.length === 0 ? (
          <Text style={{ textAlign: "center", color: "gray", marginTop: 20 }}>
            No transactions on this day.
          </Text>
        ) : (
          <Card>
            <Card.Content>
              {dayTransactions.map((item, index) => (
                <View key={item.id}>
                  <List.Item
                    title={item.category?.name || "Others"}
                    description={item.note || item.establishment || ""}
                    left={(props) => (
                      <List.Icon
                        {...props}
                        icon={item.type === "income" ? "arrow-up-circle" : "arrow-down-circle"}
                        color={item.type === "income" ? theme.colors.primary : theme.colors.error}
                      />
                    )}
                    right={() => (
                      <Text
                        variant="bodyLarge"
                        style={{
                          alignSelf: "center",
                          fontWeight: "bold",
                          color: item.type === "income" ? theme.colors.primary : theme.colors.error,
                        }}
                      >
                        {item.type === "income" ? "+" : "-"}${item.amount?.toFixed(2) || "0.00"}
                      </Text>
                    )}
                  />
                  {index < dayTransactions.length - 1 && <Divider />}
                </View>
              ))}
            </Card.Content>
          </Card>
        )}
      </ScrollView>

      <FAB
        icon="plus"
        style={{ position: "absolute", margin: 16, right: 0, bottom: 0 }}
        onPress={() => router.push("/add-transaction")}
      />
    </View>
  );
}
