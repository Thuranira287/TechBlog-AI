 //This function intercepts requests to /post/* routes and determines
//whether to serve server-rendered content (for bots) or the SPA shell (for humans)
 

export default async (request, context) => {
  try {
    const url = new URL(request.url);
    const userAgent = request.headers.get("user-agent") || "";
    
    // Extract slug from path
    const slug = url.pathname.replace(/^\/post\//, "").replace(/\/$/, "");
    
    // Comprehensive bot detection
    const isBot = detectBot(userAgent);
    
    // Detect AI crawlers for full content
    const fullContentCrawlers = ['gptbot', 'anthropic-ai', 'claude-web', 'cohere-ai', 'perplexitybot', 'chatgpt-user', 'youbot', 'ccbot'];
    const isFullContentBot = fullContentCrawlers.some(bot => userAgent.toLowerCase().includes(bot));
    
    console.log(`[Edge Function] Path: ${url.pathname}, Bot: ${isBot}, FullContent: ${isFullContentBot}, UA: ${userAgent.substring(0, 50)}`);

    if (isBot) {
      // Bot detected - SSR HTML with meta tags
      try {
        // Fetch post metadata or full content for AI crawlers
        const post = await fetchPostMeta(slug, isFullContentBot);
        
        if (post) {
          const postUrl = `https://aitechblogs.netlify.app/post/${slug}`;
          const html = generateBotHtml(post, postUrl, isFullContentBot);
          
          return new Response(html, {
            status: 200,
            headers: {
              "Content-Type": "text/html; charset=utf-8",
              "Cache-Control": "public, max-age=3600, s-maxage=7200, stale-while-revalidate=86400",
              "X-Robots-Tag": "index, follow",
              "Vary": "User-Agent",
              "X-Rendered-By": isFullContentBot ? "Edge-SSR-Full" : "Edge-SSR"
            }
          });
        } else {
          // Post not found - return fallback HTML
          const fallbackHtml = generateFallbackHtml(slug);
          return new Response(fallbackHtml, {
            status: 200,
            headers: {
              "Content-Type": "text/html; charset=utf-8",
              "X-Robots-Tag": "noindex",
              "Vary": "User-Agent",
              "X-Rendered-By": "Edge-SSR-Fallback"
            }
          });
        }
      } catch (error) {
        console.error("[Edge Function] Error fetching post meta:", error);
        // On error, serve SPA shell
        return context.rewrite("/index.html");
      }
    } else {
      // Human user - serve SPA shell
      return context.rewrite("/index.html");
    }
  } catch (error) {
    console.error("[Edge Function] Critical error:", error);
    // Fallback to SPA on any error
    return context.rewrite("/index.html");
  }
};

/* ================= HELPER FUNCTIONS ================= */

// Detects if the User-Agent is a bot/crawler

function detectBot(userAgent = "") {
  const bots = [
    // Search Engines
    'googlebot', 'google-inspectiontool', 'bingbot', 'slurp', 'duckduckbot', 
    'yandexbot', 'baiduspider', 'sogou', 'exabot',
    
    // Social Media
    'facebot', 'facebookexternalhit', 'facebookcatalog', 'twitterbot', 
    'linkedinbot', 'whatsapp', 'telegram', 'slackbot', 'discordbot',
    'skypeuripreview', 'slack-imgproxy', 'pinterestbot', 'redditbot',
    
    // AI Crawlers
    'chatgpt-user', 'gptbot', 'anthropic-ai', 'claude-web', 'cohere-ai',
    'perplexitybot', 'youbot', 'ccbot', 'omgili', 'bytespider',
    'petalbot', 'meta-externalagent',
    
    // SEO Tools
    'semrushbot', 'ahrefsbot', 'mj12bot', 'dotbot', 'rogerbot',
    'screaming frog', 'seokicks', 'sitebulb', 'serpstatbot',
    
    // Other Bots
    'applebot', 'amazonbot', 'uptimerobot', 'siteauditbot', 'dataforseo',
    'lighthouse', 'chrome-lighthouse', 'speedcurve',
    
    // Generic patterns
    'bot/', 'crawler', 'spider', 'scraper', 'checker', 'monitor', 
    'fetch', 'scan', 'agent/', 'collector', 'gatherer', 'extractor',
    'archive', 'wget', 'curl', 'python-requests', 'ruby', 'java/'
  ];

  const ua = userAgent.toLowerCase();
  return bots.some(bot => ua.includes(bot));
}

// Fetches post metadata from backend API
 
async function fetchPostMeta(slug, fullContent = false) {
  if (!slug) return null;

  // Use different endpoint based on whether we need full content
  const endpoint = fullContent ? 'full' : 'meta';
  const url = `https://techblogai-backend.onrender.com/api/posts/${slug}/${endpoint}`;
  
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000); // 5s timeout for edge

  try {
    const response = await fetch(url, {
      method: 'GET',
      signal: controller.signal,
      headers: {
        "User-Agent": "TechBlogAI-EdgeSSR/1.0",
        "Accept": "application/json",
        "Cache-Control": "no-cache"
      }
    });

    clearTimeout(timeout);

    if (!response.ok) {
      console.error(`[Edge Function] API returned ${response.status} for slug: ${slug}`);
      return null;
    }

    const data = await response.json();
    return data;
  } catch (error) {
    clearTimeout(timeout);
    console.error("[Edge Function] Fetch error:", error.message);
    return null;
  }
}

