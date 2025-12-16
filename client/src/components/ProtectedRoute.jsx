import React, { useState, useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { blogAPI } from '../api/client';

const ProtectedRoute = ({ children }) => {
  const location = useLocation();
  const [isAuthenticated, setIsAuthenticated] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    validateToken();
  }, []);

  const validateToken = async () => {
    try {
      const token = localStorage.getItem('authToken');
      
      if (!token) {
        setIsAuthenticated(false);
        setLoading(false);
        return;
      }

      // Validate token with backend
      const response = await blogAPI.get('/auth/verify');
      
      if (response.data && response.data.valid) {
        setIsAuthenticated(true);
      } else {
        localStorage.removeItem('authToken');
        setIsAuthenticated(false);
      }
    } catch (error) {
      console.error('Token validation error:', error);
      localStorage.removeItem('authToken');
      setIsAuthenticated(false);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600 animate-pulse">Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    // Redirect to login if not authenticated
    return <Navigate to="/admin/login" state={{ from: location }} replace />;
  }

  return children;
};

export default ProtectedRoute;