import { useState, useMemo } from "react";
import { View, ScrollView, StyleSheet, Platform, useWindowDimensions } from "react-native";
import { Text, Card, Appbar, IconButton, Chip, TextInput } from "react-native-paper";
import { useRouter } from "expo-router";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import { FinancialTip } from "../../components/FinancialTip";
import { useThemeData } from "../../context/ThemeContext";
import { LEARNING_RESOURCES } from "../../utils/learningData";

const UNIFIED_FILTERS = ["All", "For Students", "For Workers", "Budgeting", "Savings", "Debt"] as const;
type UnifiedFilter = (typeof UNIFIED_FILTERS)[number];

export default function LearningScreen() {
    const { theme } = useThemeData();
    const router = useRouter();
    const { width: windowWidth } = useWindowDimensions();
    const isDesktop = windowWidth >= 768;

    const [activeFilter, setActiveFilter] = useState<UnifiedFilter>("All");
    const [searchQuery, setSearchQuery] = useState("");
    const [bookmarkedIds, setBookmarkedIds] = useState<Set<string>>(new Set());

    const toggleBookmark = (id: string) => {
        setBookmarkedIds((prev) => {
            const next = new Set(prev);
            if (next.has(id)) {
                next.delete(id);
            } else {
                next.add(id);
            }
            return next;
        });
    };

    const filteredResources = useMemo(() => {
        return LEARNING_RESOURCES.filter((item) => {
            let matchesFilter = true;
            if (activeFilter === "For Students") {
                matchesFilter = item.audience === "Students";
            } else if (activeFilter === "For Workers") {
                matchesFilter = item.audience === "Workers";
            } else if (activeFilter !== "All") {
                matchesFilter = item.topic === activeFilter;
            }

            const matchesSearch =
                searchQuery.trim() === "" ||
                item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                item.description.toLowerCase().includes(searchQuery.toLowerCase());

            return matchesFilter && matchesSearch;
        });
    }, [activeFilter, searchQuery]);

    const getPastelTagStyle = (topic: string) => {
        switch (topic) {
            case "Savings":
                return { backgroundColor: "#E8F5E9", textColor: "#2E7D32" };
            case "Budgeting":
                return { backgroundColor: "#E3F2FD", textColor: "#1565C0" };
            case "Debt":
                return { backgroundColor: "#FBE9E7", textColor: "#C62828" };
            default:
                return { backgroundColor: "#F3E5F5", textColor: "#6A1B9A" };
        }
    };

    return (
        <View style={[styles.screen, { backgroundColor: theme.colors.background }]}>
            <Appbar.Header style={{ backgroundColor: theme.colors.background, elevation: 0 }}>
                <Appbar.Content title="Financial Literacy" titleStyle={{ fontWeight: "700" }} />
            </Appbar.Header>

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                <View style={styles.container}>
                    {/* Search Bar */}
                    <View style={styles.searchContainer}>
                        <TextInput
                            placeholder="Search financial topics..."
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                            mode="outlined"
                            left={<TextInput.Icon icon="magnify" />}
                            style={styles.searchInput}
                        />
                    </View>

                    {/* Unified Filter Bar */}
                    <View style={styles.filterContainer}>
                        <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={styles.filterChipsContainer}
                        >
                            {UNIFIED_FILTERS.map((filter) => (
                                <Chip
                                    key={filter}
                                    selected={activeFilter === filter}
                                    showSelectedCheck={false}
                                    onPress={() => setActiveFilter(filter)}
                                    style={[
                                        styles.filterChip,
                                        activeFilter === filter && { backgroundColor: theme.colors.primaryContainer },
                                    ]}
                                    textStyle={[
                                        styles.filterChipText,
                                        activeFilter === filter && { color: theme.colors.primary, fontWeight: "700" },
                                    ]}
                                >
                                    {filter}
                                </Chip>
                            ))}
                        </ScrollView>
                    </View>

                    {/* Daily Insight Section */}
                    <View style={styles.section}>
                        <Text variant="titleMedium" style={styles.sectionTitle}>Daily Insight</Text>
                        <FinancialTip showFooter={false} style={{ margin: 0, width: "100%" }} />
                    </View>

                    {/* Articles Section */}
                    <View style={styles.section}>
                        <View style={styles.resultsHeader}>
                            <Text variant="titleMedium" style={styles.sectionTitle}>Recommended Reading</Text>
                            <Text variant="labelMedium" style={{ color: theme.colors.outline }}>
                                Showing {filteredResources.length} {filteredResources.length === 1 ? "article" : "articles"}
                            </Text>
                        </View>

                        {filteredResources.length === 0 ? (
                            <Card style={[styles.emptyCard, { borderColor: theme.colors.outline }]}>
                                <Card.Content style={styles.emptyContent}>
                                    <MaterialCommunityIcons name="book-open-page-variant-outline" size={40} color={theme.colors.outline} />
                                    <Text variant="bodyMedium" style={[styles.emptyText, { color: theme.colors.outline }]}>
                                        No articles match your filters.
                                    </Text>
                                </Card.Content>
                            </Card>
                        ) : (
                            <View style={isDesktop ? styles.desktopGrid : styles.mobileList}>
                                {filteredResources.map((item) => {
                                    const tagStyle = getPastelTagStyle(item.topic);
                                    const isBookmarked = bookmarkedIds.has(item.id);

                                    return (
                                        <View key={item.id} style={isDesktop ? styles.desktopCardWrapper : styles.mobileCardWrapper}>
                                            <Card
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
                                                            <View style={[styles.badge, { backgroundColor: tagStyle.backgroundColor }]}>
                                                                <Text variant="labelSmall" style={{ color: tagStyle.textColor, fontWeight: "600" }}>
                                                                    {item.topic}
                                                                </Text>
                                                            </View>
                                                            {item.audience && (
                                                                <View style={[styles.badge, { backgroundColor: "#F5F5F5" }]}>
                                                                    <Text variant="labelSmall" style={{ color: "#616161" }}>
                                                                        {item.audience}
                                                                    </Text>
                                                                </View>
                                                            )}
                                                        </View>
                                                    </View>
                                                    <View style={{ alignItems: "center" }}>
                                                        <IconButton
                                                            icon={isBookmarked ? "bookmark" : "bookmark-outline"}
                                                            iconColor={isBookmarked ? theme.colors.primary : theme.colors.outline}
                                                            size={22}
                                                            onPress={() => toggleBookmark(item.id)}
                                                        />
                                                    </View>
                                                </Card.Content>
                                            </Card>
                                        </View>
                                    );
                                })}
                            </View>
                        )}
                    </View>
                </View>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    screen: { flex: 1 },
    scrollContent: { paddingBottom: 40, width: "100%" },
    container: {
        width: "100%",
        flex: 1,
        alignSelf: "stretch",
        paddingHorizontal: 24,
        paddingVertical: 16,
    },
    searchContainer: {
        width: "100%",
        marginBottom: 12,
    },
    searchInput: {
        backgroundColor: "transparent",
        width: "100%",
    },
    filterContainer: {
        width: "100%",
        marginBottom: 20,
    },
    filterChipsContainer: {
        paddingRight: 8,
        width: "100%",
    },
    filterChip: {
        marginRight: 8,
        borderRadius: 20,
    },
    filterChipText: {
        fontSize: 13,
    },
    section: {
        width: "100%",
        marginBottom: 24,
    },
    sectionTitle: {
        fontWeight: "700",
        marginBottom: 8,
    },
    resultsHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 12,
        width: "100%",
    },
    emptyCard: {
        borderRadius: 16,
        borderStyle: "dashed",
        borderWidth: 1,
        backgroundColor: "transparent",
        width: "100%",
    },
    emptyContent: {
        alignItems: "center",
        paddingVertical: 24,
    },
    emptyText: {
        marginTop: 12,
        textAlign: "center",
    },
    desktopGrid: {
        flexDirection: "row",
        flexWrap: "wrap",
        justifyContent: "space-between",
        width: "100%",
    },
    mobileList: {
        flexDirection: "column",
        width: "100%",
    },
    desktopCardWrapper: {
        width: "48%",
        minWidth: 320,
        marginBottom: 16,
    },
    mobileCardWrapper: {
        width: "100%",
        marginBottom: 12,
    },
    articleCard: {
        borderRadius: 16,
        elevation: 2,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 6,
        width: "100%",
        ...Platform.select({
            web: { boxShadow: "0 2px 8px rgba(0, 0, 0, 0.08)" },
        }),
    },
    articleRow: {
        flexDirection: "row",
        alignItems: "center",
    },
    iconBox: {
        width: 48,
        height: 48,
        borderRadius: 12,
        justifyContent: "center",
        alignItems: "center",
        marginRight: 14,
    },
    articleBody: {
        flex: 1,
    },
    articleTitle: {
        fontWeight: "700",
    },
    articleDesc: {
        marginTop: 2,
    },
    badgeRow: {
        flexDirection: "row",
        alignItems: "center",
        marginTop: 8,
        flexWrap: "wrap",
    },
    badge: {
        borderRadius: 8,
        paddingHorizontal: 10,
        paddingVertical: 4,
        marginRight: 6,
    },
});
