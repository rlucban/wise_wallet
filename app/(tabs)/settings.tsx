import { useState, useRef, useEffect } from "react";
import { View, ScrollView, Platform, StyleSheet } from "react-native";
import { Appbar, List, Text, Card, Switch, Divider, Button, Avatar, Portal, Dialog, TextInput, Checkbox, useTheme as usePaperTheme, IconButton } from "react-native-paper";
import { useRouter } from "expo-router";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import * as DocumentPicker from "expo-document-picker";
import { useRepositories } from "../../context/RepositoryContext";
import { setSetting, clearAllLocalData, exportData, importData, API_URL, addUser, saveUserProfile, initDb, getUsers } from "../../utils/db";
import { purgeUserDeviceData, resolveDeleteOutcome } from "../../utils/accountDelete";
import { useAuth } from "../../context/AuthContext";
import { useAppTheme } from "../../context/ThemeContext";
import { useUserProfile } from "../../context/UserProfileContext";
import { usePasscode } from "../../context/PasscodeContext";
import { useTransactionsActions, useTransactionsData } from "../../context/TransactionsContext";
import { countOrphanTransactions, getLastServerTxIds, truncateUserId } from "../../utils/transactionSync";
import { useCategoriesActions, useCategoriesData } from "../../context/CategoriesContext";
import { useDues } from "../../hooks/useDues";
import { useSavings } from "../../hooks/useSavings";
import {
  enterApiOnlyMode,
  readReposSnapshot,
  fetchServerSnapshot,
  ensureCloudProfile,
} from "../../utils/apiOnly";
import { authFetch } from "../../utils/apiClient";
import { useSyncStatus } from "../../hooks/useSyncStatus";
import { useNetwork } from "../../context/NetworkContext";
import { useIsLocalAccount } from "../../utils/authMode";
import {
  getDeviceOnline,
  isReregistrationAllowed,
  buildCloudRegisterPayload,
  buildAuthLoginPayload,
  classifyAuthLoginResult,
  findAuthUserRow,
  getOrCreateDeviceId,
  isValidReregistrationEmail,
  isValidReregistrationPin,
  REREGISTER_CONNECT_MESSAGE,
  REREGISTER_HONESTY_TITLE,
  REREGISTER_HONESTY_MESSAGE,
  REREGISTER_EXPORT_TITLE,
  REREGISTER_EXPORT_MESSAGE,
  REREGISTER_FORM_TITLE,
  REREGISTER_SUCCESS_TITLE,
  REREGISTER_SUCCESS_MESSAGE,
} from "../../utils/localGate";
import * as Crypto from 'expo-crypto';
import ConfirmDialog from "../../components/ConfirmDialog";
import { KeyboardAwareDialog } from "../../components/KeyboardAwareDialog";

function SyncStatusCard({ autoBackup, isLocal }: { autoBackup: boolean; isLocal: boolean }) {
  const { isOnline, checkConnectivity, isChecking } = useNetwork();
  const { pending, failed, deadLetters, lastSyncedAt, refresh: retryAll } = useSyncStatus();
  const { activeUserId } = useAuth();
  const { transactions } = useTransactionsData();
  const paperTheme = usePaperTheme();

  // SPEC-34 CON-08 — API-only mode shows live state (no queue counts, no
  // upload timestamp); OFF/Local cards keep today's copy.
  const apiOnly = !isLocal && (Platform.OS === "web" || autoBackup);

  // SPEC-27 D-01/D-08 — per-device diagnostics + OFF orphan count (zero network).
  const [orphanCount, setOrphanCount] = useState(0);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (isLocal || apiOnly || !activeUserId) {
        if (!cancelled) setOrphanCount(0);
        return;
      }
      const lastServerIds = await getLastServerTxIds(activeUserId);
      if (!cancelled) {
        setOrphanCount(countOrphanTransactions(
          transactions.map((t) => String(t.id)),
          lastServerIds
        ));
      }
    })();
    return () => { cancelled = true; };
  }, [isLocal, apiOnly, activeUserId, transactions]);

  const diagnostics = isLocal
    ? `ID ${truncateUserId(activeUserId)} · Stored on this device`
    : apiOnly
    ? `ID ${truncateUserId(activeUserId)} · Live`
    : `ID ${truncateUserId(activeUserId)} · Backup ${autoBackup ? "on" : "off"} · ${pending} pending · ${failed} failed${deadLetters > 0 ? ` · ${deadLetters} unsendable` : ""}`;

  const getStatusColor = () => {
    if (isLocal) return { icon: "cellphone-off", text: "Local-only", color: paperTheme.colors.outline };
    if (apiOnly) {
      if (isChecking) return { icon: "cloud-sync", text: "Checking...", color: paperTheme.colors.primary };
      if (!isOnline) return { icon: "cloud-off", text: "Offline", color: paperTheme.colors.error };
      return { icon: "cloud-check", text: "Live", color: paperTheme.colors.secondary };
    }
    if (!autoBackup) return { icon: "cloud-off-outline", text: "Sync off", color: paperTheme.colors.outline };
    if (isChecking) return { icon: "cloud-sync", text: "Checking...", color: paperTheme.colors.primary };
    if (!isOnline) return { icon: "cloud-off", text: "Offline", color: paperTheme.colors.error };
    if (pending > 0) return { icon: "upload", text: `${pending} pending`, color: paperTheme.colors.tertiary };
    return { icon: "cloud-check", text: "All synced", color: paperTheme.colors.secondary };
  };

  const status = getStatusColor();

  const formatLastSync = () => {
    if (!lastSyncedAt) return "Never";
    const date = new Date(lastSyncedAt);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ' ' + date.toLocaleDateString();
  };

  return (
    <View style={[
      styles.syncCard,
      {
        backgroundColor: isLocal
          ? paperTheme.colors.surfaceVariant
          : !autoBackup
          ? paperTheme.colors.surfaceVariant
          : !isOnline
          ? paperTheme.colors.errorContainer
          : pending > 0
          ? paperTheme.colors.tertiaryContainer
          : paperTheme.colors.secondaryContainer
      }
    ]}>
      <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
        <IconButton
          icon={status.icon}
          iconColor={status.color}
          size={24}
          style={{ margin: 0 }}
        />
        <View>
          <Text variant="titleSmall" style={{ color: status.color, fontWeight: '600' }}>
            {status.text}
          </Text>
          <Text variant="bodySmall" style={{ color: paperTheme.colors.onSurfaceVariant }}>
            {isLocal ? "Data stored on device" : apiOnly ? "Live from cloud" : `Last sync: ${formatLastSync()}`}
          </Text>
          <Text variant="bodySmall" style={{ color: paperTheme.colors.onSurfaceVariant }}>
            {diagnostics}
          </Text>
          {!isLocal && !apiOnly && !autoBackup && orphanCount > 0 && (
            <Text variant="bodySmall" style={{ color: paperTheme.colors.onSurfaceVariant }}>
              {`${orphanCount} local-only change(s) on this device — not on other devices`}
            </Text>
          )}
        </View>
      </View>
      {apiOnly || !autoBackup || isLocal ? null : pending > 0 && isOnline ? (
        <Button
          mode="text"
          compact
          icon="sync"
          onPress={retryAll}
          loading={isChecking}
        >
          Retry
        </Button>
      ) : !isOnline ? (
        <Button
          mode="text"
          compact
          icon="refresh"
          onPress={() => checkConnectivity()}
          loading={isChecking}
        >
          Check
        </Button>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  syncCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 8,
    borderRadius: 8,
    marginBottom: 16,
  }
});

