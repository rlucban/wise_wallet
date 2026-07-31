import { useState } from "react";
import { View, ScrollView, KeyboardAvoidingView, Platform, StyleSheet } from "react-native";
import { Text, TextInput, Button, HelperText } from "react-native-paper";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useUserProfileActions } from "../context/UserProfileContext";
import { useTransactionsActions } from "../context/TransactionsContext";

export default function OnboardingScreen() {
    const router = useRouter();
    const { completeSetup } = useUserProfileActions();
    const { addTransaction } = useTransactionsActions();

    const [name, setName] = useState("");
    const [balance, setBalance] = useState("0");
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState<{ name?: string; balance?: string }>({});

    const validate = () => {
        const newErrors: { name?: string; balance?: string } = {};
        if (!name.trim()) {
            newErrors.name = "Please enter your name.";
        }
        if (isNaN(parseFloat(balance))) {
            newErrors.balance = "Please enter a valid number.";
        }
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleGetStarted = async () => {
        if (!validate()) return;
        setLoading(true);
        try {
            const initialBalance = parseFloat(balance) || 0;

            // 1. Update Profile (Sets the current balance field)
            await completeSetup(name.trim(), initialBalance);

            // 2. Create the Ledger Entry (Transaction history)
            if (initialBalance !== 0) {
                await addTransaction({
                    title: "Opening Balance",
                    amount: initialBalance,
                    type: "income",
                    date: new Date().toISOString(),
                    category: { id: "b0eebc99-9c0b-4ef8-bb6d-6bb9bd380b19", name: "Others", type: "income", updatedAt: 0 },
                    note: "Initial account setup",
                    updatedAt: Date.now(),
                });
            }

            router.replace("/");
        } catch (e) {
            console.error("Setup failed:", e);
        } finally {
            setLoading(false);
        }
    };

    return (
        <LinearGradient colors={["#1a237e", "#283593", "#3949ab"]} style={styles.gradient}>
            <KeyboardAvoidingView
                style={styles.flex}
                behavior={Platform.OS === "ios" ? "padding" : "height"}
            >
                <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
                    {/* Logo & Welcome */}
                    <View style={styles.header}>
                        <Text style={styles.walletEmoji}>💰</Text>
                        <Text style={styles.appName}>WiseWallet</Text>
                        <Text style={styles.tagline}>Your personal finance companion</Text>
                    </View>

                    {/* Card */}
                    <View style={styles.card}>
                        <Text style={styles.cardTitle}>Welcome! Let's get you set up.</Text>
                        <Text style={styles.cardSubtitle}>
                            Tell us a bit about yourself so we can personalize your experience.
                        </Text>

                        {/* Name Field */}
                        <TextInput
                            label="Your Name"
                            value={name}
                            onChangeText={setName}
                            mode="outlined"
                            style={styles.input}
                            textColor="#1a237e"
                            left={<TextInput.Icon icon="account" />}
                            error={!!errors.name}
                            autoCapitalize="words"
                            returnKeyType="next"
                        />
                        <HelperText type="error" visible={!!errors.name}>
                            {errors.name}
                        </HelperText>

                        {/* Initial Balance Field */}
                        <TextInput
                            label="Initial Balance"
                            value={balance}
                            onChangeText={setBalance}
                            mode="outlined"
                            style={styles.input}
                            textColor="#1a237e"
                            keyboardType="numeric"
                            left={<TextInput.Icon icon="cash-multiple" />}
                            error={!!errors.balance}
                        />
                        <HelperText type="error" visible={!!errors.balance}>
                            {errors.balance}
                        </HelperText>

                        {/* CTA Button */}
                        <Button
                            mode="contained"
                            onPress={handleGetStarted}
                            loading={loading}
                            disabled={loading}
                            style={styles.button}
                            contentStyle={styles.buttonContent}
                            labelStyle={styles.buttonLabel}
                            icon="rocket-launch"
                        >
                            Get Started
                        </Button>
                    </View>

                    <Text style={styles.footerText}>
                        Your initial balance will be recorded as your first income transaction.
                    </Text>
                </ScrollView>
            </KeyboardAvoidingView>
        </LinearGradient>
    );
}

const styles = StyleSheet.create({
    gradient: { flex: 1 },
    flex: { flex: 1 },
    scrollContent: {
        flexGrow: 1,
        justifyContent: "center",
        padding: 24,
    },
    header: {
        alignItems: "center",
        marginBottom: 32,
    },
    walletEmoji: {
        fontSize: 64,
        marginBottom: 8,
    },
    appName: {
        fontSize: 36,
        fontWeight: "bold",
        color: "#fff",
        letterSpacing: 1.5,
        textShadowColor: 'rgba(0, 0, 0, 0.4)',
        textShadowOffset: { width: 0, height: 2 },
        textShadowRadius: 10
    },
    tagline: {
        fontSize: 14,
        color: "rgba(255,255,255,0.9)",
        marginTop: 4,
        textShadowColor: 'rgba(0, 0, 0, 0.2)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 3
    },
    card: {
        backgroundColor: "#fff",
        borderRadius: 24,
        padding: 24,
        elevation: 8,
        ...Platform.select({
            web: { boxShadow: "0px 4px 8px rgba(0, 0, 0, 0.3)" },
            default: {
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.3,
                shadowRadius: 8,
            }
        })
    },
    cardTitle: {
        fontSize: 20,
        fontWeight: "bold",
        color: "#1a237e",
        marginBottom: 6,
    },
    cardSubtitle: {
        fontSize: 14,
        color: "#666",
        marginBottom: 20,
        lineHeight: 20,
    },
    input: {
        marginBottom: 4,
        backgroundColor: "#fff",
    },
    button: {
        marginTop: 16,
        borderRadius: 12,
        backgroundColor: "#3949ab",
    },
    buttonContent: {
        paddingVertical: 6,
    },
    buttonLabel: {
        fontSize: 16,
        fontWeight: "bold",
        letterSpacing: 0.5,
    },
    footerText: {
        textAlign: "center",
        color: "rgba(255,255,255,0.5)",
        fontSize: 12,
        marginTop: 24,
    },
});
