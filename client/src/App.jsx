import React, { useState, useEffect, lazy, Suspense } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import CSPMeta from "./components/CPSMeta";

// Layout
import Layout from "./components/Layout";

// Core pages (eager load)
import HomePage from "./pages/HomePage";
import PostPage from "./pages/PostPage";
import CategoryPage from "./pages/CategoryPage";
import SearchPage from "./pages/SearchPage";
import PolicyPage from "./pages/PolicyPage";
import NotFoundPage from "./pages/NotFoundPage";
import AdminLogin from './pages/admin/AdminLogin';
import About from "./pages/About";
import Advertise from "./pages/Advertise";
import JobsPage from "./pages/JobsPage";
import JobDetails from "./pages/JobDetails";

// Lazy load admin pages (better performance)
const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard'));
const PostEditor = lazy(() => import('./pages/admin/PostEditor'));
const CommentsPage = lazy(() => import('./pages/admin/CommentsPage'));
const JobManager = lazy(() => import('./pages/admin/JobManager'));

// Context and Components
import { BlogProvider } from "./context/BlogContext";
import CookieConsent from "./components/CookieConsent";
import AuthorBio from "./components/AuthorBio";

// ProtectedRoute Component
const ProtectedRoute = ({ children }) => {
  const location = useLocation();
  const [isAuthenticated, setIsAuthenticated] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = () => {
    // Check if user has valid auth session
    const token = localStorage.getItem('authToken');
    const tokenExpiry = localStorage.getItem('authTokenExpiry');
    
    if (token && tokenExpiry) {
      const now = new Date().getTime();
      if (now < parseInt(tokenExpiry)) {
        setIsAuthenticated(true);
      } else {
        // Token expired
        localStorage.removeItem('authToken');
        localStorage.removeItem('authTokenExpiry');
        setIsAuthenticated(false);
      }
    } else {
      setIsAuthenticated(false);
    }
    
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex flex-col items-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4"></div>
          <div className="text-gray-600">Authenticating...</div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    // Redirect to login if not authenticated
    return <Navigate to="/admin/login" state={{ from: location }} replace />;
  }

  return children;
};

// Admin Loading Fallback
const AdminLoadingFallback = () => (
  <div className="min-h-screen bg-gray-50 flex items-center justify-center">
    <div className="flex flex-col items-center">
      <div className="w-12 h-12 border-4 border-gray-300 border-t-blue-600 rounded-full animate-spin mb-4"></div>
      <div className="text-gray-600">Loading Admin Panel...</div>
    </div>
  </div>
);

function App() {
  const [consentGiven, setConsentGiven] = useState(false);
  const [analyticsLoaded, setAnalyticsLoaded] = useState(false);

  useEffect(() => {
    // Check for existing cookie consent on app load
    const savedConsent = localStorage.getItem("techblog_cookie_consent");
    if (savedConsent === 'accepted') {
      setConsentGiven(true);
      loadAnalytics();
    }
  }, []);

  const loadAnalytics = () => {
    if (analyticsLoaded) return;
    
    // Load Google Analytics only if consent given
    if (window.location.hostname !== 'localhost' && !analyticsLoaded) {
      const script = document.createElement('script');
      script.src = 'https://www.googletagmanager.com/gtag/js?id=YOUR_GA_ID';
      script.async = true;
      document.head.appendChild(script);
      
      window.dataLayer = window.dataLayer || [];
      function gtag(){ dataLayer.push(arguments); }
      gtag('js', new Date());
      gtag('config', 'YOUR_GA_ID', {
        anonymize_ip: true,
        allow_google_signals: false,
        allow_ad_personalization_signals: false
      });
      
      setAnalyticsLoaded(true);
      console.log("Analytics loaded with privacy settings");
    }
  };

  const enableAnalytics = () => {
    setConsentGiven(true);
    loadAnalytics();
    console.log("Analytics enabled (user accepted)");
  };

  const disableAnalytics = () => {
    // Remove any existing analytics cookies
    document.cookie.split(";").forEach(cookie => {
      const cookieName = cookie.split("=")[0].trim();
      if (cookieName.includes('_ga') || cookieName.includes('_gid')) {
        document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=.${window.location.hostname};`;
      }
    });
    console.log("Analytics disabled (user declined)");
  };

  return (
    <HelmetProvider>
      <CSPMeta />
      <BlogProvider>
        <Router
          future={{
            v7_startTransition: true,
            v7_relativeSplatPath: true,
          }}
        >
          <Layout>
            {/* CookieConsent must be outside Routes but inside Router */}
            <CookieConsent 
              onAccept={enableAnalytics} 
              onDecline={disableAnalytics}
              privacyLink="/policy/privacy#cookies"
            />
            
            <Routes>
              {/* Public Routes */}
              <Route path="/" element={<HomePage />} />
              <Route path="/post/:slug" element={<PostPage />} />
              <Route path="/category/:category" element={<CategoryPage />} />
              <Route path="/search" element={<SearchPage />} />
              <Route path="/policy/:type" element={<PolicyPage />} />
              <Route path="/admin/login" element={<AdminLogin />} />
              <Route path="/about" element={<About />} />
              <Route path="/author" element={<AuthorBio compact={false} />} />
              <Route path="/advertise" element={<Advertise />} />
              <Route path="/jobs" element={<JobsPage />} />
              <Route path="/jobs/:id" element={<JobDetails />} />
              
              {/* Protected Admin Routes with Lazy Loading */}
              <Route 
                path="/admin/dashboard" 
                element={
                  <ProtectedRoute>
                    <Suspense fallback={<AdminLoadingFallback />}>
                      <AdminDashboard />
                    </Suspense>
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/admin/posts/new" 
                element={
                  <ProtectedRoute>
                    <Suspense fallback={<AdminLoadingFallback />}>
                      <PostEditor />
                    </Suspense>
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/admin/posts/edit/:id" 
                element={
                  <ProtectedRoute>
                    <Suspense fallback={<AdminLoadingFallback />}>
                      <PostEditor />
                    </Suspense>
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/admin/comments" 
                element={
                  <ProtectedRoute>
                    <Suspense fallback={<AdminLoadingFallback />}>
                      <CommentsPage />
                    </Suspense>
                  </ProtectedRoute>
                } 
              />
              <Route 
                  path="/admin/jobs" 
                  element={
                    <ProtectedRoute>
                      <JobManager />
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