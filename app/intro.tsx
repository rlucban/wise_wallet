import { useState } from "react";
import { View, StyleSheet, Platform } from "react-native";
import { Text, Button } from "react-native-paper";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";

const STEPS = [
    {
        title: "Welcome to WiseWallet",
        description: "Your personal finance companion to track and manage your money effectively.",
        icon: "wallet",
    },
    {
        title: "Track Expenses",
        description: "Keep a close eye on your spending and stay within your budget.",
        icon: "chart-bar",
    },
    {
        title: "Achieve Your Goals",
        description: "Set savings goals and watch your wealth grow over time.",
        icon: "flag-checkered",
    },
];

export default function IntroScreen() {
    const [currentStep, setCurrentStep] = useState(0);
    const router = useRouter();

    const isLastStep = currentStep === STEPS.length - 1;

    const handleNext = () => {
        if (!isLastStep) {
            setCurrentStep((prev) => prev + 1);
        }
    };

    return (
        <LinearGradient colors={["#1a237e", "#283593", "#3949ab"]} style={styles.gradient}>
            <View style={styles.container}>
                <View style={styles.content}>
                    <MaterialCommunityIcons 
                        name={STEPS[currentStep].icon as any} 
                        size={100} 
                        color="#fff" 
                        style={styles.icon}
                    />
                    <Text style={styles.title}>{STEPS[currentStep].title}</Text>
                    <Text style={styles.description}>{STEPS[currentStep].description}</Text>
                </View>

                <View style={styles.footer}>
                    <View style={styles.dotsContainer}>
                        {STEPS.map((_, index) => (
                            <View 
                                key={index} 
                                style={[
                                    styles.dot, 
                                    currentStep === index && styles.activeDot
                                ]} 
                            />
                        ))}
                    </View>

                    {isLastStep ? (
                        <View style={styles.buttonGroup}>
                            <Button 
                                mode="contained" 
                                style={[styles.actionButton, { backgroundColor: "#fff" }]}
                                labelStyle={{ color: "#1a237e", fontWeight: "bold" }}
                                onPress={() => router.replace("/register")}
                            >
                                Get Started
                            </Button>
                        </View>
                    ) : (
                        <View style={styles.navGroup}>
                            <Button 
                                mode="text" 
                                onPress={() => router.replace("/login")}
                                labelStyle={{ color: "rgba(255,255,255,0.7)" }}
                            >
                                Skip
                            </Button>
                            <Button 
                                mode="contained" 
                                style={{ backgroundColor: "#fff" }}
                                labelStyle={{ color: "#1a237e", fontWeight: "bold" }}
                                onPress={handleNext}
                            >
                                Next
                            </Button>
                        </View>
                    )}
                </View>
            </View>
        </LinearGradient>
    );
}

const styles = StyleSheet.create({
    gradient: { flex: 1 },
    container: {
        flex: 1,
        padding: 24,
        justifyContent: "space-between",
    },
    content: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
    },
    icon: {
        marginBottom: 32,
    },
    title: {
        fontSize: 28,
        fontWeight: "bold",
        color: "#fff",
        textAlign: "center",
        marginBottom: 16,
    },
    description: {
        fontSize: 16,
        color: "rgba(255,255,255,0.9)",
        textAlign: "center",
        lineHeight: 24,
        paddingHorizontal: 16,
    },
    footer: {
        paddingBottom: Platform.OS === "ios" ? 24 : 16,
    },
    dotsContainer: {
        flexDirection: "row",
        justifyContent: "center",
        alignItems: "center",
        marginBottom: 32,
    },
    dot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: "rgba(255,255,255,0.3)",
        marginHorizontal: 4,
    },
    activeDot: {
        backgroundColor: "#fff",
        width: 24,
    },
    buttonGroup: {
        gap: 12,
    },
    actionButton: {
        paddingVertical: 4,
        borderRadius: 8,
    },
    navGroup: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
    },
});
