import React, { useState, useEffect, lazy, Suspense } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import CSPMeta from "./components/CPSMeta";

// Layout
import Layout from "./components/Layout";

// Core pages
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

// Lazy load admin pages
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
    // Redirect to login
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
  const [analyticsLoaded, setAnalyticsLoaded] = useState(false);
  const [adsenseLoaded, setAdsenseLoaded] = useState(false);

  // Check for existing consent on mount and load scripts accordingly
  useEffect(() => {
    const savedConsent = localStorage.getItem("techblog_cookie_consent");
    
    if (savedConsent === "accepted" || savedConsent === "customized") {
      // User has made a choice — check granular preferences
      const analyticsConsent = localStorage.getItem("techblog_analytics_consent");
      const adsConsent = localStorage.getItem("techblog_ads_consent");

      if (analyticsConsent === "true") {
        loadAnalytics();
      }
      if (adsConsent === "true") {
        loadAdSense();
      }
    }
  }, []);

  const loadAnalytics = () => {
    if (analyticsLoaded || window.location.hostname === 'localhost') return;
    
    const script = document.createElement('script');
    script.src = 'https://www.googletagmanager.com/gtag/js?id=G-L2JCRCT3F3';
    script.async = true;
    document.head.appendChild(script);
    
    window.dataLayer = window.dataLayer || [];
    function gtag(){ window.dataLayer.push(arguments); }
    window.gtag = gtag;
    gtag('js', new Date());
    gtag('config', 'YOUR_GA_ID', {
      anonymize_ip: true,
      allow_google_signals: false,
      allow_ad_personalization_signals: false
    });
    
    setAnalyticsLoaded(true);
    if (process.env.NODE_ENV !== 'production') {
      console.log("Google Analytics loaded with privacy settings");
    }
  };

  const loadAdSense = () => {
    if (adsenseLoaded || window.location.hostname === 'localhost') return;

    const script = document.createElement('script');
    script.src = 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-2881807085062922';
    script.async = true;
    script.crossOrigin = 'anonymous';
    document.head.appendChild(script);

    setAdsenseLoaded(true);
    if (process.env.NODE_ENV !== 'production') {
      console.log("Google AdSense loaded");
    }
  };

  const clearAnalyticsCookies = () => {
    document.cookie.split(";").forEach(cookie => {
      const cookieName = cookie.split("=")[0].trim();
      if (cookieName.includes('_ga') || cookieName.includes('_gid')) {
        // Clear with multiple domain variants to ensure removal
        document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
        document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=.${window.location.hostname};`;
        document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=${window.location.hostname};`;
      }
    });
  };

  const clearAdSenseCookies = () => {
    document.cookie.split(";").forEach(cookie => {
      const cookieName = cookie.split("=")[0].trim();
      // Common AdSense cookie patterns
      if (cookieName === 'NID' || 
          cookieName === 'IDE' || 
          cookieName === 'SAPISID' ||
          cookieName === '1P_JAR' ||
          cookieName === 'HSID' ||
          cookieName === 'SID') {
        document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
        document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=.${window.location.hostname};`;
        document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=${window.location.hostname};`;
      }
    });
  };

  const handleCookieAccept = ({ analytics, ads }) => {
    if (analytics && !analyticsLoaded) {
      loadAnalytics();
    }
    if (ads && !adsenseLoaded) {
      loadAdSense();
    }

    if (process.env.NODE_ENV !== 'production') {
      console.log("User consent:", { analytics, ads });
    }
  };

  const handleCookieDecline = ({ analytics, ads }) => {
    // Clear cookies for declined services
    if (!analytics) {
      clearAnalyticsCookies();
    }
    if (!ads) {
      clearAdSenseCookies();
    }

    if (process.env.NODE_ENV !== 'production') {
      console.log("User declined:", { analytics: !analytics, ads: !ads });
    }
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
            {/* CookieConsent */}
            <CookieConsent 
              onAccept={handleCookieAccept} 
              onDecline={handleCookieDecline}
            />
            
            <Routes>
              {/* Public Routes */}
              <Route path="/" element={<HomePage />} />
              <Route path="/post/:slug" element={<PostPage />} />
              <Route path="/category/:category" element={<CategoryPage />} />
              <Route path="/search" element={<SearchPage />} />
              
              {/* Policy routes */}
              <Route path="/privacy" element={<Navigate to="/policy/privacy" replace />} />
              <Route path="/terms" element={<Navigate to="/policy/terms" replace />} />
              <Route path="/cookie" element={<Navigate to="/policy/cookie" replace />} />
              <Route path="/policy/:type" element={<PolicyPage />} />
              
              <Route path="/admin/login" element={<AdminLogin />} />
              <Route path="/about" element={<About />} />
              <Route path="/author" element={<AuthorBio compact={false} />} />
              <Route path="/advertise" element={<Advertise />} />
              <Route path="/jobs" element={<JobsPage />} />
              <Route path="/jobs/:id" element={<JobDetails />} />
              
              {/* Protected Routes */}
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