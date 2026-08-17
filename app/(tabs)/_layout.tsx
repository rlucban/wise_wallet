import { Tabs, useRouter } from "expo-router";
import { TouchableOpacity, View } from "react-native";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import { useTheme } from "react-native-paper";

const ACTIVE_COLOR = "#1B3F7A";

function CenterTabButton() {
    const router = useRouter();

    return (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
            <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => router.push("/add-transaction")}
                style={{
                    width: 56,
                    height: 56,
                    borderRadius: 28,
                    backgroundColor: ACTIVE_COLOR,
                    justifyContent: "center",
                    alignItems: "center",
                    marginTop: -20,
                    shadowColor: "#000",
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.25,
                    shadowRadius: 6,
                    elevation: 6,
                }}
            >
                <MaterialCommunityIcons name="plus" size={28} color="#FFFFFF" />
            </TouchableOpacity>
        </View>
    );
}

export default function TabLayout() {
    const theme = useTheme();

    return (
        <Tabs
            screenOptions={{
                headerShown: false,
                tabBarActiveTintColor: ACTIVE_COLOR,
                tabBarInactiveTintColor: theme.colors.outline,
                tabBarStyle: {
                    backgroundColor: theme.colors.surface,
                    borderTopWidth: 1,
                    borderTopColor: theme.colors.surfaceVariant,
                    height: 64,
                    paddingBottom: 8,
                    paddingTop: 8,
                    elevation: 0,
                    shadowOpacity: 0,
                },
                tabBarLabelStyle: {
                    fontSize: 11,
                    fontWeight: "600",
                },
            }}
        >
            <Tabs.Screen
                name="index"
                options={{
                    title: "Home",
                    tabBarIcon: ({ color, size, focused }) => (
                        <MaterialCommunityIcons
                            name={focused ? "home-variant" : "home-variant-outline"}
                            size={size}
                            color={color}
                        />
                    ),
                }}
            />
            <Tabs.Screen
                name="reports"
                options={{
                    title: "Reports",
                    tabBarIcon: ({ color, size, focused }) => (
                        <MaterialCommunityIcons
                            name={focused ? "chart-box" : "chart-box-outline"}
                            size={size}
                            color={color}
                        />
                    ),
                }}
            />
            <Tabs.Screen
                name="add"
                options={{
                    title: "",
                    tabBarLabel: () => null,
                    tabBarButton: () => <CenterTabButton />,
                }}
            />
            <Tabs.Screen
                name="learning"
                options={{
                    title: "Learning",
                    tabBarIcon: ({ color, size, focused }) => (
                        <MaterialCommunityIcons
                            name={focused ? "school" : "school-outline"}
                            size={size}
                            color={color}
                        />
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
                    tabBarIcon: ({ color, size, focused }) => (
                        <MaterialCommunityIcons
                            name={focused ? "cog" : "cog-outline"}
                            size={size}
                            color={color}
                        />
                    ),
                }}
            />
        </Tabs>
    );
}
