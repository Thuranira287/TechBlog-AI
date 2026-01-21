/* ================= SSR META FUNCTION FOR NETLIFY ================= */

const fs = require("fs");
const path = require("path");

/* ================= ENTRY POINT ================= */
module.exports.handler = async (event) => {
  const fetch = (await import("node-fetch")).default;

  const rawPath = event.rawPath || event.path || "";
  const slug = extractSlug(rawPath, event.queryStringParameters);

  const userAgent = event.headers["user-agent"] || "";
  const isBot = detectBot(userAgent);

  try {
    if (isBot) {
      // Bot requested a post -> fetch metadata
      const post = await fetchPostMeta(slug, fetch);
      const postUrl = `https://aitechblogs.netlify.app/post/${slug}`;

      if (!post) return botFallbackHTML(slug);
      return botResponse(post, postUrl);
    } else {
      // Human requested a post -> serve SPA index.html
      return humanSPAResponse();
    }
  } catch (err) {
    console.error("SSR Error:", err);
    return humanSPAResponse();
  }
};

/* ================= HELPERS ================= */

function extractSlug(rawPath, queryParams) {
  let slug = rawPath.replace(/^\/post\//, "").replace(/\/$/, "");
  if (queryParams?.path) {
    slug = queryParams.path.replace(/^\/post\//, "").replace(/\/$/, "");
  }
  return slug;
}

function detectBot(userAgent = "") {
  const bots = [
    // Search Engines
    'googlebot', 'bingbot', 'slurp', 'duckduckbot', 'yandexbot', 'baiduspider',
    'sogou', 'exabot', 'facebot', 'facebookexternalhit',
    
    // Social Media
    'twitterbot', 'linkedinbot', 'whatsapp', 'telegram', 'slackbot', 'discordbot',
    'skypeuripreview', 'slack-imgproxy',
    
    // AI Models
    'chatgpt', 'openai', 'claude', 'anthropic', 'perplexity', 'youbot', 'cohere',
    'huggingface', 'midjourney', 'stablediffusion', 'dall-e', 'gptbot', 'ccbot',
    
    // Other Bots
    'applebot', 'amazonbot', 'semrush', 'ahrefs', 'mj12bot', 'uptimerobot',
    'siteauditbot', 'bytespider', 'dataforseo',
    
    // Generic
    'bot', 'crawler', 'spider', 'scraper', 'checker', 'monitor', 'fetch',
    'request', 'scan', 'agent', 'collector', 'gatherer', 'extractor'
  ];

  const ua = userAgent.toLowerCase();
  return bots.some(b => ua.includes(b));
}

async function fetchPostMeta(slug, fetch) {
  if (!slug) return null;

  const url = `https://techblogai-backend.onrender.com/api/posts/${slug}/meta`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);

  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "TechBlogAI-Bot-SSR/1.0",
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
      "Vary": "User-Agent",
      "X-Robots-Tag": "index, follow"
    },
    body: generateBotHtml(post, postUrl)
  };
}

function botFallbackHTML(slug) {
  const url = `https://aitechblogs.netlify.app/post/${slug}`;
  return {
    statusCode: 200,
    headers: {
      "Content-Type": "text/html",
      "Vary": "User-Agent",
      "X-Robots-Tag": "noindex"
    },
    body: `<!DOCTYPE html>
<html>
<head>
<meta property="og:title" content="TechBlog AI Article" />
<meta property="og:url" content="${url}" />
<link rel="canonical" href="${url}" />
</head>
<body></body>
</html>`
  };
}

/* ================= HUMAN SPA ================= */

function humanSPAResponse() {
  // Netlify build output path
  const indexPath = path.join(__dirname, "../../client/dist/index.html");
  // C:\Users\alexa\Desktop\React\Ads\client\dist\index.html

  let html;
  try {
    html = fs.readFileSync(indexPath, "utf-8");
  } catch (err) {
    console.error("Human SPA index.html missing", err);
    return {
      statusCode: 302,
      headers: { Location: "https://aitechblogs.netlify.app/" }
    };
  }

  return {
    statusCode: 200,
    headers: {
      "Content-Type": "text/html",
      "Cache-Control": "public, max-age=3600",
      "Vary": "User-Agent"
    },
    body: html
  };
}
