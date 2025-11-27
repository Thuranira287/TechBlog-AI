import express from "express";
import pool from "../config/db.js";

const router = express.Router();

// Add this helper function at the top
const getFullImageUrl = (imagePath) => {
  if (!imagePath) return null;
  if (imagePath.startsWith('http')) return imagePath;
  return `https://techblogai-backend.onrender.com${imagePath}`;
};

/**
 * ✅ GET all published posts with pagination - UPDATED WITH FULL IMAGE URLS
 */
router.get("/", async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    console.log(`📄 Fetching posts - Page: ${page}, Limit: ${limit}`);

    const query = `
      SELECT p.*, a.name AS author_name, c.name AS category_name, c.slug AS category_slug
      FROM posts p
      LEFT JOIN authors a ON p.author_id = a.id
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.status = 'published'
      ORDER BY p.published_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `;

    const countQuery = `
      SELECT COUNT(*) AS total
      FROM posts p
      WHERE p.status = 'published'
    `;

    console.log(`🔍 Executing main query`);
    
    const [posts] = await pool.execute(query);
    const [countResult] = await pool.execute(countQuery);

    const total = countResult[0].total;
    const totalPages = Math.ceil(total / limit);

    // ✅ FIX: Add full image URLs to each post
    const postsWithFullUrls = posts.map(post => ({
      ...post,
      featured_image: getFullImageUrl(post.featured_image)
    }));

    console.log(`✅ Found ${posts.length} posts out of ${total} total`);

    res.json({
      posts: postsWithFullUrls, // Use the updated posts array
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
    res.status(500).json({ 
      error: "Internal server error",
      details: error.message
    });
  }
});

/**
 * ✅ GET posts by category - UPDATED WITH FULL IMAGE URLS
 */
router.get("/category/:categorySlug", async (req, res) => {
  try {
    console.log(`🔍 Fetching posts for category: "${req.params.categorySlug}"`);
    
    const page = parseInt(req.query.page) || 1;
    const limit = 10;
    const offset = (page - 1) * limit;

    const [categoryCheck] = await pool.execute(
      `SELECT id, name, slug FROM categories WHERE slug = ?`,
      [req.params.categorySlug]
    );

    if (categoryCheck.length === 0) {
      console.log(`❌ Category "${req.params.categorySlug}" not found`);
      return res.status(404).json({ 
        error: "Category not found"
      });
    }

    const categoryId = categoryCheck[0].id;
    console.log(`✅ Category found: ${categoryCheck[0].name} (ID: ${categoryId})`);

    const query = `
      SELECT p.*, a.name AS author_name, c.name AS category_name, c.slug AS category_slug
      FROM posts p
      LEFT JOIN authors a ON p.author_id = a.id
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.category_id = ${categoryId} AND p.status = 'published'
      ORDER BY p.published_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `;

    const countQuery = `
      SELECT COUNT(*) AS total
      FROM posts p
      WHERE p.category_id = ${categoryId} AND p.status = 'published'
    `;

    console.log(`🔍 Executing category posts query`);
    
    const [posts] = await pool.execute(query);
    const [countResult] = await pool.execute(countQuery);

    // ✅ FIX: Add full image URLs to each post
    const postsWithFullUrls = posts.map(post => ({
      ...post,
      featured_image: getFullImageUrl(post.featured_image)
    }));

    console.log(`📄 Posts found for category: ${posts.length}`);

    res.json({
      posts: postsWithFullUrls, // Use the updated posts array
      total: countResult[0].total,
      currentPage: page,
      category: categoryCheck[0]
    });
  } catch (error) {
    console.error("❌ Error fetching category posts:", error);
    res.status(500).json({ 
      error: "Internal server error",
      details: error.message
    });
  }
});

/**
 * ✅ GET single post by slug - UPDATED WITH FULL IMAGE URLS
 */
router.get("/:slug", async (req, res) => {
  try {
    console.log(`🔍 Fetching post by slug: "${req.params.slug}"`);

    const [posts] = await pool.execute(
      `SELECT p.*, a.name AS author_name, a.bio AS author_bio, a.avatar_url AS author_avatar,
             c.name AS category_name, c.slug AS category_slug
       FROM posts p
       LEFT JOIN authors a ON p.author_id = a.id
       LEFT JOIN categories c ON p.category_id = c.id
       WHERE p.slug = ? AND p.status = 'published'`,
      [req.params.slug]
    );

    if (posts.length === 0) {
      console.log(`❌ Post not found: ${req.params.slug}`);
      return res.status(404).json({ error: "Post not found" });
    }

    let post = posts[0];
    console.log(`✅ Post found: ${post.title}`);

    // ✅ FIX: Add full image URLs to the post
    post = {
      ...post,
      featured_image: getFullImageUrl(post.featured_image),
      author_avatar: getFullImageUrl(post.author_avatar)
    };

    // Increment view count
    await pool.execute(
      `UPDATE posts SET view_count = view_count + 1 WHERE id = ?`, 
      [post.id]
    );

    // Fetch related posts
    const [relatedPosts] = await pool.execute(
      `SELECT p.id, p.title, p.slug, p.excerpt, p.featured_image, p.published_at
       FROM posts p
       WHERE p.category_id = ? AND p.id != ? AND p.status = 'published'
       ORDER BY p.published_at DESC LIMIT 4`,
      [post.category_id, post.id]
    );

    // ✅ FIX: Add full image URLs to related posts too
    const relatedPostsWithFullUrls = relatedPosts.map(relatedPost => ({
      ...relatedPost,
      featured_image: getFullImageUrl(relatedPost.featured_image)
    }));

    console.log(`📄 Found ${relatedPosts.length} related posts`);

    res.json({ 
      ...post, 
      related_posts: relatedPostsWithFullUrls 
    });
  } catch (error) {
    console.error("❌ Error fetching post:", error);
    res.status(500).json({ 
      error: "Internal server error",
      details: error.message 
    });
  }
});

export default router;