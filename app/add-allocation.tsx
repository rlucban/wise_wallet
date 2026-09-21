import { useState } from "react";
import { View, ScrollView, Alert } from "react-native";
import { TextInput, Button, Text, useTheme, Appbar, Card } from "react-native-paper";
import { useRouter } from "expo-router";
import { useSavings } from "../hooks/useSavings";
import { useCurrencyActions } from "../context/CurrencyContext";
import { useUserProfile } from "../context/UserProfileContext";
import { useTransactions } from "../hooks/useTransactions";
import { formatNumberInput } from "../utils/amount";

export default function AddAllocation() {
    const router = useRouter();
    const theme = useTheme();
    const { addItem } = useSavings();
    const { formatAmount } = useCurrencyActions();
    const { transactions } = useTransactions();
    const { profile } = useUserProfile();

    const [title, setTitle] = useState("");
    const [balance, setBalance] = useState("");
    const [goalAmount, setGoalAmount] = useState("");
    const [loading, setLoading] = useState(false);

    const availableBalance = (() => {
        const initialBalance = Number(profile?.initialBalance || 0);
        const totalIncome = transactions.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0);
        const totalExpense = transactions.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0);
        return initialBalance + totalIncome - totalExpense;
    })();

    const handleSubmit = async () => {
        const cleanBalance = parseFloat(balance.toString().replace(/[^0-9.]/g, "")) || 0;
        if (!title || isNaN(cleanBalance) || cleanBalance <= 0) {
            Alert.alert("Invalid Input", "Please provide a title and amount.");
            return;
        }
        if (cleanBalance > 10000000) {
            Alert.alert("Invalid Amount", "Amount must not exceed 10,000,000.");
            return;
        }
        if (cleanBalance > availableBalance) {
            Alert.alert("Insufficient Balance", `You only have ${formatAmount(availableBalance)} available to allocate.`);
            return;
        }

        const cleanGoal = parseFloat(goalAmount.toString().replace(/[^0-9.]/g, "")) || 0;
        if (goalAmount && (isNaN(cleanGoal) || cleanGoal <= 0)) {
            Alert.alert("Invalid Goal", "Please enter a valid goal amount.");
            return;
        }
        if (cleanGoal > 10000000) {
            Alert.alert("Invalid Goal", "Goal amount must not exceed 10,000,000.");
            return;
        }

        setLoading(true);
        try {
            await addItem({
                title,
                balance: cleanBalance,
                target_amount: cleanGoal > 0 ? cleanGoal : undefined,
                updatedAt: Date.now(),
            });
            router.back();
        } catch (e) {
            console.error("Failed to add allocation:", e);
            Alert.alert("Error", "Failed to save allocation. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
            <Appbar.Header>
                <Appbar.BackAction onPress={() => router.back()} />
                <Appbar.Content title="New Allocation" />
            </Appbar.Header>

            <ScrollView contentContainerStyle={{ padding: 16 }} keyboardShouldPersistTaps="handled">
                <Card style={{ padding: 20, borderRadius: 16, backgroundColor: "#F8FAFC" }}>
                    <Text variant="titleMedium" style={{ marginBottom: 16, color: "#1E293B", fontWeight: "700" }}>
                        Allocation Details
                    </Text>

                    <TextInput
                        label="Name"
                        value={title}
                        onChangeText={setTitle}
                        mode="outlined"
                        style={{ marginBottom: 12 }}
                        placeholder="e.g. Education Fund"
                    />

                    <TextInput
                        label="Initial Balance"
                        value={balance}
                        onChangeText={(t) => setBalance(formatNumberInput(t.length > 12 ? t.slice(0, 12) : t))}
                        keyboardType="numeric"
                        mode="outlined"
                        style={{ marginBottom: 12 }}
                        left={<TextInput.Affix text="₱" />}
                    />

                    <TextInput
                        label="Goal Amount (Optional)"
                        value={goalAmount}
                        onChangeText={(t) => setGoalAmount(formatNumberInput(t.length > 12 ? t.slice(0, 12) : t))}
                        keyboardType="numeric"
                        mode="outlined"
                        style={{ marginBottom: 12 }}
                        left={<TextInput.Affix text="₱" />}
                        placeholder="e.g. 10,000"
                    />

                    <Text variant="bodySmall" style={{ color: "#94A3B8", marginBottom: 8 }}>
                        Available balance: {formatAmount(availableBalance)}
                    </Text>

                    <Text variant="bodySmall" style={{ color: "#94A3B8", marginBottom: 16 }}>
                        Setting a goal lets you track progress toward your target.
                    </Text>
                </Card>

                <View style={{ height: 16 }} />

                <Button
                    mode="contained"
                    onPress={handleSubmit}
                    loading={loading}
                    disabled={loading}
                    buttonColor="#1E3A8A"
                    style={{ paddingVertical: 4 }}
                >
                    Create Allocation
                </Button>

                <View style={{ height: 40 }} />
            </ScrollView>
        </View>
    );
}
