export default async (request, context) => {
  try {
    const url = new URL(request.url);
    const userAgent = request.headers.get("user-agent") || "";
    const slug = url.pathname.replace(/^\/post\//, "").replace(/\/$/, "");
   
    // Early return
    if (!slug) {
      return context.rewrite("/index.html");
    }

    const isBot = detectBot(userAgent);
    const fullContentCrawlers = ['gptbot', 'anthropic-ai', 'claude-web', 'cohere-ai', 'perplexitybot', 'chatgpt-user', 'youbot', 'ccbot'];
    const isFullContentBot = fullContentCrawlers.some(bot => userAgent.toLowerCase().includes(bot));
   
    console.log(`[Edge] ${url.pathname}, Bot:${isBot}, Full:${isFullContentBot}, UA:${userAgent.substring(0, 50)}`);

    try {
      // Parallel fetching
      const [post, assets] = await Promise.all([
        fetchPostMeta(slug, isFullContentBot),
        isBot ? Promise.resolve(null) : getViteAssets(context) //fetch assets for humans
      ]);
     
      console.log(`[Edge] Post:${post ? 'OK' : 'NULL'}, Assets:${assets ? 'OK' : 'NULL'}`);
     
      if (!post) {
        console.error(`[Edge] Post not found for slug: ${slug}`);
        return new Response(generateFallbackHtml(slug), {
          status: 404,
          headers: {
            "Content-Type": "text/html; charset=utf-8",
            "X-Robots-Tag": "noindex, follow",
            "Vary": "User-Agent"
          }
        });
      }

      const postUrl = `https://aitechblogs.netlify.app/post/${slug}`;
      
      // bot-optimized HTML for crawlers
      if (isBot) {
        const html = generateBotHtml(post, postUrl, isFullContentBot, isFullContentBot);
        return new Response(html, {
          status: 200,
          headers: {
            "Content-Type": "text/html; charset=utf-8",
            "Cache-Control": "public, max-age=3600, s-maxage=7200, stale-while-revalidate=86400",
            "X-Robots-Tag": "index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1",
            "Vary": "User-Agent",
            "X-Rendered-By": isFullContentBot ? "Edge-SSR-Full" : "Edge-SSR",
            "Link": `<${postUrl}>; rel="canonical"`,
            "Content-Security-Policy": "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' https://fonts.gstatic.com; connect-src 'self' https://techblogai-backend.onrender.com;",
            "X-Content-Type-Options": "nosniff",
            "X-Frame-Options": "DENY",
            "Referrer-Policy": "strict-origin-when-cross-origin",
          }
        });
      }
      
      // Optimized human shell 
      if (!assets) {
        console.error(`[Edge] Assets failed to load for human request`);
        return context.rewrite("/index.html");
      }

      const html = generateHumanShell({ slug, post, assets });
      return new Response(html, {
        status: 200,
        headers: {
          "Content-Type": "text/html; charset=utf-8",
          "Cache-Control": "public, max-age=3600, s-maxage=7200, stale-while-revalidate=86400",
          "X-Robots-Tag": "index, follow",
          "Vary": "User-Agent",
          "X-Rendered-By": "Edge-SSR-Human",
          "Link": `<${postUrl}>; rel="canonical"`,
          "Content-Security-Policy": "default-src 'self'; script-src 'self' ; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' https://fonts.gstatic.com; connect-src 'self' https://techblogai-backend.onrender.com;",
          "X-Content-Type-Options": "nosniff",
          "X-Frame-Options": "DENY",
          "Referrer-Policy": "strict-origin-when-cross-origin",
        }
      });
    } catch (error) {
      console.error("[Edge] Request error:", error);
      return context.rewrite("/index.html");
    }
  } catch (error) {
    console.error("[Edge] Critical error:", error);
    return context.rewrite("/index.html");
  }
};

// Cached manifest for performance
let cachedManifest = null;
let manifestCacheTime = 0;
const MANIFEST_CACHE_TTL = 60000;

async function getViteAssets(context) {
  const now = Date.now();
  
  // Return cached manifest if still valid
  if (cachedManifest && (now - manifestCacheTime) < MANIFEST_CACHE_TTL) {
    return cachedManifest;
  }

  try {
    const manifestRes = await context.env.ASSETS.fetch("/manifest.json");
    if (!manifestRes.ok) {
      console.error(`[Edge] Manifest fetch failed: ${manifestRes.status}`);
      return null;
    }
    
    cachedManifest = await manifestRes.json();
    manifestCacheTime = now;
    return cachedManifest;
  } catch (error) {
    console.error("[Edge] Manifest error:", error);
    return null;
  }
}

function detectBot(userAgent = "") {
  const bots = [
    'googlebot', 'google-inspectiontool', 'bingbot', 'slurp', 'duckduckbot', 
    'yandexbot', 'baiduspider', 'facebot', 'facebookexternalhit', 'twitterbot', 
    'linkedinbot', 'whatsapp', 'telegram', 'slackbot', 'discordbot',
    'pinterestbot', 'redditbot', 'chatgpt-user', 'gptbot', 'anthropic-ai', 
    'claude-web', 'cohere-ai', 'perplexitybot', 'youbot', 'ccbot', 'petalbot', 
    'meta-externalagent', 'semrushbot', 'ahrefsbot', 'mj12bot', 'dotbot', 
    'applebot', 'amazonbot', 'lighthouse', 'bot/', 'crawler', 'spider', 
    'scraper', 'fetch'
  ];
  const ua = userAgent.toLowerCase();
  return bots.some(bot => ua.includes(bot));
}

async function fetchPostMeta(slug, fullContent = false) {
  if (!slug) return null;
  
  const endpoint = fullContent ? 'full' : 'meta';
  const url = `https://techblogai-backend.onrender.com/api/posts/${slug}/${endpoint}`;
 
  console.log(`[Edge] Fetching: ${url}`);
  
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000); // 10 second timeout

  try {
    const response = await fetch(url, {
      method: 'GET',
      signal: controller.signal,
      headers: {
        "User-Agent": "TechBlogAI-EdgeSSR/2.0",
        "Accept": "application/json",
        "Cache-Control": "no-cache"
      }
    });
    
    clearTimeout(timeout);
    
    if (!response.ok) {
      console.error(`[Edge] API error: ${response.status} ${response.statusText}`);
      return null;
    }
    
    const data = await response.json();
    console.log(`[Edge] Post loaded: ${data?.title || 'untitled'}`);
    return data;
  } catch (error) {
    clearTimeout(timeout);
    if (error.name === 'AbortError') {
      console.error("[Edge] Fetch timeout");
    } else {
      console.error("[Edge] Fetch error:", error.message);
    }
    return null;
  }
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
  return JSON.stringify(obj)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
}

