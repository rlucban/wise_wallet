const store = new Map<string, string>();

const AsyncStorage = {
  getItem: jest.fn(async (key: string): Promise<string | null> => {
    return store.get(key) ?? null;
  }),

  setItem: jest.fn(async (key: string, value: string): Promise<void> => {
    store.set(key, value);
  }),

  removeItem: jest.fn(async (key: string): Promise<void> => {
    store.delete(key);
  }),

  multiRemove: jest.fn(async (keys: string[]): Promise<void> => {
    keys.forEach((key: string) => store.delete(key));
  }),

  getAllKeys: jest.fn(async (): Promise<string[]> => {
    return Array.from(store.keys());
  }),

  clear: jest.fn(async (): Promise<void> => {
    store.clear();
  }),

  getItem: jest.fn(async (key: string) => store.get(key) || null),
  setItem: jest.fn(async (key: string, value: string) => { store.set(key, value); }),
  removeItem: jest.fn(async (key: string) => { store.delete(key); }),
  multiRemove: jest.fn(async (keys: string[]) => keys.forEach((k: string) => store.delete(k))),
  getAllKeys: jest.fn(async () => Array.from(store.keys())),
  clear: jest.fn(async () => store.clear()),
  __store: store,
};

module.exports = AsyncStorage;