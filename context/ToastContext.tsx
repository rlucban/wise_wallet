import React, { createContext, useContext, useState, useCallback, useMemo, ReactNode } from "react";
import { Snackbar, useTheme } from "react-native-paper";

interface ToastContextType {
  showToast: (message: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
  const { colors } = useTheme();
  const [visible, setVisible] = useState(false);
  const [message, setMessage] = useState("");

  const showToast = useCallback((msg: string) => {
    setMessage(msg);
    setVisible(true);
  }, []);

  const onDismiss = useCallback(() => setVisible(false), []);

  const value = useMemo(() => ({ showToast }), [showToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <Snackbar
        visible={visible}
        onDismiss={onDismiss}
        duration={5000}
        wrapperStyle={{ top: 0, bottom: 24, justifyContent: "flex-end" }}
        // SPEC-05 §6 DEC-MD-7(a): navy system skin. Text/action colors are Paper's
        // defaults (inverseOnSurface/inversePrimary), verified to pair with
        // primary in both modes (Snackbar.tsx:260-262) — only the container changes.
        style={{
          backgroundColor: colors.primary,
          borderRadius: 16,
          maxWidth: 480,
          width: "90%",
          alignSelf: "center",
        }}
        action={{ label: "OK", onPress: onDismiss }}
      >
        {message}
      </Snackbar>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextType {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}
