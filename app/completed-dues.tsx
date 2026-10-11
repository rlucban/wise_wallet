import { useCallback, useMemo } from "react";
import { View } from "react-native";
import { FlashList } from "@shopify/flash-list";
import { Appbar, Text, Card, useTheme } from "react-native-paper";
import { useRouter, useFocusEffect } from "expo-router";
import { safeGoBack } from "../utils/backNavigation";
import { useDues } from "../hooks/useDues";
import { useCurrencyActions } from "../context/CurrencyContext";
import { Due } from "../types";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import EmptyState from "../components/EmptyState";
import { ListRowsSkeleton } from "../components/SkeletonLoader";

export default function CompletedDuesScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { dues, loading, refetch } = useDues();
  const { formatAmount } = useCurrencyActions();

  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [refetch])
  );

  const completedDues = useMemo(() => {
    return dues.filter((d) => d.completed).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [dues]);

  const totalCompletedAmount = useMemo(() => {
    return completedDues.reduce((sum, d) => sum + Number(d.amount || 0), 0);
  }, [completedDues]);

  const renderItem = useCallback(
    ({ item }: { item: Due }) => (
      <Card
        key={item.id}
        style={{
          marginBottom: 12,
          borderRadius: 16,
          backgroundColor: theme.colors.surface,
          opacity: 0.9,
        }}
      >
        <Card.Content>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
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
                    textDecorationLine: "line-through",
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
        </Card.Content>
      </Card>
    ),
    [theme, formatAmount]
  );

  const ListHeader = useCallback(
    () => (
      <View style={{ marginBottom: 12 }}>
        {completedDues.length > 0 && (
          <Card
            style={{
              padding: 16,
              borderRadius: 16,
              backgroundColor: theme.colors.primaryContainer,
              marginBottom: 4,
            }}
          >
            <Text variant="labelMedium" style={{ color: theme.colors.onPrimaryContainer, textAlign: "center" }}>
              TOTAL COMPLETED
            </Text>
            <Text
              variant="headlineMedium"
              style={{ fontWeight: "800", textAlign: "center", color: theme.colors.onPrimaryContainer }}
            >
              {formatAmount(totalCompletedAmount)}
            </Text>
          </Card>
        )}
      </View>
    ),
    [completedDues.length, totalCompletedAmount, theme, formatAmount]
  );

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <Appbar.Header>
        <Appbar.BackAction onPress={() => safeGoBack(router)} />
        <Appbar.Content title="Completed Dues" />
      </Appbar.Header>

      {loading && completedDues.length === 0 ? (
        <View style={{ padding: 16 }}>
          <ListRowsSkeleton rows={5} />
        </View>
      ) : (
      <FlashList
        data={completedDues}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={ListHeader}
        refreshing={loading}
        onRefresh={refetch}
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
      )}
    </View>
  );
}
