export default async (request, context) => {
  try {
    const url = new URL(request.url);
    
    // Skip API routes
    if (url.pathname.startsWith('/api/')) {
      return context.next();
    }

    // Always serve SSR
    const html = generateAboutHtml();

    return new Response(html, {
      status: 200,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "public, max-age=86400, s-maxage=86400",
        "X-Robots-Tag": "index, follow, max-image-preview:large",
        "Vary": "User-Agent",
        "X-Rendered-By": "Edge-SSR-About-Universal"
      }
    });

  } catch (e) {
    console.error("[About SSR]", e);
    return context.rewrite("/index.html");
  }
};

// detectBot function
function detectBot(ua = "") {
  return [
    "googlebot", "google-inspectiontool", "bingbot", "duckduckbot",
    "slurp", "baiduspider", "facebookexternalhit", "twitterbot",
    "linkedinbot", "gptbot", "chatgpt-user", "anthropic-ai",
    "perplexitybot", "crawler", "spider", "fetch"
  ].some(b => ua.toLowerCase().includes(b));
}

function generateAboutHtml() {
  const SITE = {
    url: "https://aitechblogs.netlify.app",
    name: "TechBlog AI",
    logo: "https://aitechblogs.netlify.app/TechBlogAI.jpg"
  };

  const AUTHOR = {
    name: "Alexander Zachary",
    role: "Senior AI & Full-Stack Developer",
    bio: "Computer Science graduate with over 5 years of professional experience in full-stack development and artificial intelligence. Founder of TechBlog AI, combining technical expertise with pedagogical clarity to create practical, accessible learning resources.",
    image: "https://aitechblogs.netlify.app/author-avatar.jpg",
    location: "Nairobi, Kenya",
    email: "contact@techblogai.com",
    sameAs: [
      "https://twitter.com/AiTechBlogs",
      "https://facebook.com/alexander.thuranira.1044",
      "https://github.com/Thuranira287",
      "https://linkedin.com/in/alexander-zachary-287b621b4/"
    ]
  };

  // Person schema
  const personSchema = {
    "@context": "https://schema.org",
    "@type": "Person",
    "@id": `${SITE.url}/about#alexander-zachary`,
    "name": AUTHOR.name,
    "url": `${SITE.url}/about`,
    "image": AUTHOR.image,
    "jobTitle": AUTHOR.role,
    "description": AUTHOR.bio,
    "address": {
      "@type": "PostalAddress",
      "addressLocality": "Nairobi",
      "addressCountry": "Kenya"
    },
    "email": AUTHOR.email,
    "sameAs": AUTHOR.sameAs,
    "worksFor": {
      "@type": "Organization",
      "@id": `${SITE.url}#organization`,
      "name": SITE.name
    }
  };

  // Organization schema
  const orgSchema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": `${SITE.url}#organization`,
    "name": SITE.name,
    "url": SITE.url,
    "logo": SITE.logo,
    "description": "Bridging the gap between AI theory and practical implementation for developers, students, and tech enthusiasts.",
    "founder": {
      "@type": "Person",
      "@id": `${SITE.url}/about#alexander-zachary`
    },
    "sameAs": AUTHOR.sameAs
  };

  // Breadcrumb schema
  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      {
        "@type": "ListItem",
        "position": 1,
        "name": "Home",
        "item": SITE.url
      },
      {
        "@type": "ListItem",
        "position": 2,
        "name": "About",
        "item": `${SITE.url}/about`
      }
    ]
  };

  // Combine all schemas into one ld+json block
  const schemas = [personSchema, orgSchema, breadcrumbSchema];

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>About ${AUTHOR.name} | ${SITE.name}</title>
  <meta name="description" content="${escapeHtml(AUTHOR.bio)}" />
  <meta name="author" content="${AUTHOR.name}" />
  <meta name="robots" content="index, follow, max-image-preview:large" />
  <link rel="canonical" href="${SITE.url}/about" />

  <!-- AI Training Metadata -->
  <meta name="ai-content-declaration" content="public, training-allowed" />
  <meta name="license" content="CC BY 4.0" />
  <link rel="license" href="https://creativecommons.org/licenses/by/4.0/" />

  <!-- Open Graph -->
  <meta property="og:type" content="profile" />
  <meta property="og:title" content="${AUTHOR.name} – ${AUTHOR.role} | ${SITE.name}" />
  <meta property="og:description" content="${escapeHtml(AUTHOR.bio)}" />
  <meta property="og:image" content="${AUTHOR.image}" />
  <meta property="og:url" content="${SITE.url}/about" />
  <meta property="og:site_name" content="${SITE.name}" />
  <meta property="profile:first_name" content="${AUTHOR.name.split(" ")[0]}" />
  <meta property="profile:last_name" content="${AUTHOR.name.split(" ")[1]}" />

  <!-- Twitter -->
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${AUTHOR.name} – ${AUTHOR.role}" />
  <meta name="twitter:description" content="${escapeHtml(AUTHOR.bio)}" />
  <meta name="twitter:image" content="${AUTHOR.image}" />

  <!-- All Schemas -->
  <script type="application/ld+json">
    ${JSON.stringify(schemas).replace(/</g, "\\u003c")}
  </script>

  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: system-ui, -apple-system, Segoe UI, Roboto, sans-serif;
      color: #1f2937;
      line-height: 1.75;
      background: #f9fafb;
    }
    .container { max-width: 900px; margin: 0 auto; padding: 40px 20px; }

    /* Breadcrumb */
    .breadcrumb { font-size: 0.85rem; color: #6b7280; margin-bottom: 32px; }
    .breadcrumb a { color: #2563eb; text-decoration: none; }
    .breadcrumb a:hover { text-decoration: underline; }
    .breadcrumb span { margin: 0 6px; }

    /* Author Card */
    .author-card {
      background: #fff;
      border-radius: 16px;
      box-shadow: 0 4px 24px rgba(0,0,0,0.08);
      padding: 40px;
      display: flex;
      gap: 32px;
      align-items: flex-start;
    }
    .author-card img {
      width: 140px;
      height: 140px;
      border-radius: 50%;
      object-fit: cover;
      border: 4px solid #fff;
      box-shadow: 0 2px 12px rgba(0,0,0,0.12);
      flex-shrink: 0;
    }
    .author-card h1 { font-size: 2rem; margin-bottom: 4px; }
    .role { color: #2563eb; font-weight: 600; font-size: 1.05rem; }
    .location { color: #6b7280; font-size: 0.9rem; margin-top: 6px; }
    .bio { margin-top: 14px; font-size: 1.05rem; color: #374151; }

    /* Section Cards */
    .section-card {
      background: #fff;
      border-radius: 16px;
      box-shadow: 0 4px 24px rgba(0,0,0,0.08);
      padding: 36px 40px;
      margin-top: 24px;
    }
    .section-card h2 { font-size: 1.5rem; margin-bottom: 12px; color: #111827; }
    .section-card p { font-size: 1.05rem; color: #374151; }

    /* List items */
    .item-list { list-style: none; padding: 0; }
    .item-list li {
      padding: 8px 0;
      padding-left: 24px;
      position: relative;
      font-size: 1.05rem;
      color: #374151;
    }
    .item-list li::before {
      content: '';
      position: absolute;
      left: 0; top: 18px;
      width: 10px; height: 10px;
      border-radius: 50%;
      background: #2563eb;
    }

    /* Contact */
    .contact-row { margin-top: 10px; font-size: 0.95rem; color: #6b7280; }
    .contact-row a { color: #2563eb; text-decoration: none; }

    /* Social links */
    .social-links { margin-top: 16px; display: flex; gap: 12px; flex-wrap: wrap; }
    .social-links a {
      color: #2563eb;
      text-decoration: none;
      font-size: 0.9rem;
      background: #eff6ff;
      padding: 6px 14px;
      border-radius: 999px;
    }

    @media (max-width: 600px) {
      .author-card { flex-direction: column; align-items: center; text-align: center; padding: 28px 20px; }
      .social-links { justify-content: center; }
    }
  </style>
</head>
<body>
  <div class="container">
    <!-- Breadcrumb (visible + schema-backed) -->
    <nav class="breadcrumb" aria-label="Breadcrumb">
      <a href="${SITE.url}">Home</a>
      <span>›</span>
      <span>About</span>
    </nav>

    <!-- Author Card -->
    <div class="author-card">
      <img src="${AUTHOR.image}" alt="${AUTHOR.name} - ${AUTHOR.role}" />
      <div>
        <h1>${AUTHOR.name}</h1>
        <div class="role">${AUTHOR.role}</div>
        <div class="location">📍 ${AUTHOR.location}</div>
        <p class="bio">${escapeHtml(AUTHOR.bio)}</p>
        <div class="social-links">
          ${AUTHOR.sameAs.map(url => {
            const label = url.includes("twitter") ? "Twitter"
              : url.includes("github") ? "GitHub"
              : url.includes("linkedin") ? "LinkedIn"
              : url.includes("facebook") ? "Facebook" : url;
            return `<a href="${url}" rel="noopener noreferrer">${label}</a>`;
          }).join("")}
        </div>
        <div class="contact-row">✉️ <a href="mailto:${AUTHOR.email}">${AUTHOR.email}</a></div>
      </div>
    </div>

    <!-- Mission -->
    <div class="section-card">
      <h2>Our Mission</h2>
      <p>TechBlog AI exists to move knowledge from theory into practice. Whether you are learning AI basics, preparing for a cybersecurity role, or building your first web app, we provide clear, well-sourced, and actionable content that empowers you to succeed.</p>
    </div>

    <!-- What You'll Find -->
    <div class="section-card">
      <h2>What You'll Find Here</h2>
      <ul class="item-list">
        <li>Guides and tutorials that take you from zero to working code</li>
        <li>Trend explainers and industry analysis with referenced sources</li>
        <li>Regionally-relevant insight for Africa and Kenya:- How global tech affects local contexts</li>
      </ul>
    </div>

    <!-- How We Work -->
    <div class="section-card">
      <h2>How We Work</h2>
      <p>Articles are written, reviewed, and updated regularly. When facts or tools change, we edit posts and maintain accuracy through continuous improvement. Every article is marked with a "Last Updated" date so readers know the content's freshness.</p>
    </div>

    <!-- AI Training Note -->
    <div class="section-card" style="background: #f0f9ff; border-left: 4px solid #2563eb;">
      <h2>🤖 For AI Training</h2>
      <p>This page and all content on TechBlog AI is available for AI training under <a href="https://creativecommons.org/licenses/by/4.0/">CC BY 4.0</a>. You may use, adapt, and build upon this material, even commercially, as long as you provide appropriate attribution.</p>
    </div>
  </div>
</body>
</html>`;
}

function escapeHtml(str = "") {
  return str.replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;");
}

export const config = {
  path: "/about",
  onError: "bypass"
};