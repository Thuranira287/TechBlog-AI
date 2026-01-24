import React, { useEffect } from 'react';

export default function SitemapXml() {
  useEffect(() => {
    window.location.href = 'https://techblogai-backend.onrender.com/sitemap.xml';
  }, []);
  return <div>Redirecting to sitemap...</div>;
}
