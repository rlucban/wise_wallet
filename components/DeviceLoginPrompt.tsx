import React from 'react';
import { StyleSheet } from 'react-native';
import { Dialog, Portal, Text, Button, useTheme } from 'react-native-paper';
import { useAuthData, useAuthActions } from '../context/AuthContext';

interface DeviceLoginPromptProps {
  visible?: boolean;
}

export function DeviceLoginPrompt({ visible }: DeviceLoginPromptProps) {
  const theme = useTheme();
  const { pendingLogin } = useAuthData();
  const { approveLogin, rejectLogin } = useAuthActions();

  const isVisible = visible !== undefined ? visible : !!pendingLogin;

  if (!isVisible && !pendingLogin) {
    return null;
  }

  const deviceLabel = pendingLogin?.deviceId || 'Device 2';

  return (
    <Portal>
      <Dialog visible={isVisible} dismissable={false} style={styles.dialog}>
        <Dialog.Title style={styles.title}>
          {deviceLabel} is trying to log in
        </Dialog.Title>
        <Dialog.Content>
          <Text variant="bodyMedium" style={styles.content}>
            Another device is attempting to log into this account. Would you like to allow this login or cancel it?
          </Text>
        </Dialog.Content>
        <Dialog.Actions style={styles.actions}>
          <Button
            mode="outlined"
            onPress={rejectLogin}
            textColor={theme.colors.error}
            style={styles.button}
          >
            Cancel
          </Button>
          <Button
            mode="contained"
            onPress={approveLogin}
            style={styles.button}
          >
            Allow
          </Button>
        </Dialog.Actions>
      </Dialog>
    </Portal>
  );
}

const styles = StyleSheet.create({
  dialog: {
    maxWidth: 480,
    width: '90%',
    alignSelf: 'center',
    borderRadius: 16,
  },
  title: {
    textAlign: 'center',
  },
  content: {
    textAlign: 'center',
    marginVertical: 8,
  },
  actions: {
    justifyContent: 'space-around',
    paddingBottom: 16,
    paddingHorizontal: 16,
  },
  button: {
    minWidth: 100,
  },
});
