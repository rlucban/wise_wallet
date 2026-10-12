import React, { useEffect, useRef, useState } from "react";
import {
    View,
    Text,
    TextInput as RNTextInput,
    StyleSheet,
    Platform,
    ActivityIndicator,
} from "react-native";
import { TextInput, Button, IconButton, Dialog, Portal } from "react-native-paper";
import { LinearGradient } from "expo-linear-gradient";

// =====================================================================
// SPEC-98 MOCK PREVIEW — no backend wiring.
// Simulates the full Forgot PIN flow so the user can review the process
// before finalizing SPEC-98. The real implementation replaces the mock
// `simulate*` calls with the wallet-api contract (D-B-01..05).
// =====================================================================

type ForgotPinStep = "email" | "loading" | "otp" | "newpin";

interface ForgotPinFlowProps {
    visible: boolean;
    from: "login" | "settings";
    prefilledEmail?: string;
    onClose: () => void;
    onResetSuccess?: (email: string) => void;
}

const MOCK_EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Mock token: 000000 succeeds; any other 6 digits = wrong code (demo of error + lockout).
const MOCK_OK_CODE = "000000";
const MOCK_MAX_ATTEMPTS = 5;
const MOCK_RESEND_COOLDOWN_SEC = 60;
const MOCK_MAX_RESENDS = 3;

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

