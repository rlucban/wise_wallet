import React, { useState } from 'react';
import { View, StyleSheet, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { Text, TextInput, Button, Card, HelperText, Dialog, Portal } from 'react-native-paper';
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import { useRouter } from 'expo-router';
import { useAuthActions } from '../context/AuthContext';
import { addUser, saveUserProfile, API_URL, initDb, setSetting, getUsers } from '../utils/db';
import { LinearGradient } from 'expo-linear-gradient';

type AccountMode = "online" | "offline";

export default function RegisterScreen() {
    const { login } = useAuthActions();
    const router = useRouter();

    const [accountMode, setAccountMode] = useState<AccountMode>("online");
    const [name, setName] = useState("");
    const [passcode, setPasscode] = useState("");
    const [loading, setLoading] = useState(false);
    const [nameError, setNameError] = useState("");
    const [pinError, setPinError] = useState("");
    const [showPin, setShowPin] = useState(false);

    const [dialog, setDialog] = useState<{
        visible: boolean;
        title: string;
        message: string;
        buttons?: { text: string; onPress?: () => void; style?: "cancel" }[];
    }>({ visible: false, title: "", message: "" });

    const showAlert = (title: string, message: string, buttons?: { text: string; onPress?: () => void; style?: "cancel" }[]) => {
        setDialog({ visible: true, title, message, buttons });
    };

    const createLocalAccount = async (username: string, pin: string): Promise<boolean> => {
        const { generateUUID } = require('../utils/uuid');
        const offlineId = generateUUID();

        const users = await getUsers();
        const localDuplicate = users.find((u) => (u.name as string).toLowerCase() === username.toLowerCase());

        if (localDuplicate) {
            showAlert("Username Taken", "This username is already registered on this device. Please use a different username or login instead.");
            return false;
        }

        await addUser(offlineId, username, pin);
        await saveUserProfile({ name: username, isFirstRun: true, initialBalance: 0 }, offlineId);
        await initDb(offlineId);
        await setSetting('autoBackup', 'false');
        await login(offlineId, "offline_token");
        return true;
    };

    const createCloudAccount = async (emailAddr: string, pin: string): Promise<boolean> => {
        if (!API_URL) {
            showAlert("Cloud Unavailable", "Cloud registration is not available. Please check your connection or create a local-only account.");
            return false;
        }

        try {
            const response = await fetch(`${API_URL}/auth/register`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name: emailAddr.trim(), passcode: pin.trim(), initialBalance: 0 }),
            });

            const responseData = await response.json();

            if (response.ok) {
                await addUser(responseData.data.user.id, emailAddr.trim(), pin.trim());
                await saveUserProfile({ name: emailAddr.trim(), isFirstRun: true, initialBalance: 0 }, responseData.data.user.id);
                await initDb(responseData.data.user.id);
                await setSetting('autoBackup', 'true');
                await login(responseData.data.user.id, responseData.data.token);
                return true;
            } else {
                showAlert("Registration Error", responseData.message || "Email is not available.");
                return false;
            }
        } catch (_e: unknown) {
            console.warn("Cloud registration failed:", (_e as Error).message);

            showAlert(
                "Cloud Unreachable",
                "We couldn't connect to our servers. Would you like to create a local-only account instead?",
                [
                    {
                        text: "Create Offline Account",
                        onPress: async () => {
                            const success = await createLocalAccount(emailAddr.trim(), pin.trim());
                            if (!success) {
                                setLoading(false);
                            }
                        }
                    },
                    { text: "Try Again", style: "cancel", onPress: () => setLoading(false) }
                ]
            );
            return false;
        }
    };

    const handleRegister = async () => {
        setNameError("");
        setPinError("");

        if (!name.trim()) {
            setNameError(accountMode === "online" ? "Email is required" : "Username is required");
            return;
        }

        if (!passcode.trim()) {
            setPinError("PIN is required");
            return;
        }

        setLoading(true);

        if (accountMode === "online") {
            const success = await createCloudAccount(name.trim(), passcode.trim());
            if (!success) {
                setLoading(false);
            }
        } else {
            const success = await createLocalAccount(name.trim(), passcode.trim());
            if (!success) {
                setLoading(false);
            }
        }
    };

    return (
        <>
            <Portal>
                <Dialog visible={dialog.visible} onDismiss={() => setDialog({ ...dialog, visible: false })}>
                    <Dialog.Icon icon="alert-circle-outline" />
                    <Dialog.Title style={{ textAlign: 'center' }}>{dialog.title}</Dialog.Title>
                    <Dialog.Content>
                        <Text variant="bodyMedium" style={{ textAlign: 'center', lineHeight: 22 }}>
                            {dialog.message}
                        </Text>
                    </Dialog.Content>
                    <Dialog.Actions style={{ justifyContent: 'center' }}>
                        {dialog.buttons && dialog.buttons.length > 0 ? (
                            dialog.buttons.map((btn, i) => (
                                <Button
                                    key={i}
                                    mode={btn.style === "cancel" ? "text" : "contained"}
                                    onPress={() => {
                                        setDialog({ ...dialog, visible: false });
                                        btn.onPress?.();
                                    }}
                                    style={{ marginHorizontal: 4 }}
                                >
                                    {btn.text}
                                </Button>
                            ))
                        ) : (
                            <Button mode="contained" onPress={() => setDialog({ ...dialog, visible: false })}>
                                OK
                            </Button>
                        )}
                    </Dialog.Actions>
                </Dialog>
            </Portal>
            <LinearGradient colors={["#1a237e", "#283593", "#3949ab"]} style={styles.gradient}>
                <KeyboardAvoidingView
                    behavior={Platform.OS === "ios" ? "padding" : "height"}
                    style={{ flex: 1 }}
                >
                    <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
                        <View style={styles.container}>
                            <MaterialCommunityIcons name="wallet" size={42} color="#fff" style={styles.logo} />
                            <Text style={styles.appName}>WiseWallet</Text>
                            <Text style={styles.tagline}>Create Account</Text>

                            <Card style={styles.card}>
                                <Card.Content>
                                    <Text style={styles.fieldLabel}>Account Type</Text>
                                    <View style={styles.modeSelector}>
                                        <Button
                                            mode={accountMode === "online" ? "contained" : "outlined"}
                                            onPress={() => { setAccountMode("online"); setName(""); setNameError(""); }}
                                            style={[styles.modeBtn, accountMode === "online" && styles.modeBtnActive]}
                                            labelStyle={styles.modeBtnLabel}
                                            icon="cloud-outline"
                                            disabled={loading}
                                        >
                                            Online
                                        </Button>
                                        <Button
                                            mode={accountMode === "offline" ? "contained" : "outlined"}
                                            onPress={() => { setAccountMode("offline"); setName(""); setNameError(""); }}
                                            style={[styles.modeBtn, accountMode === "offline" && styles.modeBtnActive]}
                                            labelStyle={styles.modeBtnLabel}
                                            icon="cellphone-off"
                                            disabled={loading}
                                        >
                                            Offline
                                        </Button>
                                    </View>

                                    <Text style={styles.fieldLabel}>
                                        {accountMode === "online" ? "Email" : "Username"}
                                    </Text>
                                    <TextInput
                                        value={name}
                                        onChangeText={(text) => { setName(text); setNameError(""); }}
                                        style={styles.input}
                                        textColor="#1a237e"
                                        mode="outlined"
                                        outlineColor="#e0e0e0"
                                        activeOutlineColor="#3949ab"
                                        error={!!nameError}
                                        autoCapitalize="none"
                                        keyboardType={accountMode === "online" ? "email-address" : "default"}
                                        placeholder={accountMode === "online" ? "Enter your email" : "Choose a username"}
                                        left={<TextInput.Icon icon={accountMode === "online" ? "email-outline" : "account-outline"} color="#1a237e" />}
                                    />
                                    <HelperText type="error" visible={!!nameError}>
                                        {nameError}
                                    </HelperText>

                                    <Text style={styles.fieldLabel}>PIN</Text>
                                    <TextInput
                                        value={passcode}
                                        onChangeText={(text) => { setPasscode(text); setPinError(""); }}
                                        keyboardType="numeric"
                                        secureTextEntry={!showPin}
                                        style={styles.input}
                                        textColor="#1a237e"
                                        mode="outlined"
                                        outlineColor="#e0e0e0"
                                        activeOutlineColor="#3949ab"
                                        error={!!pinError}
                                        placeholder="Enter 4-digit PIN"
                                        left={<TextInput.Icon icon="lock-outline" color="#1a237e" />}
                                        right={
                                            <TextInput.Icon
                                                icon={showPin ? "eye-off-outline" : "eye-outline"}
                                                color="#1a237e"
                                                onPress={() => setShowPin((s) => !s)}
                                            />
                                        }
                                    />
                                    <HelperText type="error" visible={!!pinError}>
                                        {pinError}
                                    </HelperText>

                                    <View style={{ marginTop: 12 }}>
                                        <Button
                                            mode="contained"
                                            onPress={handleRegister}
                                            loading={loading}
                                            disabled={loading}
                                            style={styles.primaryBtn}
                                        >
                                            Register
                                        </Button>
                                    </View>

                                    <View style={styles.switchRow}>
                                        <Text style={styles.switchPrompt}>Already have an account?</Text>
                                        <Button
                                            compact
                                            mode="text"
                                            onPress={() => router.replace("/login")}
                                            disabled={loading}
                                            style={styles.switchLink}
                                            labelStyle={styles.switchLinkLabel}
                                        >
                                            Login
                                        </Button>
                                    </View>

                                    <View style={styles.infoBox}>
                                        {accountMode === "online" ? (
                                            <>
                                                <Text variant="bodySmall" style={{ color: '#888', textAlign: 'center', marginTop: 6 }}>
                                                    • Online mode enables cloud sync
                                                </Text>
                                                <Text variant="bodySmall" style={{ color: '#888', textAlign: 'center', marginTop: 2 }}>
                                                    • Data synced across your devices
                                                </Text>
                                            </>
                                        ) : (
                                            <>
                                                <Text variant="bodySmall" style={{ color: '#888', textAlign: 'center', marginTop: 6 }}>
                                                    • Offline mode stores data on this device only
                                                </Text>
                                                <Text variant="bodySmall" style={{ color: '#888', textAlign: 'center', marginTop: 2 }}>
                                                    • You can upgrade to Online later in Settings
                                                </Text>
                                            </>
                                        )}
                                    </View>
                                </Card.Content>
                            </Card>
                        </View>
                    </ScrollView>
                </KeyboardAvoidingView>
            </LinearGradient>
        </>
    );
}

