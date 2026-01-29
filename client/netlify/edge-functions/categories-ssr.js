export default async (request, context) => {
  try {
    const url = new URL(request.url);
    const userAgent = request.headers.get("user-agent") || "";
    const pathParts = url.pathname.split('/').filter(p => p);
    
    // Detect if this is a category page
    if (pathParts[0] === 'category' && pathParts[1]) {
      const categorySlug = pathParts[1];
      const isBot = detectBot(userAgent);
      const isAICrawler = ['gptbot', 'anthropic-ai', 'claude-web', 'cohere-ai', 'perplexitybot', 'chatgpt-user', 'youbot', 'ccbot']
        .some(bot => userAgent.toLowerCase().includes(bot));

      console.log(`[Edge-Category] ${categorySlug}, Bot:${isBot}, AI:${isAICrawler}`);

      if (isBot) {
        try {
          // Use Edge Cache FIRST before hitting backend
          const cacheKey = `category-${categorySlug}-${isAICrawler ? 'full' : 'meta'}`;
          const cache = await caches.open('category-cache');
          const cached = await cache.match(cacheKey);
          
          if (cached) {
            console.log(`[Edge-Category] Cache HIT for ${categorySlug}`);
            return cached;
          }

          // If not cached, fetch from backend
          const categoryData = await fetchCategoryMeta(categorySlug, isAICrawler, context);
          
          if (categoryData) {
            const html = generateCategoryBotHtml(categoryData, categorySlug, isAICrawler);
            
            // Create response with Edge caching
            const response = new Response(html, {
              status: 200,
              headers: {
                "Content-Type": "text/html; charset=utf-8",
                "Cache-Control": "public, max-age=1800, s-maxage=3600", // 30 min - 1 hour cache
                "X-Robots-Tag": "index, follow, max-image-preview:large",
                "Vary": "User-Agent",
                "X-Rendered-By": "Edge-SSR-Category",
                "X-Cache": "MISS",
                "Content-Security-Policy": "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.google.com/recaptcha/ https://www.gstatic.com/ https://www.googletagmanager.com https://ep2.adtrafficquality.google https://pagead2.googlesyndication.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' https: blob:; connect-src 'self' http://localhost:5000 https://www.google-analytics.com https://techblogai-backend.onrender.com https://ep1.adtrafficquality.google https://ep2.adtrafficquality.google; frame-src 'self' https://www.google.com https://ep2.adtrafficquality.google https://googleads.g.doubleclick.net https://tpc.googlesyndication.com; base-uri 'self'; form-action 'self'; frame-ancestors 'self';"
              }
            });
            
            // Store in Edge cache (non-blocking)
            context.waitUntil(
              cache.put(cacheKey, response.clone())
            );
            
            return response;
          }
          
          // Fallback
          return new Response(generateCategoryFallback(categorySlug), {
            status: 404,
            headers: {
              "Content-Type": "text/html; charset=utf-8",
              "X-Robots-Tag": "noindex, follow",
              "X-Rendered-By": "Edge-SSR-Category-404"
            }
          });
          
        } catch (error) {
          console.error("[Edge-Category] Error:", error);
          return context.rewrite("/index.html");
        }
      }
    }
    
    return context.rewrite("/index.html");
  } catch (error) {
    console.error("[Edge-Category] Critical error:", error);
    return context.rewrite("/index.html");
  }
};

//detectBot function
function detectBot(userAgent = "") {
  const bots = ['googlebot', 'bingbot', 'slurp', 'duckduckbot', 'yandexbot', 'baiduspider',
    'facebot', 'facebookexternalhit', 'twitterbot', 'linkedinbot', 'whatsapp',
    'gptbot', 'anthropic-ai', 'claude-web', 'cohere-ai', 'perplexitybot', 'chatgpt-user',
    'bot/', 'crawler', 'spider', 'scraper', 'fetch'];
  return bots.some(bot => userAgent.toLowerCase().includes(bot));
}

