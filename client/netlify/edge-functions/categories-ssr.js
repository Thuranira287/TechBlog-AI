// netlify/edge-functions/category-ssr.js
export default async (request, context) => {
  try {
    const url = new URL(request.url);
    
    // Skip ALL API routes
    if (url.pathname.startsWith('/api/')) {
      console.log(`[Edge] Bypassing API route: ${url.pathname}`);
      return context.next();
    }

    const pathParts = url.pathname.split('/').filter(p => p);
    
    // Only handle category pages
    if (pathParts[0] === 'category' && pathParts[1]) {
      const categorySlug = pathParts[1];
      const page = url.searchParams.get('page') || 1;

      console.log(`[Edge-Category] ${categorySlug}, Page:${page}, Serving SSR`);

      try {
        // Check cache first
        const cacheKey = `category-${categorySlug}-page-${page}`;
        const cache = await caches.open('category-cache');
        const cached = await cache.match(cacheKey);
        
        if (cached) {
          console.log(`[Edge-Category] Cache HIT`);
          return cached;
        }

        // Fetch category data
        const categoryData = await fetchCategoryData(categorySlug, page);
        
        // Get the SPA template
        const spaResponse = await fetch(new URL('/index.html', request.url));
        let html = await spaResponse.text();

        // Generate all SEO metadata
        const categoryUrl = `https://aitechblogs.netlify.app/category/${categorySlug}`;
        const seoMetadata = generateSEOMetadata(categoryData, categorySlug, page, categoryUrl);

        // Inject metadata into head
        html = html.replace(
          '</head>',
          `${seoMetadata}</head>`
        );

        // Generate SSR content
        const ssrContent = generateCategorySSR(categoryData, categorySlug, page);

        // Inject SSR content into root div
        html = html.replace(
          '<div id="root"></div>',
          `<div id="root">${ssrContent}</div>`
        );

        // Inject initial data for hydration
        html = html.replace(
          '</body>',
          `<script>
            window.__INITIAL_CATEGORY_DATA__ = {
              posts: ${JSON.stringify(categoryData.posts || []).replace(/</g, '\\u003c')},
              category: ${JSON.stringify(categoryData.category || {}).replace(/</g, '\\u003c')},
              pagination: {
                total: ${categoryData.total || 0},
                currentPage: ${categoryData.currentPage || Number(page)},
                totalPages: ${categoryData.totalPages || 1}
              }
            }
          </script></body>`
        );

        const response = new Response(html, {
          status: 200,
          headers: {
            "Content-Type": "text/html; charset=utf-8",
            "Cache-Control": "public, max-age=1800, s-maxage=3600",
            "X-Robots-Tag": "index, follow, max-image-preview:large",
            "Vary": "User-Agent",
            "X-Rendered-By": "Edge-SSR-Category"
          }
        });
        
        context.waitUntil(cache.put(cacheKey, response.clone()));
        return response;
        
      } catch (error) {
        console.error("[Edge-Category] Error:", error);
        return context.rewrite("/index.html");
      }
    }
    
    return context.rewrite("/index.html");

  } catch (error) {
    console.error("[Edge-Category] Critical error:", error);
    return context.rewrite("/index.html");
  }
};

// Fetch category data
async function fetchCategoryData(categorySlug, page = 1) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);
  
  try {
    const url = `https://techblogai-backend.onrender.com/api/posts/category/${categorySlug}?page=${page}&limit=20`;
    
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { 
        "User-Agent": "TechBlogAI-Edge/1.0", 
        "Accept": "application/json" 
      }
    });
    
    clearTimeout(timeout);
    
    if (!response.ok) {
      throw new Error(`Backend status: ${response.status}`);
    }
    
    const data = await response.json();
    
    return {
      posts: data.posts || [],
      category: data.category || {
        name: categorySlug.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
        description: `Latest ${categorySlug.replace(/-/g, ' ')} articles`
      },
      total: data.total || 0,
      currentPage: data.currentPage || Number(page),
      totalPages: data.totalPages || 1
    };
    
  } catch (error) {
    clearTimeout(timeout);
    console.error(`[Edge-Category] Fetch error: ${error.message}`);
    
    // Return fallback data
    return {
      posts: [],
      category: {
        name: categorySlug.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
        description: `Latest ${categorySlug.replace(/-/g, ' ')} articles`
      },
      total: 0,
      currentPage: Number(page),
      totalPages: 1
    };
  }
}

