export default async (request, context) => {
  try {
    const url = new URL(request.url);

    // Skip API routes
    if (url.pathname.startsWith('/api/')) {
      return context.next();
    }

    // Handle root path
    if (url.pathname !== '/') {
      return context.next();
    }

    // Try cache first
    const cacheKey = 'homepage-universal';
    const cache = await caches.open('homepage-cache');
    const cached = await cache.match(cacheKey);
    if (cached) {
      console.log(`[Edge-Home] Cache HIT`);
      return cached;
    }

    // Fetch fresh data
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

      // Get the SPA template
      const spaResponse = await fetch(new URL('/index.html', request.url));
      let html = await spaResponse.text();

      // Remove any existing meta
      html = html.replace(/<link rel="canonical"[^>]*>/gi, '');
      html = html.replace(/<meta property="og:[^>]*>/gi, '');
      html = html.replace(/<meta name="twitter:[^>]*>/gi, '');

      // Inject homepage SEO
      const homeMeta = `
      <title>TechBlog AI | AI Tutorials & Web Development Guides | Build Real Projects</title>
      <link rel="canonical" href="https://aitechblogs.netlify.app/" />

      <meta property="og:type" content="website" />
      <meta property="og:title" content="TechBlog AI | AI Tutorials & Web Development Guides | Build Real Projects" />
      <meta property="og:url" content="https://aitechblogs.netlify.app/" />

      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content="TechBlog AI | AI Tutorials & Web Development Guides | Build Real Projects" />
      `;

      html = html.replace('</head>', `${homeMeta}</head>`);

      // Generate SSR content 
      const ssrContent = generateSSRContent(posts, categories);

      // Inject SSR content into the root div
      html = html.replace(
        '<div id="root"></div>',
        `<div id="root">${ssrContent}</div>
        <script>
          window.__INITIAL_DATA__ = {
            posts: ${JSON.stringify(posts).replace(/</g, '\\u003c')},
            categories: ${JSON.stringify(categories).replace(/</g, '\\u003c')}
          }
        </script>`
      );

      const response = new Response(html, {
        status: 200,
        headers: {
          "Content-Type": "text/html; charset=utf-8",
          "Cache-Control": "public, max-age=3600, s-maxage=7200",
          "Content-Length": Buffer.byteLength(html, 'utf8').toString(),
          "X-Robots-Tag": "index, follow, max-image-preview:large",
          "X-Rendered-By": "Edge-SSR-Universal"
        }
      });

      context.waitUntil(cache.put(cacheKey, response.clone()));
      return response;

    } catch (fetchError) {
      clearTimeout(timeoutId);
      console.error('[Edge-Home] Fetch error:', fetchError.message);
      return context.rewrite("/index.html");
    }

  } catch (error) {
    console.error("[Edge-Home] Critical error:", error);
    return context.rewrite("/index.html");
  }
};

function generateSSRContent(posts, categories) {
  // HomePage.jsx structure
  return `
    <div class="container mx-auto px-4 py-8">
      <!-- Header Ad -->
      <div class="w-full bg-gray-50 py-2">
        <div class="container mx-auto px-4 text-center">
          <div class="ad-container"></div>
        </div>
      </div>

      <!-- Hero Section -->
      <section class="text-center mb-12">
        <h1 class="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
          Welcome to <span class="text-blue-600">TechBlog AI</span>
        </h1>
        <p class="text-xl text-gray-600 max-w-2xl mx-auto">
          Your trusted source for the latest technology news, AI insights, web development tutorials, and industry trends.
        </p>
      </section>

      <!-- Categories Section -->
      <section class="mb-12">
        <h2 class="text-2xl font-bold text-gray-900 mb-6">Popular Categories</h2>
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
          ${categories.slice(0, 4).map(cat => `
            <a
              href="/category/${cat.slug}"
              class="bg-white p-6 rounded-lg shadow-sm border border-gray-200 text-center hover:shadow-md transition-shadow"
            >
              <h3 class="font-semibold text-gray-900 mb-2">${escapeHtml(cat.name)}</h3>
              <p class="text-sm text-gray-500">${cat.post_count || 0} posts</p>
            </a>
          `).join('')}
        </div>
      </section>

      <!-- Posts Section -->
      <section>
        <h2 class="text-2xl font-bold text-gray-900 mb-6">Latest Articles</h2>
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          ${posts.slice(0, 6).map((post, index) => `
            <div class="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
              ${post.featured_image ? `
                <a href="/post/${post.slug}" class="block">
                  <img src="${escapeHtml(post.featured_image)}" alt="${escapeHtml(post.title)}" class="w-full h-48 object-cover hover:scale-105 transition-transform duration-300" width="800" height="450" loading="lazy" style="aspect-ratio: 16/9; object-fit: cover;"/>
                </a>
              ` : ''}
              <div class="p-6">
                ${post.category_name ? `
                  <a href="/category/${post.category_slug || ''}" class="inline-block px-3 py-1 bg-blue-100 text-blue-700 text-sm font-medium rounded-full mb-3 hover:bg-blue-200 transition-colors">
                    ${escapeHtml(post.category_name)}
                  </a>
                ` : ''}
                <h2 class="text-xl font-bold text-gray-900 mb-3 line-clamp-2">
                  <a href="/post/${post.slug}" class="hover:text-blue-600 transition-colors">
                    ${escapeHtml(post.title)}
                  </a>
                </h2>
                <p class="text-gray-600 mb-4 line-clamp-3">${escapeHtml(post.excerpt || '')}</p>
                <div class="flex items-center justify-between text-sm text-gray-500">
                  <div class="flex items-center space-x-4">
                    <div class="flex items-center space-x-1">
                      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                      <span>Admin</span>
                    </div>
                    <div class="flex items-center space-x-1">
                      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <time datetime="${post.published_at}">${new Date(post.published_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}</time>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          `).join('')}
        </div>
      </section>
    </div>
  `;
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