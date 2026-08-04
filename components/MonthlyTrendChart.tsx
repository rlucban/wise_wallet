import React from "react";
import { View } from "react-native";
import { Text, useTheme } from "react-native-paper";
import Svg, { G, Line, Rect, Text as SvgText } from "react-native-svg";

interface MonthlyTrendChartProps {
  labels: string[];
  income: number[];
  expense: number[];
  width: number;
  height?: number;
  formatValue: (value: number) => string;
}

const PAD = { top: 20, right: 12, bottom: 32, left: 52 };

function LegendDot({ color, label }: { color: string; label: string }) {
  const theme = useTheme();
  return (
    <View style={{ flexDirection: "row", alignItems: "center", marginHorizontal: 12 }}>
      <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: color, marginRight: 6 }} />
      <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
        {label}
      </Text>
    </View>
  );
}

export function MonthlyTrendChart({
  labels,
  income,
  expense,
  width,
  height = 240,
  formatValue,
}: MonthlyTrendChartProps) {
  const theme = useTheme();

  const symbol = formatValue(0).replace(/[0-9.,\s]/g, "");
  const compact = (value: number, withSymbol = false) => {
    const abs = Math.abs(value);
    const prefix = withSymbol ? symbol : "";
    if (abs >= 1000000) return `${prefix}${(value / 1000000).toFixed(1)}m`;
    if (abs >= 1000) return `${prefix}${(value / 1000).toFixed(1)}k`;
    return `${prefix}${Math.round(value)}`;
  };

  const allValues = [...income, ...expense];
  if (labels.length === 0 || !allValues.some((v) => v > 0)) {
    return (
      <View style={{ height, justifyContent: "center", alignItems: "center" }}>
        <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, textAlign: "center" }}>
          No transaction data in this period
        </Text>
      </View>
    );
  }

  const chartW = width - PAD.left - PAD.right;
  const chartH = height - PAD.top - PAD.bottom;
  const max = Math.max(...allValues, 1);
  const n = labels.length;
  const groupWidth = chartW / n;
  const barWidth = Math.min(14, groupWidth * 0.3);
  const baseY = PAD.top + chartH;

  return (
    <View>
      <View style={{ flexDirection: "row", justifyContent: "center", marginBottom: 12 }}>
        <LegendDot color={theme.colors.primary} label="Income" />
        <LegendDot color={theme.colors.error} label="Expense" />
      </View>
      <Svg width={width} height={height}>
        {[1, 0.75, 0.5, 0.25, 0].map((tick, i) => {
          const y = PAD.top + (1 - tick) * chartH;
          return (
            <G key={i}>
              <Line
                x1={PAD.left}
                y1={y}
                x2={PAD.left + chartW}
                y2={y}
                stroke={theme.colors.outlineVariant}
                strokeWidth={1}
              />
              <SvgText
                x={PAD.left - 8}
                y={y + 4}
                fontSize={10}
                fill={theme.colors.onSurfaceVariant}
                textAnchor="end"
              >
                {compact(max * tick, true)}
              </SvgText>
            </G>
          );
        })}
        {labels.map((label, i) => {
          const x0 = PAD.left + i * groupWidth;
          const incomeH = (income[i] / max) * chartH;
          const expenseH = (expense[i] / max) * chartH;
          const incomeX = x0 + groupWidth * 0.2;
          const expenseX = x0 + groupWidth * 0.52;
          return (
            <G key={i}>
              {income[i] > 0 && (
                <G>
                  <Rect
                    x={incomeX}
                    y={baseY - incomeH}
                    width={barWidth}
                    height={incomeH}
                    rx={Math.min(4, barWidth / 2)}
                    fill={theme.colors.primary}
                  />
                  <SvgText
                    x={incomeX + barWidth / 2}
                    y={baseY - incomeH - 4}
                    fontSize={9}
                    fill={theme.colors.onSurfaceVariant}
                    textAnchor="middle"
                  >
                    {compact(income[i])}
                  </SvgText>
                </G>
              )}
              {expense[i] > 0 && (
                <G>
                  <Rect
                    x={expenseX}
                    y={baseY - expenseH}
                    width={barWidth}
                    height={expenseH}
                    rx={Math.min(4, barWidth / 2)}
                    fill={theme.colors.error}
                  />
                  <SvgText
                    x={expenseX + barWidth / 2}
                    y={baseY - expenseH - 4}
                    fontSize={9}
                    fill={theme.colors.onSurfaceVariant}
                    textAnchor="middle"
                  >
                    {compact(expense[i])}
                  </SvgText>
                </G>
              )}
              <SvgText
                x={x0 + groupWidth / 2}
                y={baseY + 18}
                fontSize={11}
                fill={theme.colors.onSurfaceVariant}
                textAnchor="middle"
              >
                {label}
              </SvgText>
            </G>
          );
        })}
      </Svg>
    </View>
  );
}
