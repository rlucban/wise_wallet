import React from "react";
import { View } from "react-native";
import { Text } from "react-native-paper";
import Svg, { Circle, Path, Text as SvgText } from "react-native-svg";

export interface DonutSegment {
  name: string;
  value: number;
  color: string;
}

interface DonutChartProps {
  data: DonutSegment[];
  width: number;
  height: number;
  formatValue: (value: number) => string;
  centerValue?: string;
  centerCaption?: string;
  emptyMessage?: string;
  mutedColor?: string;
  textColor?: string;
}

const TWO_PI = Math.PI * 2;

function polar(cx: number, cy: number, radius: number, angle: number) {
  return {
    x: cx + radius * Math.cos(angle),
    y: cy + radius * Math.sin(angle),
  };
}

export function DonutChart({
  data,
  width,
  height,
  formatValue,
  centerValue,
  centerCaption,
  emptyMessage = "No data available",
  mutedColor = "#666666",
  textColor = "#333333",
}: DonutChartProps) {
  const total = data.reduce((sum, segment) => sum + segment.value, 0);

  if (data.length === 0 || total <= 0) {
    return (
      <View style={{ height, justifyContent: "center", alignItems: "center" }}>
        <Text variant="bodyMedium" style={{ color: mutedColor, textAlign: "center" }}>
          {emptyMessage}
        </Text>
      </View>
    );
  }

  const cx = width / 2;
  const cy = height / 2;
  const outerR = Math.min(width, height) / 2 - 10;
  const thickness = Math.min(height * 0.24, 48);
  const innerR = Math.max(outerR - thickness, 18);
  const midR = (outerR + innerR) / 2;
  const strokeWidth = outerR - innerR;

  let angle = -Math.PI / 2;
  const arcs = data
    .filter((segment) => segment.value > 0)
    .map((segment) => {
      const sweep = (segment.value / total) * TWO_PI;
      const endAngle = angle + sweep;
      const startP = polar(cx, cy, midR, angle);
      const endP = polar(cx, cy, midR, endAngle);
      angle = endAngle;
      return {
        ...segment,
        startP,
        endP,
        largeArc: sweep > Math.PI ? 1 : 0,
      };
    });

  return (
    <View>
      <Svg width={width} height={height}>
        {arcs.length === 1 ? (
          <Circle cx={cx} cy={cy} r={midR} stroke={arcs[0].color} strokeWidth={strokeWidth} fill="none" />
        ) : (
          arcs.map((arc, i) => (
            <Path
              key={i}
              d={`M ${arc.startP.x} ${arc.startP.y} A ${midR} ${midR} 0 ${arc.largeArc} 1 ${arc.endP.x} ${arc.endP.y}`}
              stroke={arc.color}
              strokeWidth={strokeWidth}
              fill="none"
            />
          ))
        )}
        {centerValue && (
          <SvgText x={cx} y={cy + 6} fontSize={15} fontWeight="bold" fill={textColor} textAnchor="middle">
            {centerValue}
          </SvgText>
        )}
        {centerCaption && (
          <SvgText x={cx} y={cy + 24} fontSize={11} fill={mutedColor} textAnchor="middle">
            {centerCaption}
          </SvgText>
        )}
      </Svg>
      <View style={{ marginTop: 4 }}>
        {data.map((segment, i) => {
          const pct = total > 0 ? Math.round((segment.value / total) * 100) : 0;
          return (
            <View key={i} style={{ flexDirection: "row", alignItems: "center", marginTop: 6 }}>
              <View
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: 5,
                  backgroundColor: segment.color,
                  marginRight: 8,
                }}
              />
              <Text variant="bodySmall" style={{ color: textColor, flex: 1 }}>
                {segment.name}: {formatValue(segment.value)} ({pct}%)
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}
