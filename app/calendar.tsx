import { useCallback } from "react";
import { View } from "react-native";
import { Appbar, useTheme, FAB } from "react-native-paper";
import { useRouter, useFocusEffect } from "expo-router";
import { useTransactions } from "../hooks/useTransactions";
import CalendarDaySheet from "../components/CalendarDaySheet";

export default function CalendarScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { refetch } = useTransactions();

  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [refetch])
  );

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <Appbar.Header>
        <Appbar.BackAction onPress={() => router.back()} />
        <Appbar.Content title="Calendar" />
      </Appbar.Header>

      <CalendarDaySheet />

      <FAB
        icon="plus"
        style={{ position: "absolute", margin: 16, right: 0, bottom: 0 }}
        onPress={() => router.push("/add-transaction")}
      />
    </View>
  );
}
