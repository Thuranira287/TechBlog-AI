import React, { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";

/**
 * CookieConsent Component
 * 
 * A GDPR-compliant cookie consent banner that appears when no consent has been recorded.
 * Users can accept or decline cookies, with their preference stored in localStorage.
 * Links to the existing cookies/privacy page for detailed information.
 * 
 * @param {Object} props - Component properties
 * @param {Function} props.onAccept - Callback fired when user accepts cookies
 * @param {Function} props.onDecline - Callback fired when user declines non-essential cookies
 * @param {string} props.privacyLink - Link to privacy/cookies page (default: "/privacy#cookies")
 */

export default function CookieConsent({ 
  onAccept = () => {}, 
  onDecline = () => {},
  privacyLink = "/privacy#cookies"
}) {
  const [visible, setVisible] = useState(false);
  const [consent, setConsent] = useState(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const firstRender = useRef(true);
  const bannerRef = useRef(null);
  const navigate = useNavigate();

  // Check for existing consent on mount
  useEffect(() => {
    const checkExistingConsent = () => {
      const savedConsent = localStorage.getItem("techblog_cookie_consent");
      const consentExpiry = localStorage.getItem("techblog_consent_expiry");
      
      // Check if consent has expired (30 days validity)
      const now = new Date().getTime();
      if (consentExpiry && now > parseInt(consentExpiry)) {
        // Consent expired, clear and show banner
        localStorage.removeItem("techblog_cookie_consent");
        localStorage.removeItem("techblog_consent_expiry");
        setIsLoading(false);
        
        // Show banner after a brief delay for better UX
        setTimeout(() => {
          setVisible(true);
          setIsAnimating(true);
        }, 1000);
      } else if (savedConsent) {
        // Valid consent exists
        setConsent(savedConsent);
        setIsLoading(false);
      } else {
        // No consent exists
        setIsLoading(false);
        
        // Show banner after a brief delay for better UX
        setTimeout(() => {
          setVisible(true);
          setIsAnimating(true);
        }, 1000);
      }
    };

    // Wait a bit before checking to ensure DOM is ready
    setTimeout(checkExistingConsent, 500);
  }, []);

  // Handle consent change
  useEffect(() => {
    if (!firstRender.current && consent) {
      // Animate out before hiding
      setIsAnimating(false);
      const hideTimer = setTimeout(() => setVisible(false), 300);
      return () => clearTimeout(hideTimer);
    }
    firstRender.current = false;
  }, [consent]);

  // Function to clear third-party cookies with Partitioned attribute
  const clearThirdPartyCookies = () => {
    try {
      const cookies = document.cookie.split(";");
      const domain = window.location.hostname;
      const domainParts = domain.split(".");
      const mainDomain = domainParts.length > 1 
        ? `.${domainParts.slice(-2).join(".")}` 
        : domain;

      cookies.forEach(cookie => {
        const [name, ...rest] = cookie.split("=");
        const trimmedName = name.trim();
        
        // Clear common third-party cookies that need Partitioned attribute
        if (trimmedName.includes('_ga') || 
            trimmedName.includes('_gid') || 
            trimmedName.includes('_gat') ||
            trimmedName === 'IDE' || 
            trimmedName === 'test_cookie' ||
            trimmedName.includes('_gac') ||
            trimmedName.includes('_gcl') ||
            trimmedName.includes('_fbp') ||
            trimmedName.includes('_fbc')) {
          
          // Clear with multiple domain variations for thorough cleanup
          const domainsToClear = [
            mainDomain,
            `.${domain}`,
            domain,
            window.location.hostname
          ];

          // Also clear for www subdomain if applicable
          if (domain.startsWith('www.')) {
            domainsToClear.push(`.${domain.substring(4)}`);
            domainsToClear.push(domain.substring(4));
          }

          // Set expired date for all variations
          const expiryDate = "Thu, 01 Jan 1970 00:00:00 UTC";
          
          domainsToClear.forEach(clearDomain => {
            // Try with Partitioned attribute first (for Chrome)
            document.cookie = `${trimmedName}=; expires=${expiryDate}; path=/; domain=${clearDomain}; SameSite=None; Secure; Partitioned`;
            document.cookie = `${trimmedName}=; expires=${expiryDate}; path=/; domain=${clearDomain}; SameSite=None; Secure`;
            document.cookie = `${trimmedName}=; expires=${expiryDate}; path=/; domain=${clearDomain}`;
            
            // Clear without domain (for localhost and specific paths)
            document.cookie = `${trimmedName}=; expires=${expiryDate}; path=/; SameSite=None; Secure; Partitioned`;
            document.cookie = `${trimmedName}=; expires=${expiryDate}; path=/; SameSite=None; Secure`;
            document.cookie = `${trimmedName}=; expires=${expiryDate}; path=/`;
          });
        }
      });

      // Also clear localStorage items that might be from third-party scripts
      const localStorageKeys = Object.keys(localStorage);
      localStorageKeys.forEach(key => {
        if (key.includes('google') || 
            key.includes('ga') || 
            key.includes('gtag') ||
            key.includes('fb') ||
            key.includes('analytics')) {
          localStorage.removeItem(key);
        }
      });

      console.log("Third-party cookies cleared with Partitioned attribute");
    } catch (error) {
      console.warn("Error clearing cookies:", error);
    }
  };

  const handleAccept = () => {
    try {
      const expiryDate = new Date().getTime() + (30 * 24 * 60 * 60 * 1000); // 30 days
      localStorage.setItem("techblog_cookie_consent", "accepted");
      localStorage.setItem("techblog_consent_expiry", expiryDate.toString());
      
      // Log acceptance for debugging
      localStorage.setItem("cookie_consent_timestamp", new Date().toISOString());
      
      setConsent("accepted");
      onAccept();
      
      // Set a success flag for debugging
      console.log("✅ Cookie consent: Accepted");
    } catch (error) {
      console.error("Error saving cookie consent:", error);
    }
  };

  const handleDecline = () => {
    try {
      const expiryDate = new Date().getTime() + (30 * 24 * 60 * 60 * 1000); // 30 days
      localStorage.setItem("techblog_cookie_consent", "declined");
      localStorage.setItem("techblog_consent_expiry", expiryDate.toString());
      
      // Clear third-party cookies with Partitioned attribute
      clearThirdPartyCookies();
      
      // Also clear first-party analytics cookies if they exist
      document.cookie.split(";").forEach(cookie => {
        const [name] = cookie.split("=");
        const trimmedName = name.trim();
        
        // Clear first-party analytics cookies too
        if (trimmedName.startsWith('_') && 
            (trimmedName.includes('ga') || trimmedName.includes('gid'))) {
          document.cookie = `${trimmedName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/`;
        }
      });
      
      // Log decline for debugging
      localStorage.setItem("cookie_decline_timestamp", new Date().toISOString());
      
      setConsent("declined");
      onDecline();
      
      // Set a success flag for debugging
      console.log("❌ Cookie consent: Declined - All non-essential cookies cleared");
    } catch (error) {
      console.error("Error declining cookie consent:", error);
    }
  };

  const handleCustomize = () => {
    // Close the banner first
    setIsAnimating(false);
    setTimeout(() => {
      setVisible(false);
      // Use React Router navigation
      navigate(privacyLink);
    }, 200);
  };

  // Don't render if loading, consent already given, or banner not visible
  if (isLoading || !visible) return null;

  return (
    <div
      role="dialog"
      aria-label="Cookie consent"
      aria-live="polite"
      className="fixed inset-0 z-[9999] flex items-end justify-center px-4 pb-6 pointer-events-none sm:p-6 sm:items-end sm:justify-end"
      ref={bannerRef}
    >
      {/* Backdrop for mobile */}
      <div 
        className={`fixed inset-0 bg-black transition-opacity duration-300 ${
          isAnimating ? 'opacity-50' : 'opacity-0'
        } pointer-events-auto sm:hidden`}
        onClick={() => setIsAnimating(false)}
      />
      
      {/* Cookie Banner */}
      <div
        className={`w-full max-w-md bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-800 overflow-hidden transform transition-all duration-300 pointer-events-auto ${
          isAnimating 
            ? 'translate-y-0 opacity-100' 
            : 'translate-y-full opacity-0'
        } sm:max-w-lg`}
      >
        {/* Header */}
        <div className="p-6 border-b border-gray-100 dark:border-gray-800">
          <div className="flex items-center gap-4">
            <div className="flex-shrink-0">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-100 to-cyan-100 flex items-center justify-center shadow-inner">
                <svg 
                  className="w-6 h-6 text-blue-600" 
                  fill="currentColor" 
                  viewBox="0 0 24 24" 
                  xmlns="http://www.w3.org/2000/svg"
                  aria-hidden="true"
                >
                  <path fillRule="evenodd" d="M9 4.5a.75.75 0 01.721.544l.813 2.846a3.75 3.75 0 002.576 2.576l2.846.813a.75.75 0 010 1.442l-2.846.813a3.75 3.75 0 00-2.576 2.576l-.813 2.846a.75.75 0 01-1.442 0l-.813-2.846a3.75 3.75 0 00-2.576-2.576l-2.846-.813a.75.75 0 010-1.442l2.846-.813A3.75 3.75 0 007.466 7.89l.813-2.846A.75.75 0 019 4.5zM18 1.5a.75.75 0 01.728.568l.258 1.036c.236.94.97 1.674 1.91 1.91l1.036.258a.75.75 0 010 1.456l-1.036.258c-.94.236-1.674.97-1.91 1.91l-.258 1.036a.75.75 0 01-1.456 0l-.258-1.036a2.625 2.625 0 00-1.91-1.91l-1.036-.258a.75.75 0 010-1.456l1.036-.258a2.625 2.625 0 001.91-1.91l.258-1.036A.75.75 0 0118 1.5zM16.5 15a.75.75 0 01.712.513l.394 1.183c.15.447.5.799.948.948l1.183.395a.75.75 0 010 1.422l-1.183.395c-.447.15-.799.5-.948.948l-.395 1.183a.75.75 0 01-1.422 0l-.395-1.183a1.5 1.5 0 00-.948-.948l-1.183-.395a.75.75 0 010-1.422l1.183-.395c.447-.15.799-.5.948-.948l.395-1.183A.75.75 0 0116.5 15z" clipRule="evenodd" />
                </svg>
              </div>
            </div>
            
            <div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                Your Privacy, Your Choice
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                We respect your data preferences
              </p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
            At <span className="font-semibold text-blue-600 dark:text-blue-400">TechBlog AI</span>, we use cookies to enhance your browsing experience. Essential cookies are required for the site to function properly. You can manage your preferences at any time through our{" "}
            <button
              onClick={handleCustomize}
              className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 font-medium underline transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded px-1"
              aria-label="Navigate to cookie settings page"
            >
              Cookie Settings
            </button>{" "}
            page.
          </p>

          <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              onClick={handleAccept}
              className="px-5 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 text-white font-semibold rounded-lg hover:from-blue-700 hover:to-cyan-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all duration-200 transform hover:-translate-y-0.5 active:scale-95 shadow-md hover:shadow-lg"
              aria-label="Accept all cookies"
            >
              Accept All Cookies
            </button>

            <button
              onClick={handleDecline}
              className="px-5 py-3 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-gray-800 dark:text-gray-200 font-semibold rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-300 focus:ring-offset-2 transition-all duration-200 active:scale-95"
              aria-label="Decline non-essential cookies, keep only essential ones"
            >
              Essential Only
            </button>
          </div>

          <div className="mt-6 pt-6 border-t border-gray-100 dark:border-gray-800">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <button
                onClick={handleCustomize}
                className="inline-flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded-lg px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-800"
                aria-label="Customize cookie preferences on settings page"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
                </svg>
                Customize Preferences
              </button>
              
              <div className="text-xs text-gray-500 dark:text-gray-500 flex items-center gap-1">
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                </svg>
                Your choice will be saved for 30 days
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}