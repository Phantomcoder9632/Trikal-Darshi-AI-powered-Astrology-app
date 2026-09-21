import React, { createContext, useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { BASE_URL } from '../services/api';
import i18n, { backendLangToI18n } from '../i18n';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Restore session on mount
    const savedUser = localStorage.getItem('user');
    const savedToken = localStorage.getItem('token');
    if (savedUser && savedToken) {
      try {
        const profile = JSON.parse(savedUser);
        setUser(profile);
        setToken(savedToken);
        if (profile?.preferred_language) {
          i18n.changeLanguage(backendLangToI18n(profile.preferred_language));
        }
      } catch (e) {
        console.error('Failed to parse saved user:', e);
      }
    }
    setLoading(false);
  }, []);

  // Global 401 handler (fired by the axios interceptor and authedFetch in
  // api.js when a token is expired/invalid). Logging out centrally guarantees
  // every page reacts the same way — no silent failures on dead sessions.
  useEffect(() => {
    const handleForcedLogout = (e) => {
      if (e.detail === 'session-expired') {
        console.warn('Session expired — logging out.');
      }
      setUser(null);
      setToken(null);
      localStorage.removeItem('user');
      localStorage.removeItem('token');
    };
    window.addEventListener('auth:logout', handleForcedLogout);
    return () => window.removeEventListener('auth:logout', handleForcedLogout);
  }, []);

  /** Persist a successful auth response and apply its language. */
  const adoptSession = (access_token, profile, fallbackLanguage) => {
    setUser(profile);
    setToken(access_token);
    localStorage.setItem('user', JSON.stringify(profile));
    localStorage.setItem('token', access_token);

    const lang = profile?.preferred_language || fallbackLanguage;
    if (lang) {
      i18n.changeLanguage(backendLangToI18n(lang));
    }
    return profile;
  };

  /** Google OAuth (access-token or ID-token flow handled by the backend). */
  const login = async (idToken, language = 'english') => {
    const response = await axios.post(`${BASE_URL}/auth/google`, {
      token: idToken,
      language,
    });
    const { access_token, user: profile } = response.data;
    return adoptSession(access_token, profile, language);
  };

  const handleEmailLogin = async (email, password) => {
    const response = await axios.post(`${BASE_URL}/auth/login`, {
      email,
      password,
    });
    const { access_token, user: profile } = response.data;
    return adoptSession(access_token, profile, profile?.preferred_language);
  };

  const handleEmailRegister = async (email, password, name, language = 'english') => {
    const response = await axios.post(`${BASE_URL}/auth/register`, {
      email,
      password,
      name,
      language,
    });
    const { access_token, user: profile } = response.data;
    return adoptSession(access_token, profile, language);
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    localStorage.removeItem('trikal_lang_chosen');
    i18n.changeLanguage('en');
  };

  const value = {
    user,
    token,
    loading,
    login,
    loginWithEmail: handleEmailLogin,
    registerWithEmail: handleEmailRegister,
    logout,
    isAuthenticated: !!token,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
