import React, { useState, useEffect, useRef } from "react";

// Load AdSense script once
let adsenseLoaded = false;
let adsenseLoading = false;

const AdSense = () => {
  useEffect(() => {
    if (adsenseLoaded || adsenseLoading) return;
    
    adsenseLoading = true;
    const script = document.createElement("script");
    script.src = "https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-2881807085062922";
    script.async = true;
    script.crossOrigin = "anonymous";
    script.onload = () => {
      adsenseLoaded = true;
      adsenseLoading = false;
    };
    document.head.appendChild(script);
  }, []);

  return null;
};

// Ad Unit
export const AdUnit = ({ slot, format = "auto", responsive = true, className = "", delay = 0 }) => {
  const adRef = useRef(null);
  const [shouldRender, setShouldRender] = useState(delay === 0);
  const [pushed, setPushed] = useState(false);

  // Handle delayed rendering for slow content
  useEffect(() => {
    if (delay > 0) {
      const timer = setTimeout(() => {
        setShouldRender(true);
      }, delay);
      
      return () => clearTimeout(timer);
    }
  }, [delay]);

  // Initialize ad when ready
  useEffect(() => {
    if (!shouldRender || !adRef.current || pushed || !adsenseLoaded) return;
    
    //additional delay to ensure DOM is ready
    const timer = setTimeout(() => {
      try {
        adRef.current.innerHTML = '';
        
        const ins = document.createElement('ins');
        ins.className = 'adsbygoogle';
        ins.style.display = 'block';
        ins.style.textAlign = 'center';
        ins.setAttribute('data-ad-client', 'ca-pub-2881807085062922');
        ins.setAttribute('data-ad-slot', slot);
        ins.setAttribute('data-ad-format', format);
        ins.setAttribute('data-full-width-responsive', responsive.toString());
        
        adRef.current.appendChild(ins);
        
        (window.adsbygoogle = window.adsbygoogle || []).push({});
        setPushed(true);
      } catch (e) {
        console.warn("AdSense push error:", e);
        // Retry once after 2 seconds
        setTimeout(() => {
          try {
            (window.adsbygoogle = window.adsbygoogle || []).push({});
            setPushed(true);
          } catch (retryError) {
            console.warn("AdSense retry failed:", retryError);
          }
        }, 2000);
      }
    }, 100);
    
    return () => clearTimeout(timer);
  }, [shouldRender, slot, format, responsive, pushed]);

  // Don't render if not ready
  if (!shouldRender) {
    return <div className="ad-placeholder" style={{ minHeight: '100px', background: '#f9f9f9' }} />;
  }

  return <div ref={adRef} className={`ad-container ${className}`} />;
};

// Header Ad
export const HeaderAd = () => {
  const [pageLoaded, setPageLoaded] = useState(false);
  
  useEffect(() => {
    // Wait for page to be fully loaded
    if (document.readyState === 'complete') {
      setPageLoaded(true);
    } else {
      window.addEventListener('load', () => setPageLoaded(true));
      return () => window.removeEventListener('load', () => setPageLoaded(true));
    }
  }, []);
  
  // Don't show header ad until page is loaded
  if (!pageLoaded) return null;
  
  return (
    <div className="w-full bg-gray-50 py-2">
      <div className="container mx-auto px-4 text-center">
        <AdUnit slot="8847382989" format="auto" />
      </div>
    </div>
  );
};

// Sidebar Ad
export const SidebarAd = () => (
  <div className="sticky top-4">
    <AdUnit slot="8847382989" format="auto" />
  </div>
);

// In-Content Ad with progressive loading
export const InContentAd = ({ priority = 'normal' }) => {
  // Higher priority ads load faster
  const delay = priority === 'high' ? 0 : priority === 'medium' ? 500 : 1000;
  
  return (
    <div className="my-8 text-center">
      <AdUnit slot="8847382989" format="auto" delay={delay} />
    </div>
  );
};

// Progressive ad loader for multiple ads
export const ProgressiveAdLoader = ({ count = 3, className = "" }) => {
  const [loadedCount, setLoadedCount] = useState(1);
  
  useEffect(() => {
    // Load ads one by one with delay
    if (loadedCount < count) {
      const timer = setTimeout(() => {
        setLoadedCount(prev => prev + 1);
      }, 1000);
      
      return () => clearTimeout(timer);
    }
  }, [loadedCount, count]);
  
  return (
    <div className={className}>
      {Array.from({ length: loadedCount }).map((_, i) => (
        <InContentAd key={i} priority={i === 0 ? 'high' : 'low'} />
      ))}
    </div>
  );
};

export default AdSense;