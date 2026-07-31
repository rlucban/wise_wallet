import React from "react";
import { View, ScrollView, StyleSheet } from "react-native";
import { Text, Appbar, Card, useTheme } from "react-native-paper";
import { useLocalSearchParams, useRouter } from "expo-router";

const LEARNING_CONTENT: Record<string, { title: string, content: string }> = {
    budgeting_101: {
        title: "Budgeting 101",
        content: `Budgeting is the foundation of financial health. It involves tracking your income and expenses to ensure you're living within your means and saving for your goals.

Key Principles:
1. Track Every Peso: Know where your money goes.
2. The 50/30/20 Rule: 50% for Needs, 30% for Wants, and 20% for Savings/Debt.
3. Pay Yourself First: Move money to savings as soon as you get paid.
4. Emergency Fund: Aim for 3-6 months of expenses in a separate account.

Steps to Start:
- List your monthly income.
- List fixed expenses (Rent, Utilities).
- List variable expenses (Food, Entertainment).
- Subtract total expenses from income. If negative, find where to cut!`
    },
    understanding_debt: {
        title: "Understanding Debt",
        content: `Debt isn't always bad, but it must be managed carefully. High-interest debt (like credit cards) can trap you in a cycle of payments.

Strategies to Manage Debt:
1. Debt Snowball: Pay off the smallest balance first for psychological wins.
2. Debt Avalanche: Pay off the debt with the highest interest rate first to save money long-term.
3. Consolidate: Consider moving high-interest debt to a lower-interest loan if possible.
4. Stop Borrowing: While paying off debt, avoid taking on new ones.

Types of Debt:
- Good Debt: Investments like education or a home that may increase in value.
- Bad Debt: Purchases that lose value quickly or carry high interest rates.`
    },
    saving_future: {
        title: "Saving for the Future",
        content: `Saving is delayed spending. By setting aside money today, you're preparing for opportunities and emergencies tomorrow.

Why Save?
- Emergencies: Car repairs, medical bills, or job loss.
- Big Purchases: House, car, or a special vacation.
- Retirement: Ensuring you can live comfortably when you stop working.

How to Save Effectively:
1. Set Specific Goals: Instead of "saving more," try "save ₱10,000 for a trip."
2. Automate It: Set up automatic transfers to your savings account.
3. Review and Trim: Look at your subscriptions and small daily habits.
4. Invest: For long-term goals, consider low-cost index funds or cooperative placements to beat inflation.`
    }
};

export default function LearningDetail() {
    const theme = useTheme();
    const router = useRouter();
    const { id } = useLocalSearchParams<{ id: string }>();
    
    const topic = id ? LEARNING_CONTENT[id] : null;

    if (!topic) {
        return (
            <View style={styles.container}>
                <Appbar.Header>
                    <Appbar.BackAction onPress={() => router.back()} />
                    <Appbar.Content title="Error" />
                </Appbar.Header>
                <View style={styles.center}>
                    <Text>Topic not found.</Text>
                </View>
            </View>
        );
    }

    return (
        <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
            <Appbar.Header style={{ backgroundColor: theme.colors.background, elevation: 0 }}>
                <Appbar.BackAction onPress={() => router.back()} />
                <Appbar.Content title="Learning" />
            </Appbar.Header>

            <ScrollView contentContainerStyle={styles.content}>
                <Card style={styles.card}>
                    <Card.Content>
                        <Text variant="headlineSmall" style={styles.title}>{topic.title}</Text>
                        <Text variant="bodyLarge" style={styles.body}>{topic.content}</Text>
                    </Card.Content>
                </Card>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    center: { flex: 1, justifyContent: "center", alignItems: "center" },
    content: { padding: 16 },
    card: { borderRadius: 20 },
    title: { fontWeight: "bold", marginBottom: 16, color: "#1B3F7A" },
    body: { lineHeight: 26, opacity: 0.85 },
});
