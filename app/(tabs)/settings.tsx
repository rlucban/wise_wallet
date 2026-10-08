import { useState, useRef } from "react";
import { View, ScrollView, Platform, StyleSheet, KeyboardAvoidingView, Modal as NativeModal, Pressable } from "react-native";
import { Appbar, List, Text, Card, Switch, Divider, Button, Avatar, Portal, Surface, Dialog, TextInput, Checkbox, useTheme as usePaperTheme, IconButton } from "react-native-paper";
import { useRouter } from "expo-router";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import * as DocumentPicker from "expo-document-picker";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRepositories } from "../../context/RepositoryContext";

import { setSetting, clearAllLocalData, exportData, importData, deleteUser, mergeLWW, API_URL, addUser, saveUserProfile, initDb, getUsers, updateUserPasscode } from "../../utils/db";
import { getPrefixedKey, setItem } from "../../utils/storage";
import { getSyncQueue, saveSyncQueue } from "../../utils/syncQueue";
import { useAuth } from "../../context/AuthContext";
import { useAppTheme } from "../../context/ThemeContext";
import { useUserProfile } from "../../context/UserProfileContext";
import { usePasscode } from "../../context/PasscodeContext";
import { useTransactionsActions } from "../../context/TransactionsContext";
import { useCategoriesActions } from "../../context/CategoriesContext";
import { authFetch } from "../../utils/apiClient";
import { useSyncStatus } from "../../hooks/useSyncStatus";
import { useNetwork } from "../../context/NetworkContext";
import { useIsLocalAccount } from "../../utils/authMode";
import { verifyLocalPin } from "../../utils/pinGate";
import * as Crypto from 'expo-crypto';
import { Transaction, Category, Due, SavingsItem, UserProfile } from "../../types";
import ConfirmDialog from "../../components/ConfirmDialog";

