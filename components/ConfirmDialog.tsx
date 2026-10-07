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
  tone?: "danger" | "success";
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmDialog({
  visible,
  title,
  message,
  confirmLabel = "Delete",
  cancelLabel = "Cancel",
  icon,
  loading = false,
  tone = "danger",
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const theme = useTheme();
  const resolvedIcon = icon ?? (tone === "success" ? "check-circle-outline" : "alert-outline");

  return (
    <Dialog
      visible={visible}
      onDismiss={loading ? undefined : onCancel}
      style={{ maxWidth: 480, width: "90%", alignSelf: "center" }}
    >
      <Dialog.Icon icon={resolvedIcon} />
      <Dialog.Title style={{ textAlign: "center" }}>{title}</Dialog.Title>
      <Dialog.Content>
        <Text variant="bodyMedium" style={{ textAlign: "center" }}>
          {message}
        </Text>
      </Dialog.Content>
      <Dialog.Actions style={{ justifyContent: "center" }}>
        {tone !== "success" && (
          <Button onPress={onCancel} disabled={loading}>
            {cancelLabel}
          </Button>
        )}
        <Button
          mode="contained"
          buttonColor={tone === "success" ? theme.colors.primary : theme.colors.error}
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
