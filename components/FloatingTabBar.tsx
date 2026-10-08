import React from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { FAB, useTheme } from "react-native-paper";
import { useRouter } from "expo-router";
import { CommonActions } from "expo-router/react-navigation";
import type { BottomTabBarProps } from "expo-router/tabs";

export default function FloatingTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
    const theme = useTheme();
    const router = useRouter();

    return (
        <View style={styles.overlay} pointerEvents="box-none">
            <View
                style={[
                    styles.pill,
                    { backgroundColor: theme.dark ? "#2B2930" : theme.colors.surface },
                    Platform.select({
                        ios: {
                            shadowColor: "#000",
                            shadowOffset: { width: 0, height: 6 },
                            shadowOpacity: 0.25,
                            shadowRadius: 16,
                        },
                        android: { elevation: 8 },
                        web: { boxShadow: "0px 6px 16px rgba(0,0,0,0.25)" },
                        default: {},
                    }),
                ]}
            >
                {state.routes.map((route, index) => {
                    const options = descriptors[route.key].options;
                    if (!options.title || !options.tabBarIcon) return null;
                    const focused = index === state.index;
                    const iconColor = focused ? theme.colors.primary : theme.colors.outline;

                    const onPress = () => {
                        const event = navigation.emit({
                            type: "tabPress",
                            target: route.key,
                            canPreventDefault: true,
                        });
                        if (!focused && !event.defaultPrevented) {
                            navigation.dispatch({
                                ...CommonActions.navigate(route),
                                target: state.key,
                            });
                        }
                    };

                    return (
                        <Pressable
                            key={route.key}
                            onPress={onPress}
                            accessibilityRole="button"
                            accessibilityState={focused ? { selected: true } : undefined}
                            style={[
                                styles.tab,
                                focused && { backgroundColor: "#E8DEF8" },
                            ]}
                        >
                            {options.tabBarIcon({ color: iconColor, focused, size: 24 })}
                            <Text style={[styles.label, { color: iconColor }]} numberOfLines={1}>
                                {options.title}
                            </Text>
                        </Pressable>
                    );
                })}
            </View>

            <FAB
                icon="plus"
                onPress={() => router.push("/add-transaction")}
                style={[styles.fab, { backgroundColor: theme.colors.primary }]}
                color="#fff"
            />
        </View>
    );
}

const styles = StyleSheet.create({
    overlay: {
        position: "absolute",
        bottom: 32,
        left: 16,
        right: 16,
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
    },
    pill: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 10,
        paddingVertical: 8,
        gap: 4,
        borderRadius: 999,
    },
    tab: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: 4,
        paddingVertical: 8,
        borderRadius: 20,
    },
    label: {
        fontSize: 11,
        fontWeight: "600",
        marginTop: 2,
        lineHeight: 14,
        paddingBottom: 2,
    },
    fab: {
        borderRadius: 28,
    },
});
