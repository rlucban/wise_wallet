import { useState, useEffect } from "react";
import { View, ScrollView, Alert } from "react-native";
import { Image } from "expo-image";
import { Appbar, TextInput, Button, SegmentedButtons, Text, Chip, IconButton, useTheme, Card, Portal, Modal } from "react-native-paper";
import { useRouter, useLocalSearchParams } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { Calendar } from "react-native-calendars";
import { useTransactions } from "../hooks/useTransactions";
import { TransactionType, PaymentMethod, Category } from "../types";

const DEFAULT_CATEGORIES: Category[] = [
  { id: "1", name: "Food", type: "expense", updatedAt: 0 },
  { id: "2", name: "Bills", type: "expense", updatedAt: 0 },
  { id: "3", name: "Transport", type: "expense", updatedAt: 0 },
  { id: "4", name: "Shopping", type: "expense", updatedAt: 0 },
  { id: "5", name: "Entertainment", type: "expense", updatedAt: 0 },
  { id: "6", name: "Salary", type: "income", updatedAt: 0 },
  { id: "7", name: "Freelance", type: "income", updatedAt: 0 },
  { id: "8", name: "Others", type: "expense", updatedAt: 0 },
  { id: "9", name: "Others", type: "income", updatedAt: 0 },
];

const PAYMENT_METHODS: { value: PaymentMethod; label: string; icon: string }[] = [
  { value: "cash", label: "Cash", icon: "cash" },
  { value: "card", label: "Card", icon: "credit-card" },
  { value: "bank_transfer", label: "Bank", icon: "bank" },
  { value: "e_wallet", label: "E-Wallet", icon: "cellphone" },
  { value: "other", label: "Other", icon: "dots-horizontal" },
];