// Generate SEO metadata (breadcrumb schema, meta tags, etc.)
function generateSEOMetadata(data, categorySlug, page, categoryUrl) {
  const category = data.category || {};
  const categoryName = category.name || categorySlug.replace(/-/g, ' ');
  const totalPosts = data.total || 0;
  const currentPage = data.currentPage || Number(page);
  const totalPages = data.totalPages || 1;

  // Breadcrumb schema
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
        "name": "Categories",
        "item": "https://aitechblogs.netlify.app/category"
      },
      {
        "@type": "ListItem",
        "position": 3,
        "name": categoryName,
        "item": categoryUrl
      }
    ]
  };

  // Website schema
  const websiteSchema = {
    "@context": "https://schema.org",
    "@type": "Website",
    "@id": "https://aitechblogs.netlify.app/#website",
    "name": "TechBlog AI",
    "description": "AI and technology insights",
    "url": "https://aitechblogs.netlify.app",
    "publisher": {
      "@type": "Organization",
      "@id": "https://aitechblogs.netlify.app/#organization",
      "name": "TechBlog AI"
    }
  };

  // Collection page schema (for category listings)
  const collectionSchema = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "@id": categoryUrl,
    "name": `${categoryName} ${currentPage > 1 ? `- Page ${currentPage}` : ''}`,
    "description": category.description || `Browse all articles in ${categoryName}`,
    "isPartOf": {
      "@id": "https://aitechblogs.netlify.app/#website"
    },
    "mainEntity": {
      "@type": "ItemList",
      "itemListElement": data.posts?.slice(0, 10).map((post, index) => ({
        "@type": "ListItem",
        "position": index + 1,
        "url": `https://aitechblogs.netlify.app/post/${post.slug}`
      })) || []
    }
  };

  return `
    <!-- Primary Meta Tags -->
    <meta name="description" content="${escapeHtml(category.description || `Browse all articles in ${categoryName}`)}${currentPage > 1 ? ` - Page ${currentPage}` : ''}" />
    <meta name="keywords" content="${escapeHtml(categoryName)}, technology, AI, programming, tech news" />
    <meta name="robots" content="${currentPage === 1 ? 'index, follow' : 'index, follow'}, max-image-preview:large" />
    <link rel="canonical" href="${categoryUrl}${currentPage > 1 ? `?page=${currentPage}` : ''}" />
    
    <!-- Open Graph -->
    <meta property="og:type" content="website" />
    <meta property="og:url" content="${categoryUrl}${currentPage > 1 ? `?page=${currentPage}` : ''}" />
    <meta property="og:title" content="${escapeHtml(categoryName)} ${currentPage > 1 ? `(Page ${currentPage})` : ''} | TechBlog AI" />
    <meta property="og:description" content="${escapeHtml(category.description || `Browse all articles in ${categoryName}`)}${currentPage > 1 ? ` - Page ${currentPage}` : ''}" />
    <meta property="og:image" content="https://aitechblogs.netlify.app/og-category.png" />
    <meta property="og:image:alt" content="${escapeHtml(categoryName)} Articles" />
    <meta property="og:site_name" content="TechBlog AI" />
    <meta property="og:locale" content="en_US" />
    
    <!-- Twitter -->
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:url" content="${categoryUrl}${currentPage > 1 ? `?page=${currentPage}` : ''}" />
    <meta name="twitter:title" content="${escapeHtml(categoryName)} ${currentPage > 1 ? `(Page ${currentPage})` : ''} | TechBlog AI" />
    <meta name="twitter:description" content="${escapeHtml(category.description || `Browse all articles in ${categoryName}`)}${currentPage > 1 ? ` - Page ${currentPage}` : ''}" />
    <meta name="twitter:image" content="https://aitechblogs.netlify.app/og-category.png" />
    
    <!-- AI & Licensing -->
    <meta name="ai-content-declaration" content="public, training-allowed" />
    <meta name="license" content="CC BY 4.0" />
    <link rel="license" href="https://creativecommons.org/licenses/by/4.0/" />
    
    <!-- Structured Data -->
    <script type="application/ld+json">${escapeJson(breadcrumbSchema)}</script>
    <script type="application/ld+json">${escapeJson(websiteSchema)}</script>
    <script type="application/ld+json">${escapeJson(collectionSchema)}</script>
  `;
}

