import { useState, useCallback, useMemo } from "react";
import EmptyState from "../components/EmptyState";
import { View, ScrollView, Alert } from "react-native";
import { Appbar, Text, FAB, Portal, Modal, TextInput, Button, Card, IconButton, Dialog, useTheme } from "react-native-paper";
import { useRouter, useFocusEffect } from "expo-router";
import { useSavings } from "../hooks/useSavings";
import { useCurrencyActions } from "../context/CurrencyContext";
import { useTransactions, useTransactionsActions } from "../hooks/useTransactions";
import { useCategoriesData } from "../context/CategoriesContext";
import { GLOBAL_CATEGORIES } from "../utils/db";
import { useUserProfile } from "../context/UserProfileContext";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";

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

    useFocusEffect(
        useCallback(() => {
            refetch();
        }, [refetch])
    );

    const handleAddItem = async () => {
        const numBalance = parseFloat(balance);
        if (!title || isNaN(numBalance) || numBalance <= 0) {
            Alert.alert("Invalid Input", "Please provide a title and amount.");
            return;
        }

        if (numBalance > availableBalance) {
            Alert.alert("Insufficient Balance", `You only have ${formatAmount(availableBalance)} available to allocate.`);
            return;
        }

        try {
            await addItem({
                title,
                balance: numBalance,
                updatedAt: Date.now(),
            });
            setModalVisible(false);
            setTitle("");
            setBalance("");
        } catch {
            Alert.alert("Error", "Failed to add savings item.");
        }
    };

    const handleTransferIn = async () => {
        const numAmount = parseFloat(transferAmount);
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
        const numAmount = parseFloat(transferAmount);
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
                                        <IconButton icon="arrow-collapse-up" size={20} onPress={() => {
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
                    <TextInput label="Initial Balance" value={balance} onChangeText={(t) => setBalance(t.replace(/[^0-9.]/g, ""))} keyboardType="numeric" mode="outlined" style={{ marginBottom: 16 }} left={<TextInput.Affix text="₱" />} />
                    <Text variant="bodySmall" style={{ color: "gray", marginBottom: 12 }}>
                        Allocating money sets it aside — it decreases your Available to Spend but does not change your Total Balance.
                    </Text>
                    <Button mode="contained" onPress={handleAddItem}>Create</Button>
                </Modal>

                <Modal visible={transferInModalVisible} onDismiss={() => setTransferInModalVisible(false)} contentContainerStyle={{ backgroundColor: "white", padding: 20, margin: 20, borderRadius: 12 }}>
                    <Text variant="titleLarge" style={{ marginBottom: 16 }}>Transfer Money In</Text>
                    <Text variant="bodySmall" style={{ color: "gray", marginBottom: 12 }}>This creates an expense transaction — money leaves your main balance.</Text>
                    <TextInput label="Amount" value={transferAmount} onChangeText={(t) => setTransferAmount(t.replace(/[^0-9.]/g, ""))} keyboardType="numeric" mode="outlined" style={{ marginBottom: 16 }} left={<TextInput.Affix text="₱" />} />
                    <Button mode="contained" onPress={handleTransferIn} disabled={!transferAmount}>Confirm</Button>
                </Modal>

                <Modal visible={transferOutModalVisible} onDismiss={() => setTransferOutModalVisible(false)} contentContainerStyle={{ backgroundColor: "white", padding: 20, margin: 20, borderRadius: 12 }}>
                    <Text variant="titleLarge" style={{ marginBottom: 16 }}>Transfer Money Out</Text>
                    <Text variant="bodySmall" style={{ color: "gray", marginBottom: 12 }}>This creates an income transaction — money returns to your main balance.</Text>
                    <TextInput label="Amount" value={transferAmount} onChangeText={(t) => setTransferAmount(t.replace(/[^0-9.]/g, ""))} keyboardType="numeric" mode="outlined" style={{ marginBottom: 16 }} left={<TextInput.Affix text="₱" />} />
                    <Button mode="contained" onPress={handleTransferOut} disabled={!transferAmount}>Confirm</Button>
                </Modal>

                <Dialog visible={!!deleteTarget} onDismiss={() => setDeleteTarget(null)}>
                    <Dialog.Icon icon="alert-outline" />
                    <Dialog.Title style={{ textAlign: "center" }}>Delete Allocation</Dialog.Title>
                    <Dialog.Content>
                        <Text variant="bodyMedium" style={{ textAlign: "center" }}>
                            {deleteTarget
                                ? `The remaining balance of ${formatAmount(items.find(g => g.id === deleteTarget)?.balance || 0)} will be transferred back to your main funds.`
                                : ""}
                        </Text>
                    </Dialog.Content>
                    <Dialog.Actions style={{ justifyContent: "center" }}>
                        <Button onPress={() => setDeleteTarget(null)}>Cancel</Button>
                        <Button mode="contained" buttonColor={theme.colors.error} onPress={confirmDelete}>
                            Delete & Transfer
                        </Button>
                    </Dialog.Actions>
                </Dialog>
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
        </View>
    );
}
