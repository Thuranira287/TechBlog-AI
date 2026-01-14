// ssr-meta.cjs - CommonJS format with timeout handling
module.exports.handler = async (event) => {
  console.log("=== SSR FUNCTION START ===");

  try {
    const rawPath = event.rawPath || event.path || "";

    // Extract slug safely
    const slug = extractSlug(rawPath, event.queryStringParameters);

    if (!slug) {
      return getHomepageMeta();
    }

    // Detect bots
    const userAgent = event.headers["user-agent"] || "";
    const isBot = detectBot(userAgent);

    console.log("DEBUG - Final slug:", slug);
    console.log("DEBUG - User Agent:", userAgent.substring(0, 100));
    console.log("DEBUG - Is bot?", isBot);

    // Fetch meta from backend with timeout
    const post = await fetchPostMeta(slug);

    const postUrl = `https://aitechblogs.netlify.app/post/${slug}`;

    if (!post) {
      // Post not found - handle gracefully
      console.log("DEBUG - Post not found");
      return notFoundResponse(isBot, slug);
    }

    if (isBot) {
      // FOR BOTS: Return SEO meta tags
      return botResponse(post, postUrl);
    } else {
      // FOR HUMANS: Return SPA index.html
      return humanResponse();
    }

  } catch (err) {
    console.error("SSR ERROR:", err);
    return errorHTML();
  }
};

// ========== HELPER FUNCTIONS ==========

function extractSlug(rawPath, queryParams) {
  // Extract from path
  let slug = rawPath
    .replace("/.netlify/functions/ssr-meta", "")
    .replace(/^\/post\//, "")
    .replace(/\/$/, "");

  console.log("DEBUG - Raw path:", rawPath);
  console.log("DEBUG - Initial slug:", slug);

  // Check query params (for direct function calls)
  if (queryParams && queryParams.path) {
    slug = queryParams.path.replace(/^\/post\//, "").replace(/\/$/, "");
    console.log("DEBUG - Slug from query params:", slug);
  }

  return slug;
}

function detectBot(userAgent) {
  const botPatterns = [
    'facebook', 'twitter', 'whatsapp', 'linkedin', 'telegram',
    'bot', 'crawler', 'spider', 'facebookexternalhit',
    'googlebot', 'bingbot', 'slackbot', 'discordbot',
    'duckduckbot', 'baiduspider', 'yandexbot', 'screaming frog'
  ];
  
  const ua = userAgent.toLowerCase();
  return botPatterns.some(pattern => ua.includes(pattern));
}

async function fetchPostMeta(slug) {
  const metaUrl = `https://techblogai-backend.onrender.com/api/posts/${slug}/meta`;
  console.log("DEBUG - Fetching from:", metaUrl);

  // Add timeout to fetch (10 seconds)
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);

  try {
    const response = await fetch(metaUrl, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'TechBlogAI-SSR/1.0',
        'Accept': 'application/json'
      }
    });
    
    clearTimeout(timeoutId);
    
    console.log("DEBUG - API response status:", response.status);

    if (!response.ok) {
      // If 404, return null instead of throwing
      if (response.status === 404) {
        console.log("DEBUG - Post not found (404)");
        return null;
      }
      throw new Error(`Failed to fetch post: ${response.status}`);
    }

    const post = await response.json();
    
    console.log("DEBUG - Post data received:", {
      title: post.title,
      excerpt: post.excerpt?.substring(0, 50) + '...',
      featured_image: post.featured_image,
      has_meta: !!(post.meta_title || post.title)
    });

    return post;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      console.error("DEBUG - Fetch timed out after 10 seconds");
      // Return null on timeout instead of throwing
      return null;
    }
    console.error("DEBUG - Fetch error:", error.message);
    // Return null for other fetch errors
    return null;
  }
}

function notFoundResponse(isBot, slug) {
  const homepageUrl = "https://aitechblogs.netlify.app/";
  
  if (isBot) {
    // For bots, return a simple page with link to homepage
    return {
      statusCode: 200,
      headers: {
        "Content-Type": "text/html",
        "Cache-Control": "public, max-age=300"
      },
      body: `<!DOCTYPE html>
<html>
<head>
  <title>Article Not Found - TechBlog AI</title>
  <meta name="description" content="This article may have been moved or deleted. Visit TechBlog AI for more articles." />
  <meta property="og:title" content="Article Not Found - TechBlog AI" />
  <meta property="og:description" content="This article may have been moved or deleted." />
  <meta property="og:url" content="${homepageUrl}" />
  <meta name="robots" content="noindex, follow" />
</head>
<body>
  <h1>Article Not Found</h1>
  <p>This article may have been moved or deleted.</p>
  <p><a href="${homepageUrl}">Visit TechBlog AI Homepage</a></p>
</body>
</html>`
    };
  } else {
    // For humans, redirect to homepage
    return {
      statusCode: 302,
      headers: {
        "Location": homepageUrl,
        "Cache-Control": "public, max-age=3600"
      }
    };
  }
}

