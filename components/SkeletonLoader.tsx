import React, { useEffect, useRef } from "react";
import { View, Animated, ViewStyle } from "react-native";
import { useTheme } from "react-native-paper";

interface SkeletonProps {
  width?: string | number;
  height?: number;
  borderRadius?: number;
  style?: ViewStyle;
}

export const SkeletonLoader = ({ width = "100%", height = 20, borderRadius = 4, style }: SkeletonProps) => {
  const theme = useTheme();
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.7,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.3,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [opacity]);

  return (
    <Animated.View
      style={[
        {
          width: width as number | `${number}%`,
          height,
          borderRadius,
          backgroundColor: theme.colors.surfaceVariant,
          opacity,
        },
        style,
      ]}
    />
  );
};

export const DashboardSkeleton = () => {
  const theme = useTheme();
  
  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <View style={{ paddingTop: 60, paddingHorizontal: 20, paddingBottom: 16 }}>
        <SkeletonLoader width={60} height={12} style={{ marginBottom: 8 }} />
        <SkeletonLoader width={150} height={28} style={{ marginBottom: 24 }} />
        
        {/* Summary Card Skeleton */}
        <SkeletonLoader height={160} borderRadius={16} style={{ marginBottom: 20 }} />
        
        {/* Chart Card Skeleton */}
        <SkeletonLoader height={220} borderRadius={16} style={{ marginBottom: 20 }} />
        
        {/* List Header */}
        <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 16 }}>
           <SkeletonLoader width={100} height={18} />
           <SkeletonLoader width={60} height={18} />
        </View>

        {/* List Items */}
        {[1, 2, 3].map((i) => (
          <View key={i} style={{ flexDirection: "row", alignItems: "center", marginBottom: 16 }}>
            <SkeletonLoader width={48} height={48} borderRadius={24} style={{ marginRight: 12 }} />
            <View style={{ flex: 1 }}>
              <SkeletonLoader width="60%" height={16} style={{ marginBottom: 8 }} />
              <SkeletonLoader width="40%" height={12} />
            </View>
            <SkeletonLoader width={80} height={20} />
          </View>
        ))}
      </View>
    </View>
  );
};
