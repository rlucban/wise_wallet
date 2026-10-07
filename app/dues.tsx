import { useState, useEffect, useCallback, useMemo } from "react";
import { View } from "react-native";
import { FlashList } from "@shopify/flash-list";
import { Appbar, Text, Card, FAB, Portal, Modal, TextInput, Button, Checkbox, useTheme, Chip, IconButton, SegmentedButtons, Dialog } from "react-native-paper";
import { useRouter, useFocusEffect } from "expo-router";
import { safeGoBack } from "../utils/backNavigation";
import { Calendar } from "react-native-calendars";
import { useCurrencyActions } from "../context/CurrencyContext";
import { useDues } from "../hooks/useDues";
import { useTransactions, useTransactionsActions } from "../hooks/useTransactions";
import { useUserProfile } from "../context/UserProfileContext";
import { useCategoriesData } from "../context/CategoriesContext";
import { Due, DueFrequency, PaymentMethodInfo } from "../types";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import EmptyState from "../components/EmptyState";
import ConfirmDialog from "../components/ConfirmDialog";
import { ListRowsSkeleton } from "../components/SkeletonLoader";
import { scheduleDueNotifications } from "../utils/notifications";
import { getTimeOfMonthTip, getRecurringProjectionMessage, isOverdue } from "../utils/financialLiteracy";
import { ensureOthersOption } from "../utils/categoryOptions";
import { formatNumberInput, parseAmount } from "../utils/amount";
import { OPENING_BALANCE_CATEGORY_ID } from "../utils/onboardingPayload";
import { authFetch } from "../utils/apiClient";
import { useSavings } from "../hooks/useSavings";

const FREQUENCY_LABELS: Record<DueFrequency, string> = {
  once: "Once",
  weekly: "Weekly",
  biweekly: "Biweekly",
  monthly: "Monthly",
  yearly: "Yearly",
};

// SPEC-47 fallback: used when the paymentMethods API is unreachable (Local/offline).
// "Unknown" is the honest sentinel — it passes non-empty validation without asserting a false method.
const FALLBACK_PAY_METHODS: PaymentMethodInfo[] = [
  { id: "cash", name: "Cash", type: "cash" },
  { id: "unknown", name: "Unknown", type: "other" },
];

type ListItem =
  | { kind: "upcoming-header" }
  | { kind: "due"; item: Due };

