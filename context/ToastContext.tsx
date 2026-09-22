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
        style={{ backgroundColor: colors.elevation.level3 }}
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