export default function SettingsScreen() {
  const router = useRouter();
  const paperTheme = usePaperTheme();
  const { isDarkMode, toggleTheme } = useAppTheme();
  const { profile, updateProfile, resetProfileToDefaults, refetch: refetchProfile } = useUserProfile();
  const { isPasscodeEnabled, passcode, setIsPasscodeEnabled, setPasscode } = usePasscode();
  const { activeUserId, logout, login } = useAuth();
  const { refetch: refetchTx } = useTransactionsActions();
  const { transactions: liveTransactions } = useTransactionsData();
  const { refetch: refetchCats } = useCategoriesActions();
  const { categories: liveCategories } = useCategoriesData();
  const { dues: liveDues, refetch: refetchDues } = useDues();
  const { items: liveSavings, refetch: refetchSavings } = useSavings();
  const repos = useRepositories();
  const isLocal = useIsLocalAccount();

  const handleLogout = async () => {
    await logout();
    router.replace("/login");
  };

  const closeChangePasscodeDialog = () => {
    setShowChangePasscodeDialog(false);
    setCurrentPasscodeInput("");
    setNewPasscodeInput("");
    setConfirmPasscodeInput("");
    setChangePasscodeError("");
    setPinStep(1);
    setPinError(null);
  };

  const handleChangePasscode = () => {
    const current = currentPasscodeInput.trim();
    const next = newPasscodeInput.trim();
    const confirm = confirmPasscodeInput.trim();

    if (passcode && (!/^\d{4}$/.test(current) || current !== passcode)) {
      setChangePasscodeError("Incorrect current PIN.");
      return;
    }
    if (!/^\d{4}$/.test(next)) {
      setChangePasscodeError("New PIN must be 4 digits.");
      return;
    }
    if (passcode && next === current) {
      setChangePasscodeError("New PIN must be different from current PIN.");
      return;
    }
    if (next !== confirm) {
      setChangePasscodeError("New PINs do not match.");
      return;
    }

    const isNewSetup = !passcode;
    setPasscode(next);
    if (isNewSetup) setIsPasscodeEnabled(true);
    closeChangePasscodeDialog();
    setMessageDialog({
      visible: true,
      type: "success",
      title: isNewSetup ? "Passcode Set" : "Passcode Changed",
      message: isNewSetup
        ? "Your passcode has been set successfully."
        : "Your passcode has been updated successfully.",
    });
  };





   const isValidEmail = (str: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(str);
   const isUsernameOnly = profile?.name && !isValidEmail(profile.name);
   const autoBackup = isUsernameOnly || isLocal ? false : profile?.autoBackup ?? true;
   const isEffectivelyLocal = isLocal || !!isUsernameOnly;
  const [isSyncing, setIsSyncing] = useState(false);
  const [showPinPrompt, setShowPinPrompt] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showPinVerificationDialog, setShowPinVerificationDialog] = useState(false);
  const [pinVerificationInput, setPinVerificationInput] = useState("");
  const [verificationError, setVerificationError] = useState("");
  const [showNewAccountDialog, setShowNewAccountDialog] = useState(false);
  const [showSyncExplainDialog, setShowSyncExplainDialog] = useState(false);
  // SPEC-30 D-03 — re-registration promotion (Local -> NEW Cloud identity).
  const [showReregisterHonesty, setShowReregisterHonesty] = useState(false);
  const [showReregisterExport, setShowReregisterExport] = useState(false);
  const [showReregisterForm, setShowReregisterForm] = useState(false);
  const [regEmail, setRegEmail] = useState("");
  const [regPin, setRegPin] = useState("");
  const [regError, setRegError] = useState("");
  const [pinInput, setPinInput] = useState("");
  const [showChangePasscodeDialog, setShowChangePasscodeDialog] = useState(false);
  const [currentPasscodeInput, setCurrentPasscodeInput] = useState("");
  const [newPasscodeInput, setNewPasscodeInput] = useState("");
  const [confirmPasscodeInput, setConfirmPasscodeInput] = useState("");
  const [changePasscodeError, setChangePasscodeError] = useState("");
  const [pinStep, setPinStep] = useState(1);
  const [pinError, setPinError] = useState<string | null>(null);
  const [deletePinInput, setDeletePinInput] = useState("");
  const [deletePinError, setDeletePinError] = useState("");
  const [pinVerified, setPinVerified] = useState(false);
  const [deleteConfirmed, setDeleteConfirmed] = useState(false);
  const [messageDialog, setMessageDialog] = useState<{
    visible: boolean;
    type: "success" | "error";
    title: string;
    message: string;
    onClose?: () => void;
  }>({ visible: false, type: "success", title: "", message: "" });
  const [showRestoreConfirm, setShowRestoreConfirm] = useState(false);

  // Web-only ref for hidden file input
  const fileInputRef = useRef<HTMLInputElement>(null);

   const setAutoBackup = async (value: boolean) => {
     await updateProfile({ autoBackup: value });
     // SPEC-34: the autoBackup flag is mode config, not entity data — the
     // settings-key write stays even in API-only mode (drives OFF reloads).
     await setSetting('autoBackup', value.toString());
   };

   // SPEC-30 D-03/CON-05 — Local promotion entry. Offline: notice only,
   // zero fetch + zero settings writes. Online: honesty dialog.
   const startReregisterFlow = async () => {
     if (!isReregistrationAllowed(getDeviceOnline())) {
       showMessage("error", "No Connection", REREGISTER_CONNECT_MESSAGE);
       return;
     }
     setRegEmail("");
     setRegPin("");
     setRegError("");
     setShowReregisterHonesty(true);
   };

   // SPEC-30 D-03/CON-03 — fresh cloud registration. MUST NOT merge, move,
   // or delete the old Local rows; the old UUID stays reachable via logout.
   const completeReregistration = async () => {
     const email = regEmail.trim();
     const pin = regPin.trim();
     if (!isValidReregistrationEmail(email)) {
       setRegError("Please enter a valid email address");
       return;
     }
     if (!isValidReregistrationPin(pin)) {
       setRegError("PIN must be exactly 4 digits");
       return;
     }
     if (!API_URL) {
       setRegError(REREGISTER_CONNECT_MESSAGE);
       return;
     }
     if (!isReregistrationAllowed(getDeviceOnline())) {
       setRegError(REREGISTER_CONNECT_MESSAGE);
       return;
     }
     setIsSyncing(true);
     setRegError("");
     try {
       const response = await fetch(`${API_URL}/auth/register`, {
         method: "POST",
         headers: { "Content-Type": "application/json" },
         body: JSON.stringify(buildCloudRegisterPayload(email, pin)),
       });
       const responseData = (await response.json().catch(() => null)) as {
         message?: string;
         data?: { user?: { id?: unknown }; token?: unknown };
       } | null;
       if (!response.ok) {
         const msg = responseData?.message || "Email is not available.";
         setRegError(msg);
         return;
       }
       const newUserId = String(responseData?.data?.user?.id ?? "");
       const newToken = String(responseData?.data?.token ?? "");
       if (!newUserId || !newToken) {
         setRegError("Registration succeeded but the server response was invalid.");
         return;
       }
       // New identity only: old Local keys are never read-modified-written
       // here, never POSTed, never deleted.
       await addUser(newUserId, email, pin);
       await saveUserProfile(
         { name: email, isFirstRun: false, initialBalance: 0, autoBackup: true },
         newUserId
       );
       await initDb(newUserId);
       await login(newUserId, newToken);
       await setAutoBackup(true);
       await Promise.all([
         refetchTx(),
         refetchCats(),
         refetchProfile()
       ]);
       setShowReregisterForm(false);
       setRegEmail("");
       setRegPin("");
       showMessage("success", REREGISTER_SUCCESS_TITLE, REREGISTER_SUCCESS_MESSAGE);
     } catch (e) {
       console.error("Re-registration failed:", e);
       setRegError("Cannot reach server. Check your connection.");
     } finally {
       setIsSyncing(false);
     }
   };

    const handleToggleAutoBackup = async (val: boolean) => {
      // SPEC-30 CON-03/CON-04 — Local ON routes to the single re-registration
      // flow ("Register Online Account"). Cloud ON keeps the PIN verify flow.
      if (isEffectivelyLocal) {
        if (val) {
          await startReregisterFlow();
        }
        return;
      }
      if (val) {
        setVerificationError("");
        setPinVerificationInput("");
        setShowPinVerificationDialog(true);
      } else {
        await disableAutoBackupWithSeed();
      }
    };

    // SPEC-34 CON-06 — ON→OFF seeds the frozen offline log from a verified
    // snapshot (mobile, online). Web has no OFF persistence: profile flag
    // only. Fetch failure → stay ON with a notice, no state change.
    const disableAutoBackupWithSeed = async () => {
      if (Platform.OS === "web" || !activeUserId) {
        await updateProfile({ autoBackup: false });
        return;
      }
      if (!getDeviceOnline()) {
        showMessage("error", "No Connection", "Connect to the internet to turn auto-backup OFF with your latest data.");
        return;
      }
      setIsSyncing(true);
      try {
        const snapshot = await fetchServerSnapshot(activeUserId);
        if (!snapshot) {
          showMessage("error", "Couldn't Reach Server", "Your data was not downloaded. Staying ON — try again when online.");
          return;
        }
        await repos.transactions.upsertBulk(snapshot.transactions as never[]);
        await repos.categories.upsertBulk(snapshot.categories as never[]);
        await repos.dues.upsertBulk(snapshot.dues as never[]);
        await repos.savingsItems.upsertBulk(snapshot.savingsItems as never[]);
        if (snapshot.profile) {
          await saveUserProfile(
            { ...(snapshot.profile as object), autoBackup: false } as never,
            activeUserId
          );
        }
        await setAutoBackup(false);
        await Promise.all([refetchTx(), refetchCats(), refetchProfile()]);
        showMessage("success", "Auto-Backup Off", "Your latest cloud data is now stored on this device for offline use.");
      } catch (e) {
        console.error("Disable auto-backup failed:", e);
        showMessage("error", "Couldn't Reach Server", "Staying ON — try again when online.");
      } finally {
        setIsSyncing(false);
      }
    };

    const verifyPinForSync = async () => {
      if (!pinVerificationInput.trim()) {
        setVerificationError("PIN is required");
        return;
      }
      setIsSyncing(true);
      setVerificationError("");
      try {
        // SPEC-31 CON-05 — same deviceId scheme as login; a session conflict
        // is reported explicitly, never as a wrong PIN.
        const deviceId = await getOrCreateDeviceId();
        const response = await fetch(`${API_URL}/auth/login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(buildAuthLoginPayload({
            name: profile?.name || "",
            passcode: pinVerificationInput.trim(),
            deviceId,
            force: true,
          })),
        });
        const outcome = classifyAuthLoginResult({
          ok: response.ok,
          status: response.status,
          body: await response.json().catch(() => null),
        });

        if (outcome.outcome === "authenticated") {
          setShowPinVerificationDialog(false);
          setPinVerificationInput("");
          await login(outcome.userId, outcome.token);
          // SPEC-34 CON-05 — explain fetch-then-push before migrating.
          setShowSyncExplainDialog(true);
        } else if (outcome.outcome === "conflict") {
          setShowPinVerificationDialog(false);
          setPinVerificationInput("");
          showMessage("error", "Session Active", "This account is already logged in on another device. Log in again to move the session here, then retry.");
        } else {
          setShowPinVerificationDialog(false);
          setPinVerificationInput("");
          setShowNewAccountDialog(true);
        }
      } catch (e) {
        console.error("PIN verification failed:", e);
        setVerificationError("Cannot reach server. Check your connection.");
      } finally {
        setIsSyncing(false);
      }
    };

   // SPEC-34 CON-04/CON-05 — OFF→ON runs PIN verify → explanation dialog →
   // fetch-then-push migration (confirmSyncEnable). The old merge/conflict
   // path is retired for this flow (CON-09 scoping).
   const confirmSyncEnable = async () => {
     if (!activeUserId) return;
     setShowSyncExplainDialog(false);
     setIsSyncing(true);
     try {
       const result = await enterApiOnlyMode({
         userId: activeUserId,
         readLocalSnapshot: () => readReposSnapshot(repos),
       });
       if (!result.ok) {
         showMessage("error", "Couldn't Sync", "Your data was not changed. Check your connection and try again.");
         return;
       }
       await setAutoBackup(true);
       await Promise.all([
         refetchTx(),
         refetchCats(),
         refetchDues(),
         refetchSavings(),
         refetchProfile()
       ]);
       showMessage("success", "Auto-Backup On", "Your data is now live from the cloud on all your devices.");
     } catch (e) {
       console.error("Sync enable failed:", e);
       showMessage("error", "Couldn't Sync", "Your data was not changed. Check your connection and try again.");
     } finally {
       setIsSyncing(false);
     }
   };

   const createNewAccountAndMigrate = async () => {
     setIsSyncing(true);
     setShowNewAccountDialog(false);
     try {
       const response = await fetch(`${API_URL}/auth/register`, {
         method: "POST",
         headers: { "Content-Type": "application/json" },
         body: JSON.stringify({ name: profile?.name || "", passcode: pinVerificationInput, initialBalance: 0 }),
       });

       if (!response.ok) {
         alert("Failed to create cloud account. Please try again.");
         setIsSyncing(false);
         return;
       }

       const data = (await response.json()).data;
       const newUserId = data.user.id;
       const newToken = data.token;

       const localTxs = await repos.transactions.getAll();
       const localCats = await repos.categories.getAll();
       const localDues = await repos.dues.getAll();
       const localSavings = await repos.savingsItems.getAll();
       const [localProfile] = await repos.profiles.getAll();

       await Promise.all([
         ...localTxs.map(t => authFetch(`transactions`, {
           method: "POST",
           body: JSON.stringify({ ...t, categoryId: t.category?.id ? String(t.category.id) : null, userId: newUserId })
         }).catch(() => {})),
         ...localCats.map(c => authFetch(`categories`, {
           method: "POST",
           body: JSON.stringify({ ...c, userId: newUserId })
         }).catch(() => {})),
         ...localDues.map(d => authFetch(`dues`, {
           method: "POST",
           body: JSON.stringify({ ...d, userId: newUserId })
         }).catch(() => {})),
         ...localSavings.map(s => authFetch(`savingsItems`, {
           method: "POST",
           body: JSON.stringify({ ...s, userId: newUserId })
         }).catch(() => {})),
       ]);

       if (localProfile) {
         await authFetch(`userProfiles`, {
           method: "POST",
           body: JSON.stringify({ ...localProfile, userId: newUserId })
         }).catch(() => {});
       }

       await logout();
       await addUser(newUserId, profile?.name || "", pinVerificationInput);
       await saveUserProfile({ name: profile?.name || "", isFirstRun: false, initialBalance: 0 }, newUserId);
       await initDb(newUserId);
       await setSetting('autoBackup', 'true');
       await login(newUserId, newToken);

       alert("New cloud account created and data migrated successfully!");
       await Promise.all([
         refetchTx(),
         refetchCats(),
         refetchProfile()
       ]);
     } catch (e) {
       console.error("Account creation failed:", e);
       alert("Failed to create cloud account. Please check your connection and try again.");
     } finally {
       setIsSyncing(false);
       setPinVerificationInput("");
     }
   };

    // SPEC-34 CON-09 — the merge/conflict OFF→ON path is retired for the
    // Cloud flow (fetch-then-push migration via confirmSyncEnable instead).
    // Manual backup / restore buttons below keep their OFF-plane behavior.

    const handleManualBackup = async () => {
    setIsSyncing(true);
    try {
       const txs = await repos.transactions.getAll();
       const cats = await repos.categories.getAll();
       const [profile] = await repos.profiles.getAll();


      if (profile) {
        const { data: existing } = await authFetch<unknown[]>(`userProfiles?userId=${activeUserId}`);

        const method = (existing && Array.isArray(existing) && existing.length > 0) ? "PATCH" : "POST";
        const url = (existing && Array.isArray(existing) && existing.length > 0)
          ? `userProfiles/${(existing[0] as Record<string, unknown>).id}`
          : `userProfiles`;

        await authFetch(url, {
          method,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...profile, userId: activeUserId })
        }).catch(() => { });
      }
      for (const c of cats) {
        await authFetch(`categories`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...c, userId: activeUserId })
        }).catch(() => { });
      }
      for (const t of txs) {
        console.info("Transaction", t);
        await authFetch(`transactions`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...t, categoryId: t.category?.id ? String(t.category.id) : null, userId: activeUserId })
        }).catch(() => { });
      }

      alert("Backup completed!");
    } catch (e) {
      console.error(e);
      alert("Backup failed.");
    } finally {
      setIsSyncing(false);
    }
  };

  const handleClearData = async () => {
    if (!pinInput.trim()) return;

    setIsSyncing(true);

    let pinVerified = false;
    try {
      // SPEC-31 CON-05 — same deviceId scheme as login.
      const deviceId = await getOrCreateDeviceId();
      const verifyRes = await fetch(`${API_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildAuthLoginPayload({
          name: profile?.name || "",
          passcode: pinInput.trim(),
          deviceId,
          force: true,
        })),
      });
      pinVerified = verifyRes.ok;
    } catch {
      // server unreachable — fall through to local verify
    }

    if (!pinVerified && activeUserId) {
      try {
        const users = await getUsers();
        // SPEC-31 CON-05 — match by id or case-insensitive name.
        const user = findAuthUserRow(users, { id: activeUserId, name: profile?.name || "" });
        if (user) {
          const inputHash = await Crypto.digestStringAsync(
            Crypto.CryptoDigestAlgorithm.SHA256,
            pinInput.trim()
          );
          pinVerified = user.passcode === inputHash || user.passcode === pinInput.trim();
        }
      } catch {
        // local verify failed too
      }
    }

    if (!pinVerified) {
      showMessage("error", "Incorrect PIN", "Please try again.");
      setIsSyncing(false);
      return;
    }

    try {
      if (activeUserId) {
         console.info("Syncing Clear Data to cloud for user:", activeUserId);
        const [txResult, catResult, dueResult, savResult] = await Promise.all([
          authFetch(`transactions?userId=${activeUserId}`),
          authFetch(`categories?userId=${activeUserId}`),
          authFetch(`dues?userId=${activeUserId}`),
          authFetch(`savingsItems?userId=${activeUserId}`)
        ]);

        const txs = txResult.data || [];
        const cats = catResult.data || [];
        const dues = dueResult.data || [];
        const savs = savResult.data || [];

        const deletePromises = [
          ...(Array.isArray(txs) ? txs.map(t => authFetch(`transactions/${t.id}`, { method: "DELETE" })) : []),
          ...(Array.isArray(cats) ? cats.filter(c => !c.isGlobal).map(c => authFetch(`categories/${c.id}`, { method: "DELETE" })) : []),
          ...(Array.isArray(dues) ? dues.map(d => authFetch(`dues/${d.id}`, { method: "DELETE" })) : []),
          ...(Array.isArray(savs) ? savs.map(s => authFetch(`savingsItems/${s.id}`, { method: "DELETE" })) : [])
        ];

        await Promise.all(deletePromises);
         console.info("Cloud transactional data cleared successfully");
      }

      await clearAllLocalData();
      await resetProfileToDefaults();
      setShowPinPrompt(false);
      setPinInput("");

      await Promise.all([
        refetchTx(),
        refetchCats(),
        refetchProfile()
      ]);

      alert("All local and cloud data has been cleared.");
      router.replace("/");
    } catch (e) {
      console.error("Clear data sync failed:", e);
      alert("Cleared local data, but cloud sync failed. Check your connection.");
      await clearAllLocalData();
      router.replace("/");
    } finally {
      setIsSyncing(false);
    }
  };

  const isValidWiseWalletBackup = (data: unknown): boolean => {
    if (!data || typeof data !== "object") return false;
    const obj = data as Record<string, unknown>;
    // Check for at least one expected top-level key
    const expectedKeys = ["profile", "settings", "categories", "transactions", "dues", "savingsItems"];
    return expectedKeys.some((k) => k in obj);
  };

  // SPEC-34 CON-01/CON-07 — API-only exports the live in-memory snapshot;
  // local-persist exports from AsyncStorage via exportData().
  const isApiOnlyPlane =
    !isEffectivelyLocal && (Platform.OS === "web" || autoBackup);

  const buildLiveSnapshotJson = () => JSON.stringify({
    profile,
    settings: { autoBackup: autoBackup.toString() },
    categories: liveCategories,
    transactions: liveTransactions,
    dues: liveDues,
    savingsItems: liveSavings,
  });

  const exportJSONWeb = async (json: string) => {
    try {
      const blob = new Blob([json], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
      const a = document.createElement("a");
      a.href = url;
      a.download = `wisewallet_backup_${timestamp}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showMessage("success", "Export Successful", "Data exported successfully!");
    } catch (e) {
      console.error(e);
      showMessage("error", "Export Failed", "Failed to export data. Please try again.");
    }
  };

  const exportJSONMobile = async (json: string) => {
    try {
      const fileUri = `${FileSystem.documentDirectory}WiseWallet_Backup_${Date.now()}.json`;
      const encoding = FileSystem.EncodingType ? FileSystem.EncodingType.UTF8 : "utf8";
      await FileSystem.writeAsStringAsync(fileUri, json, { encoding });
      await Sharing.shareAsync(fileUri);
      showMessage("success", "Export Successful", "Data exported successfully!");
    } catch (e) {
      console.error(e);
      showMessage("error", "Export Failed", "Failed to export data. Please try again.");
    }
  };

  const handleExportJSON = async () => {
    try {
      const json = isApiOnlyPlane ? buildLiveSnapshotJson() : await exportData();
      if (Platform.OS === "web") {
        await exportJSONWeb(json);
      } else {
        await exportJSONMobile(json);
      }
    } catch (e) {
      console.error(e);
      showMessage("error", "Export Failed", "Failed to export data. Please try again.");
    }
  };

  // SPEC-34 CON-07 — API-only import POSTs each entry to the cloud then
  // refetches; per-entity failures are reported, never silent. OFF/Local
  // import keeps today's local behavior.
  const importApiSnapshot = async (data: Record<string, unknown>) => {
    const failures: string[] = [];
    const asRows = (v: unknown): Record<string, unknown>[] =>
      Array.isArray(v)
        ? (v as Record<string, unknown>[]).filter((r) => r && typeof r === "object")
        : [];
    setIsSyncing(true);
    try {
      for (const t of asRows(data["transactions"])) {
        const category = t["category"] as { id?: unknown } | undefined;
        const body = {
          ...t,
          categoryId: t["categoryId"] ?? (category?.id !== undefined ? String(category.id) : null),
          userId: activeUserId,
        };
        await authFetch(`transactions`, { method: "POST", body: JSON.stringify(body) })
          .then((r) => { if (!r.ok) failures.push("transactions"); })
          .catch(() => { failures.push("transactions"); });
      }
      for (const c of asRows(data["categories"])) {
        await authFetch(`categories`, { method: "POST", body: JSON.stringify({ ...c, userId: activeUserId }) })
          .then((r) => { if (!r.ok) failures.push("categories"); })
          .catch(() => { failures.push("categories"); });
      }
      for (const d of asRows(data["dues"])) {
        await authFetch(`dues`, { method: "POST", body: JSON.stringify({ ...d, userId: activeUserId }) })
          .then((r) => { if (!r.ok) failures.push("dues"); })
          .catch(() => { failures.push("dues"); });
      }
      for (const s of asRows(data["savingsItems"])) {
        await authFetch(`savingsItems`, { method: "POST", body: JSON.stringify({ ...s, userId: activeUserId }) })
          .then((r) => { if (!r.ok) failures.push("savingsItems"); })
          .catch(() => { failures.push("savingsItems"); });
      }
      if (data["profile"] && typeof data["profile"] === "object" && activeUserId) {
        const profileOk = await ensureCloudProfile(
          activeUserId,
          data["profile"] as Record<string, unknown>
        ).catch(() => false);
        if (!profileOk) failures.push("profile");
      }
      await Promise.all([
        refetchTx(),
        refetchCats(),
        refetchDues(),
        refetchSavings(),
        refetchProfile()
      ]);
      if (failures.length > 0) {
        showMessage("error", "Import Partially Failed", `These sections did not upload: ${Array.from(new Set(failures)).join(", ")}. The rest is live — retry the failed parts.`);
      } else {
        showMessage("success", "Import Successful", "Data uploaded to your cloud account and refreshed!");
      }
    } catch (e) {
      console.error(e);
      showMessage("error", "Import Failed", "Failed to import data. Please try again.");
    } finally {
      setIsSyncing(false);
    }
  };

  const importJSONWeb = async () => {
    if (!fileInputRef.current) return;
    fileInputRef.current.value = "";
    fileInputRef.current.click();
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const data = JSON.parse(text);

      if (!isValidWiseWalletBackup(data)) {
        showMessage("error", "Invalid Backup File", "Please select a valid WiseWallet backup file.");
        return;
      }

      if (isApiOnlyPlane) {
        await importApiSnapshot(data as Record<string, unknown>);
        return;
      }
      await importData(text);
      showMessage("success", "Import Successful", "Data imported successfully! Please restart the app to see changes.");
    } catch (e) {
      console.error(e);
      showMessage("error", "Import Failed", "Failed to import data. The file may be corrupted or invalid.");
    }
  };

  const importJSONMobile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: "application/json" });
      if (!result.canceled && result.assets && result.assets.length > 0) {
        const fileUri = result.assets[0].uri;
        const encoding = FileSystem.EncodingType ? FileSystem.EncodingType.UTF8 : "utf8";
        const jsonString = await FileSystem.readAsStringAsync(fileUri, { encoding });
        const data = JSON.parse(jsonString);

        if (!isValidWiseWalletBackup(data)) {
          showMessage("error", "Invalid Backup File", "Please select a valid WiseWallet backup file.");
          return;
        }

        if (isApiOnlyPlane) {
          await importApiSnapshot(data as Record<string, unknown>);
          return;
        }
        await importData(jsonString);
        showMessage("success", "Import Successful", "Data imported successfully! Please restart the app to see changes.");
      }
    } catch (e) {
      console.error(e);
      showMessage("error", "Import Failed", "Failed to import data. Please try again.");
    }
  };

  const handleImportJSON = async () => {
    if (Platform.OS === "web") {
      await importJSONWeb();
    } else {
      await importJSONMobile();
    }
  };

  const handleDeleteAccount = () => {
    setDeletePinInput("");
    setDeletePinError("");
    setPinVerified(false);
    setDeleteConfirmed(false);
    setShowDeleteDialog(true);
  };

  const closeDeleteDialog = () => {
    setShowDeleteDialog(false);
    setDeletePinInput("");
    setDeletePinError("");
    setPinVerified(false);
    setDeleteConfirmed(false);
  };

  const verifyAccountPin = async (pin: string): Promise<"verified" | "conflict" | "invalid"> => {
    if (API_URL) {
      try {
        // SPEC-31 CON-05 — same deviceId scheme as login.
        const deviceId = await getOrCreateDeviceId();
        const res = await fetch(`${API_URL}/auth/login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(buildAuthLoginPayload({
            name: profile?.name || "",
            passcode: pin.trim(),
            deviceId,
            force: true,
          })),
        });
        const outcome = classifyAuthLoginResult({
          ok: res.ok,
          status: res.status,
          body: await res.json().catch(() => null),
        });
        if (outcome.outcome === "authenticated") {
          // SPEC-28 D-01 — this force login kills the current JWT server-side,
          // so store the fresh token BEFORE any authenticated call follows.
          await login(outcome.userId, outcome.token);
          return "verified";
        }
        if (outcome.outcome === "conflict") {
          return "conflict";
        }
        // rejected/unreachable — fall through to local verification
      } catch {
        // server unreachable — fall through to local verification
      }
    }

    if (activeUserId) {
      try {
        const users = await getUsers();
        // SPEC-31 CON-05 — match by id or case-insensitive name; a stale
        // session id MUST NOT lock out the legitimate row owner.
        const user = findAuthUserRow(users, { id: activeUserId, name: profile?.name || "" });
        if (user) {
          const inputHash = await Crypto.digestStringAsync(
            Crypto.CryptoDigestAlgorithm.SHA256,
            pin.trim()
          );
          if (user.passcode === inputHash || user.passcode === pin.trim()) {
            return "verified";
          }
        }
      } catch {
        // local verification failed too
      }
    }

    return "invalid";
  };

  const handleVerifyDeletePin = async () => {
    if (!deletePinInput.trim()) {
      setDeletePinError("PIN is required");
      return;
    }
    setIsSyncing(true);
    setDeletePinError("");
    try {
      const result = await verifyAccountPin(deletePinInput);
      if (result === "verified") {
        setPinVerified(true);
      } else if (result === "conflict") {
        showMessage("error", "Session Active", "This account is already logged in on another device. Log in again to move the session here, then retry.");
      } else {
        setDeletePinError("Invalid PIN. Please try again.");
      }
    } catch (e) {
      console.error("PIN verification failed:", e);
      setDeletePinError("Could not verify your PIN. Please try again.");
    } finally {
      setIsSyncing(false);
    }
  };

  const showMessage = (
    type: "success" | "error",
    title: string,
    message: string,
    onClose?: () => void
  ) => {
    setMessageDialog({ visible: true, type, title, message, onClose });
  };

  const closeMessage = () => {
    const { onClose } = messageDialog;
    setMessageDialog({ visible: false, type: "success", title: "", message: "" });
    if (onClose) onClose();
  };

  const executeDelete = async () => {
    if (!activeUserId) return;
    setIsSyncing(true);
    try {
      // Collect receipt refs BEFORE the repo wipe (SPEC-28 D-08).
      const localTxs = await repos.transactions.getAll();
      // Suppressed 401 handling: a dead token here is a flow outcome, never a
      // session kill (SPEC-28 D-03). Token is fresh per D-01 when online.
      const delResult = await authFetch(`auth/account`, {
        method: "DELETE",
        suppressAuthFailure: true,
      });
      const outcome = resolveDeleteOutcome(delResult.ok);
      await clearAllLocalData();
      await purgeUserDeviceData(
        activeUserId,
        localTxs.map((t) => ({ id: String(t.id), receiptUrl: t.receiptUrl })),
        FileSystem.documentDirectory ?? null
      );
      await logout();
      closeDeleteDialog();
      if (outcome === "server") {
        showMessage("success", "Account Deleted", "Account and all associated data deleted successfully.", () => router.replace("/login"));
      } else {
        showMessage("error", "Deleted From This Device Only", "Your cloud data may still exist. Log in again when online to retry the server delete.", () => router.replace("/login"));
      }
    } catch (e) {
      console.error("Delete account sync failed:", e);
      try {
        const localTxs = await repos.transactions.getAll().catch(() => []);
        await clearAllLocalData();
        await purgeUserDeviceData(
          activeUserId,
          localTxs.map((t) => ({ id: String(t.id), receiptUrl: t.receiptUrl })),
          FileSystem.documentDirectory ?? null
        );
      } catch {
        // purge is best-effort; logout must still happen
      }
      await logout();
      closeDeleteDialog();
      showMessage("error", "Deleted From This Device Only", "Your cloud data may still exist. Log in again when online to retry the server delete.", () => router.replace("/login"));
    } finally {
      setIsSyncing(false);
    }
  };

  const performRestore = async () => {
    setIsSyncing(true);
    try {
      console.info("[Restore] Starting cloud restore for user:", activeUserId);

      // Fetch all to catch legacy data (missing userId)
      const [txResult, catResult, profResult] = await Promise.all([
        authFetch(`transactions`),
        authFetch(`categories`),
        authFetch(`userProfiles`)
      ]);

       console.info("[Restore] Network status:", {
        txs: txResult.status,
        cats: catResult.status,
        profs: profResult.status
      });

      if (!txResult.ok || !catResult.ok || !profResult.ok) {
        console.error("[Restore] Cloud restore network error.");
        alert("Could not connect to the cloud API. Please check your connection.");
        return;
      }

      const allTxs = txResult.data || [];
      const allCats = catResult.data || [];
      const allProfs = profResult.data || [];

       console.info("[Restore] Raw data received:", {
        txs: Array.isArray(allTxs) ? allTxs.length : "error",
        cats: Array.isArray(allCats) ? allCats.length : "error",
        profs: Array.isArray(allProfs) ? allProfs.length : "error"
      });

      // Filter strictly for this user as requested
      const remoteTxs = Array.isArray(allTxs) ? allTxs.filter((t: Record<string, unknown>) => String(t.userId) === String(activeUserId)) : [];
      const remoteCats = Array.isArray(allCats) ? allCats.filter((c: Record<string, unknown>) => String(c.userId) === String(activeUserId)) : [];
      const remoteProf = Array.isArray(allProfs) ? allProfs.find((p: Record<string, unknown>) => String(p.userId) === String(activeUserId)) : null;

       console.info("[Restore] Filtered data:", {
        txs: remoteTxs.length,
        cats: remoteCats.length,
        profFound: !!remoteProf
      });

      const currentSettings = { autoBackup: autoBackup.toString() };
      const cloudJson = JSON.stringify({
        profile: remoteProf,
        categories: remoteCats,
        transactions: remoteTxs,
        settings: currentSettings
      });

      await importData(cloudJson);

      // 5. Trigger automatic UI refresh
      // On Web, AsyncStorage can sometimes be slightly asynchronous even after resolving.
      // A small delay ensures the contexts read the freshly imported data.
      if (Platform.OS === 'web') {
         console.info("[Restore] Web platform detected, applying settling delay...");
        await new Promise(resolve => setTimeout(resolve, 200));
      }

      await Promise.all([
        refetchTx(),
        refetchCats(),
        refetchProfile()
      ]);

      showMessage("success", "Restore Complete", "Cloud data restored locally and UI refreshed!");
    } catch (e) {
      console.error(e);
      showMessage("error", "Restore Failed", "Restore failed. Make sure the API is online.");
    } finally {
      setIsSyncing(false);
    }
  };

  const handleRestoreFromCloud = () => {
    setShowRestoreConfirm(true);
  };

  return (
    <View style={{ flex: 1, backgroundColor: paperTheme.colors.background }}>
      {Platform.OS === "web" && (
        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          style={{ display: "none" }}
          onChange={handleFileSelect}
        />
      )}
      <Appbar.Header style={{ backgroundColor: paperTheme.colors.background, elevation: 0 }}>
        <Appbar.Content title="Settings" titleStyle={{ fontWeight: "700" }} />
      </Appbar.Header>

      <ScrollView contentContainerStyle={{ padding: 16 }} keyboardShouldPersistTaps="handled">
        {/* User Profile Section */}
        <Card style={{ marginBottom: 16 }}>
          <Card.Content>
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <Avatar.Text
                size={48}
                label={profile?.name?.substring(0, 2).toUpperCase() || "US"}
                style={{ backgroundColor: paperTheme.colors.primary }}
              />
               <View style={{ marginLeft: 16 }}>
                 <Text variant="titleMedium">{profile?.name || "Wise User"}</Text>
                 <Text variant="bodySmall" style={{ color: paperTheme.colors.outline }}>
                   {isEffectivelyLocal ? "Local-only account — stored on this device" : autoBackup ? "Cloud Sync Enabled" : "Cloud account — sync off"}
                 </Text>
               </View>
            </View>
          </Card.Content>
        </Card>

        {isLocal ? (
          <Card style={{ marginBottom: 16, backgroundColor: paperTheme.colors.surfaceVariant }}>
            <Card.Content>
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <List.Icon icon="cellphone-off" color={paperTheme.colors.onSurfaceVariant} />
                <View style={{ marginLeft: 12, flex: 1 }}>
                  <Text variant="titleSmall" style={{ color: paperTheme.colors.onSurfaceVariant, fontWeight: "600" }}>
                    Local-only Account: Your data is stored only on this device
                  </Text>
                </View>
              </View>
            </Card.Content>
          </Card>
        ) : !autoBackup ? (
          <Card style={{ marginBottom: 16, backgroundColor: paperTheme.colors.surfaceVariant }}>
            <Card.Content>
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <List.Icon icon="cloud-off-outline" color={paperTheme.colors.onSurfaceVariant} />
                <View style={{ marginLeft: 12, flex: 1 }}>
                  <Text variant="titleSmall" style={{ color: paperTheme.colors.onSurfaceVariant, fontWeight: "600" }}>
                    Sync off
                  </Text>
                  <Text variant="bodySmall" style={{ color: paperTheme.colors.onSurfaceVariant, opacity: 0.8 }}>
                    Auto-backup is disabled. Your data stays on this device only.
                  </Text>
                </View>
              </View>
            </Card.Content>
          </Card>
        ) : null}

        {/* General Settings */}
        <Card style={{ marginBottom: 16 }}>
          <Card.Content>
            <Text variant="titleMedium" style={{ marginBottom: 16 }}>Categories</Text>
            <List.Item
              title="Categories"
              description="Manage income & expense categories"
              left={props => <List.Icon {...props} icon="shape-outline" />}
              right={props => <List.Icon {...props} icon="chevron-right" />}
              onPress={() => router.push("/category-settings")}
            />
          </Card.Content>
        </Card>

        <Card style={{ marginBottom: 16 }}>
          <Card.Content>
            <Text variant="titleMedium" style={{ marginBottom: 16 }}>Appearance</Text>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 8 }}>
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <List.Icon icon="theme-light-dark" color={paperTheme.colors.onSurfaceVariant} />
                <Text variant="bodyLarge" style={{ marginLeft: 12 }}>Dark Mode</Text>
              </View>
              <Switch value={isDarkMode} onValueChange={toggleTheme} />
            </View>
            <View style={{ flexDirection: "row", alignItems: "center", marginTop: 4 }}>
              <View style={{ width: 36 }} />
              <Text variant="bodySmall" style={{ color: paperTheme.colors.outline, fontSize: 12, lineHeight: 16 }}>
                Language: English
              </Text>
            </View>
          </Card.Content>
        </Card>



        <Card style={{ marginBottom: 16 }}>
          <Card.Content>
            <Text variant="titleMedium" style={{ marginBottom: 16 }}>Data Management</Text>

            <SyncStatusCard autoBackup={autoBackup} isLocal={isEffectivelyLocal} />

            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 8 }}>
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <List.Icon icon="cloud-sync" color={paperTheme.colors.onSurfaceVariant} />
                <Text variant="bodyLarge" style={{ marginLeft: 12 }}>Auto-Backup</Text>
              </View>
              <Switch value={autoBackup} onValueChange={handleToggleAutoBackup} disabled={isSyncing} />
            </View>

            <Divider style={{ marginVertical: 8 }} />

            {(!autoBackup && !isEffectivelyLocal) && (
              <Button mode="outlined" icon="backup-restore" onPress={handleManualBackup} loading={isSyncing} disabled={isSyncing} style={{ marginVertical: 4 }}>
                Backup Data to Cloud API Now
              </Button>
            )}

            {(!autoBackup && !isEffectivelyLocal) && (
              <Button mode="outlined" icon="cloud-download" onPress={handleRestoreFromCloud} loading={isSyncing} disabled={isSyncing} style={{ marginVertical: 4 }}>
                Restore Data from Cloud API
              </Button>
            )}

            <Button mode="outlined" icon="file-export" onPress={handleExportJSON} style={{ marginVertical: 4 }}>
              Export Data (JSON)
            </Button>

            <Button mode="outlined" icon="file-import" onPress={handleImportJSON} style={{ marginVertical: 4 }}>
              Import Data (JSON)
            </Button>

            <Button mode="contained-tonal" buttonColor={paperTheme.colors.errorContainer} textColor={paperTheme.colors.onErrorContainer} icon="delete-alert" onPress={() => setShowPinPrompt(true)} style={{ marginTop: 8 }}>
              Clear All Data
            </Button>

          </Card.Content>
        </Card>

        <Card style={{ marginBottom: 16 }}>
          <Card.Content>
            <Text variant="titleMedium" style={{ marginBottom: 16 }}>Account</Text>
            {isEffectivelyLocal && (
              <Button mode="contained" icon="cloud-upload-outline" onPress={() => startReregisterFlow()} style={{ marginBottom: 8 }}>
                Register Online Account
              </Button>
            )}
            <Button mode="outlined" icon="account-switch" onPress={handleLogout} textColor={paperTheme.colors.primary} style={{ marginBottom: 8 }}>
              Switch Account / Logout
            </Button>
            <Button mode="contained-tonal" icon="account-remove" onPress={handleDeleteAccount} buttonColor={paperTheme.colors.errorContainer} textColor={paperTheme.colors.onErrorContainer}>
              Delete Account
            </Button>
          </Card.Content>
        </Card>

        <Card>
          <Card.Content>
            <Text variant="titleMedium" style={{ marginBottom: 16 }}>Security</Text>
            <View style={{ marginBottom: 8 }}>
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <List.Icon icon="lock-outline" color={paperTheme.colors.onSurfaceVariant} />
                <Text variant="bodyLarge" style={{ marginLeft: 12 }}>Passcode</Text>
              </View>
              <View style={{ flexDirection: "row", alignItems: "center", marginTop: 4 }}>
                <View style={{ width: 36 }} />
                <Text variant="bodySmall" style={{ color: paperTheme.colors.outline, fontSize: 12, lineHeight: 16 }}>
                  Require PIN to unlock the app on startup
                </Text>
              </View>
            </View>

            {isPasscodeEnabled ? (
              <Button
                mode="outlined"
                icon="lock-reset"
                onPress={() => setShowChangePasscodeDialog(true)}
                style={{ marginTop: 8 }}
              >
                Change Passcode
              </Button>
            ) : (
              <Button
                mode="outlined"
                icon="lock-plus-outline"
                onPress={() => setShowChangePasscodeDialog(true)}
                style={{ marginTop: 8 }}
              >
                Set Passcode
              </Button>
            )}
          </Card.Content>
        </Card>

        <Card style={{ marginTop: 16 }}>
          <Card.Content>
            <Button mode="text" icon="help-circle-outline" onPress={() => router.push("/help")}>
              Help & FAQ
            </Button>
          </Card.Content>
        </Card>
      </ScrollView>

      <Portal>
        <Dialog visible={showDeleteDialog} onDismiss={closeDeleteDialog}>
          <KeyboardAwareDialog>
          <Dialog.Title>Delete Account</Dialog.Title>
          <Dialog.Content>
            <Text style={{ color: paperTheme.colors.error, fontWeight: "700" }}>
              WARNING: This action is permanent and cannot be undone.
            </Text>
            <Text style={{ marginTop: 8, marginBottom: 16 }}>
              All your data in the cloud and on this device will be PERMANENTLY deleted. We recommend downloading a JSON backup first.
            </Text>

            <Text variant="labelLarge" style={{ marginBottom: 8 }}>
              Verify your PIN
            </Text>
            <TextInput
              label="Current PIN"
              value={deletePinInput}
              onChangeText={(t) => { setDeletePinInput(t.replace(/[^0-9]/g, "").slice(0, 4)); setDeletePinError(""); setPinVerified(false); }}
              secureTextEntry
              keyboardType="numeric"
              maxLength={4}
              error={!!deletePinError}
              disabled={pinVerified || isSyncing}
            />
            {deletePinError ? (
              <Text style={{ color: paperTheme.colors.error, marginTop: 4 }}>{deletePinError}</Text>
            ) : null}

            {pinVerified ? (
              <View style={{ flexDirection: "row", alignItems: "center", marginTop: 12 }}>
                <IconButton icon="check-circle" iconColor={paperTheme.colors.tertiary} size={20} />
                <Text style={{ color: paperTheme.colors.tertiary, fontWeight: "600" }}>PIN verified</Text>
              </View>
            ) : (
              <Button
                mode="outlined"
                icon="shield-check-outline"
                onPress={handleVerifyDeletePin}
                loading={isSyncing}
                disabled={isSyncing || deletePinInput.trim().length === 0}
                style={{ marginTop: 12, alignSelf: "flex-start" }}
              >
                Verify PIN
              </Button>
            )}

            {pinVerified ? (
              <View style={{ marginTop: 8 }}>
                <Checkbox.Item
                  label="I understand this action is permanent and cannot be undone"
                  status={deleteConfirmed ? "checked" : "unchecked"}
                  onPress={() => setDeleteConfirmed(!deleteConfirmed)}
                  labelStyle={{ fontSize: 13 }}
                />
              </View>
            ) : null}
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={closeDeleteDialog}>Cancel</Button>
            <Button
              onPress={executeDelete}
              textColor={paperTheme.colors.error}
              loading={isSyncing}
              disabled={isSyncing || !pinVerified || !deleteConfirmed}
            >
              Delete Permanently
            </Button>
          </Dialog.Actions>
          </KeyboardAwareDialog>
        </Dialog>

        <Dialog visible={messageDialog.visible} onDismiss={closeMessage}>
          <Dialog.Icon
            icon={messageDialog.type === "success" ? "check-circle-outline" : "alert-circle-outline"}
            color={messageDialog.type === "success" ? paperTheme.colors.tertiary : paperTheme.colors.error}
          />
          <Dialog.Title style={{ textAlign: "center" }}>{messageDialog.title}</Dialog.Title>
          <Dialog.Content>
            <Text style={{ textAlign: "center" }}>{messageDialog.message}</Text>
          </Dialog.Content>
          <Dialog.Actions style={{ justifyContent: "center" }}>
            <Button mode="contained" onPress={closeMessage}>OK</Button>
          </Dialog.Actions>
        </Dialog>

        <ConfirmDialog
          visible={showRestoreConfirm}
          title="Restore from Cloud?"
          message="This will overwrite all your local data with the data from your cloud backup. This action cannot be undone. Are you sure?"
          confirmLabel="Restore"
          icon="database-refresh-outline"
          onConfirm={() => {
            setShowRestoreConfirm(false);
            performRestore();
          }}
          onCancel={() => setShowRestoreConfirm(false)}
        />

        <Dialog visible={showPinVerificationDialog} onDismiss={() => setShowPinVerificationDialog(false)}>
          <KeyboardAwareDialog>
          <Dialog.Title>Verify Account PIN</Dialog.Title>
          <Dialog.Content>
            <Text style={{ marginBottom: 16 }}>
              {`To enable cloud sync, please enter the PIN for "${profile?.name || "your account"}".`}
            </Text>
            <TextInput
              label="Current PIN"
              value={pinVerificationInput}
              onChangeText={(t) => { setPinVerificationInput(t.replace(/[^0-9]/g, "").slice(0, 4)); setVerificationError(""); }}
              secureTextEntry
              keyboardType="numeric"
              maxLength={4}
              error={!!verificationError}
            />
            {verificationError ? (
              <Text style={{ color: paperTheme.colors.error, marginTop: 4 }}>{verificationError}</Text>
            ) : null}
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => { setShowPinVerificationDialog(false); setPinVerificationInput(""); setVerificationError(""); }}>Cancel</Button>
            <Button onPress={verifyPinForSync} loading={isSyncing} disabled={isSyncing}>Verify & Sync</Button>
          </Dialog.Actions>
          </KeyboardAwareDialog>
        </Dialog>

        <Dialog visible={showNewAccountDialog} onDismiss={() => setShowNewAccountDialog(false)}>
          <Dialog.Title>PIN Doesn&apos;t Match</Dialog.Title>
          <Dialog.Content>
            <Text style={{ marginBottom: 16 }}>
              {"The PIN you entered doesn't match the cloud account. Would you like to create a new cloud account with this PIN and migrate all your local data to it?"}
            </Text>
            <Text variant="bodySmall" style={{ color: paperTheme.colors.outline }}>
              Your existing cloud data won't be affected. This will create a separate account.
            </Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setShowNewAccountDialog(false)}>Cancel</Button>
            <Button onPress={createNewAccountAndMigrate} loading={isSyncing} disabled={isSyncing}>Create New & Migrate</Button>
          </Dialog.Actions>
        </Dialog>

        <Dialog visible={showReregisterHonesty} onDismiss={() => setShowReregisterHonesty(false)}>
          <Dialog.Title>{REREGISTER_HONESTY_TITLE}</Dialog.Title>
          <Dialog.Content>
            <Text style={{ marginBottom: 16 }}>
              {REREGISTER_HONESTY_MESSAGE}
            </Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setShowReregisterHonesty(false)}>Cancel</Button>
            <Button
              mode="contained"
              onPress={() => {
                setShowReregisterHonesty(false);
                setShowReregisterExport(true);
              }}
            >
              Continue
            </Button>
          </Dialog.Actions>
        </Dialog>

        <Dialog visible={showReregisterExport} onDismiss={() => setShowReregisterExport(false)}>
          <Dialog.Title>{REREGISTER_EXPORT_TITLE}</Dialog.Title>
          <Dialog.Content>
            <Text style={{ marginBottom: 16 }}>
              {REREGISTER_EXPORT_MESSAGE}
            </Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button
              onPress={() => {
                setShowReregisterExport(false);
                setRegError("");
                setShowReregisterForm(true);
              }}
            >
              Skip
            </Button>
            <Button
              mode="contained"
              onPress={async () => {
                await handleExportJSON();
                setShowReregisterExport(false);
                setRegError("");
                setShowReregisterForm(true);
              }}
            >
              Export JSON
            </Button>
          </Dialog.Actions>
        </Dialog>

        <Dialog visible={showReregisterForm} onDismiss={() => setShowReregisterForm(false)}>
          <KeyboardAwareDialog>
          <Dialog.Title>{REREGISTER_FORM_TITLE}</Dialog.Title>
          <Dialog.Content>
            <Text style={{ marginBottom: 16 }}>
              Enter the email + PIN for your NEW Online account. Your current Local data stays on this device.
            </Text>
            <TextInput
              label="Email"
              value={regEmail}
              onChangeText={(t) => { setRegEmail(t); setRegError(""); }}
              autoCapitalize="none"
              keyboardType="email-address"
              style={{ marginBottom: 12 }}
              disabled={isSyncing}
            />
            <TextInput
              label="4-digit PIN"
              value={regPin}
              onChangeText={(t) => { setRegPin(t.replace(/[^0-9]/g, "").slice(0, 4)); setRegError(""); }}
              secureTextEntry
              keyboardType="numeric"
              maxLength={4}
              style={{ marginBottom: 4 }}
              disabled={isSyncing}
            />
            {regError ? (
              <Text style={{ color: paperTheme.colors.error, marginTop: 8 }}>{regError}</Text>
            ) : null}
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setShowReregisterForm(false)} disabled={isSyncing}>Cancel</Button>
            <Button
              mode="contained"
              onPress={completeReregistration}
              loading={isSyncing}
              disabled={isSyncing || !isValidReregistrationEmail(regEmail) || regPin.trim().length !== 4}
            >
              Register
            </Button>
          </Dialog.Actions>
          </KeyboardAwareDialog>
        </Dialog>

        <Dialog visible={showSyncExplainDialog} onDismiss={() => setShowSyncExplainDialog(false)}>
          <Dialog.Title>Turn Auto-Backup On?</Dialog.Title>
          <Dialog.Content>
            <Text style={{ marginBottom: 16 }}>
              Turning ON will sync data: fetch cloud first, then push this device&apos;s entries. Your on-device data is preserved — nothing is deleted before it is uploaded.
            </Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setShowSyncExplainDialog(false)} disabled={isSyncing}>Cancel</Button>
            <Button mode="contained" onPress={confirmSyncEnable} loading={isSyncing} disabled={isSyncing}>Turn ON</Button>
          </Dialog.Actions>
        </Dialog>

        <Dialog visible={showPinPrompt} onDismiss={() => setShowPinPrompt(false)}>
          <KeyboardAwareDialog>
          <Dialog.Title>Enter PIN to Clear Data</Dialog.Title>
          <Dialog.Content>
            <Text style={{ marginBottom: 16 }}>This action cannot be undone. All local data will be permanently deleted.</Text>
            <TextInput
              label="PIN"
              value={pinInput}
              onChangeText={(t) => setPinInput(t.replace(/[^0-9]/g, "").slice(0, 4))}
              secureTextEntry
              keyboardType="numeric"
              maxLength={4}
            />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setShowPinPrompt(false)}>Cancel</Button>
            <Button onPress={handleClearData} textColor={paperTheme.colors.error}>Clear Data</Button>
          </Dialog.Actions>
          </KeyboardAwareDialog>
        </Dialog>


        <Dialog visible={showChangePasscodeDialog} onDismiss={closeChangePasscodeDialog}>
          <KeyboardAwareDialog>
          {passcode ? (
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 4 }}>
              <Dialog.Title>{pinStep === 1 ? "Change Passcode" : "Enter New Passcode"}</Dialog.Title>
              <IconButton icon="close" onPress={closeChangePasscodeDialog} />
            </View>
          ) : (
            <Dialog.Title>Set Passcode</Dialog.Title>
          )}
          <Dialog.Content>
            {passcode ? (
              // Step 1: Verify current passcode when existing passcode exists
              pinStep === 1 ? (
                <View>
                  <Text style={{ marginBottom: 16 }}>
                    Enter your current passcode to verify.
                  </Text>
                  {pinError ? (
                    <Text style={{ color: paperTheme.colors.error, marginBottom: 8 }}>
                      {pinError}
                    </Text>
                  ) : null}
                  <TextInput
                    label="Current Passcode"
                    value={currentPasscodeInput}
                    onChangeText={(t) => {
                      setCurrentPasscodeInput(t.replace(/[^0-9]/g, "").slice(0, 4));
                      setPinError(null);
                    }}
                    secureTextEntry
                    keyboardType="numeric"
                    maxLength={4}
                    style={{ marginBottom: 12 }}
                  />
                </View>
              ) : (
                // Step 2: Enter new passcode after verification
                <View>
                  <Text style={{ marginBottom: 16 }}>
                    Enter your new passcode.
                  </Text>
                  <TextInput
                    label="New Passcode"
                    value={newPasscodeInput}
                    onChangeText={(t) => {
                      setNewPasscodeInput(t.replace(/[^0-9]/g, "").slice(0, 4));
                      setChangePasscodeError("");
                    }}
                    secureTextEntry
                    keyboardType="numeric"
                    maxLength={4}
                    style={{ marginBottom: 12 }}
                  />
                  <TextInput
                    label="Confirm New Passcode"
                    value={confirmPasscodeInput}
                    onChangeText={(t) => {
                      setConfirmPasscodeInput(t.replace(/[^0-9]/g, "").slice(0, 4));
                      setChangePasscodeError("");
                    }}
                    secureTextEntry
                    keyboardType="numeric"
                    maxLength={4}
                    style={{ marginBottom: 12 }}
                  />
                  {changePasscodeError ? (
                    <Text style={{ color: paperTheme.colors.error, marginTop: 8 }}>
                      {changePasscodeError}
                    </Text>
                  ) : null}
                </View>
              )
            ) : (
              // No existing passcode: directly show new passcode fields
              <View>
                <Text style={{ marginBottom: 16 }}>
                  Choose a new 4-digit passcode.
                </Text>
                <TextInput
                  label="New Passcode"
                  value={newPasscodeInput}
                  onChangeText={(t) => {
                    setNewPasscodeInput(t.replace(/[^0-9]/g, "").slice(0, 4));
                    setChangePasscodeError("");
                  }}
                  secureTextEntry
                  keyboardType="numeric"
                  maxLength={4}
                  style={{ marginBottom: 12 }}
                />
                <TextInput
                  label="Confirm New Passcode"
                  value={confirmPasscodeInput}
                  onChangeText={(t) => {
                    setConfirmPasscodeInput(t.replace(/[^0-9]/g, "").slice(0, 4));
                    setChangePasscodeError("");
                  }}
                  secureTextEntry
                  keyboardType="numeric"
                  maxLength={4}
                  style={{ marginBottom: 12 }}
                />
                {changePasscodeError ? (
                  <Text style={{ color: paperTheme.colors.error, marginTop: 8 }}>
                    {changePasscodeError}
                  </Text>
                ) : null}
              </View>
            )}
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={closeChangePasscodeDialog}>Cancel</Button>
            {passcode ? (
              pinStep === 1 ? (
                <Button
                  onPress={() => {
                    const current = currentPasscodeInput.trim();
                    if (current === passcode) {
                      setPinStep(2);
                      setPinError(null);
                    } else {
                      setPinError("Incorrect Current PIN. Try again.");
                      setCurrentPasscodeInput("");
                    }
                  }}
                  disabled={currentPasscodeInput.trim().length !== 4}
                >
                  Verify Current PIN
                </Button>
              ) : (
                <Button
                  onPress={handleChangePasscode}
                  disabled={newPasscodeInput.length !== 4 || newPasscodeInput !== confirmPasscodeInput}
                >
                  Set Passcode
                </Button>
              )
            ) : (
              <Button
                onPress={handleChangePasscode}
                disabled={newPasscodeInput.length !== 4 || newPasscodeInput !== confirmPasscodeInput}
              >
                Set Passcode
              </Button>
            )}
          </Dialog.Actions>
          </KeyboardAwareDialog>
        </Dialog>
      </Portal>
    </View>
  );
}