export default function ForgotPinFlow({
    visible,
    from,
    prefilledEmail = "",
    onClose,
    onResetSuccess,
}: ForgotPinFlowProps) {
    const [step, setStep] = useState<ForgotPinStep>("email");
    const [email, setEmail] = useState("");
    const [emailError, setEmailError] = useState("");

    const [otpDigits, setOtpDigits] = useState<string[]>(["", "", "", "", "", ""]);
    const [otpActiveIndex, setOtpActiveIndex] = useState(0);
    const [otpError, setOtpError] = useState("");
    const [attempts, setAttempts] = useState(0);

    const [resendCount, setResendCount] = useState(0);
    const [resendCooldown, setResendCooldown] = useState(0);

    const [newPin, setNewPin] = useState("");
    const [confirmPin, setConfirmPin] = useState("");
    const [pinError, setPinError] = useState("");

    const [promptVisible, setPromptVisible] = useState(false);
    const [successVisible, setSuccessVisible] = useState(false);
    const [lockoutVisible, setLockoutVisible] = useState(false);

    const otpRefs = useRef<(RNTextInput | null)[]>([]);
    const cooldownTimer = useRef<ReturnType<typeof setInterval> | null>(null);

    const resetState = () => {
        setStep("email");
        setEmail(prefilledEmail);
        setEmailError("");
        setOtpDigits(["", "", "", "", "", ""]);
        setOtpActiveIndex(0);
        setOtpError("");
        setAttempts(0);
        setResendCount(0);
        setResendCooldown(0);
        setNewPin("");
        setConfirmPin("");
        setPinError("");
        setPromptVisible(false);
        setSuccessVisible(false);
        setLockoutVisible(false);
    };

    useEffect(() => {
        if (visible) {
            resetState();
        }
        return () => {
            if (cooldownTimer.current) {
                clearInterval(cooldownTimer.current);
                cooldownTimer.current = null;
            }
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [visible]);

    useEffect(() => {
        if (resendCooldown <= 0 && cooldownTimer.current) {
            clearInterval(cooldownTimer.current);
            cooldownTimer.current = null;
        }
    }, [resendCooldown]);

    const startResendCooldown = () => {
        if (cooldownTimer.current) clearInterval(cooldownTimer.current);
        setResendCooldown(MOCK_RESEND_COOLDOWN_SEC);
        cooldownTimer.current = setInterval(() => {
            setResendCooldown((s) => {
                if (s <= 1) {
                    if (cooldownTimer.current) {
                        clearInterval(cooldownTimer.current);
                        cooldownTimer.current = null;
                    }
                    return 0;
                }
                return s - 1;
            });
        }, 1000);
    };

    const handleProceed = () => {
        const value = email.trim();
        if (!value) {
            setEmailError("Email is required");
            return;
        }
        if (!MOCK_EMAIL_RE.test(value)) {
            setEmailError("Enter a valid email address");
            return;
        }
        setEmailError("");
        setPromptVisible(true);
    };

    const handleOkay = async () => {
        setPromptVisible(false);
        setStep("loading");
        await sleep(1400); // mock: POST auth/forgot-pin/request (always 200)
        setStep("otp");
        setTimeout(() => otpRefs.current[0]?.focus(), 120);
    };

    const handleOtpChange = (index: number, text: string) => {
        setOtpError("");
        const clean = text.replace(/[^0-9]/g, "");
        const next = [...otpDigits];
        if (clean.length >= 1) {
            for (let i = 0; i < clean.length && index + i < 6; i++) {
                next[index + i] = clean[i];
            }
        } else {
            next[index] = "";
        }
        setOtpDigits(next);
        const filledAt = clean.length > 0 ? index + clean.length - 1 : index;
        const focusTo = Math.min(filledAt + 1, 5);
        if (clean.length > 0 && filledAt < 5) {
            otpRefs.current[focusTo]?.focus();
        } else if (clean.length === 0 && index > 0) {
            otpRefs.current[index - 1]?.focus();
        }
    };

    const otpJoined = otpDigits.join("");
    const handleVerify = async () => {
        if (otpJoined.length !== 6) return;
        setStep("loading");
        await sleep(900); // mock: POST auth/forgot-pin/verify
        if (otpJoined === MOCK_OK_CODE) {
            setStep("newpin");
            setTimeout(() => setOtpDigits(["", "", "", "", "", ""]), 0);
        } else {
            const nextAttempts = attempts + 1;
            setAttempts(nextAttempts);
            if (nextAttempts >= MOCK_MAX_ATTEMPTS) {
                setLockoutVisible(true);
                setStep("email");
                setOtpDigits(["", "", "", "", "", ""]);
            } else {
                setStep("otp");
                setOtpError("Invalid or expired code. Please try again.");
                setOtpDigits(["", "", "", "", "", ""]);
                setTimeout(() => otpRefs.current[0]?.focus(), 80);
            }
        }
    };

    const handleResend = async () => {
        if (resendCount >= MOCK_MAX_RESENDS) return;
        setResendCount((c) => c + 1);
        startResendCooldown();
        setOtpError("");
        setOtpDigits(["", "", "", "", "", ""]);
        setTimeout(() => otpRefs.current[0]?.focus(), 80);
    };

    const newPinValid = /^\d{4}$/.test(newPin);
    const confirmValid = /^\d{4}$/.test(confirmPin);
    const pinsMatch = newPin === confirmPin;
    const canReset = newPinValid && confirmValid && pinsMatch;

    const handleResetPin = async () => {
        if (!canReset) return;
        setPinError("");
        setStep("loading");
        await sleep(1200); // mock: POST auth/forgot-pin/reset
        setStep("newpin");
        setSuccessVisible(true);
    };

    const handleSuccessOk = () => {
        setSuccessVisible(false);
        if (from === "login") {
            onResetSuccess?.(email.trim());
        }
        onClose();
    };

    const prettyEmail = email.trim() || "your email";

    return (
        <>
            {!visible ? null : (
            <View style={styles.overlay}>
            <LinearGradient colors={["#1a237e", "#283593", "#3949ab"]} style={styles.gradient}>
                <View style={styles.topBar}>
                    <View style={styles.mockBadge}>
                        <Text style={styles.mockBadgeText}>MOCK PREVIEW — no backend</Text>
                    </View>
                    <IconButton
                        icon="close"
                        iconColor="#fff"
                        size={24}
                        disabled={step === "loading"}
                        onPress={onClose}
                    />
                </View>

                {step === "loading" ? (
                    <View style={styles.loadingWrap}>
                        <ActivityIndicator size="large" color="#fff" />
                        <Text style={styles.loadingText}>Sending verification code…</Text>
                        <Text style={styles.loadingSub}>Simulating the wallet-api call…</Text>
                    </View>
                ) : (
                    <View style={styles.cardWrap}>
                        {/* STEP: EMAIL */}
                        {step === "email" && (
                            <View style={styles.card}>
                                <Text style={styles.title}>Forgot PIN?</Text>
                                <Text style={styles.subtitle}>
                                    Enter the email linked to your account to recover your PIN.
                                </Text>
                                <Text style={styles.fieldLabel}>Email</Text>
                                <TextInput
                                    value={email}
                                    onChangeText={(t) => {
                                        setEmail(t);
                                        setEmailError("");
                                    }}
                                    style={styles.input}
                                    textColor="#1a237e"
                                    mode="outlined"
                                    outlineColor="#e0e0e0"
                                    activeOutlineColor="#3949ab"
                                    error={!!emailError}
                                    autoCapitalize="none"
                                    autoCorrect={false}
                                    keyboardType="email-address"
                                    inputMode="email"
                                    returnKeyType="done"
                                    onSubmitEditing={handleProceed}
                                    placeholder="Enter your email address"
                                    left={
                                        <TextInput.Icon
                                            icon="email-outline"
                                            color="#1a237e"
                                        />
                                    }
                                />
                                {from === "settings" ? (
                                    <Text style={styles.readOnlyNote}>
                                        This is your signed-in email, shown for review.
                                    </Text>
                                ) : null}
                                {!!emailError && (
                                    <Text style={styles.errorText}>{emailError}</Text>
                                )}
                                <Button
                                    mode="contained"
                                    onPress={handleProceed}
                                    style={styles.primaryBtn}
                                    labelStyle={styles.primaryLabel}
                                >
                                    Proceed
                                </Button>
                            </View>
                        )}

                        {/* STEP: OTP */}
                        {step === "otp" && (
                            <View style={styles.card}>
                                <Text style={styles.title}>Enter Verification Code</Text>
                                <Text style={styles.subtitle}>
                                    Enter the 6-digit code sent to {prettyEmail}.
                                </Text>
                                <View style={styles.otpRow}>
                                    {otpDigits.map((digit, i) => (
<RNTextInput
                                        key={i}
                                        ref={(ref) => {
                                            otpRefs.current[i] = ref;
                                        }}
                                        value={digit}
                                        onChangeText={(t) => handleOtpChange(i, t)}
                                        onFocus={() => setOtpActiveIndex(i)}
                                        onKeyPress={(e) => {
                                            if (
                                                e.nativeEvent.key === "Backspace" &&
                                                digit === "" &&
                                                i > 0
                                            ) {
                                                otpRefs.current[i - 1]?.focus();
                                            }
                                        }}
                                        keyboardType={Platform.OS === "web" ? undefined : "number-pad"}
                                        inputMode="numeric"
                                        maxLength={6}
                                        returnKeyType={i === 5 ? "done" : "next"}
                                        onSubmitEditing={i === 5 ? handleVerify : undefined}
                                        selectionColor="#3949ab"
                                        style={[
                                            styles.otpBox,
                                            i === otpActiveIndex && styles.otpBoxActive,
                                        ]}
                                    />
                                    ))}
                                </View>
                                {!!otpError && (
                                    <Text style={styles.errorText}>{otpError}</Text>
                                )}
                                <View style={styles.resendRow}>
                                    {resendCount >= MOCK_MAX_RESENDS ? (
                                        <Text style={styles.resendText}>No resends left</Text>
                                    ) : resendCooldown > 0 ? (
                                        <Text style={styles.resendText}>
                                            Resend in {resendCooldown}s
                                        </Text>
                                    ) : (
                                        <Button compact mode="text" onPress={handleResend}>
                                            Resend code
                                        </Button>
                                    )}
                                </View>
                                <Button
                                    mode="contained"
                                    onPress={handleVerify}
                                    disabled={otpJoined.length !== 6}
                                    style={[styles.primaryBtn, otpJoined.length !== 6 && styles.btnDisabled]}
                                    labelStyle={styles.primaryLabel}
                                >
                                    Verify
                                </Button>
                                <Text style={styles.mockHint}>
                                    MOCK: enter 000000 for success; any other 6 digits = wrong code
                                    ({MOCK_MAX_ATTEMPTS - attempts} attempts left)
                                </Text>
                            </View>
                        )}

                        {/* STEP: NEW PIN */}
                        {step === "newpin" && (
                            <View style={styles.card}>
                                <Text style={styles.title}>Set New PIN</Text>
                                <Text style={styles.subtitle}>
                                    Choose a new 4-digit PIN. You'll use it the next time you log in
                                    and to unlock on this device.
                                </Text>
                                <Text style={styles.fieldLabel}>New PIN</Text>
                                <TextInput
                                    value={newPin}
                                    onChangeText={(t) => {
                                        setNewPin(t.replace(/[^0-9]/g, "").slice(0, 4));
                                        setPinError("");
                                    }}
                                    keyboardType="numeric"
                                    inputMode="numeric"
                                    maxLength={4}
                                    secureTextEntry
                                    style={styles.input}
                                    textColor="#1a237e"
                                    mode="outlined"
                                    outlineColor="#e0e0e0"
                                    activeOutlineColor="#3949ab"
                                />
                                <Text style={styles.fieldLabel}>Confirm New PIN</Text>
                                <TextInput
                                    value={confirmPin}
                                    onChangeText={(t) => {
                                        setConfirmPin(t.replace(/[^0-9]/g, "").slice(0, 4));
                                        setPinError("");
                                    }}
                                    keyboardType="numeric"
                                    inputMode="numeric"
                                    maxLength={4}
                                    secureTextEntry
                                    returnKeyType="done"
                                    onSubmitEditing={handleResetPin}
                                    style={styles.input}
                                    textColor="#1a237e"
                                    mode="outlined"
                                    outlineColor="#e0e0e0"
                                    activeOutlineColor="#3949ab"
                                />
                                {!newPinValid && newPin.length > 0 && (
                                    <Text style={styles.errorText}>New PIN must be 4 digits.</Text>
                                )}
                                {newPinValid && confirmPin.length > 0 && !pinsMatch && (
                                    <Text style={styles.errorText}>New PINs do not match.</Text>
                                )}
                                <Button
                                    mode="contained"
                                    onPress={handleResetPin}
                                    disabled={!canReset}
                                    style={[styles.primaryBtn, !canReset && styles.btnDisabled]}
                                    labelStyle={styles.primaryLabel}
                                >
                                    Reset PIN
                                </Button>
                            </View>
                        )}
                    </View>
                )}
            </LinearGradient>
            </View>
            )}

            <Portal>
                {/* NEUTRAL PROMPT */}
                <Dialog
                    visible={promptVisible}
                    onDismiss={() => setPromptVisible(false)}
                >
                    <Dialog.Icon icon="email-check-outline" />
                    <Dialog.Title style={{ textAlign: "center" }}>
                        Check Your Email
                    </Dialog.Title>
                    <Dialog.Content>
                        <Text variant="bodyMedium" style={{ textAlign: "center", lineHeight: 22 }}>
                            If email account is registered, you will receive an email.
                        </Text>
                    </Dialog.Content>
                    <Dialog.Actions style={{ justifyContent: "center" }}>
                        <Button mode="contained" labelStyle={styles.primaryLabel} onPress={handleOkay}>
                            Okay
                        </Button>
                    </Dialog.Actions>
                </Dialog>

                {/* LOCKOUT */}
                <Dialog
                    visible={lockoutVisible}
                    onDismiss={() => setLockoutVisible(false)}
                >
                    <Dialog.Icon icon="alert-circle-outline" />
                    <Dialog.Title style={{ textAlign: "center" }}>Too Many Attempts</Dialog.Title>
                    <Dialog.Content>
                        <Text variant="bodyMedium" style={{ textAlign: "center", lineHeight: 22 }}>
                            Too many attempts. Please try again later.
                        </Text>
                    </Dialog.Content>
                    <Dialog.Actions style={{ justifyContent: "center" }}>
                        <Button mode="contained" labelStyle={styles.primaryLabel} onPress={() => setLockoutVisible(false)}>
                            Try Again
                        </Button>
                    </Dialog.Actions>
                </Dialog>

                {/* SUCCESS */}
                <Dialog
                    visible={successVisible}
                    onDismiss={handleSuccessOk}
                >
                    <Dialog.Icon icon="check-circle-outline" />
                    <Dialog.Title style={{ textAlign: "center" }}>PIN Reset</Dialog.Title>
                    <Dialog.Content>
                        <Text variant="bodyMedium" style={{ textAlign: "center", lineHeight: 22 }}>
                            {from === "login"
                                ? "Your PIN has been reset. Please log in with your new PIN."
                                : "Your PIN has been reset."}
                        </Text>
                    </Dialog.Content>
                    <Dialog.Actions style={{ justifyContent: "center" }}>
                        <Button mode="contained" labelStyle={styles.primaryLabel} onPress={handleSuccessOk}>
                            OK
                        </Button>
                    </Dialog.Actions>
                </Dialog>
            </Portal>
        </>
    );
}

const styles = StyleSheet.create({
    gradient: { flex: 1 },
    overlay: {
        ...StyleSheet.absoluteFillObject,
        zIndex: 20,
        elevation: 20,
    },
    topBar: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 16,
        paddingTop: Platform.OS === "web" ? 16 : 48,
    },
    mockBadge: {
        backgroundColor: "#FFDAB9",
        borderRadius: 8,
        paddingHorizontal: 10,
        paddingVertical: 4,
    },
    mockBadgeText: { color: "#5D4037", fontSize: 11, fontWeight: "700" },
    loadingWrap: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
    },
    loadingText: {
        color: "#fff",
        fontSize: 16,
        fontWeight: "600",
        marginTop: 14,
    },
    loadingSub: {
        color: "rgba(255,255,255,0.7)",
        fontSize: 12,
        marginTop: 4,
    },
    cardWrap: {
        flex: 1,
        justifyContent: "center",
        padding: 24,
    },
    card: {
        backgroundColor: "#fff",
        borderRadius: 24,
        padding: 20,
        ...Platform.select({
            web: { boxShadow: "0px 4px 8px rgba(0, 0, 0, 0.2)" },
            default: {
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.2,
                shadowRadius: 8,
                elevation: 8,
            },
        }),
    },
    title: {
        fontSize: 22,
        fontWeight: "700",
        color: "#1a237e",
        textAlign: "center",
        marginBottom: 6,
    },
    subtitle: {
        fontSize: 14,
        color: "#666",
        textAlign: "center",
        lineHeight: 20,
        marginBottom: 14,
    },
    fieldLabel: {
        color: "#666",
        fontSize: 13,
        fontWeight: "600",
        marginBottom: 6,
        marginTop: 6,
    },
    input: { backgroundColor: "#fff" },
    readOnlyNote: {
        fontSize: 12,
        color: "#888",
        marginTop: 4,
        fontStyle: "italic",
    },
    errorText: { color: "#DC2626", fontSize: 13, marginTop: 6, textAlign: "center" },
    primaryBtn: {
        marginTop: 18,
        borderRadius: 12,
        paddingVertical: 4,
        backgroundColor: "#3949ab",
    },
    btnDisabled: { opacity: 0.5 },
    primaryLabel: { color: "#fff" },
    otpRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginTop: 12,
    },
    otpBox: {
        width: 44,
        height: 54,
        borderRadius: 12,
        borderWidth: 1.5,
        borderColor: "#d0d0d0",
        backgroundColor: "#fff",
        textAlign: "center",
        fontSize: 20,
        fontWeight: "700",
        color: "#1a237e",
    },
    otpBoxActive: {
        borderColor: "#3949ab",
    },
    resendRow: {
        alignItems: "center",
        marginTop: 8,
        minHeight: 32,
    },
    resendText: { color: "#888", fontSize: 13 },
    mockHint: {
        marginTop: 12,
        fontSize: 11,
        color: "#B45309",
        textAlign: "center",
        lineHeight: 15,
    },
});