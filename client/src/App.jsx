import React, { useState, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";

// Layout
import Layout from "./components/Layout";

// Pages
import HomePage from "./pages/HomePage";
import PostPage from "./pages/PostPage";
import CategoryPage from "./pages/CategoryPage";
import SearchPage from "./pages/SearchPage";
import PolicyPage from "./pages/PolicyPage";
import NotFoundPage from "./pages/NotFoundPage";
import AdminLogin from './pages/admin/AdminLogin';
import AdminDashboard from './pages/admin/AdminDashboard';
import PostEditor from './pages/admin/PostEditor';
import { BlogProvider } from "./context/BlogContext";
import CommentsPage from './pages/admin/CommentsPage';

// ProtectedRoute Component
const ProtectedRoute = ({ children }) => {
  const location = useLocation();
  const [isAuthenticated, setIsAuthenticated] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = () => {
    // Check if user has auth token in localStorage
    const token = localStorage.getItem('authToken');
    
    // For production, you might want to validate the token with your backend
    // For now, just check if token exists
    if (token) {
      setIsAuthenticated(true);
    } else {
      setIsAuthenticated(false);
    }
    
    setLoading(false);
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

function App() {
  return (
    <HelmetProvider>
      <BlogProvider>
        <Router
          future={{
            v7_startTransition: true,
            v7_relativeSplatPath: true,
          }}
        >
          <Layout>
            <Routes>
              {/* Public Routes */}
              <Route path="/" element={<HomePage />} />
              <Route path="/post/:slug" element={<PostPage />} />
              <Route path="/category/:category" element={<CategoryPage />} />
              <Route path="/search" element={<SearchPage />} />
              <Route path="/policy/:type" element={<PolicyPage />} />
              <Route path="/admin/login" element={<AdminLogin />} />
              
              {/* Protected Admin Routes */}
              <Route 
                path="/admin/dashboard" 
                element={
                  <ProtectedRoute>
                    <AdminDashboard />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/admin/posts/new" 
                element={
                  <ProtectedRoute>
                    <PostEditor />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/admin/posts/edit/:id" 
                element={
                  <ProtectedRoute>
                    <PostEditor />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/admin/comments" 
                element={
                  <ProtectedRoute>
                    <CommentsPage />
                  </ProtectedRoute>
                } 
              />
              
              {/* 404 Catch-all */}
              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </Layout>
        </Router>
      </BlogProvider>
    </HelmetProvider>
  );
}

export default App;