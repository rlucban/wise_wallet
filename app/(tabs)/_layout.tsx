import { useRef } from "react";
import { Animated, Easing, Pressable, Platform, View } from "react-native";
import type { StyleProp, ViewStyle } from "react-native";
import { Tabs, useRouter } from "expo-router";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import { FAB, useTheme } from "react-native-paper";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { getTabBarMetrics } from "../../utils/tabBarMetrics";

/**
 * SPEC-52 v1.1 (CON-52-12/13): eased press-down on every tab. Prop names and
 * types mirror the fork's BottomTabBarButtonProps (expo-router
 * bottom-tabs/types.d.ts:321-326); the library's own `style`, `role`,
 * `testID`, and aria label pass through, so item layout stays exactly as
 * SPEC-32 measured it.
 */
function AnimatedTabButton({
    children,
    onPress,
    onLongPress,
    testID,
    role,
    style,
    "aria-label": ariaLabel,
}: {
    children: React.ReactNode;
    onPress?: React.ComponentProps<typeof Pressable>["onPress"];
    onLongPress?: React.ComponentProps<typeof Pressable>["onLongPress"];
    testID?: string;
    role?: React.ComponentProps<typeof Pressable>["role"];
    style?: StyleProp<ViewStyle>;
    "aria-label"?: string;
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
            onPressIn={() => dip(0.85, 120)}
            onPressOut={() => dip(1, 180)}
            testID={testID}
            role={role}
            aria-label={ariaLabel}
            style={style}
        >
            <Animated.View style={{ transform: [{ scale }] }}>{children}</Animated.View>
        </Pressable>
    );
}

export default function TabLayout() {
    const theme = useTheme();
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { height, paddingTop, paddingBottom } = getTabBarMetrics(insets.bottom);

    return (
        <View style={{ flex: 1 }}>
        <Tabs
            screenOptions={{
                headerShown: false,
                tabBarActiveTintColor: theme.colors.primary,
                tabBarInactiveTintColor: theme.colors.outline,
                tabBarButton: (props) => <AnimatedTabButton {...props} style={[props.style, { paddingHorizontal: 8 }]} />,
                tabBarStyle: {
                    // SPEC-56 (CON-56-04): overlay — page content scrolls behind the pill.
                    position: "absolute",
                    // CON-52-15: dark lift. Paper 5.15 ships no surfaceContainerHigh
                    // token (types or runtime), so the M3-baseline value is pinned
                    // literally; light keeps surface.
                    backgroundColor: theme.dark ? "#2B2930" : theme.colors.surface,
                    borderTopWidth: 0,
                    marginLeft: 16,
                    marginRight: 72,
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
        <FAB
          icon="plus"
          onPress={() => router.push("/add-transaction")}
          style={{
            position: "absolute",
            right: 8,
            bottom: 32 + Math.max(0, (height - 56) / 2),
            borderRadius: 999,
            backgroundColor: theme.colors.primary,
          }}
          color="#fff"
        />
        </View>
    );
}