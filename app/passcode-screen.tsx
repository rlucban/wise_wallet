import React, { useState, useRef, useEffect } from "react";
import { View, StyleSheet, Pressable, ScrollView, TextInput as NativeTextInput } from "react-native";
import { Text, TextInput, useTheme, HelperText, Button } from "react-native-paper";
import { usePasscode } from "../context/PasscodeContext";

export default function PasscodeScreen() {
  const theme = useTheme();
  const { verifyPasscode, setIsUnlocked, markPinVerified } = usePasscode();
  const [input, setInput] = useState("");
  const [error, setError] = useState("");

  const inputRef = useRef<NativeTextInput | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      inputRef.current?.focus();
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  const handleInputChange = (text: string) => {
    const cleaned = text.replace(/[^0-9]/g, "").slice(0, 4);
    setInput(cleaned);
    setError("");

    if (cleaned.length === 4) {
      // SPEC-35 D-01: hash-aware verify so the persisted lock unlocks after restart.
      verifyPasscode(cleaned).then((ok) => {
        if (ok) {
          markPinVerified();
          setIsUnlocked(true);
        } else {
          setError("Incorrect passcode. Please try again.");
          setTimeout(() => {
            setInput("");
          }, 600);
        }
      });
    }
  };

  return (
    <View style={[StyleSheet.absoluteFill, { backgroundColor: theme.colors.background }]}>
      <Pressable
        style={styles.inner}
        onPress={() => inputRef.current?.focus()}
      >
        <ScrollView
          style={{ flex: 1, width: "100%" }}
          contentContainerStyle={{ flexGrow: 1, justifyContent: "center", alignItems: "center", width: "100%" }}
          keyboardShouldPersistTaps="handled"
        >
        <Text variant="headlineMedium" style={[styles.title, { color: theme.colors.onBackground }]}>
          Enter passcode
        </Text>
        <Text variant="bodyMedium" style={[styles.subtitle, { color: theme.colors.onSurfaceVariant }]}>
          {"After 3 failed attempts you'll need to reset your passcode."}
        </Text>

        {/* Visual 4-dot indicator */}
        <View style={styles.dotsContainer}>
          {[1, 2, 3, 4].map((i) => (
            <View
              key={i}
              style={[
                styles.dot,
                {
                  backgroundColor:
                    error
                      ? theme.colors.error
                      : input.length >= i
                      ? theme.colors.primary
                      : theme.colors.outlineVariant,
                },
              ]}
            />
          ))}
        </View>

        {/* Hidden numeric input — native keyboard */}
        <TextInput
          ref={inputRef}
          value={input}
          onChangeText={handleInputChange}
          keyboardType="numeric"
          secureTextEntry
          maxLength={4}
          autoFocus
          style={styles.hiddenInput}
        />

        {error ? (
          <View style={styles.errorContainer}>
            <HelperText type="error" visible={!!error} style={styles.errorText}>
              {error}
            </HelperText>
          </View>
        ) : null}

        <Button
          mode="contained"
          disabled={input.length !== 4}
          onPress={() => handleInputChange(input)}
          style={styles.unlockButton}
          contentStyle={styles.unlockButtonContent}
        >
          Unlock
          </Button>
        </ScrollView>
        </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  inner: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
    paddingVertical: 48,
  },
  title: {
    fontWeight: "700",
    marginBottom: 12,
    textAlign: "center",
  },
  subtitle: {
    marginBottom: 40,
    textAlign: "center",
  },
  dotsContainer: {
    flexDirection: "row",
    justifyContent: "center",
    marginBottom: 32,
    gap: 20,
  },
  dot: {
    width: 18,
    height: 18,
    borderRadius: 9,
  },
  hiddenInput: {
    opacity: 0,
    height: 1,
    width: 1,
    position: "absolute",
    top: 0,
  },
  errorContainer: {
    width: "100%",
    alignItems: "center",
  },
  errorText: {
    textAlign: "center",
    marginBottom: 8,
  },
  unlockButton: {
    marginTop: 8,
    width: "100%",
    maxWidth: 320,
    borderRadius: 12,
  },
  unlockButtonContent: {
    paddingVertical: 6,
  },
});
