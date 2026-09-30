// SPEC-34 CON-03 — offline banner + gate for API-only mode (Cloud+ON).
// Persistent banner with a one-tap [Turn OFF] action over gated content.
// Turning OFF performs zero fetches (CON-03): memory flag + stored mode flag
// only; existing cache seeds the log, else it starts empty.
import React, { useCallback, useEffect, useState } from "react";
import { View, StyleSheet, Platform } from "react-native";
import { Banner, Text, Button, IconButton, useTheme } from "react-native-paper";
import { useNetwork } from "../context/NetworkContext";
import { useAuthData } from "../context/AuthContext";
import { useUserProfile } from "../context/UserProfileContext";
import { useIsLocalAccount } from "../utils/authMode";
import { resolveActivePlane, switchToOfflineMode, DataPlane } from "../utils/apiOnly";
import { setSetting } from "../utils/db";

export function useApiOnlyOffline(): {
  plane: DataPlane;
  gated: boolean;
  turnOff: () => Promise<void>;
  retry: () => Promise<boolean>;
} {
  const { isOnline, checkConnectivity } = useNetwork();
  const { activeUserId } = useAuthData();
  const isLocal = useIsLocalAccount();
  const { profile, updateProfile } = useUserProfile();
  const [plane, setPlane] = useState<DataPlane>("local-persist");

  useEffect(() => {
    let cancelled = false;
    resolveActivePlane({
      platformOs: Platform.OS,
      isLocal,
      profileAutoBackup: profile?.autoBackup,
    }).then((p) => {
      if (!cancelled) setPlane(p);
    });
    return () => {
      cancelled = true;
    };
  }, [isLocal, profile?.autoBackup]);

  // CON-03 OFF-while-offline: zero fetch by construction (helper performs
  // no network calls); the stored flag preserves the choice across reloads.
  const turnOff = useCallback(async () => {
    await switchToOfflineMode({
      setProfileFlag: async (values) => {
        await updateProfile(values);
      },
      setStoredFlag: async (value) => {
        await setSetting("autoBackup", value);
      },
    });
  }, [updateProfile]);

  const gated = !!activeUserId && plane === "api-only" && !isOnline;
  return { plane, gated, turnOff, retry: checkConnectivity };
}

export function ApiOfflineBanner() {
  const { gated, turnOff, retry } = useApiOnlyOffline();

  if (!gated) return null;

  return (
    <Banner
      visible={true}
      icon="cloud-off"
      actions={[
        { label: "Turn OFF", onPress: () => { turnOff(); } },
        { label: "Retry", onPress: () => { retry(); } },
      ]}
    >
      You&apos;re offline. Cloud data is unavailable — turn auto-backup OFF to
      keep using the app with on-device data.
    </Banner>
  );
}

export function ApiOfflineGateBody() {
  const theme = useTheme();
  const { retry } = useApiOnlyOffline();

  return (
    <View style={styles.gate}>
      <IconButton icon="cloud-off" size={48} iconColor={theme.colors.outline} />
      <Text variant="titleMedium" style={{ marginTop: 8 }}>
        You&apos;re offline
      </Text>
      <Text
        variant="bodyMedium"
        style={{ color: theme.colors.outline, textAlign: "center", marginTop: 4 }}
      >
        Your cloud data isn&apos;t available right now.
      </Text>
      <Button mode="outlined" onPress={() => { retry(); }} style={{ marginTop: 16 }}>
        Retry
      </Button>
    </View>
  );
}

const styles = StyleSheet.create({
  gate: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
});