const styles = StyleSheet.create({
    gradient: { flex: 1 },
    scrollContainer: { flexGrow: 1, justifyContent: 'center' },
    container: { padding: 24 },
    logo: {
        alignSelf: 'center',
        marginBottom: 14,
    },
    appName: {
        fontSize: 42,
        fontWeight: "bold",
        color: "#fff",
        textAlign: 'center',
        marginBottom: 6,
        letterSpacing: 1,
        textShadowColor: 'rgba(0, 0, 0, 0.4)',
        textShadowOffset: { width: 0, height: 2 },
        textShadowRadius: 10
    },
    tagline: {
        fontSize: 18,
        color: "rgba(255,255,255,0.9)",
        textAlign: 'center',
        marginBottom: 28,
        fontWeight: '500',
        textShadowColor: 'rgba(0, 0, 0, 0.2)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 3
    },
    card: {
        backgroundColor: '#fff',
        borderRadius: 24,
        padding: 8,
        elevation: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8
    },
    fieldLabel: {
        color: '#666',
        fontSize: 13,
        fontWeight: '600',
        marginBottom: 6,
        marginTop: 4,
    },
    modeSelector: {
        flexDirection: 'row',
        marginBottom: 8,
        gap: 8,
    },
    modeBtn: {
        flex: 1,
        borderRadius: 12,
    },
    modeBtnActive: {
        backgroundColor: '#3949ab',
    },
    modeBtnLabel: {
        fontSize: 13,
    },
    infoBox: {
        marginTop: 14,
        marginBottom: 4,
        paddingVertical: 14,
        paddingHorizontal: 16,
        backgroundColor: '#f5f5f5',
        borderRadius: 8,
        alignItems: 'center',
    },
    primaryBtn: {
        marginTop: 20,
        marginBottom: 8,
        borderRadius: 12,
        paddingVertical: 4,
        width: '100%',
        backgroundColor: '#3949ab'
    },
    input: { marginBottom: 4, backgroundColor: '#fff' },
    switchRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 4,
        marginBottom: 8,
    },
    switchPrompt: { color: '#666', fontSize: 14 },
    switchLink: { margin: 0 },
    switchLinkLabel: { color: '#3949ab', fontWeight: '600', fontSize: 14 }
});
