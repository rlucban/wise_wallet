import React from "react";
import { Modal as NativeModal, View, StyleSheet, Pressable } from "react-native";
import { Dialog, Text, Button, Surface, useTheme } from "react-native-paper";

interface ConfirmDialogProps {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  icon?: string;
  loading?: boolean;
  hideCancel?: boolean;
  confirmColor?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmDialog({
  visible,
  title,
  message,
  confirmLabel = "Delete",
  cancelLabel = "Cancel",
  icon = "alert-outline",
  loading = false,
  hideCancel = false,
  confirmColor,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const theme = useTheme();

  return (
    <NativeModal
      visible={visible}
      transparent
      animationType="fade"
      presentationStyle="overFullScreen"
      onRequestClose={loading ? undefined : onCancel}
    >
      <View style={styles.scrim}>
        <Pressable style={StyleSheet.absoluteFill} onPress={loading ? undefined : onCancel} />
        <Surface elevation={3} style={styles.dialog}>
          <Dialog.Icon icon={icon} />
          <Dialog.Title style={{ textAlign: "center" }}>{title}</Dialog.Title>
          <Dialog.Content>
            <Text variant="bodyMedium" style={{ textAlign: "center" }}>
              {message}
            </Text>
          </Dialog.Content>
          <Dialog.Actions style={{ justifyContent: "center" }}>
            {!hideCancel && (
              <Button onPress={onCancel} disabled={loading}>
                {cancelLabel}
              </Button>
            )}
            <Button
              mode="contained"
              buttonColor={confirmColor ?? theme.colors.error}
              onPress={onConfirm}
              loading={loading}
              disabled={loading}
            >
              {confirmLabel}
            </Button>
          </Dialog.Actions>
        </Surface>
      </View>
    </NativeModal>
  );
}

const styles = StyleSheet.create({
  scrim: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.32)",
  },
  dialog: {
    maxWidth: 480,
    width: "90%",
    alignSelf: "center",
    marginHorizontal: 0,
    borderRadius: 16,
    overflow: "hidden",
  },
});
