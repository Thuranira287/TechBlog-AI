import React, { useState, useEffect } from "react";

export default function CookieCustomizeModal({ isOpen, onClose, onSave }) {
  const [analytics, setAnalytics] = useState(true);
  const [ads, setAds] = useState(true);

  // Sync toggles from saved preferences whenever modal opens
  useEffect(() => {
    if (!isOpen) return;
    const savedAnalytics = localStorage.getItem("techblog_analytics_consent");
    const savedAds = localStorage.getItem("techblog_ads_consent");
    if (savedAnalytics !== null) setAnalytics(savedAnalytics === "true");
    if (savedAds !== null) setAds(savedAds === "true");
  }, [isOpen]);

  const handleSave = () => {
    const expiryDate = Date.now() + 30 * 24 * 60 * 60 * 1000;

    // Base consent "customized" so we know the user made granular choices
    localStorage.setItem("techblog_cookie_consent", "customized");
    localStorage.setItem("techblog_consent_expiry", expiryDate.toString());

    // Granular preferences
    localStorage.setItem("techblog_analytics_consent", analytics.toString());
    localStorage.setItem("techblog_ads_consent", ads.toString());

    onSave({ analytics, ads });
    onClose();
  };

  if (!isOpen) return null;

  // Reusable toggle component
  const Toggle = ({ value, onChange, label }) => (
    <button
      onClick={() => onChange(!value)}
      aria-label={`${label}: ${value ? "on" : "off"}`}
      className={`relative w-11 h-6 rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
        value ? "bg-blue-600" : "bg-gray-300 dark:bg-gray-600"
      }`}
    >
      <span
        className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${
          value ? "translate-x-5" : "translate-x-0"
        }`}
      />
    </button>
  );

  // Cookie category row
  const CategoryRow = ({ title, description, toggleValue, onToggle, isEssential = false }) => (
    <div className="flex items-start justify-between gap-4">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-900 dark:text-white">{title}</p>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 leading-relaxed">{description}</p>
      </div>
      <div className="flex-shrink-0 mt-0.5">
        {isEssential ? (
          <span className="inline-block text-xs font-semibold bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 px-3 py-1 rounded-full">
            Always On
          </span>
        ) : (
          <Toggle value={toggleValue} onChange={onToggle} label={title} />
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[9998] bg-black opacity-40"
        onClick={onClose}
      />

      {/* Modal */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Cookie preferences"
        className="fixed inset-0 z-[9999] flex items-center justify-center px-4"
      >
        <div className="w-full max-w-md bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden">

          {/* Header */}
          <div className="flex items-center justify-between p-5 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">Cookie Preferences</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded"
              aria-label="Close"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Body */}
          <div className="p-5 space-y-5">
            <CategoryRow
              title="Essential Cookies"
              description="Required for the site to work. These store your consent choice and cannot be disabled."
              isEssential={true}
            />

            <hr className="border-gray-200 dark:border-gray-700" />

            <CategoryRow
              title="Analytics Cookies"
              description="Help us understand how visitors use the site. We use Google Analytics to collect anonymous traffic data."
              toggleValue={analytics}
              onToggle={setAnalytics}
            />

            <hr className="border-gray-200 dark:border-gray-700" />

            <CategoryRow
              title="Advertising Cookies"
              description="Used by Google AdSense to show relevant ads. These may track your interests across sites to personalise what you see."
              toggleValue={ads}
              onToggle={setAds}
            />
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-2 p-5 border-t border-gray-200 dark:border-gray-700">
            <button
              onClick={onClose}
              className="px-4 py-1.5 text-sm border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 focus:ring-2 focus:ring-blue-500 focus:outline-none transition"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-1.5 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none transition"
            >
              Save Preferences
            </button>
          </div>
        </div>
      </div>
    </>
  );
}