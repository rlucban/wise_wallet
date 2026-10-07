import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';

// SPEC-58 D-58-01 (CON-58-02): `expo-secure-store`'s web build is an empty
// module (`build/ExpoSecureStore.web.js` = `export default {}`), so every
// call throws and the availability probe silently falls through to
// AsyncStorage on all three helpers. SPEC-36's CON-W-03 now explicitly
// allows the `user_{id}_passcode` exception — so web goes straight to
// AsyncStorage instead of detouring through a throwing probe.
// Lazy so the check is evaluated per call, not at import: a module-scope
// `Platform.OS` read breaks the jest `mockOS` pattern (hoisted jest.mock
// factory's getter fires before the test's `let mockOS` is initialized).
function isWeb(): boolean {
  return Platform.OS === 'web';
}

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
  if (isWeb()) {
    await AsyncStorage.setItem(key, value);
    return;
  }
  if (await isSecureAvailable()) {
    await SecureStore.setItemAsync(key, value);
  } else {
    await AsyncStorage.setItem(key, value);
  }
}

export async function getSecureItem(key: string): Promise<string | null> {
  if (isWeb()) {
    return await AsyncStorage.getItem(key);
  }
  if (await isSecureAvailable()) {
    return await SecureStore.getItemAsync(key);
  }
  return await AsyncStorage.getItem(key);
}

export async function removeSecureItem(key: string): Promise<void> {
  if (isWeb()) {
    await AsyncStorage.removeItem(key);
    return;
  }
  if (await isSecureAvailable()) {
    await SecureStore.deleteItemAsync(key);
  }
  await AsyncStorage.removeItem(key);
}
