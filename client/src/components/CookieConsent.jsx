import React, { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";

export default function CookieConsent({ 
  onAccept = () => {}, 
  onDecline = () => {},
  privacyLink = "/privacy#cookies"
}) {
  const [visible, setVisible] = useState(false);
  const navigate = useNavigate();
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

    // Expired consent
    if (consentExpiry && now > parseInt(consentExpiry)) {
      localStorage.removeItem("techblog_cookie_consent");
      localStorage.removeItem("techblog_consent_expiry");
    }

    // Show banner if no consent
    if (!savedConsent) {
      showBanner(10000); // 10 seconds after page load
    }
  }, []);

  const handleAccept = () => {
    const expiryDate = Date.now() + 30 * 24 * 60 * 60 * 1000;
    localStorage.setItem("techblog_cookie_consent", "accepted");
    localStorage.setItem("techblog_consent_expiry", expiryDate.toString());
    setVisible(false);
    onAccept();
  };

  const handleDecline = () => {
    const expiryDate = Date.now() + 30 * 24 * 60 * 60 * 1000;
    localStorage.setItem("techblog_cookie_consent", "declined");
    localStorage.setItem("techblog_consent_expiry", expiryDate.toString());
    setVisible(false);

    // Re-show banner after 10 minutes
    showBanner(5 * 60 * 1000);
    onDecline();
  };

  const handleCustomize = () => {
    setVisible(false);
    navigate(privacyLink);
  };

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-end justify-end px-4 pb-4 pointer-events-none">
      {/* Optional backdrop for small screens */}
      <div className="fixed inset-0 bg-black opacity-20 sm:hidden pointer-events-none" />

        {/* Banner */}
        <div className="w-full max-w-xs sm:max-w-sm bg-[#f9f9f9] dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 overflow-hidden pointer-events-auto">
          {/* Header */}
          <div className="flex items-center gap-3 p-3 border-b border-gray-200 dark:border-gray-700">
            <div className="w-8 h-8 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center text-gray-800 dark:text-white font-bold">
              i
            </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-gray-900 dark:text-white">Privacy Notice</p>
            <p className="text-xs text-gray-600 dark:text-gray-300">We use cookies</p>
          </div>
        </div>

        {/* Content */}
        <div className="p-3 text-sm text-gray-800 dark:text-gray-200">
          <p className="mb-2">
            TechBlog AI uses cookies. Manage preferences via{" "}
            <button
              onClick={handleCustomize}
              className="text-blue-600 dark:text-blue-400 underline font-medium"
            >
              Cookie Settings
            </button>.
          </p>

          {/* Buttons */}
          <div className="flex flex-col sm:flex-row gap-2 text-xs">
            <button
              onClick={handleAccept}
              className="flex-1 sm:flex-none px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition"
            >
              Accept All
            </button>
            <button
              onClick={handleDecline}
              className="flex-1 sm:flex-none px-3 py-1 border border-gray-400 dark:border-gray-600 text-gray-800 dark:text-gray-200 rounded-md hover:bg-red-600 dark:hover:bg-gray-700 transition"
            >
              Decline
            </button>
            <button
              onClick={handleCustomize}
              className="flex-1 sm:flex-none px-3 py-1 border border-gray-400 dark:border-gray-600 text-gray-800 dark:text-gray-200 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 transition"
            >
              Customize
            </button>
          </div>

          <p className="mt-2 text-xs text-gray-600 dark:text-gray-400">
            Your choice remembered for 30 days.
          </p>
        </div>
      </div>
    </div>
  );
}
