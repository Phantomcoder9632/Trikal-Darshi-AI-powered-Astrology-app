import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import {
  clearSession,
  loadSession,
  loginWithEmail as apiLogin,
  registerWithEmail as apiRegister,
  setSessionExpiredHandler,
  UserProfile,
} from '../services/api';
import { secureStorage, STORAGE_KEYS } from '../services/storage';

/** Re-read the JWT from secure storage into React state. */
const secureStorageGet = () => secureStorage.get(STORAGE_KEYS.token);

interface AuthContextValue {
  user: UserProfile | null;
  token: string | null;
  booting: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string, language: string) => Promise<void>;
  /** Adopt an externally-created session (e.g. Google sign-in in LoginScreen). */
  adoptSession: (profile: UserProfile) => void;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [booting, setBooting] = useState(true);

  // Restore any saved session at cold start
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const session = await loadSession();
        if (mounted && session) {
          setToken(session.token);
          setUser(session.profile);
        }
      } finally {
        if (mounted) setBooting(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  // Central forced-logout when any API call 401s
  useEffect(() => {
    setSessionExpiredHandler(() => {
      setUser(null);
      setToken(null);
    });
    return () => setSessionExpiredHandler(() => {});
  }, []);

  const login = async (email: string, password: string) => {
    const data = await apiLogin(email, password);
    setUser(data.user);
    setToken(data.access_token);
  };

  const register = async (email: string, password: string, name: string, language: string) => {
    const data = await apiRegister(email, password, name, language);
    setUser(data.user);
    setToken(data.access_token);
  };

  const logout = async () => {
    await clearSession();
    setUser(null);
    setToken(null);
  };

  /** Adopt a session saved via saveSession() (used by the Google flow). */
  const adoptSession = (profile: UserProfile) => {
    setUser(profile);
    // Token is already in secure storage; re-read it into state.
    secureStorageGet().then((t) => setToken(t));
  };

  const value = useMemo(
    () => ({
      user,
      token,
      booting,
      isAuthenticated: !!token,
      login,
      register,
      adoptSession,
      logout,
    }),
    [user, token, booting]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
