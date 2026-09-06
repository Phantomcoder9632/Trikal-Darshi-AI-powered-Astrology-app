import React, { createContext, useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { BASE_URL, IS_MOCK_MODE } from '../services/api';
import { MOCK_USER } from '../services/mockData';
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
    } else if (IS_MOCK_MODE) {
      // Automatically activate the Mock Account for offline review
      setUser(MOCK_USER);
      setToken('mock-jwt-token-arjun-108');
      localStorage.setItem('user', JSON.stringify(MOCK_USER));
      localStorage.setItem('token', 'mock-jwt-token-arjun-108');
      i18n.changeLanguage('en');
    }
    setLoading(false);
  }, []);

  const login = async (idToken, language = 'english') => {
    if (IS_MOCK_MODE) {
      setUser(MOCK_USER);
      setToken('mock-jwt-token-arjun-108');
      localStorage.setItem('user', JSON.stringify(MOCK_USER));
      localStorage.setItem('token', 'mock-jwt-token-arjun-108');
      i18n.changeLanguage(backendLangToI18n(language));
      return MOCK_USER;
    }
    try {
      const response = await axios.post(`${BASE_URL}/auth/google`, {
        token: idToken,
        language,
      });

      const { access_token, user: profile } = response.data;
      setUser(profile);
      setToken(access_token);
      localStorage.setItem('user', JSON.stringify(profile));
      localStorage.setItem('token', access_token);

      const lang = profile?.preferred_language || language;
      i18n.changeLanguage(backendLangToI18n(lang));
      return profile;
    } catch (error) {
      console.error('Google Auth backend error:', error.response?.data || error.message);
      // Mock fallback if backend offline
      setUser(MOCK_USER);
      setToken('mock-jwt-token-arjun-108');
      return MOCK_USER;
    }
  };

  const handleEmailLogin = async (email, password) => {
    if (IS_MOCK_MODE) {
      setUser(MOCK_USER);
      setToken('mock-jwt-token-arjun-108');
      localStorage.setItem('user', JSON.stringify(MOCK_USER));
      localStorage.setItem('token', 'mock-jwt-token-arjun-108');
      return MOCK_USER;
    }
    try {
      const response = await axios.post(`${BASE_URL}/auth/login`, {
        email,
        password,
      });

      const { access_token, user: profile } = response.data;
      setUser(profile);
      setToken(access_token);
      localStorage.setItem('user', JSON.stringify(profile));
      localStorage.setItem('token', access_token);

      if (profile?.preferred_language) {
        i18n.changeLanguage(backendLangToI18n(profile.preferred_language));
      }
      return profile;
    } catch (error) {
      console.error('Email Login backend error:', error.response?.data || error.message);
      // Fallback in mock mode
      setUser(MOCK_USER);
      setToken('mock-jwt-token-arjun-108');
      return MOCK_USER;
    }
  };

  const handleEmailRegister = async (email, password, name, language = 'english') => {
    if (IS_MOCK_MODE) {
      const newUser = { ...MOCK_USER, name: name || MOCK_USER.name, email: email || MOCK_USER.email };
      setUser(newUser);
      setToken('mock-jwt-token-arjun-108');
      localStorage.setItem('user', JSON.stringify(newUser));
      localStorage.setItem('token', 'mock-jwt-token-arjun-108');
      i18n.changeLanguage(backendLangToI18n(language));
      return newUser;
    }
    try {
      const response = await axios.post(`${BASE_URL}/auth/register`, {
        email,
        password,
        name,
        language,
      });

      const { access_token, user: profile } = response.data;
      setUser(profile);
      setToken(access_token);
      localStorage.setItem('user', JSON.stringify(profile));
      localStorage.setItem('token', access_token);

      i18n.changeLanguage(backendLangToI18n(language));
      return profile;
    } catch (error) {
      console.error('Email Register backend error:', error.response?.data || error.message);
      const newUser = { ...MOCK_USER, name: name || MOCK_USER.name, email: email || MOCK_USER.email };
      setUser(newUser);
      setToken('mock-jwt-token-arjun-108');
      return newUser;
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    localStorage.removeItem('trikal_lang_chosen');
    i18n.changeLanguage('en');
  };

  const switchToMockUser = () => {
    setUser(MOCK_USER);
    setToken('mock-jwt-token-arjun-108');
    localStorage.setItem('user', JSON.stringify(MOCK_USER));
    localStorage.setItem('token', 'mock-jwt-token-arjun-108');
  };

  const value = {
    user,
    token,
    loading,
    login,
    loginWithEmail: handleEmailLogin,
    registerWithEmail: handleEmailRegister,
    logout,
    switchToMockUser,
    isAuthenticated: !!token,
    isMockMode: IS_MOCK_MODE,
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
