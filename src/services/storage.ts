import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';

/** Lightweight obfuscation key for Web AsyncStorage fallback */
const WEB_SALT = 'TrikalDarshiWebVault2026';

function obfuscateWeb(text: string): string {
  try {
    let result = '';
    for (let i = 0; i < text.length; i++) {
      result += String.fromCharCode(text.charCodeAt(i) ^ WEB_SALT.charCodeAt(i % WEB_SALT.length));
    }
    return 'enc:' + btoa(result);
  } catch {
    return text;
  }
}

function deobfuscateWeb(encoded: string): string {
  if (!encoded || !encoded.startsWith('enc:')) return encoded;
  try {
    const raw = atob(encoded.slice(4));
    let result = '';
    for (let i = 0; i < raw.length; i++) {
      result += String.fromCharCode(raw.charCodeAt(i) ^ WEB_SALT.charCodeAt(i % WEB_SALT.length));
    }
    return result;
  } catch {
    return encoded;
  }
}

/**
 * Promise-based wrapper around expo-secure-store with obfuscated
 * AsyncStorage fallback for Web and platforms where SecureStore is unavailable.
 */
export const secureStorage = {
  get: async (key: string): Promise<string | null> => {
    if (Platform.OS !== 'web') {
      try {
        if (typeof SecureStore.getItemAsync === 'function') {
          return await SecureStore.getItemAsync(key);
        }
      } catch {
        /* fallback to AsyncStorage */
      }
    }
    const val = await AsyncStorage.getItem(key);
    return val ? deobfuscateWeb(val) : null;
  },
  set: async (key: string, value: string): Promise<void> => {
    if (Platform.OS !== 'web') {
      try {
        if (typeof SecureStore.setItemAsync === 'function') {
          await SecureStore.setItemAsync(key, value);
          return;
        }
      } catch {
        /* fallback to AsyncStorage */
      }
    }
    const safeVal = obfuscateWeb(value);
    await AsyncStorage.setItem(key, safeVal);
  },
  remove: async (key: string): Promise<void> => {
    if (Platform.OS !== 'web') {
      try {
        if (typeof SecureStore.deleteItemAsync === 'function') {
          await SecureStore.deleteItemAsync(key);
          return;
        }
      } catch {
        /* fallback to AsyncStorage */
      }
    }
    await AsyncStorage.removeItem(key);
  },
};

/** Plain (non-secret) JSON cache backed by AsyncStorage with TTL support. */
export const jsonCache = {
  async get<T>(key: string): Promise<T | null> {
    try {
      const raw = await AsyncStorage.getItem(key);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object' && '_expiresAt' in parsed) {
        if (Date.now() > parsed._expiresAt) {
          await AsyncStorage.removeItem(key);
          return null;
        }
        return parsed.data as T;
      }
      return parsed as T;
    } catch {
      return null;
    }
  },
  async set(key: string, value: unknown, ttlMs?: number): Promise<void> {
    try {
      const payload = ttlMs ? { data: value, _expiresAt: Date.now() + ttlMs } : value;
      await AsyncStorage.setItem(key, JSON.stringify(payload));
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
  async clearExpired(): Promise<void> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const trikalKeys = keys.filter(k => k.startsWith('trikal-'));
      for (const k of trikalKeys) {
        await jsonCache.get(k); // get auto-evicts expired entries
      }
    } catch {
      /* best-effort */
    }
  },
};

export const STORAGE_KEYS = {
  token: 'trikal_token',
  user: 'trikal_user',
  lang: 'trikal_lang_chosen',
  offlineQueue: 'trikal_offline_pending_queue',
  chartCache: (id: string) => `trikal-chart-cache-${id}`,
  interpCache: (id: string, lang: string) => `trikal-chart-cache-${id}-interp-${lang}`,
} as const;
