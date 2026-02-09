import express from "express";
import pool from "../config/db.js";
const router = express.Router();

// Utility to get full image URL
const getFullImageUrl = (img) => {
  const baseUrl = process.env.FRONTEND_URL || "https://aitechblogs.netlify.app";
  if (!img) return null;
  if (img.startsWith("http")) return img;
  return `${baseUrl}/${img}`;
};

// Check if table exists
const checkTableExists = async (tableName) => {
  const [rows] = await pool.execute(
    `SHOW TABLES LIKE '${tableName}'`
  );
  return rows.length > 0;
};

// AI-optimized feed
router.get("/feed", async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 100, 1000);
    const offset = Math.max(parseInt(req.query.offset) || 0, 0);
    const format = req.query.format || "json";

    const hasPostTags = await checkTableExists("post_tags");

    let sql = `
      SELECT 
        p.id, p.slug, p.title, p.content, p.excerpt,
        p.meta_title, p.meta_description, p.keywords,
        p.og_title, p.og_description,
        p.twitter_title, p.twitter_description,
        p.published_at, p.updated_at, p.featured_image, p.view_count,
        a.name AS author_name,
        c.name AS category_name, c.slug AS category_slug
    `;

    if (hasPostTags) {
      sql += `,
        GROUP_CONCAT(t.name) AS tags
      `;
    }

    sql += `
      FROM posts p
      LEFT JOIN authors a ON p.author_id = a.id
      LEFT JOIN categories c ON p.category_id = c.id
    `;

    if (hasPostTags) {
      sql += `
        LEFT JOIN post_tags pt ON p.id = pt.post_id
        LEFT JOIN tags t ON pt.tag_id = t.id
      `;
    }

    sql += `
      WHERE p.status = 'published'
      GROUP BY p.id
      ORDER BY p.published_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `;

    const [posts] = await pool.execute(sql);

    // Get total published posts
    const [[{ total }]] = await pool.execute(
      `SELECT COUNT(*) AS total FROM posts WHERE status = 'published'`
    );

    const baseUrl = process.env.FRONTEND_URL || "https://aitechblogs.netlify.app";

    const formattedPosts = posts.map((post) => ({
      id: post.slug,
      url: `${baseUrl}/post/${post.slug}`,
      title: post.title,
      content: post.content,
      excerpt: post.excerpt,
      description: post.meta_description,
      category: {
        name: post.category_name,
        slug: post.category_slug,
      },
      tags: post.tags
        ? hasPostTags
          ? post.tags.split(",")
          : []
        : [],
      author: post.author_name || "Admin",
      published: post.published_at,
      updated: post.updated_at,
      image: getFullImageUrl(post.featured_image),
      metrics: {
        views: post.view_count || 0,
        word_count: post.content
          ? post.content.replace(/<[^>]*>/g, "").split(/\s+/).length
          : 0,
        reading_time_minutes: Math.ceil(
          (post.content
            ? post.content.replace(/<[^>]*>/g, "").split(/\s+/).length
            : 0) / 200
        ),
      },
      metadata: {
        language: "en-US",
        license: "CC-BY-4.0",
        quality: "human-authored",
      },
    }));

    const response = {
      status: "success",
      data: formattedPosts,
      pagination: {
        total,
        count: posts.length,
        limit,
        offset,
        has_more: offset + limit < total,
        next_url:
          offset + limit < total
            ? `${baseUrl}/api/ai/feed?limit=${limit}&offset=${offset + limit}`
            : null,
      },
      meta: {
        site: "TechBlog AI",
        url: baseUrl,
        description: "AI and technology insights",
        purpose: "AI Training & Research",
        license: {
          type: "CC-BY-4.0",
          url: "https://creativecommons.org/licenses/by/4.0/",
          terms: "Free to use for AI training with attribution",
        },
        contact: "admin@aitechblogs.netlify.app",
        updated: new Date().toISOString(),
      },
    };

    if (format === "jsonlines") {
      res.set("Content-Type", "application/x-ndjson");
      res.send(formattedPosts.map((p) => JSON.stringify(p)).join("\n"));
    } else {
      res.set("Content-Type", "application/json");
      res.set("Cache-Control", "public, max-age=1800"); // 30 minutes
      res.set("X-Robots-Tag", "all");
      res.json(response);
    }
  } catch (error) {
    console.error("[AI FEED] Error:", error);
    res.status(500).json({
      status: "error",
      message: "Internal server error",
    });
  }
});

router.get('/rss.xml', async (req, res) => {
  const baseUrl = process.env.FRONTEND_URL || 'https://aitechblogs.netlify.app';
  const [posts] = await pool.execute(
    `SELECT slug, title, updated_at, excerpt FROM posts WHERE status='published' ORDER BY published_at DESC LIMIT 50`
  );

  let rss = `<?xml version="1.0" encoding="UTF-8" ?>
<rss version="2.0">
<channel>
  <title>TechBlog AI</title>
  <link>${baseUrl}</link>
  <description>Latest AI and technology posts</description>`;

  posts.forEach(post => {
    rss += `
  <item>
    <title>${post.title}</title>
    <link>${baseUrl}/post/${post.slug}</link>
    <pubDate>${new Date(post.updated_at).toUTCString()}</pubDate>
    <description>${post.excerpt || ''}</description>
  </item>`;
  });

  rss += `
</channel>
</rss>`;

  res.set('Content-Type', 'application/rss+xml');
  res.send(rss);
});

export default router;