function SyncStatusCard({ autoBackup, isLocal }: { autoBackup: boolean; isLocal: boolean }) {
  const { isOnline, checkConnectivity, isChecking } = useNetwork();
  const { pending, lastSyncedAt, refresh: retryAll } = useSyncStatus();
  const paperTheme = usePaperTheme();

  const getStatusColor = () => {
    if (isLocal) return { icon: "cellphone-off", text: "Local-only", color: paperTheme.colors.outline };
    if (!autoBackup) return { icon: "cloud-off-outline", text: "No local backup", color: paperTheme.colors.outline };
    if (isChecking) return { icon: "cloud-sync", text: "Checking...", color: paperTheme.colors.primary };
    if (!isOnline && Platform.OS !== "web") return { icon: "cloud-off", text: "Offline", color: paperTheme.colors.error };
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
          : !isOnline && Platform.OS !== "web"
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
            {isLocal ? "Data stored on device" : `Last sync: ${formatLastSync()}`}
          </Text>
        </View>
      </View>
      {!autoBackup || isLocal ? null : pending > 0 && isOnline ? (
        <Button
          mode="text"
          compact
          icon="sync"
          onPress={retryAll}
          loading={isChecking}
        >
          Retry
        </Button>
      ) : !isOnline && Platform.OS !== "web" ? (
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
  },
  dialog: {
    maxWidth: 480,
    width: "90%",
    alignSelf: "center",
    marginHorizontal: 0,
  },
  dialogContent: {
    alignItems: "center",
    width: '100%',

  }
});

export default function SettingsScreen() {
  const router = useRouter();
  const paperTheme = usePaperTheme();
  const { isDarkMode, toggleTheme } = useAppTheme();
  const { profile, updateProfile, resetProfileToDefaults, refetch: refetchProfile } = useUserProfile();
  const { isPasscodeEnabled, setIsPasscodeEnabled, setPasscode, verifyPasscode } = usePasscode();
  const { activeUserId, logout, login } = useAuth();
  const { refetch: refetchTx } = useTransactionsActions();
  const { refetch: refetchCats } = useCategoriesActions();
  const repos = useRepositories();
  const isLocal = useIsLocalAccount();
  const { isOnline } = useNetwork();

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

  // SPEC-35 D-03: converged change — lock (D-01 persist) + local
  // master_users re-hash (D-02) + server bcrypt (Cloud only).
  const handleChangePasscode = async () => {
    const current = currentPasscodeInput.trim();
    const next = newPasscodeInput.trim();
    const confirm = confirmPasscodeInput.trim();

    if (!/^\d{4}$/.test(next)) {
      setChangePasscodeError("New PIN must be 4 digits.");
      return;
    }
    if (next !== confirm) {
      setChangePasscodeError("New PINs do not match.");
      return;
    }
    if (current !== "" && next === current) {
      setChangePasscodeError("New PIN must be different from current PIN.");
      return;
    }
    if (!activeUserId) {
      setChangePasscodeError("Please check your connection.");
      return;
    }

    if (!isLocal) {
      // Cloud: server is source of truth (DEC-05); fail-closed offline (CON-03).
      if (!isOnline) {
        setChangePasscodeError("Connect to change your Cloud PIN.");
        return;
      }
      if (!/^\d{4}$/.test(current)) {
        setChangePasscodeError("Enter your current 4-digit PIN.");
        return;
      }
      try {
        const result = await authFetch<{ token?: string }>("auth/change-passcode", {
          method: "POST",
          body: JSON.stringify({ currentPasscode: current, newPasscode: next }),
        });
        if (!result.ok) {
          if (result.status === 401) {
            setChangePasscodeError("Current PIN is incorrect");
            setPinStep(1);
            setCurrentPasscodeInput("");
          } else if (result.status === 429) {
            setChangePasscodeError("Too many attempts, try again later");
          } else {
            setChangePasscodeError(result.error || "Please check your connection.");
          }
          return;
        }
        const freshToken = result.data?.token;
        await updateUserPasscode(activeUserId, next);
        const isNewSetup = !isPasscodeEnabled;
        setPasscode(next);
        if (isNewSetup) setIsPasscodeEnabled(true);
        // SPEC-API-02: store the fresh session-bound token so the changer stays in.
        if (freshToken) await login(activeUserId, freshToken);
        closeChangePasscodeDialog();
        setMessageDialog({
          visible: true,
          type: "success",
          title: "Passcode Changed",
          message: "Passcode changed — other devices will be signed out when next online.",
        });
      } catch {
        setChangePasscodeError("Please check your connection.");
      }
      return;
    }

    // Local: fully offline (CON-04) — lock verify + local re-hash only.
    if (isPasscodeEnabled && !(await verifyPasscode(current))) {
      setChangePasscodeError("Incorrect current PIN.");
      return;
    }
    await updateUserPasscode(activeUserId, next);
    const isNewSetup = !isPasscodeEnabled;
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





   const autoBackup = isLocal ? false : profile?.autoBackup ?? true;
  const [isSyncing, setIsSyncing] = useState(false);
  const [showPinPrompt, setShowPinPrompt] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showBackupDialog, setShowBackupDialog] = useState(false);
  const [showPinVerificationDialog, setShowPinVerificationDialog] = useState(false);
  const [pinVerificationInput, setPinVerificationInput] = useState("");
  const [verificationError, setVerificationError] = useState("");
  const [showNewAccountDialog, setShowNewAccountDialog] = useState(false);
  const [showConflictDialog, setShowConflictDialog] = useState(false);
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
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [messageDialog, setMessageDialog] = useState<{
    visible: boolean;
    type: "success" | "error";
    title: string;
    message: string;
    onClose?: () => void;
  }>({ visible: false, type: "success", title: "", message: "" });
  const [showRestoreConfirm, setShowRestoreConfirm] = useState(false);
  const [repairPreview, setRepairPreview] = useState<{ upload: Transaction[]; delIds: string[]; queued: number } | null>(null);
  const [showRepairConfirm, setShowRepairConfirm] = useState(false);

  // Web-only ref for hidden file input
  const fileInputRef = useRef<HTMLInputElement>(null);

   const setAutoBackup = async (value: boolean) => {
     await updateProfile({ autoBackup: value });
     await setSetting('autoBackup', value.toString());
     if (isLocal || !activeUserId) return;
     try {
       if (value) {
         // ON: populate mirror from API (SPEC-45 DEC-03).
         const { data } = await authFetch<Transaction[]>(`transactions?userId=${activeUserId}`);
         if (Array.isArray(data)) {
           await setItem(await getPrefixedKey('transactions'), data);
         }
       } else {
         // OFF: clear mirror (SPEC-45 DEC-03).
         await setItem(await getPrefixedKey('transactions'), []);
       }
     } catch (e) {
       console.error("Local backup mirror sync failed:", e);
     }
   };

   const handleToggleAutoBackup = async (val: boolean) => {
     if (isLocal && val) {
       setVerificationError("");
       setPinVerificationInput("");
       setShowPinVerificationDialog(true);
       return;
     }
     if (val) {
       setVerificationError("");
       setPinVerificationInput("");
       setShowPinVerificationDialog(true);
     } else {
       setAutoBackup(false);
     }
   };

   const verifyPinForSync = async () => {
     const pin = pinVerificationInput.trim();
     if (!pin) {
       setVerificationError("PIN is required");
       return;
     }
     setIsSyncing(true);
     setVerificationError("");
     // SPEC-51 D-51-01: converged server → local rule (DEC-51-01).
      // Single login call; its outcome decides the branch — never re-fetched.
      // SPEC-59 D-59-04 (DEC-59-02): verify against the login identity, not
      // the display name. Absent → "" → existing 401 → leg-2/fail-closed.
      const gateName = (await AsyncStorage.getItem("authName")) || "";
      let unreachable = false;
     try {
       const response = await fetch(`${API_URL}/auth/login`, {
         method: "POST",
         headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: gateName,
            passcode: pin,
            force: true
          }),
       });

       if (response.ok) {
         const data = (await response.json()).data;
         await login(data.user.id, data.token);
         await setSetting('autoBackup', 'true');
         setShowPinVerificationDialog(false);
         setPinVerificationInput("");
         await proceedWithBackupEnable();
         return;
       }
       // Reachable but rejected — fall through to local verify below.
     } catch (e) {
       unreachable = true; // offline — fall through to local verify
       console.error("PIN verification failed:", e);
     }

     // Local fallback (DEC-51-01/02): same hash-or-plaintext rule as Delete.
     let localOk = false;
     if (activeUserId) {
       try {
         const users = await getUsers();
         const user = users.find((u) => u.id === activeUserId);
         if (user) localOk = await verifyLocalPin(pin, user.passcode);
       } catch {
         // local verify failed too
       }
     }

     if (!localOk) {
       setVerificationError("Incorrect PIN. Please try again.");
       setIsSyncing(false);
       return;
     }
     if (unreachable) {
       // Backup needs the server — fail closed (CON-51-05, exact copy).
       setVerificationError("Connect to enable cloud sync.");
       setIsSyncing(false);
       return;
     }
     // Device PIN confirmed, cloud disagrees — offer create-new with the
     // PIN preserved for migrate (DEC-51-02/03, D-51-02).
     setShowPinVerificationDialog(false);
     setShowNewAccountDialog(true);
     setIsSyncing(false);
   };

   const proceedWithBackupEnable = async () => {
     setIsSyncing(true);
     try {
       const [txResult, catResult, profResult] = await Promise.all([
           authFetch(`transactions?userId=${activeUserId}`),
           authFetch(`categories?userId=${activeUserId}`),
           authFetch(`userProfiles?userId=${activeUserId}`)
         ]);
         const txs = txResult.data || [];
         const cats = catResult.data || [];
         const profs = profResult.data || [];

        const hasCloudData = (Array.isArray(txs) && txs.length > 0) ||
          (Array.isArray(cats) && cats.length > 0) ||
          (Array.isArray(profs) && profs.length > 0);

         if (hasCloudData) {
           setShowConflictDialog(true);
         } else {
           setAutoBackup(true);
         }
     } catch (e) {
       console.error("Conflict check failed:", e);
       alert("Failed to check for server conflicts. Please check your connection.");
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
        // SPEC-59 D-59-04: the new cloud identity is the migrated profile name.
        await AsyncStorage.setItem("authName", profile?.name || "");
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

   const handleMergeLWW = async () => {
     setIsSyncing(true);
     setShowConflictDialog(false);

     try {
        console.info("[MergeLWW] Starting Last-Write-Wins merge...");

        const localTxs = await repos.transactions.getAll();
        const localCats = await repos.categories.getAll();
        const localDues = await repos.dues.getAll();
        const localSavings = await repos.savingsItems.getAll();
        const [localProfile] = await repos.profiles.getAll();

       const [txResult, catResult, dueResult, savResult, profResult] = await Promise.all([
          authFetch<Transaction[]>(`transactions?userId=${activeUserId}`),
          authFetch<Category[]>(`categories?userId=${activeUserId}`),
          authFetch<Due[]>(`dues?userId=${activeUserId}`),
          authFetch<SavingsItem[]>(`savingsItems?userId=${activeUserId}`),
          authFetch<UserProfile[]>(`userProfiles?userId=${activeUserId}`)
        ]);

        const remoteTxs = Array.isArray(txResult.data) ? txResult.data as Transaction[] : [];
        const remoteCats = Array.isArray(catResult.data) ? catResult.data as Category[] : [];
        const remoteDues = Array.isArray(dueResult.data) ? dueResult.data as Due[] : [];
        const remoteSavings = Array.isArray(savResult.data) ? savResult.data as SavingsItem[] : [];
        const remoteProfiles = Array.isArray(profResult.data) ? profResult.data as UserProfile[] : [];
       const remoteProfile = remoteProfiles[0] || null;

       const mergedTxs = mergeLWW(localTxs, remoteTxs);
       const mergedCats = mergeLWW(localCats, remoteCats);
       const mergedDues = mergeLWW(localDues, remoteDues);
       const mergedSavings = mergeLWW(localSavings, remoteSavings);

       console.info("[MergeLWW] Merged:", {
         transactions: mergedTxs.length,
         categories: mergedCats.length,
         dues: mergedDues.length,
         savingsItems: mergedSavings.length
       });

        await repos.transactions.upsertBulk(mergedTxs);
        await repos.categories.upsertBulk(mergedCats);
        await repos.dues.upsertBulk(mergedDues);
        await repos.savingsItems.upsertBulk(mergedSavings);

       if (localProfile && remoteProfile) {
         const localTs = (localProfile as unknown as Record<string, unknown>).updatedAt || 0;
         const remoteTs = (remoteProfile as unknown as Record<string, unknown>).updatedAt || 0;
         if (remoteTs > localTs) {
            await repos.profiles.upsert(remoteProfile as UserProfile);
         }
       }

       await setAutoBackup(true);

       console.info("[MergeLWW] Uploading merged data to cloud...");

        if (localProfile || remoteProfile) {
          const mergedProfile = remoteProfile && ((remoteProfile as unknown as Record<string, unknown>).updatedAt || 0) > ((localProfile as unknown as Record<string, unknown>)?.updatedAt || 0)
           ? remoteProfile
           : localProfile;

           if (mergedProfile) {
             const { data: profExisting } = await authFetch<UserProfile[]>(`userProfiles?userId=${activeUserId}`);

             if (Array.isArray(profExisting) && profExisting.length > 0) {
               await authFetch(`userProfiles/${(profExisting[0] as unknown as Record<string, unknown>).id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ ...mergedProfile, userId: activeUserId })
              }).catch(() => {});
            } else {
              await authFetch(`userProfiles`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ ...mergedProfile, userId: activeUserId })
              }).catch(() => {});
            }
          }
       }

        for (const c of mergedCats) {
          const { data: existing } = await authFetch(`categories?id=${c.id}`);

          if (Array.isArray(existing) && existing.length > 0) {
            await authFetch(`categories/${c.id}`, {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ ...c, userId: activeUserId })
            }).catch(() => {});
          } else {
            await authFetch(`categories`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ ...c, userId: activeUserId })
            }).catch(() => {});
          }
        }

        for (const d of mergedDues) {
          const { data: existing } = await authFetch(`dues?id=${d.id}`);

          if (Array.isArray(existing) && existing.length > 0) {
            await authFetch(`dues/${d.id}`, {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ ...d, userId: activeUserId })
            }).catch(() => {});
          } else {
            await authFetch(`dues`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ ...d, userId: activeUserId })
            }).catch(() => {});
          }
        }

       for (const s of mergedSavings) {
          const { data: existing } = await authFetch(`savingsItems?id=${s.id}`);

          if (Array.isArray(existing) && existing.length > 0) {
            await authFetch(`savingsItems/${s.id}`, {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ ...s, userId: activeUserId })
            }).catch(() => {});
          } else {
            await authFetch(`savingsItems`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ ...s, userId: activeUserId })
            }).catch(() => {});
          }
        }

        for (const t of mergedTxs) {
          const { data: existing } = await authFetch(`transactions?id=${t.id}`);

          const txData = {
            ...t,
            categoryId: t.category?.id ? String(t.category.id) : null,
            userId: activeUserId
          };

          if (Array.isArray(existing) && existing.length > 0) {
            await authFetch(`transactions/${t.id}`, {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(txData)
            }).catch(() => {});
          } else {
            await authFetch(`transactions`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(txData)
            }).catch(() => {});
          }
        }

       await Promise.all([
         refetchTx(),
         refetchCats(),
         refetchProfile()
       ]);

       alert("Merge completed! Data has been synchronized using Last-Write-Wins.");
       console.info("[MergeLWW] Merge completed successfully");

     } catch (e) {
       console.error("[MergeLWW] Merge failed:", e);
       alert("Merge failed. Please check your connection and try again.");
     } finally {
       setIsSyncing(false);
     }
   };

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

  const txFingerprint = (t: { amount?: unknown; type?: unknown; date?: unknown; note?: unknown }) => {
    const d = t.date ? new Date(String(t.date)) : null;
    const day = d && !isNaN(d.getTime()) ? d.toISOString().slice(0, 10) : "?";
    return `${Number(t.amount || 0)}|${String(t.type || "")}|${day}|${String(t.note ?? "").trim().toLowerCase()}`;
  };

  const previewRepair = async () => {
    if (!activeUserId || isLocal) return;
    setIsSyncing(true);
    try {
      const [txResult, queue] = await Promise.all([
        authFetch<Transaction[]>(`transactions?userId=${activeUserId}`),
        getSyncQueue(),
      ]);
      if (!txResult.ok || !Array.isArray(txResult.data)) {
        showMessage("error", "Repair Failed", "Could not reach the API. Please check your connection.");
        return;
      }
      const remote = txResult.data;
      const seen = new Set(remote.map(txFingerprint));
      const localTxs = await repos.transactions.getAll();
      const upload = localTxs.filter((t) => !seen.has(txFingerprint(t)));
      const groups = new Map<string, Transaction[]>();
      for (const t of remote) {
        const k = txFingerprint(t);
        const arr = groups.get(k);
        if (arr) arr.push(t); else groups.set(k, [t]);
      }
      const delIds: string[] = [];
      for (const [, rows] of groups) {
        if (rows.length < 2) continue;
        const sorted = [...rows].sort((a, b) =>
          String((a as unknown as Record<string, unknown>).createdAt || "").localeCompare(
            String((b as unknown as Record<string, unknown>).createdAt || "")
          ) || String(a.id).localeCompare(String(b.id))
        );
        delIds.push(...sorted.slice(1).map((t) => t.id));
      }
      const queued = queue.filter((q) => q.id.startsWith("transactions:")).length;
      if (upload.length === 0 && delIds.length === 0 && queued === 0) {
        showMessage("success", "Nothing to Repair", "No duplicates, unsynced rows, or queued transaction writes found.");
        return;
      }
      setRepairPreview({ upload, delIds, queued });
      setShowRepairConfirm(true);
    } catch (e) {
      console.error("Repair preview failed:", e);
      showMessage("error", "Repair Failed", "Could not check for duplicates. Please check your connection.");
    } finally {
      setIsSyncing(false);
    }
  };

  const executeRepair = async () => {
    if (!activeUserId || !repairPreview) return;
    setShowRepairConfirm(false);
    setIsSyncing(true);
    try {
      for (const t of repairPreview.upload) {
        await authFetch(`transactions`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...t, categoryId: t.category?.id ? String(t.category.id) : null, userId: activeUserId }),
        }).catch(() => {});
      }
      for (const id of repairPreview.delIds) {
        await authFetch(`transactions/${id}`, { method: "DELETE" }).catch(() => {});
      }
      const queue = await getSyncQueue();
      await saveSyncQueue(queue.filter((q) => !q.id.startsWith("transactions:")));
      await refetchTx();
      setRepairPreview(null);
      showMessage("success", "Repair Complete", "Uploaded, de-duplicated, and cleared queued transaction writes. Export a fresh backup to confirm.");
    } catch (e) {
      console.error("Repair failed:", e);
      showMessage("error", "Repair Failed", "Repair did not finish. Export your data and try again.");
    } finally {
      setIsSyncing(false);
    }
  };

  const handleClearData = async () => {
    if (!pinInput.trim()) return;
    const pin = pinInput.trim();

    setIsSyncing(true);

    // SPEC-51 D-51-01: converged server → local rule (DEC-51-01).
    // SPEC-59 D-59-02 (DEC-59-01): consume the fresh session-bound token on
    // success — leg-1 rotates the server sid (authService.js:92), so the
    // stored token would die under protect.js:28. The settings.tsx:212
    // Change pattern. No conflict branch: without deviceId the server never
    // returns sessionConflict.
    // SPEC-59 D-59-04 (DEC-59-02): verify against the login identity, not
    // the display name. Absent → "" → existing 401 → leg-2/fail-closed.
    const gateName = (await AsyncStorage.getItem("authName")) || "";
    let serverOk = false;
    try {
      const verifyRes = await fetch(`${API_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: gateName,
          passcode: pin,
          force: true,
        }),
      });
      serverOk = verifyRes.ok;
      if (serverOk) {
        try {
          const payload = (await verifyRes.json()) as { data?: { user?: { id: string }; token?: string } };
          const fresh = payload?.data;
          if (fresh?.token && fresh?.user?.id) {
            await login(fresh.user.id, fresh.token);
          } else {
            serverOk = false;
          }
        } catch {
          serverOk = false; // ok but unreadable → fall through to local verify
        }
      }
    } catch {
      // server unreachable — fall through to local verify
    }

    // Local fallback with Delete parity: SHA256-or-plaintext (DEC-51-02).
    let localOk = false;
    if (!serverOk && activeUserId) {
      try {
        const users = await getUsers();
        const user = users.find((u) => u.id === activeUserId);
        if (user) localOk = await verifyLocalPin(pin, user.passcode);
      } catch {
        // local verify failed too
      }
    }

if (!serverOk && !localOk) {
      showMessage("error", "Incorrect PIN", "Please try again.");
      setIsSyncing(false);
      return;
    }

    setShowPinPrompt(false);
    setShowDeleteConfirmation(true);
    setIsSyncing(false);
    return;
  };

  const executeClearData = async () => {
    if (!activeUserId) return;
    setIsSyncing(true);
    setShowDeleteConfirmation(false);
    setShowPinPrompt(false);
    try {
      if (activeUserId && !isLocal) {
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
         console.info("Clear data sync completed successfully");
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

      showMessage("success", "Cleared Successfully", "All data has been cleared successfully.", () => router.replace("/"));



      return;



    } catch (e) {
      console.error("Clear data sync failed:", e);
      showMessage("error", "Partial Clear", "Cleared local data, but cloud sync failed. Check your connection.", () => router.replace("/"));
      await clearAllLocalData();

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

  const exportJSONWeb = async () => {
    try {
      const json = await exportData();
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

  const exportJSONMobile = async () => {
    try {
      const json = await exportData();
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
    if (Platform.OS === "web") {
      await exportJSONWeb();
    } else {
      await exportJSONMobile();
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

  const verifyAccountPin = async (pin: string): Promise<boolean> => {
    // SPEC-59 D-59-04 (DEC-59-02): verify against the login identity, not
    // the display name. Absent → "" → existing 401 → leg-2/fail-closed.
    const gateName = (await AsyncStorage.getItem("authName")) || "";
    let verified = false;
    if (API_URL) {
      // SPEC-59 D-59-03 (DEC-59-01): consume the fresh session-bound token
      // on success — same S1 rationale (authService.js:92 rotates the sid).
      try {
        const res = await fetch(`${API_URL}/auth/login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: gateName,
            passcode: pin.trim(),
            force: true,
          }),
        });
        verified = res.ok;
        if (verified) {
          try {
            const payload = (await res.json()) as { data?: { user?: { id: string }; token?: string } };
            const fresh = payload?.data;
            if (fresh?.token && fresh?.user?.id) {
              await login(fresh.user.id, fresh.token);
            } else {
              verified = false;
            }
          } catch {
            verified = false; // ok but unreadable → fall through to local
          }
        }
      } catch {
        // server unreachable — fall through to local verification
      }
    }

    if (!verified && activeUserId) {
      try {
        const users = await getUsers();
        const user = users.find((u) => u.id === activeUserId);
        if (user) {
          const inputHash = await Crypto.digestStringAsync(
            Crypto.CryptoDigestAlgorithm.SHA256,
            pin.trim()
          );
          verified = user.passcode === inputHash || user.passcode === pin.trim();
        }
      } catch {
        // local verification failed too
      }
    }

    return verified;
  };

  const handleVerifyDeletePin = async () => {
    if (!deletePinInput.trim()) {
      setDeletePinError("PIN is required");
      return;
    }
    setIsSyncing(true);
    setDeletePinError("");
    try {
      const verified = await verifyAccountPin(deletePinInput);
      if (verified) {
        setPinVerified(true);
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
      await authFetch(`auth/account`, { method: "DELETE" });
      await clearAllLocalData();
      await deleteUser(activeUserId);
      await logout();
      closeDeleteDialog();
      showMessage("success", "Account Deleted", "Account and all associated data deleted successfully.", () => router.replace("/login"));
    } catch (e) {
      console.error("Delete account sync failed:", e);
      await clearAllLocalData();
      await deleteUser(activeUserId);
      await logout();
      closeDeleteDialog();
      showMessage("error", "Partial Deletion", "Failed to fully clear cloud data. Account was deleted locally.", () => router.replace("/login"));
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

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 110 }}>
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
                     {isLocal ? "Local-only account — stored on this device" : autoBackup ? "Cloud Sync Enabled" : "Cloud account — no local backup"}
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
                        No local backup
                      </Text>
                      <Text variant="bodySmall" style={{ color: paperTheme.colors.onSurfaceVariant, opacity: 0.8 }}>
                        Local backup is off. Data loads from the API and is not stored on this device.
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

            <SyncStatusCard autoBackup={autoBackup} isLocal={isLocal} />

            {!isLocal && (
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 8 }}>
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <List.Icon icon="cloud-sync" color={paperTheme.colors.onSurfaceVariant} />
                <Text variant="bodyLarge" style={{ marginLeft: 12, color: Platform.OS === "web" ? paperTheme.colors.onSurfaceVariant : paperTheme.colors.onSurface }}>Local backup</Text>
              </View>
              <Switch value={autoBackup} onValueChange={handleToggleAutoBackup} disabled={Platform.OS === "web"} />
            </View>
            )}

            <Divider style={{ marginVertical: 8 }} />

            {(!autoBackup && !isLocal && Platform.OS !== "web") && (
              <Button mode="outlined" icon="backup-restore" onPress={handleManualBackup} loading={isSyncing} disabled={isSyncing} style={{ marginVertical: 4 }}>
                Backup Data to Cloud API Now
              </Button>
            )}

            {(!autoBackup && !isLocal && Platform.OS !== "web") && (
              <Button mode="outlined" icon="cloud-download" onPress={handleRestoreFromCloud} loading={isSyncing} disabled={isSyncing} style={{ marginVertical: 4 }}>
                Restore Data from Cloud API
              </Button>
            )}
            {!isLocal && (
              <Button mode="outlined" icon="auto-fix" onPress={previewRepair} loading={isSyncing} disabled={isSyncing} style={{ marginVertical: 4 }}>
                Repair Transaction Duplicates
              </Button>
            )}

            <Button mode="outlined" icon="file-export" onPress={handleExportJSON} style={{ marginVertical: 4 }}>
              Export Data
            </Button>

            <Button mode="outlined" icon="file-import" onPress={handleImportJSON} style={{ marginVertical: 4 }}>
              Import Data
            </Button>

            <Button mode="contained-tonal" buttonColor={paperTheme.colors.errorContainer} textColor={paperTheme.colors.onErrorContainer} icon="delete-alert" onPress={() => setShowPinPrompt(true)} style={{ marginTop: 8 }}>
              Clear All Data
            </Button>

          </Card.Content>
        </Card>

        <Card style={{ marginBottom: 16 }}>
          <Card.Content>
            <Text variant="titleMedium" style={{ marginBottom: 16 }}>Account</Text>
            {isLocal && (
              <Button mode="contained" icon="cloud-upload-outline" onPress={() => handleToggleAutoBackup(true)} style={{ marginBottom: 8 }}>
                Make Online
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
        <NativeModal
          visible={showDeleteDialog}
          transparent
          animationType="fade"
          presentationStyle="overFullScreen"
          onRequestClose={closeDeleteDialog}
        >
          <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "rgba(0, 0, 0, 0.32)" }}>
            <Pressable style={StyleSheet.absoluteFill} onPress={closeDeleteDialog} />
            <Surface elevation={3} style={styles.dialog}>
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
            <Button mode="outlined" onPress={closeDeleteDialog}>Cancel</Button>
            <Button
              onPress={executeDelete}
              mode="contained"
              buttonColor={paperTheme.colors.error}
              textColor="#fff"
              loading={isSyncing}
              disabled={isSyncing || !pinVerified || !deleteConfirmed}
            >
              Delete Permanently
            </Button>
          </Dialog.Actions>
            </Surface>
          </View>
        </NativeModal>

        <ConfirmDialog
              visible={showRepairConfirm}
              title="Repair Duplicates?"
              message={
                repairPreview
                  ? `Upload ${repairPreview.upload.length} unsynced row(s), delete ${repairPreview.delIds.length} duplicate(s) (keeps oldest), and discard ${repairPreview.queued} queued transaction write(s). Server deletes are PERMANENT. Export your data first. Continue?`
                  : ""
              }
              confirmLabel="Repair"
              icon="database-refresh-outline"
              onConfirm={() => { executeRepair(); }}
              onCancel={() => { setShowRepairConfirm(false); setRepairPreview(null); }}
            />
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

        <Dialog visible={showPinVerificationDialog} onDismiss={() => setShowPinVerificationDialog(false)} style={styles.dialog}>
          <Dialog.Title>{isLocal ? "Make Online" : "Verify Account PIN"}</Dialog.Title>
          <Dialog.Content>
            <Text style={{ marginBottom: 16 }}>
              {isLocal
                ? `This will convert your account to an online account. Auto-backup will be enabled and this action cannot be reverted back to local-only.\n\nEnter your PIN for "${profile?.name || "your account"}" to proceed.`
                : `To enable cloud sync, please enter the PIN for "${profile?.name || "your account"}".`
              }
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
        </Dialog>

        <Dialog visible={showNewAccountDialog} onDismiss={() => setShowNewAccountDialog(false)} style={styles.dialog}>
          <Dialog.Title>{isLocal ? "Create Cloud Account" : "PIN Doesn't Match"}</Dialog.Title>
          <Dialog.Content>
            <Text style={{ marginBottom: 16 }}>
              {isLocal
                ? "No cloud account found. This will create a new cloud account and migrate all your local data. This action cannot be reverted back to local-only."
                : "Your PIN is correct on this device, but it doesn't match the cloud account. You can create a new cloud account with this PIN and migrate your local data to it."
              }
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

        <Dialog visible={showBackupDialog} onDismiss={() => setShowBackupDialog(false)} style={styles.dialog}>
          <Dialog.Title>Enable Auto-save</Dialog.Title>
          <Dialog.Content>
            <Text>Enabling Auto-save may overwrite your data during synchronization. Do you want to check for data on the server first?</Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setShowBackupDialog(false)}>Cancel</Button>
            <Button onPress={proceedWithBackupEnable} loading={isSyncing} disabled={isSyncing}>Proceed</Button>
          </Dialog.Actions>
        </Dialog>

        <Dialog visible={showConflictDialog} onDismiss={() => setShowConflictDialog(false)} style={styles.dialog}>
          <Dialog.Title>Sync Conflict</Dialog.Title>
          <Dialog.Content>
            <Text>We found data for your account on the server. How would you like to resolve this?</Text>
          </Dialog.Content>
           <Dialog.Actions style={{ flexDirection: 'column' }}>
              <Button mode="contained" onPress={handleMergeLWW} loading={isSyncing} disabled={isSyncing} style={{ width: '100%', marginBottom: 8 }}>
                Merge (Last Write Wins)
              </Button>
              <Button mode="outlined" onPress={() => { setShowConflictDialog(false); setAutoBackup(true); handleManualBackup(); }} style={{ width: '100%', marginBottom: 8 }}>
                Keep Local Only
              </Button>
              <Button mode="outlined" onPress={() => { setShowConflictDialog(false); setAutoBackup(true); performRestore(); }} style={{ width: '100%', marginBottom: 8 }}>
                Keep Cloud Only
              </Button>
              <Button onPress={() => setShowConflictDialog(false)}>Cancel</Button>
            </Dialog.Actions>
         </Dialog>

        {/* SPEC-57: conditional mount — an always-mounted KeyboardAvoidingView
            renders a full-height flex layer on web and swallows scroll/taps. */}
        {showPinPrompt && (
        <NativeModal
          visible={showPinPrompt}
          transparent
          animationType="fade"
          presentationStyle="overFullScreen"
          onRequestClose={() => setShowPinPrompt(false)}
        >
          <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "rgba(0, 0, 0, 0.32)" }}>
            <Pressable style={StyleSheet.absoluteFill} onPress={() => setShowPinPrompt(false)} />
            <KeyboardAvoidingView
              behavior={Platform.OS === "ios" ? "padding" : "height"}
              style={{ width: "100%", alignItems: "center" }}
            >
            <Surface elevation={3} style={styles.dialog}>
          <Dialog.Title style={{ textAlign: "center" }}>Enter PIN to Clear Data</Dialog.Title>
          <Dialog.Content>
            <Text style={{ marginBottom: 16, textAlign: "center" }}>This action cannot be undone. All local data will be permanently deleted.</Text>
            <TextInput
              label="PIN"
              value={pinInput}
              onChangeText={(t) => setPinInput(t.replace(/[^0-9]/g, "").slice(0, 4))}
              secureTextEntry
              keyboardType="numeric"
              maxLength={4}
            />
          </Dialog.Content>
          <Dialog.Actions style={{ justifyContent: "center", gap: 12 }}>
            <Button mode="outlined" onPress={() => setShowPinPrompt(false)}>Cancel</Button>
            <Button mode="contained" buttonColor={paperTheme.colors.error} textColor="#fff" onPress={handleClearData} loading={isSyncing} disabled={isSyncing}>Clear Data</Button>
          </Dialog.Actions>
            </Surface>
            </KeyboardAvoidingView>
          </View>
        </NativeModal>
        )}

        <NativeModal
          visible={showDeleteConfirmation}
          transparent
          animationType="fade"
          presentationStyle="overFullScreen"
          onRequestClose={() => setShowDeleteConfirmation(false)}
        >
          <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "rgba(0, 0, 0, 0.32)" }}>
            <Pressable style={StyleSheet.absoluteFill} onPress={() => setShowDeleteConfirmation(false)} />
            <Surface elevation={3} style={styles.dialog}>
          <Dialog.Title style={{ textAlign: "center" }}>Are you absolutely sure?</Dialog.Title>
          <Dialog.Content style={styles.dialogContent}>
            <Text style={{ marginBottom: 16, textAlign: "center", alignSelf: "center", width: "100%" }}>
              This will permanently delete all your transactions, dues, and allocations. This action cannot be undone.
            </Text>
          </Dialog.Content>
          <Dialog.Actions style={{ justifyContent: "center", gap: 12 }}>
            <Button mode="outlined" onPress={() => setShowDeleteConfirmation(false)} disabled={isSyncing}>Cancel</Button>
            <Button
              onPress={executeClearData}
              mode="contained"
              buttonColor={paperTheme.colors.error}
              textColor="#fff"
              disabled={isSyncing}
              loading={isSyncing}
            >
              CLEAR EVERYTHING
            </Button>
          </Dialog.Actions>
            </Surface>
          </View>
        </NativeModal>

        <NativeModal
          visible={showChangePasscodeDialog}
          transparent
          animationType="fade"
          presentationStyle="overFullScreen"
          onRequestClose={closeChangePasscodeDialog}
        >
          <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "rgba(0, 0, 0, 0.32)" }}>
            <Pressable style={StyleSheet.absoluteFill} onPress={closeChangePasscodeDialog} />
            <Surface elevation={3} style={styles.dialog}>
          {isPasscodeEnabled ? (
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 4 }}>
              <Dialog.Title>{pinStep === 1 ? "Change Passcode" : "Enter New Passcode"}</Dialog.Title>
              <IconButton icon="close" onPress={closeChangePasscodeDialog} />
            </View>
          ) : (
            <Dialog.Title>{isLocal ? "Set Passcode" : "Change Passcode"}</Dialog.Title>
          )}
          <Dialog.Content>
            {isPasscodeEnabled ? (
              // Step 1: Verify current passcode when a lock exists (CON-10: same source as entry button)
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
            ) : isLocal ? (
              // No lock yet (Local): directly show new passcode fields
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
            ) : (
              // No app lock yet (Cloud): server owns the PIN, so current is required (DEC-05).
              <View>
                <Text style={{ marginBottom: 16 }}>
                  Enter your current PIN and choose a new one.
                </Text>
                <TextInput
                  label="Current Passcode"
                  value={currentPasscodeInput}
                  onChangeText={(t) => {
                    setCurrentPasscodeInput(t.replace(/[^0-9]/g, "").slice(0, 4));
                    setChangePasscodeError("");
                  }}
                  secureTextEntry
                  keyboardType="numeric"
                  maxLength={4}
                  style={{ marginBottom: 12 }}
                />
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
            {!isLocal && !isOnline ? (
              <Text style={{ color: paperTheme.colors.error, marginTop: 8 }}>
                Connect to change your Cloud PIN.
              </Text>
            ) : null}
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={closeChangePasscodeDialog}>Cancel</Button>
            {isPasscodeEnabled ? (
              pinStep === 1 ? (
                <Button
                  onPress={async () => {
                    const current = currentPasscodeInput.trim();
                    if (!/^\d{4}$/.test(current)) {
                      setPinError("Enter your current 4-digit PIN.");
                      return;
                    }
                    // Local verifies against the lock here; Cloud is
                    // format-gated only — the server verdict wins at save (DEC-05).
                    if (isLocal && !(await verifyPasscode(current))) {
                      setPinError("Incorrect Current PIN. Try again.");
                      setCurrentPasscodeInput("");
                      return;
                    }
                    setPinStep(2);
                    setPinError(null);
                  }}
                  disabled={currentPasscodeInput.trim().length !== 4}
                >
                  Verify Current PIN
                </Button>
              ) : (
                <Button
                  onPress={handleChangePasscode}
                  disabled={newPasscodeInput.length !== 4 || newPasscodeInput !== confirmPasscodeInput || (currentPasscodeInput.trim() !== "" && newPasscodeInput.trim() === currentPasscodeInput.trim()) || (!isLocal && !isOnline)}
                >
                  Set Passcode
                </Button>
              )
            ) : (
              <Button
                onPress={handleChangePasscode}
                disabled={newPasscodeInput.length !== 4 || newPasscodeInput !== confirmPasscodeInput || (currentPasscodeInput.trim() !== "" && newPasscodeInput.trim() === currentPasscodeInput.trim()) || (!isLocal && !isOnline)}
              >
                Set Passcode
              </Button>
            )}
          </Dialog.Actions>
            </Surface>
          </View>
        </NativeModal>

        {/* SPEC-58 D-58-03: last Portal child, so this shared success/error
            dialog always paints above whichever dialog raised it. */}
        <Dialog visible={messageDialog.visible} onDismiss={closeMessage} style={styles.dialog}>
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
      </Portal>
    </View>
  );
}
