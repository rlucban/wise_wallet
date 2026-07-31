import { View, ScrollView } from "react-native";
import { Modal, Portal, Text, Button, Divider, useTheme } from "react-native-paper";
import { useCurrencyActions } from "../context/CurrencyContext";
import { Transaction, SavingsItem } from "../types";

interface BalanceBreakdownProps {
  visible: boolean;
  onDismiss: () => void;
  initialBalance: number;
  income: number;
  expense: number;
  goals: SavingsItem[];
  transactions: Transaction[];
}

export function BalanceBreakdown({
  visible,
  onDismiss,
  initialBalance,
  income,
  expense,
  goals,
  transactions: _transactions,
}: BalanceBreakdownProps) {
  const theme = useTheme();
  const { formatAmount } = useCurrencyActions();

  const balance = initialBalance + income - expense;

  const reservedSavings = goals.reduce((sum, g) => sum + Number(g.balance || 0), 0);

  const totalReserved = reservedSavings;
  const availableBalance = balance - totalReserved;

  return (
    <Portal>
      <Modal visible={visible} onDismiss={onDismiss} contentContainerStyle={{
        backgroundColor: theme.colors.surface,
        margin: 20,
        borderRadius: 16,
        maxHeight: "80%",
      }}>
        <ScrollView style={{ padding: 24 }}>
          <Text variant="titleLarge" style={{ fontWeight: "700", marginBottom: 20, textAlign: "center" }}>
            Balance Breakdown
          </Text>

          <Text variant="labelMedium" style={{ color: theme.colors.outline, marginBottom: 4 }}>
            TOTAL BALANCE
          </Text>
          <Text variant="headlineSmall" style={{ fontWeight: "700", marginBottom: 12 }}>
            {formatAmount(balance)}
          </Text>

          <View style={{ paddingLeft: 12, marginBottom: 12 }}>
            <Row label="Initial Balance" value={initialBalance} format={formatAmount} />
            <Row label="+ Income" value={income} format={formatAmount} positive />
            <Row label="- Expenses" value={expense} format={formatAmount} negative />
          </View>

          <Divider style={{ marginVertical: 12 }} />

          <Text variant="labelMedium" style={{ color: theme.colors.outline, marginBottom: 4 }}>
            RESERVED (Savings)
          </Text>
          <Text variant="headlineSmall" style={{ fontWeight: "700", marginBottom: 12 }}>
            {formatAmount(totalReserved)}
          </Text>

          <View style={{ paddingLeft: 12, marginBottom: 4 }}>
            {goals.length === 0 && (
              <Text variant="bodySmall" style={{ color: "gray", marginBottom: 8 }}>None</Text>
            )}
            {goals.map((g) => (
              <Text key={g.id} variant="bodySmall" style={{ color: "gray", marginBottom: 2 }}>
                {g.title}: {formatAmount(g.balance)}
              </Text>
            ))}
          </View>

          <Divider style={{ marginVertical: 12 }} />

          <Text variant="labelMedium" style={{ color: theme.colors.outline, marginBottom: 4 }}>
            AVAILABLE TO SPEND
          </Text>
          <Text variant="headlineSmall" style={{ fontWeight: "800", marginBottom: 20, color: theme.colors.primary }}>
            {formatAmount(availableBalance)}
          </Text>

          <Text variant="bodySmall" style={{ color: "gray", marginBottom: 16, lineHeight: 18 }}>
            Savings are locked funds. Transfer money in or out from your main balance.
            Dues show upcoming financial events and do not reserve your balance.
          </Text>

          <Button mode="contained" onPress={onDismiss}>
            Got It
          </Button>
        </ScrollView>
      </Modal>
    </Portal>
  );
}

function Row({ label, value, format, positive, negative }: {
  label: string;
  value: number;
  format: (v: number) => string;
  positive?: boolean;
  negative?: boolean;
}) {
  const color = positive ? "#27AE60" : negative ? "#E53935" : undefined;
  return (
    <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 2 }}>
      <Text variant="bodyMedium" style={{ color: "gray" }}>{label}</Text>
      <Text variant="bodyMedium" style={{ fontWeight: "600", color }}>{format(value)}</Text>
    </View>
  );
}
