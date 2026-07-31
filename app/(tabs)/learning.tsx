import { View, ScrollView } from "react-native";
import { Text, Card, Appbar, IconButton } from "react-native-paper";
import { useRouter } from "expo-router";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import { FinancialTip } from "../../components/FinancialTip";
import { useThemeData } from "../../context/ThemeContext";

export default function LearningScreen() {
    const { theme } = useThemeData();

    const resources = [
        {
            id: "budgeting_101",
            title: "Budgeting 101",
            description: "Learn the basics of managing your money effectively.",
            icon: "book-open-page-variant",
        },
        {
            id: "understanding_debt",
            title: "Understanding Debt",
            description: "How to manage and pay off debt strategically.",
            icon: "credit-card-off-outline",
        },
        {
            id: "saving_future",
            title: "Saving for the Future",
            description: "The importance of an emergency fund and long-term savings.",
            icon: "piggy-bank-outline",
        }
    ];

    const router = useRouter();

    return (
        <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
            <Appbar.Header style={{ backgroundColor: theme.colors.background, elevation: 0 }}>
                <Appbar.Content title="Financial Literacy" titleStyle={{ fontWeight: "700" }} />
            </Appbar.Header>

            <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
                <View style={{ marginBottom: 24 }}>
                    <Text variant="titleMedium" style={{ fontWeight: "700", marginBottom: 12 }}>Daily Insight</Text>
                    <FinancialTip />
                </View>

                <View style={{ marginBottom: 24 }}>
                    <Text variant="titleMedium" style={{ fontWeight: "700", marginBottom: 12 }}>Educational Videos</Text>
                    <Card style={{ borderRadius: 16, borderStyle: 'dashed', borderWidth: 1, borderColor: theme.colors.outline, backgroundColor: 'transparent' }}>
                        <Card.Content style={{ alignItems: 'center', paddingVertical: 32 }}>
                            <MaterialCommunityIcons name="play-circle-outline" size={48} color={theme.colors.outline} />
                            <Text variant="bodyMedium" style={{ color: theme.colors.outline, marginTop: 12, textAlign: 'center', fontStyle: 'italic' }}>
                                📹 In the future, there will be suggested video links here.
                            </Text>
                        </Card.Content>
                    </Card>
                </View>

                <View>
                    <Text variant="titleMedium" style={{ fontWeight: "700", marginBottom: 12 }}>Recommended Reading</Text>
                    {resources.map((item, index) => (
                        <Card
                            key={index}
                            style={{ marginBottom: 12, borderRadius: 16, backgroundColor: theme.colors.surface }}
                            onPress={() => router.push({ pathname: "/(tabs)/learning-detail", params: { id: item.id } })}
                        >
                            <Card.Content style={{ flexDirection: 'row', alignItems: 'center' }}>
                                <View style={{ width: 48, height: 48, borderRadius: 12, backgroundColor: theme.colors.primaryContainer, justifyContent: 'center', alignItems: 'center', marginRight: 16 }}>
                                    <MaterialCommunityIcons name={item.icon as string} size={24} color={theme.colors.primary} />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text variant="bodyLarge" style={{ fontWeight: '700' }}>{item.title}</Text>
                                    <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>{item.description}</Text>
                                </View>
                                <IconButton icon="chevron-right" size={20} />
                            </Card.Content>
                        </Card>
                    ))}
                </View>
            </ScrollView>
        </View>
    );
}