export default function DuesScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { formatAmount } = useCurrencyActions();
  const { dues, loading, addDue, updateDue, deleteDue, refetch } = useDues();
  const { addTransaction } = useTransactionsActions();
  const { transactions } = useTransactions();
  const { categories } = useCategoriesData();
  const { profile } = useUserProfile();
  const initialBalance = profile?.initialBalance ?? 0;
  const { items: savingsItems } = useSavings();

  const [filter, setFilter] = useState<"week" | "month" | "all">("week");
  const [modalVisible, setModalVisible] = useState(false);
  const [editingDue, setEditingDue] = useState<Due | null>(null);
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [type, setType] = useState<"expense" | "income">("expense");
  const [frequency, setFrequency] = useState<DueFrequency>("once");
  const [autoProcess, setAutoProcess] = useState(false);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | undefined>(undefined);
  const [customCategory, setCustomCategory] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<Due | null>(null);
  const [alertDialog, setAlertDialog] = useState<{ visible: boolean; title: string; message: string }>({
    visible: false,
    title: "",
    message: "",
  });
  const [payTarget, setPayTarget] = useState<Due | null>(null);
  const [payMethods, setPayMethods] = useState<PaymentMethodInfo[]>(FALLBACK_PAY_METHODS);
  const [payMethod, setPayMethod] = useState("Cash");
  const [payBusy, setPayBusy] = useState(false);

  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [refetch])
  );

  useEffect(() => {
    if (dues.length > 0) {
      scheduleDueNotifications(dues).catch((e) => {
        console.warn("Failed to reschedule notifications:", e);
      });
    }
  }, [dues]);

  useEffect(() => {
    if (frequency === "once") {
      setAutoProcess(false);
    }
  }, [frequency]);

  const categoryOptions = useMemo(() => ensureOthersOption(categories, type), [categories, type]);
  const othersCategory = useMemo(() => categoryOptions.find((c) => c.name === "Others"), [categoryOptions]);
  const isOthersSelected = !!othersCategory && selectedCategoryId === othersCategory.id;

  const now = useMemo(() => new Date(), []);
  const startOfWeek = useMemo(() => {
    const d = new Date(now);
    d.setDate(now.getDate() - now.getDay());
    return d;
  }, [now]);
  const endOfWeek = useMemo(() => {
    const d = new Date(startOfWeek);
    d.setDate(startOfWeek.getDate() + 6);
    return d;
  }, [startOfWeek]);
  const startOfMonth = useMemo(() => new Date(now.getFullYear(), now.getMonth(), 1), [now]);
  const endOfMonth = useMemo(() => new Date(now.getFullYear(), now.getMonth() + 1, 0), [now]);

  const filteredUpcomingDues = useMemo(() => {
    const upcoming = dues.filter((d) => !d.completed).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    if (filter === "week") {
      return upcoming.filter((d) => {
        const dDate = new Date(d.date);
        return dDate >= startOfWeek && dDate <= endOfWeek;
      });
    }
    if (filter === "month") {
      return upcoming.filter((d) => {
        const dDate = new Date(d.date);
        return dDate >= startOfMonth && dDate <= endOfMonth;
      });
    }
    return upcoming;
  }, [dues, filter, startOfWeek, endOfWeek, startOfMonth, endOfMonth]);

  const weekTotal = useMemo(() => {
    return dues
      .filter((d) => !d.completed)
      .filter((d) => {
        const dDate = new Date(d.date);
        return dDate >= startOfWeek && dDate <= endOfWeek;
      })
      .reduce((sum, d) => {
        const amount = d.type === "expense" ? d.amount : -d.amount;
        return sum + amount;
      }, 0);
  }, [dues, startOfWeek, endOfWeek]);

  const monthTotal = useMemo(() => {
    return dues
      .filter((d) => !d.completed)
      .filter((d) => {
        const dDate = new Date(d.date);
        return dDate >= startOfMonth && dDate <= endOfMonth;
      })
      .reduce((sum, d) => {
        const amount = d.type === "expense" ? d.amount : -d.amount;
        return sum + amount;
      }, 0);
  }, [dues, startOfMonth, endOfMonth]);

  const listData = useMemo<ListItem[]>(() => {
    const items: ListItem[] = [];
    if (filteredUpcomingDues.length > 0) {
      items.push({ kind: "upcoming-header" });
      filteredUpcomingDues.forEach((due) => items.push({ kind: "due", item: due }));
    }
    return items;
  }, [filteredUpcomingDues]);

  const closeModal = useCallback(() => {
    setModalVisible(false);
    setEditingDue(null);
    setTitle("");
    setAmount("");
    setDate(new Date());
    setFrequency("once");
    setAutoProcess(false);
    setSelectedCategoryId(undefined);
    setCustomCategory("");
  }, []);

  const handleEdit = useCallback((due: Due) => {
    setTitle(due.title);
    setAmount(formatNumberInput(String(due.amount)));
    setDate(new Date(due.date));
    setType(due.type || "expense");
    setFrequency(due.frequency || "once");
    setAutoProcess(!!due.autoProcess);
    setSelectedCategoryId(due.categoryId);
    setCustomCategory(due.categoryName || "");
    setEditingDue(due);
    setModalVisible(true);
  }, []);

  const handleSubmit = async () => {
    if (!title.trim()) {
      setAlertDialog({ visible: true, title: "Invalid Input", message: "Please enter a title." });
      return;
    }
    const numAmount = parseAmount(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setAlertDialog({ visible: true, title: "Invalid Amount", message: "Please enter a valid amount." });
      return;
    }
    if (numAmount > 10000000) {
      setAlertDialog({ visible: true, title: "Invalid Amount", message: "Amount must not exceed 10,000,000." });
      return;
    }
    if (isOthersSelected && !customCategory.trim()) {
      setAlertDialog({ visible: true, title: "Invalid Category", message: "Please specify a category." });
      return;
    }

    const payload = {
      title: title.trim(),
      amount: numAmount,
      date: date.toISOString(),
      type,
      frequency,
      autoProcess,
      categoryId: selectedCategoryId,
      categoryName: isOthersSelected ? customCategory.trim() : undefined,
      updatedAt: Date.now(),
    };

    try {
      if (editingDue) {
        await updateDue(editingDue.id, payload);
      } else {
        await addDue({
          ...payload,
          completed: false,
        });
      }
      closeModal();
    } catch {
      setAlertDialog({ visible: true, title: "Error", message: "Failed to save scheduled item." });
    }
  };

  const openPayDialog = useCallback(async (due: Due) => {
    setPayTarget(due);
    setPayMethod("Cash");
    try {
      const { ok, data } = await authFetch<PaymentMethodInfo[]>("paymentMethods");
      if (ok && Array.isArray(data) && data.length > 0) {
        setPayMethods(data);
        setPayMethod(data[0].name);
      } else {
        setPayMethods(FALLBACK_PAY_METHODS);
      }
    } catch {
      setPayMethods(FALLBACK_PAY_METHODS);
    }
  }, []);

  const recordTransaction = useCallback(async (item: Due, method: string) => {
    if (payBusy) return;
    setPayBusy(true);
    try {
      // Balance validation for expense transactions
      if (item.type !== "income") {

        const totalIncome = transactions
          .filter((t) => t.type === "income" && t.note !== "Initial account setup" && t.category?.id !== OPENING_BALANCE_CATEGORY_ID)
          .reduce((sum, t) => sum + Number(t.amount || 0), 0);
        const totalExpense = transactions
          .filter((t) => t.type === "expense")
          .reduce((sum, t) => sum + Number(t.amount || 0), 0);
        const totalReserved = savingsItems.reduce((sum, g) => sum + Number(g.balance || 0), 0);
        const availableBalance = initialBalance + totalIncome - totalExpense - totalReserved;

        if (item.amount > availableBalance) {
          setAlertDialog({
            visible: true,
            title: "Insufficient Balance",
            message: `Cannot pay "${item.title}". You need ${formatAmount(item.amount)}, but your Available to Spend is only ${formatAmount(availableBalance)}. Please add income first.`,
          });
          return;
        }
      }

      const dueCategory =
        (item.categoryId ? categories.find((c) => c.id === item.categoryId) : undefined) ||
        (item.categoryName
          ? { id: item.categoryId || item.title, name: item.categoryName, type: item.type || "expense", updatedAt: 0 }
          : undefined) ||
        { id: "scheduled", name: "Add Scheduled", type: item.type || "expense", updatedAt: 0 };

      await addTransaction({
        title: item.title,
        amount: item.amount,
        type: item.type || "expense",
        date: new Date().toISOString(),
        category: dueCategory,
        paymentMethod: method,
        updatedAt: Date.now(),
        dueId: item.id,
      });
      await updateDue(item.id, { completed: true });

      if (item.autoProcess === true && item.frequency && item.frequency !== "once") {
        const anchorMs = Math.max(Date.now(), new Date(item.date).getTime());
        const nextDate = new Date(anchorMs);
        switch (item.frequency) {
          case "weekly": nextDate.setDate(nextDate.getDate() + 7); break;
          case "biweekly": nextDate.setDate(nextDate.getDate() + 14); break;
          case "monthly": nextDate.setMonth(nextDate.getMonth() + 1); break;
          case "yearly": nextDate.setFullYear(nextDate.getFullYear() + 1); break;
        }
        await addDue({
          title: item.title,
          amount: item.amount,
          date: nextDate.toISOString(),
          type: item.type,
          frequency: item.frequency,
          autoProcess: item.autoProcess,
          categoryId: item.categoryId,
          categoryName: item.categoryName,
          completed: false,
          updatedAt: Date.now(),
        });
      }

       setAlertDialog({
         visible: true,
         title: "Transaction Recorded",
         message: `${item.title} (${formatAmount(item.amount)}) has been recorded successfully.`,
       });
      } catch (error) {
        console.error("Failed to record transaction:", error);
        setAlertDialog({
          visible: true,
          title: "Error",
          message: error instanceof Error && error.message ? error.message : "Failed to record transaction.",
        });
      } finally {
        setPayBusy(false);
      }
    }, [addTransaction, addDue, updateDue, categories, transactions, initialBalance, savingsItems, formatAmount, payBusy]);

   const confirmDelete = useCallback(async () => {
    if (!deleteTarget) return;
    await deleteDue(deleteTarget.id);
    setDeleteTarget(null);
  }, [deleteDue, deleteTarget]);

