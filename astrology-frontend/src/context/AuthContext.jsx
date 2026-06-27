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
      const profile = JSON.parse(savedUser);
      setUser(profile);
      setToken(savedToken);
      // Restore UI language from saved user preference
      if (profile?.preferred_language) {
        i18n.changeLanguage(backendLangToI18n(profile.preferred_language));
      }
    }
    setLoading(false);
  }, []);

  const login = async (idToken, language = 'english') => {
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

      // Apply user's preferred language to UI
      const lang = profile?.preferred_language || language;
      i18n.changeLanguage(backendLangToI18n(lang));
      
      return profile;
    } catch (error) {
      console.error('Google Auth backend error:', error.response?.data || error.message);
      throw error;
    }
  };

  const handleEmailLogin = async (email, password) => {
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

      // Apply user's preferred language to UI
      if (profile?.preferred_language) {
        i18n.changeLanguage(backendLangToI18n(profile.preferred_language));
      }
      
      return profile;
    } catch (error) {
      console.error('Email Login backend error:', error.response?.data || error.message);
      throw error;
    }
  };

  const handleEmailRegister = async (email, password, name, language = 'english') => {
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

      // Apply chosen language to UI
      i18n.changeLanguage(backendLangToI18n(language));
      
      return profile;
    } catch (error) {
      console.error('Email Register backend error:', error.response?.data || error.message);
      throw error;
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    localStorage.removeItem('trikal_lang_chosen');
    i18n.changeLanguage('en'); // Reset to English on logout
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
