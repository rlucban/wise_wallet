import React, { useState, useCallback, useMemo } from "react";
import { View, TouchableOpacity, Platform } from "react-native";
import { FlashList } from "@shopify/flash-list";
import { Appbar, Text, Menu } from "react-native-paper";
import { useRouter, useFocusEffect } from "expo-router";
import { format, isToday } from "date-fns";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import { Due } from "../types";
import { useDues } from "../hooks/useDues";
import { useCurrencyActions } from "../context/CurrencyContext";
import { useThemeData } from "../context/ThemeContext";
import EmptyState from "../components/EmptyState";

const getCategoryBadge = (categoryName?: string, title?: string): { color: string; icon: string } => {
  const cat = (categoryName ?? "").toLowerCase();
  const t = (title ?? "").toLowerCase();

  if (cat.includes("transport") || t.includes("transport") || cat.includes("car") || cat.includes("gas")) {
    return { color: "#8B5CF6", icon: "car" };
  }
  if (
    cat.includes("food") ||
    t.includes("food") ||
    cat.includes("dining") ||
    cat.includes("restaurant") ||
    cat.includes("grocer") ||
    cat.includes("utensil")
  ) {
    return { color: "#10B981", icon: "silverware-fork-knife" };
  }
  if (
    cat.includes("bill") ||
    cat.includes("ipon") ||
    cat.includes("reminder") ||
    cat.includes("utility") ||
    cat.includes("electric") ||
    cat.includes("water") ||
    cat.includes("rent") ||
    cat.includes("dues") ||
    t.includes("bill") ||
    t.includes("ipon") ||
    t.includes("reminder")
  ) {
    return { color: "#F97316", icon: "receipt" };
  }
  if (
    cat.includes("offer") ||
    t.includes("offer") ||
    cat.includes("deal") ||
    t.includes("deal") ||
    cat.includes("tag") ||
    t.includes("tag")
  ) {
    return { color: "#3B82F6", icon: "tag" };
  }
  return { color: "#3B82F6", icon: "bell" };
};

const formatDueTitle = (due: Due, formatAmount: (val: number) => string) => {
  const dDate = new Date(due.date);
  const isDueToday = isToday(dDate);
  const formattedAmount = formatAmount(due.amount);

  if (isDueToday) {
    return `Reminder: ${due.title} due today (${formattedAmount})`;
  }
  return `Reminder: ${due.title} (${formattedAmount})`;
};

const formatDueDate = (dateStr: string) => {
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return dateStr;
  return format(date, "MMM dd, yyyy");
};

export default function NotificationsScreen() {
  const router = useRouter();
  const { theme } = useThemeData();
  const { dues, refetch: refetchDues } = useDues();
  const { formatAmount } = useCurrencyActions();
  const [menuVisible, setMenuVisible] = useState(false);

  useFocusEffect(
    useCallback(() => {
      refetchDues();
    }, [refetchDues])
  );

  const pendingDues = useMemo(
    () =>
      dues
        .filter((d) => !d.completed)
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()),
    [dues]
  );

  const renderItem = useCallback(
    ({ item }: { item: Due }) => {
      const badge = getCategoryBadge(item.categoryName, item.title);
      const title = formatDueTitle(item, formatAmount);
      const formattedDate = formatDueDate(item.date);

      return (
        <TouchableOpacity
          onPress={() => router.push("/dues")}
          activeOpacity={0.7}
          style={{
            backgroundColor: theme.colors.surface,
            borderRadius: 16,
            padding: 16,
            marginBottom: 12,
            marginHorizontal: 16,
            flexDirection: "row",
            alignItems: "center",
            ...Platform.select({
              web: { boxShadow: '0px 1px 2px rgba(0, 0, 0, 0.05)' },
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
              backgroundColor: badge.color,
              justifyContent: "center",
              alignItems: "center",
              marginRight: 16,
            }}
          >
            <MaterialCommunityIcons name={badge.icon} size={24} color="#FFFFFF" />
          </View>

          <View style={{ flex: 1 }}>
            <Text
              variant="bodyMedium"
              style={{
                fontWeight: "700",
                color: theme.colors.onSurface,
                fontSize: 14,
              }}
              numberOfLines={2}
            >
              {title}
            </Text>
            <Text
              variant="bodySmall"
              style={{
                color: theme.colors.outline,
                marginTop: 4,
                fontSize: 12,
              }}
            >
              {formattedDate}
            </Text>
          </View>
        </TouchableOpacity>
      );
    },
    [theme, router, formatAmount]
  );

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <Appbar.Header elevated style={{ backgroundColor: theme.colors.surface }}>
        <Appbar.BackAction onPress={() => router.back()} />
        <Appbar.Content
          title="Notifications"
          titleStyle={{ fontSize: 20, fontWeight: "700" }}
        />
        <Menu
          visible={menuVisible}
          onDismiss={() => setMenuVisible(false)}
          anchor={
            <Appbar.Action
              icon="dots-vertical"
              onPress={() => setMenuVisible(true)}
            />
          }
        >
          <Menu.Item
            onPress={() => {
              setMenuVisible(false);
              router.push("/dues");
            }}
            title="Manage Dues"
          />
        </Menu>
      </Appbar.Header>

      <FlashList
        data={pendingDues}
        renderItem={renderItem}
        keyExtractor={(item: Due) => item.id}
        estimatedItemSize={76}
        ListEmptyComponent={
          <EmptyState
            icon="bell-outline"
            title="No notifications"
            subtitle="You're all caught up on your dues!"
          />
        }
        contentContainerStyle={{ paddingTop: 16, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}
