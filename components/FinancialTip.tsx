import { View, StyleProp, ViewStyle } from "react-native";
import { Card, Text, IconButton } from "react-native-paper";
import { useState, useEffect, useMemo } from "react";
import { FinancialTipData, getDateContextTips } from "../utils/financialLiteracy";

const GENERAL_TIPS: FinancialTipData[] = [
  { title: "50/30/20 Rule", message: "Try the 50/30/20 rule: 50% needs, 30% wants, 20% savings.", icon: "percent" },
  { title: "Emergency Fund", message: "Always save at least 3-6 months of expenses for emergencies.", icon: "shield-alert-outline" },
  { title: "Track Everything", message: "Track every expense, no matter how small.", icon: "pencil-outline" },
  { title: "Set Goals", message: "Set specific, measurable financial goals.", icon: "bullseye-arrow" },
  { title: "Audit Subscriptions", message: "Review your subscriptions monthly and cancel unused ones.", icon: "repeat" },
  { title: "Automate Savings", message: "Pay yourself first - automate your savings.", icon: "bank-outline" },
  { title: "Avoid Impulse Buys", message: "Avoid impulse purchases by waiting 24-48 hours before buying.", icon: "timer-outline" },
  { title: "Use Cash", message: "Use cash for discretionary spending to stay within budget.", icon: "cash" },
  { title: "Compare Prices", message: "Compare prices before making big purchases.", icon: "magnify" },
  { title: "Invest Early", message: "Invest early - time in the market beats timing the market.", icon: "chart-line" },
];

interface FinancialTipProps {
  date?: Date;
  extraTips?: FinancialTipData[];
  title?: string;
  showFooter?: boolean;
  dateBased?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function FinancialTip({
  date,
  extraTips,
  title = "💡 Financial Tip",
  showFooter = true,
  dateBased = true,
  style,
}: FinancialTipProps) {
  const [tipIndex, setTipIndex] = useState(0);

  const tips = useMemo(() => {
    const base = dateBased ? getDateContextTips(date ?? new Date()) : [];
    return [...base, ...(extraTips ?? []), ...GENERAL_TIPS];
  }, [date, extraTips, dateBased]);

  useEffect(() => {
    setTipIndex(Math.floor(Math.random() * tips.length));
  }, [tips]);

  const nextTip = () => {
    setTipIndex((prev) => (prev + 1) % tips.length);
  };

  const tip = tips[tipIndex % tips.length];

  return (
    <Card style={[{ margin: 16, marginTop: 8, backgroundColor: "#e3f2fd", borderRadius: 12, borderLeftWidth: 4, borderLeftColor: "#1976d2" }, style]}>
      <Card.Content style={{ flexDirection: "row", alignItems: "center" }}>
        <View style={{ flex: 1 }}>
          <Text variant="labelSmall" style={{ color: "#1976d2", marginBottom: 4, fontWeight: "bold" }}>
            {title}
          </Text>
          <Text variant="bodyMedium" style={{ fontWeight: "700", marginBottom: 2 }}>
            {tip.title}
          </Text>
          <Text variant="bodyMedium">{tip.message}</Text>
          {showFooter && (
            <Text variant="bodySmall" style={{ color: "#90a4ae", fontSize: 11, fontStyle: "italic", marginTop: 6 }}>
              📹 In the future, there will be suggested video links here.
            </Text>
          )}
        </View>
        <IconButton icon="refresh" onPress={nextTip} />
      </Card.Content>
    </Card>
  );
}
