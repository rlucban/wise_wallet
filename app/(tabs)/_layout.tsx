import { Tabs } from "expo-router";
import { View } from "react-native";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import FloatingTabBar from "../../components/FloatingTabBar";
import { useTheme } from "react-native-paper";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { getTabBarMetrics } from "../../utils/tabBarMetrics";

export default function TabLayout() {
    const theme = useTheme();
    const insets = useSafeAreaInsets();
    const { height, paddingTop, paddingBottom } = getTabBarMetrics(insets.bottom);

    return (
        <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
            <Tabs
                tabBar={FloatingTabBar}
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
        </View>
    );
}
