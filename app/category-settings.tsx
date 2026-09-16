import React, { useState } from "react";
import { View, ScrollView } from "react-native";
import { Appbar, List, IconButton, FAB, Portal, Modal, TextInput, Button, SegmentedButtons, useTheme, Card } from "react-native-paper";
import { useRouter } from "expo-router";
import { useCategoriesData, useCategoriesActions } from "../context/CategoriesContext";
import { TransactionType, Category } from "../types";
import ConfirmDialog from "../components/ConfirmDialog";

export default function CategorySettings() {
  const router = useRouter();
  const theme = useTheme();
  const { categories } = useCategoriesData();
  const { addCategory, deleteCategory } = useCategoriesActions();
  const [type, setType] = useState<TransactionType>("expense");
  const [modalVisible, setModalVisible] = useState(false);
  const [newCatName, setNewCatName] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<Category | null>(null);

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    await deleteCategory(deleteTarget.id.toString());
    setDeleteTarget(null);
  };

  const filteredCategories = categories.filter((c) => c.type === type);

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
      </Appbar.Header>

      <View style={{ padding: 16 }}>
        <SegmentedButtons
          value={type}
          onValueChange={(v) => setType(v as TransactionType)}
          buttons={[
            { value: "expense", label: "Expenses" },
            { value: "income", label: "Income" },
          ]}
          style={{ marginBottom: 16 }}
        />
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingTop: 0 }}>
        {filteredCategories.map((cat) => (
          <Card key={cat.id} style={{ marginBottom: 8 }}>
            <List.Item
              title={cat.name}
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
          contentContainerStyle={{ backgroundColor: "white", padding: 20, margin: 20, borderRadius: 12 }}
        >
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <List.Subheader style={{ margin: 0, padding: 0 }}>
              Add {type === "income" ? "Income" : "Expense"} Category
            </List.Subheader>
            <IconButton
              icon="close"
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
          <Button mode="contained" onPress={handleAdd}>
            Add Category
          </Button>
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
        style={{ position: "absolute", margin: 16, right: 0, bottom: 0 }}
        onPress={() => setModalVisible(true)}
      />
    </View>
  );
}
