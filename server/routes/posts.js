import express from "express";
import pool from "../config/db.js";

const router = express.Router();

const safeParseTags = (tags) => {
  if (!tags) return [];
  if (Array.isArray(tags)) return tags;
  try {
    return JSON.parse(tags);
  } catch {
    return [];
  }
};


const getFullImageUrl = (imagePath) => {
  if (!imagePath) return null;

  // Cloudinary or external image
  if (imagePath.startsWith("http")) {
    return imagePath;
  }

  // Legacy local uploads
  return `https://techblogai-backend.onrender.com${imagePath}`;
};

/**
 * ✅ GET all published posts with pagination - UPDATED WITH SEO FIELDS
 */
router.get("/", async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const offset = (page - 1) * limit;

    console.log(`📄 Fetching posts - Page: ${page}, Limit: ${limit}`);

    // UPDATED QUERY: Added SEO fields
    const query = `
      SELECT 
        p.*, 
        p.meta_title, 
        p.meta_description, 
        p.keywords,
        p.og_title, 
        p.og_description, 
        p.twitter_title, 
        p.twitter_description,
        a.name AS author_name, 
        c.name AS category_name, 
        c.slug AS category_slug
      FROM posts p
      LEFT JOIN authors a ON p.author_id = a.id
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.status = 'published'
      ORDER BY p.published_at DESC
      LIMIT ? OFFSET ?
    `;

    const countQuery = `
      SELECT COUNT(*) AS total
      FROM posts p
      WHERE p.status = 'published'
    `;

    console.log(`🔍 Executing main query`);
    
    const [posts] = await pool.execute(query, [limit.toString(), offset.toString()]);
    const [countResult] = await pool.execute(countQuery);

    const total = countResult[0].total;
    const totalPages = Math.ceil(total / limit);

    // ✅ FIX: Add full image URLs to each post
    const postsWithFullUrls = posts.map(post => ({
      ...post,
      featured_image: getFullImageUrl(post.featured_image),
      // Ensure tags is always an array
      tags: typeof post.tags === 'string' ? JSON.parse(post.tags) : post.tags || []
    }));

    console.log(`✅ Found ${posts.length} posts out of ${total} total`);

    res.json({
      posts: postsWithFullUrls,
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
 * ✅ GET posts by category - UPDATED WITH SEO FIELDS
 */
router.get("/category/:categorySlug", async (req, res) => {
  try {
    console.log(`🔍 Fetching posts for category: "${req.params.categorySlug}"`);

    const rawPage = Number(req.query.page);
    const page = Number.isInteger(rawPage) && rawPage > 0 ? rawPage : 1;

    const limit = 10;
    const offset = (page - 1) * limit;

    const [categoryCheck] = await pool.execute(
      `SELECT id, name, slug FROM categories WHERE slug = ?`,
      [req.params.categorySlug]
    );

    if (!categoryCheck.length) {
      return res.status(404).json({ error: "Category not found" });
    }

    const categoryId = categoryCheck[0].id;

    const query = `
      SELECT 
        p.*,
        p.meta_title, 
        p.meta_description, 
        p.keywords,
        p.og_title, 
        p.og_description, 
        p.twitter_title, 
        p.twitter_description,
        a.name AS author_name, 
        c.name AS category_name, 
        c.slug AS category_slug
      FROM posts p
      LEFT JOIN authors a ON p.author_id = a.id
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.category_id = ? AND p.status = 'published'
      ORDER BY p.published_at DESC
      LIMIT ? OFFSET ?
    `;

    const [posts] = await pool.execute(query, [
      categoryId,
      Number(limit),
      Number(offset),
    ]);


    const [countResult] = await pool.execute(
      `SELECT COUNT(*) AS total
       FROM posts
       WHERE category_id = ? AND status = 'published'`,
      [categoryId]
    );

    const postsWithFullUrls = posts.map(post => ({
      ...post,
      featured_image: getFullImageUrl(post.featured_image),
      tags: typeof post.tags === 'string'
        ? JSON.parse(post.tags)
        : post.tags || []
    }));

    res.json({
      posts: postsWithFullUrls,
      total: countResult[0].total,
      currentPage: page,
      category: categoryCheck[0]
    });

  } catch (error) {
    console.error("❌ Error fetching category posts:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * 🆕 GET post metadata ONLY (lightweight for traditional search engines)
 * Used by Edge Function for Google, Bing, etc.
 * IMPORTANT: This must come BEFORE /:slug route
 */
router.get('/:slug/meta', async (req, res) => {
  try {
    console.log(`🔍 [META] Fetching meta for post slug: "${req.params.slug}"`);
    
    const query = `
      SELECT 
        p.id,
        p.title,
        p.slug,
        p.excerpt,
        p.featured_image,
        p.created_at,
        p.updated_at,
        p.published_at,
        p.view_count,
        p.word_count,
        p.meta_title,
        p.meta_description,
        p.keywords,
        p.og_title,
        p.og_description,
        p.twitter_title,
        p.twitter_description,
        p.tags,
        a.name AS author_name,
        c.name AS category_name,
        c.id AS category_id
      FROM posts p
      LEFT JOIN authors a ON p.author_id = a.id
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.slug = ? AND p.status = 'published'
      LIMIT 1
    `;
    
    const [rows] = await pool.execute(query, [req.params.slug]);
    
    if (!rows || rows.length === 0) {
      console.log(`❌ Post not found for meta: ${req.params.slug}`);
      return res.status(404).json({ error: 'Post not found' });
    }
    
    const post = rows[0];
    console.log(`✅ [META] Meta found for: ${post.title}`);
    
    // Parse tags
    const tags = typeof post.tags === 'string' ? JSON.parse(post.tags) : post.tags || [];
    
    res.json({
      id: post.id,
      title: post.title,
      slug: post.slug,
      excerpt: post.excerpt,
      featured_image: getFullImageUrl(post.featured_image),
      created_at: post.created_at,
      updated_at: post.updated_at,
      published_at: post.published_at,
      view_count: post.view_count,
      word_count: post.word_count,
      meta_title: post.meta_title || post.title,
      meta_description: post.meta_description || post.excerpt,
      keywords: post.keywords,
      og_title: post.og_title || post.meta_title || post.title,
      og_description: post.og_description || post.meta_description || post.excerpt,
      twitter_title: post.twitter_title || post.og_title || post.meta_title || post.title,
      twitter_description: post.twitter_description || post.og_description || post.meta_description || post.excerpt,
      author: post.author_name || 'TechBlog AI Team',
      category: post.category_name || 'Technology',
      category_id: post.category_id,
      tags: tags
    });
    
  } catch (error) {
    console.error('❌ [META] Meta endpoint error:', error);
    res.status(500).json({ 
      error: 'Internal server error', 
      details: error.message 
    });
  }
});

/**
 * 🆕 GET post with FULL CONTENT (for AI crawlers like ChatGPT, Claude, Perplexity)
 * Used by Edge Function when AI crawler is detected
 * IMPORTANT: This must come BEFORE /:slug route
 */
router.get('/:slug/full', async (req, res) => {
  try {
    const userAgent = req.headers['user-agent'] || '';
    console.log(`🤖 [FULL] Fetching full content for: "${req.params.slug}" | UA: ${userAgent.substring(0, 50)}`);
    
    const query = `
      SELECT 
        p.id,
        p.title,
        p.slug,
        p.excerpt,
        p.content,
        p.featured_image,
        p.created_at,
        p.updated_at,
        p.published_at,
        p.view_count,
        p.word_count,
        p.meta_title,
        p.meta_description,
        p.keywords,
        p.og_title,
        p.og_description,
        p.twitter_title,
        p.twitter_description,
        p.tags,
        a.name AS author_name,
        c.name AS category_name,
        c.id AS category_id
      FROM posts p
      LEFT JOIN authors a ON p.author_id = a.id
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.slug = ? AND p.status = 'published'
      LIMIT 1
    `;
    
    const [rows] = await pool.execute(query, [req.params.slug]);
    
    if (!rows || rows.length === 0) {
      console.log(`❌ [FULL] Post not found: ${req.params.slug}`);
      return res.status(404).json({ error: 'Post not found' });
    }
    
    const post = rows[0];
    
    // Log AI crawler access for analytics
    const aiCrawlers = ['gptbot', 'anthropic', 'claude', 'cohere', 'perplexity', 'chatgpt'];
    const isAICrawler = aiCrawlers.some(bot => userAgent.toLowerCase().includes(bot));
    
    if (isAICrawler) {
      console.log(`🤖 [AI CRAWLER] Full content accessed by: ${userAgent.substring(0, 50)}`);
    }
    
    console.log(`✅ [FULL] Full content served for: ${post.title} (${post.content?.length || 0} chars)`);
    
    // Parse tags
    const tags = typeof post.tags === 'string' ? JSON.parse(post.tags) : post.tags || [];
    
    res.json({
      id: post.id,
      title: post.title,
      slug: post.slug,
      excerpt: post.excerpt,
      content: post.content, // 🔥 FULL CONTENT INCLUDED
      featured_image: getFullImageUrl(post.featured_image),
      created_at: post.created_at,
      updated_at: post.updated_at,
      published_at: post.published_at,
      view_count: post.view_count,
      word_count: post.word_count,
      meta_title: post.meta_title || post.title,
      meta_description: post.meta_description || post.excerpt,
      keywords: post.keywords,
      og_title: post.og_title || post.meta_title || post.title,
      og_description: post.og_description || post.meta_description || post.excerpt,
      twitter_title: post.twitter_title || post.og_title || post.meta_title || post.title,
      twitter_description: post.twitter_description || post.og_description || post.meta_description || post.excerpt,
      author: post.author_name || 'TechBlog AI Team',
      category: post.category_name || 'Technology',
      category_id: post.category_id,
      tags: tags
    });
    
  } catch (error) {
    console.error('❌ [FULL] Full content endpoint error:', error);
    res.status(500).json({ 
      error: 'Internal server error', 
      details: error.message 
    });
  }
});

/**
 * ✅ GET single post by slug - COMPLETELY UPDATED WITH ALL SEO FIELDS
 */
router.get("/:slug", async (req, res) => {
  try {
    console.log(`🔍 Fetching post by slug: "${req.params.slug}"`);

    // UPDATED QUERY: Include ALL SEO fields
    const [posts] = await pool.execute(
      `SELECT 
        p.*,
        p.meta_title,
        p.meta_description,
        p.keywords,
        p.og_title,
        p.og_description,
        p.twitter_title,
        p.twitter_description,
        a.name AS author_name, 
        a.bio AS author_bio, 
        a.avatar_url AS author_avatar,
        c.name AS category_name, 
        c.slug AS category_slug
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

    // Parse tags to array
    const tags = typeof post.tags === 'string' ? JSON.parse(post.tags) : post.tags || [];

    // ✅ FIX: Build complete post object with fallbacks for SEO fields
    const completePost = {
      id: post.id,
      title: post.title,
      slug: post.slug,
      excerpt: post.excerpt,
      content: post.content,
      featured_image: getFullImageUrl(post.featured_image),
      author_avatar: getFullImageUrl(post.author_avatar),
      status: post.status,
      view_count: post.view_count,
      created_at: post.created_at,
      updated_at: post.updated_at,
      published_at: post.published_at,
      
      // SEO FIELDS WITH FALLBACKS
      meta_title: post.meta_title || post.title,
      meta_description: post.meta_description || post.excerpt,
      keywords: post.keywords,
      og_title: post.og_title || post.meta_title || post.title,
      og_description: post.og_description || post.meta_description || post.excerpt,
      twitter_title: post.twitter_title || post.og_title || post.meta_title || post.title,
      twitter_description: post.twitter_description || post.og_description || post.meta_description || post.excerpt,
      
      // Tags as array
      tags: tags,
      
      // Relationships
      category_id: post.category_id,
      category_name: post.category_name,
      category_slug: post.category_slug,
      author_id: post.author_id,
      author_name: post.author_name || 'Admin',
      author_bio: post.author_bio,
      
      // For article meta tags
      author_url: post.author_id ? `/author/${post.author_id}` : null
    };

    // Increment view count
    await pool.execute(
      `UPDATE posts SET view_count = view_count + 1 WHERE id = ?`, 
      [completePost.id]
    );

    // Fetch related posts (with SEO fields)
    const [relatedPosts] = await pool.execute(
      `SELECT 
        p.id, 
        p.title, 
        p.slug, 
        p.excerpt, 
        p.featured_image, 
        p.published_at,
        p.meta_title,
        p.meta_description
       FROM posts p
       WHERE p.category_id = ? AND p.id != ? AND p.status = 'published'
       ORDER BY p.published_at DESC LIMIT 4`,
      [post.category_id, post.id]
    );

    // ✅ FIX: Add full image URLs to related posts too
    const relatedPostsWithFullUrls = relatedPosts.map(relatedPost => ({
      ...relatedPost,
      featured_image: getFullImageUrl(relatedPost.featured_image),
      tags: typeof relatedPost.tags === 'string' ? JSON.parse(relatedPost.tags) : relatedPost.tags || []
    }));

    console.log(`📄 Found ${relatedPosts.length} related posts`);

    res.json({ 
      ...completePost, 
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