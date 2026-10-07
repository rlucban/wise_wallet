import React, { useState } from "react";
import { View } from "react-native";
import { Button, Dialog, Text, useTheme } from "react-native-paper";
import { evaluateCalculatorExpression } from "../utils/calculator";

const ROWS: { label: string; value: string; variant?: "number" | "operator" | "action" }[][] = [
  [
    { label: "C", value: "clear", variant: "action" },
    { label: "(", value: "(", variant: "operator" },
    { label: ")", value: ")", variant: "operator" },
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
    <Dialog
      visible={visible}
      onDismiss={onDismiss}
      style={{
        borderRadius: 28,
        backgroundColor: theme.colors.surface,
        maxWidth: 380,
        alignSelf: "center",
        margin: 20,
      }}
    >
      <Dialog.Title style={{ textAlign: "center", fontWeight: "700", paddingBottom: 0 }}>
        Calculator
      </Dialog.Title>
      <Dialog.Content>
        <View
          style={{
            minHeight: 76,
            alignItems: "flex-end",
            justifyContent: "center",
            marginBottom: 16,
            paddingHorizontal: 8,
          }}
        >
          <Text
            variant="displaySmall"
            numberOfLines={1}
            adjustsFontSizeToFit
            style={{ color: theme.colors.onSurface, fontWeight: "300", textAlign: "right" }}
          >
            {expression || "0"}
          </Text>
        </View>

        {error ? (
          <Text variant="bodySmall" style={{ color: theme.colors.error, textAlign: "right", marginBottom: 12 }}>
            {error}
          </Text>
        ) : null}

        {ROWS.map((row, rowIndex) => (
          <View key={rowIndex} style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 8 }}>
            {row.map((key) => {
              const isOperator = key.variant === "operator";
              const isAction = key.variant === "action";

              return (
                <Button
                  key={key.value}
                  mode={isOperator ? "contained" : "contained-tonal"}
                  compact
                  onPress={() => pressKey(key)}
                  style={{
                    width: "22%",
                    borderRadius: 18,
                    backgroundColor: isOperator
                      ? theme.colors.primary
                      : isAction
                        ? theme.colors.secondaryContainer
                        : theme.colors.surfaceVariant,
                  }}
                  contentStyle={{ height: 52 }}
                  labelStyle={{
                    fontSize: 20,
                    fontWeight: "600",
                    color: isOperator ? theme.colors.onPrimary : theme.colors.onSurface,
                  }}
                >
                  {key.label}
                </Button>
              );
            })}
          </View>
        ))}
      </Dialog.Content>
      <Dialog.Actions style={{ justifyContent: "center", paddingTop: 0 }}>
        <Button onPress={onDismiss}>Close</Button>
      </Dialog.Actions>
    </Dialog>
  );
}
