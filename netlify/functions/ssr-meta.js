// netlify/functions/ssr-meta.js - UPDATED VERSION
const fetch = require('node-fetch');

exports.handler = async (event, context) => {
  console.log('=== SSR Meta Function Called ===');
  console.log('Event path:', event.path);
  console.log('Event raw path:', event.rawPath);
  console.log('Event query:', event.queryStringParameters);
  
  try {
    // Extract slug from URL
    const rawPath = event.rawPath || event.path;
    
    // Remove function path prefix
    if (slug.startsWith('/.netlify/functions/ssr-meta')) {
      slug = slug.replace('/.netlify/functions/ssr-meta', '');
    }
    
    // Remove /post/ prefix and trailing slash
    let slug = rawPath.replace(/^\/post\//, '').replace(/\/$/, '');
    
    console.log('Raw path:', rawPath);
    console.log('Extracted slug:', slug);
    
    // If no slug or just empty, return default
    if (!slug || slug === '/' || slug === '') {
      console.log('No slug found, returning default HTML');
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'text/html' },
        body: getDefaultHTML()
      };
    }

    console.log(`Fetching meta for slug: ${slug}`);
    
    // Fetch post meta from your backend
    const metaUrl = `https://techblogai-backend.onrender.com/api/posts/${slug}/meta`;
    console.log('Fetching from:', metaUrl);
    
    const response = await fetch(metaUrl);
    console.log('Response status:', response.status);
    
    if (!response.ok) {
      console.log('Backend responded with error:', response.status);
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'text/html' },
        body: getErrorHTML(slug)
      };
    }

    const post = await response.json();
    console.log('Received post data:', {
      title: post.title,
      hasImage: !!post.image,
      hasDescription: !!post.description
    });
    
    // Escape HTML to prevent XSS
    const escapeHtml = (text) => {
      if (!text) return '';
      return text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
    };
    
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    
    <!-- Primary Meta Tags -->
    <title>${escapeHtml(post.title)} | TechBlog AI</title>
    <meta name="description" content="${escapeHtml(post.description)}">
    <meta name="keywords" content="${escapeHtml(post.keywords || 'AI, technology, web development')}">
    
    <!-- Open Graph / Facebook -->
    <meta property="og:type" content="article">
    <meta property="og:url" content="${post.url || `https://aitechblogs.netlify.app/post/${slug}/`}">
    <meta property="og:title" content="${escapeHtml(post.og_title || post.title)}">
    <meta property="og:description" content="${escapeHtml(post.og_description || post.description)}">
    <meta property="og:image" content="${post.image || post.featured_image || 'https://aitechblogs.netlify.app/og-image.png'}">
    <meta property="og:image:width" content="1200">
    <meta property="og:image:height" content="630">
    <meta property="og:site_name" content="TechBlog AI">
    
    <!-- Twitter -->
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:url" content="${post.url || `https://aitechblogs.netlify.app/post/${slug}/`}">
    <meta name="twitter:title" content="${escapeHtml(post.twitter_title || post.og_title || post.title)}">
    <meta name="twitter:description" content="${escapeHtml(post.twitter_description || post.og_description || post.description)}">
    <meta name="twitter:image" content="${post.image || post.featured_image || 'https://aitechblogs.netlify.app/og-image.png'}">
    <meta name="twitter:site" content="@techblogai">
    <meta name="twitter:creator" content="@techblogai">
    
    <!-- Schema.org -->
    <script type="application/ld+json">
    {
      "@context": "https://schema.org",
      "@type": "BlogPosting",
      "headline": "${escapeHtml(post.title)}",
      "description": "${escapeHtml(post.description)}",
      "image": "${post.image || 'https://aitechblogs.netlify.app/og-image.png'}",
      "author": {
        "@type": "Person",
        "name": "${escapeHtml(post.author_name || 'TechBlog AI')}"
      },
      "publisher": {
        "@type": "Organization",
        "name": "TechBlog AI",
        "logo": {
          "@type": "ImageObject",
          "url": "https://aitechblogs.netlify.app/blog-icon.svg"
        }
      },
      "datePublished": "${post.datePublished || new Date().toISOString()}",
      "dateModified": "${post.dateModified || new Date().toISOString()}"
    }
    </script>
    
    <!-- Redirect to React app after 1 second -->
    <script>
        setTimeout(function() {
            window.location.href = "${post.url || `https://aitechblogs.netlify.app/post/${slug}/`}";
        }, 100);
    </script>
    
    <!-- Fallback for non-JS -->
    <noscript>
        <meta http-equiv="refresh" content="0;url=${post.url || `https://aitechblogs.netlify.app/post/${slug}/`}">
    </noscript>
</head>
<body>
    <div style="text-align: center; padding: 50px; font-family: Arial, sans-serif;">
        <h1>${escapeHtml(post.title)}</h1>
        <p>${escapeHtml(post.description)}</p>
        <p>Redirecting to full article...</p>
        <p><a href="${post.url || `https://aitechblogs.netlify.app/post/${slug}/`}">Click here if not redirected</a></p>
    </div>
</body>
</html>`;

    console.log('Returning SSR HTML for:', slug);
    
    return {
      statusCode: 200,
      headers: { 
        'Content-Type': 'text/html',
        'Cache-Control': 'public, max-age=3600' // Cache for 1 hour
      },
      body: html
    };
    
  } catch (error) {
    console.error('SSR function error:', error);
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'text/html' },
      body: getErrorHTML('Unknown error')
    };
  }
};

function getDefaultHTML() {
  return `<!DOCTYPE html>
<html>
<head>
    <title>TechBlog AI | AI Tutorials & Web Development Guides</title>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta property="og:title" content="TechBlog AI - Practical AI & Web Development Guides">
    <meta property="og:description" content="Master AI and web development with our practical tutorials">
    <meta property="og:image" content="https://aitechblogs.netlify.app/og-image.png">
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="TechBlog AI">
    <meta name="twitter:description" content="AI and Web Development Tutorials">
    <meta name="twitter:image" content="https://aitechblogs.netlify.app/og-image.png">
    <script>
        window.location.href = "https://aitechblogs.netlify.app";
    </script>
</head>
<body>
    <p>Loading TechBlog AI...</p>
</body>
</html>`;
}

function getErrorHTML(slug) {
  return `<!DOCTYPE html>
<html>
<head>
    <title>Article | TechBlog AI</title>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta property="og:title" content="TechBlog AI Article">
    <meta property="og:description" content="Read this article on TechBlog AI">
    <meta property="og:image" content="https://aitechblogs.netlify.app/og-image.png">
    <meta name="twitter:card" content="summary_large_image">
    <script>
        window.location.href = "https://aitechblogs.netlify.app/post/${slug || ''}";
    </script>
</head>
<body>
    <p>Redirecting to article...</p>
</body>
</html>`;
}