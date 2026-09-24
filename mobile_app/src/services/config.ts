import Constants from 'expo-constants';

/**
 * Resolve the backend base URL.
 *
 * Default behavior: EVERYWHERE (production builds and Expo Go dev sessions)
 * connects directly to the deployed backend URL in `app.json → extra.apiUrl`
 * (the Hugging Face Space).
 *
 * Local backend development: set `extra.useLocalBackend: true` in app.json.
 * While running in Expo Go (__DEV__), the Metro packager host is the dev
 * machine, so the FastAPI backend is reached through the same host on port
 * 8000 — no manual LAN-IP digging required. Production/release builds always
 * use `extra.apiUrl` regardless of the flag.
 *
 * The URL never carries a trailing slash so `client.get('/chart')` style
 * calls join cleanly.
 */
function resolveBaseUrl(): string {
  const extra = Constants.expoConfig?.extra as
    | { apiUrl?: string; useLocalBackend?: boolean }
    | undefined;
  const configured = extra?.apiUrl;
  const useLocalBackend = extra?.useLocalBackend === true;

  if (useLocalBackend && __DEV__ && Constants.appOwnership === 'expo') {
    try {
      const host = new URL(Constants.expoGoConfig?.debuggerHost ?? '').hostname;
      if (host) return `http://${host}:8000`;
    } catch {
      /* fall through to the configured URL */
    }
  }

  if (configured) {
    return configured.replace(/\/+$/, '');
  }

  // No explicit config at all: dev on Metro host, otherwise localhost.
  if (__DEV__) {
    try {
      const host = new URL(Constants.expoGoConfig?.debuggerHost ?? '').hostname;
      if (host) return `http://${host}:8000`;
    } catch {
      /* fall through */
    }
  }
  return 'http://localhost:8000';
}

export const API_BASE_URL = resolveBaseUrl();
