import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';
import * as FileSystem from 'expo-file-system/legacy';
import { Category, Transaction, SavingsItem, Due, UserProfile } from '../types';
import { AsyncStorageTransactionRepository } from '../repositories/transaction.repo';
import { AsyncStorageCategoryRepository } from '../repositories/category.repo';
import { AsyncStorageDueRepository } from '../repositories/due.repo';
import { AsyncStorageSavingsItemRepository } from '../repositories/savings-item.repo';
import { AsyncStorageProfileRepository } from '../repositories/profile.repo';
import { nowTimestamp, getPrefixedKey, getItem, setItem, deduplicate } from './storage';
import { getCachedSetting, setCachedSetting, clearSettingsCache } from './cache';

const transactionRepo = new AsyncStorageTransactionRepository();
const categoryRepo = new AsyncStorageCategoryRepository();
const dueRepo = new AsyncStorageDueRepository();
const savingsItemRepo = new AsyncStorageSavingsItemRepository();
const profileRepo = new AsyncStorageProfileRepository();

function getUpdatedAt(item: Record<string, unknown>): number {
  if (typeof item.updatedAt === 'number' && item.updatedAt > 0) {
    return item.updatedAt;
  }
  return 0;
}

export function mergeLWW<T extends { id: string | number }>(localItems: T[], remoteItems: T[]): T[] {
  const mergedMap = new Map<string, T>();

  for (const item of localItems) {
    mergedMap.set(String(item.id), item);
  }

  for (const remoteItem of remoteItems) {
    const key = String(remoteItem.id);
    const localItem = mergedMap.get(key);

    if (!localItem) {
      mergedMap.set(key, remoteItem);
    } else {
      const localTs = getUpdatedAt(localItem);
      const remoteTs = getUpdatedAt(remoteItem);

      if (remoteTs > localTs) {
        mergedMap.set(key, remoteItem);
      }
    }
  }

  return Array.from(mergedMap.values());
}

/**
 * --- Configuration ---
 */
export const API_URL = process.env.EXPO_PUBLIC_API_URL;

