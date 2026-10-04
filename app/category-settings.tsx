import React, { useState, useMemo } from "react";
import { View, ScrollView, TouchableOpacity } from "react-native";
import { Appbar, List, IconButton, FAB, Portal, Modal, TextInput, Button, SegmentedButtons, useTheme, Card, Text } from "react-native-paper";
import { useRouter } from "expo-router";
import { useCategoriesData, useCategoriesActions } from "../context/CategoriesContext";
import { TransactionType, Category } from "../types";
import ConfirmDialog from "../components/ConfirmDialog";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";

export default function CategorySettings() {
  const router = useRouter();
  const theme = useTheme();
  const { categories } = useCategoriesData();
  const { addCategory, deleteCategory } = useCategoriesActions();
  const [type, setType] = useState<TransactionType>("expense");
  const [sortBy, setSortBy] = useState<"alphabetical-asc" | "alphabetical-desc">("alphabetical-asc");
  const [modalVisible, setModalVisible] = useState(false);
  const [newCatName, setNewCatName] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<Category | null>(null);

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    await deleteCategory(deleteTarget.id.toString());
    setDeleteTarget(null);
  };

  const sortedCategories = useMemo(() => {
    let result = categories.filter((c) => c.type === type);
    switch (sortBy) {
      case "alphabetical-asc":
        result.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case "alphabetical-desc":
        result.sort((a, b) => b.name.localeCompare(a.name));
        break;
    }
    return result;
  }, [categories, type, sortBy]);

  const handleAdd = async () => {
    if (newCatName.trim()) {
      await addCategory({ name: newCatName.trim(), type, updatedAt: Date.now() });
      setNewCatName("");
      setModalVisible(false);
    }
  };

  const handleClose = () => {
    setNewCatName("");
    setModalVisible(false);
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <Appbar.Header>
        <Appbar.BackAction onPress={() => router.back()} />
        <Appbar.Content title="Manage Categories" />
        <TouchableOpacity
          onPress={() => setSortBy(prev => prev === "alphabetical-asc" ? "alphabetical-desc" : "alphabetical-asc")}
          style={{
            flexDirection: "row",
            alignItems: "center",
            backgroundColor: "#E8EEFF",
            borderRadius: 20,
            paddingHorizontal: 14,
            paddingVertical: 8,
            marginRight: 8,
          }}
        >
          <MaterialCommunityIcons
            name={sortBy === "alphabetical-asc" ? "sort-alphabetical-ascending" : "sort-alphabetical-descending"}
            size={22}
            color={theme.colors.onSurface}
          />
          <Text variant="labelLarge" style={{ marginLeft: 6, color: theme.colors.onSurface, fontWeight: "600" }}>Sort</Text>
        </TouchableOpacity>
      </Appbar.Header>

      <View style={{ padding: 16 }}>
        <SegmentedButtons
          value={type}
          onValueChange={(v) => setType(v as TransactionType)}
          buttons={[
            { value: "expense", label: "Expenses" },
            { value: "income", label: "Income" },
          ]}
        />
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingTop: 0 }}>
        {sortedCategories.map((cat) => (
          <Card key={cat.id} style={{ marginBottom: 8, backgroundColor: theme.colors.surface }}>
            <List.Item
              title={cat.name}
              titleStyle={{ color: theme.colors.onSurface }}
              right={(props) => (
                <IconButton
                  {...props}
                  icon="delete-outline"
                  iconColor={theme.colors.error}
                  onPress={() => setDeleteTarget(cat)}
                />
              )}
            />
          </Card>
        ))}
      </ScrollView>

      <Portal>
        <Modal
          visible={modalVisible}
          onDismiss={handleClose}
          contentContainerStyle={{
            backgroundColor: "transparent",
            justifyContent: "center",
            alignItems: "center",
            padding: 20,
          }}
        >
          <Card style={{ width: "100%", maxWidth: 400, borderRadius: 16, backgroundColor: theme.colors.surface }}>
            <Card.Content style={{ padding: 20 }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <Text variant="titleLarge" style={{ color: theme.colors.onSurface }}>
                  Add {type === "income" ? "Income" : "Expense"} Category
                </Text>
                <IconButton
                  icon="close"
                  iconColor={theme.colors.onSurfaceVariant}
                  onPress={handleClose}
                />
              </View>
              <TextInput
                label="Category Name"
                value={newCatName}
                onChangeText={setNewCatName}
                mode="outlined"
                style={{ marginBottom: 16 }}
              />
              <Button mode="contained" onPress={handleAdd} buttonColor={theme.colors.primary} color={theme.colors.onPrimary}>
                Add Category
              </Button>
            </Card.Content>
          </Card>
        </Modal>
      </Portal>

      <ConfirmDialog
        visible={!!deleteTarget}
        title="Delete Category?"
        message={
          deleteTarget
            ? `Are you sure you want to delete the category "${deleteTarget.name}"? This action cannot be undone.`
            : ""
        }
        confirmLabel="Delete"
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />

      <FAB
        icon="plus"
        style={{ position: "absolute", margin: 16, right: 0, bottom: 0, backgroundColor: theme.colors.primary }}
        color={theme.colors.onPrimary}
        onPress={() => setModalVisible(true)}
      />
    </View>
  );
}
