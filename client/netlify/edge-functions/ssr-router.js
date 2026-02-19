// netlify/edge-functions/ssr-router.js
export default async (request, context) => {
  try {
    const url = new URL(request.url);
    
    // Skip API routes
    if (url.pathname.startsWith('/api/')) {
      console.log(`[Edge] Bypassing API route: ${url.pathname}`);
      return context.next();
    }

    // Only handle post pages
    if (!url.pathname.startsWith('/post/')) {
      return context.next();
    }

    const slug = url.pathname.replace(/^\/post\//, "").replace(/\/$/, "");

    console.log(`[Edge-Post] ${slug} - Serving SSR`);

    try {
      // Check cache first
      const cacheKey = `post-${slug}`;
      const cache = await caches.open('post-cache');
      const cached = await cache.match(cacheKey);
      
      if (cached) {
        console.log(`[Edge-Post] Cache HIT`);
        return cached;
      }

      // Fetch post data
      const post = await fetchPostData(slug);

      if (!post) {
        return new Response(generateFallbackHtml(slug), {
          status: 404,
          headers: {
            "Content-Type": "text/html; charset=utf-8",
            "X-Robots-Tag": "noindex, follow"
          }
        });
      }

      // Get the SPA template
      const spaResponse = await fetch(new URL('/index.html', request.url));
      let html = await spaResponse.text();

      // Generate SSR content matching PostPage.jsx structure
      const ssrContent = generatePostSSR(post, slug);

      // Inject SSR content into root div
      html = html.replace(
        '<div id="root"></div>',
        `<div id="root">${ssrContent}</div>`
      );

      // Generate all the rich metadata
      const postUrl = `https://aitechblogs.netlify.app/post/${slug}`;
      const schemas = generateSchemas(post, postUrl);
      const aiMetadata = generateAIMetadata(post, slug, postUrl);
      const metaTags = generateMetaTags(post, postUrl);

      // Inject metadata into head (right before closing head tag)
      html = html.replace(
        '</head>',
        `${aiMetadata}${metaTags}
  <script type="application/ld+json">${escapeJson(schemas.article)}</script>
  <script type="application/ld+json">${escapeJson(schemas.breadcrumb)}</script>
  <script type="application/ld+json">${escapeJson(schemas.website)}</script>
  </head>`
      );

      // Inject initial data for hydration
      html = html.replace(
        '</body>',
        `<script>
          window.__INITIAL_POST_DATA__ = {
            post: ${JSON.stringify(post).replace(/</g, '\\u003c')},
            slug: "${slug}"
          }
        </script></body>`
      );

      const response = new Response(html, {
        status: 200,
        headers: {
          "Content-Type": "text/html; charset=utf-8",
          "Cache-Control": "public, max-age=3600, s-maxage=7200, stale-while-revalidate=86400",
          "X-Robots-Tag": "index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1",
          "Vary": "User-Agent",
          "X-Rendered-By": "Edge-SSR-Post",
          "Link": `<${postUrl}>; rel="canonical"`,
          "X-Content-Type-Options": "nosniff",
          "X-Frame-Options": "SAMEORIGIN",
          "Referrer-Policy": "strict-origin-when-cross-origin",
        }
      });

      context.waitUntil(cache.put(cacheKey, response.clone()));
      return response;

    } catch (error) {
      console.error("[Edge-Post] Error:", error);
      return context.rewrite("/index.html");
    }

  } catch (error) {
    console.error("[Edge-Post] Critical error:", error);
    return context.rewrite("/index.html");
  }
};

// Fetch post data
async function fetchPostData(slug) {
  if (!slug) return null;
  
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);

  try {
    const url = `https://techblogai-backend.onrender.com/api/posts/${slug}`;
    
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
    
    return await response.json();
    
  } catch (error) {
    clearTimeout(timeout);
    console.error("[Edge-Post] Fetch error:", error.message);
    return null;
  }
}

