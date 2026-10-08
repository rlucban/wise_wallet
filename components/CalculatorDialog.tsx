import React, { useState } from "react";
import { Modal as NativeModal, Pressable, StyleSheet, View } from "react-native";
import { Button, Text, useTheme } from "react-native-paper";
import { evaluateCalculatorExpression } from "../utils/calculator";

const ROWS: { label: string; value: string; variant?: "number" | "operator" | "action" }[][] = [
  [
    { label: "C", value: "clear", variant: "action" },
    { label: "(", value: "(", variant: "action" },
    { label: ")", value: ")", variant: "action" },
    { label: "÷", value: "/", variant: "operator" },
  ],
  [
    { label: "7", value: "7" },
    { label: "8", value: "8" },
    { label: "9", value: "9" },
    { label: "×", value: "*", variant: "operator" },
  ],
  [
    { label: "4", value: "4" },
    { label: "5", value: "5" },
    { label: "6", value: "6" },
    { label: "−", value: "-", variant: "operator" },
  ],
  [
    { label: "1", value: "1" },
    { label: "2", value: "2" },
    { label: "3", value: "3" },
    { label: "+", value: "+", variant: "operator" },
  ],
  [
    { label: "0", value: "0" },
    { label: ".", value: "." },
    { label: "=", value: "=", variant: "operator" },
    { label: "⌫", value: "back", variant: "action" },
  ],
];

export function CalculatorDialog({ visible, onDismiss }: { visible: boolean; onDismiss: () => void }) {
  const theme = useTheme();
  const [expression, setExpression] = useState("");
  const [error, setError] = useState<string | null>(null);

  const pressKey = (key: { label: string; value: string; variant?: "number" | "operator" | "action" }) => {
    setError(null);

    if (key.value === "clear") {
      setExpression("");
      return;
    }

    if (key.value === "back") {
      setExpression((prev) => prev.slice(0, -1));
      return;
    }

    if (key.value === "=") {
      try {
        const result = evaluateCalculatorExpression(expression);
        setExpression(Number.isFinite(result) ? String(result) : "Error");
      } catch {
        setError("Enter a valid expression");
      }
      return;
    }

    setExpression((prev) => `${prev}${key.value}`);
  };

  return (
    <NativeModal
        visible={visible}
        transparent
        animationType="fade"
        presentationStyle="overFullScreen"
        onRequestClose={onDismiss}
      >
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "rgba(0, 0, 0, 0.28)" }}>
          <Pressable style={StyleSheet.absoluteFill} onPress={onDismiss} />
          <View
            style={{
              width: "88%",
              maxWidth: 340,
              borderRadius: 28,
              backgroundColor: theme.colors.background,
              padding: 18,
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 8 },
              shadowOpacity: 0.18,
              shadowRadius: 16,
              elevation: 8,
            }}
          >
          <Pressable onPress={onDismiss} style={{ alignSelf: "flex-end", marginBottom: 4 }}>
            <Text variant="labelLarge" style={{ color: theme.colors.outline }}>
              Close
            </Text>
          </Pressable>

          <View style={{ minHeight: 78, justifyContent: "center", marginBottom: 12, paddingHorizontal: 4 }}>
            {error ? (
              <Text variant="bodySmall" style={{ color: theme.colors.error, textAlign: "right", marginBottom: 4 }}>
                {error}
              </Text>
            ) : null}
            <Text
              variant="displaySmall"
              numberOfLines={1}
              adjustsFontSizeToFit
              style={{ textAlign: "right", fontWeight: "300", color: theme.colors.onBackground }}
            >
              {expression || "0"}
            </Text>
          </View>

          {ROWS.map((row, rowIndex) => (
            <View key={rowIndex} style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 8 }}>
              {row.map((key) => {
                const isOperator = key.variant === "operator";
                const isAction = key.variant === "action";

                return (
                  <Button
                    key={`${key.label}-${key.value}`}
                    mode="contained"
                    compact
                    onPress={() => pressKey(key)}
                    style={{
                      width: "22%",
                      minWidth: 64,
                      borderRadius: 18,
                      backgroundColor: isOperator
                        ? theme.colors.primary
                        : isAction
                          ? theme.colors.secondaryContainer
                          : theme.colors.surfaceVariant,
                    }}
                    contentStyle={{ height: 54 }}
                    labelStyle={{
                      fontSize: 19,
                      fontWeight: "600",
                      color: isOperator ? theme.colors.onPrimary : theme.colors.onSurfaceVariant,
                    }}
                  >
                    {key.label}
                  </Button>
                );
              })}
            </View>
          ))}
          </View>
        </View>
      </NativeModal>
  );
}
