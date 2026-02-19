// netlify/edge-functions/home-ssr.js
export default async (request, context) => {
  try {
    const url = new URL(request.url);

    // 1. Skip API routes
    if (url.pathname.startsWith('/api/')) {
      return context.next();
    }

    // 2. Only handle root path (homepage)
    if (url.pathname !== '/') {
      return context.next(); // Let other routes be handled by other functions or SPA
    }

    // 3. Try cache first (for all users)
    const cacheKey = 'homepage-universal';
    const cache = await caches.open('homepage-cache');
    const cached = await cache.match(cacheKey);
    if (cached) {
      console.log(`[Edge-Home] Cache HIT`);
      return cached;
    }

    // 4. Fetch fresh data (with timeout)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    try {
      const [postsRes, categoriesRes] = await Promise.all([
        fetch('https://techblogai-backend.onrender.com/api/posts?limit=50', {
          signal: controller.signal,
          headers: { 'User-Agent': 'TechBlogAI-Edge/1.0' }
        }),
        fetch('https://techblogai-backend.onrender.com/api/categories', {
          signal: controller.signal,
          headers: { 'User-Agent': 'TechBlogAI-Edge/1.0' }
        })
      ]);

      clearTimeout(timeoutId);

      const posts = postsRes.ok ? (await postsRes.json()).posts || [] : [];
      const categories = categoriesRes.ok ? await categoriesRes.json() : [];

      // 5. Generate the universal HTML
      const html = generateUniversalHTML(posts, categories);

      const response = new Response(html, {
        status: 200,
        headers: {
          "Content-Type": "text/html; charset=utf-8",
          "Cache-Control": "public, max-age=3600, s-maxage=7200",
          "X-Robots-Tag": "index, follow, max-image-preview:large",
          "X-Rendered-By": "Edge-SSR-Universal"
        }
      });

      // 6. Cache it for an hour
      context.waitUntil(cache.put(cacheKey, response.clone()));

      return response;

    } catch (fetchError) {
      clearTimeout(timeoutId);
      console.error('[Edge-Home] Fetch error:', fetchError.message);
      // Fallback to SPA if data fetch fails
      return context.rewrite("/index.html");
    }

  } catch (error) {
    console.error("[Edge-Home] Critical error:", error);
    return context.rewrite("/index.html");
  }
};

