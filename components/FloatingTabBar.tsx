import { View, Platform, TouchableOpacity } from "react-native";
import { Text, IconButton, useTheme } from "react-native-paper";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import { useRouter } from "expo-router";
import type { BottomTabBarProps } from "expo-router/build/react-navigation/bottom-tabs";
import { getTabBarMetrics } from "../utils/tabBarMetrics";

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

const CONTAINER_RADIUS = 36;
const PILL_RADIUS = 20;

// NOTE: expo-router's fork invokes tabBar() as a plain function call
// (BottomTabView.js:154), not as a mounted element — so this shell MUST stay
// hook-free. All hooks live in FloatingTabBarThemed, which React mounts as a
// real fiber from the returned element.
export default function FloatingTabBar(props: BottomTabBarProps) {
    return <FloatingTabBarThemed {...props} />;
}

function FloatingTabBarThemed({ state, descriptors, navigation, insets }: BottomTabBarProps) {
    const theme = useTheme();
    const router = useRouter();
    const metrics = getTabBarMetrics(insets.bottom);
    const focusedKey = state.routes[state.index]?.key;
    const tabs = state.routes.filter((route) => route.name !== "learning-detail");

    const pressTab = (route: { key: string; name: string }, focused: boolean) => {
        const event = navigation.emit({ type: "tabPress", target: route.key, canPreventDefault: true });
        if (!focused && !event.defaultPrevented) {
            navigation.navigate(route.name);
        }
    };

    return (
        <View
            style={{
                alignItems: "center",
                paddingHorizontal: 16,
                paddingBottom: metrics.paddingBottom + 12,
            }}
        >
            <View
                style={{
                    flexDirection: "row",
                    alignItems: "center",
                    width: "100%",
                    maxWidth: 560,
                }}
            >
            <View
                style={{
                    flex: 1,
                    flexDirection: "row",
                    backgroundColor: theme.colors.surface,
                    borderRadius: CONTAINER_RADIUS,
                    paddingVertical: 12,
                    paddingHorizontal: 8,
                    ...Platform.select({
                        web: { boxShadow: "0 8px 24px rgba(0, 0, 0, 0.12)" },
                        default: {
                            shadowColor: "#000",
                            shadowOffset: { width: 0, height: 4 },
                            shadowOpacity: 0.12,
                            shadowRadius: 12,
                            elevation: 8,
                        },
                    }),
                }}
            >
                {tabs.map((route) => {
                    const focused = route.key === focusedKey;
                    const label = descriptors[route.key]?.options?.title ?? TAB_LABELS[route.name] ?? route.name;
                    const icon = TAB_ICONS[route.name] ?? "dots-horizontal";
                    return (
                        <TouchableOpacity
                            key={route.key}
                            accessibilityRole="button"
                            accessibilityState={{ selected: focused }}
                            accessibilityLabel={label}
                            onPress={() => pressTab(route, focused)}
                            activeOpacity={0.7}
                            style={{
                                flex: 1,
                                flexDirection: "row",
                                alignItems: "center",
                                justifyContent: "center",
                                borderRadius: PILL_RADIUS,
                                paddingVertical: 12,
                                paddingHorizontal: 4,
                                backgroundColor: "transparent",
                            }}
                        >
                            <MaterialCommunityIcons
                                name={icon}
                                size={22}
                                color={focused ? theme.colors.primary : theme.colors.onSurfaceVariant}
                            />
                            <Text
                                variant="labelMedium"
                                style={{
                                    marginLeft: 4,
                                    fontSize: 12,
                                    fontWeight: "600",
                                    color: focused ? theme.colors.primary : theme.colors.onSurfaceVariant,
                                }}
                            >
                                {label}
                            </Text>
                        </TouchableOpacity>
                    );
                })}
            </View>
            <IconButton
                icon="plus"
                mode="contained"
                containerColor={theme.colors.primary}
                iconColor={theme.colors.onPrimary}
                size={28}
                accessibilityLabel="Add transaction"
                onPress={() => router.push("/add-transaction")}
                style={{ margin: 0, marginLeft: 12 }}
            />
            </View>
        </View>
    );
}
