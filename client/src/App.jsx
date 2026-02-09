import React, { useState, useEffect, lazy, Suspense } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";

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
import { useAuth, AuthProvider } from "./context/ContextAuth";
import CookieConsent from "./components/CookieConsent";
import AuthorBio from "./components/AuthorBio";

// ProtectedRoute using AuthContext
const ProtectedRoute = ({ children, requireAdmin = false }) => {
  const { user, loading } = useAuth();

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

  if (!user) {
    return <Navigate to="/admin/login" replace />;
  }

  if (requireAdmin && user.role !== 'admin') {
    return <Navigate to="/unauthorized" replace />;
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

// Cookie consent utility functions
const getCookie = (name) => {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop().split(';').shift();
  return null;
};

const setCookie = (name, value, days = 365) => {
  const date = new Date();
  date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
  const expires = `expires=${date.toUTCString()}`;
  document.cookie = `${name}=${value}; ${expires}; path=/; SameSite=Strict${window.location.protocol === 'https:' ? '; Secure' : ''}`;
};

const deleteCookie = (name) => {
  document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
};

function AppContent() {
  const [analyticsLoaded, setAnalyticsLoaded] = useState(false);
  const [adsenseLoaded, setAdsenseLoaded] = useState(false);
  const [consentChecked, setConsentChecked] = useState(false);

  // Check cookie consent on mount
  useEffect(() => {
    checkConsent();
  }, []);

  const checkConsent = () => {
    // Check if user has already made a choice
    const consentStatus = getCookie('techblog_consent_status');
    
    if (consentStatus === 'accepted' || consentStatus === 'customized') {
      // Load services based on cookie preferences
      const analyticsConsent = getCookie('techblog_analytics');
      const adsConsent = getCookie('techblog_ads');
      
      if (analyticsConsent === 'true') {
        loadAnalytics();
      }
      if (adsConsent === 'true') {
        loadAdSense();
      }
    }
    
    setConsentChecked(true);
  };

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
    gtag('config', 'G-L2JCRCT3F3', {
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
    // Clear analytics cookies
    document.cookie.split(";").forEach(cookie => {
      const cookieName = cookie.split("=")[0].trim();
      if (cookieName.includes('_ga') || cookieName.includes('_gid')) {
        deleteCookie(cookieName);
      }
    });
  };

  const clearAdSenseCookies = () => {
    // Clear ads cookies
    document.cookie.split(";").forEach(cookie => {
      const cookieName = cookie.split("=")[0].trim();
      if (cookieName === 'NID' || cookieName === 'IDE') {
        deleteCookie(cookieName);
      }
    });
  };

  const handleCookieAccept = ({ analytics, ads }) => {
    // Save consent in cookies
    if (analytics && ads) {
      setCookie('techblog_consent_status', 'accepted');
    } else {
      setCookie('techblog_consent_status', 'customized');
    }
    
    setCookie('techblog_analytics', analytics.toString());
    setCookie('techblog_ads', ads.toString());
    
    // Load services based on consent
    if (analytics) {
      loadAnalytics();
    }
    if (ads) {
      loadAdSense();
    }
  };

  const handleCookieDecline = ({ analytics, ads }) => {
    // User declined some services
    setCookie('techblog_consent_status', 'customized');
    setCookie('techblog_analytics', analytics.toString());
    setCookie('techblog_ads', ads.toString());
    
    // Clear cookies for declined services
    if (!analytics) {
      clearAnalyticsCookies();
    }
    if (!ads) {
      clearAdSenseCookies();
    }
    
    // Load services that were accepted
    if (analytics) {
      loadAnalytics();
    }
    if (ads) {
      loadAdSense();
    }
  };

  // Show loading until consent is checked
  if (!consentChecked) {
    return null; // Or a loading spinner
  }

  return (
    <>
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
            <ProtectedRoute requireAdmin>
              <Suspense fallback={<AdminLoadingFallback />}>
                <AdminDashboard />
              </Suspense>
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/admin/posts/new" 
          element={
            <ProtectedRoute requireAdmin>
              <Suspense fallback={<AdminLoadingFallback />}>
                <PostEditor />
              </Suspense>
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/admin/posts/edit/:id" 
          element={
            <ProtectedRoute requireAdmin>
              <Suspense fallback={<AdminLoadingFallback />}>
                <PostEditor />
              </Suspense>
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/admin/comments" 
          element={
            <ProtectedRoute requireAdmin>
              <Suspense fallback={<AdminLoadingFallback />}>
                <CommentsPage />
              </Suspense>
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/admin/jobs" 
          element={
            <ProtectedRoute requireAdmin>
              <Suspense fallback={<AdminLoadingFallback />}>
                <JobManager />
              </Suspense>
            </ProtectedRoute>
          } 
        />
        
        {/* 404 Catch-all */}
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </>
  );
}

function App() {
  return (
    <HelmetProvider>
      <BlogProvider>
        <AuthProvider>
          <Router
            future={{
              v7_startTransition: true,
              v7_relativeSplatPath: true,
            }}
          >
            <Layout>
              <AppContent />
            </Layout>
          </Router>
        </AuthProvider>
      </BlogProvider>
    </HelmetProvider>
  );
}

export default App;