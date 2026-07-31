import React, { useState, useCallback } from 'react';
import { View, StyleSheet, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { Text, TextInput, Button, Card, HelperText, Dialog, Portal } from 'react-native-paper';
import { useFocusEffect } from 'expo-router';
import { useAuthData, useAuthActions } from '../context/AuthContext';
import { useUserProfileData } from '../context/UserProfileContext';
import { addUser, saveUserProfile, API_URL, initDb, setSetting, getUsers } from '../utils/db';
import * as Crypto from 'expo-crypto';
import { LinearGradient } from 'expo-linear-gradient';

import AsyncStorage from '@react-native-async-storage/async-storage';

export default function AuthScreen() {
    const { login } = useAuthActions();
    const { token } = useAuthData();
    const { profile } = useUserProfileData();

    useFocusEffect(
        useCallback(() => {
            if (token === 'offline_token' && profile?.name) {
                setName(profile.name);
            }
        }, [token, profile])
    );

    const [name, setName] = useState("");
    const [passcode, setPasscode] = useState("");
    const [loading, setLoading] = useState(false);
    const [nameError, setNameError] = useState("");
    const [pinError, setPinError] = useState("");

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

    const createCloudAccount = async (email: string, pin: string): Promise<boolean> => {
        if (!API_URL) {
            showAlert("Cloud Unavailable", "Cloud registration is not available. Please check your connection or create an offline-only account.");
            return false;
        }

        try {
            const response = await fetch(`${API_URL}/auth/register`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name: email.trim(), passcode: pin.trim(), initialBalance: 0 }),
            });

            const responseData = await response.json();

            if (response.ok) {
                await addUser(responseData.data.user.id, email.trim(), pin.trim());
                await saveUserProfile({ name: email.trim(), isFirstRun: true, initialBalance: 0 }, responseData.data.user.id);
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
                            const success = await createLocalAccount(email.trim(), pin.trim());
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

    const handleRegisterClick = async () => {
        setNameError("");
        setPinError("");

        if (!name.trim()) {
            setNameError("Username or email is required");
            return;
        }

        if (!passcode.trim()) {
            setPinError("PIN is required");
            return;
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        const isEmail = emailRegex.test(name.trim());

        setLoading(true);

        if (isEmail) {
            const success = await createCloudAccount(name.trim(), passcode.trim());
            if (!success) {
                setLoading(false);
            }
        } else {
            showAlert(
                "Create Account",
                `You entered "${name.trim()}" which is not an email format.\n\nChoose account type:`,
                [
                    {
                        text: "Cloud Account (Use Email)",
                        onPress: () => {
                            setNameError("Please enter a valid email for cloud registration");
                            setLoading(false);
                        }
                    },
                    {
                        text: "Offline-Only Account",
                        onPress: async () => {
                         const _success = await createLocalAccount(name.trim(), passcode.trim());
                         setLoading(false);
                        }
                    },
                    { text: "Cancel", style: "cancel", onPress: () => setLoading(false) }
                ]
            );
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
        const deviceId = await getDeviceId();

        if (!API_URL) {
            console.info("No API_URL configured, using local-only login");
            await attemptLocalLogin();
            setLoading(false);
            return;
        }

        try {
            const response = await fetch(`${API_URL}/auth/login`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name: name.trim(), passcode: passcode.trim(), deviceId, force }),
            });

            const responseData = await response.json();

             if (response.ok) {
                 const data = responseData.data;

                 if (data.sessionConflict) {
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

                 await addUser(data.user.id, name.trim(), passcode.trim());
                 await saveUserProfile({ name: name.trim(), isFirstRun: false, initialBalance: 0 }, data.user.id);
                 await login(data.user.id, data.token);
              } else if (response.status === 401) {
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
                      return;
                  }
              } else {
                 console.info("Cloud login failed, trying local fallback...");
                 await attemptLocalLogin();
             }
         } catch (_e: unknown) {
             console.error("Online login failed (network error), attempting local fallback:", _e);
             await attemptLocalLogin();
         } finally {
             setLoading(false);
         }
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
             console.info("No local user found in attemptLocalLogin, offering to register offline...");
             showAlert(
                 "Account Not Found",
                 `No account found for "${name.trim()}". Would you like to create an offline-only account with these credentials?`,
                 [
                     {
                         text: "Create Offline Account",
                         onPress: async () => {
                        const _success = await createLocalAccount(name.trim(), passcode.trim());
                        setLoading(false);
                         }
                     },
                     { text: "Try Again", style: "cancel", onPress: () => setLoading(false) }
                 ]
             );
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
                                textColor={btn.style === "cancel" ? undefined : undefined}
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
                        <Text style={styles.appName}>WiseWallet</Text>
                        <Text style={styles.tagline}>{token === 'offline_token' ? 'Link Your Account' : 'Welcome Back'}</Text>
                        {token === 'offline_token' && (
                            <Text style={{ color: '#fff', textAlign: 'center', marginBottom: 12, opacity: 0.8 }}>
                                Register your local account to the cloud to enable sync.
                            </Text>
                        )}

                        <Card style={styles.card}>
                            <Card.Content>
                                <TextInput
                                    label="Email or Username"
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
                                />
                                <HelperText type="error" visible={!!nameError}>
                                    {nameError}
                                </HelperText>

                                <TextInput
                                    label="PIN (4-digits)"
                                    value={passcode}
                                    onChangeText={(text) => { setPasscode(text); setPinError(""); }}
                                    keyboardType="numeric"
                                    secureTextEntry
                                    style={styles.input}
                                    textColor="#1a237e"
                                    mode="outlined"
                                    outlineColor="#e0e0e0"
                                    activeOutlineColor="#3949ab"
                                    error={!!pinError}
                                />
                                <HelperText type="error" visible={!!pinError}>
                                    {pinError}
                                </HelperText>

                                <View style={{ flexDirection: 'row', gap: 12, marginTop: 12 }}>
                                    <Button
                                        mode="contained"
                                        onPress={() => handleLogin(false)}
                                        loading={loading}
                                        disabled={loading}
                                        style={[styles.createBtn, { flex: 1, marginTop: 0 }]}
                                    >
                                        Login
                                    </Button>
                                    <Button
                                        mode="outlined"
                                        onPress={() => handleRegisterClick()}
                                        loading={loading}
                                        disabled={loading}
                                        style={[styles.createBtn, { flex: 1, marginTop: 0, backgroundColor: 'transparent', borderColor: '#3949ab' }]}
                                        textColor="#3949ab"
                                    >
                                        Register
                                    </Button>
                                </View>

                                <View style={styles.infoBox}>
                                    <Text variant="bodySmall" style={{ color: '#666', textAlign: 'center' }}>
                                        💡 Tips:
                                    </Text>
                                    <Text variant="bodySmall" style={{ color: '#888', textAlign: 'center', marginTop: 4 }}>
                                        • Use email for cloud sync
                                    </Text>
                                    <Text variant="bodySmall" style={{ color: '#888', textAlign: 'center' }}>
                                        • Use any username for offline-only
                                    </Text>
                                    <Text variant="bodySmall" style={{ color: '#888', textAlign: 'center' }}>
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
    appName: {
        fontSize: 42,
        fontWeight: "bold",
        color: "#fff",
        textAlign: 'center',
        marginBottom: 8,
        letterSpacing: 1,
        textShadowColor: 'rgba(0, 0, 0, 0.4)',
        textShadowOffset: { width: 0, height: 2 },
        textShadowRadius: 10
    },
    tagline: {
        fontSize: 18,
        color: "rgba(255,255,255,0.9)",
        textAlign: 'center',
        marginBottom: 24,
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
    infoBox: {
        marginTop: 12,
        marginBottom: 4,
        paddingVertical: 8,
        paddingHorizontal: 12,
        backgroundColor: '#f5f5f5',
        borderRadius: 8,
    },
    createBtn: { marginTop: 20, marginBottom: 8, borderRadius: 12, paddingVertical: 4, backgroundColor: '#3949ab' },
    input: { marginBottom: 4, backgroundColor: '#fff' }
});
