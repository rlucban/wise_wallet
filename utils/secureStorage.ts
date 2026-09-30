import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';

let secureAvailable: boolean | null = null;

async function isSecureAvailable(): Promise<boolean> {
  if (secureAvailable === null) {
    try {
      secureAvailable = await SecureStore.isAvailableAsync();
    } catch {
      secureAvailable = false;
    }
  }
  return secureAvailable;
}

export async function setSecureItem(key: string, value: string): Promise<void> {
  if (await isSecureAvailable()) {
    await SecureStore.setItemAsync(key, value);
  } else {
    await AsyncStorage.setItem(key, value);
  }
}

export async function getSecureItem(key: string): Promise<string | null> {
  if (await isSecureAvailable()) {
    return await SecureStore.getItemAsync(key);
  }
  return await AsyncStorage.getItem(key);
}

export async function removeSecureItem(key: string): Promise<void> {
  // SPEC-31 CON-03 — clear BOTH branches: a token written to the fallback
  // while SecureStore was unavailable MUST NOT survive logout.
  if (await isSecureAvailable()) {
    try {
      await SecureStore.deleteItemAsync(key);
    } catch {
      // best-effort; the fallback removal below still runs
    }
  }
  await AsyncStorage.removeItem(key);
}
