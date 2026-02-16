import React, { createContext, useState, useContext, useEffect } from 'react';
import { blogAPI } from '../api/client';

const AuthContext = createContext({});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      console.log('Checking admin authentication...');
      const response = await blogAPI.getMe();
      
      if (response.data?.valid && response.data?.user) {
        console.log('Admin authenticated:', response.data.user.username);
        setUser(response.data.user);
      } else if (response.data?.user) {
        console.log('Admin authenticated:', response.data.user.username);
        setUser(response.data.user);
      } else {
        console.log('Standard user mode');
        setUser(null);
      }
    } catch (err) {
      // 401
      if (err.status === 401 || err.isAuthError) {
        console.log('Standard user mode');
      } else {
        console.error('Auth system error:', err.message);
      }
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const login = async (credentials) => {
    try {
      console.log('Attempting admin login...');
      const response = await blogAPI.login(credentials);
      
      if (response.data?.success && response.data?.user) {
        console.log('Admin login successful:', response.data.user.username);
        setUser(response.data.user);
        return { success: true };
      }
      
      return { success: false, error: 'Invalid response from server' };
    } catch (err) {
      const errorMsg = err.response?.data?.error || 'Login failed';
      console.error('Login failed:', errorMsg);
      return { success: false, error: errorMsg };
    }
  };

  const logout = async () => {
    try {
      await blogAPI.logout();
      console.log(' Logout successful');
    } catch (err) {
      console.error(' Logout error:', err);
    } finally {
      setUser(null);
    }
  };

  const value = {
    user,
    loading,
    login,
    logout,
    checkAuth,
    isAdmin: !!user
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};