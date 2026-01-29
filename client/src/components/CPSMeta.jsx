import React, { useEffect } from 'react';

export default function CSPMeta() {
  useEffect(() => {
    // CSP meta tag in production
    if (process.env.NODE_ENV === 'production' && !document.querySelector('meta[http-equiv="Content-Security-Policy"]')) {
      const meta = document.createElement('meta');
      meta.httpEquiv = 'Content-Security-Policy';
      meta.content = `
        default-src 'self';
        script-src 'self' 'unsafe-inline' https://www.google.com/recaptcha/ https://www.gstatic.com/ https://www.googletagmanager.com https://pagead2.googlesyndication.com https://ep2.adtrafficquality.google https://analytics.ahrefs.com;
        style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
        font-src 'self' https://fonts.gstatic.com;
        img-src 'self' https:;
        connect-src 'self' https://www.google-analytics.com https://techblogai-backend.onrender.com http://localhost:5000 https://ep1.adtrafficquality.google https://analytics.ahrefs.com;
        frame-src 'self' https://www.google.com https://googleads.g.doubleclick.net https://ep2.adtrafficquality.google https://tpc.googlesyndication.com;
        base-uri 'self';
        form-action 'self';
      `.replace(/\s+/g, ' ').trim();
      document.head.appendChild(meta);
    }
  }, []);

  return null;
}