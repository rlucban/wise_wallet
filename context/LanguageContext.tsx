import React, { createContext, useContext, useMemo, useCallback, useRef, ReactNode } from "react";

type Language = "en" | "tl";

interface LanguageData {
  language: Language;
}

interface LanguageActions {
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const translations = {
  en: {
    settings: "Settings",
    appearance: "Appearance",
    language: "Language",
    currency: "Currency",
    categories: "Categories",
    passcode: "Passcode",
    darkMode: "Dark Mode",
    systemMode: "System Mode",
    income: "Income",
    expense: "Expense",
    back: "Back",
    save: "Save",
    add: "Add",
    delete: "Delete",
    confirm: "Confirm",
    cancel: "Cancel",
  },
  tl: {
    settings: "Kasangkapan",
    appearance: "Hitsura",
    language: "Wika",
    currency: "Salapi",
    categories: "Mga Kategorya",
    passcode: "Passcode",
    darkMode: "Dark Mode",
    systemMode: "System Mode",
    income: "Kita",
    expense: "Gastos",
    back: "Bumalik",
    save: "I-save",
    add: "Idagdag",
    delete: "Burahin",
    confirm: "Kumpirmahin",
    cancel: "Kanselahin",
  },
};

const LanguageDataContext = createContext<LanguageData | undefined>(undefined);
const LanguageActionsContext = createContext<LanguageActions | undefined>(undefined);

import { useUserProfile } from "./UserProfileContext";

export function LanguageProvider({ children }: { children: ReactNode }) {
  const { profile, updateProfile } = useUserProfile();
  const language = (profile?.language as Language) || "en";

  const languageRef = useRef(language);
  languageRef.current = language;

  const t = useCallback((key: string) => {
    return (translations[languageRef.current] as Record<string, string>)[key] || key;
  }, []);

  const setLanguage = useCallback((lang: Language) => {
    updateProfile({ language: lang });
  }, [updateProfile]);

  const dataValue = useMemo(() => ({
    language,
  }), [language]);

  const actionsValue = useMemo(() => ({
    setLanguage,
    t,
  }), [setLanguage, t]);

  return (
    <LanguageDataContext.Provider value={dataValue}>
      <LanguageActionsContext.Provider value={actionsValue}>
        {children}
      </LanguageActionsContext.Provider>
    </LanguageDataContext.Provider>
  );
}

export function useLanguageData(): LanguageData {
  const context = useContext(LanguageDataContext);
  if (!context) {
    throw new Error("useLanguageData must be used within a LanguageProvider");
  }
  return context;
}

export function useLanguageActions(): LanguageActions {
  const context = useContext(LanguageActionsContext);
  if (!context) {
    throw new Error("useLanguageActions must be used within a LanguageProvider");
  }
  return context;
}

export function useLanguage(): LanguageData & LanguageActions {
  return { ...useLanguageData(), ...useLanguageActions() };
}
