// ssr-meta.cjs
module.exports.handler = async (event) => {
  const rawPath = event.rawPath || event.path || "";
  const slug = extractSlug(rawPath, event.queryStringParameters);

  const userAgent = event.headers["user-agent"] || "";
  const isBot = detectBot(userAgent);

  try {
    if (isBot) {
      const post = await fetchPostMeta(slug);
      const postUrl = `https://aitechblogs.netlify.app/post/${slug}`;

      // BOT fallback ONLY
      if (!post) {
        return botFallbackHTML(slug);
      }

      return botResponse(post, postUrl);
    }

    // HUMANS ALWAYS GET SPA
    return humanResponse();

  } catch (error) {
    console.error("SSR fatal error:", error);

    // NEVER return error HTML to humans
    return humanResponse();
  }
};

/* ================= HELPERS ================= */

function extractSlug(rawPath, queryParams) {
  let slug = rawPath
    .replace("/.netlify/functions/ssr-meta", "")
    .replace(/^\/post\//, "")
    .replace(/\/$/, "");

  if (queryParams?.path) {
    slug = queryParams.path.replace(/^\/post\//, "").replace(/\/$/, "");
  }

  return slug;
}

function detectBot(userAgent) {
  const bots = [
    "facebook", "twitter", "whatsapp", "linkedin", "telegram",
    "bot", "crawler", "spider", "facebookexternalhit",
    "googlebot", "bingbot", "slackbot", "discordbot",
    "duckduckbot", "baiduspider", "yandexbot", "screaming frog"
  ];

  return bots.some(b => userAgent.toLowerCase().includes(b));
}

async function fetchPostMeta(slug) {
  if (!slug) return null;

  const url = `https://techblogai-backend.onrender.com/api/posts/${slug}/meta`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);

  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "TechBlogAI-SSR/1.0",
        "Accept": "application/json"
      }
    });

    clearTimeout(timeout);
    if (!res.ok) return null;

    return await res.json();
  } catch {
    clearTimeout(timeout);
    return null;
  }
}

/* ================= BOT HTML ================= */

function escapeHtml(text = "") {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function generateBotHtml(post, postUrl) {
  const title = escapeHtml(post.title || post.meta_title || "TechBlog AI Article");
  const desc = escapeHtml(post.excerpt || post.meta_description || "");
  const img = post.featured_image || "https://aitechblogs.netlify.app/og-image.png";

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>${title}</title>
<meta name="description" content="${desc}" />

<meta property="og:type" content="article" />
<meta property="og:title" content="${title}" />
<meta property="og:description" content="${desc}" />
<meta property="og:image" content="${img}" />
<meta property="og:url" content="${postUrl}" />

<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="${title}" />
<meta name="twitter:description" content="${desc}" />
<meta name="twitter:image" content="${img}" />

<link rel="canonical" href="${postUrl}" />
</head>
<body></body>
</html>`;
}

function botResponse(post, postUrl) {
  return {
    statusCode: 200,
    headers: {
      "Content-Type": "text/html",
      "Cache-Control": "public, max-age=3600, s-maxage=7200",
      "X-Robots-Tag": "index, follow"
    },
    body: generateBotHtml(post, postUrl)
  };
}

function botFallbackHTML(slug) {
  const url = `https://aitechblogs.netlify.app/post/${slug}`;
  return {
    statusCode: 200,
    headers: { "Content-Type": "text/html" },
    body: `<html><head>
      <meta property="og:title" content="TechBlog AI Article" />
      <meta property="og:url" content="${url}" />
    </head><body></body></html>`
  };
}

/* ================= HUMAN SPA ================= */

function humanResponse() {
  return {
    statusCode: 200,
    headers: {
      "Content-Type": "text/html",
      "Cache-Control": "public, max-age=3600"
    },
    body: `
<!DOCTYPE html>
<html>
  <head>
    <meta http-equiv="refresh" content="0; url=/index.html" />
  </head>
</html>`
  };
}


