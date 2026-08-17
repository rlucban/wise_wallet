import { View, TouchableOpacity, Platform } from "react-native";
import { Text, useTheme } from "react-native-paper";
import { useRouter } from "expo-router";
import { Transaction } from "../types";
import { useCurrencyActions } from "../context/CurrencyContext";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import EmptyState from "./EmptyState";
import { FlashList } from "@shopify/flash-list";

const getCategoryIcon = (category?: string | { name?: string }): string => {
  const name = (typeof category === 'string' ? category : category?.name ?? "").trim().toLowerCase();

  if (name.includes("food")) return "silverware-fork-knife";
  if (name.includes("bill")) return "receipt";
  if (name.includes("transport")) return "car";
  if (name.includes("shop")) return "shopping";
  if (name.includes("entertain")) return "movie";
  if (name.includes("scatter") || name.includes("game")) return "dice-5";
  if (name.includes("salary") || name.includes("income")) return "cash-multiple";

  return "dots-horizontal"; // Fallback for Others
};

export function TransactionList({ transactions }: { transactions: Transaction[] }) {
  const theme = useTheme();
  const router = useRouter();
  const { formatAmount } = useCurrencyActions();

  const data = [...transactions].reverse();

  const renderItem = ({ item }: { item: Transaction }) => (
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
      <View style={{
        width: 48,
        height: 48,
        borderRadius: 12,
        backgroundColor: theme.colors.surfaceVariant,
        justifyContent: "center",
        alignItems: "center",
        marginRight: 16
      }}>
        <MaterialCommunityIcons
          name={getCategoryIcon(item.category)}
          size={24}
          color="#1E293B"
        />
      </View>

      <View style={{ flex: 1 }}>
        <Text variant="bodyLarge" style={{ fontWeight: "600", color: theme.colors.onSurface }}>
          {item.category?.name || "Others"}
        </Text>
        <Text variant="bodySmall" style={{ color: theme.colors.outline, marginTop: 2 }}>
          {item.establishment || (item.note?.replace(/\s*\[Split Bill\].*$/s, "").trim()) || "No details"}
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
          {new Date(item.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
        </Text>
      </View>
    </TouchableOpacity>
  );

  const ListHeaderComponent = () => (
    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12, paddingHorizontal: 4 }}>
      <Text variant="titleMedium" style={{ fontWeight: "700", color: theme.colors.onBackground }}>Recent Activity</Text>
      <TouchableOpacity onPress={() => router.push("/reports")}>
        <Text variant="labelLarge" style={{ color: theme.colors.primary, fontWeight: "600" }}>See All</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={{ marginHorizontal: 16, marginTop: 8, minHeight: 200 }}>
      <FlashList
        data={data}
        renderItem={renderItem}
        keyExtractor={(item: Transaction) => item.id}
        ListHeaderComponent={ListHeaderComponent}
        ListEmptyComponent={<EmptyState icon="receipt" title="No transactions yet" subtitle="Tap + to add your first transaction" />}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}
