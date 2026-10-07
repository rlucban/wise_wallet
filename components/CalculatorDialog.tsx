import React, { useState } from "react";
import { View } from "react-native";
import { Button, Dialog, Text, useTheme } from "react-native-paper";
import { evaluateCalculatorExpression } from "../utils/calculator";

const KEYS = ["7", "8", "9", "/", "4", "5", "6", "*", "1", "2", "3", "-", "0", ".", "=", "+"];

export function CalculatorDialog({ visible, onDismiss }: { visible: boolean; onDismiss: () => void }) {
  const theme = useTheme();
  const [expression, setExpression] = useState("");
  const [error, setError] = useState<string | null>(null);

  const pressKey = (key: string) => {
    setError(null);
    if (key === "=") {
      try {
        const result = evaluateCalculatorExpression(expression);
        setExpression(Number.isFinite(result) ? String(result) : "Error");
      } catch {
        setError("Enter a valid expression");
      }
      return;
    }
    setExpression((prev) => `${prev}${key}`);
  };

  const clear = () => {
    setExpression("");
    setError(null);
  };

  return (
    <Dialog visible={visible} onDismiss={onDismiss}>
      <Dialog.Title>Calculator</Dialog.Title>
      <Dialog.Content>
        <View style={{ minHeight: 52, justifyContent: "center", marginBottom: 12 }}>
          <Text variant="headlineSmall" style={{ textAlign: "right", color: theme.colors.onSurface }}>
            {expression || "0"}
          </Text>
        </View>
        {error ? (
          <Text variant="bodySmall" style={{ color: theme.colors.error, marginBottom: 8 }}>
            {error}
          </Text>
        ) : null}
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          {KEYS.map((key) => (
            <Button key={key} mode="outlined" compact onPress={() => pressKey(key)} style={{ width: "22%" }}>
              {key}
            </Button>
          ))}
        </View>
      </Dialog.Content>
      <Dialog.Actions>
        <Button onPress={clear}>Clear</Button>
        <Button onPress={onDismiss}>Close</Button>
      </Dialog.Actions>
    </Dialog>
  );
}
