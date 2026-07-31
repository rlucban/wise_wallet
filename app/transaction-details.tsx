import { useState, useEffect } from "react";
import { View, ScrollView } from "react-native";
import { Image } from "expo-image";
import { Appbar, Text, Card, Chip, Button, Divider, useTheme, Portal, Dialog } from "react-native-paper";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useTransactions } from "../hooks/useTransactions";
import { useCurrencyActions } from "../context/CurrencyContext";
import { Transaction } from "../types";

export default function TransactionDetails() {
  const router = useRouter();
  const theme = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { transactions, deleteTransaction } = useTransactions();
  const { formatAmount } = useCurrencyActions();

  const [transaction, setTransaction] = useState<Transaction | null>(null);
  const [deleteDialogVisible, setDeleteDialogVisible] = useState(false);

  useEffect(() => {
    const found = transactions.find((t) => t.id === id);
    setTransaction(found || null);
  }, [id, transactions]);

  const handleDelete = async () => {
    if (transaction) {
      await deleteTransaction(transaction.id);
      setDeleteDialogVisible(false);
      router.back();
    }
  };

  if (!transaction) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <Text>Transaction not found</Text>
      </View>
    );
  }

  const isIncome = transaction.type === "income";

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <Appbar.Header>
        <Appbar.BackAction onPress={() => router.back()} />
        <Appbar.Content title="Transaction Details" />
        {/* <Appbar.Action icon="pencil" onPress={() => router.push(`/edit-transaction?id=${transaction.id}`)} />
        <Appbar.Action icon="delete" onPress={() => setDeleteDialogVisible(true)} /> */}
      </Appbar.Header>

      <ScrollView contentContainerStyle={{ padding: 16 }}>
        <Card style={{ marginBottom: 16 }}>
          <Card.Content style={{ alignItems: "center", paddingVertical: 24 }}>
            <Text variant="displayMedium" style={{ color: isIncome ? theme.colors.primary : theme.colors.error, fontWeight: "bold" }}>
              {isIncome ? "+" : "-"}{formatAmount(transaction.amount)}
            </Text>
            <Chip icon={isIncome ? "arrow-up" : "arrow-down"} style={{ marginTop: 8 }}>
              {isIncome ? "Income" : "Expense"}
            </Chip>
          </Card.Content>
        </Card>

        <Card style={{ marginBottom: 16 }}>
          <Card.Content>
            <View style={{ marginBottom: 12 }}>
              <Text variant="labelSmall" style={{ color: "gray" }}>Category</Text>
              <Text variant="titleMedium">{transaction.category?.name || "Others"}</Text>
            </View>
            <Divider style={{ marginVertical: 8 }} />

            <View style={{ marginBottom: 12 }}>
              <Text variant="labelSmall" style={{ color: "gray" }}>Date</Text>
              <Text variant="titleMedium">{new Date(transaction.date).toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}</Text>
            </View>
            <Divider style={{ marginVertical: 8 }} />

            <View style={{ marginBottom: 12 }}>
              <Text variant="labelSmall" style={{ color: "gray" }}>Payment Method</Text>
              <Text variant="titleMedium">{transaction.paymentMethod || "Cash"}</Text>
            </View>
            <Divider style={{ marginVertical: 8 }} />

            {transaction.establishment && (
              <>
                <View style={{ marginBottom: 12 }}>
                  <Text variant="labelSmall" style={{ color: "gray" }}>Establishment / Location</Text>
                  <Text variant="titleMedium">{transaction.establishment}</Text>
                </View>
                <Divider style={{ marginVertical: 8 }} />
              </>
            )}

            {transaction.splitInfo && (
              <>
                <View style={{ marginBottom: 12 }}>
                  <Text variant="labelSmall" style={{ color: "gray" }}>Split Bill</Text>
                  <Text variant="titleMedium">Split between {transaction.splitInfo.people} people</Text>
                  <Text variant="bodyMedium" style={{ color: theme.colors.primary, fontWeight: "bold" }}>
                    {formatAmount(transaction.splitInfo.amountPerPerson)} each
                  </Text>
                  {transaction.splitInfo.notes && (
                    <Text variant="bodySmall" style={{ marginTop: 4, fontStyle: "italic" }}>
                      Notes: {transaction.splitInfo.notes}
                    </Text>
                  )}
                </View>
                <Divider style={{ marginVertical: 8 }} />
              </>
            )}

            {transaction.note && (
              <View style={{ marginBottom: 12 }}>
                <Text variant="labelSmall" style={{ color: "gray" }}>Note</Text>
                <Text variant="bodyLarge">
                  {transaction.note.replace(/\s*\[Split Bill\].*$/s, "").trim()}
                </Text>
              </View>
            )}
          </Card.Content>
        </Card>

        {transaction.receiptUrl && (
          <Card style={{ marginBottom: 16 }}>
            <Card.Content>
              <Text variant="labelSmall" style={{ color: "gray", marginBottom: 8 }}>Receipt</Text>
              <Image
                source={{ uri: transaction.receiptUrl }}
                style={{ width: "100%", height: 250, borderRadius: 8 }}
                contentFit="cover"
              />
            </Card.Content>
          </Card>
        )}

        {/* <Button
          mode="outlined"
          icon="pencil"
          onPress={() => router.push(`/edit-transaction?id=${transaction.id}`)}
          style={{ marginBottom: 8 }}
        >
          Edit Transaction
        </Button> */}

        {/* <Button
          mode="outlined"
          icon="delete"
          textColor={theme.colors.error}
          onPress={() => setDeleteDialogVisible(true)}
        >
          Delete Transaction
        </Button> */}
      </ScrollView>

      <Portal>
        <Dialog visible={deleteDialogVisible} onDismiss={() => setDeleteDialogVisible(false)}>
          <Dialog.Title>Delete Transaction?</Dialog.Title>
          <Dialog.Content>
            <Text>Are you sure you want to delete this transaction? This cannot be undone.</Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setDeleteDialogVisible(false)}>Cancel</Button>
            <Button textColor={theme.colors.error} onPress={handleDelete}>Delete</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </View>
  );
}