// OPTIMIZED Category Data Fetching
async function fetchCategoryMeta(categorySlug, fullContent = false, context) {
  const cacheKey = `backend-category-${categorySlug}-${fullContent ? 'full' : 'lite'}`;
  const cache = await caches.open('backend-cache');
  const cached = await cache.match(cacheKey);
  
  if (cached) {
    return cached.json();
  }
  
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 3000);
  
  try {
    const url = `https://techblogai-backend.onrender.com/api/posts/category/${categorySlug}?page=1${
        fullContent ? '&limit=20' : ''
    }`;
    
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "TechBlogAI-EdgeSSR/1.0",
        "Accept": "application/json"
      }
    });
    
    clearTimeout(timeout);
    
    if (!response.ok) {
      throw new Error(`Backend status: ${response.status}`);
    }
    
    const data = await response.json();
    
    // Cache backend response for 5 minutes
    const cacheResponse = new Response(JSON.stringify(data), {
      headers: { 'Cache-Control': 'public, max-age=300' }
    });
    
    context.waitUntil(
      cache.put(cacheKey, cacheResponse)
    );
    
    return data;
    
  } catch (error) {
    clearTimeout(timeout);
    console.error(`[Edge-Category] Backend fetch error: ${error.message}`);
    
    // Return minimal fallback data
    return {
    category: {
        name: categorySlug.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
        description: `Latest ${categorySlug.replace(/-/g, ' ')} articles and technology insights`,
        slug: categorySlug
    },
    posts: [],
    total: 0,
    currentPage: 1
    };
  }
}

