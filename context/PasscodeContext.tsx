import React, { createContext, useContext, useState, useMemo, useEffect, useRef, useCallback, ReactNode } from "react";
import * as Crypto from "expo-crypto";
import { useAuthData } from "./AuthContext";
import { setSecureItem, getSecureItem, removeSecureItem } from "../utils/secureStorage";
import { getPrefixedKey } from "../utils/storage";

interface PasscodeData {
  isPasscodeEnabled: boolean;
  passcode: string | null;
  isUnlocked: boolean;
}

interface PasscodeActions {
  setPasscode: (code: string | null) => void;
  setIsPasscodeEnabled: (enabled: boolean) => void;
  setIsUnlocked: (unlocked: boolean) => void;
  verifyPasscode: (candidate: string) => Promise<boolean>;
}

const PasscodeDataContext = createContext<PasscodeData | undefined>(undefined);
const PasscodeActionsContext = createContext<PasscodeActions | undefined>(undefined);

async function hashPin(pin: string): Promise<string> {
  return await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, pin);
}

export function PasscodeProvider({ children }: { children: ReactNode }) {
  const { activeUserId } = useAuthData();
  const [isPasscodeEnabled, setIsPasscodeEnabled] = useState(false);
  const [passcode, setPasscode] = useState<string | null>(null);
  const [isUnlocked, setIsUnlocked] = useState(false);
  // SPEC-35 D-01: hash mirrored to secure storage (never plaintext at rest).
  const [storedHash, setStoredHash] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const persistArmedRef = useRef(false);
  const lastUserRef = useRef<string | null>(null);

  // Session setter also arms the hashed persist (CON-05/CON-06).
  const setPasscodeAndPersist = useCallback((code: string | null) => {
    persistArmedRef.current = true;
    setPasscode(code);
  }, []);

  // Hashed persist — armed only by explicit setPasscode calls, so hydration
  // and account switches never write one user's PIN under another user.
  useEffect(() => {
    if (!persistArmedRef.current) return;
    persistArmedRef.current = false;
    if (!activeUserId) return;
    const id = activeUserId;
    if (passcode && /^\d{4}$/.test(passcode)) {
      const plain = passcode;
      getPrefixedKey("passcode", id)
        .then((key) => hashPin(plain).then((h) => {
          setStoredHash(h);
          return setSecureItem(key, h);
        }))
        .catch((e: unknown) => console.warn("Passcode persist failed:", e));
    } else if (passcode === null) {
      setStoredHash(null);
      getPrefixedKey("passcode", id)
        .then((key) => removeSecureItem(key))
        .catch((e: unknown) => console.warn("Passcode clear failed:", e));
    }
  }, [passcode, activeUserId]);

  // Hydrate on account change; clear alongside auth on sign-out (CON-05).
  useEffect(() => {
    if (activeUserId === lastUserRef.current && hydrated) return;
    const prev = lastUserRef.current;
    lastUserRef.current = activeUserId;
    setPasscode(null);
    setStoredHash(null);
    setIsUnlocked(false);
    (async () => {
      try {
        if (!activeUserId) {
          if (prev) {
            try {
              await removeSecureItem(await getPrefixedKey("passcode", prev));
            } catch (e: unknown) {
              console.warn("Passcode clear failed:", e);
            }
          }
          setIsPasscodeEnabled(false);
          return;
        }
        const hash = await getSecureItem(await getPrefixedKey("passcode", activeUserId));
        if (hash) {
          setStoredHash(hash);
          setIsPasscodeEnabled(true);
        } else {
          setIsPasscodeEnabled(false);
        }
      } catch (e: unknown) {
        console.warn("Passcode hydrate failed:", e);
        setIsPasscodeEnabled(false);
      } finally {
        setHydrated(true);
      }
    })();
  }, [activeUserId, hydrated]);

  // Hash-aware verify: session plaintext wins when present, else stored hash.
  const verifyPasscode = useCallback(async (candidate: string): Promise<boolean> => {
    const clean = candidate.trim();
    if (!/^\d{4}$/.test(clean)) return false;
    if (passcode) return clean === passcode;
    if (storedHash) return (await hashPin(clean)) === storedHash;
    return false;
  }, [passcode, storedHash]);

  const dataValue = useMemo(() => ({
    isPasscodeEnabled,
    passcode,
    isUnlocked,
  }), [isPasscodeEnabled, passcode, isUnlocked]);

  const actionsValue = useMemo(() => ({
    setPasscode: setPasscodeAndPersist,
    setIsPasscodeEnabled,
    setIsUnlocked,
    verifyPasscode,
  }), [setPasscodeAndPersist, verifyPasscode]);

  // Hold the tree until the first hydrate attempt finishes so the
  // _layout gate never renders on stale defaults (CON-05).
  if (!hydrated) return null;

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
