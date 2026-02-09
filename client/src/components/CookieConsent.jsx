import React, { useEffect, useState, useRef } from "react";
import CookieCustomizeModal from "./CookieCustomizeModal";

// Cookie utility functions
const getCookie = (name) => {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop().split(';').shift();
  return null;
};

const setCookie = (name, value, days = 30) => {
  const date = new Date();
  date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
  const expires = `expires=${date.toUTCString()}`;
  const secure = window.location.protocol === 'https:' ? '; Secure' : '';
  document.cookie = `${name}=${value}; ${expires}; path=/; SameSite=Strict${secure}`;
};

const deleteCookie = (name) => {
  document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
};

export default function CookieConsent({ 
  onAccept = () => {}, 
  onDecline = () => {}
}) {
  const [visible, setVisible] = useState(false);
  const [showCustomizeModal, setShowCustomizeModal] = useState(false);
  const bannerRef = useRef(null);
  const timersRef = useRef([]);

  const showBanner = (delay = 0) => {
    const timer = setTimeout(() => setVisible(true), delay);
    timersRef.current.push(timer);
  };

  // Clear all timers on unmount
  useEffect(() => {
    return () => timersRef.current.forEach(t => clearTimeout(t));
  }, []);

  useEffect(() => {
    // Check for existing cookie consent
    const consentStatus = getCookie('techblog_consent_status');
    const consentExpiry = getCookie('techblog_consent_expiry');
    const now = Date.now();

    // Check if consent has expired (30 days)
    if (consentExpiry && now > parseInt(consentExpiry)) {
      // Clear expired cookies
      deleteCookie('techblog_consent_status');
      deleteCookie('techblog_consent_expiry');
      deleteCookie('techblog_analytics_consent');
      deleteCookie('techblog_ads_consent');
      
      // Also clear service cookies
      clearServiceCookies();
    }

    // Show banner if no consent or expired
    if (!consentStatus) {
      showBanner(10000);
    }
  }, []);

  // Clear Google Analytics and AdSense cookies
  const clearServiceCookies = () => {
    document.cookie.split(";").forEach(cookie => {
      const cookieName = cookie.split("=")[0].trim();
      // Analytics cookies
      if (cookieName.includes('_ga') || cookieName.includes('_gid')) {
        deleteCookie(cookieName);
      }
      // AdSense cookies
      if (cookieName === 'NID' || cookieName === 'IDE') {
        deleteCookie(cookieName);
      }
    });
  };

  // Auto-focus the banner when it becomes visible
  useEffect(() => {
    if (visible && bannerRef.current) {
      bannerRef.current.focus();
    }
  }, [visible]);

  // Trap focus inside the banner while visible
  useEffect(() => {
    if (!visible) return;

    const handleKeyDown = (e) => {
      if (e.key !== "Tab") return;

      const focusables = bannerRef.current?.querySelectorAll(
        "button, a, [tabindex]:not([tabindex='-1'])"
      );
      if (!focusables || focusables.length === 0) return;

      const first = focusables[0];
      const last = focusables[focusables.length - 1];

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [visible]);

  const handleAccept = () => {
    const expiryDate = Date.now() + 30 * 24 * 60 * 60 * 1000;
    
    // Save consent in cookies
    setCookie('techblog_consent_status', 'accepted');
    setCookie('techblog_consent_expiry', expiryDate.toString());
    setCookie('techblog_analytics_consent', 'true');
    setCookie('techblog_ads_consent', 'true');
    
    setVisible(false);
    onAccept({ analytics: true, ads: true });
  };

  const handleDecline = () => {
    const expiryDate = Date.now() + 30 * 24 * 60 * 60 * 1000;
    
    // Save declined status in cookies
    setCookie('techblog_consent_status', 'declined');
    setCookie('techblog_consent_expiry', expiryDate.toString());
    setCookie('techblog_analytics_consent', 'false');
    setCookie('techblog_ads_consent', 'false');
    
    // Clear service cookies
    clearServiceCookies();
    
    setVisible(false);
    onDecline({ analytics: false, ads: false });
  };

  const handleCustomize = () => {
    setVisible(false);
    setShowCustomizeModal(true);
  };

  const handleCustomizeSave = ({ analytics, ads }) => {
    const expiryDate = Date.now() + 30 * 24 * 60 * 60 * 1000;
    
    // Save customized preferences in cookies
    setCookie('techblog_consent_status', 'customized');
    setCookie('techblog_consent_expiry', expiryDate.toString());
    setCookie('techblog_analytics_consent', analytics.toString());
    setCookie('techblog_ads_consent', ads.toString());
    
    // Clear cookies for declined services
    if (!analytics || !ads) {
      clearServiceCookies();
    }
    
    if (analytics || ads) {
      onAccept({ analytics, ads });
    } else {
      onDecline({ analytics, ads });
    }
    
    setShowCustomizeModal(false);
  };

  // Dismiss on backdrop click (mobile)
  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      handleDecline();
    }
  };

  return (
    <>
      {/* Cookie Consent Banner */}
      {visible && (
        <div
          className="fixed inset-0 z-[9999] flex items-end justify-end px-4 pb-4"
          onClick={handleBackdropClick}
          aria-hidden="true"
        >
          {/* Backdrop - clickable on mobile to dismiss */}
          <div className="fixed inset-0 bg-black opacity-20 sm:hidden" />

          {/* Banner */}
          <div
            ref={bannerRef}
            tabIndex={-1}
            role="dialog"
            aria-modal="true"
            aria-label="Cookie consent notice"
            className="relative w-full max-w-xs sm:max-w-sm bg-[#f9f9f9] dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 overflow-hidden focus:outline-none"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center gap-3 p-3 border-b border-gray-200 dark:border-gray-700">
              <svg className="w-6 h-6 text-blue-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
              <div className="flex-1">
                <p className="text-sm font-semibold text-gray-900 dark:text-white">Privacy Notice</p>
                <p className="text-xs text-gray-600 dark:text-gray-300">We use cookies to improve your experience</p>
              </div>
            </div>

            {/* Content */}
            <div className="p-3 text-sm text-gray-800 dark:text-gray-200">
              <p className="mb-2">
                TechBlog AI uses cookies to enhance browsing and analytics. Manage your preferences via{" "}
                <button
                  onClick={handleCustomize}
                  className="text-blue-600 dark:text-blue-400 underline font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none rounded"
                >
                  Cookie Settings
                </button>.
              </p>

              {/* Buttons */}
              <div className="flex flex-col sm:flex-row gap-2 text-xs">
                <button
                  onClick={handleAccept}
                  className="flex-1 sm:flex-none px-3 py-1.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none transition"
                >
                  Accept All
                </button>
                <button
                  onClick={handleDecline}
                  className="flex-1 sm:flex-none px-3 py-1.5 border border-gray-400 dark:border-gray-600 text-gray-800 dark:text-gray-200 rounded-md hover:bg-red-100 dark:hover:bg-gray-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none transition"
                >
                  Decline
                </button>
                <button
                  onClick={handleCustomize}
                  className="flex-1 sm:flex-none px-3 py-1.5 border border-gray-400 dark:border-gray-600 text-gray-800 dark:text-gray-200 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none transition"
                >
                  Customize
                </button>
              </div>

              <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                Your choice is remembered for 30 days. See our{" "}
                <a
                  href="/policy/privacy"
                  className="text-blue-600 dark:text-blue-400 underline focus:ring-2 focus:ring-blue-500 focus:outline-none rounded"
                >
                  Privacy Policy
                </a>{" "}
                for details.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Cookie Customize Modal */}
      <CookieCustomizeModal
        isOpen={showCustomizeModal}
        onClose={() => setShowCustomizeModal(false)}
        onSave={handleCustomizeSave}
      />
    </>
  );
}