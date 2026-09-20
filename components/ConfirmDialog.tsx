import React from "react";
import { Dialog, Text, Button, useTheme } from "react-native-paper";

interface ConfirmDialogProps {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  icon?: string;
  loading?: boolean;
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
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const theme = useTheme();

  return (
    <Dialog visible={visible} onDismiss={loading ? undefined : onCancel}>
      <Dialog.Icon icon={icon} />
      <Dialog.Title style={{ textAlign: "center" }}>{title}</Dialog.Title>
      <Dialog.Content>
        <Text variant="bodyMedium" style={{ textAlign: "center" }}>
          {message}
        </Text>
      </Dialog.Content>
      <Dialog.Actions style={{ justifyContent: "center" }}>
        <Button onPress={onCancel} disabled={loading}>
          {cancelLabel}
        </Button>
        <Button
          mode="contained"
          buttonColor={theme.colors.error}
          onPress={onConfirm}
          loading={loading}
          disabled={loading}
        >
          {confirmLabel}
        </Button>
      </Dialog.Actions>
    </Dialog>
  );
}
