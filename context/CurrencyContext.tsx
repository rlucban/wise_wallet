import React, { createContext, useContext, useMemo, useCallback, ReactNode } from "react";

export type CurrencyCode = "PHP";

interface CurrencyConfig {
  code: CurrencyCode;
  symbol: string;
  name: string;
}

const CURRENCIES: Record<CurrencyCode, CurrencyConfig> = {
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

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const currency = CURRENCIES.PHP;
  const decimalPlaces = 2;

  const formatAmount = useCallback((amount: number | undefined | null): string => {
    const value = amount ?? 0;
    return `₱${value.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  }, []);

  const setCurrency = useCallback((_code: CurrencyCode) => {}, []);
  const setDecimalPlaces = useCallback((_places: number) => {}, []);

  const dataValue = useMemo(
    () => ({
      currency,
      decimalPlaces,
    }),
    [currency, decimalPlaces]
  );

  const actionsValue = useMemo(
    () => ({
      setCurrency,
      setDecimalPlaces,
      formatAmount,
    }),
    [setCurrency, setDecimalPlaces, formatAmount]
  );

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
