const fetch = require("node-fetch");

exports.handler = async (event) => {
  try {
    const rawPath = event.rawPath || event.path || "";

    // Extract slug safely
    let slug = rawPath
      .replace("/.netlify/functions/ssr-meta", "")
      .replace(/^\/post\//, "")
      .replace(/\/$/, "");

    if (!slug) {
      return redirectHome();
    }

    // Detect bots (VERY IMPORTANT)
    const userAgent = event.headers["user-agent"] || "";
    const isBot = /facebook|twitter|whatsapp|linkedin|telegram|bot|crawler|spider/i.test(
      userAgent
    );

    // Fetch meta from backend
    const metaUrl = `https://techblogai-backend.onrender.com/api/posts/${slug}/meta`;
    const response = await fetch(metaUrl);

    if (!response.ok) {
      return errorHTML(slug);
    }

    const post = await response.json();

    const esc = (v = "") =>
      v.replace(/&/g, "&amp;")
       .replace(/</g, "&lt;")
       .replace(/>/g, "&gt;")
       .replace(/"/g, "&quot;");

    const postUrl =
      post.url || `https://aitechblogs.netlify.app/post/${slug}/`;

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "text/html",
        "Cache-Control": "public, max-age=3600",
      },
      body: `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>${esc(post.title)}</title>

<meta name="description" content="${esc(post.description || post.excerpt)}" />

<!-- Open Graph -->
<meta property="og:type" content="article" />
<meta property="og:title" content="${esc(post.title)}" />
<meta property="og:description" content="${esc(
        post.og_description || post.excerpt
      )}" />
<meta property="og:image" content="${post.featured_image || post.image}" />
<meta property="og:url" content="${postUrl}" />

<!-- Twitter -->
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="${esc(post.title)}" />
<meta name="twitter:description" content="${esc(
        post.twitter_description || post.excerpt
      )}" />
<meta name="twitter:image" content="${post.featured_image || post.image}" />

${
  // 🚨 Redirect ONLY humans
  isBot
    ? ""
    : `<meta http-equiv="refresh" content="0;url=${postUrl}" />`
}
</head>

<body>
  <h1>${esc(post.title)}</h1>
  <p>${esc(post.excerpt)}</p>
  <a href="${postUrl}">Read more</a>
</body>
</html>`,
    };
  } catch (err) {
    console.error("SSR ERROR:", err);
    return errorHTML();
  }
};

function redirectHome() {
  return {
    statusCode: 302,
    headers: { Location: "https://aitechblogs.netlify.app" },
  };
}

function errorHTML(slug = "") {
  return {
    statusCode: 200,
    headers: { "Content-Type": "text/html" },
    body: `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<title>TechBlog AI</title>
<meta property="og:title" content="TechBlog AI Article" />
<meta property="og:description" content="Read this article on TechBlog AI" />
<meta property="og:image" content="https://aitechblogs.netlify.app/og-image.png" />
</head>
<body>
<a href="https://aitechblogs.netlify.app/post/${slug}">Read article</a>
</body>
</html>`,
  };
}
