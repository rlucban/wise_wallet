// SPEC-32 D-02/D-03 — shared keyboard avoidance for Dialog/Modal content.
// Built-ins only (no new deps); web renders children unchanged so web
// layout/behavior is byte-identical. Taps still dismiss the keyboard
// (keyboardShouldPersistTaps preserved).
import React, { ReactNode } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet } from "react-native";

export function KeyboardAwareDialog({ children }: { children: ReactNode }) {
  if (Platform.OS === "web") {
    return <>{children}</>;
  }
  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.avoid}
    >
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.grow}
        showsVerticalScrollIndicator={false}
      >
        {children}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  avoid: { width: "100%" },
  grow: { flexGrow: 1 },
});
