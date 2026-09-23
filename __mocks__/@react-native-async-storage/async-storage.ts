const store = new Map<string, string>();

const AsyncStorage = {
  getItem: jest.fn(async (key: string) => store.get(key) || null),
  setItem: jest.fn(async (key: string, value: string) => { store.set(key, value); }),
  removeItem: jest.fn(async (key: string) => { store.delete(key); }),
  multiRemove: jest.fn(async (keys: string[]) => keys.forEach((k: string) => store.delete(k))),
  getAllKeys: jest.fn(async () => Array.from(store.keys())),
  clear: jest.fn(async () => store.clear()),
  __store: store,
};

module.exports = AsyncStorage;
