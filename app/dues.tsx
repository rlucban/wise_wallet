import { useState, useEffect, useCallback, useMemo } from "react";
import { View, Alert, Platform, TouchableOpacity } from "react-native";
import { FlashList } from "@shopify/flash-list";
import { Appbar, Text, Card, FAB, Portal, Modal, TextInput, Button, Checkbox, useTheme, Chip, IconButton, SegmentedButtons, Menu } from "react-native-paper";
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
import { getTimeOfMonthTip, isOverdue } from "../utils/financialLiteracy";
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

const getDueBadge = (due: Due): { color: string; icon: string } => {
  const cat = (due.categoryName ?? "").toLowerCase();
  const t = (due.title ?? "").toLowerCase();

  if (cat.includes("transport") || t.includes("transport") || cat.includes("car") || cat.includes("gas")) {
    return { color: "#8B5CF6", icon: "car" };
  }
  if (
    cat.includes("food") ||
    t.includes("food") ||
    cat.includes("dining") ||
    t.includes("restaurant") ||
    cat.includes("grocer") ||
    t.includes("utensil")
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
  if (cat.includes("offer") || t.includes("offer") || cat.includes("deal") || t.includes("tag")) {
    return { color: "#3B82F6", icon: "tag" };
  }
  return due.type === "income"
    ? { color: "#2E7D32", icon: "arrow-up-circle" }
    : { color: "#D32F2F", icon: "arrow-down-circle" };
};

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
  const [overflowMenuDueId, setOverflowMenuDueId] = useState<string | null>(null);

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

  const annualRecurringTotal = useMemo(() => {
    const periodsMap: Record<DueFrequency, number> = {
      once: 1,
      weekly: 52,
      biweekly: 26,
      monthly: 12,
      yearly: 1,
    };
    return dues
      .filter((d) => !d.completed)
      .filter((d) => d.frequency && d.frequency !== "once")
      .reduce((sum, d) => sum + d.amount * (periodsMap[d.frequency as DueFrequency] ?? 1), 0);
  }, [dues]);

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
        <Text variant="titleMedium" style={{ fontWeight: "700", marginBottom: 8, color: theme.colors.onSurface }}>
          Upcoming
        </Text>
      );
    }
    if (item.kind === "completed-header") {
      return (
        <Text variant="titleMedium" style={{ fontWeight: "700", marginBottom: 8, marginTop: 16, color: theme.colors.onSurface }}>
          Completed
        </Text>
      );
    }

    const due = item.item;
    const isToday = new Date(due.date).toDateString() === new Date().toDateString();
    const overdue = isOverdue(due);
    const badge = getDueBadge(due);
    const formattedDate = new Date(due.date).toLocaleDateString();

    const statusBadge = isToday ? (
      <View style={{ backgroundColor: "#FFEDD5", borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2 }}>
        <Text style={{ color: "#D97706", fontSize: 10, fontWeight: "700" }}>DUE TODAY</Text>
      </View>
    ) : overdue ? (
      <View style={{ backgroundColor: "#FEE2E2", borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2 }}>
        <Text style={{ color: "#B91C1C", fontSize: 10, fontWeight: "700" }}>OVERDUE</Text>
      </View>
    ) : null;

    if (item.section === "upcoming") {
      return (
        <Card style={{ marginBottom: 12, borderRadius: 16, backgroundColor: theme.colors.surface }}>
          <Card.Content
            style={{
              flexDirection: "row",
              alignItems: "center",
              paddingVertical: 12,
              paddingHorizontal: 16,
            }}
          >
            <View
              style={{
                width: 48,
                height: 48,
                borderRadius: 24,
                backgroundColor: badge.color,
                justifyContent: "center",
                alignItems: "center",
                marginRight: 12,
              }}
            >
              <MaterialCommunityIcons name={badge.icon} size={24} color="#FFFFFF" />
            </View>

            <View style={{ flex: 1, marginRight: 8 }}>
              <Text
                variant="titleSmall"
                style={{ fontWeight: "700", fontSize: 16, color: theme.colors.onSurface }}
                numberOfLines={1}
              >
                {due.title}
              </Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", alignItems: "center", marginTop: 2, gap: 3 }}>
                <Text style={{ color: "#64748B", fontSize: 12 }}>{formattedDate}</Text>
                <Text style={{ color: "#64748B", fontSize: 12 }}>•</Text>
                <Text style={{ color: "#64748B", fontSize: 12 }}>{formatAmount(due.amount)}</Text>
                <Text style={{ color: "#64748B", fontSize: 12 }}>•</Text>
                <Text style={{ color: "#64748B", fontSize: 12 }}>{FREQUENCY_LABELS[due.frequency || "once"]}</Text>
              </View>
            </View>

            <View style={{ flexDirection: "row", alignItems: "center" }}>
              {statusBadge}
              {due.autoProcess ? (
                <MaterialCommunityIcons name="lightning-bolt" size={16} color="#D97706" style={{ marginHorizontal: 6 }} />
              ) : null}
              <Button
                mode="contained"
                onPress={() => recordTransaction(due)}
                style={{ borderRadius: 20, marginRight: 4 }}
                buttonColor={theme.colors.primary}
                labelStyle={{ fontSize: 12, fontWeight: "700", color: "#FFFFFF" }}
                uppercase={false}
              >
                {due.type === "income" ? "Receive" : "Pay"}
              </Button>
              <Menu
                visible={overflowMenuDueId === due.id}
                onDismiss={() => setOverflowMenuDueId(null)}
                anchor={
                  <IconButton icon="dots-vertical" size={20} onPress={() => setOverflowMenuDueId(due.id)} />
                }
              >
                <Menu.Item
                  title="Edit"
                  leadingIcon="pencil-outline"
                  onPress={() => {
                    setOverflowMenuDueId(null);
                    handleEdit(due);
                  }}
                />
                <Menu.Item
                  title="Delete"
                  leadingIcon="delete"
                  onPress={() => {
                    setOverflowMenuDueId(null);
                    setDeleteTarget(due);
                  }}
                />
              </Menu>
            </View>
          </Card.Content>
        </Card>
      );
    }

    return (
      <Card style={{ marginBottom: 12, borderRadius: 16, backgroundColor: theme.colors.surface }}>
        <Card.Content
          style={{
            flexDirection: "row",
            alignItems: "center",
            paddingVertical: 12,
            paddingHorizontal: 16,
          }}
        >
          <View
            style={{
              width: 48,
              height: 48,
              borderRadius: 24,
              backgroundColor: theme.colors.surfaceVariant,
              justifyContent: "center",
              alignItems: "center",
              marginRight: 12,
            }}
          >
            <MaterialCommunityIcons
              name={due.type === "income" ? "arrow-up-circle" : "arrow-down-circle"}
              size={24}
              color={theme.colors.onSurfaceVariant}
            />
          </View>

          <View style={{ flex: 1, marginRight: 8 }}>
            <Text
              variant="titleSmall"
              style={{ fontWeight: "700", fontSize: 16, color: "#64748B", textDecorationLine: "line-through" }}
              numberOfLines={1}
            >
              {due.title}
            </Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", alignItems: "center", marginTop: 2, gap: 3 }}>
              <Text style={{ color: "#64748B", fontSize: 12 }}>{formattedDate}</Text>
              <Text style={{ color: "#64748B", fontSize: 12 }}>•</Text>
              <Text style={{ color: "#64748B", fontSize: 12 }}>{formatAmount(due.amount)}</Text>
            </View>
          </View>

          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <Button mode="text" onPress={() => handleToggleCompleted(due)} style={{ borderRadius: 16, marginRight: 4 }} labelStyle={{ color: theme.colors.primary, fontSize: 12, fontWeight: "700" }}>
              Undo
            </Button>
            <Menu
              visible={overflowMenuDueId === due.id}
              onDismiss={() => setOverflowMenuDueId(null)}
              anchor={
                <IconButton icon="dots-vertical" size={20} onPress={() => setOverflowMenuDueId(due.id)} />
              }
            >
              <Menu.Item
                title="Edit"
                leadingIcon="pencil-outline"
                onPress={() => {
                  setOverflowMenuDueId(null);
                  handleEdit(due);
                }}
              />
              <Menu.Item
                title="Delete"
                leadingIcon="delete"
                onPress={() => {
                  setOverflowMenuDueId(null);
                  setDeleteTarget(due);
                }}
              />
            </Menu>
          </View>
        </Card.Content>
      </Card>
    );
  }, [theme, formatAmount, recordTransaction, handleEdit, handleToggleCompleted, overflowMenuDueId]);

  const ListHeader = useCallback(() => (
    <View>
      <View style={{ flexDirection: "row", paddingHorizontal: 16, marginBottom: 16, gap: 8 }}>
        {[
          { value: "week", label: "This Week" },
          { value: "month", label: "This Month" },
          { value: "all", label: "All" },
        ].map((opt) => {
          const active = filter === opt.value;
          return (
            <TouchableOpacity
              key={opt.value}
              onPress={() => setFilter(opt.value as "week" | "month" | "all")}
              style={{
                flex: 1,
                paddingVertical: 10,
                borderRadius: 12,
                alignItems: "center",
                backgroundColor: active ? "#FFFFFF" : theme.colors.surfaceVariant,
                ...(active
                  ? Platform.select({
                      web: { boxShadow: "0px 2px 8px rgba(0,0,0,0.08)" },
                      default: {
                        shadowColor: "#000",
                        shadowOffset: { width: 0, height: 2 },
                        shadowOpacity: 0.08,
                        shadowRadius: 6,
                        elevation: 2,
                      },
                    })
                  : {}),
              }}
            >
              <Text
                style={{
                  fontWeight: active ? "700" : "500",
                  color: active ? theme.colors.primary : theme.colors.onSurfaceVariant,
                  fontSize: 13,
                }}
              >
                {opt.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {(filter === "week" || filter === "month") && (
        <Card style={{ marginHorizontal: 16, marginBottom: 16, borderRadius: 20, backgroundColor: "#F8FAFC" }}>
          <Card.Content style={{ alignItems: "center", paddingVertical: 20 }}>
            <Text variant="labelSmall" style={{ color: "#64748B", fontWeight: "600", marginBottom: 6 }}>
              {filter === "week" ? "Total Dues This Week" : "Total Dues This Month"}
            </Text>
            <Text variant="titleLarge" style={{ fontWeight: "800", color: theme.colors.error }}>
              {formatAmount(Math.abs(filter === "week" ? weekTotal : monthTotal))}
            </Text>
          </Card.Content>
        </Card>
      )}

      {annualRecurringTotal > 0 && (
        <View
          style={{
            backgroundColor: "#FFFBEB",
            borderRadius: 12,
            paddingHorizontal: 16,
            paddingVertical: 10,
            marginHorizontal: 16,
            marginBottom: 16,
          }}
        >
          <Text style={{ color: "#92400E", fontSize: 12, fontStyle: "italic" }}>
            💡 Your recurring dues add up to about {formatAmount(annualRecurringTotal)}/year — small recurring charges grow fast.
          </Text>
        </View>
      )}
    </View>
  ), [filter, theme, formatAmount, weekTotal, monthTotal, annualRecurringTotal]);

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

        <FAB
          icon="plus"
          color="#FFFFFF"
          style={{
            position: "absolute",
            right: 16,
            bottom: 16,
            margin: 0,
            borderRadius: 28,
            backgroundColor: theme.colors.primary,
            ...Platform.select({
              web: { boxShadow: "0px 4px 12px rgba(0,0,0,0.15)" },
              default: {
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.15,
                shadowRadius: 8,
                elevation: 5,
              },
            }),
          }}
          onPress={openAddModal}
        />
    </View>
  );
}
