import { useState } from "react";
import { View, ScrollView, Alert, Platform, StyleSheet } from "react-native";
import { Appbar, List, RadioButton, Text, Card, Switch, Divider, Button, Avatar, Portal, Dialog, TextInput, useTheme as usePaperTheme, IconButton } from "react-native-paper";
import { useRouter } from "expo-router";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import * as DocumentPicker from "expo-document-picker";
import { useRepositories } from "../../context/RepositoryContext";
import { setSetting, clearAllLocalData, exportData, importData, deleteUser, mergeLWW, API_URL, addUser, saveUserProfile, initDb, getUsers } from "../../utils/db";
import { useAuth } from "../../context/AuthContext";
import { useCurrency, CURRENCIES, CurrencyCode } from "../../context/CurrencyContext";
import { useAppTheme } from "../../context/ThemeContext";
import { useUserProfile } from "../../context/UserProfileContext";
import { useLanguage } from "../../context/LanguageContext";
import { usePasscode } from "../../context/PasscodeContext";
import { useTransactionsActions } from "../../context/TransactionsContext";
import { useCategoriesActions } from "../../context/CategoriesContext";
import { authFetch } from "../../utils/apiClient";
import { useSyncStatus } from "../../hooks/useSyncStatus";
import { useNetwork } from "../../context/NetworkContext";
import * as Crypto from 'expo-crypto';
import { Transaction, Category, Due, SavingsItem, UserProfile } from "../../types";