function escapeHtml(text) {
  if (!text) return '';
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function generateBotHtml(post, postUrl) {
  const title = escapeHtml(post.title || post.meta_title || "TechBlog AI Article");
  const description = escapeHtml(post.description || post.excerpt || post.meta_description || "Read this article on TechBlog AI");
  const ogDescription = escapeHtml(post.og_description || post.excerpt || post.meta_description || "Read this article on TechBlog AI");
  const image = post.featured_image || post.image || "https://aitechblogs.netlify.app/og-image.png";
  const twitterTitle = escapeHtml(post.twitter_title || post.title || post.meta_title || "TechBlog AI Article");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>${title}</title>
  <meta name="description" content="${description}" />
  
  <!-- Open Graph / Facebook -->
  <meta property="fb:app_id" content="1829393364607774" />
  <meta property="og:type" content="article" />
  <meta property="og:title" content="${title}" />
  <meta property="og:description" content="${ogDescription}" />
  <meta property="og:image" content="${image}" />
  <meta property="og:url" content="${postUrl}" />
  <meta property="og:site_name" content="TechBlog AI" />
  <meta property="article:published_time" content="${post.created_at || ''}" />
  <meta property="article:author" content="${post.author_name || 'TechBlog AI Team'}" />
  
  <!-- Twitter -->
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${twitterTitle}" />
  <meta name="twitter:description" content="${ogDescription}" />
  <meta name="twitter:image" content="${image}" />
  <meta name="twitter:site" content="@AiTechBlogs" />
  <meta name="twitter:creator" content="@AiTechBlogs" />
  
  <!-- Canonical URL -->
  <link rel="canonical" href="${postUrl}" />
</head>
<body>
  <main>
    <h1>${title}</h1>
    <p>${description}</p>
    <p><a href="https://aitechblogs.netlify.app/">Read full article on TechBlog AI</a></p>
    <p>This page contains SEO meta tags for search engines and social media platforms.</p>
  </main>
</body>
</html>`;
}

function botResponse(post, postUrl) {
  const html = generateBotHtml(post, postUrl);
  
  console.log("DEBUG - Returning HTML response for Bot");
  
  return {
    statusCode: 200,
    headers: {
      "Content-Type": "text/html",
      "Cache-Control": "public, max-age=3600, s-maxage=7200",
      "X-Robots-Tag": "index, follow"
    },
    body: html
  };
}

const fs = require("fs");
const path = require("path");

function humanResponse() {
  const indexPath = path.resolve(__dirname, "../client/dist/index.html");
  let html = fs.readFileSync(indexPath, "utf-8");

  return {
    statusCode: 200,
    headers: {
      "Content-Type": "text/html",
      "Cache-Control": "public, max-age=3600",
      "Vary": "User-Agent",
    },
    body: html,
  };
}

function getHomepageMeta() {
  console.log("DEBUG - Serving homepage meta");
  
  return {
    statusCode: 200,
    headers: {
      "Content-Type": "text/html",
      "Cache-Control": "public, max-age=3600"
    },
    body: `<!DOCTYPE html>
<html>
<head>
  <title>TechBlog AI - Practical AI & Web Development Guides</title>
  <meta property="fb:app_id" content="1829393364607774" />
  <meta property="og:title" content="TechBlog AI - Practical AI & Web Development Guides" />
  <meta property="og:description" content="Master AI and web development with our practical tutorials, step-by-step guides, and expert tech analysis." />
  <meta property="og:image" content="https://aitechblogs.netlify.app/og-image.png" />
  <meta property="og:url" content="https://aitechblogs.netlify.app/" />
  <meta property="og:type" content="website" />
</head>
<body>
  <p>Redirecting to TechBlog AI homepage...</p>
</body>
</html>`
  };
}

function errorHTML(slug = "") {
  const postUrl = slug ? `https://aitechblogs.netlify.app/post/${slug}` : "https://aitechblogs.netlify.app";
  
  console.log("DEBUG - Serving error page for:", postUrl);
  
  return {
    statusCode: 200,
    headers: {
      "Content-Type": "text/html",
      "Cache-Control": "public, max-age=3600, s-maxage=7200",
      "Vary": "User-Agent",
      "X-Robots-Tag": "index, follow",
      "Content-Security-Policy": "default-src 'none'; script-src 'none'; style-src 'none'; img-src 'self' https: data:; connect-src 'self' https://techblogai-backend.onrender.com; frame-src 'none';"
    },
    body: `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>TechBlog AI Article</title>
  <meta property="fb:app_id" content="1829393364607774" />
  <meta property="og:title" content="TechBlog AI Article" />
  <meta property="og:description" content="Read this article on TechBlog AI" />
  <meta property="og:image" content="https://aitechblogs.netlify.app/og-image.png" />
  <meta property="og:url" content="${postUrl}" />
  <meta property="og:site_name" content="TechBlog AI" />
</head>
<body>
  <p><a href="https://aitechblogs.netlify.app/">Visit TechBlog AI Homepage</a></p>
</body>
</html>`
  };
}