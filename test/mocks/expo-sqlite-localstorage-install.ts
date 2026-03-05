const storageMap = new Map<string, string>();

const localStorageShim = {
  getItem(key: string): string | null {
    return storageMap.has(key) ? storageMap.get(key) ?? null : null;
  },
  setItem(key: string, value: string) {
    storageMap.set(key, value);
  },
  removeItem(key: string) {
    storageMap.delete(key);
  },
  clear() {
    storageMap.clear();
  },
};

if (!("localStorage" in globalThis)) {
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    enumerable: false,
    writable: true,
    value: localStorageShim,
  });
}