function SyncStatusCard({ autoBackup }: { autoBackup: boolean }) {
  const { isOnline, checkConnectivity, isChecking } = useNetwork();
  const { pending, lastSyncedAt, refresh: retryAll } = useSyncStatus();
  const paperTheme = usePaperTheme();

  const getStatusColor = () => {
    if (!autoBackup) return { icon: "cloud-off-outline", text: "Backup Disabled", color: paperTheme.colors.error };
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
        backgroundColor: !autoBackup
          ? paperTheme.colors.errorContainer
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
            Last sync: {formatLastSync()}
          </Text>
        </View>
      </View>
      {!autoBackup ? null : pending > 0 && isOnline ? (
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
  const { currency, setCurrency, decimalPlaces, setDecimalPlaces } = useCurrency();
  const { isDarkMode, toggleTheme } = useAppTheme();
  const { profile, updateProfile, resetProfileToDefaults, refetch: refetchProfile } = useUserProfile();
  const { language, setLanguage, t } = useLanguage();
  const { isPasscodeEnabled, setIsPasscodeEnabled, setPasscode, setIsUnlocked } = usePasscode();
  const { activeUserId, logout, login } = useAuth();
  const { refetch: refetchTx } = useTransactionsActions();
  const { refetch: refetchCats } = useCategoriesActions();
  const repos = useRepositories();

  const handleLogout = async () => {
    await logout();
    router.replace("/auth");
  };

  const handleTogglePasscode = (enabled: boolean) => {
    if (enabled) {
      setShowPinSetup(true);
    } else {
      setIsPasscodeEnabled(false);
      setPasscode(null);
    }
  };

  const confirmPinSetup = () => {
    if (pinSetupInput.length !== 4 || !/^\d{4}$/.test(pinSetupInput)) {
      Alert.alert("Invalid PIN", "Please enter a 4-digit PIN.");
      return;
    }
    setPasscode(pinSetupInput);
    setIsPasscodeEnabled(true);
    setIsUnlocked(false);
    setShowPinSetup(false);
    setPinSetupInput("");
  };

   const autoBackup = profile?.autoBackup ?? true;
  const [isSyncing, setIsSyncing] = useState(false);
  const [showPinPrompt, setShowPinPrompt] = useState(false);
  const [showPinSetup, setShowPinSetup] = useState(false);
  const [pinSetupInput, setPinSetupInput] = useState("");
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showBackupDialog, setShowBackupDialog] = useState(false);
  const [showPinVerificationDialog, setShowPinVerificationDialog] = useState(false);
  const [pinVerificationInput, setPinVerificationInput] = useState("");
  const [verificationError, setVerificationError] = useState("");
  const [showNewAccountDialog, setShowNewAccountDialog] = useState(false);
  const [showConflictDialog, setShowConflictDialog] = useState(false);
  const [pinInput, setPinInput] = useState("");

   const setAutoBackup = async (value: boolean) => {
     await updateProfile({ autoBackup: value });
     await setSetting('autoBackup', value.toString());
   };

   const handleToggleAutoBackup = async (val: boolean) => {
     if (val) {
       setVerificationError("");
       setPinVerificationInput("");
       setShowPinVerificationDialog(true);
     } else {
       setAutoBackup(false);
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
       const response = await fetch(`${API_URL}/auth/login`, {
         method: "POST",
         headers: { "Content-Type": "application/json" },
         body: JSON.stringify({
           name: profile?.name || "",
           passcode: pinVerificationInput.trim(),
           force: true
         }),
       });

       if (response.ok) {
         setShowPinVerificationDialog(false);
         setPinVerificationInput("");
         const data = (await response.json()).data;
         await login(data.user.id, data.token);
         await setSetting('autoBackup', 'true');
         await proceedWithBackupEnable();
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

  const handleClearData = async () => {
    if (!pinInput.trim()) return;

    setIsSyncing(true);

    let pinVerified = false;
    try {
      const verifyRes = await fetch(`${API_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: profile?.name || "",
          passcode: pinInput.trim(),
          force: true,
        }),
      });
      pinVerified = verifyRes.ok;
    } catch {
      // server unreachable — fall through to local verify
    }

    if (!pinVerified && activeUserId) {
      try {
        const users = await getUsers();
        const user = users.find((u) => u.id === activeUserId);
        if (user) {
          const inputHash = await Crypto.digestStringAsync(
            Crypto.CryptoDigestAlgorithm.SHA256,
            pinInput.trim()
          );
          pinVerified = user.passcode === inputHash;
        }
      } catch {
        // local verify failed too
      }
    }

    if (!pinVerified) {
      alert("Incorrect PIN. Please try again.");
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

  const handleExportJSON = async () => {
    try {
      const json = await exportData();
      const fileUri = `${FileSystem.documentDirectory}WiseWallet_Backup_${Date.now()}.json`;
      const encoding = FileSystem.EncodingType ? FileSystem.EncodingType.UTF8 : 'utf8';
      await FileSystem.writeAsStringAsync(fileUri, json, { encoding });
      await Sharing.shareAsync(fileUri);
    } catch (e) {
      console.error(e);
      alert("Export failed");
    }
  };

  const handleImportJSON = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: 'application/json' });
      if (!result.canceled && result.assets && result.assets.length > 0) {
        const fileUri = result.assets[0].uri;
        const encoding = FileSystem.EncodingType ? FileSystem.EncodingType.UTF8 : 'utf8';
        const jsonString = await FileSystem.readAsStringAsync(fileUri, { encoding });
        await importData(jsonString);
        alert("Import successful! Data has been restored. Please restart the app or switch accounts to see the changes.");
      }
    } catch (e) {
      console.error(e);
      alert("Import failed");
    }
  };

  const handleDeleteAccount = () => {
    setShowDeleteDialog(true);
  };

  const executeDelete = async () => {
    if (activeUserId) {
      setIsSyncing(true);
      try {
        await authFetch(`auth/account`, { method: "DELETE" });
        await clearAllLocalData();
        await deleteUser(activeUserId);
        await logout();
        router.replace("/auth");
        alert("Account and all associated data deleted successfully.");
      } catch (e) {
        console.error("Delete account sync failed:", e);
        alert("Failed to fully clear cloud data. Account was deleted locally.");
        await clearAllLocalData();
        await deleteUser(activeUserId);
        await logout();
        router.replace("/auth");
      } finally {
        setIsSyncing(false);
        setShowDeleteDialog(false);
      }
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

      alert("Cloud data restored locally and UI refreshed!");
    } catch (e) {
      console.error(e);
      alert("Restore failed. Make sure the API is online.");
    } finally {
      setIsSyncing(false);
    }
  };

  const handleRestoreFromCloud = () => {
     console.info("[Restore] Button clicked. Platform:", Platform.OS);
    if (Platform.OS === 'web') {
      const confirm = window.confirm("This will overwrite all your local data with the data from your cloud backup. Are you sure?");
      if (confirm) {
        performRestore();
      }
    } else {
      Alert.alert(
        "Restore from Cloud",
        "This will overwrite all your local data with the data from your cloud backup. Are you sure?",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Restore",
            style: "destructive",
            onPress: performRestore
          }
        ]
      );
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: paperTheme.colors.background }}>
      <Appbar.Header style={{ backgroundColor: paperTheme.colors.background, elevation: 0 }}>
        <Appbar.Content title={t("settings")} titleStyle={{ fontWeight: "700" }} />
      </Appbar.Header>

      <ScrollView contentContainerStyle={{ padding: 16 }}>
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
                   {autoBackup ? "Cloud Sync Enabled" : "Local Profile (Offline)"}
                 </Text>
               </View>
            </View>
          </Card.Content>
        </Card>

        {!autoBackup && (
          <Card style={{ marginBottom: 16, backgroundColor: paperTheme.colors.errorContainer }}>
            <Card.Content>
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <List.Icon icon="cloud-off-outline" color={paperTheme.colors.onErrorContainer} />
                <View style={{ marginLeft: 12, flex: 1 }}>
                  <Text variant="titleSmall" style={{ color: paperTheme.colors.onErrorContainer, fontWeight: "600" }}>
                    Local Mode (Backup Disabled)
                  </Text>
                  <Text variant="bodySmall" style={{ color: paperTheme.colors.onErrorContainer, opacity: 0.8 }}>
                    Your data is only stored on this device. Enable Auto-Backup to sync across devices and prevent data loss.
                  </Text>
                </View>
              </View>
            </Card.Content>
          </Card>
        )}

        {/* General Settings */}
        <Card style={{ marginBottom: 16 }}>
          <Card.Content>
            <Text variant="titleMedium" style={{ marginBottom: 16 }}>{t("categories")}</Text>
            <List.Item
              title={t("categories")}
              description="Manage income & expense categories"
              left={props => <List.Icon {...props} icon="shape-outline" />}
              right={props => <List.Icon {...props} icon="chevron-right" />}
              onPress={() => router.push("/category-settings")}
            />
          </Card.Content>
        </Card>

        <Card style={{ marginBottom: 16 }}>
          <Card.Content>
            <Text variant="titleMedium" style={{ marginBottom: 16 }}>{t("appearance")}</Text>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 8 }}>
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <List.Icon icon="theme-light-dark" color={paperTheme.colors.onSurfaceVariant} />
                <Text variant="bodyLarge" style={{ marginLeft: 12 }}>{t("darkMode")}</Text>
              </View>
              <Switch value={isDarkMode} onValueChange={toggleTheme} />
            </View>

            <Divider style={{ marginVertical: 8 }} />

            <Text variant="titleSmall" style={{ marginTop: 8 }}>{t("language")}</Text>
            <RadioButton.Group onValueChange={(v) => setLanguage(v as "en" | "tl")} value={language}>
              <RadioButton.Item label="English" value="en" />
              <RadioButton.Item label="Filipino" value="tl" />
            </RadioButton.Group>
          </Card.Content>
        </Card>

        <Card style={{ marginBottom: 16 }}>
          <Card.Content>
            <Text variant="titleMedium" style={{ marginBottom: 16 }}>{t("currency")}</Text>
            <RadioButton.Group onValueChange={(value) => setCurrency(value as CurrencyCode)} value={currency.code}>
              <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
                {Object.values(CURRENCIES).map((curr) => (
                  <View key={curr.code} style={{ width: "50%" }}>
                    <RadioButton.Item
                      label={curr.code}
                      value={curr.code}
                      status={currency.code === curr.code ? 'checked' : 'unchecked'}
                    />
                  </View>
                ))}
              </View>
            </RadioButton.Group>

            <Divider style={{ marginVertical: 8 }} />

            <Text variant="titleSmall" style={{ marginTop: 8 }}>Decimal Points</Text>
            <RadioButton.Group onValueChange={(v) => setDecimalPlaces(parseInt(v))} value={decimalPlaces.toString()}>
              <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                <RadioButton.Item label="0" value="0" />
                <RadioButton.Item label="1" value="1" />
                <RadioButton.Item label="2" value="2" />
              </View>
            </RadioButton.Group>
          </Card.Content>
        </Card>

        <Card style={{ marginBottom: 16 }}>
          <Card.Content>
            <Text variant="titleMedium" style={{ marginBottom: 16 }}>Data Management</Text>

            <SyncStatusCard autoBackup={autoBackup} />

            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 8 }}>
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <List.Icon icon="cloud-sync" color={paperTheme.colors.onSurfaceVariant} />
                <Text variant="bodyLarge" style={{ marginLeft: 12 }}>Auto-Backup</Text>
              </View>
              <Switch value={autoBackup} onValueChange={handleToggleAutoBackup} />
            </View>

            <Divider style={{ marginVertical: 8 }} />

            {!autoBackup && (
              <Button mode="outlined" icon="backup-restore" onPress={handleManualBackup} loading={isSyncing} disabled={isSyncing} style={{ marginVertical: 4 }}>
                Backup Data to Cloud API Now
              </Button>
            )}

            {!autoBackup && (
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
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  <List.Icon icon="lock-outline" color={paperTheme.colors.onSurfaceVariant} />
                  <Text variant="bodyLarge" style={{ marginLeft: 12 }}>{t("passcode")}</Text>
                </View>
                <Switch value={isPasscodeEnabled} onValueChange={handleTogglePasscode} />
              </View>
              <Text variant="bodySmall" style={{ marginLeft: 52, color: paperTheme.colors.outline }}>
                Require PIN to unlock the app on startup
              </Text>
            </View>
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
        <Dialog visible={showDeleteDialog} onDismiss={() => setShowDeleteDialog(false)}>
          <Dialog.Title>Delete Account</Dialog.Title>
          <Dialog.Content>
            <Text style={{ color: paperTheme.colors.error }}>WARNING: This action is permanent and cannot be undone.</Text>
            <Text style={{ marginTop: 8 }}>All your data in the cloud and on this device will be PERMANENTLY deleted. We recommend downloading a JSON backup first.</Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setShowDeleteDialog(false)}>Cancel</Button>
            <Button onPress={executeDelete} textColor={paperTheme.colors.error} loading={isSyncing} disabled={isSyncing}>Delete Permanently</Button>
          </Dialog.Actions>
        </Dialog>

        <Dialog visible={showPinVerificationDialog} onDismiss={() => setShowPinVerificationDialog(false)}>
          <Dialog.Title>Verify Account PIN</Dialog.Title>
          <Dialog.Content>
            <Text style={{ marginBottom: 16 }}>
              To enable cloud sync, please enter the PIN for "{profile?.name || "your account"}".
            </Text>
            <TextInput
              label="Current PIN"
              value={pinVerificationInput}
              onChangeText={(t) => { setPinVerificationInput(t); setVerificationError(""); }}
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

        <Dialog visible={showNewAccountDialog} onDismiss={() => setShowNewAccountDialog(false)}>
          <Dialog.Title>PIN Doesn't Match</Dialog.Title>
          <Dialog.Content>
            <Text style={{ marginBottom: 16 }}>
              The PIN you entered doesn't match the cloud account. Would you like to create a new cloud account with this PIN and migrate all your local data to it?
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

        <Dialog visible={showBackupDialog} onDismiss={() => setShowBackupDialog(false)}>
          <Dialog.Title>Enable Auto-save</Dialog.Title>
          <Dialog.Content>
            <Text>Enabling Auto-save may overwrite your data during synchronization. Do you want to check for data on the server first?</Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setShowBackupDialog(false)}>Cancel</Button>
            <Button onPress={proceedWithBackupEnable} loading={isSyncing} disabled={isSyncing}>Proceed</Button>
          </Dialog.Actions>
        </Dialog>

        <Dialog visible={showConflictDialog} onDismiss={() => setShowConflictDialog(false)}>
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

        <Dialog visible={showPinPrompt} onDismiss={() => setShowPinPrompt(false)}>
          <Dialog.Title>Enter PIN to Clear Data</Dialog.Title>
          <Dialog.Content>
            <Text style={{ marginBottom: 16 }}>This action cannot be undone. All local data will be permanently deleted.</Text>
            <TextInput
              label="PIN"
              value={pinInput}
              onChangeText={setPinInput}
              secureTextEntry
              keyboardType="numeric"
              maxLength={4}
            />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setShowPinPrompt(false)}>Cancel</Button>
            <Button onPress={handleClearData} textColor={paperTheme.colors.error}>Clear Data</Button>
          </Dialog.Actions>
        </Dialog>

        <Dialog visible={showPinSetup} onDismiss={() => { setShowPinSetup(false); setPinSetupInput(""); }}>
          <Dialog.Title>Set Passcode</Dialog.Title>
          <Dialog.Content>
            <Text style={{ marginBottom: 16 }}>Enter a 4-digit PIN to secure the app on startup.</Text>
            <TextInput
              label="New PIN"
              value={pinSetupInput}
              onChangeText={setPinSetupInput}
              secureTextEntry
              keyboardType="numeric"
              maxLength={4}
            />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => { setShowPinSetup(false); setPinSetupInput(""); }}>Cancel</Button>
            <Button onPress={confirmPinSetup}>Set Passcode</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </View>
  );
}
