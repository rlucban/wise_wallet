import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback, useMemo } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { setAuthFailureCallback, authFetch } from "../utils/apiClient";
import { setCachedUserId, clearSessionCaches } from "../utils/cache";
import { setSecureItem, getSecureItem, removeSecureItem } from "../utils/secureStorage";
import { resolveModeState } from "../utils/modeState";

interface AuthData {
  activeUserId: string | null;
  token: string | null;
  isLoading: boolean;
  authFailureReason: string | null;
  failedUserId: string | null;
}

interface AuthActions {
  login: (userId: string, token: string) => Promise<void>;
  logout: () => Promise<void>;
  clearAuthFailureReason: () => void;
  clearFailedUserId: () => void;
}

const AuthDataContext = createContext<AuthData | undefined>(undefined);
const AuthActionsContext = createContext<AuthActions | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [activeUserId, setActiveUserId] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [authFailureReason, setAuthFailureReason] = useState<string | null>(null);
  const [failedUserId, setFailedUserId] = useState<string | null>(null);

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
    // SPEC-31 D-02 — session-kill reuses logout hygiene: no cached id or
    // settings may leak into the next session.
    clearSessionCaches();
    if (reason) setAuthFailureReason(reason);
  }, [activeUserId]);

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
    // SPEC-38 D-03 (CON-06) — capture the token BEFORE it is cleared so the
    // server can be told to revoke. Local/offline tokens are skipped entirely:
    // they are not real sessions and must make zero network calls (CON-09).
    const token = await getSecureItem('authToken');
    const isLocalToken = token ? resolveModeState({ token }).isLocal : false;

    await AsyncStorage.removeItem('activeUserId');
    await removeSecureItem('authToken');
    setActiveUserId(null);
    // SPEC-31 CON-03 — session hygiene; stored per-user data is untouched.
    clearSessionCaches();
    setToken(null);

    if (!token || isLocalToken) return;
    // Best-effort: local logout is already complete, so any failure here is
    // swallowed. suppressAuthFailure keeps a 401 from re-entering the
    // session-kill path, and the explicit header carries the token that
    // secureStorage no longer has.
    try {
      await authFetch('auth/logout', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        suppressAuthFailure: true,
      });
    } catch {
      // ignored on purpose
    }
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
  }), [activeUserId, token, isLoading, authFailureReason, failedUserId]);

  const actionsValue = useMemo(() => ({
    login,
    logout,
    clearAuthFailureReason,
    clearFailedUserId,
  }), [login, logout, clearAuthFailureReason, clearFailedUserId]);

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