// Escapes HTML special characters

function escapeHtml(text = "") {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/**
 * Generates bot-optimized HTML with full meta tags
 * @param {Object} post - Post data from API
 * @param {String} postUrl - Full URL of the post
 * @param {Boolean} includeFullContent - Whether to include full article content
 */
function generateBotHtml(post, postUrl, includeFullContent = false) {
  const title = escapeHtml(post.title || post.meta_title || "TechBlog AI Article");
  const desc = escapeHtml(post.excerpt || post.meta_description || "Read the latest tech insights on TechBlog AI");
  const img = post.featured_image || post.image || "https://aitechblogs.netlify.app/og-image.png";
  const author = escapeHtml(post.author || "TechBlog AI Team");
  const publishDate = post.created_at || post.published_at || new Date().toISOString();
  const modifiedDate = post.updated_at || publishDate;
  const category = escapeHtml(post.category || "Technology");
  const tags = Array.isArray(post.tags) ? post.tags.join(", ") : "";
  const wordCount = post.word_count || 1000;
  const readingTime = Math.ceil(wordCount / 200); // Average reading speed
  
  // Determine content to display based on bot type
  let contentHtml = '';
  if (includeFullContent && post.content) {
    // AI crawlers get substantial content
    const fullContent = escapeHtml(post.content.substring(0, 2000));
    contentHtml = `
      <div class="article-preview">
        <p>${desc}</p>
        <div class="full-content">${fullContent}${post.content.length > 2000 ? '...' : ''}</div>
      </div>`;
  } else if (post.content) {
    // Traditional search engines get brief preview
    const preview = escapeHtml(post.content.substring(0, 500));
    contentHtml = `
      <p>${desc}</p>
      <div class="article-preview">${preview}${post.content.length > 500 ? '...' : ''}</div>`;
  } else {
    // Fallback to description only
    contentHtml = `<p>${desc}</p>`;
  }

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  
  <!-- Primary Meta Tags -->
  <title>${title} | TechBlog AI</title>
  <meta name="title" content="${title}" />
  <meta name="description" content="${desc}" />
  <meta name="author" content="${author}" />
  <meta name="keywords" content="${escapeHtml(tags)}" />
  <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1" />
  
  <!-- Canonical URL -->
  <link rel="canonical" href="${postUrl}" />
  
  <!-- Open Graph / Facebook -->
  <meta property="og:type" content="article" />
  <meta property="og:url" content="${postUrl}" />
  <meta property="og:title" content="${title}" />
  <meta property="og:description" content="${desc}" />
  <meta property="og:image" content="${img}" />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />
  <meta property="og:site_name" content="TechBlog AI" />
  <meta property="article:published_time" content="${publishDate}" />
  <meta property="article:author" content="${author}" />
  <meta property="article:section" content="${category}" />
  
  <!-- Twitter Card -->
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:url" content="${postUrl}" />
  <meta name="twitter:title" content="${title}" />
  <meta name="twitter:description" content="${desc}" />
  <meta name="twitter:image" content="${img}" />
  <meta name="twitter:site" content="@AiTechBlogs" />
  <meta name="twitter:creator" content="@AiTechBlogs" />
  
  <!-- Schema.org JSON-LD - Enhanced Structured Data -->
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "Article",
    "headline": "${title}",
    "description": "${desc}",
    "image": {
      "@type": "ImageObject",
      "url": "${img}",
      "width": 1200,
      "height": 630
    },
    "url": "${postUrl}",
    "datePublished": "${publishDate}",
    "dateModified": "${modifiedDate}",
    "author": {
      "@type": "Person",
      "name": "${author}",
      "url": "https://aitechblogs.netlify.app"
    },
    "publisher": {
      "@type": "Organization",
      "name": "TechBlog AI",
      "url": "https://aitechblogs.netlify.app",
      "logo": {
        "@type": "ImageObject",
        "url": "https://aitechblogs.netlify.app/blog-icon.svg",
        "width": 100,
        "height": 100
      }
    },
    "mainEntityOfPage": {
      "@type": "WebPage",
      "@id": "${postUrl}"
    },
    "articleSection": "${category}",
    "keywords": "${escapeHtml(tags)}",
    "wordCount": ${wordCount},
    "timeRequired": "PT${readingTime}M",
    "inLanguage": "en-US"
  }
  </script>
  
  <!-- Breadcrumb Structured Data -->
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      {
        "@type": "ListItem",
        "position": 1,
        "name": "Home",
        "item": "https://aitechblogs.netlify.app"
      },
      {
        "@type": "ListItem",
        "position": 2,
        "name": "${category}",
        "item": "https://aitechblogs.netlify.app/category/${category.toLowerCase()}"
      },
      {
        "@type": "ListItem",
        "position": 3,
        "name": "${title}",
        "item": "${postUrl}"
      }
    ]
  }
  </script>
  
  <!-- Favicon -->
  <link rel="icon" type="image/svg+xml" href="/blog-icon.svg" />
  
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      max-width: 800px;
      margin: 40px auto;
      padding: 0 20px;
      line-height: 1.6;
      color: #333;
    }
    h1 { color: #1a1a1a; margin-bottom: 10px; }
    .meta { color: #666; font-size: 0.9em; margin-bottom: 20px; }
    .content { margin-top: 30px; }
    .article-preview { margin: 20px 0; white-space: pre-wrap; }
    .full-content { margin-top: 15px; line-height: 1.8; }
  </style>
</head>
<body>
  <article>
    <h1>${title}</h1>
    <div class="meta">
      By ${author} • ${category} • ${new Date(publishDate).toLocaleDateString()}
    </div>
    <div class="content">
      ${contentHtml}
      <p><em>This is ${includeFullContent ? 'an extended preview' : 'a preview'} for search engines and social media. The full interactive article requires JavaScript to be enabled.</em></p>
    </div>
  </article>
  
  <!-- Trigger SPA load for browsers with JS -->
  <script>
    if (typeof window !== 'undefined') {
      window.location.href = '${postUrl}';
    }
  </script>
</body>
</html>`;
}

// Generates fallback HTML when post is not found

function generateFallbackHtml(slug) {
  const url = `https://aitechblogs.netlify.app/post/${slug}`;
  
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Article - TechBlog AI</title>
  <meta property="og:title" content="TechBlog AI Article" />
  <meta property="og:type" content="article" />
  <meta property="og:url" content="${url}" />
  <meta property="og:image" content="https://aitechblogs.netlify.app/og-image.png" />
  <meta name="robots" content="noindex" />
  <link rel="canonical" href="${url}" />
</head>
<body>
  <h1>Loading Article...</h1>
  <p>If you're not redirected, <a href="${url}">click here</a>.</p>
  <script>window.location.href = '${url}';</script>
</body>
</html>`;
}

/* ================= EDGE FUNCTION CONFIG ================= */
export const config = {
  path: "/post/*",
  // Run on all requests to /post/* routes
  onError: "bypass"
};