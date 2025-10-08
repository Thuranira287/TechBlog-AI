import express from "express";
import pool from "../config/db.js";

const router = express.Router();

/**
 * ✅ GET all published posts with pagination, category, and search
 */
router.get("/", async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    const category = req.query.category;
    const search = req.query.search;

    let query = `
      SELECT p.*, a.name AS author_name, c.name AS category_name, c.slug AS category_slug
      FROM posts p
      LEFT JOIN authors a ON p.author_id = a.id
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.status = 'published'
    `;
    let countQuery = `
      SELECT COUNT(*) AS total
      FROM posts p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.status = 'published'
    `;

    const params = [];
    const countParams = [];

    if (category) {
      query += ` AND c.slug = ?`;
      countQuery += ` AND c.slug = ?`;
      params.push(category);
      countParams.push(category);
    }

    if (search) {
      query += `
        AND (MATCH(p.title, p.content, p.excerpt) AGAINST(? IN NATURAL LANGUAGE MODE)
        OR p.title LIKE ? OR p.content LIKE ?)
      `;
      countQuery += `
        AND (MATCH(p.title, p.content, p.excerpt) AGAINST(? IN NATURAL LANGUAGE MODE)
        OR p.title LIKE ? OR p.content LIKE ?)
      `;
      const searchTerm = `%${search}%`;
      params.push(search, searchTerm, searchTerm);
      countParams.push(search, searchTerm, searchTerm);
    }

    query += ` ORDER BY p.published_at DESC LIMIT ? OFFSET ?`;
    params.push(limit, offset);

    const [posts] = await pool.execute(query, params);
    const [countResult] = await pool.execute(countQuery, countParams);

    const total = countResult[0].total;
    const totalPages = Math.ceil(total / limit);

    res.json({
      posts,
      pagination: {
        current: page,
        totalPages,
        totalPosts: total,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    });
  } catch (error) {
    console.error("❌ Error fetching posts:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * ✅ GET posts by category
 * ⚠️ Placed BEFORE '/:slug' route to avoid conflict
 */
router.get("/category/:categorySlug", async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 10;
    const offset = (page - 1) * limit;

    const [posts] = await pool.execute(
      `
      SELECT p.*, a.name AS author_name, c.name AS category_name
      FROM posts p
      LEFT JOIN authors a ON p.author_id = a.id
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE c.slug = ? AND p.status = 'published'
      ORDER BY p.published_at DESC LIMIT ? OFFSET ?
    `,
      [req.params.categorySlug, limit, offset]
    );

    const [countResult] = await pool.execute(
      `
      SELECT COUNT(*) AS total
      FROM posts p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE c.slug = ? AND p.status = 'published'
    `,
      [req.params.categorySlug]
    );

    res.json({
      posts,
      total: countResult[0].total,
      currentPage: page,
    });
  } catch (error) {
    console.error("❌ Error fetching category posts:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * ✅ GET single post by slug
 */
router.get("/:slug", async (req, res) => {
  try {
    const [posts] = await pool.execute(
      `
      SELECT p.*, a.name AS author_name, a.bio AS author_bio, a.avatar_url AS author_avatar,
             c.name AS category_name, c.slug AS category_slug
      FROM posts p
      LEFT JOIN authors a ON p.author_id = a.id
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.slug = ? AND p.status = 'published'
    `,
      [req.params.slug]
    );

    if (posts.length === 0) {
      return res.status(404).json({ error: "Post not found" });
    }

    const post = posts[0];

    // Increment view count safely
    await pool.execute(`UPDATE posts SET view_count = view_count + 1 WHERE id = ?`, [post.id]);

    // Fetch related posts
    const [relatedPosts] = await pool.execute(
      `
      SELECT p.id, p.title, p.slug, p.excerpt, p.featured_image, p.published_at
      FROM posts p
      WHERE p.category_id = ? AND p.id != ? AND p.status = 'published'
      ORDER BY p.published_at DESC LIMIT 4
    `,
      [post.category_id, post.id]
    );

    res.json({ ...post, related_posts: relatedPosts });
  } catch (error) {
    console.error("❌ Error fetching post:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