const renderItem = useCallback(({ item }: { item: ListItem }) => {
    if (item.kind === "upcoming-header") {
      return (
        <Text variant="titleMedium" style={{ marginBottom: 8, color: theme.colors.onSurface }}>
          Upcoming
        </Text>
      );
    }

    const due = item.item;
    const isToday = new Date(due.date).toDateString() === new Date().toDateString();
    const projection = getRecurringProjectionMessage(due, formatAmount);

    return (
      <Card style={{ marginBottom: 12, borderRadius: 16, backgroundColor: theme.colors.surface }}>
        <Card.Content>
          <View style={{ flexDirection: "column", gap: 8 }}>

            <View style={{ flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between" }}>
              <View style={{ flexDirection: "row", alignItems: "center", flex: 1, minWidth: 0 }}>
                <View style={{
                  width: 40,
                  height: 40,
                  borderRadius: 20,
                  backgroundColor: theme.colors.surfaceVariant,
                  justifyContent: "center",
                  alignItems: "center",
                  marginRight: 12,
                  flexShrink: 0,
                }}>
                  <MaterialCommunityIcons
                    name={due.type === "income" ? "arrow-up-circle" : "arrow-down-circle"}
                    size={24}
                    color={due.type === "income" ? theme.colors.primary : theme.colors.error}
                  />
                </View>

                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text variant="titleSmall" style={{ fontWeight: isToday ? "bold" : "600", color: theme.colors.onSurface }}>
                    {due.title}
                  </Text>
                  <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 2 }}>
                    {new Date(due.date).toLocaleDateString()}  {formatAmount(due.amount)}  {FREQUENCY_LABELS[due.frequency || "once"]}
                  </Text>
                </View>
              </View>

              <View style={{ flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 4, marginLeft: 8 }}>
                {isOverdue(due) && (
                  <Text
                    variant="labelSmall"
                    style={{
                      color: theme.colors.error,
                      fontWeight: "bold",
                      fontSize: 10,
                      backgroundColor: theme.colors.errorContainer,
                      paddingHorizontal: 6,
                      paddingVertical: 2,
                      borderRadius: 4,
                    }}
                  >
                    OVERDUE
                  </Text>
                )}
                {isToday && (
                  <Text
                    variant="labelSmall"
                    style={{
                      color: theme.colors.primary,
                      fontWeight: "bold",
                      fontSize: 10,
                      backgroundColor: theme.colors.primaryContainer,
                      paddingHorizontal: 6,
                      paddingVertical: 2,
                      borderRadius: 4,
                    }}
                  >
                    {due.type === "income" ? "RECEIVABLE" : "DUE"}
                  </Text>
                )}
                {due.autoProcess && (
                  <View style={{ flexDirection: "row", alignItems: "center", backgroundColor: theme.colors.surfaceVariant, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                    <MaterialCommunityIcons name="lightning-bolt" size={12} color={theme.colors.tertiary} style={{ marginRight: 2 }} />
                    <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant, fontWeight: "600", fontSize: 10 }}>AUTO-RENEW</Text>
                  </View>
                )}
              </View>
            </View>

            <View style={{ flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 4 }}>
              <Button
                mode="outlined"
                compact
                disabled={payBusy}
                onPress={() => openPayDialog(due)}
                theme={{ colors: { primary: theme.colors.primary, outline: theme.colors.primary } }}
              >
                {due.type === "income" ? "Receive" : "Pay"}
              </Button>
              <IconButton icon="pencil-outline" onPress={() => handleEdit(due)} size={20} />
              <IconButton icon="delete" onPress={() => setDeleteTarget(due)} iconColor={theme.colors.error} size={20} />
            </View>

            {projection && (
              <Text
                variant="bodySmall"
                style={{
                  color: theme.colors.onSurfaceVariant,
                  fontSize: 12,
                  marginTop: 8,
                  paddingTop: 8,
                  borderTopWidth: 1,
                  borderTopColor: theme.colors.outline,
                  lineHeight: 18,
                }}
              >
                {projection}
              </Text>
            )}

          </View>
        </Card.Content>
      </Card>
    );
  }, [theme, formatAmount, openPayDialog, handleEdit, payBusy]);

  const ListHeader = useCallback(() => (
    <View>
      <View style={{ paddingHorizontal: 16, marginBottom: 8 }}>
        <SegmentedButtons
          value={filter}
          onValueChange={(val) => setFilter(val as "week" | "month" | "all")}
          buttons={[
            { value: "week", label: "This Week" },
            { value: "month", label: "This Month" },
            { value: "all", label: "All" },
          ]}
        />
      </View>

      {filter !== "all" && (
        <View style={{ flexDirection: "row", paddingHorizontal: 16, marginBottom: 12, gap: 8 }}>
          <Card style={{ flex: 1, padding: 12, borderRadius: 12, backgroundColor: theme.colors.errorContainer }}>
            <Text variant="labelSmall" style={{ color: theme.colors.onErrorContainer, textAlign: "center" }}>
              {filter === "week" ? "Week" : "Month"} Total
            </Text>
            <Text variant="titleMedium" style={{ fontWeight: "700", textAlign: "center", color: theme.colors.onErrorContainer }}>
              {formatAmount(Math.abs(filter === "week" ? weekTotal : monthTotal))}
            </Text>
          </Card>
        </View>
      )}

      <View style={{ marginTop: 8 }} />
    </View>
  ), [filter, theme, formatAmount, weekTotal, monthTotal]);

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <Appbar.Header>
        <Appbar.BackAction onPress={() => safeGoBack(router)} />
        <Appbar.Content title="Scheduled" />
        <Appbar.Action
          icon="check-circle-outline"
          color={theme.colors.primary}
          onPress={() => router.push("/completed-dues")}
        />
      </Appbar.Header>

      {loading && listData.length === 0 ? (
        <View style={{ padding: 16 }}>
          <ListRowsSkeleton rows={5} />
        </View>
      ) : (
      <FlashList
        data={listData}
        renderItem={renderItem}
        keyExtractor={(item: ListItem, index: number) =>
          item.kind === "due" ? item.item.id : `${item.kind}-${index}`
        }
        ListHeaderComponent={ListHeader}
        ListEmptyComponent={
          <EmptyState icon="calendar-clock" title="No dues in this period" subtitle="Tap + to add a due payment" />
        }
        contentContainerStyle={{ padding: 16 }}
        showsVerticalScrollIndicator={false}
        refreshing={loading}
        onRefresh={refetch}
      />
      )}

      <Portal>
        <Modal
          visible={modalVisible}
          onDismiss={closeModal}
          contentContainerStyle={{
            backgroundColor: "transparent",
            justifyContent: "center",
            alignItems: "center",
            padding: 20,
          }}
        >
          <Card style={{ width: "100%", maxWidth: 400, borderRadius: 16, backgroundColor: theme.colors.surface }}>
            <Card.Content style={{ padding: 20 }}>
              <Text variant="titleLarge" style={{ marginBottom: 16 }}>Edit Scheduled Item</Text>

           <SegmentedButtons
             value={type}
             onValueChange={(val) => setType(val as "expense" | "income")}
             buttons={[
               {
                 value: "expense",
                 label: "Expense",
                 icon: "arrow-down",
               },
               {
                 value: "income",
                 label: "Income",
                 icon: "arrow-up",
               },
             ]}
             style={{ marginBottom: 16 }}
           />

          <Text style={{ marginBottom: 8, fontWeight: "600" }}>Frequency</Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 16 }}>
            {(["once", "weekly", "biweekly", "monthly", "yearly"] as DueFrequency[]).map((f) => (
              <Chip key={f} selected={frequency === f} onPress={() => setFrequency(f)} mode="outlined" style={{ borderRadius: 16 }}>
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </Chip>
            ))}
          </View>

          {frequency !== "once" && (
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
              <Text variant="bodyLarge">Auto-renew</Text>
              <Checkbox status={autoProcess ? "checked" : "unchecked"} onPress={() => setAutoProcess(!autoProcess)} />
            </View>
          )}

          <TextInput label="Title" value={title} onChangeText={setTitle} mode="outlined" style={{ marginBottom: 12 }} />
          <TextInput label="Amount" value={amount} onChangeText={(t) => setAmount(formatNumberInput(t.length > 12 ? t.slice(0, 12) : t))} keyboardType="numeric" mode="outlined" style={{ marginBottom: 12 }} left={<TextInput.Affix text="₱" />} />

           <TextInput
             label="Date"
             value={date.toLocaleDateString()}
             mode="outlined"
             editable={false}
             right={<TextInput.Icon icon="calendar" onPress={() => setShowDatePicker(true)} />}
             style={{ marginBottom: 8 }}
           />

<Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, fontStyle: "italic", marginBottom: 16 }}>
              {getTimeOfMonthTip(date).title}: {getTimeOfMonthTip(date).message}
            </Text>

          <Text style={{ marginBottom: 8, fontWeight: "600" }}>Category (Optional)</Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: isOthersSelected ? 8 : 16 }}>
            {categoryOptions.map((cat) => (
              <Chip
                key={cat.id}
                selected={selectedCategoryId === cat.id}
                onPress={() => setSelectedCategoryId(selectedCategoryId === cat.id ? undefined : cat.id)}
                mode="outlined"
                style={{ borderRadius: 16 }}
              >
                {cat.name}
              </Chip>
            ))}
          </View>
          {isOthersSelected && (
            <TextInput
              label="Specify Category"
              value={customCategory}
              onChangeText={setCustomCategory}
              mode="outlined"
              placeholder="e.g., Pet Care, Gym, Gifts"
              style={{ marginBottom: 16 }}
            />
          )}

        <Button mode="contained" onPress={handleSubmit} disabled={!title || !amount} buttonColor={theme.colors.primary} color={theme.colors.onPrimary}>Save Changes</Button>
            </Card.Content>
          </Card>
        </Modal>
      </Portal>

       <Portal>
          <ConfirmDialog
            visible={!!deleteTarget}
            title="Delete Scheduled Item?"
            message={
              deleteTarget
                ? `Are you sure you want to delete "${deleteTarget.title}" (${formatAmount(deleteTarget.amount)})? This action cannot be undone.`
                : ""
            }
            confirmLabel="Delete"
            onConfirm={confirmDelete}
            onCancel={() => setDeleteTarget(null)}
          />
        </Portal>

        <Portal>
          <Dialog visible={!!payTarget} onDismiss={() => setPayTarget(null)}>
            <Dialog.Title style={{ textAlign: "center" }}>
              {payTarget?.type === "income" ? `Receive "${payTarget?.title}"?` : `Pay "${payTarget?.title}"?`}
            </Dialog.Title>
            <Dialog.Content>
              <Text variant="bodyMedium" style={{ textAlign: "center", marginBottom: 12 }}>
                {payTarget ? `${payTarget.title} (${formatAmount(payTarget.amount)})` : ""}
              </Text>
              <Text variant="labelLarge" style={{ marginBottom: 8 }}>Payment Method</Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, justifyContent: "center" }}>
                {payMethods.map((m) => (
                  <Chip key={m.id} selected={payMethod === m.name} onPress={() => setPayMethod(m.name)} mode="outlined">
                    {m.name}
                  </Chip>
                ))}
              </View>
            </Dialog.Content>
            <Dialog.Actions style={{ justifyContent: "center" }}>
              <Button mode="text" onPress={() => setPayTarget(null)}>Cancel</Button>
              <Button
                mode="contained"
                disabled={!payTarget || payBusy}
                onPress={() => {
                  if (!payTarget) return;
                  const due = payTarget;
                  const method = payMethod;
                  setPayTarget(null);
                  recordTransaction(due, method);
                }}
              >
                Confirm
              </Button>
            </Dialog.Actions>
          </Dialog>
        </Portal>

       <Portal>
         <Dialog visible={alertDialog.visible} onDismiss={() => setAlertDialog((prev) => ({ ...prev, visible: false }))}>
           <Dialog.Icon icon={alertDialog.title === "Error" || alertDialog.title === "Insufficient Balance" ? "alert-circle-outline" : "check-circle-outline"} />
           <Dialog.Title style={{ textAlign: "center" }}>{alertDialog.title}</Dialog.Title>
           <Dialog.Content>
             <Text variant="bodyMedium" style={{ textAlign: "center", lineHeight: 22 }}>
               {alertDialog.message}
             </Text>
           </Dialog.Content>
           <Dialog.Actions style={{ justifyContent: "center" }}>
             <Button mode="contained" onPress={() => setAlertDialog((prev) => ({ ...prev, visible: false }))}>
               OK
             </Button>
           </Dialog.Actions>
         </Dialog>
       </Portal>

       <Portal>
         <Modal
           visible={showDatePicker}
           onDismiss={() => setShowDatePicker(false)}
           contentContainerStyle={{
             backgroundColor: "transparent",
             justifyContent: "center",
             alignItems: "center",
           }}
         >