// Generate all schemas (copied from original)
function generateSchemas(post, postUrl) {
  const t = post.title || post.meta_title || "TechBlog AI Article";
  const d = post.excerpt || post.meta_description || "Tech insights on TechBlog AI";
  const img = post.featured_image || "https://aitechblogs.netlify.app/og-image.png";
  const a = post.author_name || "Admin";
  const pub = post.published_at || new Date().toISOString();
  const mod = post.updated_at || pub;
  const cat = post.category_name || "Technology";
  const tags = Array.isArray(post.tags) ? post.tags : [];
  const wc = post.word_count || 1000;
  const rt = Math.ceil(wc / 200);

  return {
    article: {
      "@context": "https://schema.org",
      "@type": "TechArticle",
      "headline": t,
      "description": d,
      "image": { "@type": "ImageObject", "url": img, "width": 1200, "height": 630 },
      "url": postUrl,
      "datePublished": pub,
      "dateModified": mod,
      "author": {
        "@type": "Person",
        "@id": "https://aitechblogs.netlify.app/about#alexander-zachary",
        "name": a,
        "url": "https://aitechblogs.netlify.app/about",
        "sameAs": [
          "https://twitter.com/AiTechBlogs",
          "https://facebook.com/alexander.thuranira.1044"
        ]
      },
      "publisher": {
        "@type": "Organization",
        "name": "TechBlog AI",
        "url": "https://aitechblogs.netlify.app",
        "logo": {
          "@type": "ImageObject",
          "url": "https://aitechblogs.netlify.app/TechBlogAI.jpg",
          "width": 512,
          "height": 512
        },
        "sameAs": [
          "https://twitter.com/AiTechBlogs",
          "https://facebook.com/alexander.thuranira.1044"
        ]
      },
      "mainEntityOfPage": { "@type": "WebPage", "@id": postUrl },
      "articleSection": cat,
      "keywords": tags.join(", "),
      "wordCount": wc,
      "timeRequired": `PT${rt}M`,
      "inLanguage": "en-US",
      "isAccessibleForFree": true
    },
    breadcrumb: {
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
          "name": cat,
          "item": `https://aitechblogs.netlify.app/category/${cat.toLowerCase().replace(/\s+/g, "-")}`
        },
        {
          "@type": "ListItem",
          "position": 3,
          "name": t,
          "item": postUrl
        }
      ]
    },
    website: {
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
      },
      "inLanguage": "en-US"
    }
  };
}

