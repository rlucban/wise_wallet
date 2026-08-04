import { useState, useCallback, useMemo } from "react";
import EmptyState from "../components/EmptyState";
import { View, ScrollView, Alert } from "react-native";
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

export default function SavingsScreen() {
    const router = useRouter();
    const theme = useTheme();
    const { items, addItem, updateItem, deleteItem, refetch } = useSavings();
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

    const [modalVisible, setModalVisible] = useState(false);
    const [transferInModalVisible, setTransferInModalVisible] = useState(false);
    const [transferOutModalVisible, setTransferOutModalVisible] = useState(false);
    const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
    const [title, setTitle] = useState("");
    const [balance, setBalance] = useState("");
    const [transferAmount, setTransferAmount] = useState("");
    const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
    const [toastMessage, setToastMessage] = useState<string | null>(null);

    useFocusEffect(
        useCallback(() => {
            refetch();
        }, [refetch])
    );

    const handleAddItem = async () => {
        const cleanBalance = parseFloat(balance.toString().replace(/[^0-9.]/g, "")) || 0;
        if (!title || isNaN(cleanBalance) || cleanBalance <= 0) {
            Alert.alert("Invalid Input", "Please provide a title and amount.");
            return;
        }

        if (cleanBalance > availableBalance) {
            Alert.alert("Insufficient Balance", `You only have ${formatAmount(availableBalance)} available to allocate.`);
            return;
        }

        try {
            await addItem({
                title,
                balance: cleanBalance,
                updatedAt: Date.now(),
            });
            setModalVisible(false);
            setTitle("");
            setBalance("");
        } catch (e) {
            console.error("Failed to add savings item:", e);
            setToastMessage("Failed to save allocation. Please try again.");
        }
    };

    const handleTransferIn = async () => {
        const numAmount = parseAmount(transferAmount);
        if (isNaN(numAmount) || numAmount <= 0 || !selectedItemId) return;

        const item = items.find(g => g.id === selectedItemId);
        if (!item) return;

        if (numAmount > availableBalance) {
            Alert.alert("Insufficient Balance", `You only have ${formatAmount(availableBalance)} available to allocate.`);
            return;
        }

        try {
            await updateItem(selectedItemId, {
                balance: item.balance + numAmount,
            });

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

            setTransferInModalVisible(false);
            setTransferAmount("");
            setSelectedItemId(null);
        } catch {
            Alert.alert("Error", "Failed to transfer funds.");
        }
    };

    const handleTransferOut = async () => {
        const numAmount = parseAmount(transferAmount);
        if (isNaN(numAmount) || numAmount <= 0 || !selectedItemId) return;

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

    return (
        <View style={{ flex: 1, backgroundColor: "#f5f5f5" }}>
            <Appbar.Header>
                <Appbar.BackAction onPress={() => router.back()} />
                 <Appbar.Content title="Allocations" />
            </Appbar.Header>

            <ScrollView contentContainerStyle={{ padding: 16 }}>
                {items.length > 0 && (
                    <Card style={{ marginBottom: 16, padding: 16, borderRadius: 16, backgroundColor: theme.colors.primaryContainer }}>
                        <Text variant="labelMedium" style={{ color: theme.colors.onPrimaryContainer, textAlign: "center" }}>
                             TOTAL ALLOCATED
                        </Text>
                        <Text variant="headlineMedium" style={{ fontWeight: "800", textAlign: "center", color: theme.colors.onPrimaryContainer }}>
                            {formatAmount(totalReserved)}
                        </Text>
                    </Card>
                )}

                {items.length === 0 ? (
                    <EmptyState icon="piggy-bank" title="No savings yet" subtitle="Tap + to create a savings item" />
                ) : (
                    items.map((item) => (
                        <Card key={item.id} style={{ marginBottom: 16, borderRadius: 16 }}>
                            <Card.Content>
                                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                                    <View style={{ flexDirection: "row", alignItems: "center", flex: 1 }}>
                                        <View style={{ width: 48, height: 48, borderRadius: 14, backgroundColor: theme.colors.surfaceVariant, justifyContent: "center", alignItems: "center", marginRight: 12 }}>
                                            <MaterialCommunityIcons name={item.icon || "piggy-bank-outline" as string} size={24} color={theme.colors.primary} />
                                        </View>
                                        <View>
                                            <Text variant="titleMedium" style={{ fontWeight: "700" }}>{item.title}</Text>
                                            <Text variant="titleMedium" style={{ color: theme.colors.primary, fontWeight: "600" }}>
                                                {formatAmount(item.balance)}
                                            </Text>
                                        </View>
                                    </View>
                                    <View style={{ flexDirection: "row" }}>
                                        <IconButton icon="arrow-collapse-down" size={20} onPress={() => {
                                            setSelectedItemId(item.id);
                                            setTransferAmount("");
                                            setTransferInModalVisible(true);
                                        }} />
                                        <IconButton icon="arrow-collapse-up" size={20} disabled={item.balance <= 0} iconColor={item.balance <= 0 ? "gray" : undefined} onPress={() => {
                                            setSelectedItemId(item.id);
                                            setTransferAmount("");
                                            setTransferOutModalVisible(true);
                                        }} />
                                        <IconButton icon="delete-outline" size={20} iconColor={theme.colors.error} onPress={() => handleDelete(item.id)} />
                                    </View>
                                </View>
                            </Card.Content>
                        </Card>
                    ))
                )}
            </ScrollView>

            <Portal>
                <Modal visible={modalVisible} onDismiss={() => setModalVisible(false)} contentContainerStyle={{ backgroundColor: "white", padding: 20, margin: 20, borderRadius: 12 }}>
                     <Text variant="titleLarge" style={{ marginBottom: 16, color: theme.colors.onSurface }}>New Allocation</Text>
                    <TextInput label="Name" value={title} onChangeText={setTitle} mode="outlined" style={{ marginBottom: 12 }} placeholder="e.g. Education Fund" />
                    <TextInput label="Initial Balance" value={balance} onChangeText={(t) => setBalance(formatNumberInput(t))} keyboardType="numeric" mode="outlined" style={{ marginBottom: 16 }} left={<TextInput.Affix text="₱" />} />
                    <Text variant="bodySmall" style={{ color: "gray", marginBottom: 12 }}>
                        Allocating money sets it aside — it decreases your Available to Spend but does not change your Total Balance.
                    </Text>
                    <Button mode="contained" onPress={handleAddItem}>Create</Button>
                </Modal>

                <Modal visible={transferInModalVisible} onDismiss={() => setTransferInModalVisible(false)} contentContainerStyle={{ backgroundColor: "white", padding: 20, margin: 20, borderRadius: 12 }}>
                    <Text variant="titleLarge" style={{ marginBottom: 16 }}>Transfer Money In</Text>
                    <Text variant="bodySmall" style={{ color: "gray", marginBottom: 12 }}>This creates an expense transaction — money leaves your main balance.</Text>
                    <TextInput label="Amount" value={transferAmount} onChangeText={(t) => setTransferAmount(formatNumberInput(t))} keyboardType="numeric" mode="outlined" style={{ marginBottom: 16 }} left={<TextInput.Affix text="₱" />} />
                    <Button mode="contained" onPress={handleTransferIn} disabled={!transferAmount}>Confirm</Button>
                </Modal>

                <Modal visible={transferOutModalVisible} onDismiss={closeTransferOutModal} contentContainerStyle={{ backgroundColor: "white", padding: 20, margin: 20, borderRadius: 12 }}>
                    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                        <Text variant="titleLarge">Transfer Money Out</Text>
                        <IconButton icon="close" size={24} onPress={closeTransferOutModal} />
                    </View>
                    <Text variant="bodySmall" style={{ color: "gray", marginBottom: 12 }}>This creates an income transaction — money returns to your main balance.</Text>
                    <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginBottom: 12 }}>
                        Available balance: {formatAmount(selectedItem?.balance || 0)}
                    </Text>
                    <TextInput
                        label="Amount"
                        value={transferAmount}
                        onChangeText={(t) => setTransferAmount(formatNumberInput(t))}
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
                    <Button mode="contained" onPress={handleTransferOut} disabled={!transferOutAmountValid}>Confirm</Button>
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
                style={{ position: "absolute", margin: 16, right: 0, bottom: 0 }}
                onPress={() => {
                    setTitle("");
                    setBalance("");
                    setModalVisible(true);
                }}
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
