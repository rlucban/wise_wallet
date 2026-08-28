import React, { useState, useCallback, useMemo } from "react";
import { View, TouchableOpacity, Platform } from "react-native";
import { FlashList } from "@shopify/flash-list";
import { Appbar, Text, Menu, Badge } from "react-native-paper";
import { useRouter, useFocusEffect } from "expo-router";
import { format, isToday } from "date-fns";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import { Due, SystemAlert } from "../types";
import { useDues } from "../hooks/useDues";
import { useSystemAlerts } from "../context/SystemAlertsContext";
import { useCurrencyActions } from "../context/CurrencyContext";
import { useThemeData } from "../context/ThemeContext";
import EmptyState from "../components/EmptyState";

type NotificationItem =
  | { type: "system_alert"; data: SystemAlert }
  | { type: "due"; data: Due };

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
  const { alerts, refetchAlerts, markAsRead, markAllAsRead, clearAlerts } = useSystemAlerts();
  const { formatAmount } = useCurrencyActions();
  const [menuVisible, setMenuVisible] = useState(false);

  useFocusEffect(
    useCallback(() => {
      refetchDues();
      refetchAlerts();
    }, [refetchDues, refetchAlerts])
  );

  const notificationItems = useMemo<NotificationItem[]>(() => {
    const systemItems: NotificationItem[] = alerts.map((a) => ({
      type: "system_alert",
      data: a,
    }));

    const dueItems: NotificationItem[] = dues
      .filter((d) => !d.completed)
      .map((d) => ({
        type: "due",
        data: d,
      }));

    return [...systemItems, ...dueItems].sort((a, b) => {
      const timeA = a.type === "system_alert" ? new Date(a.data.date).getTime() : new Date(a.data.date).getTime();
      const timeB = b.type === "system_alert" ? new Date(b.data.date).getTime() : new Date(b.data.date).getTime();
      return timeB - timeA;
    });
  }, [alerts, dues]);

  const renderItem = useCallback(
    ({ item }: { item: NotificationItem }) => {
      if (item.type === "system_alert") {
        const alert = item.data;
        const formattedDate = formatDueDate(alert.date);

        return (
          <TouchableOpacity
            onPress={() => {
              if (!alert.read) {
                markAsRead(alert.id);
              }
            }}
            activeOpacity={0.7}
            style={{
              backgroundColor: alert.read ? theme.colors.surface : theme.colors.errorContainer + "33",
              borderRadius: 16,
              padding: 16,
              marginBottom: 12,
              marginHorizontal: 16,
              flexDirection: "row",
              alignItems: "center",
              borderWidth: alert.read ? 0 : 1,
              borderColor: theme.colors.error,
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
                backgroundColor: "#DC2626",
                justifyContent: "center",
                alignItems: "center",
                marginRight: 16,
              }}
            >
              <MaterialCommunityIcons name="alert-circle" size={24} color="#FFFFFF" />
            </View>

            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                <Text
                  variant="bodyMedium"
                  style={{
                    fontWeight: "700",
                    color: theme.colors.error,
                    fontSize: 14,
                  }}
                >
                  {alert.title}
                </Text>
                {!alert.read && <Badge size={8} style={{ backgroundColor: theme.colors.error }} />}
              </View>

              <Text
                variant="bodySmall"
                style={{
                  color: theme.colors.onSurface,
                  marginTop: 4,
                  fontSize: 13,
                  lineHeight: 18,
                }}
              >
                {alert.message}
              </Text>

              <Text
                variant="bodySmall"
                style={{
                  color: theme.colors.outline,
                  marginTop: 6,
                  fontSize: 11,
                }}
              >
                {formattedDate}
              </Text>
            </View>
          </TouchableOpacity>
        );
      }

      const due = item.data;
      const badge = getCategoryBadge(due.categoryName, due.title);
      const title = formatDueTitle(due, formatAmount);
      const formattedDate = formatDueDate(due.date);

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
    [theme, router, formatAmount, markAsRead]
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
              markAllAsRead();
            }}
            title="Mark All System Alerts as Read"
          />
          <Menu.Item
            onPress={() => {
              setMenuVisible(false);
              clearAlerts();
            }}
            title="Clear System Alerts"
          />
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
        data={notificationItems}
        renderItem={renderItem}
        keyExtractor={(item: NotificationItem) =>
          item.type === "system_alert" ? `alert_${item.data.id}` : `due_${item.data.id}`
        }
        ListEmptyComponent={
          <EmptyState
            icon="bell-outline"
            title="No notifications"
            subtitle="You're all caught up on alerts and dues!"
          />
        }
        contentContainerStyle={{ paddingTop: 16, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}
