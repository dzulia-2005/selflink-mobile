const createMock = () => {
  const store: Record<string, string> = {};
  return {
    getItem: async (key: string) => (key in store ? store[key] : null),
    setItem: async (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: async (key: string) => {
      delete store[key];
    },
    clear: async () => {
      Object.keys(store).forEach((key) => delete store[key]);
    },
    getAllKeys: async () => Object.keys(store),
    multiSet: async (entries: [string, string][]) => {
      entries.forEach(([key, value]) => {
        store[key] = value;
      });
    },
    multiRemove: async (keys: string[]) => {
      keys.forEach((key) => delete store[key]);
    },
    multiGet: async (keys: string[]) => keys.map((key) => [key, store[key] ?? null]),
  };
};

const AsyncStorage = createMock();

export default AsyncStorage;
export const __INTERNAL_MOCK_STORE__ = AsyncStorage;
