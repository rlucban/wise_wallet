import React, { useEffect, useRef } from "react";
import { View, Animated, Easing } from "react-native";
import Svg, { Path, Rect, Circle, Mask } from "react-native-svg";
import { Text } from "react-native-paper";

interface PiggyBankProps {
    progress: number; // 0 to 1
    size?: number;
}

export function PiggyBank({ progress, size = 200 }: PiggyBankProps) {
    const animatedValue = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.timing(animatedValue, {
            toValue: progress,
            duration: 1000,
            easing: Easing.bezier(0.4, 0, 0.2, 1),
            useNativeDriver: false, // Cannot use native driver for fill level calculation
        }).start();
    }, [progress, animatedValue]);

    const fillHeight = animatedValue.interpolate({
        inputRange: [0, 1],
        outputRange: [size, 0], // In SVG, 0 is top
    });

    return (
        <View style={{ alignItems: "center", justifyContent: "center", width: size, height: size }}>
            <Svg width={size} height={size} viewBox="0 0 100 100">
                {/* Define the Piggy Shape Mask */}
                <Mask id="mask">
                    <Path
                        d="M50 15C30 15 15 30 15 50C15 65 25 78 40 83L35 90H45L50 85L55 90H65L60 83C75 78 85 65 85 50C85 30 70 15 50 15ZM85 45L90 40V50L85 55V45Z"
                        fill="white"
                    />
                </Mask>

                {/* Gray Background Piggy */}
                <Path
                    d="M50 15C30 15 15 30 15 50C15 65 25 78 40 83L35 90H45L50 85L55 90H65L60 83C75 78 85 65 85 50C85 30 70 15 50 15ZM85 45L90 40V50L85 55V45Z"
                    fill="#e0e0e0"
                />

                {/* Animated Fill Layer */}
                <AnimatedRect
                    x="0"
                    y={fillHeight}
                    width="100"
                    height="100"
                    fill="#ff4081"
                    mask="url(#mask)"
                />

                {/* Piggy Details (Eyes, Ear line) */}
                <Circle cx="35" cy="40" r="2" fill="#555" />
                <Path d="M70 25L75 15L85 25" fill="none" stroke="#e0e0e0" strokeWidth="2" />
            </Svg>
            <Text style={{ position: "absolute", bottom: size / 4, fontWeight: "bold", fontSize: 18, color: progress > 0.5 ? "white" : "#ff4081" }}>
                {(progress * 100).toFixed(0)}%
            </Text>
        </View>
    );
}

const AnimatedRect = Animated.createAnimatedComponent(Rect);
