import { View, ScrollView } from "react-native";
import { Appbar, Text, Card, Divider, useTheme } from "react-native-paper";
import { useRouter } from "expo-router";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";

export default function HelpScreen() {
  const router = useRouter();
  const theme = useTheme();

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <Appbar.Header>
        <Appbar.BackAction onPress={() => router.back()} />
        <Appbar.Content title="Help & FAQ" />
      </Appbar.Header>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        <Section icon="wallet-outline" title="Available to Spend">
          Your "Available to Spend" is calculated as:
          {'\n\n'}
          <Bold>Total Balance</Bold> = Initial Balance + Income − Expenses
          {'\n\n'}
           <Bold>Reserved</Bold> = Allocations Total
           {'\n\n'}
           <Bold>Available</Bold> = Total Balance − Reserved
           {'\n\n'}
           Only allocations set aside your money. Scheduled items forecast upcoming needs but do not reserve your balance.
        </Section>

         <Section icon="calendar-check-outline" title="Scheduled">
           Scheduled items are financial events — bills, payroll, subscriptions. They can be one-time or recurring (weekly, monthly, yearly).
          {'\n\n'}
          <Bold>Expense dues</Bold> represent money going out (bills, subscriptions).
          {'\n\n'}
          <Bold>Income dues</Bold> represent money coming in (payroll, freelance).
          {'\n\n'}
          When a due date arrives, you can record it as a transaction with one tap. Enable <Bold>Auto-Process</Bold> to be prompted to auto-create the transaction.
        </Section>

         <Section icon="cloud-outline" title="Cloud Sync">
           <Bold>Sync across devices</Bold> — Enable auto-backup in Settings to keep your data backed up to the cloud.
           {'\n\n'}
           When you log in from a new device, all your existing cloud data is pulled automatically.
           {'\n\n'}
           <Bold>Offline-first</Bold> — You can use the app entirely offline. Changes are saved locally and synced when a connection is available.
           {'\n\n'}
           <Bold>PIN protection</Bold> — Your passcode secures both local access and cloud account verification.
         </Section>

         <Section icon="bell-outline" title="Notifications">
           Notifications remind you of upcoming bills and income before they are due.
           {'\n\n'}
           <Bold>When?</Bold> A notification fires at 9 AM on the due date for items due within the next 30 days.
           {'\n\n'}
           <Bold>Recurring items</Bold> — Recurring dues (weekly, monthly, yearly) generate notifications for each upcoming occurrence.
           {'\n\n'}
           <Bold>Auto-reschedule</Bold> — Adding, editing, or completing a due item automatically updates your scheduled notifications.
           {'\n\n'}
           You must grant notification permission on first launch. This can be managed in your device settings.
         </Section>

         <Section icon="piggy-bank-outline" title="Allocations">
           Allocations are reserved pots of money. Set money aside for specific purposes so it doesn't get mixed with your available balance.
           {'\n\n'}
           <Bold>Transfer In</Bold> creates an expense transaction — money leaves your available balance and is set aside.
           {'\n\n'}
           <Bold>Transfer Out</Bold> creates an income transaction — money returns to your available balance.
           {'\n\n'}
           Deleting an allocation automatically transfers its full balance back to your main funds.
         </Section>

        <Section icon="help-circle-outline" title="Common Questions">
           <Bold>Q: Why did my available balance drop when I added to an allocation?</Bold>
           {'\n'}
           Transferring into an allocation creates an expense (money leaves your available balance) and is set aside. This is correct: the cash is reserved for that specific purpose.
           {'\n\n'}
           <Bold>Q: Do scheduled items affect my available balance?</Bold>
           {'\n'}
           No. Scheduled items are reminders only. They forecast upcoming financial events but do not reserve your balance. Only when you record it as a transaction does your balance change.
           {'\n\n'}
           <Bold>Q: What happens when I delete an allocation?</Bold>
          {'\n'}
          The full balance is automatically transferred back to your main funds as an income transaction.
          {'\n\n'}
           <Bold>Q: How do I see where my available balance comes from?</Bold>
           {'\n'}
           Tap the "Total" or "Reserved" badges on the dashboard card to open the Balance Breakdown.
           {'\n\n'}
           <Bold>Q: Is my data backed up to the cloud?</Bold>
           {'\n'}
           Enable auto-backup in Settings. When turned on, your passcode is verified against the cloud and all data is synced. If you don't have a cloud account yet, one is created automatically.
           {'\n\n'}
           <Bold>Q: How do notifications work?</Bold>
           {'\n'}
           Once you grant permission, the app schedules local notifications at 9 AM on the due date for all upcoming bills and income within 30 days. No internet connection is required — notifications are scheduled locally on your device.
         </Section>
      </ScrollView>
    </View>
  );
}

function Section({ icon, title, children }: { icon: string; title: string; children: React.ReactNode }) {
  const theme = useTheme();
  return (
    <Card style={{ marginBottom: 16, borderRadius: 12 }}>
      <Card.Content>
        <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 12 }}>
          <MaterialCommunityIcons name={icon as string} size={22} color={theme.colors.primary} />
          <Text variant="titleMedium" style={{ fontWeight: "700", marginLeft: 8 }}>{title}</Text>
        </View>
        <Divider style={{ marginBottom: 12 }} />
        <Text variant="bodyMedium" style={{ lineHeight: 22 }}>
          {children}
        </Text>
      </Card.Content>
    </Card>
  );
}

function Bold({ children }: { children: React.ReactNode }) {
  return <Text style={{ fontWeight: "700" }}>{children}</Text>;
}
