import { View, Platform, TouchableOpacity } from "react-native";
import { Text, useTheme } from "react-native-paper";
import { LinearGradient } from "expo-linear-gradient";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import { useCurrencyActions } from "../context/CurrencyContext";
import { useUserProfileData } from "../context/UserProfileContext";
import { useState } from "react";
import { BalanceBreakdown } from "./BalanceBreakdown";
import { Transaction, SavingsItem } from "../types";

export function SummaryCard({ transactions = [], goals = [] }: { transactions?: Transaction[]; goals?: SavingsItem[] }) {
  const theme = useTheme();
  const { formatAmount } = useCurrencyActions();
  const { profile } = useUserProfileData();
  const [showBreakdown, setShowBreakdown] = useState(false);

  const initialBalance = Number(profile?.initialBalance || 0);

  const income = transactions
    .filter((t) => t.type === "income" && t.title !== "Opening Balance")
    .reduce((sum, t) => sum + Number(t.amount || 0), 0);

  const expense = transactions
    .filter((t) => t.type === "expense")
    .reduce((sum, t) => sum + Number(t.amount || 0), 0);

  const balance = initialBalance + income - expense;

  const reservedSavings = goals.reduce((sum, g) => sum + Number(g.balance || 0), 0);

  const totalReserved = Number(reservedSavings || 0);
  const availableBalance = balance - totalReserved;

  return (
    <View style={{ marginHorizontal: 16, marginBottom: 8 }}>
      <LinearGradient
        colors={[theme.colors.primary, "#0A2145"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{
          borderRadius: 24,
          padding: 24,
          elevation: 8,
          ...Platform.select({
            web: { boxShadow: `0px 4px 12px ${theme.colors.primary}4D` },
            default: {
              shadowColor: theme.colors.primary,
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.3,
              shadowRadius: 12,
            }
          })
        }}
      >
        <Text variant="labelMedium" style={{ color: "#fff", opacity: 0.7, textAlign: "center", letterSpacing: 1, fontWeight: "600" }}>
          AVAILABLE TO SPEND
        </Text>
        <Text variant="displayMedium" style={{ color: "#fff", fontWeight: "800", textAlign: "center", marginVertical: 8 }}>
          {formatAmount(availableBalance)}
        </Text>

        <View style={{ flexDirection: "row", justifyContent: "center", gap: 12 }}>
          <TouchableOpacity onPress={() => setShowBreakdown(true)} style={{ backgroundColor: "rgba(255,255,255,0.1)", paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12 }}>
            <Text variant="labelSmall" style={{ color: "#fff", opacity: 0.8 }}>Total: {formatAmount(balance)}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setShowBreakdown(true)} style={{ backgroundColor: "rgba(255,255,255,0.1)", paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12 }}>
            <Text variant="labelSmall" style={{ color: "#fff", opacity: 0.8 }}>Reserved: {formatAmount(totalReserved)}</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 1, backgroundColor: "rgba(255,255,255,0.1)", marginVertical: 16 }} />

        <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <View style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: "rgba(39, 174, 96, 0.2)", justifyContent: "center", alignItems: "center", marginRight: 8 }}>
              <MaterialCommunityIcons name="arrow-down" size={18} color="#27AE60" />
            </View>
            <View>
              <Text variant="labelSmall" style={{ color: "#fff", opacity: 0.6 }}>Income</Text>
              <Text variant="titleMedium" style={{ color: "#fff", fontWeight: "700" }}>{formatAmount(income)}</Text>
            </View>
          </View>

          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <View style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: "rgba(229, 57, 53, 0.2)", justifyContent: "center", alignItems: "center", marginRight: 8 }}>
              <MaterialCommunityIcons name="arrow-up" size={18} color="#E53935" />
            </View>
            <View>
              <Text variant="labelSmall" style={{ color: "#fff", opacity: 0.6, textAlign: "right" }}>Expense</Text>
              <Text variant="titleMedium" style={{ color: "#fff", fontWeight: "700", textAlign: "right" }}>{formatAmount(expense)}</Text>
            </View>
          </View>
        </View>
      </LinearGradient>

      <BalanceBreakdown
        visible={showBreakdown}
        onDismiss={() => setShowBreakdown(false)}
        initialBalance={initialBalance}
        income={income}
        expense={expense}
        goals={goals}
        transactions={transactions}
      />
    </View>
  );
}
