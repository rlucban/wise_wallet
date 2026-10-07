import { useCallback, useMemo } from "react";
import { View, Platform } from "react-native";
import { FlashList } from "@shopify/flash-list";
import { Appbar, Text, useTheme } from "react-native-paper";
import { useRouter, useFocusEffect } from "expo-router";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import { safeGoBack } from "../utils/backNavigation";
import { groupTransactionsByMonth } from "../utils/transactionGroups";
import { useState, useCallback, useMemo } from "react";
import { View, TouchableOpacity, Platform } from "react-native";
import { Appbar, Text, SegmentedButtons, useTheme } from "react-native-paper";
import { useRouter, useFocusEffect } from "expo-router";
import { FlashList } from "@shopify/flash-list";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import { useTransactions } from "../hooks/useTransactions";
import { useCurrencyActions } from "../context/CurrencyContext";
import { Transaction } from "../types";
import EmptyState from "../components/EmptyState";

const renderCategoryIcon = (category?: string, title?: string, type?: string): string => {
  const text = `${category || ''} ${title || ''}`.toLowerCase();
  const isIncome = type?.toLowerCase() === 'income';

  if (isIncome) return 'wallet-outline';
  if (text.includes('food') || text.includes('mcdo')) return 'silverware-fork-knife';
  if (text.includes('shop')) return 'cart-outline';
  if (text.includes('freelance') || text.includes('salary')) return 'cash';
  if (text.includes('utang') || text.includes('john')) return 'account-outline';
  if (text.includes('bill') || text.includes('utility')) return 'receipt';
  if (text.includes('transport')) return 'car-outline';
  if (text.includes('entertain')) return 'movie-open';

  return 'cash';
import { safeGoBack } from "../utils/backNavigation";

const renderCategoryIcon = (category?: string, title?: string, type?: string): string => {
  const text = `${category || "" } ${title || ""}`.toLowerCase();
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

export default function TransactionsScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { transactions, refetch } = useTransactions();
  const { formatAmount } = useCurrencyActions();

  const { transactions = [], refetch } = useTransactions();
  const { formatAmount } = useCurrencyActions();

  const [filterType, setFilterType] = useState<"all" | "expense" | "income">("all");

  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [refetch])
  );

  const groups = useMemo(() => groupTransactionsByMonth(transactions), [transactions]);

  const renderRow = useCallback(
    (item: Transaction) => (
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          paddingVertical: 12,
        }}
      >
        <View style={{
          width: 44,
          height: 44,
          borderRadius: 12,
          backgroundColor: theme.colors.surfaceVariant,
          justifyContent: "center",
          alignItems: "center",
          marginRight: 12
        }}>
          <MaterialCommunityIcons
            name={renderCategoryIcon(item.category?.name, item.title, item.type)}
            size={22}
  const filteredTransactions = useMemo(() => {
    const sorted = [...transactions].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return sorted.filter((t) => {
      if (filterType !== "all" && t.type !== filterType) {
        return false;
      }
      return true;
    });
  }, [transactions, filterType]);

  const renderItem = useCallback(
    ({ item }: { item: Transaction }) => (
      <TouchableOpacity
        onPress={() => router.push(`/transaction-details?id=${item.id}`)}
        activeOpacity={0.7}
        style={{
          backgroundColor: theme.colors.surface,
          borderRadius: 16,
          padding: 16,
          marginBottom: 12,
          flexDirection: "row",
          alignItems: "center",
          ...Platform.select({
            web: { boxShadow: "0px 1px 2px rgba(0, 0, 0, 0.05)" },
            default: {
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 1 },
              shadowOpacity: 0.05,
              shadowRadius: 2,
              elevation: 1,
            },
          }),
        }}
      >
        <View
          style={{
            width: 48,
            height: 48,
            borderRadius: 12,
            backgroundColor: theme.colors.surfaceVariant,
            justifyContent: "center",
            alignItems: "center",
            marginRight: 16,
          }}
        >
          <MaterialCommunityIcons
            name={renderCategoryIcon(item.category?.name, item.title, item.type)}
            size={24}
            color={item.type === "income" ? "#16A34A" : "#DC2626"}
          />
        </View>

        <View style={{ flex: 1 }}>
          <Text variant="bodyLarge" style={{ fontWeight: "600", color: theme.colors.onSurface }}>
            {item.category?.name || "Others"}
          </Text>
          <View style={{ flexDirection: "row", alignItems: "center", marginTop: 4 }}>
            <View style={{ borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2, backgroundColor: theme.colors.secondaryContainer, marginRight: 6 }}>
              <Text variant="labelSmall" style={{ color: theme.colors.onSecondaryContainer, fontWeight: "600" }}>
                {item.paymentMethod || "—"}
              </Text>
            </View>
            <Text variant="labelSmall" style={{ color: theme.colors.outline }}>
              {new Date(item.date).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
            </Text>
          </View>
        </View>

        <Text
          variant="titleMedium"
          style={{
            fontWeight: "700",
            color: item.type === "income" ? "#27AE60" : theme.colors.error,
          }}
        >
          {item.type === "income" ? "+" : "-"}{formatAmount(item.amount)}
        </Text>
      </View>
    ),
    [theme, formatAmount]
  );

  const renderGroup = useCallback(
    ({ item: group }: { item: ReturnType<typeof groupTransactionsByMonth>[number] }) => (
      <View
        style={{
          backgroundColor: theme.colors.surface,
          borderRadius: 16,
          padding: 16,
          marginBottom: 12,
          ...Platform.select({
            web: { boxShadow: '0px 1px 2px rgba(0, 0, 0, 0.05)' },
            default: {
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 1 },
              shadowOpacity: 0.05,
              shadowRadius: 2,
              elevation: 1
            }
          })
        }}
      >
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
          <Text variant="titleMedium" style={{ fontWeight: "700", color: theme.colors.onSurface }}>
            {group.label}
          </Text>
          <Text variant="labelSmall" style={{ color: theme.colors.outline }}>
            {group.items.length} {group.items.length === 1 ? "transaction" : "transactions"}
          </Text>
        </View>
        {group.items.map((item) => (
          <View key={item.id}>
            {renderRow(item)}
          </View>
        ))}
      </View>
    ),
    [theme, renderRow]
        <View style={{ flex: 1, marginRight: 8 }}>
          <Text variant="bodyLarge" style={{ fontWeight: "600", color: theme.colors.onSurface }} numberOfLines={1}>
            {item.category?.name || item.title || "Others"}
          </Text>
          <Text variant="bodySmall" style={{ color: theme.colors.outline, marginTop: 2 }} numberOfLines={1}>
            {item.establishment || (item.note?.replace(/\s*\[Split Bill\].*$/s, "").trim()) || item.title || "No details"}
          </Text>
        </View>

        <View style={{ alignItems: "flex-end" }}>
          <Text
            variant="titleMedium"
            style={{
              fontWeight: "700",
              color: item.type === "income" ? "#27AE60" : theme.colors.error,
            }}
          >
            {item.type === "income" ? "+" : "-"}{formatAmount(item.amount)}
          </Text>
          <Text variant="labelSmall" style={{ color: theme.colors.outline, marginTop: 2 }}>
            {new Date(item.date).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
          </Text>
        </View>
      </TouchableOpacity>
    ),
    [theme, formatAmount, router]
  );

  const ListHeader = useCallback(
    () => (
      <View style={{ marginBottom: 16 }}>
        <SegmentedButtons
          value={filterType}
          onValueChange={(val) => setFilterType(val as "all" | "expense" | "income")}
          buttons={[
            { value: "all", label: "All" },
            { value: "expense", label: "Expense" },
            { value: "income", label: "Income" },
          ]}
          style={{ marginBottom: 12 }}
        />

        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 4 }}>
          <Text variant="labelMedium" style={{ color: theme.colors.outline }}>
            {filteredTransactions.length} {filteredTransactions.length === 1 ? "transaction" : "transactions"}
          </Text>
        </View>
      </View>
    ),
    [filterType, filteredTransactions.length, theme]
  );

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <Appbar.Header>
        <Appbar.BackAction onPress={() => safeGoBack(router)} />
        <Appbar.Content title="Transaction History" />
      </Appbar.Header>

      <FlashList
        data={groups}
        renderItem={renderGroup}
        keyExtractor={(group) => group.key}
        ListEmptyComponent={<EmptyState icon="receipt" title="No transactions yet" subtitle="Tap + to add your first transaction" />}
        contentContainerStyle={{ padding: 16 }}
      <Appbar.Header style={{ backgroundColor: theme.colors.background, elevation: 0 }}>
        <Appbar.BackAction onPress={() => safeGoBack(router)} />
        <Appbar.Content title="Transaction History" titleStyle={{ fontWeight: "700" }} />
      </Appbar.Header>

      <FlashList
        data={filteredTransactions}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={ListHeader}
        ListEmptyComponent={
          <EmptyState
            icon="receipt"
            title={filterType !== "all" ? "No matching transactions" : "No transactions yet"}
            subtitle={
              filterType !== "all"
                ? "Try adjusting your filter"
                : "Your completed and added transactions will appear here"
            }
          />
        }
        contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}