function generateCategoryBotHtml(categoryData, categorySlug, isAICrawler = false) {
  const category = categoryData.category || {};
  const posts = categoryData.posts || [];
  
  
  const categoryName = escapeHtml(category.name || categorySlug.replace(/-/g, ' '));
  const categoryDesc = escapeHtml(
    category.description || 
    `Browse the latest ${categoryName} articles, news, and technology insights on TechBlog AI`
  );
  
  const categoryUrl = `https://aitechblogs.netlify.app/category/${categorySlug}`;
  
  // Generate structured data
  const schemas = {
    category: {
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      "name": `${categoryName} Articles`,
      "description": categoryDesc,
      "url": categoryUrl,
      "mainEntity": {
        "@type": "ItemList",
        "itemListElement": posts.slice(0, 10).map((post, index) => ({
          "@type": "ListItem",
          "position": index + 1,
          "item": {
            "@type": "TechArticle",
            "headline": post.title,
            "url": `https://aitechblogs.netlify.app/post/${post.slug}`,
            "description": post.excerpt,
            "datePublished": post.published_at
          }
        }))
      }
    }
  };
  
  // Generate posts HTML for performance
  let postsHtml = '';
  if (posts.length > 0) {
    const displayPosts = isAICrawler ? posts.slice(0, 20) : posts.slice(0, 9);
    
    postsHtml = displayPosts.map(post => `
      <article class="category-post" itemscope itemtype="https://schema.org/TechArticle">
        <h3 itemprop="headline">
          <a href="/post/${post.slug}" itemprop="url">${escapeHtml(post.title)}</a>
        </h3>
        <div class="post-meta">
          <time datetime="${post.published_at}">${
            new Date(post.published_at).toLocaleDateString('en-US', { 
              year: 'numeric', month: 'short', day: 'numeric' 
            })
          }</time>
          ${post.author_name ? `<span> • By ${escapeHtml(post.author_name)}</span>` : ''}
        </div>
        <p itemprop="description">${escapeHtml(post.excerpt || '')}</p>
        ${isAICrawler && post.content ? 
          `<div class="ai-full-content">${cleanHtmlForAI(post.content.substring(0, 2000))}</div>` : 
          ''
        }
      </article>
    `).join('');
  } else {
    postsHtml = `<p>No articles found in this category yet. Check back soon!</p>`;
  }
  
  return `<!DOCTYPE html>
<html lang="en" prefix="og: https://ogp.me/ns# website: https://ogp.me/ns/website#">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${categoryName} Articles | TechBlog AI</title>
  <meta name="description" content="${categoryDesc}" />
  <meta name="keywords" content="${escapeHtml(categoryName)}, technology, AI, programming, tech news" />
  <meta name="robots" content="index, follow, max-image-preview:large" />
  <link rel="canonical" href="${categoryUrl}" />
  
  <!-- Open Graph -->
  <meta property="og:type" content="website" />
  <meta property="og:url" content="${categoryUrl}" />
  <meta property="og:title" content="${categoryName} Articles | TechBlog AI" />
  <meta property="og:description" content="${categoryDesc}" />
  <meta property="og:image" content="https://aitechblogs.netlify.app/og-category.png" />
  <meta property="og:image:alt" content="${categoryName} Articles" />
  
  <!-- Twitter -->
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${categoryName} Articles | TechBlog AI" />
  <meta name="twitter:description" content="${categoryDesc}" />
  
  <!-- Structured Data -->
  <script type="application/ld+json">${escapeJson(schemas.category)}</script>
  
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      max-width: 1200px;
      margin: 0 auto;
      padding: 20px;
      line-height: 1.6;
      color: #333;
      background: #fff;
    }
    .category-header {
      padding: 40px 0;
      border-bottom: 2px solid #e5e7eb;
      margin-bottom: 40px;
    }
    .category-header h1 {
      font-size: 2.5rem;
      color: #1a1a1a;
      margin-bottom: 10px;
    }
    .category-header p {
      font-size: 1.1rem;
      color: #666;
      max-width: 800px;
    }
    .posts-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
      gap: 30px;
      margin-bottom: 60px;
    }
    .category-post {
      background: #f9fafb;
      padding: 25px;
      border-radius: 8px;
      border: 1px solid #e5e7eb;
    }
    .category-post h3 {
      font-size: 1.3rem;
      margin-bottom: 10px;
    }
    .category-post h3 a {
      color: #2563eb;
      text-decoration: none;
    }
    .category-post h3 a:hover {
      text-decoration: underline;
    }
    .post-meta {
      font-size: 0.9rem;
      color: #6b7280;
      margin-bottom: 15px;
    }
    .category-post p {
      color: #4b5563;
      line-height: 1.7;
    }
    .ai-full-content {
      margin-top: 20px;
      padding-top: 20px;
      border-top: 1px dashed #d1d5db;
      font-size: 0.95rem;
      color: #374151;
    }
    @media (max-width: 768px) {
      .posts-grid {
        grid-template-columns: 1fr;
      }
      .category-header h1 {
        font-size: 2rem;
      }
    }
  </style>
</head>
<body>
  <header class="category-header">
    <h1>${categoryName}</h1>
    <p>${categoryDesc}</p>
    ${posts.length > 0 ? 
      `<div class="post-count">${posts.length} articles</div>` : 
      ''
    }
  </header>
  
  <main class="posts-grid">
    ${postsHtml}
  </main>
  
  <footer style="text-align: center; padding: 40px 0; color: #6b7280; border-top: 1px solid #e5e7eb;">
    <p>Category page generated by Edge SSR • 
      <a href="https://aitechblogs.netlify.app" style="color: #3b82f6;">View Full Site</a>
    </p>
  </footer>
  
  <script>
    // Redirect human visitors to the SPA
    const ua = navigator.userAgent.toLowerCase();
    const isBot = /bot|crawler|spider|googlebot|bingbot|duckduckbot|slurp/.test(ua);
    if (!isBot) {
      window.location.href = '${categoryUrl}';
    }
  </script>
</body>
</html>`;
}

// Helper functions
function escapeHtml(text = "") {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}

function escapeJson(obj) {
  return JSON.stringify(obj).replace(/</g, '\\u003c').replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');
}

function cleanHtmlForAI(html = "") {
  if (!html) return "";
  return html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
             .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
             .replace(/on\w+="[^"]*"/gi, '');
}

function generateCategoryFallback(categorySlug) {
  const url = `https://aitechblogs.netlify.app/category/${categorySlug}`;
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Category Not Found - TechBlog AI</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; 
           display: flex; justify-content: center; align-items: center; 
           min-height: 100vh; margin: 0; background: #f3f4f6; }
    .container { text-align: center; padding: 40px; }
    h1 { color: #1f2937; margin-bottom: 16px; }
    a { color: #3b82f6; text-decoration: none; font-weight: 500; }
  </style>
</head>
<body>
  <div class="container">
    <h1>Category Not Found</h1>
    <p>Return to <a href="https://aitechblogs.netlify.app">homepage</a></p>
  </div>
</body>
</html>`;
}

export const config = {
  path: "/category/*",
  onError: "bypass"
};