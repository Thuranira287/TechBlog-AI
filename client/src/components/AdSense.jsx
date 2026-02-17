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

// Ad Unit with better empty state handling
export const AdUnit = ({ slot, format = "auto", responsive = true, className = "", delay = 0 }) => {
  const adRef = useRef(null);
  const [shouldRender, setShouldRender] = useState(delay === 0);
  const [pushed, setPushed] = useState(false);
  const [hasAd, setHasAd] = useState(false);
  const checkIntervalRef = useRef(null);
  const timeoutRef = useRef(null);

  // Handle delayed rendering for slow content
  useEffect(() => {
    if (delay > 0) {
      const timer = setTimeout(() => {
        setShouldRender(true);
      }, delay);
      
      return () => clearTimeout(timer);
    }
  }, [delay]);

  // Check if ad actually loaded
  const checkAdLoaded = () => {
    if (!adRef.current) return false;
    
    const ins = adRef.current.querySelector('ins.adsbygoogle');
    if (!ins) return false;
    
    // Check if iframe exists and has content
    const iframe = ins.querySelector('iframe');
    if (iframe) {
      // Check if iframe has actual dimensions
      const iframeWidth = iframe.offsetWidth;
      const iframeHeight = iframe.offsetHeight;
      
      if (iframeWidth > 0 && iframeHeight > 0) {
        setHasAd(true);
        // Add data attribute to help CSS
        if (ins) {
          ins.setAttribute('data-ad-status', 'filled');
        }
        return true;
      }
    }
    
    return false;
  };

  // Initialize ad when ready
  useEffect(() => {
    if (!shouldRender || !adRef.current || pushed || !adsenseLoaded) return;
    
    // Clear any existing intervals/timeouts
    if (checkIntervalRef.current) {
      clearInterval(checkIntervalRef.current);
      checkIntervalRef.current = null;
    }
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    
    // Additional delay to ensure DOM is ready
    const timer = setTimeout(() => {
      try {
        // Clear container but keep the ad-container styling
        adRef.current.innerHTML = '';
        
        // Add a small ad label (optional)
        const label = document.createElement('div');
        label.className = 'ad-label';
        label.textContent = 'Advertisement';
        label.style.display = 'none'; 
        adRef.current.appendChild(label);
        
        const ins = document.createElement('ins');
        ins.className = 'adsbygoogle';
        ins.style.display = 'block';
        ins.style.textAlign = 'center';
        ins.setAttribute('data-ad-client', 'ca-pub-2881807085062922');
        ins.setAttribute('data-ad-slot', slot);
        ins.setAttribute('data-ad-format', format);
        ins.setAttribute('data-full-width-responsive', responsive.toString());
        ins.setAttribute('data-ad-status', 'unfilled');
        
        adRef.current.appendChild(ins);
        
        // Push the ad
        (window.adsbygoogle = window.adsbygoogle || []).push({});
        setPushed(true);
        
        // Start checking if ad loaded
        checkIntervalRef.current = setInterval(() => {
          const loaded = checkAdLoaded();
          if (loaded) {
            // Show the ad label
            const label = adRef.current?.querySelector('.ad-label');
            if (label) {
              label.style.display = 'block';
            }
            clearInterval(checkIntervalRef.current);
            checkIntervalRef.current = null;
          }
        }, 500);
        
        // Stop checking after 8 seconds (timeout)
        timeoutRef.current = setTimeout(() => {
          if (checkIntervalRef.current) {
            clearInterval(checkIntervalRef.current);
            checkIntervalRef.current = null;
          }
          
          // If no ad loaded, hide the entire container
          if (!hasAd && adRef.current) {
            adRef.current.classList.add('ad-empty');
            // Hide the container
            adRef.current.style.display = 'none';
          }
        }, 8000);
        
      } catch (e) {
        console.warn("AdSense push error:", e);
        // Retry once after 2 seconds
        setTimeout(() => {
          try {
            (window.adsbygoogle = window.adsbygoogle || []).push({});
            setPushed(true);
          } catch (retryError) {
            console.warn("AdSense retry failed:", retryError);
            // Hide container on failure
            if (adRef.current) {
              adRef.current.style.display = 'none';
            }
          }
        }, 2000);
      }
    }, 100);
    
    return () => {
      clearTimeout(timer);
      if (checkIntervalRef.current) {
        clearInterval(checkIntervalRef.current);
        checkIntervalRef.current = null;
      }
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, [shouldRender, slot, format, responsive, pushed]);

  // Don't render anything if not ready
  if (!shouldRender) {
    return null;
  }

  return <div ref={adRef} className={`ad-container ${className}`} />;
};

// Header Ad
export const HeaderAd = () => {
  const [pageLoaded, setPageLoaded] = useState(false);
  const [shouldShow, setShouldShow] = useState(true);
  const adRef = useRef(null);
  
  useEffect(() => {
    // Wait for page to be fully loaded
    if (document.readyState === 'complete') {
      setPageLoaded(true);
    } else {
      window.addEventListener('load', () => setPageLoaded(true));
      return () => window.removeEventListener('load', () => setPageLoaded(true));
    }
  }, []);
  
  // Check if ad container has content after loading
  useEffect(() => {
    if (!pageLoaded) return;
    
    const checkInterval = setInterval(() => {
      if (adRef.current) {
        const hasIframe = adRef.current.querySelector('iframe');
        if (!hasIframe) {
          // No iframe after 5 seconds, hide the header
          setShouldShow(false);
          clearInterval(checkInterval);
        } else {
          // Has iframe, show and stop checking
          clearInterval(checkInterval);
        }
      }
    }, 1000);
    
    // Stop checking after 8 seconds
    setTimeout(() => clearInterval(checkInterval), 8000);
    
    return () => clearInterval(checkInterval);
  }, [pageLoaded]);
  
  // Don't show header ad if it should be hidden
  if (!pageLoaded || !shouldShow) return null;
  
  return (
    <div className="w-full bg-gray-50 py-2" ref={adRef}>
      <div className="container mx-auto px-4 text-center">
        <AdUnit slot="8847382989" format="auto" />
      </div>
    </div>
  );
};

// Sidebar Ad
export const SidebarAd = () => {
  const [shouldShow, setShouldShow] = useState(true);
  const adRef = useRef(null);
  
  // Check if ad container has content after loading
  useEffect(() => {
    const checkInterval = setInterval(() => {
      if (adRef.current) {
        const hasIframe = adRef.current.querySelector('iframe');
        if (!hasIframe) {
          // No iframe after 5 seconds, hide
          setShouldShow(false);
          clearInterval(checkInterval);
        } else {
          // Has iframe, show and stop checking
          clearInterval(checkInterval);
        }
      }
    }, 1000);
    
    // Stop checking after 8 seconds
    setTimeout(() => clearInterval(checkInterval), 8000);
    
    return () => clearInterval(checkInterval);
  }, []);
  
  return shouldShow ? (
    <div className="sticky top-4" ref={adRef}>
      <AdUnit slot="8847382989" format="auto" />
    </div>
  ) : null;
};

// In-Content Ad
export const InContentAd = ({ priority = 'normal' }) => {
  // Higher priority ads load faster
  const delay = priority === 'high' ? 0 : priority === 'medium' ? 500 : 1000;
  const [shouldShow, setShouldShow] = useState(true);
  const adRef = useRef(null);
  
  // Check if ad container has content after loading
  useEffect(() => {
    const checkInterval = setInterval(() => {
      if (adRef.current) {
        const hasIframe = adRef.current.querySelector('iframe');
        if (!hasIframe) {
          // No iframe after 5 seconds, hide
          setShouldShow(false);
          clearInterval(checkInterval);
        } else {
          // Has iframe, show and stop checking
          clearInterval(checkInterval);
        }
      }
    }, 1000);
    
    // Stop checking after 8 seconds
    setTimeout(() => clearInterval(checkInterval), 8000);
    
    return () => clearInterval(checkInterval);
  }, []);
  
  return shouldShow ? (
    <div className="my-8 text-center" ref={adRef}>
      <AdUnit slot="8847382989" format="auto" delay={delay} />
    </div>
  ) : null;
};

// Progressive ad loader
export const ProgressiveAdLoader = ({ count = 3, className = "" }) => {
  const [loadedCount, setLoadedCount] = useState(1);
  const [visibleAds, setVisibleAds] = useState({});
  
  useEffect(() => {
    // Load ads one by one with delay
    if (loadedCount < count) {
      const timer = setTimeout(() => {
        setLoadedCount(prev => prev + 1);
      }, 1000);
      
      return () => clearTimeout(timer);
    }
  }, [loadedCount, count]);
  
  const handleAdVisibility = (index, isVisible) => {
    setVisibleAds(prev => ({
      ...prev,
      [index]: isVisible
    }));
  };
  
  return (
    <div className={className}>
      {Array.from({ length: loadedCount }).map((_, i) => (
        <InContentAd key={i} priority={i === 0 ? 'high' : 'low'} />
      ))}
    </div>
  );
};

export default AdSense;