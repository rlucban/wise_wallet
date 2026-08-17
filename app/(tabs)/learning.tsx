import { useState, useCallback } from "react";
import { View, ScrollView, StyleSheet, Platform } from "react-native";
import { Text, Card, Appbar, IconButton, Chip } from "react-native-paper";
import { useRouter, useFocusEffect } from "expo-router";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import { FinancialTip } from "../../components/FinancialTip";
import { useThemeData } from "../../context/ThemeContext";
import { LEARNING_RESOURCES, LEARNING_CATEGORIES, LearningCategory } from "../../utils/learningData";
import { getCompletedArticles } from "../../utils/readingProgress";

export default function LearningScreen() {
    const { theme } = useThemeData();
    const router = useRouter();

    const [category, setCategory] = useState<LearningCategory>("All");
    const [completed, setCompleted] = useState<Set<string>>(new Set());

    useFocusEffect(
        useCallback(() => {
            getCompletedArticles().then((ids) => setCompleted(new Set(ids)));
        }, [])
    );

    const filteredResources = LEARNING_RESOURCES.filter(
        (r) => category === "All" || r.topic === category
    );

    return (
        <View style={[styles.screen, { backgroundColor: theme.colors.background }]}>
            <Appbar.Header style={{ backgroundColor: theme.colors.background, elevation: 0 }}>
                <Appbar.Content title="Financial Literacy" titleStyle={{ fontWeight: "700" }} />
            </Appbar.Header>

            <ScrollView contentContainerStyle={styles.content}>
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.chips}
                >
                    {LEARNING_CATEGORIES.map((item) => (
                        <Chip
                            key={item}
                            selected={category === item}
                            showSelectedCheck={false}
                            onPress={() => setCategory(item)}
                            style={styles.chip}
                        >
                            {item}
                        </Chip>
                    ))}
                </ScrollView>

                <View style={styles.section}>
                    <Text variant="titleMedium" style={styles.sectionTitle}>Daily Insight</Text>
                    <FinancialTip showFooter={false} style={{ margin: 0 }} />
                </View>

                <View style={styles.section}>
                    <Text variant="titleMedium" style={styles.sectionTitle}>Recommended Reading</Text>
                    {filteredResources.length === 0 ? (
                        <Card style={[styles.emptyCard, { borderColor: theme.colors.outline }]}>
                            <Card.Content style={styles.emptyContent}>
                                <MaterialCommunityIcons name="book-open-page-variant-outline" size={40} color={theme.colors.outline} />
                                <Text variant="bodyMedium" style={[styles.emptyText, { color: theme.colors.outline }]}>
                                    No articles in "{category}" yet.
                                </Text>
                            </Card.Content>
                        </Card>
                    ) : (
                        filteredResources.map((item) => {
                            const isCompleted = completed.has(item.id);
                            return (
                                <Card
                                    key={item.id}
                                    style={styles.articleCard}
                                    onPress={() => router.push({ pathname: "/(tabs)/learning-detail", params: { id: item.id } })}
                                >
                                    <Card.Content style={styles.articleRow}>
                                        <View style={[styles.iconBox, { backgroundColor: theme.colors.primaryContainer }]}>
                                            <MaterialCommunityIcons name={item.icon as string} size={24} color={theme.colors.primary} />
                                        </View>
                                        <View style={styles.articleBody}>
                                            <Text variant="bodyLarge" style={styles.articleTitle}>{item.title}</Text>
                                            <Text variant="bodySmall" style={[styles.articleDesc, { color: theme.colors.onSurfaceVariant }]}>
                                                {item.description}
                                            </Text>
                                            <View style={styles.badgeRow}>
                                                <View style={[styles.badge, { backgroundColor: theme.colors.surfaceVariant }]}>
                                                    <MaterialCommunityIcons name="clock-outline" size={12} color={theme.colors.onSurfaceVariant} />
                                                    <Text variant="labelSmall" style={[styles.badgeText, { color: theme.colors.onSurfaceVariant }]}>
                                                        {item.minutes} min read
                                                    </Text>
                                                </View>
                                                <View style={[styles.badge, { backgroundColor: theme.colors.primaryContainer }]}>
                                                    <Text variant="labelSmall" style={{ color: theme.colors.primary }}>{item.topic}</Text>
                                                </View>
                                            </View>
                                        </View>
                                        {isCompleted ? (
                                            <View style={[styles.completedBadge, { backgroundColor: theme.colors.tertiaryContainer }]}>
                                                <MaterialCommunityIcons name="check" size={16} color={theme.colors.tertiary} />
                                            </View>
                                        ) : null}
                                        <IconButton icon="chevron-right" size={20} />
                                    </Card.Content>
                                </Card>
                            );
                        })
                    )}
                </View>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    screen: { flex: 1 },
    content: { padding: 16, paddingBottom: 40 },
    chips: { paddingRight: 8 },
    chip: { marginRight: 8 },
    section: { marginBottom: 24 },
    sectionTitle: { fontWeight: "700", marginBottom: 12 },
    emptyCard: {
        borderRadius: 16,
        borderStyle: 'dashed',
        borderWidth: 1,
        backgroundColor: 'transparent',
    },
    emptyContent: { alignItems: 'center', paddingVertical: 24 },
    emptyText: { marginTop: 12, textAlign: 'center' },
    articleCard: {
        marginBottom: 12,
        borderRadius: 16,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 6,
        ...Platform.select({
            web: { boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)' },
        }),
    },
    articleRow: { flexDirection: 'row', alignItems: 'center' },
    iconBox: {
        width: 48,
        height: 48,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 14,
    },
    articleBody: { flex: 1 },
    articleTitle: { fontWeight: '700' },
    articleDesc: { marginTop: 2 },
    badgeRow: { flexDirection: 'row', alignItems: 'center', marginTop: 8, flexWrap: 'wrap' },
    badge: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 6,
        paddingHorizontal: 6,
        paddingVertical: 2,
        marginRight: 6,
    },
    badgeText: { marginLeft: 3 },
    completedBadge: {
        width: 26,
        height: 26,
        borderRadius: 13,
        justifyContent: 'center',
        alignItems: 'center',
    },
});
