import React, { useEffect, useState, useRef } from "react";
import CookieCustomizeModal from "./CookieCustomizeModal";

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
    const savedConsent = localStorage.getItem("techblog_cookie_consent");
    const consentExpiry = localStorage.getItem("techblog_consent_expiry");
    const now = Date.now();

    // Expired consent clear and re-show
    if (consentExpiry && now > parseInt(consentExpiry)) {
      localStorage.removeItem("techblog_cookie_consent");
      localStorage.removeItem("techblog_consent_expiry");
      localStorage.removeItem("techblog_analytics_consent");
      localStorage.removeItem("techblog_ads_consent");
    }

    const currentConsent = localStorage.getItem("techblog_cookie_consent");
    if (!currentConsent) {
      showBanner(10000);
    }
  }, []);

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
    localStorage.setItem("techblog_cookie_consent", "accepted");
    localStorage.setItem("techblog_consent_expiry", expiryDate.toString());
    // When user accepts all, enable both analytics and ads
    localStorage.setItem("techblog_analytics_consent", "true");
    localStorage.setItem("techblog_ads_consent", "true");
    setVisible(false);
    onAccept({ analytics: true, ads: true });
  };

  const handleDecline = () => {
    const expiryDate = Date.now() + 30 * 24 * 60 * 60 * 1000;
    localStorage.setItem("techblog_cookie_consent", "declined");
    localStorage.setItem("techblog_consent_expiry", expiryDate.toString());
    // When user declines, disable both analytics and ads
    localStorage.setItem("techblog_analytics_consent", "false");
    localStorage.setItem("techblog_ads_consent", "false");
    setVisible(false);
    onDecline({ analytics: false, ads: false });
  };

  const handleCustomize = () => {
    setVisible(false);
    setShowCustomizeModal(true);
  };

  const handleCustomizeSave = ({ analytics, ads }) => {
    if (analytics || ads) {
      onAccept({ analytics, ads });
    } else {
      onDecline({ analytics, ads });
    }
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