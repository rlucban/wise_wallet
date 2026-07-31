import React, { createContext, useContext, useState, useMemo, ReactNode } from "react";

interface PasscodeData {
  isPasscodeEnabled: boolean;
  passcode: string | null;
  isUnlocked: boolean;
}

interface PasscodeActions {
  setPasscode: (code: string | null) => void;
  setIsPasscodeEnabled: (enabled: boolean) => void;
  setIsUnlocked: (unlocked: boolean) => void;
}

const PasscodeDataContext = createContext<PasscodeData | undefined>(undefined);
const PasscodeActionsContext = createContext<PasscodeActions | undefined>(undefined);

export function PasscodeProvider({ children }: { children: ReactNode }) {
  const [isPasscodeEnabled, setIsPasscodeEnabled] = useState(false);
  const [passcode, setPasscode] = useState<string | null>(null);
  const [isUnlocked, setIsUnlocked] = useState(false);

  const dataValue = useMemo(() => ({
    isPasscodeEnabled,
    passcode,
    isUnlocked,
  }), [isPasscodeEnabled, passcode, isUnlocked]);

  const actionsValue = useMemo(() => ({
    setPasscode,
    setIsPasscodeEnabled,
    setIsUnlocked,
  }), []);

  return (
    <PasscodeDataContext.Provider value={dataValue}>
      <PasscodeActionsContext.Provider value={actionsValue}>
        {children}
      </PasscodeActionsContext.Provider>
    </PasscodeDataContext.Provider>
  );
}

export function usePasscodeData(): PasscodeData {
  const context = useContext(PasscodeDataContext);
  if (!context) {
    throw new Error("usePasscodeData must be used within a PasscodeProvider");
  }
  return context;
}

export function usePasscodeActions(): PasscodeActions {
  const context = useContext(PasscodeActionsContext);
  if (!context) {
    throw new Error("usePasscodeActions must be used within a PasscodeProvider");
  }
  return context;
}

export function usePasscode(): PasscodeData & PasscodeActions {
  return { ...usePasscodeData(), ...usePasscodeActions() };
}