function cleanHtmlForAI(html = "") {
  if (!html) return "";
  
  let clean = html;
  // Remove scripts, styles, and iframes
  clean = clean.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  clean = clean.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '');
  clean = clean.replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '');
  
  // Remove event handlers and javascript: links
  clean = clean.replace(/on\w+\s*=\s*["'][^"']*["']/gi, '');
  clean = clean.replace(/javascript:/gi, '');
  
  return clean;
}

function generateSchemas(post, postUrl) {
  const t = post.title || post.meta_title || "TechBlog AI Article";
  const d = post.excerpt || post.meta_description || "Tech insights on TechBlog AI";
  const img = post.featured_image || post.image || "https://aitechblogs.netlify.app/og-image.png";
  const a = post.author || "TechBlog AI Team";
  const pub = post.created_at || post.published_at || new Date().toISOString();
  const mod = post.updated_at || pub;
  const cat = post.category || "Technology";
  const tags = Array.isArray(post.tags) ? post.tags : [];
  const wc = post.word_count || 1000;
  const rt = Math.ceil(wc / 200);

  return {
    article: {
      "@context": "https://schema.org",
      "@type": "BlogPosting",
      "headline": t,
      "description": d,
      "image": {
        "@type": "ImageObject",
        "url": img,
        "width": 1200,
        "height": 630
      },
      "url": postUrl,
      "datePublished": pub,
      "dateModified": mod,
      "author": {
        "@type": "Person",
        "name": a,
        "url": "https://aitechblogs.netlify.app/about"
      },
      "publisher": {
        "@type": "Organization",
        "name": "TechBlog AI",
        "url": "https://aitechblogs.netlify.app",
        "logo": {
          "@type": "ImageObject",
          "url": "https://aitechblogs.netlify.app/favicon.ico",
          "width": 100,
          "height": 100
        },
        "sameAs": [
          "https://twitter.com/AiTechBlogs",
          "https://facebook.com/aitechblogs"
        ]
      },
      "mainEntityOfPage": {
        "@type": "WebPage",
        "@id": postUrl
      },
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
          "item": `https://aitechblogs.netlify.app/category/${encodeURIComponent(cat.toLowerCase())}`
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
      "@type": "WebSite",
      "@id": "https://aitechblogs.netlify.app/#website",
      "name": "TechBlog AI",
      "url": "https://aitechblogs.netlify.app",
      "description": "AI and technology insights",
      "publisher": {
        "@type": "Organization",
        "name": "TechBlog AI",
        "url": "https://aitechblogs.netlify.app"
      },
      "inLanguage": "en-US"
    }
  };
}