<Card style={{ width: "90%", borderRadius: 24, padding: 16, elevation: 10, backgroundColor: theme.colors.surface }}>
              <Text variant="titleMedium" style={{ marginBottom: 16, fontWeight: "700", textAlign: "center", color: theme.colors.onSurface }}>
                Select Due Date
              </Text>
              <Calendar
                current={date.toISOString().split('T')[0]}
                onDayPress={(day) => {
                  setDate(new Date(day.timestamp));
                  setShowDatePicker(false);
                }}
                markedDates={{
                  [date.toISOString().split('T')[0]]: { selected: true, selectedColor: theme.colors.primary }
                }}
                theme={{
                  backgroundColor: theme.colors.surface,
                  calendarBackground: theme.colors.surface,
                  textSectionTitleColor: theme.colors.primary,
                  selectedDayBackgroundColor: theme.colors.primary,
                  selectedDayTextColor: theme.colors.onPrimary,
                  todayTextColor: theme.colors.primary,
                  dayTextColor: theme.colors.onSurface,
                  textDisabledColor: theme.colors.surfaceVariant,
                  dotColor: theme.colors.primary,
                  selectedDotColor: theme.colors.onPrimary,
                  arrowColor: theme.colors.primary,
                  disabledArrowColor: theme.colors.surfaceVariant,
                  monthTextColor: theme.colors.onSurface,
                  indicatorColor: theme.colors.primary,
                  textDayFontWeight: '300',
                  textMonthFontWeight: '700',
                  textDayHeaderFontWeight: '300',
                  textDayFontSize: 16,
                  textMonthFontSize: 18,
                  textDayHeaderFontSize: 14
                }}
              />
             <Button
               mode="text"
               onPress={() => setShowDatePicker(false)}
               style={{ marginTop: 16 }}
             >
               Close
             </Button>
           </Card>
         </Modal>
       </Portal>

<FAB
           icon="plus"
           label="Due"
            style={{ position: "absolute", margin: 20, right: 0, bottom: 20, borderRadius: 20, backgroundColor: theme.colors.primary }}
            color={theme.colors.onPrimary}
           onPress={() => router.push("/add-due")}
         />
    </View>
  );
}
