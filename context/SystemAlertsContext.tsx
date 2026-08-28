import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, ReactNode } from "react";
import { SystemAlert } from "../types";
import { useAuth } from "./AuthContext";
import { useCurrencyActions } from "./CurrencyContext";
import {
  getSystemAlerts,
  markAlertAsRead as markReadHelper,
  markAllAlertsAsRead as markAllReadHelper,
  clearAllAlerts as clearAlertsHelper,
  checkAndTriggerNegativeBalanceAlert,
} from "../utils/notifications";

interface SystemAlertsContextType {
  alerts: SystemAlert[];
  unreadCount: number;
  loading: boolean;
  refetchAlerts: () => Promise<void>;
  markAsRead: (alertId: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  clearAlerts: () => Promise<void>;
  checkNegativeBalance: (balance: number) => Promise<SystemAlert | null>;
}

const SystemAlertsContext = createContext<SystemAlertsContextType | undefined>(undefined);

export function SystemAlertsProvider({ children }: { children: ReactNode }) {
  const { activeUserId } = useAuth();
  const { formatAmount } = useCurrencyActions();
  const [alerts, setAlerts] = useState<SystemAlert[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchAlerts = useCallback(async () => {
    if (!activeUserId) return;
    setLoading(true);
    try {
      const data = await getSystemAlerts(activeUserId);
      setAlerts(data);
    } catch (e) {
      console.error("Error fetching system alerts:", e);
    } finally {
      setLoading(false);
    }
  }, [activeUserId]);

  useEffect(() => {
    fetchAlerts();
  }, [fetchAlerts]);

  const markAsRead = useCallback(
    async (alertId: string) => {
      if (!activeUserId) return;
      const updated = await markReadHelper(alertId, activeUserId);
      setAlerts(updated);
    },
    [activeUserId]
  );

  const markAllAsRead = useCallback(async () => {
    if (!activeUserId) return;
    const updated = await markAllReadHelper(activeUserId);
    setAlerts(updated);
  }, [activeUserId]);

  const clearAlerts = useCallback(async () => {
    if (!activeUserId) return;
    await clearAllAlertsHelper(activeUserId);
    setAlerts([]);
  }, [activeUserId]);

  const checkNegativeBalance = useCallback(
    async (balance: number) => {
      if (!activeUserId) return null;
      const createdAlert = await checkAndTriggerNegativeBalanceAlert(balance, formatAmount, activeUserId);
      if (createdAlert) {
        await fetchAlerts();
      }
      return createdAlert;
    },
    [activeUserId, formatAmount, fetchAlerts]
  );

  const unreadCount = useMemo(() => alerts.filter((a) => !a.read).length, [alerts]);

  const value = useMemo(
    () => ({
      alerts,
      unreadCount,
      loading,
      refetchAlerts: fetchAlerts,
      markAsRead,
      markAllAsRead,
      clearAlerts,
      checkNegativeBalance,
    }),
    [alerts, unreadCount, loading, fetchAlerts, markAsRead, markAllAsRead, clearAlerts, checkNegativeBalance]
  );

  return <SystemAlertsContext.Provider value={value}>{children}</SystemAlertsContext.Provider>;
}

export function useSystemAlerts(): SystemAlertsContextType {
  const context = useContext(SystemAlertsContext);
  if (!context) {
    throw new Error("useSystemAlerts must be used within a SystemAlertsProvider");
  }
  return context;
}
