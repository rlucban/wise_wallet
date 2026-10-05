import { useState, useCallback, useMemo } from "react";
import { View, ScrollView, Alert } from "react-native";
import { Appbar, Text, Card, IconButton, Snackbar, useTheme } from "react-native-paper";
import { useRouter, useFocusEffect } from "expo-router";
import { safeGoBack } from "../utils/backNavigation";
import { useSavings } from "../hooks/useSavings";
import { useCurrencyActions } from "../context/CurrencyContext";
import EmptyState from "../components/EmptyState";
import ConfirmDialog from "../components/ConfirmDialog";

export default function ArchivedAllocationsScreen() {
    const router = useRouter();
    const theme = useTheme();
    const { items, updateItem, deleteItem, refetch } = useSavings();
    const { formatAmount } = useCurrencyActions();

    const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
    const [toastMessage, setToastMessage] = useState<string | null>(null);

    useFocusEffect(
        useCallback(() => {
            refetch();
        }, [refetch])
    );

    const archivedItems = useMemo(
        () => items.filter((item) => !!item.isArchived),
        [items]
    );

    const totalArchived = useMemo(
        () => archivedItems.reduce((sum, g) => sum + g.balance, 0),
        [archivedItems]
    );

    const handleRestoreItem = async (id: string) => {
        try {
            await updateItem(id, { isArchived: false });
            setToastMessage("Allocation restored");
        } catch {
            Alert.alert("Error", "Failed to restore allocation.");
        }
    };

    const handleDelete = (id: string) => {
        setDeleteTarget(id);
    };

    const confirmDelete = async () => {
        if (!deleteTarget) return;
        const id = deleteTarget;
        const item = items.find((g) => g.id === id);
        setDeleteTarget(null);
        if (!item) return;

        try {
            await deleteItem(id);
            setToastMessage("Archived allocation deleted permanently");
        } catch {
            Alert.alert("Error", "Failed to delete allocation.");
        }
    };

    return (
        <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
            <Appbar.Header>
                <Appbar.BackAction onPress={() => safeGoBack(router)} />
                <Appbar.Content title="Archived Allocations" />
            </Appbar.Header>

            <ScrollView contentContainerStyle={{ padding: 16 }}>
                {archivedItems.length > 0 && (
                    <Card style={{ marginBottom: 16, padding: 16, borderRadius: 16, backgroundColor: theme.colors.primaryContainer }}>
                        <Text variant="labelMedium" style={{ color: theme.colors.onPrimaryContainer, textAlign: "center" }}>
                            TOTAL ARCHIVED
                        </Text>
                        <Text variant="headlineMedium" style={{ fontWeight: "800", textAlign: "center", color: theme.colors.onPrimaryContainer }}>
                            {formatAmount(totalArchived)}
                        </Text>
                    </Card>
                )}

                {archivedItems.length === 0 ? (
                    <EmptyState
                        icon="archive-outline"
                        title="No archived allocations"
                        subtitle="Archived allocations will appear here"
                    />
                ) : (
                    archivedItems.map((item) => {
                        const currentBalance = item.balance || 0;
                        const target = item.target_amount || 0;
                        const hasGoal = target > 0;
                        const progressPercent = hasGoal ? Math.min(Math.round((currentBalance / target) * 100), 100) : 0;

                        return (
                            <Card
                                key={item.id}
                                style={{
                                    marginBottom: 12,
                                    borderRadius: 16,
                                    elevation: 1,
                                    backgroundColor: theme.colors.surfaceVariant,
                                    opacity: 0.95,
                                }}
                            >
                                <Card.Content style={{ paddingVertical: 12, paddingHorizontal: 16 }}>
                                    <View style={{ flexDirection: "row", alignItems: "center" }}>
                                        {/* Left: Title + Balance + Archived Badge */}
                                        <View style={{ flex: 1, marginRight: 12 }}>
                                            <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 4 }}>
                                                <Text variant="titleMedium" style={{ fontWeight: "700", color: theme.colors.onSurfaceVariant }}>
                                                    {item.title}
                                                </Text>
                                                <View
                                                    style={{
                                                        marginLeft: 8,
                                                        paddingHorizontal: 8,
                                                        paddingVertical: 2,
                                                        borderRadius: 10,
                                                        backgroundColor: theme.colors.primaryContainer,
                                                    }}
                                                >
                                                    <Text variant="labelSmall" style={{ color: theme.colors.primary, fontWeight: "600" }}>
                                                        Archived
                                                    </Text>
                                                </View>
                                            </View>

                                            <Text variant="bodySmall" style={{ color: theme.colors.outline, marginBottom: 8 }}>
                                                {hasGoal
                                                    ? `${formatAmount(currentBalance)} / ${formatAmount(target)}`
                                                    : formatAmount(currentBalance)
                                                }
                                            </Text>

                                            {hasGoal && (
                                                <View style={{ height: 6, backgroundColor: theme.colors.surface, borderRadius: 3, overflow: "hidden" }}>
                                                    <View
                                                        style={{
                                                            height: "100%",
                                                            width: `${progressPercent}%`,
                                                            backgroundColor: theme.colors.outline,
                                                            borderRadius: 3,
                                                        }}
                                                    />
                                                </View>
                                            )}
                                        </View>

                                        {/* Far Right: Actions (Read-only: No Edit/Transfer; Only Restore + Delete Permanently) */}
                                        <View style={{ flexDirection: "row", alignItems: "center" }}>
                                            <IconButton
                                                icon="archive-arrow-up-outline"
                                                size={22}
                                                iconColor={theme.colors.primary}
                                                onPress={() => handleRestoreItem(item.id)}
                                            />
                                            <IconButton
                                                icon="delete-forever-outline"
                                                size={22}
                                                iconColor={theme.colors.error}
                                                onPress={() => handleDelete(item.id)}
                                            />
                                        </View>
                                    </View>
                                </Card.Content>
                            </Card>
                        );
                    })
                )}
            </ScrollView>

            <ConfirmDialog
                visible={!!deleteTarget}
                title="Delete Permanently?"
                message={
                    deleteTarget
                        ? `This will permanently delete this archived allocation. The remaining balance of ${formatAmount(items.find((g) => g.id === deleteTarget)?.balance || 0)} will be transferred back to your main funds.`
                        : ""
                }
                confirmLabel="Delete Permanently"
                onConfirm={confirmDelete}
                onCancel={() => setDeleteTarget(null)}
            />

            <Snackbar
                visible={!!toastMessage}
                onDismiss={() => setToastMessage(null)}
                duration={3000}
            >
                {toastMessage}
            </Snackbar>
        </View>
    );
}
