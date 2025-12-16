import React, { createContext, useState, useContext, useEffect } from 'react';
import { blogAPI } from '../api/client';

const AuthContext = createContext({});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const token = localStorage.getItem('authToken');
      if (!token) {
        setLoading(false);
        return;
      }

      // Verify token with backend
      const response = await blogAPI.getMe();
      if (response.data) {
        setUser(response.data);
      }
    } catch (error) {
      console.error('Auth check error:', error);
      localStorage.removeItem('authToken');
    } finally {
      setLoading(false);
    }
  };

  const login = async (credentials) => {
    try {
      const response = await blogAPI.login(credentials);
      const { token, user } = response.data;
      
      localStorage.setItem('authToken', token);
      setUser(user);
      return { success: true };
    } catch (error) {
      setError(error.response?.data?.error || 'Login failed');
      return { success: false, error: error.response?.data?.error };
    }
  };

  const logout = () => {
    localStorage.removeItem('authToken');
    setUser(null);
  };

  const value = {
    user,
    loading,
    error,
    login,
    logout,
    checkAuth
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};