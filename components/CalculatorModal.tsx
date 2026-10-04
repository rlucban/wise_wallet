import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Modal,
} from "react-native";
import { IconButton } from "react-native-paper";

interface CalculatorModalProps {
  visible: boolean;
  onRequestClose: () => void;
}

const NAVY = "#0F2C59";
const DARK_NAVY = "#091B38";

export default function CalculatorModal({
  visible,
  onRequestClose,
}: CalculatorModalProps) {
  const [display, setDisplay] = useState("0");
  const [previousOperator, setPreviousOperator] = useState<string | null>(null);
  const [firstOperand, setFirstOperand] = useState<number | null>(null);
  const [waitingForSecondOperand, setWaitingForSecondOperand] = useState(false);

  const handleDigitPress = (digit: string) => {
    if (waitingForSecondOperand) {
      setDisplay(digit);
      setWaitingForSecondOperand(false);
    } else {
      if (display.length >= 12) return;
      setDisplay(display === "0" ? digit : display + digit);
    }
  };

  const handleDecimalPress = () => {
    if (waitingForSecondOperand) {
      setDisplay("0.");
      setWaitingForSecondOperand(false);
      return;
    }
    if (!display.includes(".")) {
      setDisplay(display + ".");
    }
  };

  const calculate = (a: number, b: number, op: string | null): number | null => {
    switch (op) {
      case "+": return a + b;
      case "-": return a - b;
      case "×": return a * b;
      case "÷": return b === 0 ? null : a / b;
      default: return b;
    }
  };

  const handleOperationPress = (operator: string) => {
    const inputValue = parseFloat(display);
    if (firstOperand === null) {
      setFirstOperand(inputValue);
    } else if (!waitingForSecondOperand) {
      const result = calculate(firstOperand, inputValue, previousOperator);
      if (result === null) {
        setDisplay("Error");
        setFirstOperand(null);
        setPreviousOperator(null);
        setWaitingForSecondOperand(false);
        return;
      }
      setDisplay(String(result));
      setFirstOperand(result);
    }
    setPreviousOperator(operator);
    setWaitingForSecondOperand(true);
  };

  const handleClearPress = () => {
    setDisplay("0");
    setPreviousOperator(null);
    setFirstOperand(null);
    setWaitingForSecondOperand(false);
  };

  const handleBackspacePress = () => {
    if (waitingForSecondOperand) return;
    if (display.length === 1 || (display.length === 2 && display.startsWith("-"))) {
      setDisplay("0");
    } else {
      setDisplay(display.slice(0, -1));
    }
  };

  const handlePercentPress = () => {
    const value = parseFloat(display);
    if (!isNaN(value)) {
      setDisplay(String(value / 100));
    }
  };

  const handleEqualsPress = () => {
    if (previousOperator === null || firstOperand === null || waitingForSecondOperand) return;
    const inputValue = parseFloat(display);
    const result = calculate(firstOperand, inputValue, previousOperator);
    if (result === null) {
      setDisplay("Error");
    } else {
      setDisplay(String(result));
    }
    setPreviousOperator(null);
    setFirstOperand(null);
    setWaitingForSecondOperand(false);
  };

  const handleClose = () => {
    handleClearPress();
    onRequestClose();
  };

  const getDisplayFontSize = (): number => {
    if (display.length > 10) return 28;
    if (display.length > 7) return 36;
    return 44;
  };

  const renderButton = (
    label: string,
    onPress: () => void,
    type: "digit" | "operator" | "action" | "equals" = "digit",
    flex = 1,
  ) => {
    const bgColors = {
      digit: "#FFFFFF",
      operator: "#1A5276",
      action: "#CBD5E1",
      equals: "#27AE60",
    };
    const textColors = {
      digit: NAVY,
      operator: "#FFFFFF",
      action: NAVY,
      equals: "#FFFFFF",
    };

    return (
      <TouchableOpacity
        key={label}
        style={[styles.button, { backgroundColor: bgColors[type], flex }]}
        onPress={onPress}
        activeOpacity={0.7}
      >
        <Text style={[styles.buttonText, { color: textColors[type] }]}>
          {label}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <Modal
      visible={visible}
      onRequestClose={handleClose}
      transparent
      animationType="fade"
      statusBarTranslucent
    >
      <View style={styles.overlay}>
        <TouchableOpacity
          style={StyleSheet.absoluteFill}
          activeOpacity={1}
          onPress={handleClose}
        />
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Calculator</Text>
            <IconButton
              icon="close"
              iconColor="#FFFFFF"
              size={22}
              onPress={handleClose}
            />
          </View>

          {/* Display */}
          <View style={styles.display}>
            {previousOperator != null && (
              <Text style={styles.operatorIndicator}>{previousOperator}</Text>
            )}
            <Text
              style={[styles.displayText, { fontSize: getDisplayFontSize() }]}
              numberOfLines={1}
              adjustsFontSizeToFit
            >
              {display}
            </Text>
          </View>

          {/* Button Grid */}
          <View style={styles.grid}>
            <View style={styles.row}>
              {renderButton("C", handleClearPress, "action")}
              {renderButton("⌫", handleBackspacePress, "action")}
              {renderButton("%", handlePercentPress, "action")}
              {renderButton("÷", () => handleOperationPress("÷"), "operator")}
            </View>
            <View style={styles.row}>
              {renderButton("7", () => handleDigitPress("7"))}
              {renderButton("8", () => handleDigitPress("8"))}
              {renderButton("9", () => handleDigitPress("9"))}
              {renderButton("×", () => handleOperationPress("×"), "operator")}
            </View>
            <View style={styles.row}>
              {renderButton("4", () => handleDigitPress("4"))}
              {renderButton("5", () => handleDigitPress("5"))}
              {renderButton("6", () => handleDigitPress("6"))}
              {renderButton("-", () => handleOperationPress("-"), "operator")}
            </View>
            <View style={styles.row}>
              {renderButton("1", () => handleDigitPress("1"))}
              {renderButton("2", () => handleDigitPress("2"))}
              {renderButton("3", () => handleDigitPress("3"))}
              {renderButton("+", () => handleOperationPress("+"), "operator")}
            </View>
            <View style={styles.row}>
              {renderButton("0", () => handleDigitPress("0"), "digit", 2)}
              {renderButton(".", handleDecimalPress)}
              {renderButton("=", handleEqualsPress, "equals")}
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(15, 23, 42, 0.65)",
    ...Platform.select({
      web: { backdropFilter: "blur(10px)" } as object,
      default: {},
    }),
  },
  container: {
    backgroundColor: NAVY,
    borderRadius: 20,
    overflow: "hidden",
    ...Platform.select({
      web: {
        width: "90%",
        maxWidth: 360,
        boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.3), 0 8px 10px -6px rgba(0, 0, 0, 0.2)",
      } as object,
      default: {
        width: "85%",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 20 },
        shadowOpacity: 0.3,
        shadowRadius: 25,
        elevation: 24,
      },
    }),
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingLeft: 20,
    paddingRight: 4,
    paddingTop: 8,
  },
  headerTitle: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "600",
  },
  display: {
    backgroundColor: DARK_NAVY,
    marginHorizontal: 12,
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 20,
    minHeight: 80,
    justifyContent: "flex-end",
    alignItems: "flex-end",
    marginBottom: 12,
  },
  operatorIndicator: {
    color: "rgba(255, 255, 255, 0.5)",
    fontSize: 18,
    marginBottom: 4,
  },
  displayText: {
    color: "#FFFFFF",
    fontWeight: "300",
    textAlign: "right",
  },
  grid: {
    paddingHorizontal: 12,
    paddingBottom: 16,
    gap: 8,
  },
  row: {
    flexDirection: "row",
    gap: 8,
  },
  button: {
    height: 56,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  buttonText: {
    fontSize: 22,
    fontWeight: "500",
  },
});