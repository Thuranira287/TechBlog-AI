import React, { useEffect } from "react";

/**
 * ✅ Loads the Google AdSense script once globally.
 * Place <AdSense /> in your root layout (e.g., App.jsx or index.html wrapper)
 */
const AdSense = () => {
  useEffect(() => {
    if (window.adsbygoogle && Array.isArray(window.adsbygoogle)) {
      window.adsbygoogle.push({});
    }
  }, []);

  return (
    <script
      async
      src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-XXXXXXXXXXXXXXXX"
      crossOrigin="anonymous"
    ></script>
  );
};

/**
 * ✅ Generic Ad Unit component
 * Use: <AdUnit slot="YOUR_SLOT_ID" format="auto" responsive />
 */
export const AdUnit = ({ slot, format = "auto", responsive = true }) => {
  useEffect(() => {
    if (window.adsbygoogle && Array.isArray(window.adsbygoogle)) {
      try {
        window.adsbygoogle.push({});
      } catch (e) {
        console.warn("AdSense push error:", e);
      }
    }
  }, []);

  return (
    <div className="my-4 text-center">
      <ins
        className="adsbygoogle"
        style={{ display: "block" }}
        data-ad-client="ca-pub-2881807085062922"
        data-ad-slot={slot}
        data-ad-format={format}
        data-full-width-responsive={responsive.toString()}
      ></ins>
    </div>
  );
};

/**
 * ✅ Header Ad — for top banners
 */
export const HeaderAd = () => (
  <div className="w-full bg-gray-100 py-4 mb-6">
    <div className="container mx-auto px-4 text-center">
      <AdUnit slot="1234567890" format="auto" />
    </div>
  </div>
);

/**
 * ✅ In-Content Ad — for between paragraphs
 */
export const InContentAd = () => (
  <div className="my-8">
    <AdUnit slot="1234567891" format="fluid" />
  </div>
);

/**
 * ✅ Sidebar Ad — sticky on scroll
 */
export const SidebarAd = () => (
  <div className="sticky top-4">
    <AdUnit slot="1234567892" format="auto" />
  </div>
);

export default AdSense;
