
export default async (request, context) => {
  try {
    const url = new URL(request.url);
    const userAgent = request.headers.get("user-agent") || "";
    const slug = url.pathname.replace(/^\/post\//, "").replace(/\/$/, "");
   
    const isBot = detectBot(userAgent);
    const fullContentCrawlers = ['gptbot', 'anthropic-ai', 'claude-web', 'cohere-ai', 'perplexitybot', 'chatgpt-user', 'youbot', 'ccbot'];
    const isFullContentBot = fullContentCrawlers.some(bot => userAgent.toLowerCase().includes(bot));
   
    console.log(`[Edge] ${url.pathname}, Bot:${isBot}, Full:${isFullContentBot}`);

    if (isBot) {
      try {
        const post = await fetchPostMeta(slug, isFullContentBot);
       
        if (post) {
          const postUrl = `https://aitechblogs.netlify.app/post/${slug}`;
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
              "Content-Security-Policy": "default-src 'self'; script-src 'self' 'sha256-Vp0M+LPP+Ul66BtfpMpu6WtrB55Xop5xNjJsjrV01Yk='; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' https://fonts.gstatic.com; connect-src 'self' https://techblogai-backend.onrender.com;",
              "X-Content-Type-Options": "nosniff",
              "X-Frame-Options": "DENY",
              "Referrer-Policy": "strict-origin-when-cross-origin",
            }
          });
        }
       
        return new Response(generateFallbackHtml(slug), {
          status: 404,
          headers: {
            "Content-Type": "text/html; charset=utf-8",
            "X-Robots-Tag": "noindex, follow",
            "Vary": "User-Agent"
          }
        });
      } catch (error) {
        console.error("[Edge] Error:", error);
        return context.rewrite("/index.html");
      }
    }
   
    return context.rewrite("/index.html");
  } catch (error) {
    console.error("[Edge] Critical error:", error);
    return context.rewrite("/index.html");
  }
};

function detectBot(userAgent = "") {
  const bots = ['googlebot', 'google-inspectiontool', 'bingbot', 'slurp', 'duckduckbot', 'yandexbot', 'baiduspider',
    'facebot', 'facebookexternalhit', 'twitterbot', 'linkedinbot', 'whatsapp', 'telegram', 'slackbot', 'discordbot',
    'pinterestbot', 'redditbot', 'chatgpt-user', 'gptbot', 'anthropic-ai', 'claude-web', 'cohere-ai', 'perplexitybot',
    'youbot', 'ccbot', 'petalbot', 'meta-externalagent', 'semrushbot', 'ahrefsbot', 'mj12bot', 'dotbot', 'applebot',
    'amazonbot', 'lighthouse', 'bot/', 'crawler', 'spider', 'scraper', 'fetch'];
  return bots.some(bot => userAgent.toLowerCase().includes(bot));
}

