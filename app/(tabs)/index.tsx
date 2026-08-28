import { View, TouchableOpacity, Platform } from "react-native";
import { FlashList } from "@shopify/flash-list";
import { FAB, Text, Card, IconButton } from "react-native-paper";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import { useRouter, useFocusEffect } from "expo-router";
import { useCallback, useMemo } from "react";
import { startOfWeek, endOfWeek, isWithinInterval } from "date-fns";
import { useThemeData } from "../../context/ThemeContext";
import { useAuth } from "../../context/AuthContext";
import { useTransactions } from "../../hooks/useTransactions";
import { useSavings } from "../../hooks/useSavings";
import { useDues } from "../../hooks/useDues";
import { useSystemAlerts } from "../../context/SystemAlertsContext";
import { useCurrencyActions } from "../../context/CurrencyContext";
import { useUserProfile } from "../../context/UserProfileContext";
import { SummaryCard } from "../../components/SummaryCard";
import { DashboardSkeleton } from "../../components/SkeletonLoader";
import { CloudLinkBanner } from "../../components/CloudLinkBanner";
import { SmartInsights } from "../../components/SmartInsights";
import { Transaction } from "../../types";
import EmptyState from "../../components/EmptyState";


export default function Dashboard() {
  const router = useRouter();
  const { profile, isLoading: profileLoading } = useUserProfile();
  const { transactions, loading: txLoading, refetch: refetchTx } = useTransactions();
  const { items: savingsItems, refetch: refetchSavings } = useSavings();
  const { dues, refetch: refetchDues } = useDues();
  const { unreadCount, refetchAlerts } = useSystemAlerts();
  const { formatAmount } = useCurrencyActions();
  const { theme } = useThemeData();
  const weekRange = useMemo(() => {
    const now = new Date();
    return { start: startOfWeek(now, { weekStartsOn: 1 }), end: endOfWeek(now, { weekStartsOn: 1 }) };
  }, []);
  const pendingDues = useMemo(
    () => dues
      .filter((d) => {
        if (d.completed) return false;
        const dueDate = new Date(d.date);
        return isWithinInterval(dueDate, { start: weekRange.start, end: weekRange.end });
      })
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()),
    [dues, weekRange]
  );
  const { activeUserId } = useAuth();

  const loading = txLoading;

  useFocusEffect(
    useCallback(() => {
      if (activeUserId) {
        refetchTx();
        refetchSavings();
        refetchDues();
        refetchAlerts();
      }
    }, [activeUserId, refetchTx, refetchSavings, refetchDues, refetchAlerts])
  );

  const totalBadgeCount = useMemo(() => pendingDues.length + unreadCount, [pendingDues.length, unreadCount]);

  const now = useMemo(() => new Date(), []);
  const weekFromNow = useMemo(() => {
    const d = new Date(now);
    d.setDate(now.getDate() + 7);
    return d;
  }, [now]);

  const upcomingDues = useMemo(
    () => dues
      .filter((d) => !d.completed)
      .filter((d) => {
        const dDate = new Date(d.date);
        return dDate >= now && dDate <= weekFromNow;
      })
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()),
    [dues, now, weekFromNow]
  );

  const totalExpenses = useMemo(
    () => upcomingDues.filter((d) => d.type === "expense").reduce((s, d) => s + d.amount, 0),
    [upcomingDues]
  );

  const totalIncome = useMemo(
    () => upcomingDues.filter((d) => d.type === "income").reduce((s, d) => s + d.amount, 0),
    [upcomingDues]
  );

  const transactionData = useMemo(() => {
    const sorted = [...transactions].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    return sorted.slice(0, 6);
  }, [transactions]);

  const renderTransactionItem = useCallback(
    ({ item }: { item: Transaction }) => (
      <TouchableOpacity
        onPress={() => router.push(`/transaction-details?id=${item.id}`)}
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
            name={
              ({
                cash: "cash",
                card: "credit-card",
                bank_transfer: "bank",
                e_wallet: "wallet",
              } as Record<string, string>)[item.paymentMethod || "cash"]
            }
            size={24}
            color={theme.colors.primary}
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
    ),
    [theme, router, formatAmount]
  );

  const ListHeader = useCallback(() => (
    <View>
      <CloudLinkBanner />

      <View style={{ marginTop: 8 }}>
        <SummaryCard transactions={transactions} goals={savingsItems} />
      </View>

      <View style={{ paddingHorizontal: 16 }}>
        <SmartInsights />
      </View>

      {upcomingDues.length > 0 && (
        <TouchableOpacity onPress={() => router.push("/dues")} style={{ marginTop: 2, paddingHorizontal: 16 }}>
          <Card style={{ backgroundColor: theme.colors.surfaceVariant, borderRadius: 16 }}>
            <Card.Content>
              <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 8 }}>
                <MaterialCommunityIcons name="calendar-clock" size={20} color={theme.colors.primary} />
                <Text variant="titleSmall" style={{ fontWeight: "700", marginLeft: 8 }}>Next 7 Days</Text>
              </View>
              <Text variant="bodyMedium">
                {upcomingDues.length} due{upcomingDues.length > 1 ? "s" : ""}: {formatAmount(totalExpenses)} in expenses
                {totalIncome > 0 ? `, ${formatAmount(totalIncome)} in income` : ""}
              </Text>
              <Text variant="labelSmall" style={{ color: theme.colors.outline, marginTop: 4 }}>Tap to view all dues</Text>
            </Card.Content>
          </Card>
        </TouchableOpacity>
      )}

      <View style={{ flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", paddingHorizontal: 16, marginTop: 20 }}>
        {[
          { label: "Scheduled", icon: "calendar-check-outline", path: "/dues" },
          { label: "Allocations", icon: "piggy-bank-outline", path: "/savings" },
        ].map((item) => (
          <TouchableOpacity
            key={item.path}
            onPress={() => router.push(item.path as "/dues" | "/savings")}
            style={{ width: "23%", alignItems: "center", marginBottom: 16 }}
          >
            <View style={{
              width: 56,
              height: 56,
              borderRadius: 18,
              backgroundColor: theme.colors.surface,
              justifyContent: "center",
              alignItems: "center",
              marginBottom: 8,
              ...Platform.select({
                web: { boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.05)' },
                default: {
                  shadowColor: "#000",
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.05,
                  shadowRadius: 4,
                  elevation: 2
                }
              })
            }}>
              <MaterialCommunityIcons name={item.icon as string} size={26} color={theme.colors.primary} />
            </View>
            <Text variant="labelSmall" style={{ fontWeight: "600", color: theme.colors.onSurfaceVariant }}>{item.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12, marginTop: 16, paddingHorizontal: 20 }}>
        <Text variant="titleMedium" style={{ fontWeight: "700", color: theme.colors.onBackground }}>Recent Activity</Text>
        <TouchableOpacity onPress={() => router.push("/reports")}>
          <Text variant="labelLarge" style={{ color: theme.colors.primary, fontWeight: "600" }}>See All</Text>
        </TouchableOpacity>
      </View>
    </View>
  ), [theme, transactions, savingsItems, router, formatAmount, upcomingDues, totalExpenses, totalIncome]);

  if (!activeUserId) return null;

  if (profileLoading || (loading && transactions.length === 0)) {
    return <DashboardSkeleton />;
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <View style={{ paddingTop: 60, paddingHorizontal: 20, backgroundColor: theme.colors.background, paddingBottom: 16 }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <View>
            <Text variant="labelSmall" style={{ color: theme.colors.outline, letterSpacing: 1 }}>HELLO,</Text>
            <Text variant="titleLarge" style={{ fontWeight: "700" }}>{profile?.name || "User"}</Text>
          </View>
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <View style={{ position: "relative" }}>
              <IconButton
                icon="bell-outline"
                size={24}
                onPress={() => router.push("/notifications")}
              />
              {totalBadgeCount > 0 && (
                <View
                  pointerEvents="none"
                  style={{
                    position: "absolute",
                    top: 4,
                    right: 4,
                    backgroundColor: theme.colors.error,
                    borderRadius: 10,
                    width: 18,
                    height: 18,
                    justifyContent: "center",
                    alignItems: "center",
                  }}
                >
                  <Text style={{ color: "#fff", fontSize: 10, fontWeight: "700" }}>
                    {totalBadgeCount}
                  </Text>
                </View>
              )}
            </View>
          </View>
        </View>
      </View>

      <FlashList
        data={transactionData}
        renderItem={renderTransactionItem}
        keyExtractor={(item: Transaction) => item.id}
        ListHeaderComponent={ListHeader}
        ListEmptyComponent={<EmptyState icon="receipt" title="No transactions yet" subtitle="Tap + to add your first transaction" />}
        contentContainerStyle={{ paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      />

      <FAB
        icon="plus"
        label="Record"
        style={{ position: "absolute", margin: 20, right: 0, bottom: 20, borderRadius: 20, backgroundColor: theme.colors.primary }}
        color="#fff"
        onPress={() => router.push("/add-transaction")}
      />
    </View>
  );
}
