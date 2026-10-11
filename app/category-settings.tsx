import React, { useState } from "react";
import { View, ScrollView } from "react-native";
import { Appbar, List, IconButton, FAB, Portal, Modal, Menu, TextInput, Button, SegmentedButtons, useTheme, Card, Text } from "react-native-paper";
import { useRouter } from "expo-router";
import { safeGoBack } from "../utils/backNavigation";
import { useCategoriesData, useCategoriesActions } from "../context/CategoriesContext";
import { TransactionType, Category } from "../types";
import { sortCategories, CategorySortDirection } from "../utils/categorySort";
import ConfirmDialog from "../components/ConfirmDialog";

export default function CategorySettings() {
  const router = useRouter();
  const theme = useTheme();
  const { categories } = useCategoriesData();
  const { addCategory, deleteCategory } = useCategoriesActions();
  const [type, setType] = useState<TransactionType>("expense");
  const [sortDir, setSortDir] = useState<CategorySortDirection>("asc");
  const [menuVisible, setMenuVisible] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [newCatName, setNewCatName] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<Category | null>(null);

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    await deleteCategory(deleteTarget.id.toString());
    setDeleteTarget(null);
  };

  const normalizedCategories = categories.map((c) => ({
    ...c,
    type: String(c.type).toLowerCase().trim() as TransactionType,
  }));
  const filteredCategories = sortCategories(normalizedCategories.filter((c) => c.type === type), "name", sortDir);

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
        <Appbar.BackAction onPress={() => safeGoBack(router)} />
        <Appbar.Content title="Manage Categories" />
        <Menu
          visible={menuVisible}
          onDismiss={() => setMenuVisible(false)}
          anchor={
            <Appbar.Action
              icon="sort"
              accessibilityLabel="Sort by"
              onPress={() => setMenuVisible(true)}
            />
          }
        >
          <Menu.Item
            onPress={() => {
              setSortDir("asc");
              setMenuVisible(false);
            }}
            title="A-Z"
            leadingIcon="arrow-down"
            trailingIcon={sortDir === "asc" ? "check" : undefined}
          />
          <Menu.Item
            onPress={() => {
              setSortDir("desc");
              setMenuVisible(false);
            }}
            title="Z-A"
            leadingIcon="arrow-up"
            trailingIcon={sortDir === "desc" ? "check" : undefined}
          />
        </Menu>
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
        {filteredCategories.map((cat) => (
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
        style={{ position: "absolute", margin: 24, right: 0, bottom: 24, borderRadius: 999, backgroundColor: theme.colors.primary }}
        color={theme.colors.onPrimary}
        onPress={() => setModalVisible(true)}
      />
    </View>
  );
}