export default function EditTransaction() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { transactions, updateTransaction } = useTransactions();

  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [type, setType] = useState<TransactionType>("expense");
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cash");
  const [establishment, setEstablishment] = useState("");
  const [receiptImage, setReceiptImage] = useState<string | null>(null);
  const [date, setDate] = useState(new Date());
  const [showCalendar, setShowCalendar] = useState(false);
  const [loading, setLoading] = useState(false);
  const [availableCategories, setAvailableCategories] = useState<Category[]>([]);

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL || "http://localhost:3000"}/categories`);
      const data = await response.json();
      if (data && data.length > 0) {
        setAvailableCategories(data);
      } else {
        setAvailableCategories(DEFAULT_CATEGORIES);
      }
    } catch (error) {
      console.error("Error fetching categories:", error);
      setAvailableCategories(DEFAULT_CATEGORIES);
    }
  };

  useEffect(() => {
    const tx = transactions.find((t) => t.id === id);
    if (tx) {
      setAmount(tx.amount?.toString() || "");
      setNote(tx.note || "");
      setType(tx.type);
      setSelectedCategory(tx.category || null);
      setPaymentMethod(tx.paymentMethod || "cash");
      setEstablishment(tx.establishment || "");
      setReceiptImage(tx.receiptUrl || null);
      setDate(new Date(tx.date));
    }
  }, [id, transactions]);

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.7,
    });
    if (!result.canceled) {
      setReceiptImage(result.assets[0].uri);
    }
  };

  const takePhoto = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      alert("Camera permission is required.");
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.7,
    });
    if (!result.canceled) {
      setReceiptImage(result.assets[0].uri);
    }
  };

  const handleSave = async () => {
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      Alert.alert("Invalid Amount", "Please enter a valid amount greater than 0.");
      return;
    }
    if (!selectedCategory || !id) return;

    setLoading(true);
    try {
      await updateTransaction(id, {
        amount: numAmount,
        date: date.toISOString(),
        note,
        type,
        category: selectedCategory,
        paymentMethod,
        establishment: establishment || undefined,
        receiptUrl: receiptImage || undefined,
      });
      setLoading(false);
      router.back();
    } catch {
      setLoading(false);
      Alert.alert("Error", "Failed to save changes. Please check your connection.");
    }
  };

  const theme = useTheme();

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <Appbar.Header>
        <Appbar.BackAction onPress={() => router.back()} />
        <Appbar.Content title="Edit Transaction" />
      </Appbar.Header>

      <ScrollView contentContainerStyle={{ padding: 16 }}>
        <SegmentedButtons
          value={type}
          onValueChange={(val) => setType(val as TransactionType)}
          buttons={[
            { value: "expense", label: "Expense", icon: "arrow-down" },
            { value: "income", label: "Income", icon: "arrow-up" },
          ]}
          style={{ marginBottom: 16 }}
        />

        <TextInput
          label="Amount"
          value={amount}
          onChangeText={setAmount}
          keyboardType="numeric"
          mode="outlined"
          left={<TextInput.Affix text="₱" />}
          style={{ marginBottom: 16 }}
        />

        <TextInput
          label="Date"
          value={date.toLocaleDateString()}
          mode="outlined"
          editable={false}
          right={<TextInput.Icon icon="calendar" onPress={() => setShowCalendar(true)} />}
          style={{ marginBottom: 16 }}
        />

        <Text variant="labelLarge" style={{ marginBottom: 8 }}>Category</Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
          {availableCategories
            .filter((cat: Category) => cat.type === type)
            .map((cat: Category) => (
              <Chip
                key={cat.id}
                selected={selectedCategory?.id === cat.id}
                onPress={() => setSelectedCategory(cat)}
                mode="outlined"
                selectedColor={selectedCategory?.id === cat.id ? "#6200ee" : undefined}
                style={{ backgroundColor: selectedCategory?.id === cat.id ? "#e8def8" : "transparent" }}
              >
                {cat.name}
              </Chip>
            ))}
        </View>

        <TextInput
          label="Establishment / Location"
          value={establishment}
          onChangeText={setEstablishment}
          mode="outlined"
          style={{ marginBottom: 16 }}
        />

        <Text variant="labelLarge" style={{ marginBottom: 8 }}>Payment Method</Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
          {PAYMENT_METHODS.map((method) => (
            <Chip
              key={method.value}
              icon={method.icon}
              selected={paymentMethod === method.value}
              onPress={() => setPaymentMethod(method.value)}
              mode="outlined"
              selectedColor={paymentMethod === method.value ? "#6200ee" : undefined}
              style={{ backgroundColor: paymentMethod === method.value ? "#e8def8" : "transparent" }}
            >
              {method.label}
            </Chip>
          ))}
        </View>

        <TextInput
          label="Note (Optional)"
          value={note}
          onChangeText={setNote}
          mode="outlined"
          multiline
          style={{ marginBottom: 16 }}
        />

        <Text variant="labelLarge" style={{ marginBottom: 8 }}>Receipt Image</Text>
        <View style={{ flexDirection: "row", gap: 8, marginBottom: 16 }}>
          <Button icon="camera" mode="outlined" onPress={takePhoto}>Take Photo</Button>
          <Button icon="image" mode="outlined" onPress={pickImage}>Gallery</Button>
        </View>

        {receiptImage && (
          <View style={{ position: "relative", marginBottom: 16 }}>
            <Image source={{ uri: receiptImage }} style={{ width: "100%", height: 200, borderRadius: 8 }} contentFit="cover" />
            <IconButton icon="close-circle" size={24} iconColor="red" style={{ position: "absolute", top: 0, right: 0 }} onPress={() => setReceiptImage(null)} />
          </View>
        )}

        <Button mode="contained" onPress={handleSave} loading={loading} disabled={loading} style={{ marginTop: 8 }}>
          Save Changes
        </Button>

        <Portal>
          <Modal
            visible={showCalendar}
            onDismiss={() => setShowCalendar(false)}
            contentContainerStyle={{
              backgroundColor: "transparent",
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            <Card style={{ width: "90%", borderRadius: 24, padding: 16, elevation: 10 }}>
              <Text variant="titleMedium" style={{ marginBottom: 16, fontWeight: "700", textAlign: "center" }}>
                Update Transaction Date
              </Text>
              <Calendar
                current={date.toISOString().split('T')[0]}
                onDayPress={(day) => {
                  setDate(new Date(day.timestamp));
                  setShowCalendar(false);
                }}
                markedDates={{
                  [date.toISOString().split('T')[0]]: { selected: true, selectedColor: theme.colors.primary }
                }}
                theme={{
                  backgroundColor: theme.colors.surface,
                  calendarBackground: theme.colors.surface,
                  textSectionTitleColor: theme.colors.primary,
                  selectedDayBackgroundColor: theme.colors.primary,
                  selectedDayTextColor: '#ffffff',
                  todayTextColor: theme.colors.primary,
                  dayTextColor: theme.colors.onSurface,
                  textDisabledColor: theme.colors.surfaceVariant,
                  dotColor: theme.colors.primary,
                  selectedDotColor: '#ffffff',
                  arrowColor: theme.colors.primary,
                  disabledArrowColor: theme.colors.surfaceVariant,
                  monthTextColor: theme.colors.onSurface,
                  indicatorColor: theme.colors.primary,
                  textDayFontWeight: '300',
                  textMonthFontWeight: '700',
                  textDayHeaderFontWeight: '300',
                  textDayFontSize: 16,
                  textMonthFontSize: 18,
                  textDayHeaderFontSize: 14
                }}
              />
              <Button
                mode="text"
                onPress={() => setShowCalendar(false)}
                style={{ marginTop: 16 }}
              >
                Close
              </Button>
            </Card>
          </Modal>
        </Portal>
      </ScrollView>
    </View>
  );
}
