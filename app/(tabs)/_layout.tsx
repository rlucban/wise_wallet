import { View } from "react-native";
import { Tabs } from "expo-router";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import FloatingTabBar from "../../components/FloatingTabBar";

export default function TabLayout() {
    return (
        <View style={{ flex: 1 }}>
        <Tabs
            tabBar={(props) => <FloatingTabBar {...props} />}
            screenOptions={{
                headerShown: false,
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
