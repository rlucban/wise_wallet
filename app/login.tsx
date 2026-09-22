import React, { useState, useCallback } from 'react';
import { View, StyleSheet, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { Text, TextInput, Button, Card, HelperText, Dialog, Portal } from 'react-native-paper';
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import { useFocusEffect, useRouter } from 'expo-router';
import { useAuthData, useAuthActions } from '../context/AuthContext';
import { useUserProfileData } from '../context/UserProfileContext';
import { addUser, saveUserProfile, API_URL, initDb, setSetting, getUsers } from '../utils/db';
import { isLocalAccountToken } from '../utils/authMode';
import * as Crypto from 'expo-crypto';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';

const PING_TIMEOUT = 3000;
const MAX_RETRIES = 2;
const BACKOFF_MS = [500, 1500];

export default function LoginScreen() {
    const { login } = useAuthActions();
    const { token } = useAuthData();
    const { profile } = useUserProfileData();
    const router = useRouter();

    useFocusEffect(
        useCallback(() => {
            if (isLocalAccountToken(token) && profile?.name) {
                setName(profile.name);
            }
        }, [token, profile])
    );

    const [name, setName] = useState("");
    const [passcode, setPasscode] = useState("");
    const [loading, setLoading] = useState(false);
    const [nameError, setNameError] = useState("");
    const [pinError, setPinError] = useState("");
    const [showPin, setShowPin] = useState(false);
    const [offlineNotice, setOfflineNotice] = useState(false);

    const [dialog, setDialog] = useState<{
        visible: boolean;
        title: string;
        message: string;
        buttons?: { text: string; onPress?: () => void; style?: "cancel" }[];
    }>({ visible: false, title: "", message: "" });

    const showAlert = (title: string, message: string, buttons?: { text: string; onPress?: () => void; style?: "cancel" }[]) => {
        setDialog({ visible: true, title, message, buttons });
    };

    const getDeviceId = async () => {
        let deviceId = await AsyncStorage.getItem('localDeviceId');
        if (!deviceId) {
            const { generateUUID } = require('../utils/uuid');
            deviceId = generateUUID();
            await AsyncStorage.setItem('localDeviceId', deviceId!);
        }
        return deviceId;
    };

    const attemptLocalLogin = async () => {
        const users = await getUsers();
        const localUser = users.find((u) => (u.name as string).toLowerCase() === name.trim().toLowerCase());

        if (localUser) {
            try {
                const hashedInput = await Crypto.digestStringAsync(
                    Crypto.CryptoDigestAlgorithm.SHA256,
                    passcode.trim()
                );

                if (localUser.passcode === hashedInput || localUser.passcode === passcode.trim()) {
                    await login(localUser.id as string, "local_token");
                } else {
                    showAlert("Error", "Invalid PIN");
                }
            } catch (err) {
                showAlert("Error", "Authentication failed. Error: " + (err as Error).message);
            }
        } else {
            if (Platform.OS === "web") {
                showAlert("Login Failed", "Invalid user name and PIN.");
                return;
            }
            showAlert(
                "Account Not Found",
                `No account found for "${name.trim()}". Would you like to create an offline-only account with these credentials?`,
                [
                    {
                        text: "Create Offline Account",
                        onPress: async () => {
                            const { generateUUID } = require('../utils/uuid');
                            const offlineId = generateUUID();
                            const usersList = await getUsers();
                            const localDuplicate = usersList.find((u) => (u.name as string).toLowerCase() === name.trim().toLowerCase());

                            if (localDuplicate) {
                                showAlert("Username Taken", "This username is already registered on this device.");
                                return;
                            }

                            await addUser(offlineId, name.trim(), passcode.trim());
                            await saveUserProfile({ name: name.trim(), isFirstRun: true, initialBalance: 0 }, offlineId);
                            await initDb(offlineId);
                            await setSetting('autoBackup', 'false');
                            await login(offlineId, "offline_token");
                            setLoading(false);
                        }
                    },
                    { text: "Try Again", style: "cancel", onPress: () => setLoading(false) }
                ]
            );
        }
    };

    const tryCloudLogin = async (force: boolean): Promise<{ ok: boolean; status: number; data?: unknown }> => {
        const deviceId = await getDeviceId();
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), PING_TIMEOUT);

        try {
            const response = await fetch(`${API_URL}/auth/login`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name: name.trim(), passcode: passcode.trim(), deviceId, force }),
                signal: controller.signal,
            });
            clearTimeout(timeoutId);
            const responseData = await response.json();
            return { ok: response.ok, status: response.status, data: responseData };
        } catch {
            clearTimeout(timeoutId);
            return { ok: false, status: 0 };
        }
    };

    const handleLogin = async (force = false) => {
        setNameError("");
        setPinError("");

        if (!name.trim()) {
            setNameError("Email or username is required");
            return;
        }

        if (!passcode.trim()) {
            setPinError("PIN is required");
            return;
        }

        setLoading(true);

        if (!API_URL) {
            console.info("No API_URL configured, using local-only login");
            await attemptLocalLogin();
            setLoading(false);
            return;
        }

        let lastResult: { ok: boolean; status: number; data?: unknown } = { ok: false, status: 0 };

        for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
            lastResult = await tryCloudLogin(force);

            if (lastResult.ok) break;
            if (lastResult.status === 401) break;

            if (attempt < MAX_RETRIES) {
                await new Promise(resolve => setTimeout(resolve, BACKOFF_MS[attempt]));
            }
        }

        if (lastResult.ok) {
            const data = lastResult.data as { data?: { sessionConflict?: boolean; user?: { id: string }; token?: string } };
            const inner = data?.data;

            if (inner?.sessionConflict) {
                setLoading(false);
                showAlert(
                    "Session Active",
                    "This account is already logged in on another device. Logging in here will log you out of the other device. Proceed?",
                    [
                        { text: "Yes, Log In", onPress: () => handleLogin(true) },
                        { text: "No", style: "cancel" }
                    ]
                );
                return;
            }

            if (inner?.user && inner?.token) {
                await addUser(inner.user.id, name.trim(), passcode.trim());
                await saveUserProfile({ name: name.trim(), isFirstRun: false, initialBalance: 0 }, inner.user.id);
                await login(inner.user.id, inner.token);
            }
        } else if (lastResult.status === 401) {
            console.info("Cloud login returned 401 - checking local users...");

            const users = await getUsers();
            const localUser = users.find((u) => (u.name as string).toLowerCase() === name.trim().toLowerCase());

            if (localUser) {
                console.info("Found local user, trying local login...");
                try {
                    const hashedInput = await Crypto.digestStringAsync(
                        Crypto.CryptoDigestAlgorithm.SHA256,
                        passcode.trim()
                    );
                    if (localUser.passcode === hashedInput || localUser.passcode === passcode.trim()) {
                        await login(localUser.id as string, "local_token");
                    } else {
                        showAlert(
                            "Login Failed",
                            "Invalid credentials. Please check your email/username and PIN."
                        );
                    }
                } catch {
                    showAlert("Login Failed", "Invalid credentials.");
                }
            } else {
                console.info("No local user found, server returned 401");
                showAlert("Login Failed", "Invalid user name and PIN.");
                setLoading(false);
                return;
            }
        } else {
            console.info("Cloud login failed after retries, showing transient notice then local fallback");
            setOfflineNotice(true);
            setTimeout(() => setOfflineNotice(false), 3000);
            await attemptLocalLogin();
        }

        setLoading(false);
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
                            <Text style={styles.tagline}>Welcome Back</Text>

                            {offlineNotice && (
                                <View style={styles.offlineNotice}>
                                    <MaterialCommunityIcons name="wifi-off" size={16} color="#fff" />
                                    <Text style={styles.offlineNoticeText}>No connection — checking this device…</Text>
                                </View>
                            )}

                            <Card style={styles.card}>
                                <Card.Content>
                                    <Text style={styles.fieldLabel}>Email or Username</Text>
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
                                        keyboardType="email-address"
                                        placeholder="Enter email or username"
                                        left={<TextInput.Icon icon="account-outline" color="#1a237e" />}
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
                                            onPress={() => handleLogin(false)}
                                            loading={loading}
                                            disabled={loading}
                                            style={styles.primaryBtn}
                                        >
                                            Login
                                        </Button>
                                    </View>

                                    <View style={styles.switchRow}>
                                        <Text style={styles.switchPrompt}>Don't have an account?</Text>
                                        <Button
                                            compact
                                            mode="text"
                                            onPress={() => router.replace("/register")}
                                            disabled={loading}
                                            style={styles.switchLink}
                                            labelStyle={styles.switchLinkLabel}
                                        >
                                            Register
                                        </Button>
                                    </View>

                                    <View style={styles.infoBox}>
                                        <Text variant="bodySmall" style={{ color: '#888', textAlign: 'center', marginTop: 6 }}>
                                            • Cloud accounts use email + PIN
                                        </Text>
                                        <Text variant="bodySmall" style={{ color: '#888', textAlign: 'center', marginTop: 2 }}>
                                            • Local accounts use username + PIN
                                        </Text>
                                        <Text variant="bodySmall" style={{ color: '#888', textAlign: 'center', marginTop: 2 }}>
                                            • Login auto-detects account type
                                        </Text>
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
        ...Platform.select({
            web: { textShadow: "0px 2px 10px rgba(0, 0, 0, 0.4)" },
            default: {
                textShadowColor: 'rgba(0, 0, 0, 0.4)',
                textShadowOffset: { width: 0, height: 2 },
                textShadowRadius: 10,
            },
        }),
    },
    tagline: {
        fontSize: 18,
        color: "rgba(255,255,255,0.9)",
        textAlign: 'center',
        marginBottom: 28,
        fontWeight: '500',
        ...Platform.select({
            web: { textShadow: "0px 1px 3px rgba(0, 0, 0, 0.2)" },
            default: {
                textShadowColor: 'rgba(0, 0, 0, 0.2)',
                textShadowOffset: { width: 0, height: 1 },
                textShadowRadius: 3,
            },
        }),
    },
    card: {
        backgroundColor: '#fff',
        borderRadius: 24,
        padding: 8,
        elevation: 8,
        ...Platform.select({
            web: { boxShadow: '0px 4px 8px rgba(0, 0, 0, 0.2)' },
            default: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.2,
                shadowRadius: 8,
            },
        }),
    },
    fieldLabel: {
        color: '#666',
        fontSize: 13,
        fontWeight: '600',
        marginBottom: 6,
        marginTop: 4,
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
    offlineNotice: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(255,255,255,0.15)',
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 8,
        marginBottom: 16,
        gap: 6,
    },
    offlineNoticeText: {
        color: '#fff',
        fontSize: 13,
        fontWeight: '500',
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
