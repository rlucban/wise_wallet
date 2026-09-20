const store = new Map();

const AsyncStorage = {
  getItem: jest.fn(async (key) => store.get(key) || null),
  setItem: jest.fn(async (key, value) => { store.set(key, value); }),
  removeItem: jest.fn(async (key) => { store.delete(key); }),
  multiRemove: jest.fn(async (keys) => keys.forEach((k) => store.delete(k))),
  getAllKeys: jest.fn(async () => Array.from(store.keys())),
  clear: jest.fn(async () => store.clear()),
  __store: store,
};

module.exports = AsyncStorage;
