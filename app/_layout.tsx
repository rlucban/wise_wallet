import { Stack, useRouter, useSegments, useRootNavigationState } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { View, Text, Platform, StyleSheet } from "react-native";
import { initMasterDb, initDb } from "../utils/db";
import {
  resolveActivePlane,
  hasLegacyEntityKeys,
  enterApiOnlyMode,
  readReposSnapshot,
} from "../utils/apiOnly";
import { PaperProvider, Banner } from "react-native-paper";
import { ThemeProvider, useThemeData } from "../context/ThemeContext";
import { CurrencyProvider } from "../context/CurrencyContext";
import { TransactionsProvider } from "../context/TransactionsContext";
import { UserProfileProvider, useUserProfile, useUserProfileData } from "../context/UserProfileContext";
import { CategoriesProvider } from "../context/CategoriesContext";
import { LanguageProvider } from "../context/LanguageContext";
import { PasscodeProvider, usePasscode } from "../context/PasscodeContext";
import { AuthProvider, useAuthData, useAuthActions } from "../context/AuthContext";
import { SystemAlertsProvider, useSystemAlerts } from "../context/SystemAlertsContext";
import { ToastProvider } from "../context/ToastContext";
import { NetworkProvider, useNetwork, checkHealth } from "../context/NetworkContext";
import PasscodeScreen from "./passcode-screen";
import { DbRecoveryProvider } from "../context/DbRecoveryContext";
import { RepositoryProvider } from "../context/RepositoryContext";
import ProviderComposer from "../components/ProviderComposer";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { hardResetLocalData } from "../utils/db";
import { requestNotificationPermissions, scheduleDueNotifications } from "../utils/notifications";
import { useRepositories } from "../context/RepositoryContext";
import { useIsLocalAccount } from "../utils/authMode";
import { ApiOfflineBanner, ApiOfflineGateBody, useApiOnlyOffline } from "../components/ApiOfflineBanner";

function OfflineIndicator() {
  const { isOnline, checkConnectivity } = useNetwork();
  const { plane } = useApiOnlyOffline();
  const [showBanner, setShowBanner] = useState(true);

  useEffect(() => {
    if (!isOnline) {
      setShowBanner(true);
    }
  }, [isOnline]);

  // SPEC-34 CON-03 — API-only offline is covered by ApiOfflineBanner (its
  // generic "will sync automatically" copy would be wrong there).
  if (plane === "api-only") {
    return null;
  }

  if (isOnline || !showBanner) {
    return null;
  }

  return (
    <Banner
      visible={true}
      icon="cloud-off"
      style={styles.offlineBanner}
      actions={[
        {
          label: "Retry",
          onPress: () => {
            checkConnectivity();
          },
        },
      ]}>
      You're offline. Changes will sync automatically when you're back online.
    </Banner>
  );
}

const styles = StyleSheet.create({
  offlineBanner: {
    marginBottom: 0,
  },
});

function SystemResetManager() {
  const router = useRouter();
  const routerRef = useRef(router);
  routerRef.current = router;
  const { logout: _logout } = useAuthActions();
  const isLocal = useIsLocalAccount();

  useEffect(() => {
    if (isLocal) return;

    const checkReset = async () => {
      try {
        const { online, data } = await checkHealth();
        if (!online) return;

        const resetEpoch = data?.reset_epoch;
        if (typeof resetEpoch !== "number") return;

        const localEpochStr = await AsyncStorage.getItem("system_reset_epoch");
        const localEpoch = localEpochStr ? parseInt(localEpochStr) : null;

        if (localEpoch === null) {
          // New install, just save the current epoch
          await AsyncStorage.setItem("system_reset_epoch", resetEpoch.toString());
        } else if (resetEpoch > localEpoch) {
          // RESET TRIGGERED
          console.warn("SYSTEM RESET TRIGGERED BY SERVER");
          await hardResetLocalData();
          await AsyncStorage.setItem("system_reset_epoch", resetEpoch.toString());
          
          if (Platform.OS === 'web') {
            window.location.reload();
          } else {
            setTimeout(() => routerRef.current.replace("/login"), 0);
            alert("A system reset was requested. You have been logged out.");
          }
        }
      } catch (e) {
        console.error("Health check failed", e);
      }
    };

    checkReset();
  }, [isLocal]);

  return null;
}

