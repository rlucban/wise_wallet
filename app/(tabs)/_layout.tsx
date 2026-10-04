import { View, TouchableOpacity, Platform, StyleSheet, useWindowDimensions } from "react-native";
import { Tabs, useRouter } from "expo-router";
import type { ComponentProps } from "react";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import { Text, useTheme } from "react-native-paper";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { getTabBarMetrics, getTabBarSizing } from "../../utils/tabBarMetrics";

type BottomTabBarProps = Parameters<NonNullable<ComponentProps<typeof Tabs>["tabBar"]>>[0];

interface FloatingTabBarProps extends BottomTabBarProps {
    insetsBottom: number;
}

function FloatingTabBar({ state, descriptors, navigation, insetsBottom }: FloatingTabBarProps) {
    const theme = useTheme();
    const router = useRouter();
    const { width } = useWindowDimensions();
    const isDesktop = width >= 768;
    const sizing = getTabBarSizing(isDesktop);

    const TAB_ICONS: Record<string, string> = {
        index: "home-variant",
        reports: "chart-bar",
        learning: "school",
        settings: "cog",
    };

    const TAB_LABELS: Record<string, string> = {
        index: "Home",
        reports: "Reports",
        learning: "Learning",
        settings: "Settings",
    };

    const visibleRoutes = state.routes.filter(
        (r) => (descriptors[r.key]?.options as { href?: string | null } | undefined)?.href !== null && r.name !== "learning-detail"
    );

    return (
        <View
            style={{
                position: "absolute",
                bottom: Platform.OS === "ios" ? Math.max(insetsBottom, 16) : 16,
                left: 0,
                right: 0,
                alignItems: "center",
                pointerEvents: "box-none",
                zIndex: 100,
            }}
        >
            <View
                style={{
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "center",
                    width: "100%",
                    maxWidth: isDesktop ? 760 : 480,
                    paddingHorizontal: 16,
                    pointerEvents: "box-none",
                }}
            >
                {/* Floating Pill Container */}
                <View
                    style={{
                        flex: 1,
                        flexDirection: "row",
                        alignItems: "center",
                        justifyContent: "space-around",
                        backgroundColor: theme.colors.surface,
                        borderRadius: 36,
                        paddingVertical: sizing.paddingVertical,
                        paddingHorizontal: isDesktop ? 16 : 6,
                        marginRight: isDesktop ? 14 : 10,
                        borderWidth: Platform.OS === "web" ? 1 : StyleSheet.hairlineWidth,
                        borderColor: theme.colors.surfaceVariant,
                        ...Platform.select({
                            web: { boxShadow: "0px 4px 20px rgba(0, 0, 0, 0.08)" },
                            default: {
                                shadowColor: "#000",
                                shadowOffset: { width: 0, height: 4 },
                                shadowOpacity: 0.10,
                                shadowRadius: 8,
                                elevation: 6,
                            },
                        }),
                    }}
                >
                    {visibleRoutes.map((route) => {
                        const isFocused = state.routes[state.index]?.key === route.key;
                        const label = TAB_LABELS[route.name] || route.name;
                        const iconName = TAB_ICONS[route.name] || "circle";

                        const onPress = () => {
                            const event = navigation.emit({
                                type: "tabPress",
                                target: route.key,
                                canPreventDefault: true,
                            });

                            if (!isFocused && !event.defaultPrevented) {
                                navigation.navigate(route.name);
                            }
                        };

                        return (
                            <TouchableOpacity
                                key={route.key}
                                onPress={onPress}
                                activeOpacity={0.7}
                                style={{
                                    flexDirection: isDesktop ? "row" : "column",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    paddingVertical: isDesktop ? 8 : 6,
                                    paddingHorizontal: isDesktop ? (isFocused ? 18 : 14) : (isFocused ? 14 : 10),
                                    borderRadius: 24,
                                    backgroundColor: isFocused ? theme.colors.primaryContainer : "transparent",
                                }}
                            >
                                <MaterialCommunityIcons
                                    name={iconName}
                                    size={sizing.iconSize}
                                    color={isFocused ? theme.colors.primary : theme.colors.outline}
                                />
                                <Text
                                    style={{
                                        fontSize: sizing.labelFontSize,
                                        fontWeight: isFocused ? sizing.focusedLabelFontWeight : sizing.labelFontWeight,
                                        color: isFocused ? theme.colors.primary : theme.colors.outline,
                                        marginLeft: isDesktop ? 8 : 0,
                                        marginTop: isDesktop ? 0 : 2,
                                    }}
                                >
                                    {label}
                                </Text>
                            </TouchableOpacity>
                        );
                    })}
                </View>

                {/* Detached Circular Action Button */}
                <TouchableOpacity
                    onPress={() => router.push("/add-transaction")}
                    activeOpacity={0.8}
                    style={{
                        width: sizing.actionButtonSize,
                        height: sizing.actionButtonSize,
                        borderRadius: sizing.actionButtonRadius,
                        backgroundColor: theme.colors.surface,
                        justifyContent: "center",
                        alignItems: "center",
                        borderWidth: Platform.OS === "web" ? 1 : StyleSheet.hairlineWidth,
                        borderColor: theme.colors.surfaceVariant,
                        ...Platform.select({
                            web: { boxShadow: "0px 4px 20px rgba(0, 0, 0, 0.08)" },
                            default: {
                                shadowColor: "#000",
                                shadowOffset: { width: 0, height: 4 },
                                shadowOpacity: 0.10,
                                shadowRadius: 8,
                                elevation: 6,
                            },
                        }),
                    }}
                >
                    <MaterialCommunityIcons name="plus" size={sizing.actionIconSize} color={theme.colors.onSurface} />
                </TouchableOpacity>
            </View>
        </View>
    );
}

