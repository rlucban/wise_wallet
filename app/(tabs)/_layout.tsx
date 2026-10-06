import { useRef } from "react";
import { Animated, Easing, Pressable, Platform } from "react-native";
import { Tabs } from "expo-router";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import { useTheme } from "react-native-paper";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { getTabBarMetrics } from "../../utils/tabBarMetrics";

/**
 * SPEC-52 v1.1 (CON-52-12/13): eased press-down on every tab. The icon +
 * label dip to 0.85 on press-in and ease back on release. Accessibility
 * props, testID, and navigation behavior pass through untouched.
 */
function AnimatedTabButton({
    children,
    onPress,
    onLongPress,
    onPressIn,
    onPressOut,
    accessibilityLabel,
    accessibilityRole,
    accessibilityState,
    testID,
}: {
    children: React.ReactNode;
    onPress?: () => void;
    onLongPress?: () => void;
    onPressIn?: () => void;
    onPressOut?: () => void;
    accessibilityLabel?: string;
    accessibilityRole?: string;
    accessibilityState?: { selected?: boolean; disabled?: boolean };
    testID?: string;
}) {
    const scale = useRef(new Animated.Value(1)).current;

    const dip = (toValue: number, duration: number) => {
        Animated.timing(scale, {
            toValue,
            duration,
            easing: Easing.out(Easing.quad),
            // JS driver: a ~150ms pulse is cheap, and the native driver logs
            // a fallback WARN on web (SPEC-06 warning cleanup).
            useNativeDriver: false,
        }).start();
    };

    return (
        <Pressable
            onPress={onPress}
            onLongPress={onLongPress}
            onPressIn={() => {
                dip(0.85, 120);
                onPressIn?.();
            }}
            onPressOut={() => {
                dip(1, 180);
                onPressOut?.();
            }}
            accessibilityLabel={accessibilityLabel}
            accessibilityRole={accessibilityRole ?? "button"}
            accessibilityState={accessibilityState}
            testID={testID}
            style={{ flex: 1, alignItems: "center", justifyContent: "center" }}
        >
            <Animated.View style={{ transform: [{ scale }] }}>{children}</Animated.View>
        </Pressable>
    );
}

export default function TabLayout() {
    const theme = useTheme();
    const insets = useSafeAreaInsets();
    const { height, paddingTop, paddingBottom } = getTabBarMetrics(insets.bottom);

    return (
        <Tabs
            screenOptions={{
                headerShown: false,
                tabBarActiveTintColor: theme.colors.primary,
                tabBarInactiveTintColor: theme.colors.outline,
                tabBarButton: (props) => <AnimatedTabButton {...props} />,
                tabBarStyle: {
                    // CON-52-15: dark mode gets an M3 tonal lift; light keeps surface.
                    backgroundColor: theme.dark ? theme.colors.surfaceContainerHigh : theme.colors.surface,
                    borderTopWidth: 0,
                    marginHorizontal: 16,
                    // CON-55-06: float higher still (was 20 in SPEC-54).
                    marginBottom: 32,
                    // CON-52-16: true capsule at every inset (34 / 46 / 51).
                    borderRadius: height / 2,
                    height,
                    paddingTop,
                    paddingBottom,
                    ...Platform.select({
                        ios: {
                            shadowColor: "#000",
                            shadowOffset: { width: 0, height: 6 },
                            shadowOpacity: 0.25,
                            shadowRadius: 16,
                        },
                        android: {
                            elevation: 8,
                        },
                        default: {},
                    }),
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