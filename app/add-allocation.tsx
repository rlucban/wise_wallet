import { useState } from "react";
import { View, ScrollView } from "react-native";
import { TextInput, Button, Text, useTheme, Appbar, Card } from "react-native-paper";
import { useRouter } from "expo-router";
import { safeGoBack } from "../utils/backNavigation";
import { useSavings } from "../hooks/useSavings";
import { useCurrencyActions } from "../context/CurrencyContext";
import { useUserProfile } from "../context/UserProfileContext";
import { useTransactions } from "../hooks/useTransactions";
import { formatNumberInput, MAX_AMOUNT } from "../utils/amount";
import { OPENING_BALANCE_CATEGORY_ID } from "../utils/onboardingPayload";
import { useToast } from "../context/ToastContext";

export default function AddAllocation() {
    const router = useRouter();
    const theme = useTheme();
    const { addItem, items } = useSavings();
    const { formatAmount } = useCurrencyActions();
    const { transactions } = useTransactions();
    const { profile } = useUserProfile();
    const { showToast } = useToast();

    const [title, setTitle] = useState("");
    const [balance, setBalance] = useState("");
    const [goalAmount, setGoalAmount] = useState("");
    const [loading, setLoading] = useState(false);

    const availableBalance = (() => {
        const initialBalance = Number(profile?.initialBalance || 0);
        const totalIncome = transactions
            .filter((t) => t.type === "income" && t.note !== "Initial account setup" && t.category?.id !== OPENING_BALANCE_CATEGORY_ID)
            .reduce((s, t) => s + t.amount, 0);
        const totalExpense = transactions.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0);
        const totalReserved = items.reduce((s, g) => s + g.balance, 0);
        return initialBalance + totalIncome - totalExpense - totalReserved;
    })();

    const initialBalanceNum = parseFloat(balance.toString().replace(/[^0-9.]/g, "")) || 0;
    const cleanGoal = parseFloat(goalAmount.toString().replace(/[^0-9.]/g, "")) || 0;

    const isInitialBalanceInvalid =
        initialBalanceNum <= 0 ||
        initialBalanceNum > MAX_AMOUNT ||
        isNaN(initialBalanceNum) ||
        (availableBalance >= 0 && initialBalanceNum > availableBalance);

    const isGoalInvalid =
        goalAmount.trim() !== "" &&
        (cleanGoal <= 0 || cleanGoal > MAX_AMOUNT || isNaN(cleanGoal));

    const isFormInvalid = !title.trim() || isInitialBalanceInvalid || isGoalInvalid;

    const handleSubmit = async () => {
        if (isFormInvalid) {
            showToast("Cannot create allocation. Your initial balance exceeds your current available balance.");
            return;
        }

        setLoading(true);
        try {
            await addItem({
                title,
                balance: initialBalanceNum,
                target_amount: cleanGoal > 0 ? cleanGoal : undefined,
                updatedAt: Date.now(),
            });
            safeGoBack(router);
        } catch (e) {
            console.error("Failed to add allocation:", e);
            showToast("Failed to save allocation. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    const isButtonDisabled = loading || isFormInvalid;
    const disabledBg = theme.colors.onSurface;
    const disabledText = theme.colors.surface;
    const buttonBg = isButtonDisabled ? disabledBg : theme.colors.primary;
    const buttonTextColor = isButtonDisabled ? disabledText : theme.colors.onPrimary;

    return (
        <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
            <Appbar.Header>
                <Appbar.BackAction onPress={() => safeGoBack(router)} />
                <Appbar.Content title="New Allocation" />
            </Appbar.Header>

            <ScrollView contentContainerStyle={{ padding: 16 }} keyboardShouldPersistTaps="handled">
                <Card style={{ padding: 20, borderRadius: 16, backgroundColor: theme.colors.surface }}>
                    <Text variant="titleMedium" style={{ marginBottom: 16, color: theme.colors.onSurface, fontWeight: "700" }}>
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
                    {availableBalance >= 0 && initialBalanceNum > availableBalance && (
                        <Text
                            variant="bodySmall"
                            style={{ color: theme.colors.error, marginTop: 4, marginBottom: 8 }}
                        >
                            Insufficient available balance to create this allocation.
                        </Text>
                    )}

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

                    <Text
                        variant="bodySmall"
                        style={{
                            color: availableBalance < 0 ? theme.colors.error : theme.colors.onSurfaceVariant,
                            fontWeight: availableBalance < 0 ? "600" : "400",
                            marginBottom: 8,
                        }}
                    >
                        Available balance: {formatAmount(availableBalance)}
                    </Text>

                    <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginBottom: 16 }}>
                        Setting a goal lets you track progress toward your target.
                    </Text>
                </Card>

                <View style={{ height: 16 }} />

                <Button
                    mode="contained"
                    onPress={handleSubmit}
                    loading={loading}
                    disabled={isButtonDisabled}
                    buttonColor={buttonBg}
                    style={{ paddingVertical: 4 }}
                    color={buttonTextColor}
                >
                    Create Allocation
                </Button>

                <View style={{ height: 40 }} />
            </ScrollView>
        </View>
    );
}