export const GLOBAL_CATEGORIES: Category[] = [
  { id: 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380b11', name: 'Food', type: 'expense', isGlobal: true, updatedAt: 0 },
  { id: 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380b12', name: 'Bills', type: 'expense', isGlobal: true, updatedAt: 0 },
  { id: 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380b13', name: 'Transport', type: 'expense', isGlobal: true, updatedAt: 0 },
  { id: 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380b14', name: 'Shopping', type: 'expense', isGlobal: true, updatedAt: 0 },
  { id: 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380b15', name: 'Entertainment', type: 'expense', isGlobal: true, updatedAt: 0 },
  { id: 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380b16', name: 'Salary', type: 'income', isGlobal: true, updatedAt: 0 },
  { id: 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380b17', name: 'Freelance', type: 'income', isGlobal: true, updatedAt: 0 },
  { id: 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380b18', name: 'Others', type: 'expense', isGlobal: true, updatedAt: 0 },
  { id: 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380b19', name: 'Others', type: 'income', isGlobal: true, updatedAt: 0 },
];

export const CURRENT_SEED_VERSION = 1;

// --- Lifecycle & Initialization (Stubs for compatibility) ---

export const initDb = async (overrideUserId?: string): Promise<void> => {
  // AsyncStorage doesn't need schema initialization
  if (overrideUserId) {
    await seedDefaults(overrideUserId);
  }
  return Promise.resolve();
};

export const initMasterDb = async (): Promise<void> => {
  const userId = await AsyncStorage.getItem('activeUserId');
  if (userId) {
    await seedDefaults(userId);
  }
  return Promise.resolve();
};

const seedDefaults = async (userId: string) => {
  const versionKey = 'last_seed_version';
  const lastVersion = parseInt(await getSetting(versionKey) || '0', 10);

  if (lastVersion < CURRENT_SEED_VERSION) {
    // 1. Merge Categories
    const catKey = `user_${userId}_categories`;
    const existingCats = await getItem<Category[]>(catKey, []);
    const mergedCats = deduplicate([...existingCats, ...GLOBAL_CATEGORIES]);
    await setItem(catKey, mergedCats);

    // 2. Update local version tracking
    await setSetting(versionKey, CURRENT_SEED_VERSION.toString());
    console.info(`Database seeded to version ${CURRENT_SEED_VERSION}`);
  }
};

export const getDb = async () => ({
  // Mock DB object if needed by any legacy calls, but we aim to replace all.
  runAsync: async () => { },
  closeAsync: async () => { },
});

export const setOnFatalError = (_cb: () => void) => {
  // No fatal native errors in AsyncStorage normally
};

export const clearAllLocalData = async () => {
  const userId = await AsyncStorage.getItem('activeUserId');
  const prefix = userId ? `user_${userId}_` : `default_`;

  const keys = await AsyncStorage.getAllKeys();
  const userKeys = keys.filter(k =>
    k.startsWith(prefix) &&
    !k.endsWith('_profile') &&
    !k.endsWith('_settings')
  );
  await AsyncStorage.multiRemove(userKeys);

  if (userId) {
    await setItem(`user_${userId}_categories`, GLOBAL_CATEGORIES);
  }
};

// --- Settings CRUD ---

export const getSetting = async (key: string): Promise<string | null> => {
  const cached = getCachedSetting(key);
  if (cached !== undefined) return cached;

  const fullKey = await getPrefixedKey('settings');
  const settings = await getItem<Record<string, string>>(fullKey, {});
  const value = settings[key] || null;
  setCachedSetting(key, value);
  return value;
};

export const setSetting = async (key: string, value: string) => {
  const fullKey = await getPrefixedKey('settings');
  const settings = await getItem<Record<string, string>>(fullKey, {});
  settings[key] = value;
  await setItem(fullKey, settings);
  setCachedSetting(key, value);
};

// --- Profile CRUD ---

export const getUserProfile = async (overrideUserId?: string) => {
  if (overrideUserId) {
    const fullKey = await getPrefixedKey('profile', overrideUserId);
    const profile = await getItem<Record<string, unknown> | null>(fullKey, null);
    if (profile) {
      return { ...profile, isFirstRun: profile.isFirstRun === true || profile.isFirstRun === 1 } as UserProfile;
    }
    return null;
  }
  return profileRepo.getById('default');
};

export const saveUserProfile = async (profile: Partial<UserProfile>, overrideUserId?: string) => {
  if (overrideUserId) {
    const fullKey = await getPrefixedKey('profile', overrideUserId);
    const current = await getUserProfile(overrideUserId) || {} as UserProfile;
    const updated = { ...current, ...profile };
    await setItem(fullKey, updated);
    return;
  }
  const current = await profileRepo.getById('default') || {} as UserProfile;
  await profileRepo.upsert({ ...current, ...profile } as UserProfile);
};

// --- Categories CRUD ---

export const getCategories = async (): Promise<Category[]> => {
  return categoryRepo.getAll();
};

// --- Transactions CRUD ---

export const getTransactions = async (): Promise<Transaction[]> => {
  const items = await transactionRepo.getAll();
  return items.map(t => ({
    ...t,
    category: t.category || { id: 'uncategorized', name: 'Others', type: t.type || 'expense', updatedAt: 0 },
  }));
};

// --- Dues CRUD ---

export const getDues = async (): Promise<Due[]> => {
  const items = await dueRepo.getAll();

  // Migration: convert old Agenda format to Due
    const migrated = items.map((item) => {
    const record = item as unknown as Record<string, unknown>;
    if (record.isRecurring !== undefined && record.frequency === undefined) {
      return {
        id: record.id,
        title: record.title,
        amount: record.amount || 0,
        date: record.date,
        frequency: record.isRecurring ? "monthly" : "once",
        type: record.type || "expense",
        categoryId: record.categoryId,
        autoProcess: false,
        completed: record.completed || false,
        updatedAt: nowTimestamp(),
      } as Due;
    }
    return item;
  });

  return migrated;
};

// --- Savings Items CRUD ---

export const getSavingsItems = async (): Promise<SavingsItem[]> => {
  const items = await savingsItemRepo.getAll();

  // Migration: convert old SavingsGoal format to SavingsItem
    const migrated = items.map((item) => {
    const record = item as unknown as Record<string, unknown>;
    if (record.targetAmount !== undefined && record.balance === undefined) {
      return {
        id: record.id,
        title: record.title,
        balance: record.currentAmount || 0,
        icon: record.icon,
        color: record.color,
        updatedAt: nowTimestamp(),
      } as SavingsItem;
    }
    return item;
  });

  // Title-based dedup (title is the display key for savings goals)
  const seen = new Set();
  return migrated.filter((g: SavingsItem) => {
    const key = g.title.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

// --- Master Users (Auth) ---

export const getUsers = async () => {
  return await getItem<Record<string, unknown>[]>('master_users', []);
};

export const addUser = async (id: string, name: string, passcode: string) => {
  const users = await getUsers();
  const existingUser = users.find(u => u.id === id);
  if (!existingUser) {
    const hashedPasscode = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      passcode
    );
    
    users.push({ id, name, passcode: hashedPasscode });
    await setItem('master_users', users);
  }
};

export const deleteUser = async (id: string) => {
  const users = await getUsers();
  const filtered = users.filter(u => u.id !== id);
  await setItem('master_users', filtered);

  // Cleanup user-specific data
  const keys = await AsyncStorage.getAllKeys();
  const userKeys = keys.filter(k => k.startsWith(`user_${id}_`));
  await AsyncStorage.multiRemove(userKeys);
};

export const hardResetLocalData = async () => {
  const keys = await AsyncStorage.getAllKeys();
  const keysToWipe = keys.filter(k => k !== 'system_reset_epoch');
  await AsyncStorage.multiRemove(keysToWipe);
  clearSettingsCache();
};

// --- Import / Export ---

export const exportData = async () => {
  const profile = await getUserProfile();
  const settingsFullKey = await getPrefixedKey('settings');
  const settings = await getItem(settingsFullKey, {});
  const categories = await getCategories();
  const rawTransactions = await getTransactions();
  const dues = await getDues();
  const savingsItems = await getSavingsItems();

  // Enhance transactions with Base64 images for self-contained backup
  const transactions = await Promise.all(rawTransactions.map(async (t) => {
    if (t.receiptUrl && (t.receiptUrl.startsWith('http') || t.receiptUrl.startsWith('file'))) {
      try {
        const base64 = await FileSystem.readAsStringAsync(t.receiptUrl, {
          encoding: FileSystem.EncodingType.Base64,
        });
        return { ...t, receiptBase64: base64 };
      } catch (e) {
        console.warn(`Could not embed image for transaction ${t.id}:`, e);
      }
    }
    return t;
  }));

  return JSON.stringify({
    profile,
    settings,
    categories,
    transactions,
    dues,
    savingsItems,
  });
};

export const importData = async (jsonString: string) => {
  const data = JSON.parse(jsonString);
  await clearAllLocalData();

  if (data.profile) {
    await saveUserProfile(data.profile);
  }
  if (data.settings) {
    const settingsFullKey = await getPrefixedKey('settings');
    await setItem(settingsFullKey, data.settings);
  }
  if (data.categories) {
    const categoriesFullKey = await getPrefixedKey('categories');
    await setItem(categoriesFullKey, data.categories);
  }
  if (data.transactions) {
    // Restore images from Base64
    const restoredTransactions = await Promise.all(data.transactions.map(async (t: Record<string, unknown>) => {
      if (t.receiptBase64) {
        try {
          const filename = `receipt_${t.id}.jpg`;
          const localUri = `${FileSystem.documentDirectory}${filename}`;
          await FileSystem.writeAsStringAsync(localUri, t.receiptBase64 as string, {
            encoding: FileSystem.EncodingType.Base64,
          });
          const updated = { ...t, receiptUrl: localUri } as Record<string, unknown>;
          delete updated.receiptBase64;
          return updated;
        } catch (e) {
          console.error("Failed to restore image during import:", e);
        }
      }
      return t;
    }));

    const transactionsFullKey = await getPrefixedKey('transactions');
    await setItem(transactionsFullKey, restoredTransactions);
  }
  if (data.dues) {
    const duesFullKey = await getPrefixedKey('dues');
    await setItem(duesFullKey, data.dues);
  }
  if (data.savingsItems) {
    const savingsFullKey = await getPrefixedKey('savingsItems');
    await setItem(savingsFullKey, data.savingsItems);
  }
};
