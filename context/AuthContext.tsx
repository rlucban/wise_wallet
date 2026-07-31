import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback, useMemo } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { setAuthFailureCallback } from "../utils/apiClient";
import { setCachedUserId } from "../utils/cache";
import { setSecureItem, getSecureItem, removeSecureItem } from "../utils/secureStorage";

interface AuthData {
  activeUserId: string | null;
  token: string | null;
  isLoading: boolean;
}

interface AuthActions {
  login: (userId: string, token: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthDataContext = createContext<AuthData | undefined>(undefined);
const AuthActionsContext = createContext<AuthActions | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [activeUserId, setActiveUserId] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

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

  const handleAuthFailure = useCallback(() => {
    setActiveUserId(null);
    setToken(null);
  }, []);

  useEffect(() => {
    setAuthFailureCallback(handleAuthFailure);
    return () => setAuthFailureCallback(() => {});
  }, [handleAuthFailure]);

  const login = useCallback(async (userId: string, token: string) => {
    await setSecureItem('authToken', token);
    await AsyncStorage.setItem('activeUserId', String(userId));
    setActiveUserId(String(userId));
    setCachedUserId(String(userId));
    setToken(token);
  }, []);

  const logout = useCallback(async () => {
    await AsyncStorage.removeItem('activeUserId');
    await removeSecureItem('authToken');
    setActiveUserId(null);
    setCachedUserId(null);
    setToken(null);
  }, []);

  const dataValue = useMemo(() => ({
    activeUserId,
    token,
    isLoading,
  }), [activeUserId, token, isLoading]);

  const actionsValue = useMemo(() => ({
    login,
    logout,
  }), [login, logout]);

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
