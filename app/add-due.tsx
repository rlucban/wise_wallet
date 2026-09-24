import { useState, useMemo } from "react";
import { View, ScrollView, Alert } from "react-native";
import { TextInput, Button, Text, useTheme, Appbar, Card, Chip, SegmentedButtons, Checkbox, Portal, Modal } from "react-native-paper";
import { useRouter } from "expo-router";
import { Calendar } from "react-native-calendars";
import { useDues } from "../hooks/useDues";
import { useCategoriesData } from "../context/CategoriesContext";
import { DueFrequency } from "../types";
import { formatNumberInput, parseAmount } from "../utils/amount";
import { getTimeOfMonthTip } from "../utils/financialLiteracy";
import { ensureOthersOption } from "../utils/categoryOptions";
import { fieldLabel, readOnlyInputProps } from "../utils/formInput";

export default function AddDue() {
    const router = useRouter();
    const theme = useTheme();
    const { addDue } = useDues();
    const { categories } = useCategoriesData();

    const [title, setTitle] = useState("");
    const [amount, setAmount] = useState("");
    const [date, setDate] = useState(new Date());
    const [type, setType] = useState<"expense" | "income">("expense");
    const [frequency, setFrequency] = useState<DueFrequency>("once");
    const [autoProcess, setAutoProcess] = useState(false);
    const [selectedCategoryId, setSelectedCategoryId] = useState<string | undefined>(undefined);
    const [customCategory, setCustomCategory] = useState("");
    const [loading, setLoading] = useState(false);
    const [showDatePicker, setShowDatePicker] = useState(false);

    const categoryOptions = useMemo(() => ensureOthersOption(categories, type), [categories, type]);
    const othersCategory = useMemo(() => categoryOptions.find((c) => c.name === "Others"), [categoryOptions]);
    const isOthersSelected = !!othersCategory && selectedCategoryId === othersCategory.id;

    const handleSubmit = async () => {
        if (!title) {
            Alert.alert("Invalid Input", "Please enter a title.");
            return;
        }
        const numAmount = parseAmount(amount);
        if (isNaN(numAmount) || numAmount <= 0) {
            Alert.alert("Invalid Amount", "Please enter a valid amount.");
            return;
        }
        if (numAmount > 10000000) {
            Alert.alert("Invalid Amount", "Amount must not exceed 10,000,000.");
            return;
        }
        if (isOthersSelected && !customCategory.trim()) {
            Alert.alert("Invalid Category", "Please specify a category.");
            return;
        }

        setLoading(true);
        try {
            await addDue({
                title,
                amount: numAmount,
                date: date.toISOString(),
                type,
                frequency,
                autoProcess,
                categoryId: selectedCategoryId,
                categoryName: isOthersSelected ? customCategory.trim() : undefined,
                completed: false,
                updatedAt: Date.now(),
            });
            router.back();
        } catch {
            Alert.alert("Error", "Failed to save scheduled item.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
            <Appbar.Header>
                <Appbar.BackAction onPress={() => router.back()} />
                <Appbar.Content title="Add Scheduled Due" />
            </Appbar.Header>

            <ScrollView contentContainerStyle={{ padding: 16 }} keyboardShouldPersistTaps="handled">
                <Card style={{ padding: 20, borderRadius: 16, backgroundColor: "#F8FAFC" }}>
                    <Text variant="titleMedium" style={{ marginBottom: 16, color: "#1E293B", fontWeight: "700" }}>
                        Due Details
                    </Text>

                    <SegmentedButtons
                        value={type}
                        onValueChange={(val) => {
                            setType(val as "expense" | "income");
                            setSelectedCategoryId(undefined);
                            setCustomCategory("");
                        }}
                        buttons={[
                            { value: "expense", label: "Expense", icon: "arrow-down" },
                            { value: "income", label: "Income", icon: "arrow-up" },
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

                    <Text style={fieldLabel}>Title</Text>
                    <TextInput value={title} onChangeText={setTitle} mode="outlined" style={{ marginBottom: 12 }} />

                    <Text style={fieldLabel}>Amount</Text>
                    <TextInput
                        value={amount}
                        onChangeText={(t) => setAmount(formatNumberInput(t.length > 12 ? t.slice(0, 12) : t))}
                        keyboardType="numeric"
                        mode="outlined"
                        style={{ marginBottom: 12 }}
                        left={<TextInput.Affix text="₱" />}
                    />

                    <Text style={fieldLabel}>Due Date</Text>
                    <TextInput
                        value={date.toLocaleDateString()}
                        mode="outlined"
                        {...readOnlyInputProps()}
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
                        <>
                            <Text style={fieldLabel}>Specify Category</Text>
                            <TextInput
                                value={customCategory}
                                onChangeText={setCustomCategory}
                                mode="outlined"
                                placeholder="e.g., Pet Care, Gym, Gifts"
                                style={{ marginBottom: 16 }}
                            />
                        </>
                    )}
                </Card>

                <View style={{ height: 16 }} />

                <Button
                    mode="contained"
                    onPress={handleSubmit}
                    loading={loading}
                    disabled={loading || !title || !amount}
                    buttonColor="#1E3A8A"
                    style={{ paddingVertical: 4 }}
                >
                    Save Scheduled Due
                </Button>

                <View style={{ height: 40 }} />
            </ScrollView>

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
                            current={date.toISOString().split("T")[0]}
                            onDayPress={(day) => {
                                setDate(new Date(day.timestamp));
                                setShowDatePicker(false);
                            }}
                            markedDates={{
                                [date.toISOString().split("T")[0]]: { selected: true, selectedColor: theme.colors.primary },
                            }}
                            theme={{
                                backgroundColor: theme.colors.surface,
                                calendarBackground: theme.colors.surface,
                                textSectionTitleColor: theme.colors.primary,
                                selectedDayBackgroundColor: theme.colors.primary,
                                selectedDayTextColor: "#ffffff",
                                todayTextColor: theme.colors.primary,
                                dayTextColor: theme.colors.onSurface,
                                textDisabledColor: theme.colors.surfaceVariant,
                                dotColor: theme.colors.primary,
                                selectedDotColor: "#ffffff",
                                arrowColor: theme.colors.primary,
                                disabledArrowColor: theme.colors.surfaceVariant,
                                monthTextColor: theme.colors.onSurface,
                            }}
                        />
                        <Button mode="outlined" onPress={() => setShowDatePicker(false)} style={{ marginTop: 12 }}>
                            Cancel
                        </Button>
                    </Card>
                </Modal>
            </Portal>
        </View>
    );
}
