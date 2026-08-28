import { Platform } from "react-native";
import * as Notifications from "expo-notifications";
import { Due, DueFrequency, SystemAlert } from "../types";
import { getItem, setItem, getPrefixedKey, nowTimestamp } from "./storage";
import { generateUUID } from "./uuid";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

const ANDROID_CHANNEL_ID = "wise-wallet-dues";

async function ensureAndroidChannel(): Promise<void> {
  if (Platform.OS !== "android") return;
  try {
    await Notifications.setNotificationChannelAsync(ANDROID_CHANNEL_ID, {
      name: "Due Reminders",
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#FF6B6B",
      sound: "default",
    });
  } catch (e) {
    console.warn("Failed to create Android notification channel:", e);
  }
}

export async function requestNotificationPermissions(): Promise<boolean> {
  if (Platform.OS === "web") return false;
  try {
    if (Platform.OS === "android") {
      await ensureAndroidChannel();
    }
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    if (existingStatus === "granted") return true;
    const { status } = await Notifications.requestPermissionsAsync();
    return status === "granted";
  } catch (e) {
    console.warn("Failed to request notification permissions:", e);
    return false;
  }
}

function getNextDueDate(dateStr: string, frequency: DueFrequency): Date | null {
  const dueDate = new Date(dateStr);
  const now = new Date();

  if (frequency === "once") {
    return dueDate > now ? dueDate : null;
  }

  const next = new Date(dueDate);
  while (next <= now) {
    switch (frequency) {
      case "weekly":
        next.setDate(next.getDate() + 7);
        break;
      case "biweekly":
        next.setDate(next.getDate() + 14);
        break;
      case "monthly":
        next.setMonth(next.getMonth() + 1);
        break;
      case "yearly":
        next.setFullYear(next.getFullYear() + 1);
        break;
    }
  }
  return next;
}

export async function scheduleDueNotifications(dues: Due[]): Promise<void> {
  if (Platform.OS === "web") return;

  try {
    if (Platform.OS === "android") {
      await ensureAndroidChannel();
    }

    await Notifications.cancelAllScheduledNotificationsAsync();

    const now = new Date();
    const upcoming = dues.filter((d) => !d.completed);

    for (const due of upcoming) {
      const nextDate = getNextDueDate(due.date, due.frequency || "once");
      if (!nextDate) continue;

      const diffMs = nextDate.getTime() - now.getTime();
      const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
      if (diffDays > 30) continue;

      const triggerDate = new Date(nextDate);
      triggerDate.setHours(9, 0, 0, 0);

      if (triggerDate <= now) continue;

      await Notifications.scheduleNotificationAsync({
        content: {
          title: due.type === "expense" ? "📄 Bill Due" : "💰 Income Due",
          body: `${due.title} — ${due.type === "expense" ? "-" : "+"}₱${due.amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
          data: { dueId: due.id, screen: "dues" },
          ...(Platform.OS === "android" && { channelId: ANDROID_CHANNEL_ID }),
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: triggerDate,
        },
      });
    }
  } catch (e) {
    console.warn("Failed to schedule notifications:", e);
  }
}

export async function cancelAllNotifications(): Promise<void> {
  if (Platform.OS === "web") return;
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
  } catch (e) {
    console.warn("Failed to cancel notifications:", e);
  }
}

export async function getSystemAlerts(userId?: string): Promise<SystemAlert[]> {
  const key = await getPrefixedKey("system_alerts", userId);
  return getItem<SystemAlert[]>(key, []);
}

export async function saveSystemAlerts(alerts: SystemAlert[], userId?: string): Promise<void> {
  const key = await getPrefixedKey("system_alerts", userId);
  await setItem(key, alerts);
}

export async function markAlertAsRead(alertId: string, userId?: string): Promise<SystemAlert[]> {
  const alerts = await getSystemAlerts(userId);
  const updated = alerts.map((a) => (a.id === alertId ? { ...a, read: true, updatedAt: nowTimestamp() } : a));
  await saveSystemAlerts(updated, userId);
  return updated;
}

export async function markAllAlertsAsRead(userId?: string): Promise<SystemAlert[]> {
  const alerts = await getSystemAlerts(userId);
  const updated = alerts.map((a) => ({ ...a, read: true, updatedAt: nowTimestamp() }));
  await saveSystemAlerts(updated, userId);
  return updated;
}

export async function clearAllAlerts(userId?: string): Promise<void> {
  const key = await getPrefixedKey("system_alerts", userId);
  await setItem(key, []);
}

export async function checkAndTriggerNegativeBalanceAlert(
  currentBalance: number,
  formatAmount: (val: number) => string,
  userId?: string
): Promise<SystemAlert | null> {
  if (currentBalance >= 0) return null;

  const alerts = await getSystemAlerts(userId);
  const negativeAlerts = alerts.filter((a) => a.title.includes("Negative Balance Alert"));

  if (negativeAlerts.length > 0) {
    const latestAlert = [...negativeAlerts].sort((a, b) => b.updatedAt - a.updatedAt)[0];
    if (latestAlert.balanceAtTrigger !== undefined && currentBalance >= latestAlert.balanceAtTrigger && !latestAlert.read) {
      return null;
    }
  }

  const formattedCurrent = formatAmount(currentBalance);
  const newAlert: SystemAlert = {
    id: generateUUID(),
    type: "Budget Alert",
    title: "Negative Balance Alert ⚠️",
    message: `Your available balance has dropped below ₱0.00 (Current: ${formattedCurrent}). Please review your expenses or add income to rebalance.`,
    date: new Date().toISOString(),
    read: false,
    balanceAtTrigger: currentBalance,
    updatedAt: nowTimestamp(),
  };

  const updatedAlerts = [newAlert, ...alerts];
  await saveSystemAlerts(updatedAlerts, userId);

  if (Platform.OS !== "web") {
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: newAlert.title,
          body: newAlert.message,
          data: { screen: "notifications" },
          ...(Platform.OS === "android" && { channelId: ANDROID_CHANNEL_ID }),
        },
        trigger: null,
      });
    } catch (e) {
      console.warn("Failed to trigger local notification:", e);
    }
  }

  return newAlert;
}