function MainStack() {
  // SPEC-34 CON-03 — signed-in API-only sessions render the banner + gate
  // instead of data screens while offline. Auth routes stay reachable
  // (gate requires an active session).
  const { gated } = useApiOnlyOffline();

  if (gated) {
    return <ApiOfflineGateBody />;
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="intro" options={{ animation: "fade" }} />
      <Stack.Screen name="login" options={{ animation: "fade" }} />
      <Stack.Screen name="register" options={{ animation: "fade" }} />
      <Stack.Screen name="onboarding" options={{ animation: "fade" }} />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="add-transaction" options={{ presentation: "modal" }} />
      <Stack.Screen name="edit-transaction" options={{ presentation: "modal" }} />
      <Stack.Screen name="transaction-details" options={{ title: "Details" }} />
      <Stack.Screen name="calendar" />
      <Stack.Screen name="savings" />
      <Stack.Screen name="payment-methods" options={{ animation: "slide_from_right" }} />
    </Stack>
  );
}

function MainLayout() {
  const { theme } = useThemeData();
  const { isPasscodeEnabled, isUnlocked } = usePasscode();
  const { activeUserId, isLoading: authLoading, authFailureReason, failedUserId } = useAuthData();
  const { clearAuthFailureReason, clearFailedUserId } = useAuthActions();
  const { profile, isLoading: profileLoading } = useUserProfile();
  const { addSessionAlert } = useSystemAlerts();
  const segments = useSegments();
  const router = useRouter();
  const navigationState = useRootNavigationState();

  useEffect(() => {
    if (authLoading || profileLoading || !navigationState?.key) return;

    if (!activeUserId) {
      const reason = authFailureReason;
      if (reason) {
        // SPEC-38 D-04 — only a genuine revocation earns the SPEC-05 "Session
        // Ended" alert. Expiry / invalid / unknown are reported honestly on
        // /login via an optional param instead of asserting a kick.
        const showNotice = reason === 'token_expired' || reason === 'token_invalid';
        const settle = () => {
          clearAuthFailureReason();
          clearFailedUserId();
          console.info(`[Nav] Auth failure (${reason}) — redirecting to Login`);
          setTimeout(() => {
            if (showNotice) {
              router.replace(`/login?reason=${reason}` as '/login');
            } else {
              router.replace('/login');
            }
          }, 0);
        };
        if (reason === 'session_revoked' && failedUserId) {
          addSessionAlert(failedUserId).then(settle);
        } else {
          settle();
        }
        return;
      }

      const inAuthGroup = segments[0] === 'login' || segments[0] === 'register';
      const inIntro = segments[0] === 'intro';
      const inOnboarding = segments[0] === 'onboarding';

      if (inIntro || inOnboarding || !inAuthGroup) {
        console.info("[Nav] Redirecting to Login");
        setTimeout(() => router.replace('/login'), 0);
      }
    } else if (activeUserId) {
      const inAuthGroup = segments[0] === 'login' || segments[0] === 'register';
      const inIntro = segments[0] === 'intro';
      const inOnboarding = segments[0] === 'onboarding';

      console.info(`[Nav] State -> User: ${activeUserId}, FirstRun: ${profile?.isFirstRun}, Path: /${segments.join('/')}`);

      if (profile?.isFirstRun) {
        if (!inIntro && !inOnboarding) {
          console.info("[Nav] Redirecting to Intro");
          setTimeout(() => router.replace('/intro'), 0);
        }
      } else if (!profile?.isFirstRun && (inAuthGroup || inIntro || inOnboarding)) {
        console.info("[Nav] Redirecting to Dashboard");
        setTimeout(() => router.replace('/'), 0);
      }
    }
  }, [activeUserId, authFailureReason, failedUserId, authLoading, profileLoading, profile, segments, navigationState?.key, router, addSessionAlert, clearAuthFailureReason, clearFailedUserId]);

  if (isPasscodeEnabled && !isUnlocked) {
      return <PasscodeScreen />;
  }

  return (
    <PaperProvider theme={theme}>
      <NetworkProvider>
        <View style={{ flex: 1 }}>
          <OfflineIndicator />
          <ApiOfflineBanner />
          <MainStack />
        </View>
      </NetworkProvider>
    </PaperProvider>
  );
}

