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
    <Dialog
      visible={visible}
      onDismiss={loading ? undefined : onCancel}
      style={{ maxWidth: 480, width: "90%", alignSelf: "center", marginHorizontal: 0 }}
    >
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
    </Dialog>
  );
}
