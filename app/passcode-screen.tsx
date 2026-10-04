import React, { useState, useRef, useEffect } from "react";
import { View, StyleSheet, TextInput as NativeTextInput } from "react-native";
import { Text, TextInput, useTheme, Card, HelperText } from "react-native-paper";
import { usePasscode } from "../context/PasscodeContext";
import { normalizePasscodeInput } from "../utils/passcodeValidation";

export default function PasscodeScreen() {
  const theme = useTheme();
  const { passcode, setIsUnlocked } = usePasscode();
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
    const cleaned = normalizePasscodeInput(text);
    setInput(cleaned);
    setError("");

    if (cleaned.length === 4) {
      if (cleaned === passcode) {
        setIsUnlocked(true);
      } else {
        setError("Incorrect Passcode");
        setTimeout(() => {
          setInput("");
        }, 600);
      }
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Card style={[styles.card, { backgroundColor: theme.colors.surface }]}>
        <Card.Content style={styles.cardContent}>
          <Text variant="headlineSmall" style={styles.title}>
            Enter Passcode
          </Text>
          <Text variant="bodyMedium" style={[styles.subtitle, { color: theme.colors.onSurfaceVariant }]}>
            Enter your 4-digit PIN to access WiseWallet
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

          {/* Clean numeric text input with autoFocus and native keyboard */}
          <TextInput
            ref={inputRef}
            mode="outlined"
            label="4-Digit Passcode"
            placeholder="••••"
            value={input}
            onChangeText={handleInputChange}
            keyboardType="numeric"
            secureTextEntry
            maxLength={4}
            error={!!error}
            style={styles.input}
            contentStyle={styles.inputContent}
            autoFocus
          />

          {error ? (
            <HelperText type="error" visible={!!error} style={styles.errorText}>
              {error}
            </HelperText>
          ) : null}
        </Card.Content>
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  card: {
    width: "100%",
    maxWidth: 380,
    borderRadius: 24,
    elevation: 4,
  },
  cardContent: {
    alignItems: "center",
    paddingVertical: 32,
    paddingHorizontal: 24,
  },
  title: {
    fontWeight: "700",
    marginBottom: 8,
    textAlign: "center",
  },
  subtitle: {
    marginBottom: 28,
    textAlign: "center",
  },
  dotsContainer: {
    flexDirection: "row",
    justifyContent: "center",
    marginBottom: 28,
    gap: 16,
  },
  dot: {
    width: 16,
    height: 16,
    borderRadius: 8,
  },
  input: {
    width: "100%",
    maxWidth: 260,
  },
  inputContent: {
    textAlign: "center",
    letterSpacing: 10,
    fontSize: 22,
  },
  errorText: {
    textAlign: "center",
    marginTop: 8,
  },
});
