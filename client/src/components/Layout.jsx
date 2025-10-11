import React, { useEffect } from "react";
import Header from "./Header";
import Footer from "./Footer";
import AdSense from "./AdSense";
import FloatingAdminButton from './FloatingAdminButton'

const Layout = ({ children }) => {
  useEffect(() => {
    // Ensure ads refresh only once after navigation
    if (window.adsbygoogle && Array.isArray(window.adsbygoogle)) {
      window.adsbygoogle.push({});
    }
  }, []);

  return (
    <div className="min-h-screen flex flex-col">
      {/* Global AdSense Script */}
      <AdSense />

      <Header />

      <main className="flex-1">{children}</main>

      <Footer />

      {/* Floating Admin Button */}
      <FloatingAdminButton />
    </div>
  );
};

export default Layout;