// Generate SSR content
function generateCategorySSR(data, categorySlug, page) {
  const posts = data.posts || [];
  const category = data.category || {};
  const currentPage = data.currentPage || Number(page);
  const totalPages = data.totalPages || 1;
  const totalPosts = data.total || posts.length;

  const categoryName = escapeHtml(category.name || categorySlug.replace(/-/g, ' '));
  const categoryDesc = escapeHtml(category.description || `Browse all articles in ${categoryName}`);

  // Generate posts HTML
  const postsHtml = posts.map(post => `
    <div class="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow" itemscope itemtype="https://schema.org/TechArticle">
      ${post.featured_image ? `
        <a href="/post/${post.slug}" class="block" itemprop="url">
          <img 
            src="${escapeHtml(post.featured_image)}" 
            alt="${escapeHtml(post.title)}" 
            class="w-full h-48 object-cover hover:scale-105 transition-transform duration-300" 
            loading="lazy" 
            itemprop="image"
          />
        </a>
      ` : ''}
      <div class="p-6">
        <a 
          href="/category/${categorySlug}" 
          class="inline-block px-3 py-1 bg-blue-100 text-blue-700 text-sm font-medium rounded-full mb-3 hover:bg-blue-200 transition-colors"
          itemprop="articleSection"
        >
          ${escapeHtml(categoryName)}
        </a>
        <h2 class="text-xl font-bold text-gray-900 mb-3 line-clamp-2" itemprop="headline">
          <a href="/post/${post.slug}" class="hover:text-blue-600 transition-colors" itemprop="url">
            ${escapeHtml(post.title)}
          </a>
        </h2>
        <p class="text-gray-600 mb-4 line-clamp-3" itemprop="description">${escapeHtml(post.excerpt || '')}</p>
        <div class="flex items-center justify-between text-sm text-gray-500">
          <div class="flex items-center space-x-4">
            <div class="flex items-center space-x-1">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                  d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              <span itemprop="author" itemscope itemtype="https://schema.org/Person">
                <span itemprop="name">${escapeHtml(post.author_name || 'Admin')}</span>
              </span>
            </div>
            <div class="flex items-center space-x-1">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                  d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <time datetime="${post.published_at}" itemprop="datePublished">
                ${new Date(post.published_at).toLocaleDateString('en-US', { 
                  year: 'numeric', month: 'short', day: 'numeric' 
                })}
              </time>
            </div>
          </div>
        </div>
        <meta itemprop="dateModified" content="${post.updated_at || post.published_at}" />
      </div>
    </div>
  `).join('');

  // Generate pagination HTML
  const paginationHtml = totalPages > 1 ? `
    <div class="pagination" role="navigation" aria-label="Pagination">
      <div class="flex flex-col md:flex-row justify-between items-center gap-4 mt-12 pt-8 border-t border-gray-200">
        <div class="flex items-center gap-4">
          ${currentPage > 1 ? `
            <a 
              href="/category/${categorySlug}?page=${currentPage - 1}"
              class="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2"
              rel="prev"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
              </svg>
              Previous
            </a>
          ` : ''}
        </div>
        
        <div class="page-numbers flex items-center gap-2">
          ${Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
            const pageNum = i + 1;
            return pageNum === currentPage ? `
              <span class="current px-4 py-2 bg-blue-600 text-white rounded-lg font-medium" aria-current="page">${pageNum}</span>
            ` : `
              <a 
                href="/category/${categorySlug}?page=${pageNum}"
                class="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >${pageNum}</a>
            `;
          }).join('')}
          
          ${totalPages > 5 ? '<span class="ellipsis px-2 text-gray-500">...</span>' : ''}
        </div>
        
        <div class="flex items-center gap-4">
          ${currentPage < totalPages ? `
            <a 
              href="/category/${categorySlug}?page=${currentPage + 1}"
              class="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2"
              rel="next"
            >
              Next
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
              </svg>
            </a>
          ` : ''}
          
          <div class="text-sm text-gray-500 hidden md:block">
            Page ${currentPage} of ${totalPages}
          </div>
        </div>
      </div>
    </div>
  ` : '';

  // Empty state HTML
  const emptyStateHtml = posts.length === 0 ? `
    <div class="text-center py-12">
      <h2 class="text-2xl font-bold text-gray-900 mb-4">
        ${currentPage > totalPages ? `Page ${currentPage} Not Found` : 'No Posts Found in This Category'}
      </h2>
      <p class="text-gray-600 mb-6">
        ${currentPage > totalPages 
          ? `There are only ${totalPages} page${totalPages !== 1 ? 's' : ''} in this category.`
          : 'There are no published posts in this category yet. Browse All Categories'
        }
      </p>
      <div class="flex gap-4 justify-center">
        <a 
          href="/category/${categorySlug}" 
          class="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          ← Return to Page 1
        </a>
        <a 
          href="/" 
          class="px-6 py-3 border border-gray-300 rounded-lg hover:bg-green-100 transition-colors"
        >
          Browse All Categories
        </a>
      </div>
    </div>
  ` : '';

  // Assemble the complete SSR content
  return `
    <div class="container mx-auto px-4 py-8">
      <!-- Header Ad -->
      <div class="w-full bg-gray-50 py-2">
        <div class="container mx-auto px-4 text-center">
          <div class="ad-container"></div>
        </div>
      </div>

      <!-- Breadcrumb (visible) -->
      <nav class="breadcrumb text-sm text-gray-500 mb-6" aria-label="Breadcrumb">
        <ol class="flex flex-wrap items-center gap-2">
          <li>
            <a href="/" class="hover:text-primary-600 hover:underline underline-offset-4 transition-all">Home</a>
          </li>
          <li class="text-gray-400">/</li>
          <li>
            <a href="/category" class="hover:text-primary-600 hover:underline underline-offset-4 transition-all">Categories</a>
          </li>
          <li class="text-gray-400">/</li>
          <li class="text-gray-700 font-medium">
            ${categoryName} ${currentPage > 1 ? `(Page ${currentPage})` : ''}
          </li>
        </ol>
      </nav>

      <!-- Category Header -->
      <header class="category-header text-center mb-12">
        <h1 class="text-4xl font-bold text-gray-900 mb-4 capitalize">
          ${categoryName}
          ${currentPage > 1 ? `<span class="text-blue-600 ml-2">(Page ${currentPage})</span>` : ''}
        </h1>
        <p class="text-xl text-gray-600 max-w-2xl mx-auto">
          ${categoryDesc}
          ${currentPage > 1 ? `<span class="text-gray-500 ml-2">- Page ${currentPage}</span>` : ''}
        </p>
        
        ${totalPosts > 0 ? `
          <div class="post-count mt-4 inline-flex items-center gap-2 px-4 py-2 bg-gray-100 rounded-full text-sm text-gray-600">
            <span class="font-medium">${totalPosts}</span> articles
            <span class="mx-1">•</span>
            Page <span class="font-medium mx-1">${currentPage}</span> of 
            <span class="font-medium">${totalPages}</span>
          </div>
        ` : ''}
      </header>

      <!-- Posts Grid or Empty State -->
      <section>
        ${posts.length > 0 ? `
          <div class="posts-grid grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            ${postsHtml}
          </div>
          ${paginationHtml}
        ` : emptyStateHtml}
      </section>

      <!-- AI Training Note (optional) -->
      ${posts.length > 0 ? `
        <section class="ai-full-content mt-12 p-6 bg-blue-50 rounded-lg border border-blue-100">
          <h2 class="text-xl font-bold text-gray-900 mb-2">📚 Content for AI Training</h2>
          <p class="text-gray-700">This category page contains ${totalPosts} articles available for AI training under <a href="https://creativecommons.org/licenses/by/4.0/" class="text-blue-600 hover:underline">CC BY 4.0</a>.</p>
        </section>
      ` : ''}
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

function escapeJson(obj) {
  return JSON.stringify(obj).replace(/</g, '\\u003c').replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');
}

export const config = {
  path: "/category/*",
  onError: "bypass"
};