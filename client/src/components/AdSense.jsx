import React, { useState, useEffect, useRef } from "react";

const AdSense = () => {
  useEffect(() => {
    // Check if script already exists
    const existingScript = document.querySelector(
      'script[src*="pagead2.googlesyndication.com/pagead/js/adsbygoogle.js"]'
    );

    if (!existingScript) {
      const script = document.createElement("script");
      script.src =
        "https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-2881807085062922";
      script.async = true;
      script.crossOrigin = "anonymous";
      document.head.appendChild(script);
    }
  }, []);

  return null; 
};

// Generic Ad Unit Component

export const AdUnit = ({ slot, format = "auto", responsive = true }) => {
  const adRef = useRef(null);

  useEffect(() => {
    if (adRef.current && !adRef.current.hasChildNodes()) {
      try {
        (window.adsbygoogle = window.adsbygoogle || []).push({});
      } catch (e) {
        console.warn("AdSense push error:", e);
      }
    }
  }, []);

  return (
    <div className="my-4 text-center">
      <ins
        ref={adRef}
        className="adsbygoogle"
        style={{ display: "block", textAlign: "center" }}
        data-ad-client="ca-pub-2881807085062922"
        data-ad-slot={slot}
        data-ad-format={format}
        data-full-width-responsive={responsive.toString()}
      ></ins>
    </div>
  );
};

// Header Ad — top banner
 
export const HeaderAd = () => {
  const [adReady, setAdReady] = useState(false);

  useEffect(() => {
    // Check ad status periodically
    const checkAdStatus = () => {
      const adElement = document.querySelector('[data-ad-slot="8847382989"]');
      if (adElement) {
        const status = adElement.getAttribute('data-ad-status') || 
                      adElement.getAttribute('data-adsbygoogle-status');
        
        // If ad is loaded OR if it's been a while, show it
        if (status === 'filled') {
          setAdReady(true);
        } else {
          // After 3 seconds,
          setTimeout(() => setAdReady(true), 4000);
        }
      }
    };

    // Start checking after component mounts
    setTimeout(checkAdStatus, 1000);
    
    // Cleanup
    return () => clearTimeout(checkAdStatus);
  }, []);

  if (!adReady) return null;

  return (
    <div className="w-full">
      <div className="container mx-auto px-4 text-center">
        <AdUnit slot="8847382989" format="auto" />
      </div>
    </div>
  );
};

// Sidebar Ad — sticky on scroll
export const SidebarAd = () => (
  <div className="sticky top-4">
    <AdUnit slot="8847382989" format="auto" />
  </div>
);

//In-Content Ad  inserted after every 3rd paragraph

export const InContentAd = ({ html }) => {
  if (!html) return null;

  // Split HTML content into paragraphs
  const paragraphs = html.split(/<\/p>/i);
  const enhancedContent = [];

  paragraphs.forEach((para, index) => {
    if (!para.trim()) return;
    enhancedContent.push(`${para}</p>`);

    // Insert ad after every 3rd paragraph
    if ((index + 1) % 3 === 0) {
      enhancedContent.push(
        `<div id="ad-${index}" class="in-content-ad"></div>`
      );
    }
  });

  useEffect(() => {
    // Render ads into inserted divs
    paragraphs.forEach((_, index) => {
      if ((index + 1) % 3 === 0) {
        const adDiv = document.getElementById(`ad-${index}`);
        if (adDiv && !adDiv.hasChildNodes()) {
          const ins = document.createElement("ins");
          ins.className = "adsbygoogle";
          ins.style.display = "block";
          ins.setAttribute("data-ad-client", "ca-pub-2881807085062922");
          ins.setAttribute("data-ad-slot", "8847382989");
          ins.setAttribute("data-ad-format", "fluid");
          ins.setAttribute("data-full-width-responsive", "true");
          adDiv.appendChild(ins);

          try {
            (window.adsbygoogle = window.adsbygoogle || []).push({});
          } catch (e) {
            console.warn("AdSense load error:", e);
          }
        }
      }
    });
  }, [html]);

  return (
    <div
      className="prose max-w-none"
      dangerouslySetInnerHTML={{ __html: enhancedContent.join("") }}
    ></div>
  );
};

export default AdSense;
