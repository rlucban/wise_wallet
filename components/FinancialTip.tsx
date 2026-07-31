import { View } from "react-native";
import { Card, Text, IconButton } from "react-native-paper";
import { useState, useEffect } from "react";

const TIPS = [
  "Try the 50/30/20 rule: 50% needs, 30% wants, 20% savings.",
  "Always save at least 3-6 months of expenses for emergencies.",
  "Track every expense, no matter how small.",
  "Set specific, measurable financial goals.",
  "Review your subscriptions monthly and cancel unused ones.",
  "Pay yourself first - automate your savings.",
  "Avoid impulse purchases by waiting 24-48 hours before buying.",
  "Use cash for discretionary spending to stay within budget.",
  "Compare prices before making big purchases.",
  "Invest early - time in the market beats timing the market.",
];

export function FinancialTip() {
  const [tipIndex, setTipIndex] = useState(0);

  useEffect(() => {
    setTipIndex(Math.floor(Math.random() * TIPS.length));
  }, []);

  const nextTip = () => {
    setTipIndex((prev) => (prev + 1) % TIPS.length);
  };

  return (
    <Card style={{ margin: 16, marginTop: 8, backgroundColor: "#e3f2fd", borderRadius: 12, borderLeftWidth: 4, borderLeftColor: "#1976d2" }}>
      <Card.Content style={{ flexDirection: "row", alignItems: "center" }}>
        <View style={{ flex: 1 }}>
          <Text variant="labelSmall" style={{ color: "#1976d2", marginBottom: 4, fontWeight: "bold" }}>
            💡 Financial Tip
          </Text>
          <Text variant="bodyMedium">{TIPS[tipIndex]}</Text>
          <Text variant="bodySmall" style={{ color: "#90a4ae", fontSize: 11, fontStyle: "italic", marginTop: 6 }}>
            📹 In the future, there will be suggested video links here.
          </Text>
        </View>
        <IconButton icon="refresh" onPress={nextTip} />
      </Card.Content>
    </Card>
  );
}
