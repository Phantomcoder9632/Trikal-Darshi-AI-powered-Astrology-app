import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Small promise-based wrapper around expo-secure-store with graceful fallback
 * to AsyncStorage (e.g. Expo web, where SecureStore is unavailable).
 */
let storageImpl: {
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<void>;
  removeItem: (key: string) => Promise<void>;
};

try {
  if (SecureStore && typeof SecureStore.getItemAsync === 'function') {
    storageImpl = {
      getItem: (key) => SecureStore.getItemAsync(key),
      setItem: (key, value) => SecureStore.setItemAsync(key, value),
      removeItem: (key) => SecureStore.deleteItemAsync(key),
    };
  } else {
    throw new Error('SecureStore unavailable');
  }
} catch {
  storageImpl = {
    getItem: (key) => AsyncStorage.getItem(key),
    setItem: (key, value) => AsyncStorage.setItem(key, value),
    removeItem: (key) => AsyncStorage.removeItem(key),
  };
}

export const secureStorage = {
  get: (key: string) => storageImpl.getItem(key),
  set: (key: string, value: string) => storageImpl.setItem(key, value),
  remove: (key: string) => storageImpl.removeItem(key),
};

/** Plain (non-secret) JSON cache backed by AsyncStorage. */
export const jsonCache = {
  async get<T>(key: string): Promise<T | null> {
    try {
      const raw = await AsyncStorage.getItem(key);
      return raw ? (JSON.parse(raw) as T) : null;
    } catch {
      return null;
    }
  },
  async set(key: string, value: unknown): Promise<void> {
    try {
      await AsyncStorage.setItem(key, JSON.stringify(value));
    } catch {
      /* storage full / unavailable — cache is best-effort */
    }
  },
  async remove(key: string): Promise<void> {
    try {
      await AsyncStorage.removeItem(key);
    } catch {
      /* best-effort */
    }
  },
};

export const STORAGE_KEYS = {
  token: 'trikal_token',
  user: 'trikal_user',
  lang: 'trikal_lang_chosen',
  chartCache: (id: string) => `trikal-chart-cache-${id}`,
  interpCache: (id: string, lang: string) => `trikal-chart-cache-${id}-interp-${lang}`,
} as const;