export default function TabLayout() {
    const theme = useTheme();
    const insets = useSafeAreaInsets();
    const { height, paddingTop, paddingBottom } = getTabBarMetrics(insets.bottom);

    return (
        <Tabs
            tabBar={(props) => <FloatingTabBar {...props} insetsBottom={insets.bottom} />}
            screenOptions={{
                headerShown: false,
                tabBarActiveTintColor: theme.colors.primary,
                tabBarInactiveTintColor: theme.colors.outline,
                tabBarStyle: {
                    backgroundColor: theme.colors.surface,
                    borderTopWidth: 1,
                    borderTopColor: theme.colors.surfaceVariant,
                    elevation: 0,
                    height,
                    paddingTop,
                    paddingBottom,
                },
                tabBarLabelStyle: {
                    fontSize: 12,
                    fontWeight: "600",
                },
            }}
        >
            <Tabs.Screen
                name="index"
                options={{
                    title: "Home",
                    tabBarIcon: ({ color, size }) => (
                        <MaterialCommunityIcons name="home-variant" size={size} color={color} />
                    ),
                }}
            />
            <Tabs.Screen
                name="reports"
                options={{
                    title: "Reports",
                    tabBarIcon: ({ color, size }) => (
                        <MaterialCommunityIcons name="chart-bar" size={size} color={color} />
                    ),
                }}
            />
            <Tabs.Screen
                name="learning"
                options={{
                    title: "Learning",
                    tabBarIcon: ({ color, size }) => (
                        <MaterialCommunityIcons name="school" size={size} color={color} />
                    ),
                }}
            />
            <Tabs.Screen
                name="learning-detail"
                options={{
                    href: null,
                }}
            />
            <Tabs.Screen
                name="settings"
                options={{
                    title: "Settings",
                    tabBarIcon: ({ color, size }) => (
                        <MaterialCommunityIcons name="cog" size={size} color={color} />
                    ),
                }}
            />
        </Tabs>
    );
}
