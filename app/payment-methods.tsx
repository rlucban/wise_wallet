import React, { useState, useEffect } from "react";
import { View, StyleSheet, ScrollView, Alert } from "react-native";
import { Appbar, FAB, Portal, Modal, TextInput, Button, Text, useTheme, Card, IconButton } from "react-native-paper";
import { useRouter } from "expo-router";
import { authFetch } from "../utils/apiClient";

interface PaymentMethod {
    id: string;
    name: string;
    type: "cash" | "card" | "bank" | "e_wallet" | "other";
    icon: string;
}

const TYPE_ICONS = {
    cash: "cash",
    card: "credit-card",
    bank: "bank",
    e_wallet: "wallet",
    other: "dots-horizontal",
};

export default function PaymentMethodsScreen() {
    const theme = useTheme();
    const router = useRouter();
    const [methods, setMethods] = useState<PaymentMethod[]>([]);
    const [visible, setVisible] = useState(false);
    const [name, setName] = useState("");
    const [type, setType] = useState<PaymentMethod["type"]>("bank");

    useEffect(() => {
        fetchMethods();
    }, []);

    const fetchMethods = async () => {
        try {
            const { ok, data } = await authFetch(`paymentMethods`);
            if (ok && Array.isArray(data)) {
                setMethods(data);
            }
        } catch (error) {
            console.error("Error fetching methods:", error);
        }
    };

    const handleAdd = async () => {
        if (!name.trim()) return;
        const newMethod = {
            id: Date.now().toString(),
            name: name.trim(),
            type,
            icon: TYPE_ICONS[type],
        };

        try {
            const { ok } = await authFetch(`paymentMethods`, {
                method: "POST",
                body: JSON.stringify(newMethod),
            });
            if (ok) {
                setMethods([...methods, newMethod]);
                setVisible(false);
                setName("");
            }
        } catch (error) {
            console.error("Error adding method:", error);
        }
    };

    const handleDelete = async (id: string) => {
        Alert.alert("Delete Method", "Are you sure you want to delete this payment method?", [
            { text: "Cancel", style: "cancel" },
            {
                text: "Delete",
                style: "destructive",
                onPress: async () => {
                    try {
                        const { ok } = await authFetch(`paymentMethods/${id}`, {
                            method: "DELETE",
                        });
                        if (ok) {
                            setMethods(methods.filter((m) => m.id !== id));
                        }
                    } catch (error) {
                        console.error("Error deleting method:", error);
                    }
                },
            },
        ]);
    };

    return (
        <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
            <Appbar.Header style={{ backgroundColor: theme.colors.background, elevation: 0 }}>
                <Appbar.BackAction onPress={() => router.back()} />
                <Appbar.Content title="Payment Methods" titleStyle={{ fontWeight: "700" }} />
            </Appbar.Header>

            <ScrollView contentContainerStyle={styles.scrollContent}>
                <Text variant="bodyLarge" style={styles.sectionTitle}>Your Accounts & Wallets</Text>
                {methods.map((method) => (
                    <Card key={method.id} style={styles.card}>
                        <Card.Content style={styles.cardInner}>
                            <View style={styles.methodInfo}>
                                <IconButton icon={method.icon} size={24} iconColor={theme.colors.primary} />
                                <View>
                                    <Text variant="titleMedium">{method.name}</Text>
                                    <Text variant="bodySmall" style={{ textTransform: "capitalize" }}>{method.type.replace("_", " ")}</Text>
                                </View>
                            </View>
                            <IconButton icon="delete-outline" iconColor={theme.colors.error} onPress={() => handleDelete(method.id)} />
                        </Card.Content>
                    </Card>
                ))}
            </ScrollView>

            <Portal>
                <Modal visible={visible} onDismiss={() => setVisible(false)} contentContainerStyle={styles.modal}>
                    <Text variant="headlineSmall" style={styles.modalTitle}>Add Payment Method</Text>
                    <TextInput
                        label="Name (e.g. GCash, BPI, My Visa)"
                        value={name}
                        onChangeText={setName}
                        mode="outlined"
                        style={styles.input}
                    />
                    <Text variant="bodyMedium" style={{ marginBottom: 8 }}>Type</Text>
                    <View style={styles.typeContainer}>
                        {(Object.keys(TYPE_ICONS) as PaymentMethod["type"][]).map((t) => (
                            <Button
                                key={t}
                                mode={type === t ? "contained" : "outlined"}
                                onPress={() => setType(t)}
                                style={styles.typeButton}
                                contentStyle={{ paddingVertical: 4 }}
                            >
                                {t.replace("_", " ")}
                            </Button>
                        ))}
                    </View>
                    <Button mode="contained" onPress={handleAdd} style={styles.addButton} disabled={!name.trim()}>
                        Add Method
                    </Button>
                    <Button onPress={() => setVisible(false)}>Cancel</Button>
                </Modal>
            </Portal>

            <FAB icon="plus" style={styles.fab} onPress={() => setVisible(true)} label="Add new" />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    scrollContent: { padding: 16, paddingBottom: 100 },
    sectionTitle: { marginBottom: 16, opacity: 0.7 },
    card: { marginBottom: 12 },
    cardInner: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 8 },
    methodInfo: { flexDirection: "row", alignItems: "center" },
    modal: { backgroundColor: "white", padding: 24, margin: 20, borderRadius: 16 },
    modalTitle: { marginBottom: 20, textAlign: "center", fontWeight: "bold" },
    input: { marginBottom: 16 },
    typeContainer: { flexDirection: "row", flexWrap: "wrap", marginBottom: 20 },
    typeButton: { margin: 4, borderRadius: 8 },
    addButton: { marginTop: 8, marginBottom: 8 },
    fab: { position: "absolute", margin: 16, right: 0, bottom: 0 },
});
