import React, { useState } from "react";
import { View, ScrollView } from "react-native";
import { Appbar, List, IconButton, FAB, Portal, Modal, TextInput, Button, SegmentedButtons, useTheme, Card } from "react-native-paper";
import { useRouter } from "expo-router";
import { useCategoriesData, useCategoriesActions } from "../context/CategoriesContext";
import { TransactionType } from "../types";

export default function CategorySettings() {
  const router = useRouter();
  const theme = useTheme();
  const { categories } = useCategoriesData();
  const { addCategory, deleteCategory } = useCategoriesActions();
  const [type, setType] = useState<TransactionType>("expense");
  const [modalVisible, setModalVisible] = useState(false);
  const [newCatName, setNewCatName] = useState("");

  const filteredCategories = categories.filter((c) => c.type === type);

  const handleAdd = async () => {
    if (newCatName.trim()) {
      await addCategory({ name: newCatName.trim(), type, updatedAt: Date.now() });
      setNewCatName("");
      setModalVisible(false);
    }
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
                  onPress={() => deleteCategory(cat.id.toString())}
                />
              )}
            />
          </Card>
        ))}
      </ScrollView>

      <Portal>
        <Modal
          visible={modalVisible}
          onDismiss={() => setModalVisible(false)}
          contentContainerStyle={{ backgroundColor: "white", padding: 20, margin: 20, borderRadius: 12 }}
        >
          <List.Subheader>Add {type === "income" ? "Income" : "Expense"} Category</List.Subheader>
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

      <FAB
        icon="plus"
        style={{ position: "absolute", margin: 16, right: 0, bottom: 0 }}
        onPress={() => setModalVisible(true)}
      />
    </View>
  );
}
