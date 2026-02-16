export default async (request, context) => {
  try {
    const url = new URL(request.url);
      //Skip ALL API routes
    if (url.pathname.startsWith('/api/')) {
      console.log(`[Edge] Bypassing API route: ${url.pathname}`);
      return context.next();
    }
    const userAgent = request.headers.get("user-agent") || "";
    const pathParts = url.pathname.split('/').filter(p => p);
    
    // Detect if this is a category page
    if (pathParts[0] === 'category' && pathParts[1]) {
      const categorySlug = pathParts[1];
      const page = url.searchParams.get('page') || 1;
      const isBot = detectBot(userAgent);
      const isAICrawler = ['gptbot', 'anthropic-ai', 'claude-web', 'cohere-ai', 'perplexitybot', 'chatgpt-user', 'youbot', 'ccbot', 'googlebot', 'google-inspectiontool', 'bingbot', 'duckduckbot', 'slurp', 'baiduspider']
        .some(bot => userAgent.toLowerCase().includes(bot));

      console.log(`[Edge-Category] ${categorySlug}, Page:${page}, Bot:${isBot}, AI:${isAICrawler}`);

      if (isBot) {
        try {
          // Use Edge Cache FIRST before hitting backend
          const cacheKey = `category-${categorySlug}-page-${page}-${isAICrawler ? 'full' : 'meta'}`;
          const cache = await caches.open('category-cache');
          const cached = await cache.match(cacheKey);
          
          if (cached) {
            console.log(`[Edge-Category] Cache HIT for ${categorySlug} page ${page}`);
            return cached;
          }

          // If not cached, fetch from backend
          const categoryData = await fetchCategoryMeta(categorySlug, page, isAICrawler, context);
          
          if (categoryData) {
            const html = generateCategoryBotHtml(categoryData, categorySlug, page, isAICrawler);
            
            // Create response with Edge caching
            const response = new Response(html, {
              status: 200,
              headers: {
                "Content-Type": "text/html; charset=utf-8",
                "Cache-Control": "public, max-age=1800, s-maxage=3600",
                "Content-Security-Policy": "default-src 'self'; script-src 'self' 'unsafe-inline' https://www.google.com/recaptcha/ https://www.gstatic.com/ https://www.googletagmanager.com https://ep2.adtrafficquality.google https://pagead2.googlesyndication.com https://analytics.ahrefs.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' https: blob: data:; object-src 'none'; connect-src 'self' https://www.google-analytics.com https://analytics.ahrefs.com https://techblogai-backend.onrender.com https://ep1.adtrafficquality.google https://ep2.adtrafficquality.google; frame-src 'self' https://www.google.com https://ep2.adtrafficquality.google https://googleads.g.doubleclick.net https://tpc.googlesyndication.com; base-uri 'self'; form-action 'self'; frame-ancestors 'self';",
                "X-Robots-Tag": "index, follow, max-image-preview:large",
                "Vary": "User-Agent",
                "X-Rendered-By": "Edge-SSR-Category",
                "X-Cache": "MISS"
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

// OPTIMIZED Category Data Fetching
async function fetchCategoryMeta(categorySlug, page = 1, fullContent = false, context) {
  const cacheKey = `backend-category-${categorySlug}-page-${page}-${fullContent ? 'full' : 'lite'}`;
  const cache = await caches.open('backend-cache');
  const cached = await cache.match(cacheKey);
  
  if (cached) {
    return cached.json();
  }
  
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);
  
  try {
    const limit = fullContent ? 20 : 10;
    const url = `https://techblogai-backend.onrender.com/api/posts/category/${categorySlug}?page=${page}&limit=${limit}`;
    
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
      currentPage: Number(page) || 1,
      totalPages: 1
    };
  }
}

function generateCategoryBotHtml(categoryData, categorySlug, page = 1, isAICrawler = false) {
  const category = categoryData.category || {};
  const posts = categoryData.posts || [];
  const totalPosts = categoryData.total || posts.length;
  const currentPage = categoryData.currentPage || Number(page) || 1;
  const totalPages = categoryData.totalPages || 1;
  
  const categoryName = escapeHtml(category.name || categorySlug.replace(/-/g, ' '));
  const categoryDesc = escapeHtml(
    category.description || 
    `Browse the latest ${categoryName} articles, news, and technology insights on TechBlog AI`
  );
  
  const categoryUrl = `https://aitechblogs.netlify.app/category/${categorySlug}`;
  
  // Generate breadcrumb schema
  const breadcrumbSchema = {
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
        "name": categoryName,
        "item": categoryUrl
      }
    ]
  };
    const breadcrumbHtml = `
    <nav class="breadcrumb" aria-label="Breadcrumb">
      <a href="https://aitechblogs.netlify.app">Home</a> › 
      <a href="https://aitechblogs.netlify.app/category">Categories</a> › 
      <span>${categoryName}</span>
    </nav>
  `;

  // Generate posts HTML with featured images
  let postsHtml = '';
  if (posts.length > 0) {
    const displayPosts = isAICrawler ? posts.slice(0, 20) : posts.slice(0, 9);
    
    postsHtml = displayPosts.map(post => {
      const featuredImage = post.featured_image || 
                           `https://aitechblogs.netlify.app/placeholder-${categorySlug}.jpg`;
      const imageAlt = post.title ? `${post.title} - Featured Image` : 'Article Featured Image';
      const wordCount = post.word_count || post.content?.length || 500;
      const readTime = Math.ceil(wordCount / 200);
      
      return `
        <article class="category-post" itemscope itemtype="https://schema.org/TechArticle">
          ${post.featured_image ? `
            <div class="post-image">
              <img src="${featuredImage}" alt="${imageAlt}" loading="lazy" />
            </div>
          ` : ''}
          
          <div class="post-content">
            <h3 itemprop="headline">
              <a href="/post/${post.slug}" itemprop="url">${escapeHtml(post.title)}</a>
            </h3>
            <div class="post-meta">
              <time datetime="${post.published_at}">${
                new Date(post.published_at).toLocaleDateString('en-US', { 
                  year: 'numeric', month: 'short', day: 'numeric' 
                })
              }</time>
              ${post.author_name && post.author_name !== 'Admin' ? 
                `<span> • By ${escapeHtml(post.author_name)}</span>` : 
                '<span> • By Admin</span>'
              }
              <span> • ${readTime} min read</span>
            </div>
            <p itemprop="description">${escapeHtml(post.excerpt || '')}</p>
            ${isAICrawler && post.content ? 
              `<div class="ai-full-content">${cleanHtmlForAI(post.content.substring(0, 2000))}</div>` : 
              ''
            }
          </div>
        </article>
      `;
    }).join('');
  } else {
    postsHtml = `<p class="no-posts">No articles found in this category yet. Check back soon!</p>`;
  }
  
  // Generate pagination HTML
  let paginationHtml = '';
  if (totalPages > 1) {
    paginationHtml = `
      <div class="pagination" role="navigation" aria-label="Pagination">
        ${currentPage > 1 ? 
          `<a href="${categoryUrl}?page=${currentPage - 1}" class="prev" rel="prev">← Previous</a>` : 
          '<span class="prev disabled">← Previous</span>'
        }
        
        <div class="page-numbers">
          ${Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
            const pageNum = i + 1;
            return pageNum === currentPage ? 
              `<span class="current" aria-current="page">${pageNum}</span>` :
              `<a href="${categoryUrl}?page=${pageNum}">${pageNum}</a>`;
          }).join('')}
          
          ${totalPages > 5 ? `<span class="ellipsis">...</span>` : ''}
        </div>
        
        ${currentPage < totalPages ? 
          `<a href="${categoryUrl}?page=${currentPage + 1}" class="next" rel="next">Next →</a>` : 
          '<span class="next disabled">Next →</span>'
        }
      </div>
    `;
  }
  
  return `<!DOCTYPE html>
<html lang="en" prefix="og: https://ogp.me/ns# website: https://ogp.me/ns/website#">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${categoryName} ${currentPage > 1 ? `(Page ${currentPage})` : ''} | TechBlog AI</title>
  <meta name="description" content="${categoryDesc}${currentPage > 1 ? ` - Page ${currentPage}` : ''}" />
  <meta name="keywords" content="${escapeHtml(categoryName)}, technology, AI, programming, tech news" />
  <meta name="robots" content="${currentPage === 1 ? 'index, follow' : 'index, follow'}, max-image-preview:large" />
  <link rel="canonical" href="${categoryUrl}${currentPage > 1 ? `?page=${currentPage}` : ''}" />
  
  <!-- Open Graph -->
  <meta property="og:type" content="website" />
  <meta property="og:url" content="${categoryUrl}${currentPage > 1 ? `?page=${currentPage}` : ''}" />
  <meta property="og:title" content="${categoryName} ${currentPage > 1 ? `(Page ${currentPage})` : ''} | TechBlog AI" />
  <meta property="og:description" content="${categoryDesc}${currentPage > 1 ? ` - Page ${currentPage}` : ''}" />
  <meta property="og:image" content="https://aitechblogs.netlify.app/og-category.png" />
  <meta property="og:image:alt" content="${categoryName} Articles" />
  
  <!-- Twitter -->
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${categoryName} ${currentPage > 1 ? `(Page ${currentPage})` : ''} | TechBlog AI" />
  <meta name="twitter:description" content="${categoryDesc}${currentPage > 1 ? ` - Page ${currentPage}` : ''}" />
  
  <!-- Structured Data -->
  <script type="application/ld+json">${escapeJson(breadcrumbSchema)}</script>
  
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
    
    /* Category Header */
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
      margin-bottom: 10px;
    }
    .post-count {
      font-size: 0.9rem;
      color: #6b7280;
      background: #f3f4f6;
      padding: 4px 12px;
      border-radius: 12px;
      display: inline-block;
    }
    
    /* Posts Grid */
    .posts-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 30px;
      margin-bottom: 60px;
    }
    .category-post {
      background: #f9fafb;
      border-radius: 12px;
      border: 1px solid #e5e7eb;
      overflow: hidden;
      transition: transform 0.2s, box-shadow 0.2s;
    }
    .category-post:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 20px rgba(0,0,0,0.08);
    }
    .post-image {
      height: 200px;
      overflow: hidden;
    }
    .post-image img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      transition: transform 0.3s;
    }
    .category-post:hover .post-image img {
      transform: scale(1.05);
    }
    .post-content {
      padding: 25px;
    }
    .category-post h3 {
      font-size: 1.3rem;
      margin-bottom: 12px;
      line-height: 1.4;
    }
    .category-post h3 a {
      color: #1a1a1a;
      text-decoration: none;
    }
    .category-post h3 a:hover {
      color: #2563eb;
    }
    .post-meta {
      font-size: 0.85rem;
      color: #6b7280;
      margin-bottom: 15px;
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }
    .post-meta span {
      display: inline-block;
    }
    .category-post p {
      color: #4b5563;
      line-height: 1.7;
      font-size: 0.95rem;
    }
    .no-posts {
      text-align: center;
      padding: 60px;
      color: #6b7280;
      font-size: 1.1rem;
      grid-column: 1 / -1;
    }
    
    /* Pagination */
    .pagination {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 30px 0;
      border-top: 1px solid #e5e7eb;
      margin-top: 40px;
      flex-wrap: wrap;
      gap: 20px;
    }
    .pagination a {
      color: #3b82f6;
      text-decoration: none;
      padding: 8px 16px;
      border: 1px solid #e5e7eb;
      border-radius: 6px;
      transition: all 0.2s;
    }
    .pagination a:hover {
      background: #3b82f6;
      color: white;
      border-color: #3b82f6;
    }
    .pagination .disabled {
      color: #9ca3af;
      padding: 8px 16px;
      border: 1px solid #e5e7eb;
      border-radius: 6px;
      opacity: 0.5;
    }
    .page-numbers {
      display: flex;
      gap: 8px;
    }
    .page-numbers span.current {
      padding: 8px 16px;
      background: #3b82f6;
      color: white;
      border-radius: 6px;
    }
    .page-numbers .ellipsis {
      padding: 8px;
      color: #6b7280;
    }
    
    /* Footer */
    footer {
      text-align: center;
      padding: 40px 0;
      color: #6b7280;
      border-top: 1px solid #e5e7eb;
      margin-top: 40px;
    }
    footer a {
      color: #3b82f6;
      text-decoration: none;
      font-weight: 500;
    }
    footer a:hover {
      text-decoration: underline;
    }
    
    /* AI Content */
    .ai-full-content {
      margin-top: 20px;
      padding-top: 20px;
      border-top: 1px dashed #d1d5db;
      font-size: 0.95rem;
      color: #374151;
    }
      /* Breadcrumb Styles */
    .breadcrumb {
      margin-bottom: 30px;
      padding-bottom: 15px;
      border-bottom: 1px solid #e5e7eb;
      font-size: 0.9rem;
    }
    .breadcrumb a {
      color: #3b82f6;
      text-decoration: none;
    }
    .breadcrumb a:hover {
      text-decoration: underline;
    }
    .breadcrumb span {
      color: #6b7280;
      font-weight: 500;
    }
    .breadcrumb a:not(:last-child)::after {
      content: '›';
      margin: 0 8px;
      color: #9ca3af;
    }
    
    /* Responsive */
    @media (max-width: 1024px) {
      .posts-grid {
        grid-template-columns: repeat(2, 1fr);
      }
    }
    @media (max-width: 768px) {
      .posts-grid {
        grid-template-columns: 1fr;
      }
      .category-header h1 {
        font-size: 2rem;
      }
      .pagination {
        flex-direction: column;
        text-align: center;
      }
      .page-numbers {
        justify-content: center;
      }
    }
  </style>
</head>
<body>
  ${breadcrumbHtml}
  <header class="category-header">
    <h1>${categoryName} ${currentPage > 1 ? `(Page ${currentPage})` : ''}</h1>
    <p>${categoryDesc}${currentPage > 1 ? ` - Page ${currentPage}` : ''}</p>
    ${posts.length > 0 ? 
      `<div class="post-count">${totalPosts} articles • Page ${currentPage} of ${totalPages}</div>` : 
      ''
    }
  </header>
  
  <main class="posts-grid">
    ${postsHtml}
  </main>
  
  ${paginationHtml}
  
  <footer>
    <p>Category page generated by Edge SSR • 
      <a href="https://aitechblogs.netlify.app">View Full Site</a>
    </p>
  </footer>
  
  <script>
    // Redirect human visitors to the SPA
    const ua = navigator.userAgent.toLowerCase();
    const isBot = /bot|crawler|spider|googlebot|bingbot|duckduckbot|slurp/.test(ua);
    if (!isBot) {
      window.location.href = '${categoryUrl}${currentPage > 1 ? `?page=${currentPage}` : ''}';
    }
  </script>
</body>
</html>`;
}

// Helper functions
function detectBot(userAgent = "") {
  const bots = ['googlebot', 'bingbot', 'slurp', 'duckduckbot', 'yandexbot', 'baiduspider',
    'facebot', 'facebookexternalhit', 'twitterbot', 'linkedinbot', 'whatsapp',
    'gptbot', 'anthropic-ai', 'claude-web', 'cohere-ai', 'perplexitybot', 'chatgpt-user',
    'bot/', 'crawler', 'spider', 'scraper', 'fetch'];
  return bots.some(bot => userAgent.toLowerCase().includes(bot));
}

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