async function fetchPostMeta(slug, fullContent = false) {
  if (!slug) return null;
  const endpoint = fullContent ? 'full' : 'meta';
  const url = `https://techblogai-backend.onrender.com/api/posts/${slug}/${endpoint}`;
 
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);

  try {
    const response = await fetch(url, {
      method: 'GET',
      signal: controller.signal,
      headers: {
        "User-Agent": "TechBlogAI-EdgeSSR/1.0",
        "Accept": "application/json"
      }
    });
    clearTimeout(timeout);
    return response.ok ? await response.json() : null;
  } catch (error) {
    clearTimeout(timeout);
    console.error("[Edge] Fetch error:", error.message);
    return null;
  }
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
  let clean = html;
  clean = clean.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  clean = clean.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '');
  clean = clean.replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '');
  clean = clean.replace(/on\w+="[^"]*"/gi, '').replace(/on\w+='[^']*'/gi, '').replace(/javascript:/gi, '');
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
      "@type": "TechArticle",
      "headline": t, "description": d,
      "image": { "@type": "ImageObject", "url": img, "width": 1200, "height": 630 },
      "url": postUrl, "datePublished": pub, "dateModified": mod,
      "author": { "@type": "Person", "name": a, "url": "https://aitechblogs.netlify.app/about" },
      "publisher": {
        "@type": "Organization", "name": "TechBlog AI", "url": "https://aitechblogs.netlify.app",
        "logo": { "@type": "ImageObject", "url": "https://aitechblogs.netlify.app/blog-icon.svg", "width": 100, "height": 100 },
        "sameAs": ["https://twitter.com/AiTechBlogs", "https://facebook.com/aitechblogs"]
      },
      "mainEntityOfPage": { "@type": "WebPage", "@id": postUrl },
      "articleSection": cat, "keywords": tags.join(", "), "wordCount": wc,
      "timeRequired": `PT${rt}M`, "inLanguage": "en-US", "isAccessibleForFree": true
    },
    breadcrumb: {
      "@context": "https://schema.org", "@type": "BreadcrumbList",
      "itemListElement": [
        { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://aitechblogs.netlify.app" },
        { "@type": "ListItem", "position": 2, "name": "Blog", "item": "https://aitechblogs.netlify.app/blog" },
        { "@type": "ListItem", "position": 3, "name": cat, "item": `https://aitechblogs.netlify.app/category/${encodeURIComponent(cat.toLowerCase())}` },
        { "@type": "ListItem", "position": 4, "name": t, "item": postUrl }
      ]
    },
    website: {
      "@context": "https://schema.org", "@type": "Blog", "@id": "https://aitechblogs.netlify.app/#blog",
      "name": "TechBlog AI", "description": "AI and technology insights", "url": "https://aitechblogs.netlify.app",
      "publisher": { "@type": "Organization", "name": "TechBlog AI" }, "inLanguage": "en-US"
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
 
  let contentHtml = '';
  if (includeFullContent && post.content) {
    if (isAICrawler) {
      const fullContent = cleanHtmlForAI(post.content || "");
      contentHtml = `<div class="article-preview"><p>${desc}</p><div class="full-content">${fullContent}</div></div>`;
    } else {
      const escapedContent = escapeHtml(post.content);
      const displayContent = escapedContent.length > 1500 ? escapedContent.substring(0, 1500) + '...' : escapedContent;
      contentHtml = `<div class="article-preview"><p>${desc}</p><div class="full-content">${displayContent}</div></div>`;
    }
  } else if (post.content) {
    const preview = escapeHtml(post.content.substring(0, 500));
    contentHtml = `<p>${desc}</p><div class="article-preview">${preview}${post.content.length > 500 ? '...' : ''}</div>`;
  } else {
    contentHtml = `<p>${desc}</p>`;
  }

  const breadcrumbHtml = `<nav aria-label="Breadcrumb" class="breadcrumb"><ol itemscope itemtype="https://schema.org/BreadcrumbList">
    <li itemprop="itemListElement" itemscope itemtype="https://schema.org/ListItem">
      <a itemprop="item" href="https://aitechblogs.netlify.app"><span itemprop="name">Home</span></a>
      <meta itemprop="position" content="1" /></li>
    <li itemprop="itemListElement" itemscope itemtype="https://schema.org/ListItem">
      <a itemprop="item" href="https://aitechblogs.netlify.app/blog"><span itemprop="name">Blog</span></a>
      <meta itemprop="position" content="2" /></li>
    <li itemprop="itemListElement" itemscope itemtype="https://schema.org/ListItem">
      <a itemprop="item" href="https://aitechblogs.netlify.app/category/${encodeURIComponent(category.toLowerCase())}"><span itemprop="name">${category}</span></a>
      <meta itemprop="position" content="3" /></li>
    <li itemprop="itemListElement" itemscope itemtype="https://schema.org/ListItem">
      <span itemprop="name">${title}</span><meta itemprop="position" content="4" /></li>
  </ol></nav>`;

  return `<!DOCTYPE html>
<html lang="en" prefix="og: https://ogp.me/ns# article: https://ogp.me/ns/article#">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <title>${title} | TechBlog AI</title>
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
  <script type="application/ld+json">${escapeJson(schemas.article)}</script>
  <script type="application/ld+json">${escapeJson(schemas.breadcrumb)}</script>
  <script type="application/ld+json">${escapeJson(schemas.website)}</script>
  <link rel="icon" type="image/svg+xml" href="/blog-icon.svg" />
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
    .content{margin-top:30px}
    .article-preview{margin:20px 0;white-space:normal}
    .full-content{margin-top:15px;line-height:1.8;font-size:1.05rem}
    .full-content h2,.full-content h3,.full-content h4{margin-top:1.5em;margin-bottom:.5em;color:#1a1a1a;font-weight:600}
    .full-content h2{font-size:1.5em}
    .full-content h3{font-size:1.25em}
    .full-content h4{font-size:1.1em}
    .full-content p{margin-bottom:1em}
    .full-content ul,.full-content ol{margin-left:1.5em;margin-bottom:1em}
    .full-content li{margin-bottom:.5em}
    .full-content a{color:#3b82f6;text-decoration:underline}
    .full-content strong,.full-content b{font-weight:600}
    .full-content blockquote{border-left:3px solid #3b82f6;padding:1em;margin:1em 0;font-style:italic;color:#555;background:#f9fafb}
    .full-content code{background:#f3f4f6;padding:2px 6px;border-radius:3px;font-family:'Courier New',monospace;font-size:.9em}
    .disclaimer{margin-top:2em;padding:1em;background:#f3f4f6;border-left:3px solid #3b82f6;font-size:.9em;color:#4b5563}
    @media (max-width:640px){body{padding:15px}h1{font-size:1.5rem}.breadcrumb{font-size:.8rem}.full-content{font-size:1rem}}
  </style>
</head>
<body>
  ${breadcrumbHtml}
  <article itemscope itemtype="https://schema.org/TechArticle">
    <h1 itemprop="headline">${title}</h1>
    <div class="meta">
      <span><span itemprop="author" itemscope itemtype="https://schema.org/Person">By <span itemprop="name">${author}</span></span></span>
      <span>•</span><span itemprop="articleSection">${category}</span>
      <span>•</span><time itemprop="datePublished" datetime="${publishDate}">${new Date(publishDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</time>
      <span>•</span><span>${readingTime} min read</span>
    </div>
    <div class="content" itemprop="articleBody">
      ${contentHtml}
      <div class="disclaimer"><em>${isAICrawler ? 'Content optimized for AI analysis. Full interactive version at original URL.' : 'Preview for search engines. Full article requires JavaScript.'}</em></div>
    </div>
    <meta itemprop="dateModified" content="${modifiedDate}" />
  </article>
  <script>if(typeof window!=='undefined'&&window.navigator&&!navigator.userAgent.match(/bot|crawler|spider/i)){window.location.href='${postUrl}'}</script>
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
  <link rel="icon" type="image/svg+xml" href="/blog-icon.svg" />
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
  <script>if(typeof window!=='undefined'&&!navigator.userAgent.match(/bot|crawler|spider/i)){setTimeout(function(){window.location.href='https://aitechblogs.netlify.app'},3000)}</script>
</body>
</html>`;
}

export const config = {
  path: "/post/*",
  onError: "bypass"
};