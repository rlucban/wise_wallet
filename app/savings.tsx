import { useState, useCallback, useMemo } from "react";
import EmptyState from "../components/EmptyState";
import { View, ScrollView, Alert, useWindowDimensions } from "react-native";
import { Appbar, Text, FAB, Portal, Modal, TextInput, Button, Card, IconButton, Snackbar, useTheme } from "react-native-paper";
import { useRouter, useFocusEffect } from "expo-router";
import { useSavings } from "../hooks/useSavings";
import { useCurrencyActions } from "../context/CurrencyContext";
import { useTransactions, useTransactionsActions } from "../hooks/useTransactions";
import { useCategoriesData } from "../context/CategoriesContext";
import { GLOBAL_CATEGORIES } from "../utils/db";
import { formatNumberInput, parseAmount } from "../utils/amount";
import { useUserProfile } from "../context/UserProfileContext";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import ConfirmDialog from "../components/ConfirmDialog";

const CARD_SHADOW = {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 3,
};

export default function SavingsScreen() {
    const router = useRouter();
    const theme = useTheme();
    const { items, updateItem, deleteItem, refetch } = useSavings();
    const { formatAmount } = useCurrencyActions();
    const { addTransaction } = useTransactionsActions();
    const { categories } = useCategoriesData();
    const { transactions } = useTransactions();
    const { profile } = useUserProfile();

    const totalReserved = useMemo(() => items.reduce((sum, g) => sum + g.balance, 0), [items]);
    const availableBalance = useMemo(() => {
        const initialBalance = Number(profile?.initialBalance || 0);
        const totalIncome = transactions.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0);
        const totalExpense = transactions.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0);
        return initialBalance + totalIncome - totalExpense - totalReserved;
    }, [profile, transactions, totalReserved]);

    const activeItems = useMemo(
        () => items.filter((item) => !item.target_amount || item.balance < item.target_amount),
        [items]
    );
    const completedItems = useMemo(
        () => items.filter((item) => item.target_amount && item.balance >= item.target_amount),
        [items]
    );

    const [editModalVisible, setEditModalVisible] = useState(false);
    const [transferInModalVisible, setTransferInModalVisible] = useState(false);
    const [transferOutModalVisible, setTransferOutModalVisible] = useState(false);
    const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
    const [title, setTitle] = useState("");
    const [goalAmount, setGoalAmount] = useState("");
    const [transferAmount, setTransferAmount] = useState("");
    const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
    const [toastMessage, setToastMessage] = useState<string | null>(null);

    useFocusEffect(
        useCallback(() => {
            refetch();
        }, [refetch])
    );

    const handleEditItem = async () => {
        if (!selectedItemId) return;
        const cleanGoal = parseFloat(goalAmount.toString().replace(/[^0-9.]/g, "")) || 0;
        if (goalAmount && (isNaN(cleanGoal) || cleanGoal <= 0)) {
            Alert.alert("Invalid Goal", "Please enter a valid goal amount.");
            return;
        }
        if (cleanGoal > 10000000) {
            Alert.alert("Invalid Goal", "Goal amount must not exceed 10,000,000.");
            return;
        }

        try {
            await updateItem(selectedItemId, {
                title: title || undefined,
                target_amount: cleanGoal > 0 ? cleanGoal : undefined,
            });
            setEditModalVisible(false);
            setSelectedItemId(null);
            setTitle("");
            setGoalAmount("");
        } catch (e) {
            console.error("Failed to update savings item:", e);
            setToastMessage("Failed to update allocation. Please try again.");
        }
    };

    const openEditModal = (item: { id: string; title: string; target_amount?: number }) => {
        setSelectedItemId(item.id);
        setTitle(item.title);
        setGoalAmount(item.target_amount ? String(item.target_amount) : "");
        setEditModalVisible(true);
    };

    const handleTransferIn = async () => {
        const numAmount = parseAmount(transferAmount);
        if (isNaN(numAmount) || numAmount <= 0 || !selectedItemId) return;

        if (numAmount > 10000000) {
            Alert.alert("Invalid Amount", "Amount must not exceed 10,000,000.");
            return;
        }

        const item = items.find(g => g.id === selectedItemId);
        if (!item) return;

        if (numAmount > availableBalance) {
            Alert.alert("Insufficient Balance", `You only have ${formatAmount(availableBalance)} available to allocate.`);
            return;
        }

        const maxDeposit = item.target_amount ? item.target_amount - item.balance : Infinity;
        if (item.target_amount && numAmount > maxDeposit) {
            Alert.alert("Deposit Limit", `Deposit cannot exceed remaining goal balance of ${formatAmount(maxDeposit)}.`);
            return;
        }

        try {
            const newBalance = item.target_amount
                ? Math.min(item.balance + numAmount, item.target_amount)
                : item.balance + numAmount;
            await updateItem(selectedItemId, { balance: newBalance });

            let savingsCat = categories.find(c => c.name === "Savings" && c.type === "expense");
            if (!savingsCat) savingsCat = GLOBAL_CATEGORIES.find(c => c.name === "Others" && c.type === "expense");

            await addTransaction({
                title: `Transfer to ${item.title}`,
                amount: numAmount,
                type: "expense",
                date: new Date().toISOString(),
                category: savingsCat,
                updatedAt: Date.now(),
            });

            const goalReached = item.target_amount && newBalance >= item.target_amount;
            setTransferInModalVisible(false);
            setTransferAmount("");
            setSelectedItemId(null);
            if (goalReached) {
                setToastMessage("Goal Reached! 🎉");
            }
        } catch {
            Alert.alert("Error", "Failed to transfer funds.");
        }
    };

    const handleTransferOut = async () => {
        const numAmount = parseAmount(transferAmount);
        if (isNaN(numAmount) || numAmount <= 0 || !selectedItemId) return;

        if (numAmount > 10000000) {
            Alert.alert("Invalid Amount", "Amount must not exceed 10,000,000.");
            return;
        }

        const item = items.find(g => g.id === selectedItemId);
        if (!item) return;

        if (numAmount > item.balance) {
            Alert.alert("Insufficient Balance", `You only have ${formatAmount(item.balance)} in this savings item.`);
            return;
        }

        try {
            await updateItem(selectedItemId, {
                balance: item.balance - numAmount,
            });

            let savingsCat = categories.find(c => c.name === "Savings" && c.type === "income");
            if (!savingsCat) savingsCat = GLOBAL_CATEGORIES.find(c => c.name === "Others" && c.type === "income");

            await addTransaction({
                title: `Transfer from ${item.title}`,
                amount: numAmount,
                type: "income",
                date: new Date().toISOString(),
                category: savingsCat,
                updatedAt: Date.now(),
            });

            setTransferOutModalVisible(false);
            setTransferAmount("");
            setSelectedItemId(null);
        } catch {
            Alert.alert("Error", "Failed to transfer funds.");
        }
    };

    const closeTransferOutModal = () => {
        setTransferOutModalVisible(false);
        setTransferAmount("");
        setSelectedItemId(null);
    };

    const selectedItem = items.find(g => g.id === selectedItemId);
    const transferOutAmount = parseAmount(transferAmount);
    const transferOutAmountValid =
        selectedItem != null &&
        !isNaN(transferOutAmount) &&
        transferOutAmount > 0 &&
        transferOutAmount <= selectedItem.balance;
    const transferOutError = useMemo(() => {
        if (!selectedItem) return null;
        if (transferAmount.trim() === "" || isNaN(transferOutAmount) || transferOutAmount <= 0) {
            return "Please enter a valid amount";
        }
        if (transferOutAmount > selectedItem.balance) {
            return "Insufficient balance";
        }
        return null;
    }, [transferAmount, transferOutAmount, selectedItem]);

    const transferInItem = useMemo(
        () => items.find((g) => g.id === selectedItemId),
        [items, selectedItemId]
    );
    const transferInAmount = parseAmount(transferAmount);
    const transferInError = useMemo(() => {
        if (!transferInItem) return null;
        if (transferAmount.trim() === "" || isNaN(transferInAmount) || transferInAmount <= 0) {
            return null;
        }
        if (transferInAmount > availableBalance) {
            return `Insufficient Balance: You only have ${formatAmount(availableBalance)} available in your main account.`;
        }
        if (transferInItem.target_amount) {
            const remainingGoal = transferInItem.target_amount - transferInItem.balance;
            if (transferInAmount > remainingGoal) {
                return `Amount exceeds target goal: Maximum allowable deposit for this goal is ${formatAmount(remainingGoal)}`;
            }
        }
        return null;
    }, [transferAmount, transferInAmount, transferInItem, availableBalance, formatAmount]);
    const transferInValid = transferInAmount > 0 && !isNaN(transferInAmount) && !transferInError && transferAmount.trim() !== "";

    const handleDelete = (id: string) => {
        setDeleteTarget(id);
    };

    const confirmDelete = async () => {
        if (!deleteTarget) return;
        const id = deleteTarget;
        const item = items.find(g => g.id === id);
        setDeleteTarget(null);
        if (!item) return;

        try {
            if (item.balance > 0) {
                let savingsCat = categories.find(c => c.name === "Savings" && c.type === "income");
                if (!savingsCat) savingsCat = GLOBAL_CATEGORIES.find(c => c.name === "Others" && c.type === "income");
                await addTransaction({
                    title: `Return from ${item.title}`,
                    amount: item.balance,
                    type: "income",
                    date: new Date().toISOString(),
                    category: savingsCat,
                    updatedAt: Date.now(),
                });
            }
        } catch (e) {
            console.error("Failed to create return transaction, deleting anyway:", e);
        }
        await deleteItem(id);
    };

    const { width } = useWindowDimensions();
    const isMobile = width < 768;

    const modalContainerStyle = isMobile
        ? { flex: 1, backgroundColor: "#FFFFFF", justifyContent: "flex-start" as const, paddingTop: 50, paddingHorizontal: 20 }
        : { backgroundColor: "white", padding: 20, margin: 20, borderRadius: 12, maxWidth: 500, alignSelf: "center" as const };

    return (
        <View style={{ flex: 1, backgroundColor: "#f5f5f5" }}>
            <Appbar.Header>
                <Appbar.BackAction onPress={() => router.back()} />
                <Appbar.Content title="Allocations" />
            </Appbar.Header>

            <ScrollView contentContainerStyle={{ padding: 16 }}>
                {items.length > 0 && (
                    <Card style={{ marginBottom: 16, padding: 16, borderRadius: 16, backgroundColor: "#1E3A8A" }}>
                        <Text variant="labelMedium" style={{ color: "#93C5FD", textAlign: "center" }}>
                            TOTAL ALLOCATED
                        </Text>
                        <Text variant="headlineMedium" style={{ fontWeight: "800", textAlign: "center", color: "#fff" }}>
                            {formatAmount(totalReserved)}
                        </Text>
                    </Card>
                )}

                {items.length === 0 ? (
                    <EmptyState icon="piggy-bank" title="No allocations yet" subtitle="Tap + to create an allocation" />
                ) : (
                    <>
                        {/* Active Allocations */}
                        {activeItems.length > 0 && (
                            <>
                                <Text variant="titleMedium" style={{ marginBottom: 8 }}>Active</Text>
                                {activeItems.map((item) => {
                                    const currentBalance = item.balance || 0;
                                    const target = item.target_amount || 0;
                                    const hasGoal = target > 0;
                                    const progressPercent = hasGoal ? Math.min(Math.round((currentBalance / target) * 100), 100) : 0;

                                    return (
                                        <Card key={item.id} style={{ marginBottom: 12, borderRadius: 16, ...CARD_SHADOW }}>
                                            <Card.Content style={{ paddingVertical: 12, paddingHorizontal: 16 }}>
                                                <View style={{ flexDirection: "row", alignItems: "center" }}>
                                                    {/* Left: Title + Progress Bar + Percentage Text */}
                                                    <View style={{ flex: 1, marginRight: 12 }}>
                                                        <Text variant="titleMedium" style={{ fontWeight: "700", color: "#1E293B", marginBottom: 4 }}>
                                                            {item.title}
                                                        </Text>
                                                        <Text variant="bodySmall" style={{ color: "#64748B", marginBottom: 10 }}>
                                                            {hasGoal
                                                                ? `${formatAmount(currentBalance)} / ${formatAmount(target)}`
                                                                : formatAmount(currentBalance)
                                                            }
                                                        </Text>

                                                        {/* Horizontal Progress Bar */}
                                                        {hasGoal && (
                                                            <View>
                                                                <View style={{ height: 8, backgroundColor: "#E2E8F0", borderRadius: 4, overflow: "hidden" }}>
                                                                    <View style={{
                                                                        height: "100%",
                                                                        width: `${progressPercent}%`,
                                                                        backgroundColor: "#1E3A8A",
                                                                        borderRadius: 4,
                                                                    }} />
                                                                </View>
                                                                <Text variant="labelSmall" style={{ color: "#94A3B8", marginTop: 4, textAlign: "right" }}>
                                                                    {progressPercent}% reached
                                                                </Text>
                                                            </View>
                                                        )}
                                                    </View>

                                                    {/* Middle: Liquid-Fill Circular Piggy Bank */}
                                                    {hasGoal && (
                                                        <View style={{
                                                            width: 48,
                                                            height: 48,
                                                            borderRadius: 24,
                                                            backgroundColor: "#F1F5F9",
                                                            justifyContent: "center",
                                                            alignItems: "center",
                                                            marginRight: 12,
                                                            overflow: "hidden",
                                                        }}>
                                                            <View style={{
                                                                position: "absolute",
                                                                bottom: 0,
                                                                left: 0,
                                                                right: 0,
                                                                height: `${progressPercent}%`,
                                                                backgroundColor: "#FF2D55",
                                                            }} />
                                                            <Text style={{
                                                                position: "absolute",
                                                                zIndex: 1,
                                                                fontWeight: "800",
                                                                fontSize: 11,
                                                                color: progressPercent > 40 ? "#FFFFFF" : "#1E293B",
                                                            }}>
                                                                {progressPercent}%
                                                            </Text>
                                                        </View>
                                                    )}

                                                    {/* Far Right: Actions */}
                                                    <View style={{ flexDirection: "row" }}>
                                                        <IconButton icon="pencil-outline" size={18} onPress={() => openEditModal(item)} />
                                                        <IconButton icon="arrow-collapse-down" size={18} onPress={() => {
                                                            setSelectedItemId(item.id);
                                                            setTransferAmount("");
                                                            setTransferInModalVisible(true);
                                                        }} />
                                                        <IconButton icon="arrow-collapse-up" size={18} disabled={item.balance <= 0} iconColor={item.balance <= 0 ? "gray" : undefined} onPress={() => {
                                                            setSelectedItemId(item.id);
                                                            setTransferAmount("");
                                                            setTransferOutModalVisible(true);
                                                        }} />
                                                        <IconButton icon="delete-outline" size={18} iconColor={theme.colors.error} onPress={() => handleDelete(item.id)} />
                                                    </View>
                                                </View>
                                            </Card.Content>
                                        </Card>
                                    );
                                })}
                            </>
                        )}

                        {/* Completed Allocations */}
                        {completedItems.length > 0 && (
                            <>
                                <Text variant="titleMedium" style={{ marginBottom: 8, marginTop: activeItems.length > 0 ? 16 : 0 }}>
                                    Completed
                                </Text>
                                {completedItems.map((item) => {
                                    const currentBalance = item.balance || 0;
                                    const target = item.target_amount || 0;

                                    return (
                                        <Card key={item.id} style={{ marginBottom: 12, borderRadius: 16, backgroundColor: "#F8FAFC", ...CARD_SHADOW }}>
                                            <Card.Content style={{ paddingVertical: 12, paddingHorizontal: 16 }}>
                                                <View style={{ flexDirection: "row", alignItems: "center" }}>
                                                    {/* Left: Title + Amount + Completed Tag */}
                                                    <View style={{ flex: 1, marginRight: 12 }}>
                                                        <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 4 }}>
                                                            <Text variant="titleMedium" style={{ fontWeight: "700", color: "#64748B" }}>
                                                                {item.title}
                                                            </Text>
                                                            <View style={{
                                                                marginLeft: 8,
                                                                paddingHorizontal: 8,
                                                                paddingVertical: 2,
                                                                borderRadius: 10,
                                                                backgroundColor: "#DCFCE7",
                                                            }}>
                                                                <Text variant="labelSmall" style={{ color: "#16A34A", fontWeight: "700" }}>
                                                                    Goal Reached
                                                                </Text>
                                                            </View>
                                                        </View>
                                                        <Text variant="bodySmall" style={{ color: "#94A3B8", marginBottom: 10 }}>
                                                            {formatAmount(currentBalance)} / {formatAmount(target)} • 100% Reached
                                                        </Text>

                                                        {/* Full Progress Bar */}
                                                        <View style={{ height: 8, backgroundColor: "#E2E8F0", borderRadius: 4, overflow: "hidden" }}>
                                                            <View style={{
                                                                height: "100%",
                                                                width: "100%",
                                                                backgroundColor: "#16A34A",
                                                                borderRadius: 4,
                                                            }} />
                                                        </View>
                                                    </View>

                                                    {/* Middle: Green Checkmark Circle */}
                                                    <View style={{
                                                        width: 48,
                                                        height: 48,
                                                        borderRadius: 24,
                                                        backgroundColor: "#DCFCE7",
                                                        justifyContent: "center",
                                                        alignItems: "center",
                                                        marginRight: 12,
                                                    }}>
                                                        <MaterialCommunityIcons name="checkmark-circle" size={28} color="#16A34A" />
                                                    </View>

                                                    {/* Far Right: Only Delete */}
                                                    <View style={{ flexDirection: "row" }}>
                                                        <IconButton icon="delete-outline" size={18} iconColor={theme.colors.error} onPress={() => handleDelete(item.id)} />
                                                    </View>
                                                </View>
                                            </Card.Content>
                                        </Card>
                                    );
                                })}
                            </>
                        )}
                    </>
                )}
            </ScrollView>

            <Portal>
                {/* Edit Allocation Modal */}
                <Modal visible={editModalVisible} onDismiss={() => setEditModalVisible(false)} contentContainerStyle={modalContainerStyle}>
                    <ScrollView keyboardShouldPersistTaps="handled">
                    <Text variant="titleLarge" style={{ marginBottom: 16, color: "#1E293B" }}>Edit Allocation</Text>
                    <TextInput label="Name" value={title} onChangeText={setTitle} mode="outlined" style={{ marginBottom: 12 }} />
                    <TextInput label="Goal Amount (Optional)" value={goalAmount} onChangeText={(t) => setGoalAmount(formatNumberInput(t.length > 12 ? t.slice(0, 12) : t))} keyboardType="numeric" mode="outlined" style={{ marginBottom: 16 }} left={<TextInput.Affix text="₱" />} placeholder="e.g. 10,000" />
                    <Button mode="contained" onPress={handleEditItem} buttonColor="#1E3A8A">Save Changes</Button>
                    </ScrollView>
                </Modal>

                {/* Transfer In Modal */}
                <Modal visible={transferInModalVisible} onDismiss={() => setTransferInModalVisible(false)} contentContainerStyle={modalContainerStyle}>
                    <ScrollView keyboardShouldPersistTaps="handled">
                    <Text variant="titleLarge" style={{ marginBottom: 16 }}>Transfer Money In</Text>
                    <Text variant="bodySmall" style={{ color: "#94A3B8", marginBottom: 8 }}>This creates an expense transaction — money leaves your main balance.</Text>
                    <Text variant="bodySmall" style={{ color: "#64748B", marginBottom: 12 }}>
                        Available Balance: {formatAmount(availableBalance)}
                    </Text>
                    {transferInItem?.target_amount ? (
                        <Text variant="bodySmall" style={{ color: "#64748B", marginBottom: 12 }}>
                            Remaining Goal: {formatAmount(Math.max(0, transferInItem.target_amount - transferInItem.balance))}
                        </Text>
                    ) : null}
                    <TextInput
                        label="Amount"
                        value={transferAmount}
                        onChangeText={(t) => setTransferAmount(formatNumberInput(t.length > 12 ? t.slice(0, 12) : t))}
                        keyboardType="numeric"
                        mode="outlined"
                        style={{ marginBottom: 8 }}
                        left={<TextInput.Affix text="₱" />}
                        error={!!transferInError}
                    />
                    {transferInError && (
                        <Text variant="bodySmall" style={{ color: "#EF4444", marginBottom: 8 }}>
                            {transferInError}
                        </Text>
                    )}
                    <Button mode="contained" onPress={handleTransferIn} disabled={!transferInValid} buttonColor="#1E3A8A">Confirm</Button>
                    </ScrollView>
                </Modal>

                {/* Transfer Out Modal */}
                <Modal visible={transferOutModalVisible} onDismiss={closeTransferOutModal} contentContainerStyle={modalContainerStyle}>
                    <ScrollView keyboardShouldPersistTaps="handled">
                    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                        <Text variant="titleLarge">Transfer Money Out</Text>
                        <IconButton icon="close" size={24} onPress={closeTransferOutModal} />
                    </View>
                    <Text variant="bodySmall" style={{ color: "#94A3B8", marginBottom: 12 }}>This creates an income transaction — money returns to your main balance.</Text>
                    <Text variant="bodySmall" style={{ color: "#64748B", marginBottom: 12 }}>
                        Available balance: {formatAmount(selectedItem?.balance || 0)}
                    </Text>
                    <TextInput
                        label="Amount"
                        value={transferAmount}
                        onChangeText={(t) => setTransferAmount(formatNumberInput(t.length > 12 ? t.slice(0, 12) : t))}
                        keyboardType="numeric"
                        mode="outlined"
                        style={{ marginBottom: 8 }}
                        left={<TextInput.Affix text="₱" />}
                        error={!!transferOutError}
                    />
                    {transferOutError && (
                        <Text variant="bodySmall" style={{ color: theme.colors.error, marginBottom: 8 }}>
                            {transferOutError}
                        </Text>
                    )}
                    <Button mode="contained" onPress={handleTransferOut} disabled={!transferOutAmountValid} buttonColor="#1E3A8A">Confirm</Button>
                    </ScrollView>
                </Modal>

                <ConfirmDialog
                    visible={!!deleteTarget}
                    title="Delete Allocation?"
                    message={
                        deleteTarget
                            ? `The remaining balance of ${formatAmount(items.find(g => g.id === deleteTarget)?.balance || 0)} will be transferred back to your main funds.`
                            : ""
                    }
                    confirmLabel="Delete & Transfer"
                    onConfirm={confirmDelete}
                    onCancel={() => setDeleteTarget(null)}
                />
            </Portal>

            <FAB
                icon="plus"
                label="New Allocation"
                style={{ position: "absolute", margin: 16, right: 0, bottom: 0, borderRadius: 16, backgroundColor: "#1E3A8A" }}
                color="#fff"
                onPress={() => router.push("/add-allocation")}
            />

            <Snackbar
                visible={!!toastMessage}
                onDismiss={() => setToastMessage(null)}
                duration={3000}
            >
                {toastMessage}
            </Snackbar>
        </View>
    );
}
