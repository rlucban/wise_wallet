import { useState } from "react";
import { View, Modal, Pressable } from "react-native";
import { Text, Button, useTheme } from "react-native-paper";
import { calculate, formatResult, type CalcOperator } from "../utils/calculator";

interface CalculatorModalProps {
    visible: boolean;
    onDismiss: () => void;
}

const ROWS: string[][] = [
    ["C", "⌫", "÷"],
    ["7", "8", "×"],
    ["4", "5", "−"],
    ["1", "2", "+"],
    ["0", ".", "="],
];

const OPERATORS: Record<string, CalcOperator> = {
    "+": "+",
    "−": "-",
    "×": "×",
    "÷": "÷",
};

const MAX_DIGITS = 12;

export default function CalculatorModal({ visible, onDismiss }: CalculatorModalProps) {
    const theme = useTheme();
    const [display, setDisplay] = useState("0");
    const [acc, setAcc] = useState<number | null>(null);
    const [op, setOp] = useState<CalcOperator | null>(null);
    const [fresh, setFresh] = useState(true);

    const resetEntry = (d: string) => {
        setDisplay(d === "." ? "0." : d);
        setAcc(null);
        setOp(null);
        setFresh(false);
    };

    const inputDigit = (d: string) => {
        // SPEC-63 v1.1 DEC-03: a fresh entry only replaces the display — acc/op
        // belong to the pending operation and MUST survive (5 + 3 = → 8).
        if (display === "Error") {
            resetEntry(d);
            return;
        }
        if (fresh) {
            setDisplay(d === "." ? "0." : d);
            setFresh(false);
            return;
        }
        if (d === "." && display.includes(".")) return;
        if (display.replace("-", "").replace(".", "").length >= MAX_DIGITS) return;
        if (display === "0" && d !== ".") {
            setDisplay(d);
            return;
        }
        setDisplay(display + d);
    };

    const inputOperator = (next: CalcOperator) => {
        if (display === "Error") return;
        const current = parseFloat(display);
        if (acc === null) {
            setAcc(current);
        } else if (!fresh && op) {
            const result = calculate(acc, current, op);
            if (Number.isNaN(result)) {
                setDisplay("Error");
                setAcc(null);
                setOp(null);
                setFresh(true);
                return;
            }
            setAcc(result);
            setDisplay(formatResult(result));
        }
        setOp(next);
        setFresh(true);
    };

    const inputEquals = () => {
        if (display === "Error" || acc === null || !op || fresh) return;
        const result = calculate(acc, parseFloat(display), op);
        setDisplay(formatResult(result));
        setAcc(null);
        setOp(null);
        setFresh(true);
    };

    const clearAll = () => {
        setDisplay("0");
        setAcc(null);
        setOp(null);
        setFresh(true);
    };

    const backspace = () => {
        if (fresh || display === "Error") return;
        const shortened = display.slice(0, -1);
        setDisplay(shortened === "" || shortened === "-" ? "0" : shortened);
    };

    const press = (key: string) => {
        if (key === "C") return clearAll();
        if (key === "⌫") return backspace();
        if (key === "=") return inputEquals();
        if (OPERATORS[key]) return inputOperator(OPERATORS[key]);
        return inputDigit(key);
    };

    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            onRequestClose={onDismiss}
        >
            <Pressable
                onPress={onDismiss}
                style={{
                    flex: 1,
                    backgroundColor: "rgba(0, 0, 0, 0.5)",
                    justifyContent: "center",
                    alignItems: "center",
                    padding: 20,
                }}
            >
                <Pressable
                    onPress={() => {}}
                    style={{
                        backgroundColor: theme.colors.surface,
                        borderRadius: 24,
                        padding: 16,
                        width: "90%",
                        maxWidth: 400,
                        alignSelf: "center",
                    }}
                >
                    <Text
                        variant="displaySmall"
                        numberOfLines={1}
                        adjustsFontSizeToFit
                        style={{
                            textAlign: "right",
                            fontWeight: "700",
                            color: theme.colors.onSurface,
                            marginBottom: 12,
                            minHeight: 56,
                        }}
                    >
                        {display}
                    </Text>
                    {ROWS.map((row, i) => (
                        <View key={i} style={{ flexDirection: "row" }}>
                            {row.map((key) => (
                                <Button
                                    key={key}
                                    mode={OPERATORS[key] || key === "=" ? "contained" : "outlined"}
                                    onPress={() => press(key)}
                                    style={{ flex: 1, margin: 4 }}
                                    contentStyle={{ height: 56 }}
                                    labelStyle={{ fontSize: 18 }}
                                >
                                    {key}
                                </Button>
                            ))}
                        </View>
                    ))}
                    <Button mode="text" onPress={onDismiss} style={{ marginTop: 8 }}>
                        Close
                    </Button>
                </Pressable>
            </Pressable>
        </Modal>
    );
}
