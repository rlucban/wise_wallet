import { useCallback, useMemo } from "react";
import { View, Platform } from "react-native";
import { FlashList } from "@shopify/flash-list";
import { Appbar, Text, useTheme } from "react-native-paper";
import { useRouter, useFocusEffect } from "expo-router";
import { safeGoBack } from "../utils/backNavigation";
import { useDues } from "../hooks/useDues";
import { useCurrencyActions } from "../context/CurrencyContext";
import { groupDuesByMonth } from "../utils/groupDuesByMonth";
import { Due } from "../types";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import EmptyState from "../components/EmptyState";

export default function CompletedDuesScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { dues, refetch } = useDues();
  const { formatAmount } = useCurrencyActions();

  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [refetch])
  );

  const completedDues = useMemo(() => {
    return dues
      .filter((d) => d.completed)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [dues]);

  const groups = useMemo(() => groupDuesByMonth(completedDues), [completedDues]);

  const renderRow = useCallback(
    (item: Due) => (
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          paddingVertical: 12,
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", flex: 1, minWidth: 0 }}>
          <View
            style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: theme.colors.surfaceVariant,
              justifyContent: "center",
              alignItems: "center",
              marginRight: 12,
              flexShrink: 0,
            }}
          >
            <MaterialCommunityIcons
              name={item.type === "income" ? "arrow-up-circle" : "arrow-down-circle"}
              size={24}
              color={theme.colors.outline}
            />
          </View>

          <View style={{ flex: 1, minWidth: 0 }}>
            <Text
              variant="titleSmall"
              style={{
                color: theme.colors.onSurfaceVariant,
                fontWeight: "600",
              }}
            >
              {item.title}
            </Text>
            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 2 }}>
              {new Date(item.date).toLocaleDateString()} &bull; {formatAmount(item.amount)}
            </Text>
          </View>
        </View>

        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <MaterialCommunityIcons name="check-circle" size={22} color={theme.colors.primary} />
        </View>
      </View>
    ),
    [theme, formatAmount]
  );

  const renderGroup = useCallback(
    ({ item: group }: { item: ReturnType<typeof groupDuesByMonth>[number] }) => (
      <View
        style={{
          backgroundColor: theme.colors.surface,
          borderRadius: 16,
          padding: 16,
          marginBottom: 12,
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
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 4,
          }}
        >
          <Text variant="titleMedium" style={{ fontWeight: "700", color: theme.colors.onSurface }}>
            {group.label}
          </Text>
          <Text variant="labelSmall" style={{ color: theme.colors.outline }}>
            {group.items.length} {group.items.length === 1 ? "transaction" : "transactions"}
          </Text>
        </View>
        {group.items.map((item) => (
          <View key={item.id}>{renderRow(item)}</View>
        ))}
      </View>
    ),
    [theme, renderRow]
  );

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <Appbar.Header>
        <Appbar.BackAction onPress={() => safeGoBack(router)} />
        <Appbar.Content title="Completed Dues" />
      </Appbar.Header>

      <FlashList
        data={groups}
        renderItem={renderGroup}
        keyExtractor={(group) => group.key}
        ListEmptyComponent={
          <EmptyState
            icon="check-circle-outline"
            title="No completed dues"
            subtitle="Completed scheduled dues will appear here"
          />
        }
        contentContainerStyle={{ padding: 16 }}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}
