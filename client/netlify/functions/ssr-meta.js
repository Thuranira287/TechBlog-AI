const fetch = require("node-fetch");

exports.handler = async (event) => {
  console.log("=== SSR FUNCTION START ===");
  console.log("Event:", JSON.stringify({
    rawPath: event.rawPath,
    path: event.path,
    queryStringParameters: event.queryStringParameters,
    headers: {
      'user-agent': event.headers['user-agent'],
      referer: event.headers['referer']
    }
  }, null, 2));

  try {
    const rawPath = event.rawPath || event.path || "";

    // Extract slug safely
    let slug = rawPath
      .replace("/.netlify/functions/ssr-meta", "")
      .replace(/^\/post\//, "")
      .replace(/\/$/, "");
    
    console.log("DEBUG - Raw path:", rawPath);
    console.log("DEBUG - Initial slug:", slug);

    // Also check query parameters
    if (event.queryStringParameters && event.queryStringParameters.path) {
      slug = event.queryStringParameters.path.replace(/^\/post\//, '').replace(/\/$/, '');
      console.log("DEBUG - Slug from query params:", slug);
    }

    console.log("DEBUG - Final slug:", slug);

    if (!slug) {
      console.log("DEBUG - No slug, redirecting home");
      return redirectHome();
    }

    // Detect bots (VERY IMPORTANT)
    const userAgent = event.headers["user-agent"] || "";
    const isBot = /facebook|twitter|whatsapp|linkedin|telegram|bot|crawler|spider|facebookexternalhit/i.test(userAgent);
    
    console.log("DEBUG - User Agent:", userAgent.substring(0, 100));
    console.log("DEBUG - Is bot?", isBot);

    // Fetch meta from backend
    const metaUrl = `https://techblogai-backend.onrender.com/api/posts/${slug}/meta`;
    console.log("DEBUG - Fetching from:", metaUrl);
    
    const response = await fetch(metaUrl);
    console.log("DEBUG - API response status:", response.status);

    if (!response.ok) {
      console.log("DEBUG - API error, returning error HTML");
      return errorHTML(slug);
    }

    const post = await response.json();
    console.log("DEBUG - Post data received:", {
      title: post.title,
      excerpt: post.excerpt?.substring(0, 50),
      featured_image: post.featured_image,
      has_meta: !!post.meta_title
    });

    const esc = (v = "") =>
      v.replace(/&/g, "&amp;")
       .replace(/</g, "&lt;")
       .replace(/>/g, "&gt;")
       .replace(/"/g, "&quot;");

    // FIX: Use correct URL format (no trailing slash)
    const postUrl = `https://aitechblogs.netlify.app/post/${slug}`;
    console.log("DEBUG - Post URL:", postUrl);

    // Build HTML response
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>${esc(post.title || post.meta_title || 'TechBlog AI')}</title>

<!-- Facebook App ID -->
<meta property="fb:app_id" content="1829393764607774" />
<meta name="description" content="${esc(post.description || post.excerpt || post.meta_description || 'TechBlog AI articles')}" />

<!-- Open Graph -->
<meta property="og:type" content="article" />
<meta property="og:title" content="${esc(post.title || post.meta_title || post.og_title || 'TechBlog AI Article')}" />
<meta property="og:description" content="${esc(
        post.og_description || post.excerpt || post.meta_description || 'Read this article on TechBlog AI'
      )}" />
<meta property="og:image" content="${post.featured_image || post.image || 'https://aitechblogs.netlify.app/og-image.png'}" />
<meta property="og:url" content="${postUrl}" />
<meta property="og:site_name" content="TechBlog AI" />

<!-- Twitter -->
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="${esc(post.twitter_title || post.title || post.meta_title || 'TechBlog AI Article')}" />
<meta name="twitter:description" content="${esc(
        post.twitter_description || post.excerpt || post.meta_description || 'Read this article on TechBlog AI'
      )}" />
<meta name="twitter:image" content="${post.featured_image || post.image || 'https://aitechblogs.netlify.app/og-image.png'}" />
<meta name="twitter:site" content="@AiTechBlogs" />

${
  // 🚨 Redirect ONLY humans (NOT bots)
  isBot
    ? "<!-- Bot detected, showing meta tags -->"
    : `<meta http-equiv="refresh" content="0;url=${postUrl}" />`
}
</head>

<body>
  <h1>${esc(post.title || 'TechBlog AI Article')}</h1>
  <p>${esc(post.excerpt || post.meta_description || 'Loading article...')}</p>
  <p><a href="${postUrl}">Read full article</a></p>
</body>
</html>`;

    console.log("DEBUG - Returning HTML response with bot detection:", isBot ? "Bot" : "Human (redirecting)");

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "text/html",
        "Cache-Control": "public, max-age=3600",
      },
      body: html,
    };
  } catch (err) {
    console.error("SSR ERROR:", err);
    return errorHTML();
  }
};

function redirectHome() {
  console.log("DEBUG - Redirecting to homepage");
  return {
    statusCode: 302,
    headers: { Location: "https://aitechblogs.netlify.app" },
  };
}

function errorHTML(slug = "") {
  console.log("DEBUG - Returning error HTML for slug:", slug);
  const postUrl = slug ? `https://aitechblogs.netlify.app/post/${slug}` : "https://aitechblogs.netlify.app";
  
  return {
    statusCode: 200,
    headers: { "Content-Type": "text/html" },
    body: `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<title>TechBlog AI</title>
<meta property="fb:app_id" content="1829393764607774" />
<meta property="og:title" content="TechBlog AI Article" />
<meta property="og:description" content="Read this article on TechBlog AI" />
<meta property="og:image" content="https://aitechblogs.netlify.app/og-image.png" />
<meta property="og:url" content="${postUrl}" />
<meta property="og:site_name" content="TechBlog AI" />
</head>
<body>
<p><a href="${postUrl}">Read article on TechBlog AI</a></p>
</body>
</html>`,
  };
}