import React, { createContext, useContext, useMemo, useCallback, useRef, ReactNode } from "react";

export type CurrencyCode = "USD" | "PHP";

interface CurrencyConfig {
  code: CurrencyCode;
  symbol: string;
  name: string;
}

const CURRENCIES: Record<CurrencyCode, CurrencyConfig> = {
  USD: { code: "USD", symbol: "$", name: "US Dollar" },
  PHP: { code: "PHP", symbol: "₱", name: "Philippine Peso" },
};

interface CurrencyData {
  currency: CurrencyConfig;
  decimalPlaces: number;
}

interface CurrencyActions {
  setCurrency: (code: CurrencyCode) => void;
  setDecimalPlaces: (places: number) => void;
  formatAmount: (amount: number | undefined | null) => string;
}

const CurrencyDataContext = createContext<CurrencyData | undefined>(undefined);
const CurrencyActionsContext = createContext<CurrencyActions | undefined>(undefined);

import { useUserProfile } from "./UserProfileContext";

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const { profile, updateProfile } = useUserProfile();

  const currencyCode = (profile?.currency as CurrencyCode) || "PHP";
  const decimalPlaces = profile?.decimalPoints ?? 2;
  const currency = CURRENCIES[currencyCode];

  const currencyRef = useRef(currency);
  currencyRef.current = currency;
  const decimalPlacesRef = useRef(decimalPlaces);
  decimalPlacesRef.current = decimalPlaces;

  const formatAmount = useCallback((amount: number | undefined | null): string => {
    const value = amount ?? 0;
    const cur = currencyRef.current;
    const dp = decimalPlacesRef.current;
    return `${cur.symbol}${value.toLocaleString("en-US", {
      minimumFractionDigits: dp,
      maximumFractionDigits: dp
    })}`;
  }, []);

  const setCurrency = useCallback((code: CurrencyCode) => {
    updateProfile({ currency: code });
  }, [updateProfile]);

  const setDecimalPlaces = useCallback((places: number) => {
    updateProfile({ decimalPoints: places });
  }, [updateProfile]);

  const dataValue = useMemo(() => ({
    currency,
    decimalPlaces,
  }), [currency, decimalPlaces]);

  const actionsValue = useMemo(() => ({
    setCurrency,
    setDecimalPlaces,
    formatAmount,
  }), [setCurrency, setDecimalPlaces, formatAmount]);

  return (
    <CurrencyDataContext.Provider value={dataValue}>
      <CurrencyActionsContext.Provider value={actionsValue}>
        {children}
      </CurrencyActionsContext.Provider>
    </CurrencyDataContext.Provider>
  );
}

export function useCurrencyData(): CurrencyData {
  const context = useContext(CurrencyDataContext);
  if (!context) {
    throw new Error("useCurrencyData must be used within a CurrencyProvider");
  }
  return context;
}

export function useCurrencyActions(): CurrencyActions {
  const context = useContext(CurrencyActionsContext);
  if (!context) {
    throw new Error("useCurrencyActions must be used within a CurrencyProvider");
  }
  return context;
}

export function useCurrency(): CurrencyData & CurrencyActions {
  return { ...useCurrencyData(), ...useCurrencyActions() };
}

export { CURRENCIES };
