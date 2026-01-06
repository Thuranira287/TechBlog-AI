import express from 'express';
import pool from '../config/db.js';
import { authenticateToken } from '../middleware/auth.js';
import { parser, uploadBufferToCloudinary } from "../config/cloudinary.js";

const router = express.Router();

// Protect all admin routes
router.use(authenticateToken);

// -------------------- DASHBOARD --------------------
router.get('/dashboard', async (req, res) => {
  try {
    const [postsCount] = await pool.execute('SELECT COUNT(*) as count FROM posts');
    const [categoriesCount] = await pool.execute('SELECT COUNT(*) as count FROM categories');
    const [commentsCount] = await pool.execute('SELECT COUNT(*) as count FROM comments');
    const [reactionsCount] = await pool.execute('SELECT COUNT(*) as count FROM reactions');
    
    const [recentPosts] = await pool.execute(`
      SELECT p.*, c.name as category_name 
      FROM posts p 
      LEFT JOIN categories c ON p.category_id = c.id 
      ORDER BY p.created_at DESC
      LIMIT 1000
    `);

    // ADD SEO FIELDS TO DASHBOARD RESPONSE
    const postsWithSeo = recentPosts.map(post => ({
      ...post,
      tags: typeof post.tags === 'string' ? JSON.parse(post.tags) : post.tags || []
    }));

    res.json({
      stats: {
        totalPosts: postsCount[0].count,
        totalCategories: categoriesCount[0].count,
        totalComments: commentsCount[0].count,
        totalReactions: reactionsCount[0].count,
      },
      posts: postsWithSeo,
      pagination:{ 
        currentPage: 1,
        totalPages: 1,
        totalPages: postsCount[0].count
      }
    });
  } catch (error) {
    console.error('Error fetching dashboard data:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// -------------------- POSTS --------------------

// Get all posts
router.get('/posts', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const offset = (page - 1) * limit;

    const [posts] = await pool.execute(`
      SELECT p.*, 
             p.meta_title, p.meta_description, p.keywords,
             p.og_title, p.og_description, p.twitter_title, p.twitter_description,
             c.name as category_name, a.name as author_name
      FROM posts p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN authors a ON p.author_id = a.id
      ORDER BY p.created_at DESC
      LIMIT ? OFFSET ?
    `, [limit, offset]);

    const [countResult] = await pool.execute('SELECT COUNT(*) as total FROM posts');

    // Parse tags for each post
    const postsWithParsedTags = posts.map(post => ({
      ...post,
      tags: typeof post.tags === 'string' ? JSON.parse(post.tags) : post.tags || []
    }));

    res.json({
      posts: postsWithParsedTags,
      pagination: {
        current: page,
        totalPages: Math.ceil(countResult[0].total / limit),
        totalPosts: countResult[0].total
      }
    });
  } catch (error) {
    console.error('Error fetching posts:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get single post
router.get('/posts/:id', async (req, res) => {
  try {
    const [posts] = await pool.execute(`
      SELECT p.*, 
             p.meta_title, p.meta_description, p.keywords,
             p.og_title, p.og_description, p.twitter_title, p.twitter_description,
             c.name as category_name
      FROM posts p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.id = ?
    `, [req.params.id]);

    if (!posts.length) return res.status(404).json({ error: 'Post not found' });
    
    // Parse tags
    const post = {
      ...posts[0],
      tags: typeof posts[0].tags === 'string' ? JSON.parse(posts[0].tags) : posts[0].tags || []
    };
    
    res.json(post);
  } catch (error) {
    console.error('Error fetching post:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create post - UPDATED WITH SEO FIELDS
router.post('/posts', parser.single('featured_image'), async (req, res) => {
  try {
    const { 
      title, slug, excerpt, content, category_id, 
      meta_title, meta_description, keywords,
      og_title, og_description, twitter_title, twitter_description,
      tags, status = 'draft' 
    } = req.body;

    const [authors] = await pool.execute('SELECT id FROM authors LIMIT 1');
    const author_id = authors[0].id;

    let featured_image = null;
    if (req.file) {
      const uploadResult = await uploadBufferToCloudinary(req.file.buffer);
      featured_image = uploadResult.secure_url;
    }

    // Parse tags
    let parsedTags = [];
    try {
      parsedTags = tags ? JSON.parse(tags) : [];
    } catch (e) {
      parsedTags = tags ? tags.split(',').map(t => t.trim()) : [];
    }

    // Set fallbacks for SEO fields
    const finalMetaTitle = meta_title || title;
    const finalMetaDescription = meta_description || excerpt || null;
    const finalOgTitle = og_title || finalMetaTitle;
    const finalOgDescription = og_description || finalMetaDescription;
    const finalTwitterTitle = twitter_title || finalOgTitle;
    const finalTwitterDescription = twitter_description || finalOgDescription;

    const [result] = await pool.execute(`
      INSERT INTO posts 
      (title, slug, excerpt, content, author_id, category_id, featured_image, 
       meta_title, meta_description, keywords,
       og_title, og_description, twitter_title, twitter_description,
       tags, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
    `, [
      title, slug, excerpt, content, author_id, category_id, featured_image,
      finalMetaTitle, finalMetaDescription, keywords,
      finalOgTitle, finalOgDescription, finalTwitterTitle, finalTwitterDescription,
      JSON.stringify(parsedTags), status
    ]);

    const [newPost] = await pool.execute(`
      SELECT p.*, 
             p.meta_title, p.meta_description, p.keywords,
             p.og_title, p.og_description, p.twitter_title, p.twitter_description,
             c.name as category_name 
      FROM posts p 
      LEFT JOIN categories c ON p.category_id = c.id 
      WHERE p.id = ?
    `, [result.insertId]);

    res.status(201).json({
      ...newPost[0],
      tags: parsedTags
    });
  } catch (error) {
    console.error('Error creating post:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      details: error.message 
    });
  }
});

// Update post - UPDATED WITH SEO FIELDS
router.put('/posts/:id', parser.single('featured_image'), async (req, res) => {
  try {
    const { 
      title, slug, excerpt, content, category_id, 
      meta_title, meta_description, keywords,
      og_title, og_description, twitter_title, twitter_description,
      tags, status, existing_featured_image 
    } = req.body;

    // First get existing post to preserve values not provided
    const [existingPosts] = await pool.execute('SELECT * FROM posts WHERE id = ?', [req.params.id]);
    if (!existingPosts.length) return res.status(404).json({ error: 'Post not found' });
    
    const existingPost = existingPosts[0];

    // Handle featured image
    let featured_image = existing_featured_image || existingPost.featured_image;
    if (req.file) {
      const uploadResult = await uploadBufferToCloudinary(req.file.buffer);
      featured_image = uploadResult.secure_url;
    }

    // Parse tags
    let parsedTags = [];
    if (tags !== undefined) {
      try {
        parsedTags = tags ? JSON.parse(tags) : [];
      } catch (e) {
        parsedTags = tags ? tags.split(',').map(t => t.trim()) : [];
      }
    } else {
      parsedTags = typeof existingPost.tags === 'string' ? JSON.parse(existingPost.tags) : existingPost.tags || [];
    }

    // Set SEO fields with fallbacks
    const finalMetaTitle = meta_title !== undefined ? meta_title : existingPost.meta_title || title;
    const finalMetaDescription = meta_description !== undefined ? meta_description : existingPost.meta_description || excerpt;
    const finalKeywords = keywords !== undefined ? keywords : existingPost.keywords;
    const finalOgTitle = og_title !== undefined ? og_title : existingPost.og_title || finalMetaTitle;
    const finalOgDescription = og_description !== undefined ? og_description : existingPost.og_description || finalMetaDescription;
    const finalTwitterTitle = twitter_title !== undefined ? twitter_title : existingPost.twitter_title || finalOgTitle;
    const finalTwitterDescription = twitter_description !== undefined ? twitter_description : existingPost.twitter_description || finalOgDescription;

    await pool.execute(`
      UPDATE posts 
      SET title = ?, slug = ?, excerpt = ?, content = ?, category_id = ?,
          featured_image = ?, 
          meta_title = ?, meta_description = ?, keywords = ?,
          og_title = ?, og_description = ?,
          twitter_title = ?, twitter_description = ?,
          tags = ?, status = ?, updated_at = NOW()
      WHERE id = ?
    `, [
      title || existingPost.title, 
      slug || existingPost.slug, 
      excerpt !== undefined ? excerpt : existingPost.excerpt, 
      content || existingPost.content, 
      category_id || existingPost.category_id,
      featured_image,
      finalMetaTitle, finalMetaDescription, finalKeywords,
      finalOgTitle, finalOgDescription,
      finalTwitterTitle, finalTwitterDescription,
      JSON.stringify(parsedTags), 
      status || existingPost.status,
      req.params.id
    ]);

    const [updatedPost] = await pool.execute(`
      SELECT p.*, 
             p.meta_title, p.meta_description, p.keywords,
             p.og_title, p.og_description, p.twitter_title, p.twitter_description,
             c.name as category_name 
      FROM posts p 
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.id = ?
    `, [req.params.id]);

    res.json({
      ...updatedPost[0],
      tags: parsedTags
    });
  } catch (error) {
    console.error('Error updating post:', error);
    res.status(500).json({ 
      error: error.message, 
      stack: error.stack 
    }); 
  }
});

// Delete post
router.delete('/posts/:id', async (req, res) => {
  try {
    await pool.execute('DELETE FROM posts WHERE id = ?', [req.params.id]);
    res.json({ message: 'Post deleted successfully' });
  } catch (error) {
    console.error('Error deleting post:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// -------------------- CATEGORIES --------------------
router.get('/categories', async (req, res) => {
  try {
    const [categories] = await pool.execute('SELECT * FROM categories ORDER BY name');
    res.json(categories);
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/categories', async (req, res) => {
  try {
    const { name, slug, description } = req.body;
    const [result] = await pool.execute('INSERT INTO categories (name, slug, description) VALUES (?, ?, ?)', [name, slug, description]);
    res.status(201).json({ id: result.insertId, name, slug, description });
  } catch (error) {
    console.error('Error creating category:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Admin comments
router.get('/comments', async (req, res) => {
  try {
    const [comments] = await pool.execute(`
      SELECT c.*, p.title as post_title, p.slug as post_slug
      FROM comments c
      LEFT JOIN posts p ON c.post_id = p.id
      ORDER BY c.created_at DESC
    `);
    
    res.json(comments);
  } catch (error) {
    console.error('Error fetching admin comments:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Comment moderation routes
router.put('/comments/:id', async (req, res) => {
  try {
    const { approved, status } = req.body;
    
    // Check what columns exist
    const [columns] = await pool.execute('SHOW COLUMNS FROM comments');
    const hasApproved = columns.some(col => col.Field === 'approved');
    const hasStatus = columns.some(col => col.Field === 'status');
    
    if (hasApproved && approved !== undefined) {
      await pool.execute('UPDATE comments SET approved = ? WHERE id = ?', [approved, req.params.id]);
    } else if (hasStatus && status) {
      await pool.execute('UPDATE comments SET status = ? WHERE id = ?', [status, req.params.id]);
    } else {
      await pool.execute('UPDATE comments SET approved = ? WHERE id = ?', [approved || 1, req.params.id]);
    }
    
    res.json({ message: 'Comment updated successfully' });
  } catch (error) {
    console.error('Error updating comment:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/comments/:id', async (req, res) => {
  try {
    await pool.execute('DELETE FROM comments WHERE id = ?', [req.params.id]);
    res.json({ message: 'Comment deleted successfully' });
  } catch (error) {
    console.error('Error deleting comment:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;