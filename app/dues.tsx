import { useState, useEffect, useCallback, useMemo } from "react";
import { View, Alert } from "react-native";
import { FlashList } from "@shopify/flash-list";
import { Appbar, Text, Card, FAB, Portal, Modal, TextInput, Button, Checkbox, useTheme, Chip, IconButton, SegmentedButtons } from "react-native-paper";
import { useRouter, useFocusEffect } from "expo-router";
import { Calendar } from "react-native-calendars";
import { useCurrencyActions } from "../context/CurrencyContext";
import { useDues } from "../hooks/useDues";
import { useTransactionsActions } from "../hooks/useTransactions";
import { useCategoriesData } from "../context/CategoriesContext";
import { Due, DueFrequency } from "../types";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import EmptyState from "../components/EmptyState";
import ConfirmDialog from "../components/ConfirmDialog";
import { scheduleDueNotifications } from "../utils/notifications";
import { getTimeOfMonthTip, getRecurringProjectionMessage, isOverdue } from "../utils/financialLiteracy";
import { ensureOthersOption } from "../utils/categoryOptions";
import { formatNumberInput, parseAmount } from "../utils/amount";

const FREQUENCY_LABELS: Record<DueFrequency, string> = {
  once: "Once",
  weekly: "Weekly",
  biweekly: "Biweekly",
  monthly: "Monthly",
  yearly: "Yearly",
};

type ListItem =
  | { kind: "upcoming-header" }
  | { kind: "completed-header" }
  | { kind: "due"; item: Due; section: "upcoming" | "completed" };