export function AuthLoader({ children }: { children: React.ReactNode }) {
  const { activeUserId, isLoading } = useAuthData();
  const _segments = useSegments();
  const _router = useRouter();
  const [dbLoading, setDbLoading] = useState(false);
  const [dbInitializedFor, setDbInitializedFor] = useState<string | null>(null);
  const repos = useRepositories();
  const isLocal = useIsLocalAccount();
  const { profile } = useUserProfileData();

  // 1. Handle DB Initialization
  useEffect(() => {
    if (isLoading) return;

    if (activeUserId) {
        (async () => {
          try {
            // SPEC-34 CON-02/CON-04 — API-only sessions skip seeding; a
            // pre-existing legacy cache migrates (fetch → push → purge) once.
            // The guard key includes the plane: profile arrival may resolve it
            // differently (e.g. server-side OFF), and seeding MUST still run.
            const plane = await resolveActivePlane({
              platformOs: Platform.OS,
              isLocal,
              profileAutoBackup: profile?.autoBackup,
            });
            const initKey = `${activeUserId}|${plane}`;
            if (initKey === dbInitializedFor) return;
            setDbLoading(true);
            if (plane === "api-only") {
              setDbInitializedFor(initKey);
              if (await hasLegacyEntityKeys(activeUserId)) {
                enterApiOnlyMode({
                  userId: activeUserId,
                  readLocalSnapshot: () => readReposSnapshot(repos),
                }).catch((e: unknown) => {
                  console.error("API-only entry migration failed:", e);
                });
              }
            } else {
              await initDb(activeUserId);
              setDbInitializedFor(initKey);
            }
          } catch (e: unknown) {
            console.error("User DB Init Error", e);
          } finally {
            setDbLoading(false);
          }
        })();
    } else if (!activeUserId) {
        setDbInitializedFor(null);
    }
  }, [activeUserId, isLoading, dbInitializedFor, isLocal, profile?.autoBackup, repos]);

  useEffect(() => {
    if (!activeUserId) return;
    requestNotificationPermissions()
      .then((granted) => {
        if (granted) {
          return repos.dues.getAll().then((dues) => {
            return scheduleDueNotifications(dues);
          });
        }
      })
      .catch((e) => {
        console.warn("Notification setup failed:", e);
      });
  }, [activeUserId, repos]);

  // 2. Handle Navigation handled in MainLayout to avoid race-condition with Stack registration 
  
  if (isLoading || dbLoading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <Text>{isLoading ? "Checking Accounts..." : "Preparing Database..."}</Text>
      </View>
    );
  }

  return <>{children}</>;
}

export default function RootLayout() {
  const [dbReady, setDbReady] = useState(false);

  useEffect(() => {
    initMasterDb()
      .then(() => setDbReady(true))
      .catch((e: unknown) => console.error("DB init Error", e));
  }, []);

  if (!dbReady) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <Text>Loading WiseWallet...</Text>
      </View>
    );
  }

  return (
    <DbRecoveryProvider>
      <RepositoryProvider>
        <AuthProvider>
          <UserProfileProvider>
            <SystemResetManager />
              <ProviderComposer
                providers={[
                  ThemeProvider,
                  LanguageProvider,
                  PasscodeProvider,
                  CurrencyProvider,
                  SystemAlertsProvider,
                  ToastProvider,
                ]}
              >
              <AuthLoader>
                <ProviderComposer providers={[CategoriesProvider, TransactionsProvider]}>
                  <MainLayout />
                </ProviderComposer>
              </AuthLoader>
            </ProviderComposer>
          </UserProfileProvider>
        </AuthProvider>
      </RepositoryProvider>
    </DbRecoveryProvider>
  );
}
