import express from "express";
import pool from "../config/db.js";
import e from "express";

const router = express.Router();

const getFullImageUrl = (imagePath) => {
  if (!imagePath) return null;

  // Cloudinary or external image
  if (imagePath.startsWith("http")) {
    return imagePath;
  }

  // Legacy local uploads
  return `https://techblogai-backend.onrender.com${imagePath}`;
};

// GET all published posts with pagination (OFFSET + CURSOR)
router.get("/", async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 50, 100);
    const cursor = req.query.cursor || null;
    let query;
    let params = [];


    if (cursor) {
      query = `
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
        AND p.published_at < ?
        ORDER BY p.published_at DESC
        LIMIT ${limit + 1}
      `;
      params = [cursor];
    } else {
      const page = Math.max(parseInt(req.query.page) || 1, 1);
      const offset = (page - 1) * limit;

      query = `
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
        LIMIT ${limit} OFFSET ${offset}
      `;
    }

    const [rows] = await pool.execute(query, params);

    const hasNext = rows.length > limit;
    const posts = hasNext ? rows.slice(0, limit) : rows;

    res.json({
      posts,
      pagination: {
        hasNext,
      },
      nextCursor: hasNext ? posts[posts.length - 1].published_at : null
    });

  } catch (error) {
    process.env.NODE_ENV === 'development' &&
    console.error("Error fetching posts:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET posts by category (OFFSET + CURSOR) WITH SEO FIELDS
router.get("/category/:categorySlug", async (req, res) => {
  try {
    const limit = 9;
    const cursor = req.query.cursor || null;
    
    const [categoryCheck] = await pool.execute(
      `SELECT id, name, slug FROM categories WHERE slug = ?`,
      [req.params.categorySlug]
    );
    
    if (!categoryCheck.length) {
      return res.status(404).json({ error: "Category not found" });
    }
    
    const categoryId = categoryCheck[0].id;
    
    let query;
    let params;
    
    if (cursor) {
      // Cursor-based pagination - use string interpolation for LIMIT
      query = `
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
        WHERE p.category_id = ?
        AND p.status = 'published'
        AND p.published_at < ?
        ORDER BY p.published_at DESC
        LIMIT ${limit + 1}
      `;
      params = [categoryId, cursor];
    } else {
      // Offset-based pagination 
      const page = Number(req.query.page) || 1;
      const offset = (page - 1) * limit;
      
      query = `
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
        WHERE p.category_id = ?
        AND p.status = 'published'
        ORDER BY p.published_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `;
      params = [categoryId];
    }
    
    const [rows] = await pool.execute(query, params);
    
    const hasNext = cursor ? rows.length > limit : false;
    const posts = hasNext ? rows.slice(0, limit) : rows;
    
    // Also get total count for offset pagination
    let total = 0;
    if (!cursor) {
      const [countResult] = await pool.execute(
        `SELECT COUNT(*) AS total
         FROM posts
         WHERE category_id = ? AND status = 'published'`,
        [categoryId]
      );
      total = countResult[0].total;
    }
    
    const response = {
      posts: posts.map(p => ({
        ...p,
        featured_image: getFullImageUrl(p.featured_image),
        tags: typeof p.tags === 'string' ? JSON.parse(p.tags) : p.tags || []
      })),
      category: categoryCheck[0]
    };
    
    // Add pagination metadata
    if (cursor) {
      // Cursor pagination response
      response.nextCursor = hasNext ? posts[posts.length - 1].published_at : null;
    } else {
      // Offset pagination response (backward compatibility)
      const page = Number(req.query.page) || 1;
      response.total = total;
      response.currentPage = page;
      response.totalPages = Math.ceil(total / limit);
    }
    
    res.json(response);
    
  } catch (error) {
    res.status(500).json({
      error: "Internal server error",
      details: error.message 
    });
  }
});

// GET post metadata ONLY 
router.get('/:slug/meta', async (req, res) => {
  try {
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
      process.env.NODE_ENV === 'development' &&
      console.log(`[META] Post not found for meta: ${req.params.slug}`);
      return res.status(404).json({ error: 'Post not found' });
    }
    
    const post = rows[0];
    
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
    res.status(500).json({ 
      error: 'Internal server error', 
      details: error.message 
    });
  }
});

// GET post with FULL CONTENT for AI crawlers 
router.get('/:slug/full', async (req, res) => {
  try {
    const userAgent = req.headers['user-agent'] || '';
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
      process.env.NODE_ENV === 'development' &&
      console.log(`[FULL] Post not found: ${req.params.slug}`);
      return res.status(404).json({ error: 'Post not found' });
    }
    
    const post = rows[0];
    
    // Log AI crawler access for analytics
    const aiCrawlers = ['gptbot', 'anthropic', 'claude', 'cohere', 'perplexity', 'chatgpt'];
    const isAICrawler = aiCrawlers.some(bot => userAgent.toLowerCase().includes(bot));
    
    if (isAICrawler) {
      process.env.NODE_ENV === 'development' &&
      console.log(`🤖 [AI CRAWLER] Full content accessed by: ${userAgent.substring(0, 50)}`);
    }

    process.env.NODE_ENV === 'development' &&
    console.log(`[FULL] Full content served for: ${post.title} (${post.content?.length || 0} chars)`);
    
    // Parse tags
    const tags = typeof post.tags === 'string' ? JSON.parse(post.tags) : post.tags || [];
    
    res.json({
      id: post.id,
      title: post.title,
      slug: post.slug,
      excerpt: post.excerpt,
      content: post.content,
      featured_image: getFullImageUrl(post.featured_image),
      created_at: post.created_at,
      updated_at: post.updated_at,
      published_at: post.published_at,
      view_count: post.view_count,
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
    if (process.env.NODE_ENV === 'development') {
      console.error('[FULL] Full content endpoint error:', error);
    }
    res.status(500).json({ 
      error: 'Internal server error', 
      details: error.message 
    });
  }
});

// Search posts, contents, tags, keywords
router.get("/search", async (req, res) => {
  try {
    const searchTerm = req.query.q || req.query.search || '';
    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = Math.min(parseInt(req.query.limit) || 20, 50);
    const offset = (page - 1) * limit;

    process.env.NODE_ENV === 'development' &&
    console.log(`🔍 [SEARCH] "${searchTerm}" | Page ${page}`);

    if (!searchTerm.trim()) {
      return res.json({
        posts: [],
        total: 0,
        page: 1,
        totalPages: 0,
        hasMore: false
      });
    }

    //FULLTEXT BOOLEAN MODE 
    const booleanSearchTerm = searchTerm.split(' ')
      .map(word => word.length > 2 ? `${word}*` : word)
      .join(' ');

    const query = `
      SELECT 
        p.*,
        MATCH(p.title, p.excerpt, p.content, p.tags, p.keywords) 
        AGAINST (? IN BOOLEAN MODE) AS relevance,
        a.name AS author_name,
        c.name AS category_name,
        c.slug AS category_slug
      FROM posts p
      LEFT JOIN authors a ON p.author_id = a.id
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.status = 'published'
        AND MATCH(p.title, p.excerpt, p.content, p.tags, p.keywords) 
        AGAINST (? IN BOOLEAN MODE)
      ORDER BY relevance DESC, p.published_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `;

    try {
      const [rows] = await pool.execute(query, [booleanSearchTerm, booleanSearchTerm]);
      if (rows.length > 0) {
        // Process and return results
        const posts = rows.map(post => ({
          ...post,
          featured_image: getFullImageUrl(post.featured_image),
          tags: typeof post.tags === 'string' ? JSON.parse(post.tags) : post.tags || []
        }));

        // Get count
        const countQuery = `
          SELECT COUNT(*) AS total
          FROM posts p
          WHERE p.status = 'published'
            AND MATCH(p.title, p.excerpt, p.content, p.tags, p.keywords) 
            AGAINST (? IN BOOLEAN MODE)
        `;
        const [countResult] = await pool.execute(countQuery, [booleanSearchTerm]);
        const total = countResult[0].total;

        return res.json({
          posts,
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
          hasMore: page < Math.ceil(total / limit)
        });
      }
    } catch (ftError) {
      process.env.NODE_ENV === 'development' &&
      console.log(' [SEARCH] FULLTEXT failed, falling back to LIKE');
    }

    //Fallback to LIKE if FULLTEXT fails
    const words = searchTerm.split(/\s+/).filter(w => w.length > 0);
    const conditions = words.map(word => 
      `(p.title LIKE ? OR p.excerpt LIKE ? OR p.content LIKE ? OR p.tags LIKE ? OR p.keywords LIKE ?)`
    ).join(' AND ');

    const fallbackQuery = `
      SELECT 
        p.*,
        a.name AS author_name,
        c.name AS category_name,
        c.slug AS category_slug
      FROM posts p
      LEFT JOIN authors a ON p.author_id = a.id
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.status = 'published'
        AND ${conditions}
      ORDER BY p.published_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `;

    // Build params for LIKE patterns
    const params = [];
    words.forEach(word => {
      const pattern = `%${word}%`;
      for (let i = 0; i < 5; i++) {
        params.push(pattern);
      }
    });

    const [rows] = await pool.execute(fallbackQuery, params);
    process.env.NODE_ENV === 'development' &&
    console.log(`[SEARCH] LIKE found ${rows.length} posts`);

    const posts = rows.map(post => ({
      ...post,
      featured_image: getFullImageUrl(post.featured_image),
      tags: typeof post.tags === 'string' ? JSON.parse(post.tags) : post.tags || []
    }));

    // Get count for LIKE
    const countQuery = `
      SELECT COUNT(*) AS total
      FROM posts p
      WHERE p.status = 'published'
        AND ${conditions}
    `;
    const [countResult] = await pool.execute(countQuery, params);
    const total = countResult[0].total;

    res.json({
      posts,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      hasMore: page < Math.ceil(total / limit)
    });

  } catch (error) {
    console.error(" [SEARCH] Error:", error);
    res.status(500).json({
      error: "Internal server error",
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});
// GET single post by slug
router.get("/:slug", async (req, res) => {
  try {
    process.env.NODE_ENV === 'development' &&
    console.log(`🔍 Fetching post by slug: "${req.params.slug}"`);
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
      process.env.NODE_ENV === 'development' &&
      console.log(`Post not found: ${req.params.slug}`);
      return res.status(404).json({ error: "Post not found" });
    }

    let post = posts[0];
    process.env.NODE_ENV === 'development' &&
    console.log(` Post found: ${post.title}`);

    // Parse tags to array
    const tags = typeof post.tags === 'string' ? JSON.parse(post.tags) : post.tags || [];

    // post object with fallbacks for SEO fields
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
    // Fetch related posts & SEO fields
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

    // image URLs
    const relatedPostsWithFullUrls = relatedPosts.map(relatedPost => ({
      ...relatedPost,
      featured_image: getFullImageUrl(relatedPost.featured_image),
      tags: typeof relatedPost.tags === 'string' ? JSON.parse(relatedPost.tags) : relatedPost.tags || []
    }));
    process.env.NODE_ENV === 'development' &&
    console.log(`Found ${relatedPosts.length} related posts`);

    res.json({ 
      ...completePost, 
      related_posts: relatedPostsWithFullUrls 
    });
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error("Error fetching post:", error);
    }
    res.status(500).json({ 
      error: "Internal server error",
      details: error.message 
    });
  }
});

export default router;