export default function DuesScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { formatAmount } = useCurrencyActions();
  const { dues, addDue, updateDue, deleteDue, refetch } = useDues();
  const { addTransaction } = useTransactionsActions();
  const { categories } = useCategoriesData();

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

  const filteredDues = useMemo(() => {
    const upcoming = dues.filter((d) => !d.completed).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const completed = dues.filter((d) => d.completed);

    const filterByDate = (items: Due[]) => {
      if (filter === "week") {
        return items.filter((d) => {
          const dDate = new Date(d.date);
          return dDate >= startOfWeek && dDate <= endOfWeek;
        });
      }
      if (filter === "month") {
        return items.filter((d) => {
          const dDate = new Date(d.date);
          return dDate >= startOfMonth && dDate <= endOfMonth;
        });
      }
      return items;
    };

    return {
      upcoming: filterByDate(upcoming),
      completed: filterByDate(completed),
    };
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
    if (filteredDues.upcoming.length > 0) {
      items.push({ kind: "upcoming-header" });
      filteredDues.upcoming.forEach((due) => items.push({ kind: "due", item: due, section: "upcoming" }));
    }
    if (filteredDues.completed.length > 0) {
      items.push({ kind: "completed-header" });
      filteredDues.completed.forEach((due) => items.push({ kind: "due", item: due, section: "completed" }));
    }
    return items;
  }, [filteredDues]);

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

  const openAddModal = useCallback(() => {
    setEditingDue(null);
    setTitle("");
    setAmount("");
    setDate(new Date());
    setFrequency("once");
    setAutoProcess(false);
    setSelectedCategoryId(undefined);
    setCustomCategory("");
    setModalVisible(true);
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

  const handleToggleCompleted = useCallback(async (due: Due) => {
    await updateDue(due.id, { completed: !due.completed, updatedAt: Date.now() });
  }, [updateDue]);

  const handleSubmit = async () => {
    if (!title) return;
    const numAmount = parseAmount(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      Alert.alert("Invalid Amount", "Please enter a valid amount.");
      return;
    }
    if (isOthersSelected && !customCategory.trim()) {
      Alert.alert("Invalid Category", "Please specify a category.");
      return;
    }

    const payload = {
      title,
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
      Alert.alert("Error", "Failed to save scheduled item.");
    }
  };

  const recordTransaction = useCallback(async (item: Due) => {
    try {
      const dueCategory =
        (item.categoryId ? categories.find((c) => c.id === item.categoryId) : undefined) ||
        (item.categoryName
          ? { id: item.categoryId || item.title, name: item.categoryName, type: item.type || "expense", updatedAt: 0 }
          : undefined) ||
        categories.find((c) => c.type === (item.type || "expense")) ||
        { id: "8", name: "Others", type: "expense", updatedAt: 0 };

      await addTransaction({
        title: item.title,
        amount: item.amount,
        type: item.type || "expense",
        date: new Date().toISOString(),
        category: dueCategory,
        updatedAt: Date.now(),
      });
      await updateDue(item.id, { completed: true });

      if (item.frequency && item.frequency !== "once") {
        const nextDate = new Date(item.date);
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

       Alert.alert("Recorded", "Transaction recorded successfully.");
     } catch (error) {
       console.error("Failed to record transaction:", error);
     }
   }, [addTransaction, addDue, updateDue, categories]);

   const confirmDelete = useCallback(async () => {
    if (!deleteTarget) return;
    await deleteDue(deleteTarget.id);
    setDeleteTarget(null);
  }, [deleteDue, deleteTarget]);

  const renderItem = useCallback(({ item }: { item: ListItem }) => {
    if (item.kind === "upcoming-header") {
      return (
        <Text variant="titleMedium" style={{ marginBottom: 8 }}>
          Upcoming
        </Text>
      );
    }
    if (item.kind === "completed-header") {
      return (
        <Text variant="titleMedium" style={{ marginBottom: 8, marginTop: 16 }}>
          Completed
        </Text>
      );
    }

    const due = item.item;
    const isToday = new Date(due.date).toDateString() === new Date().toDateString();

    if (item.section === "upcoming") {
      return (
        <Card style={{ marginBottom: 12, borderRadius: 16 }}>
          <Card.Content>
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <View style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                backgroundColor: theme.colors.surfaceVariant,
                justifyContent: "center",
                alignItems: "center",
                marginRight: 12,
              }}>
                <MaterialCommunityIcons
                  name={due.type === "income" ? "arrow-up-circle" : "arrow-down-circle"}
                  size={24}
                  color={due.type === "income" ? "#2E7D32" : "#D32F2F"}
                />
              </View>

              <View style={{ flex: 1 }}>
                <Text variant="titleSmall" style={{ fontWeight: isToday ? "bold" : "600" }}>
                  {due.title}
                </Text>
                <Text variant="bodySmall" style={{ color: theme.colors.outline, marginTop: 2 }}>
                  {new Date(due.date).toLocaleDateString()}  {formatAmount(due.amount)}  {FREQUENCY_LABELS[due.frequency || "once"]}
                </Text>
                {getRecurringProjectionMessage(due, formatAmount) && (
                  <Text variant="bodySmall" style={{ color: "#D97706", marginTop: 2 }}>
                    💡 {getRecurringProjectionMessage(due, formatAmount)}
                  </Text>
                )}
              </View>

              <View style={{ flexDirection: "row", alignItems: "center" }}>
                {isOverdue(due) && (
                  <Text
                    variant="labelSmall"
                    style={{
                      color: theme.colors.error,
                      marginRight: 8,
                      fontWeight: "bold",
                      fontSize: 10,
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
                      marginRight: 8,
                      fontWeight: "bold",
                      fontSize: 10,
                    }}
                  >
                    {due.type === "income" ? "RECEIVABLE" : "DUE"}
                  </Text>
                )}
                {due.autoProcess && (
                  <MaterialCommunityIcons
                    name="lightning-bolt"
                    size={16}
                    color="#D97706"
                    style={{ marginRight: 4 }}
                  />
                )}
                <Button mode="outlined" compact onPress={() => recordTransaction(due)} style={{ marginRight: 4 }}>
                  {due.type === "income" ? "Receive" : "Pay"}
                </Button>
                <IconButton icon="pencil-outline" onPress={() => handleEdit(due)} size={20} />
                <IconButton icon="delete" onPress={() => setDeleteTarget(due)} iconColor={theme.colors.error} size={20} />
              </View>
            </View>
          </Card.Content>
        </Card>
      );
    }

    return (
      <Card style={{ marginBottom: 12, borderRadius: 16, opacity: 0.7 }}>
        <Card.Content>
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <View style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: theme.colors.surfaceVariant,
              justifyContent: "center",
              alignItems: "center",
              marginRight: 12,
            }}>
              <MaterialCommunityIcons
                name={due.type === "income" ? "arrow-up-circle" : "arrow-down-circle"}
                size={24}
                color="gray"
              />
            </View>

            <View style={{ flex: 1 }}>
              <Text
                variant="titleSmall"
                style={{ textDecorationLine: "line-through", color: "gray", fontWeight: "600" }}
              >
                {due.title}
              </Text>
              <Text variant="bodySmall" style={{ color: theme.colors.outline, marginTop: 2 }}>
                {new Date(due.date).toLocaleDateString()}  {formatAmount(due.amount)}
              </Text>
            </View>

            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <IconButton
                icon="undo"
                size={20}
                onPress={() => handleToggleCompleted(due)}
              />
              <IconButton icon="pencil-outline" size={20} onPress={() => handleEdit(due)} />
              <IconButton icon="delete" size={20} iconColor={theme.colors.error} onPress={() => setDeleteTarget(due)} />
            </View>
          </View>
        </Card.Content>
      </Card>
    );
  }, [theme, formatAmount, recordTransaction, handleEdit, handleToggleCompleted]);

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
    <View style={{ flex: 1, backgroundColor: "#f5f5f5" }}>
      <Appbar.Header>
        <Appbar.BackAction onPress={() => router.back()} />
        <Appbar.Content title="Scheduled" />
      </Appbar.Header>

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
      />

      <Portal>
        <Modal visible={modalVisible} onDismiss={closeModal} contentContainerStyle={{ backgroundColor: "white", padding: 20, margin: 20, borderRadius: 12 }}>
           <Text variant="titleLarge" style={{ marginBottom: 16 }}>{editingDue ? "Edit Scheduled Item" : "New Scheduled Item"}</Text>

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

          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
            <Text variant="bodyLarge">Auto-Process</Text>
            <Checkbox status={autoProcess ? "checked" : "unchecked"} onPress={() => setAutoProcess(!autoProcess)} />
          </View>

          <TextInput label="Title" value={title} onChangeText={setTitle} mode="outlined" style={{ marginBottom: 12 }} />
          <TextInput label="Amount" value={amount} onChangeText={(t) => setAmount(formatNumberInput(t))} keyboardType="numeric" mode="outlined" style={{ marginBottom: 12 }} left={<TextInput.Affix text="₱" />} />

           <TextInput
             label="Date"
             value={date.toLocaleDateString()}
             mode="outlined"
             editable={false}
             right={<TextInput.Icon icon="calendar" onPress={() => setShowDatePicker(true)} />}
             style={{ marginBottom: 8 }}
           />

           <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, fontStyle: "italic", marginBottom: 16 }}>
             💡 {getTimeOfMonthTip(date).title}: {getTimeOfMonthTip(date).message}
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

          <Button mode="contained" onPress={handleSubmit} disabled={!title || !amount}>{editingDue ? "Save Changes" : "Add Due"}</Button>
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
         <Modal
           visible={showDatePicker}
           onDismiss={() => setShowDatePicker(false)}
           contentContainerStyle={{
             backgroundColor: "transparent",
             justifyContent: "center",
             alignItems: "center",
           }}
         >
           <Card style={{ width: "90%", borderRadius: 24, padding: 16, elevation: 10 }}>
             <Text variant="titleMedium" style={{ marginBottom: 16, fontWeight: "700", textAlign: "center" }}>
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
                 selectedDayTextColor: '#ffffff',
                 todayTextColor: theme.colors.primary,
                 dayTextColor: theme.colors.onSurface,
                 textDisabledColor: theme.colors.surfaceVariant,
                 dotColor: theme.colors.primary,
                 selectedDotColor: '#ffffff',
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

       <FAB icon="plus" style={{ position: "absolute", margin: 16, right: 0, bottom: 0 }} onPress={openAddModal} />
    </View>
  );
}
