import { useState, useEffect } from "react";
import { View, ScrollView, StyleSheet, TouchableOpacity } from "react-native";
import { Appbar, Text, Card, useTheme } from "react-native-paper";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useTransactions } from "../hooks/useTransactions";
import { useCurrencyActions } from "../context/CurrencyContext";
import { Transaction } from "../types";
import ConfirmDialog from "../components/ConfirmDialog";

const renderCategoryIcon = (category?: string, title?: string, type?: string): string => {
  const text = `${category || ""}`.toLowerCase() + " " + `${title || ""}`.toLowerCase();
  const isIncome = type?.toLowerCase() === "income";

  if (isIncome) return "wallet-outline";
  if (text.includes("food") || text.includes("mcdo")) return "silverware-fork-knife";
  if (text.includes("shop")) return "cart-outline";
  if (text.includes("freelance") || text.includes("salary")) return "cash";
  if (text.includes("utang") || text.includes("john")) return "account-outline";
  if (text.includes("bill") || text.includes("utility")) return "receipt";
  if (text.includes("transport")) return "car-outline";
  if (text.includes("entertain")) return "movie-open";

  return "cash";
};

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

  const isIncome = transaction?.type === "income";
  const amountColor = isIncome ? theme.colors.primary : theme.colors.error;
  const amountPrefix = isIncome ? "+" : "-";
  const isScheduled = Boolean(transaction?.dueId || transaction?.category?.id === "scheduled");

  const handleDelete = async () => {
    if (transaction) {
      await deleteTransaction(transaction.id);
      setDeleteDialogVisible(false);
      router.back();
    }
  };

  if (!transaction) {
    return (
      <View style={{ flex: 1, width: "100%", alignItems: "center", backgroundColor: theme.colors.background }}>
        <Text>Transaction not found</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Appbar.Header
        style={{
          backgroundColor: theme.colors.surface,
          elevation: 0,
          flexDirection: "row",
          justifyContent: "space-between",
          width: "100%",
          marginBottom: 6,
        }}
      >
        <View style={styles.appbarLeft}>
          <Appbar.BackAction onPress={() => router.back()} />
          <Appbar.Content title="Transaction Details" titleStyle={{ fontWeight: "700" }} />
        </View>
        <View style={styles.appbarRight}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <TouchableOpacity
              style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                backgroundColor: "#ffffff",
                justifyContent: "center",
                alignItems: "center",
                borderWidth: 1,
                borderColor: "#e2e8f0",
              }}
              onPress={() => router.push(`/edit-transaction?id=${transaction.id}`)}
            >
              <MaterialCommunityIcons name="pencil" size={20} color="#3b82f6" />
            </TouchableOpacity>
            {!isScheduled && (
              <TouchableOpacity
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 20,
                  backgroundColor: "#ffffff",
                  justifyContent: "center",
                  alignItems: "center",
                  borderWidth: 1,
                  borderColor: "#e2e8f0",
                }}
                onPress={() => setDeleteDialogVisible(true)}
              >
                <MaterialCommunityIcons name="delete-outline" size={20} color="#ef4444" />
              </TouchableOpacity>
            )}
          </View>
        </View>
      </Appbar.Header>

      <ScrollView contentContainerStyle={styles.scrollContainer}>
        {/* Hero Summary Card */}
        <Card style={styles.heroCard}>
          <Card.Content style={styles.heroContent}>
            <View style={styles.amountIcon}>
              <MaterialCommunityIcons
                name={renderCategoryIcon(transaction.category?.name, transaction.title, transaction.type)}
                size={32}
                color={isIncome ? "#16A34A" : "#DC2626"}
              />
            </View>
            <View style={styles.amountText}>
              <Text variant="displayLarge" style={{ color: amountColor, fontWeight: "800" }}>
                {amountPrefix}{formatAmount(transaction.amount)}
              </Text>
              <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, opacity: 0.8 }}>
                {isIncome ? "Income" : "Expense"}
              </Text>
            </View>
            <Text variant="titleMedium" style={{ marginTop: 4, color: theme.colors.onSurface }}>
              {transaction.category?.name || "Others"}
            </Text>
          </Card.Content>
        </Card>

        {/* Detailed Fields Card */}
        <Card style={styles.detailedCard}>
          <Card.Content style={styles.detailedContent}>
            <View style={styles.detailRow}>
              <Text style={styles.label}>TYPE</Text>
              <Text style={styles.value}>{isIncome ? "Income" : "Expense"}</Text>
            </View>

            <View style={styles.detailRow}>
              <Text style={styles.label}>AMOUNT</Text>
              <Text style={styles.value}>{amountPrefix}{formatAmount(transaction.amount)}</Text>
            </View>

            <View style={styles.detailRow}>
              <Text style={styles.label}>TRANSACTION DATE</Text>
              <Text style={styles.value}>
                {new Date(transaction.date).toLocaleDateString("en-US", {
                  weekday: "long",
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </Text>
            </View>

            <View style={styles.detailRow}>
              <Text style={styles.label}>PAYMENT METHOD / ACCOUNT</Text>
              <Text style={styles.value}>
                {transaction.paymentMethod || "Cash"}
              </Text>
            </View>

            <View style={styles.detailRow}>
              <Text style={styles.label}>CATEGORY</Text>
              <Text style={styles.value}>{transaction.category?.name || "Others"}</Text>
            </View>
          </Card.Content>
        </Card>
      </ScrollView>

      <ConfirmDialog
        visible={deleteDialogVisible}
        title="Delete Transaction?"
        message="Are you sure you want to delete this transaction? This action cannot be undone."
        confirmLabel="Delete"
        onConfirm={handleDelete}
        onCancel={() => setDeleteDialogVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 16,
    backgroundColor: "#f9fafb",
  },
  scrollContainer: {
    flexGrow: 1,
  },
  appbarLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  appbarRight: {
    flexDirection: "row",
    alignItems: "center",
  },
  heroCard: {
    borderRadius: 20,
    marginBottom: 24,
    overflow: "hidden",
    width: "100%",
  },
  heroContent: {
    padding: 24,
    alignItems: "center",
  },
  amountIcon: {
    width: 64,
    height: 64,
    borderRadius: 12,
    backgroundColor: "#f9fafb",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  amountText: {
    alignItems: "center",
  },
  detailedCard: {
    borderRadius: 16,
    marginBottom: 24,
    width: "100%",
  },
  detailedContent: {
    padding: 24,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  label: {
    textTransform: "uppercase",
    fontSize: 10,
    fontWeight: "600",
    color: "#64748b",
    letterSpacing: 0.5,
  },
  value: {
    fontSize: 16,
    fontWeight: "500",
    color: "#64748b",
    marginLeft: 8,
  },
});