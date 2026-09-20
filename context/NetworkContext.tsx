import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef, ReactNode } from "react";
import { AppState, AppStateStatus } from "react-native";
import { API_URL } from "../utils/db";
import { processSyncQueue, triggerSyncProcessing } from "../utils/syncProcessor";

interface HealthResult {
  online: boolean;
  data: Record<string, unknown> | null;
}

interface NetworkData {
  isOnline: boolean;
  isChecking: boolean;
  lastCheckedAt: number | null;
}

interface NetworkActions {
  checkConnectivity: () => Promise<boolean>;
  checkHealth: () => Promise<HealthResult>;
}

const NetworkDataContext = createContext<NetworkData | undefined>(undefined);
const NetworkActionsContext = createContext<NetworkActions | undefined>(undefined);

const PING_ENDPOINT = "/system/health";
const PING_TIMEOUT = 3000;
const CACHE_TTL_MS = 30000;

let cachedHealth: HealthResult | null = null;
let cacheExpiresAt = 0;
let inFlight: Promise<HealthResult> | null = null;

async function fetchHealth(): Promise<HealthResult> {
  if (!API_URL) {
    return { online: false, data: null };
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), PING_TIMEOUT);

  try {
    const response = await fetch(`${API_URL}${PING_ENDPOINT}`, {
      method: "GET",
      signal: controller.signal,
      headers: { "Cache-Control": "no-cache" },
    });
    clearTimeout(timeoutId);

    let data: Record<string, unknown> | null = null;
    const contentType = response.headers?.get?.("content-type") || "";
    if (response.body != null && contentType.includes("application/json")) {
      try {
        data = await response.clone().json();
      } catch {
        data = null;
      }
    }

    const online = response.ok ||
      response.status === 200 ||
      response.status === 404 ||
      response.status === 405;

    return { online, data };
  } catch {
    clearTimeout(timeoutId);
    return { online: false, data: null };
  }
}

export function checkHealth(): Promise<HealthResult> {
  const now = Date.now();
  if (inFlight) {
    return inFlight;
  }
  if (cachedHealth && now < cacheExpiresAt) {
    return Promise.resolve(cachedHealth);
  }

  inFlight = fetchHealth()
    .then((result) => {
      cachedHealth = result;
      cacheExpiresAt = Date.now() + CACHE_TTL_MS;
      inFlight = null;
      return result;
    })
    .catch((e) => {
      inFlight = null;
      console.error("[Network] Health check failed:", e);
      return { online: false, data: null };
    });

  return inFlight;
}

export function NetworkProvider({ children }: { children: ReactNode }) {
  const isOnlineRef = useRef(true);
  const [isOnline, setIsOnline] = useState(true);
  const [isChecking, setIsChecking] = useState(false);
  const [lastCheckedAt, setLastCheckedAt] = useState<number | null>(null);

  const checkConnectivity = useCallback(async (): Promise<boolean> => {
    setIsChecking(true);
    try {
      const result = await checkHealth();
      const online = result.online;
      const wasPreviouslyOffline = !isOnlineRef.current;

      if (online !== isOnlineRef.current) {
        isOnlineRef.current = online;
        setIsOnline(online);

        if (online && wasPreviouslyOffline) {
          console.info("[Network] Back online - triggering sync queue processing");
          triggerSyncProcessing(100);
          await processSyncQueue();
        }
      }

      setLastCheckedAt(Date.now());
      return online;
    } catch (_e) {
      console.error("[Network] Connectivity check error:", _e);
      isOnlineRef.current = false;
      setIsOnline(false);
      return false;
    } finally {
      setIsChecking(false);
    }
  }, []);

  const appStateRef = useRef(AppState.currentState);

  useEffect(() => {
    checkConnectivity();

    const sub = AppState.addEventListener("change", (nextState: AppStateStatus) => {
      if (appStateRef.current.match(/inactive|background/) && nextState === "active") {
        checkConnectivity();
      }
      appStateRef.current = nextState;
    });

    return () => sub.remove();
  }, [checkConnectivity]);

  const dataValue = useMemo(() => ({
    isOnline,
    isChecking,
    lastCheckedAt,
  }), [isOnline, isChecking, lastCheckedAt]);

  const actionsValue = useMemo(() => ({
    checkConnectivity,
    checkHealth,
  }), [checkConnectivity]);

  return (
    <NetworkDataContext.Provider value={dataValue}>
      <NetworkActionsContext.Provider value={actionsValue}>
        {children}
      </NetworkActionsContext.Provider>
    </NetworkDataContext.Provider>
  );
}

export function useNetworkData(): NetworkData {
  const context = useContext(NetworkDataContext);
  if (!context) {
    throw new Error("useNetworkData must be used within a NetworkProvider");
  }
  return context;
}

export function useNetworkActions(): NetworkActions {
  const context = useContext(NetworkActionsContext);
  if (!context) {
    throw new Error("useNetworkActions must be used within a NetworkProvider");
  }
  return context;
}

export function useNetwork(): NetworkData & NetworkActions {
  return { ...useNetworkData(), ...useNetworkActions() };
}

export function useIsOnline() {
  const context = useContext(NetworkDataContext);
  return context?.isOnline ?? true;
}
