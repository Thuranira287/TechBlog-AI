import React, { useEffect } from "react";
import Header from "./Header";
import Footer from "./Footer";
//import AdSense from "./AdSense";
import FloatingAdminButton from './FloatingAdminButton';
import AdminFooter from "./AdminFooter";
import { useLocation } from 'react-router-dom';
//import AdInPost from "./AdInPost";

const Layout = ({ children }) => {
  const location = useLocation();
  const isAdminRoute = location.pathname.startsWith('/admin');
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

      {/* Conditional Footer */}
      {isAdminRoute ? (
        // Show Admin Footer for admin routes
        <AdminFooter />
      ) : (
        // Show Regular Footer for public routes
        <Footer />
      )}

      {/* Floating Admin Button */}
      <FloatingAdminButton />
    </div>
  );
};

export default Layout;
