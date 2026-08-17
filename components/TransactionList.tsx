import { View, TouchableOpacity, Platform } from "react-native";
import { Text, useTheme } from "react-native-paper";
import { useRouter } from "expo-router";
import { Transaction } from "../types";
import { useCurrencyActions } from "../context/CurrencyContext";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import EmptyState from "./EmptyState";
import { FlashList } from "@shopify/flash-list";

const getCategoryBadge = (category?: string | { name?: string }, type?: string): { icon: string; color: string; bgColor: string } => {
  if (type === "income") {
    return { icon: "cash-multiple", color: "#27AE60", bgColor: "#E8F8F0" };
  }

  const name = (typeof category === 'string' ? category : category?.name ?? "").trim().toLowerCase();

  if (name.includes("food") || name.includes("dining") || name.includes("restaurant") || name.includes("grocer") || name.includes("utensil")) {
    return { icon: "silverware-fork-knife", color: "#10B981", bgColor: "#E8F8F0" };
  }
  if (name.includes("bill") || name.includes("ipon") || name.includes("reminder") || name.includes("utilit") || name.includes("electric") || name.includes("water") || name.includes("rent") || name.includes("dues")) {
    return { icon: "receipt", color: "#F97316", bgColor: "#FFF1E6" };
  }
  if (name.includes("transport") || name.includes("car") || name.includes("gas") || name.includes("fuel") || name.includes("commute")) {
    return { icon: "car", color: "#8B5CF6", bgColor: "#F3E8FF" };
  }
  if (name.includes("shop") || name.includes("cloth") || name.includes("market") || name.includes("store")) {
    return { icon: "shopping", color: "#3B82F6", bgColor: "#EBF3FF" };
  }
  if (name.includes("entertain") || name.includes("movie") || name.includes("scatter") || name.includes("game")) {
    return { icon: name.includes("scatter") || name.includes("game") ? "dice-5" : "movie", color: "#EC4899", bgColor: "#FDF2F8" };
  }
  if (name.includes("salary") || name.includes("income")) {
    return { icon: "cash-multiple", color: "#27AE60", bgColor: "#E8F8F0" };
  }

  return { icon: "dots-horizontal", color: "#64748B", bgColor: "#F1F5F9" };
};

export function TransactionList({ transactions }: { transactions: Transaction[] }) {
  const theme = useTheme();
  const router = useRouter();
  const { formatAmount } = useCurrencyActions();

  const data = [...transactions].reverse();

  const renderItem = ({ item }: { item: Transaction }) => {
    const badge = getCategoryBadge(item.category, item.type);
    return (
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
          backgroundColor: badge.bgColor,
          justifyContent: "center",
          alignItems: "center",
          marginRight: 16
        }}>
          <MaterialCommunityIcons
            name={badge.icon}
            size={24}
            color={badge.color}
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
  };

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
