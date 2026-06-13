import React, { createContext, useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { BASE_URL } from '../services/api';

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
      setUser(JSON.parse(savedUser));
      setToken(savedToken);
    }
    setLoading(false);
  }, []);

  const login = async (idToken) => {
    try {
      const response = await axios.post(`${BASE_URL}/auth/google`, {
        token: idToken,
      });

      const { access_token, user: profile } = response.data;
      
      setUser(profile);
      setToken(access_token);
      
      localStorage.setItem('user', JSON.stringify(profile));
      localStorage.setItem('token', access_token);
      
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
      
      return profile;
    } catch (error) {
      console.error('Email Login backend error:', error.response?.data || error.message);
      throw error;
    }
  };

  const handleEmailRegister = async (email, password, name) => {
    try {
      const response = await axios.post(`${BASE_URL}/auth/register`, {
        email,
        password,
        name,
      });

      const { access_token, user: profile } = response.data;
      
      setUser(profile);
      setToken(access_token);
      
      localStorage.setItem('user', JSON.stringify(profile));
      localStorage.setItem('token', access_token);
      
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
