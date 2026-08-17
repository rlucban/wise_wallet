import React, { useState } from "react";
import { View, StyleSheet, TouchableOpacity } from "react-native";
import { Text, IconButton, useTheme } from "react-native-paper";
import { usePasscode } from "../context/PasscodeContext";

export default function PasscodeScreen() {
  const theme = useTheme();
  const { passcode, setIsUnlocked } = usePasscode();
  const [input, setInput] = useState("");

  const handlePress = (num: string) => {
    if (input.length < 4) {
      const newInput = input + num;
      setInput(newInput);
      if (newInput === passcode) {
        setIsUnlocked(true);
      } else if (newInput.length === 4) {
        // Wrong code
        setTimeout(() => setInput(""), 300);
      }
    }
  };

  const handleDelete = () => {
    setInput(input.slice(0, -1));
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Text variant="headlineMedium" style={{ marginBottom: 40, fontWeight: "700" }}>
        Enter Passcode
      </Text>

      <View style={styles.dotsContainer}>
        {[1, 2, 3, 4].map((i) => (
          <View
            key={i}
            style={[
              styles.dot,
              {
                backgroundColor: input.length >= i ? theme.colors.primary : theme.colors.outlineVariant,
              },
            ]}
          />
        ))}
      </View>

      <View style={styles.keypad}>
        {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((num) => (
          <TouchableOpacity key={num} style={styles.key} onPress={() => handlePress(num)}>
            <Text variant="headlineSmall">{num}</Text>
          </TouchableOpacity>
        ))}
        <View style={styles.key} />
        <TouchableOpacity style={styles.key} onPress={() => handlePress("0")}>
          <Text variant="headlineSmall">0</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.key} onPress={handleDelete}>
          <IconButton icon="backspace-outline" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  dotsContainer: {
    flexDirection: "row",
    marginBottom: 60,
  },
  dot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    marginHorizontal: 15,
  },
  keypad: {
    flexDirection: "row",
    flexWrap: "wrap",
    width: 280,
    justifyContent: "center",
  },
  key: {
    width: 80,
    height: 80,
    justifyContent: "center",
    alignItems: "center",
    margin: 5,
    borderRadius: 40,
  },
});