function generateBotHtml(post, postUrl, includeFullContent = false, isAICrawler = false) {
  const title = escapeHtml(post.title || post.meta_title || "TechBlog AI Article");
  const desc = escapeHtml(post.excerpt || post.meta_description || "Tech insights on TechBlog AI");
  const img = post.featured_image || post.image || "https://aitechblogs.netlify.app/og-image.png";
  const author = escapeHtml(post.author || "TechBlog AI Team");
  const publishDate = post.created_at || post.published_at || new Date().toISOString();
  const modifiedDate = post.updated_at || publishDate;
  const category = escapeHtml(post.category || "Technology");
  const tags = Array.isArray(post.tags) ? post.tags : [];
  const tagsString = tags.map(t => escapeHtml(t)).join(", ");
  const readingTime = Math.ceil((post.word_count || 1000) / 200);
 
  const schemas = generateSchemas(post, postUrl);
 
  // Generate content based on bot type
  let contentHtml = '';
  if (includeFullContent && post.content) {
    const fullContent = cleanHtmlForAI(post.content || "");
    contentHtml = `<div class="article-content">
      <div class="excerpt">${desc}</div>
      <div class="full-content">${fullContent}</div>
    </div>`;
  } else if (post.content) {
    // For regular bots, show substantial preview
    const cleanContent = cleanHtmlForAI(post.content);
    const preview = cleanContent.substring(0, 2000);
    const hasMore = cleanContent.length > 2000;
    contentHtml = `<div class="article-content">
      <div class="excerpt">${desc}</div>
      <div class="content-preview">${preview}${hasMore ? '...' : ''}</div>
      ${hasMore ? '<p class="continue-reading"><em>Continue reading the full article at the link above.</em></p>' : ''}
    </div>`;
  } else {
    contentHtml = `<div class="article-content"><div class="excerpt">${desc}</div></div>`;
  }

  const breadcrumbHtml = `<nav aria-label="Breadcrumb" class="breadcrumb">
    <ol itemscope itemtype="https://schema.org/BreadcrumbList">
      <li itemprop="itemListElement" itemscope itemtype="https://schema.org/ListItem">
        <a itemprop="item" href="https://aitechblogs.netlify.app">
          <span itemprop="name">Home</span>
        </a>
        <meta itemprop="position" content="1" />
      </li>
      <li itemprop="itemListElement" itemscope itemtype="https://schema.org/ListItem">
        <a itemprop="item" href="https://aitechblogs.netlify.app/category/${encodeURIComponent(category.toLowerCase())}">
          <span itemprop="name">${category}</span>
        </a>
        <meta itemprop="position" content="2" />
      </li>
      <li itemprop="itemListElement" itemscope itemtype="https://schema.org/ListItem">
        <span itemprop="name">${title}</span>
        <meta itemprop="position" content="3" />
      </li>
    </ol>
  </nav>`;

  return `<!DOCTYPE html>
<html lang="en" prefix="og: https://ogp.me/ns# article: https://ogp.me/ns/article#">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="theme-color" content="#0f172a">
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <title>${title} | TechBlog AI</title>
  <meta name="title" content="${title}" />
  <meta name="description" content="${desc}" />
  <meta name="author" content="${author}" />
  <meta name="keywords" content="${escapeHtml(post.keywords || tagsString)}" />
  <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1" />
  <meta name="googlebot" content="index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1" />
  <link rel="canonical" href="${postUrl}" />
  
  <!-- Open Graph / Facebook -->
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
  
  <!-- Twitter -->
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
  
  <!-- Structured Data -->
  <script type="application/ld+json">${escapeJson(schemas.article)}</script>
  <script type="application/ld+json">${escapeJson(schemas.breadcrumb)}</script>
  <script type="application/ld+json">${escapeJson(schemas.website)}</script>
  
  <!-- Resource Hints -->
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link rel="icon" type="image/svg+xml" href="/favicon.ico" />
  <link rel="preconnect" href="https://techblogai-backend.onrender.com" />
  <link rel="alternate" type="application/rss+xml" title="TechBlog AI RSS Feed" href="https://aitechblogs.netlify.app/rss.xml" />
  
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:800px;margin:0 auto;padding:20px;line-height:1.6;color:#333;background:#fff}
    .breadcrumb{margin:20px 0;padding:10px 0;border-bottom:1px solid #e5e7eb}
    .breadcrumb ol{list-style:none;display:flex;flex-wrap:wrap;align-items:center;gap:8px;font-size:.875rem}
    .breadcrumb li{display:flex;align-items:center}
    .breadcrumb li:not(:last-child)::after{content:'›';margin-left:8px;color:#9ca3af;font-weight:bold}
    .breadcrumb a{color:#3b82f6;text-decoration:none;transition:color .2s}
    .breadcrumb a:hover{color:#2563eb;text-decoration:underline}
    .breadcrumb li:last-child{color:#6b7280;font-weight:500}
    article{margin-top:20px}
    h1{color:#1a1a1a;font-size:2rem;margin-bottom:15px;line-height:1.2;font-weight:700}
    .meta{color:#666;font-size:.9em;margin-bottom:20px;padding-bottom:15px;border-bottom:1px solid #e5e7eb;display:flex;flex-wrap:wrap;gap:12px}
    .article-content{margin-top:30px}
    .excerpt{font-size:1.1rem;line-height:1.7;color:#555;margin-bottom:1.5em;font-weight:500}
    .content-preview,.full-content{margin-top:15px;line-height:1.8;font-size:1.05rem}
    .content-preview h2,.content-preview h3,.content-preview h4,
    .full-content h2,.full-content h3,.full-content h4{margin-top:1.5em;margin-bottom:.5em;color:#1a1a1a;font-weight:600}
    .content-preview h2,.full-content h2{font-size:1.5em}
    .content-preview h3,.full-content h3{font-size:1.25em}
    .content-preview h4,.full-content h4{font-size:1.1em}
    .content-preview p,.full-content p{margin-bottom:1em}
    .content-preview ul,.content-preview ol,.full-content ul,.full-content ol{margin-left:1.5em;margin-bottom:1em}
    .content-preview li,.full-content li{margin-bottom:.5em}
    .content-preview a,.full-content a{color:#3b82f6;text-decoration:underline}
    .content-preview strong,.content-preview b,.full-content strong,.full-content b{font-weight:600}
    .content-preview blockquote,.full-content blockquote{border-left:3px solid #3b82f6;padding:1em;margin:1em 0;font-style:italic;color:#555;background:#f9fafb}
    .content-preview code,.full-content code{background:#f3f4f6;padding:2px 6px;border-radius:3px;font-family:'Courier New',monospace;font-size:.9em}
    .content-preview img,.full-content img{max-width:100%;height:auto;margin:1em 0;border-radius:8px}
    .continue-reading{margin-top:2em;padding:1em;background:#f0f9ff;border-left:3px solid #3b82f6;font-size:.95em;color:#1e40af}
    .disclaimer{margin-top:2em;padding:1em;background:#f3f4f6;border-left:3px solid #3b82f6;font-size:.9em;color:#4b5563}
    @media (max-width:640px){body{padding:15px}h1{font-size:1.5rem}.breadcrumb{font-size:.8rem}.content-preview,.full-content{font-size:1rem}}
  </style>
</head>
<body>
  ${breadcrumbHtml}
  <article itemscope itemtype="https://schema.org/TechArticle">
    <h1 itemprop="headline">${title}</h1>
    <div class="meta">
      <span>
        <span itemprop="author" itemscope itemtype="https://schema.org/Person">
          By <span itemprop="name">${author}</span>
        </span>
      </span>
      <span>•</span>
      <span itemprop="articleSection">${category}</span>
      <span>•</span>
      <time itemprop="datePublished" datetime="${publishDate}">
        ${new Date(publishDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
      </time>
      <span>•</span>
      <span>${readingTime} min read</span>
    </div>
    <div class="content" itemprop="articleBody">
      ${contentHtml}
      <div class="disclaimer">
        <em>${isAICrawler ? 'Full content provided for AI analysis and indexing.' : 'Rendered for search engine crawlers. Visit the site for the complete interactive experience.'}</em>
      </div>
    </div>
    <meta itemprop="dateModified" content="${modifiedDate}" />
  </article>
</body>
</html>`;
}