// Generate AI metadata (copied from original)
function generateAIMetadata(post, slug, postUrl) {
  const tags = Array.isArray(post.tags) ? post.tags : [];
  const tagsString = tags.map(t => escapeHtml(t)).join(", ");
  const publishDate = post.published_at || new Date().toISOString();
  const modifiedDate = post.updated_at || publishDate;

  return `
    <!-- AI Training Metadata -->
    <link rel="alternate" type="application/json" href="https://techblogai-backend.onrender.com/api/posts/${slug}/full" title="Full Structured Article Data" />
    <meta name="ai-content-declaration" content="public, training-allowed, commercial-allowed" />
    <meta name="content-license" content="CC-BY-4.0" />
    <meta name="content-purpose" content="educational, informational, ai-training" />
    <meta name="content-quality" content="human-authored, fact-checked, up-to-date" />
    <meta name="api-endpoint" content="https://techblogai-backend.onrender.com/api/posts/${slug}/full" />
    
    <!-- Machine-Readable Content Summary -->
    <script type="application/ld+json">
    ${JSON.stringify({
      "@context": "https://schema.org",
      "@type": "Dataset",
      "name": escapeHtml(post.title),
      "description": (post.excerpt || "A summary of the article for AI training and research").slice(0, 400),
      "url": postUrl,
      "license": "https://creativecommons.org/licenses/by/4.0/",
      "creator": {
        "@type": "Organization",
        "name": "TechBlog AI",
        "url": "https://aitechblogs.netlify.app"
      },
      "contentUrl": `https://techblogai-backend.onrender.com/api/posts/${slug}/full`,
      "encodingFormat": "application/json",
      "temporalCoverage": `${publishDate}/${modifiedDate}`,
      "keywords": tagsString
    })}
    </script>
  `;
}

// Generate meta tags (copied from original)
function generateMetaTags(post, postUrl) {
  const title = escapeHtml(post.title || post.meta_title || "TechBlog AI Article");
  const desc = escapeHtml(post.excerpt || post.meta_description || "Tech insights on TechBlog AI");
  const img = post.featured_image || "https://aitechblogs.netlify.app/og-image.png";
  const author = escapeHtml(post.author_name || "Admin");
  const publishDate = post.published_at || new Date().toISOString();
  const modifiedDate = post.updated_at || publishDate;
  const category = escapeHtml(post.category_name || "Technology");
  const tags = Array.isArray(post.tags) ? post.tags : [];
  const readingTime = Math.ceil((post.word_count || 1000) / 200);
  const tagsString = tags.map(t => escapeHtml(t)).join(", ");

  return `
    <meta name="title" content="${title}" />
    <meta name="description" content="${desc}" />
    <meta name="author" content="${author}" />
    <meta name="keywords" content="${escapeHtml(post.keywords || tagsString)}" />
    <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1" />
    <meta name="googlebot" content="index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1" />
    <link rel="canonical" href="${postUrl}" />
    <meta property="fb:app_id" content="1829393364607774" />
    <meta property="og:type" content="article" />
    <meta property="og:url" content="${postUrl}" />
    <meta property="og:title" content="${title}" />
    <meta property="og:description" content="${desc}" />
    <meta property="og:image" content="${img}" />
    <meta property="og:image:secure_url" content="${img}" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    <meta property="og:image:alt" content="${title}" />
    <meta property="og:site_name" content="TechBlog AI" />
    <meta property="og:locale" content="en_US" />
    <meta property="article:published_time" content="${publishDate}" />
    <meta property="article:modified_time" content="${modifiedDate}" />
    <meta property="article:author" content="${author}" />
    <meta property="article:section" content="${category}" />
    ${tags.map(tag => `<meta property="article:tag" content="${escapeHtml(tag)}" />`).join('\n  ')}
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:url" content="${postUrl}" />
    <meta name="twitter:title" content="${title}" />
    <meta name="twitter:description" content="${desc}" />
    <meta name="twitter:image" content="${img}" />
    <meta name="twitter:image:alt" content="${title}" />
    <meta name="twitter:site" content="@AiTechBlogs" />
    <meta name="twitter:creator" content="@AiTechBlogs" />
    <meta name="twitter:label1" content="Reading time" />
    <meta name="twitter:data1" content="${readingTime} min read" />
  `;
}

// Generate SSR content matching PostPage.jsx structure
function generatePostSSR(post, slug) {
  const SITE_URL = 'https://aitechblogs.netlify.app';
  const readingTime = Math.ceil((post.word_count || 1000) / 200);
  
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const imageUrl = post.featured_image?.startsWith('http') 
    ? post.featured_image 
    : `${SITE_URL}${post.featured_image || ''}`;

  // Generate tags HTML
  const tagsHtml = post.tags?.length > 0 ? `
    <div class="flex flex-wrap gap-2 mb-6">
      <svg class="w-4 h-4 text-gray-400 mt-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l5 5a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-5-5A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
      </svg>
      ${post.tags.slice(0, 5).map(tag => `
        <a
          href="/search?q=${encodeURIComponent('#' + tag)}"
          class="text-sm text-gray-600 hover:text-primary-600 bg-gray-100 hover:bg-primary-50 px-3 py-1 rounded-full transition-colors"
        >
          #${escapeHtml(tag)}
        </a>
      `).join('')}
    </div>
  ` : '';

  // Generate share button HTML (simplified version for SSR)
  const shareButtonHtml = `
    <div class="relative ml-auto">
      <button class="flex items-center space-x-2 text-primary-600 hover:text-primary-700 transition-colors px-3 py-2 rounded-lg hover:bg-primary-50">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
        </svg>
        <span class="hidden sm:inline">Share</span>
      </button>
    </div>
  `;

  return `
    <div class="container mx-auto px-4 py-8">
      <!-- Reading Progress Bar (hidden initially, will be shown by React) -->
      <div class="fixed top-0 left-0 w-full h-1 bg-gray-200 z-50" style="display: none;"></div>

      <article class="max-w-4xl mx-auto animate-fadeIn">
        <!-- Back button -->
        <button
          onclick="window.history.back()"
          class="flex items-center text-gray-600 hover:text-gray-900 mb-6 transition-colors"
          aria-label="Go back"
        >
          <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back
        </button>

        <!-- Breadcrumb -->
        <nav class="text-sm text-gray-500 mb-6 animate-fadeIn">
          <ol class="flex flex-wrap items-center gap-2">
            <li>
              <a href="/" class="hover:text-primary-600 hover:underline underline-offset-4 transition-all">Home</a>
            </li>
            <li class="text-gray-400">/</li>
            ${post.category_name ? `
              <li>
                <a href="/category/${post.category_slug}" class="hover:text-primary-600 hover:underline underline-offset-4 transition-all">
                  ${escapeHtml(post.category_name)}
                </a>
              </li>
              <li class="text-gray-400">/</li>
            ` : ''}
            <li class="text-gray-700 font-medium truncate max-w-xs">${escapeHtml(post.title)}</li>
          </ol>
        </nav>

        <!-- Post Header -->
        <header class="mb-8">
          ${post.category_name ? `
            <a 
              href="/category/${post.category_slug}"
              class="inline-block px-3 py-1 bg-primary-100 text-primary-700 text-sm font-medium rounded-full mb-4 hover:bg-primary-200 transition-colors"
            >
              ${escapeHtml(post.category_name)}
            </a>
          ` : ''}

          <h1 class="text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 mb-4">
            ${escapeHtml(post.title)}
          </h1>

          <div class="flex flex-wrap items-center gap-4 text-gray-600 mb-6">
            <div class="flex items-center space-x-2">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              <span>${escapeHtml(post.author_name || 'Admin')}</span>
            </div>
            
            <div class="flex items-center space-x-2">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <time datetime="${post.published_at}">${formatDate(post.published_at)}</time>
            </div>
            
            <div class="flex items-center space-x-2">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>${readingTime} min read</span>
            </div>
            
            ${post.view_count > 0 ? `
              <div class="flex items-center space-x-2">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
                <span>${post.view_count.toLocaleString()} views</span>
              </div>
            ` : ''}
            
            ${shareButtonHtml}
          </div>

          ${tagsHtml}

          ${post.featured_image ? `
            <img
              src="${imageUrl}"
              alt="${escapeHtml(post.title)}"
              class="w-full h-64 md:h-96 object-cover rounded-lg shadow-sm"
              loading="eager"
              fetchpriority="high"
            />
            <!-- Ad placeholder (actual ad will load via React) -->
            <div class="mt-6 ad-container"></div>
          ` : ''}
        </header>

        <!-- Post Body -->
        <div class="prose prose-lg max-w-none mb-8">
          ${post.excerpt ? `
            <div class="bg-primary-50 border-l-4 border-primary-500 pl-4 py-2 mb-6 italic text-gray-700">
              ${escapeHtml(post.excerpt)}
            </div>
          ` : ''}

          <div class="post-content">
            ${post.content || ''}
          </div>

          <!-- Mid-content Ad placeholder -->
          <div class="my-8 ad-container"></div>
        </div>

        <!-- Comments Section placeholder -->
        <div class="comments-section"></div>

        <!-- Ad after comments placeholder -->
        <div class="mt-10 ad-container"></div>

        <!-- Related Posts placeholder -->
        ${post.related_posts?.length > 0 ? `
          <section class="mt-12">
            <h2 class="text-2xl font-bold text-gray-900 mb-6">Related Posts</h2>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
              ${post.related_posts.slice(0, 2).map(relatedPost => `
                <div class="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                  <div class="p-6">
                    <h3 class="text-lg font-semibold text-gray-900 mb-2">
                      <a href="/post/${relatedPost.slug}" class="hover:text-primary-600">${escapeHtml(relatedPost.title)}</a>
                    </h3>
                    <p class="text-gray-600 text-sm line-clamp-2">${escapeHtml(relatedPost.excerpt || '')}</p>
                  </div>
                </div>
              `).join('')}
            </div>
          </section>
        ` : ''}
      </article>

      <!-- Copy Toast (hidden initially) -->
      <div class="fixed bottom-8 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white px-6 py-3 rounded-lg shadow-lg z-50" style="display: none;"></div>
    </div>
  `;
}

function generateFallbackHtml(slug) {
  const url = `https://aitechblogs.netlify.app/post/${slug}`;
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Article Not Found - TechBlog AI</title>
  <meta name="description" content="Article not found. Explore more on TechBlog AI." />
  <meta property="og:title" content="Article Not Found - TechBlog AI" />
  <meta property="og:type" content="website" />
  <meta property="og:url" content="${url}" />
  <meta property="og:image" content="https://aitechblogs.netlify.app/og-image.png" />
  <meta name="robots" content="noindex, follow" />
  <link rel="canonical" href="https://aitechblogs.netlify.app" />
  <link rel="icon" type="image/svg+xml" href="/favicon.ico" />
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;padding:20px;background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);color:#fff;text-align:center}
    .container{max-width:500px;background:rgba(255,255,255,.1);backdrop-filter:blur(10px);padding:40px;border-radius:20px;box-shadow:0 8px 32px 0 rgba(31,38,135,.37)}
    h1{font-size:3rem;margin-bottom:20px;font-weight:700}
    p{font-size:1.1rem;margin-bottom:30px;opacity:.9}
    a{display:inline-block;padding:12px 30px;background:#fff;color:#667eea;text-decoration:none;border-radius:50px;font-weight:600;transition:transform .2s,box-shadow .2s}
    a:hover{transform:translateY(-2px);box-shadow:0 5px 20px rgba(0,0,0,.2)}
  </style>
</head>
<body>
  <div class="container">
    <h1>404</h1>
    <p>Article not found.</p>
    <a href="https://aitechblogs.netlify.app">Return Home</a>
  </div>
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

function escapeJson(obj) {
  return JSON.stringify(obj).replace(/</g, '\\u003c').replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');
}

export const config = {
  path: "/post/*",
  onError: "bypass"
};