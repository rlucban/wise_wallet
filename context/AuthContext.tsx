import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback, useMemo } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { resetAuthSessionWarningLatch, setAuthFailureCallback, wipeGetCache } from "../utils/apiClient";
import { setCachedUserId } from "../utils/cache";
import { setSecureItem, getSecureItem, removeSecureItem } from "../utils/secureStorage";

import { PendingLoginRequest } from "../types";
import { getPendingLogin, clearPendingLogin, approvePendingLogin, rejectPendingLogin } from "../utils/isSameDeviceSession";

interface AuthData {
  activeUserId: string | null;
  token: string | null;
  isLoading: boolean;
  authFailureReason: string | null;
  failedUserId: string | null;
  pendingLogin: PendingLoginRequest | null;
}

interface AuthActions {
  login: (userId: string, token: string) => Promise<void>;
  logout: () => Promise<void>;
  switchIdentity: (userId: string, token: string) => Promise<void>;
  clearAuthFailureReason: () => void;
  clearFailedUserId: () => void;
  approveLogin: () => Promise<void>;
  rejectLogin: () => Promise<void>;
  checkPendingLogin: () => Promise<void>;
}

const AuthDataContext = createContext<AuthData | undefined>(undefined);
const AuthActionsContext = createContext<AuthActions | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [activeUserId, setActiveUserId] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [authFailureReason, setAuthFailureReason] = useState<string | null>(null);
  const [failedUserId, setFailedUserId] = useState<string | null>(null);
  const [pendingLogin, setPendingLoginState] = useState<PendingLoginRequest | null>(null);

  const checkPendingLogin = useCallback(async () => {
    if (activeUserId) {
      const req = await getPendingLogin(activeUserId, token);
      if (req && req.status === "pending") {
        setPendingLoginState(req);
      } else if (!req || req.status !== "pending") {
        setPendingLoginState(null);
      }
    } else {
      setPendingLoginState(null);
    }
  }, [activeUserId, token]);

  useEffect(() => {
    checkPendingLogin();
    if (!activeUserId) return;
    const interval = setInterval(() => {
      checkPendingLogin();
    }, 2000);
    return () => clearInterval(interval);
  }, [activeUserId, checkPendingLogin]);

  useEffect(() => {
    Promise.all([
      AsyncStorage.getItem('activeUserId'),
      getSecureItem('authToken')
    ]).then(([id, t]) => {
      if (id) {
        setActiveUserId(id);
        setCachedUserId(id);
      }
      if (t) setToken(t);
      setIsLoading(false);
    });
  }, []);

  const handleAuthFailure = useCallback((reason?: string) => {
    if (activeUserId) setFailedUserId(activeUserId);
    setActiveUserId(null);
    setToken(null);
    setPendingLoginState(null);
    if (reason) setAuthFailureReason(reason);
  }, [activeUserId]);

  useEffect(() => {
    setAuthFailureCallback(handleAuthFailure);
    return () => setAuthFailureCallback(() => {});
  }, [handleAuthFailure]);

  const login = useCallback(async (userId: string, token: string) => {
    await setSecureItem('authToken', token);
    await AsyncStorage.setItem('activeUserId', String(userId));
    await AsyncStorage.setItem('lastActiveUserId', String(userId));
    setActiveUserId(String(userId));
    setCachedUserId(String(userId));
    setToken(token);
    resetAuthSessionWarningLatch();
    wipeGetCache(); // SPEC-62 DEC-62-04: never serve rows across sessions.
    await clearPendingLogin(String(userId));
    setPendingLoginState(null);
  }, []);

  const logout = useCallback(async () => {
    if (activeUserId) {
      await clearPendingLogin(activeUserId);
    }
    await AsyncStorage.removeItem('activeUserId');
    await removeSecureItem('authToken');
    setActiveUserId(null);
    setCachedUserId(null);
    setToken(null);
    setPendingLoginState(null);
    resetAuthSessionWarningLatch();
    wipeGetCache(); // SPEC-62 DEC-62-04: never serve rows across sessions.
  }, [activeUserId]);

  const approveLogin = useCallback(async () => {
    if (activeUserId) {
      await approvePendingLogin(activeUserId, token);
      // Device 1 explicitly allowed device 2 to take over this session,
      // so log out this device before device 2 completes its login.
      await logout();
    }
  }, [activeUserId, token, logout]);

  const rejectLogin = useCallback(async () => {
    if (activeUserId) {
      await rejectPendingLogin(activeUserId, token);
      setPendingLoginState(null);
    }
  }, [activeUserId, token]);

  // SPEC-96: null-free identity transition for the Make-Online migration.
  // Same stored outcome as logout()+login() with no intermediate signed-out
  // state, so the nav guard never fires and zero navigation occurs.
  const switchIdentity = useCallback(async (userId: string, token: string) => {
    await setSecureItem('authToken', token);
    await AsyncStorage.setItem('activeUserId', String(userId));
    await AsyncStorage.setItem('lastActiveUserId', String(userId));
    setActiveUserId(String(userId));
    setCachedUserId(String(userId));
    setToken(token);
    resetAuthSessionWarningLatch();
    wipeGetCache(); // SPEC-62 DEC-62-04: never serve rows across sessions.
  }, []);

  const clearAuthFailureReason = useCallback(() => {
    setAuthFailureReason(null);
  }, []);

  const clearFailedUserId = useCallback(() => {
    setFailedUserId(null);
  }, []);

  const dataValue = useMemo(() => ({
    activeUserId,
    token,
    isLoading,
    authFailureReason,
    failedUserId,
    pendingLogin,
  }), [activeUserId, token, isLoading, authFailureReason, failedUserId, pendingLogin]);

  const actionsValue = useMemo(() => ({
    login,
    logout,
    switchIdentity,
    clearAuthFailureReason,
    clearFailedUserId,
    approveLogin,
    rejectLogin,
    checkPendingLogin,
  }), [login, logout, switchIdentity, clearAuthFailureReason, clearFailedUserId, approveLogin, rejectLogin, checkPendingLogin]);

  return (
    <AuthDataContext.Provider value={dataValue}>
      <AuthActionsContext.Provider value={actionsValue}>
        {children}
      </AuthActionsContext.Provider>
    </AuthDataContext.Provider>
  );
}

export function useAuthData(): AuthData {
  const context = useContext(AuthDataContext);
  if (!context) throw new Error("useAuthData must be used within an AuthProvider");
  return context;
}

export function useAuthActions(): AuthActions {
  const context = useContext(AuthActionsContext);
  if (!context) throw new Error("useAuthActions must be used within an AuthProvider");
  return context;
}

export function useAuth(): AuthData & AuthActions {
  return { ...useAuthData(), ...useAuthActions() };
}
