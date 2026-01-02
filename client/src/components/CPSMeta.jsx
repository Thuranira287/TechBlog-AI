// src/components/CSPMeta.jsx
import React, { useEffect } from 'react';

export default function CSPMeta() {
  useEffect(() => {
    // Only add CSP meta tag in production
    if (process.env.NODE_ENV === 'production' && !document.querySelector('meta[http-equiv="Content-Security-Policy"]')) {
      const meta = document.createElement('meta');
      meta.httpEquiv = 'Content-Security-Policy';
      meta.content = `
        default-src 'self';
        script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.google.com/recaptcha/ https://www.gstatic.com/ https://www.googletagmanager.com;
        style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
        font-src 'self' https://fonts.gstatic.com;
        img-src 'self' data: https:;
        connect-src 'self' https://www.google-analytics.com;
        frame-src 'self' https://www.google.com;
        base-uri 'self';
        form-action 'self';
        frame-ancestors 'self';
      `.replace(/\s+/g, ' ').trim();
      document.head.appendChild(meta);
    }
  }, []);

  return null;
}