function generateHumanShell({ slug, post, assets }) {
  const title = escapeHtml(post.title || post.meta_title || "TechBlog AI Article");
  const desc = escapeHtml(post.excerpt || post.meta_description || "Tech insights on TechBlog AI");
  const img = post.featured_image || post.image || "https://aitechblogs.netlify.app/og-image.png";
  const author = escapeHtml(post.author || "TechBlog AI Team");
  const publishDate = post.created_at || post.published_at || new Date().toISOString();
  const modifiedDate = post.updated_at || publishDate;
  const category = escapeHtml(post.category || "Technology");
  const tags = Array.isArray(post.tags) ? post.tags : [];
  const readingTime = Math.ceil((post.word_count || 1000) / 200);
  const postUrl = `https://aitechblogs.netlify.app/post/${slug}`;
  
  const schemas = generateSchemas(post, postUrl);
  
  // Extract assets from manifest
  const entry = assets["index.html"];
  if (!entry) {
    console.error("[Edge] No index.html entry in manifest");
    return null;
  }
  
  const js = "/" + entry.file;
  const css = entry.css ? entry.css.map(c => `<link rel="stylesheet" href="/${c}">`).join("\n  ") : "";

  return `<!DOCTYPE html>
<html lang="en" prefix="og: https://ogp.me/ns# article: https://ogp.me/ns/article#">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="theme-color" content="#0f172a">
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  
  <title>${title} | TechBlog AI</title>
  <meta name="description" content="${desc}" />
  <meta name="author" content="${author}" />
  <meta name="keywords" content="${tags.map(t => escapeHtml(t)).join(', ')}" />
  
  <link rel="canonical" href="${postUrl}" />
  <link rel="icon" type="image/svg+xml" href="/favicon.ico" />
  
  <!-- Open Graph -->
  <meta property="og:type" content="article" />
  <meta property="og:url" content="${postUrl}" />
  <meta property="og:title" content="${title}" />
  <meta property="og:description" content="${desc}" />
  <meta property="og:image" content="${img}" />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />
  <meta property="og:site_name" content="TechBlog AI" />
  <meta property="article:published_time" content="${publishDate}" />
  <meta property="article:modified_time" content="${modifiedDate}" />
  <meta property="article:author" content="${author}" />
  
  <!-- Twitter -->
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${title}" />
  <meta name="twitter:description" content="${desc}" />
  <meta name="twitter:image" content="${img}" />
  <meta name="twitter:site" content="@AiTechBlogs" />
  
  <!-- Structured Data -->
  <script type="application/ld+json">${escapeJson(schemas.article)}</script>
  <script type="application/ld+json">${escapeJson(schemas.breadcrumb)}</script>
  
  <!-- Resource Hints -->
  <link rel="preload" href="${js}" as="script" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link rel="preconnect" href="https://techblogai-backend.onrender.com" />
  <link rel="dns-prefetch" href="https://techblogai-backend.onrender.com" />
  
  ${css}
  
  <!-- Critical CSS -->
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;line-height:1.6;color:#333;background:#fff;min-height:100vh}
    #root{max-width:800px;margin:0 auto;padding:20px}
    article{margin-top:20px}
    h1{color:#1a1a1a;font-size:2rem;margin-bottom:15px;line-height:1.2;font-weight:700}
    .meta{color:#666;font-size:.9em;margin:15px 0;padding-bottom:15px;border-bottom:1px solid #e5e7eb;display:flex;flex-wrap:wrap;gap:12px}
    .excerpt{color:#555;font-size:1.05rem;line-height:1.7;margin:20px 0}
    .loading{margin-top:30px;padding:20px;background:#f9fafb;border-radius:8px;color:#666;text-align:center}
    .spinner{display:inline-block;width:20px;height:20px;border:3px solid #e5e7eb;border-top-color:#3b82f6;border-radius:50%;animation:spin 1s linear infinite;margin-right:10px}
    @keyframes spin{to{transform:rotate(360deg)}}
    @media (max-width:640px){#root{padding:15px}h1{font-size:1.5rem}}
  </style>
</head>
<body>
  <div id="root">
    <article itemscope itemtype="https://schema.org/TechArticle">
      <h1 itemprop="headline">${title}</h1>
      <div class="meta">
        <span itemprop="author" itemscope itemtype="https://schema.org/Person">
          By <span itemprop="name">${author}</span>
        </span>
        <span>•</span>
        <span itemprop="articleSection">${category}</span>
        <span>•</span>
        <time itemprop="datePublished" datetime="${publishDate}">
          ${new Date(publishDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
        </time>
        <span>•</span>
        <span>${readingTime} min read</span>
      </div>
      <div class="excerpt" itemprop="description">${desc}</div>
      <div class="loading">
        <span class="spinner"></span>
        <span>Loading full article...</span>
      </div>
      <meta itemprop="dateModified" content="${modifiedDate}" />
      <meta itemprop="image" content="${img}" />
    </article>
  </div>
  <script type="module" src="${js}"></script>
</body>
</html>`;
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

export const config = {
  path: "/post/*",
  onError: "bypass"
};