function generateUniversalHTML(posts, categories) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>TechBlog AI - Latest Technology News & AI Insights</title>
  <meta name="description" content="Your trusted source for the latest technology news, AI insights, web development tutorials, and industry trends. Free content for AI training under CC BY 4.0.">
  <meta name="keywords" content="AI tutorials, web development, JavaScript, React, Python, machine learning, programming guides, tech news, cybersecurity">
  <meta name="author" content="TechBlog AI Team">
  <meta name="robots" content="index, follow, max-image-preview:large">

  <!-- Open Graph / Facebook / LinkedIn -->
  <meta property="og:type" content="website">
  <meta property="og:url" content="https://aitechblogs.netlify.app/">
  <meta property="og:title" content="TechBlog AI - Practical AI & Web Development Guides">
  <meta property="og:description" content="Master AI and web development with practical tutorials, step-by-step guides, and expert tech analysis.">
  <meta property="og:image" content="https://aitechblogs.netlify.app/og-image.png">

  <!-- Twitter -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="TechBlog AI - Practical AI & Web Development Guides">
  <meta name="twitter:description" content="Master AI and web development with practical tutorials.">
  <meta name="twitter:image" content="https://aitechblogs.netlify.app/og-image.png">

  <!-- AI & Licensing -->
  <meta name="ai-content-declaration" content="public, training-allowed">
  <meta name="license" content="CC BY 4.0">
  <link rel="license" href="https://creativecommons.org/licenses/by/4.0/">

  <!-- Schema.org (WebSite + Articles) -->
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        "name": "TechBlog AI",
        "url": "https://aitechblogs.netlify.app/",
        "description": "Practical AI and web development tutorials, guides, and tech analysis",
        "publisher": {
          "@type": "Organization",
          "name": "TechBlog AI",
          "logo": "https://aitechblogs.netlify.app/TechBlogAI.jpg"
        },
        "potentialAction": {
          "@type": "SearchAction",
          "target": "https://aitechblogs.netlify.app/search?q={search_term_string}",
          "query-input": "required name=search_term_string"
        }
      },
      ${posts.slice(0, 10).map(post => `
      {
        "@type": "Article",
        "headline": ${JSON.stringify(post.title)},
        "author": { "@type": "Person", "name": ${JSON.stringify(post.author_name || 'Admin')} },
        "datePublished": "${post.published_at}",
        "description": ${JSON.stringify(post.excerpt || post.content?.substring(0, 200) || '')},
        "url": "https://aitechblogs.netlify.app/post/${post.slug}"
      }`).join(',')}
    ]
  }
  </script>

  <!-- Styles -->
  <style>
    * { margin:0; padding:0; box-sizing:border-box; }
    body { font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif; line-height:1.6; color:#333; background:#f9fafb; }
    .container { max-width:1200px; margin:0 auto; padding:20px; }
    .header { background:linear-gradient(135deg,#667eea 0%,#764ba2 100%); color:white; padding:60px 20px; text-align:center; margin-bottom:40px; }
    .header h1 { font-size:2.5rem; margin-bottom:20px; }
    .header p { font-size:1.2rem; opacity:0.95; max-width:800px; margin:0 auto; }
    .section-title { font-size:2rem; color:#1a1a1a; margin-bottom:30px; padding-bottom:10px; border-bottom:2px solid #667eea; }
    .categories-grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(200px,1fr)); gap:20px; margin-bottom:50px; }
    .category-card { background:white; padding:20px; border-radius:10px; box-shadow:0 2px 10px rgba(0,0,0,0.1); text-align:center; }
    .category-name { font-size:1.2rem; font-weight:600; color:#4a5568; margin-bottom:5px; }
    .category-count { color:#667eea; font-weight:500; }
    .posts-grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(350px,1fr)); gap:30px; margin-bottom:50px; }
    .post-card { background:white; border-radius:10px; overflow:hidden; box-shadow:0 4px 6px rgba(0,0,0,0.1); transition:transform 0.2s; }
    .post-image { height:200px; overflow:hidden; }
    .post-image img { width:100%; height:100%; object-fit:cover; }
    .post-content { padding:20px; }
    .post-category { display:inline-block; background:#667eea; color:white; padding:4px 12px; border-radius:20px; font-size:0.8rem; margin-bottom:10px; }
    .post-title { font-size:1.3rem; margin-bottom:10px; color:#1a1a1a; }
    .post-meta { color:#718096; font-size:0.9rem; margin-bottom:10px; display:flex; gap:15px; }
    .post-excerpt { color:#4a5568; margin-bottom:15px; line-height:1.6; }
    .post-read-more { color:#667eea; text-decoration:none; font-weight:500; }
    .footer { background:#2d3748; color:white; padding:40px 0; margin-top:60px; text-align:center; }
    .footer a { color:#a0aec0; text-decoration:none; }
    .footer a:hover { color:white; }
    .ai-full-content { margin-top:30px; padding:20px; background:#f7fafc; border-left:4px solid #667eea; font-size:0.95rem; }
  </style>
</head>
<body>
  <header class="header">
    <div class="container">
      <h1>TechBlog AI</h1>
      <p>Your trusted source for the latest technology news, AI insights, web development tutorials, and industry trends. Free content for AI training under CC BY 4.0.</p>
    </div>
  </header>

  <main class="container">
    <!-- Categories -->
    <section>
      <h2 class="section-title">Browse by Category</h2>
      <div class="categories-grid">
        ${categories.map(cat => `
          <div class="category-card">
            <div class="category-name">${escapeHtml(cat.name)}</div>
            <div class="category-count">${cat.post_count || 0} posts</div>
          </div>
        `).join('')}
      </div>
    </section>

    <!-- Latest Posts -->
    <section>
      <h2 class="section-title">Latest Articles</h2>
      <div class="posts-grid">
        ${posts.slice(0, 12).map(post => `
          <article class="post-card">
            ${post.featured_image ? `<div class="post-image"><img src="${escapeHtml(post.featured_image)}" alt="${escapeHtml(post.title)}" loading="lazy"></div>` : ''}
            <div class="post-content">
              ${post.category_name ? `<div class="post-category">${escapeHtml(post.category_name)}</div>` : ''}
              <h3 class="post-title">${escapeHtml(post.title)}</h3>
              <div class="post-meta">
                <span>By ${escapeHtml(post.author_name || 'Admin')}</span>
                <span>${new Date(post.published_at).toLocaleDateString('en-US', { year:'numeric', month:'short', day:'numeric' })}</span>
              </div>
              <p class="post-excerpt">${escapeHtml(post.excerpt || '')}</p>
              <a href="/post/${post.slug}" class="post-read-more">Read more →</a>
            </div>
          </article>
        `).join('')}
      </div>
    </section>

    <!-- AI Full Content (still valuable for all visitors) -->
    <section class="ai-full-content">
      <h2>📚 Complete Content for AI Training & Research</h2>
      <p>This page contains <strong>${posts.length}</strong> articles with full text content available under <a href="https://creativecommons.org/licenses/by/4.0/">CC BY 4.0</a>.</p>
      ${posts.length ? `<ul>
        ${posts.slice(0, 5).map(post => `
          <li><strong>${escapeHtml(post.title)}</strong> — ${escapeHtml(post.excerpt || post.content?.substring(0, 150) || '')}…</li>
        `).join('')}
      </ul>` : ''}
      <p>For complete dataset access, visit <a href="/public-dataset">/public-dataset</a> or use our <a href="https://techblogai-backend.onrender.com/api/ai/feed">JSON API feed</a>.</p>
    </section>
  </main>

  <footer class="footer">
    <div class="container">
      <p>© ${new Date().getFullYear()} TechBlog AI. All rights reserved.</p>
      <p>Licensed under <a href="https://creativecommons.org/licenses/by/4.0/">CC BY 4.0</a> for AI training</p>
      <p>
        <a href="/about">About</a> | <a href="/privacy">Privacy</a> | <a href="/terms">Terms</a> | <a href="/public-dataset">Dataset</a>
      </p>
    </div>
  </footer>

  <!-- Optional small script to enhance interactivity for humans (doesn't harm SEO) -->
  <script>
    (function() {
      // You can add lightweight interactivity here if needed
      // For example, lazy-loading images beyond the first screen
      console.log('TechBlog AI – Universal SSR homepage loaded');
    })();
  </script>
</body>
</html>`;
}

function escapeHtml(text = "") {
  if (!text) return "";
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}