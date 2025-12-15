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
    const [recentPosts] = await pool.execute(`
      SELECT p.*, c.name as category_name 
      FROM posts p 
      LEFT JOIN categories c ON p.category_id = c.id 
      ORDER BY p.created_at DESC 
      LIMIT 5
    `);

    res.json({
      stats: {
        totalPosts: postsCount[0].count,
        totalCategories: categoriesCount[0].count,
        totalComments: commentsCount[0].count,
      },
      recentPosts
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
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    const [posts] = await pool.execute(`
      SELECT p.*, c.name as category_name, a.name as author_name
      FROM posts p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN authors a ON p.author_id = a.id
      ORDER BY p.created_at DESC
      LIMIT ? OFFSET ?
    `, [limit, offset]);

    const [countResult] = await pool.execute('SELECT COUNT(*) as total FROM posts');

    res.json({
      posts,
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
      SELECT p.*, c.name as category_name
      FROM posts p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.id = ?
    `, [req.params.id]);

    if (!posts.length) return res.status(404).json({ error: 'Post not found' });
    res.json(posts[0]);
  } catch (error) {
    console.error('Error fetching post:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create post
router.post('/posts', parser.single('featured_image'), async (req, res) => {
  try {
    const { title, slug, excerpt, content, category_id, meta_title, meta_description, tags, status = 'draft' } = req.body;

    const [authors] = await pool.execute('SELECT id FROM authors LIMIT 1');
    const author_id = authors[0].id;

    let featured_image = null;
    if (req.file) {
      const uploadResult = await uploadBufferToCloudinary(req.file.buffer);
      featured_image = uploadResult.secure_url;
    }

    const [result] = await pool.execute(`
      INSERT INTO posts 
      (title, slug, excerpt, content, author_id, category_id, featured_image, meta_title, meta_description, tags, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [title, slug, excerpt, content, author_id, category_id, featured_image, meta_title, meta_description, tags, status]);

    const [newPost] = await pool.execute(`
      SELECT p.*, c.name as category_name 
      FROM posts p 
      LEFT JOIN categories c ON p.category_id = c.id 
      WHERE p.id = ?
    `, [result.insertId]);

    res.status(201).json(newPost[0]);
  } catch (error) {
    console.error('Error creating post:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update post
router.put('/posts/:id', parser.single('featured_image'), async (req, res) => {
  try {
    const { title, slug, excerpt, content, category_id, meta_title, meta_description, tags, status, existing_featured_image } = req.body;

    let featured_image = existing_featured_image || null;
    if (req.file) {
      const uploadResult = await uploadBufferToCloudinary(req.file.buffer);
      featured_image = uploadResult.secure_url;
    }

    await pool.execute(`
      UPDATE posts 
      SET title = ?, slug = ?, excerpt = ?, content = ?, category_id = ?,
          featured_image = ?, meta_title = ?, meta_description = ?, tags = ?, status = ?
      WHERE id = ?
    `, [title, slug, excerpt, content, category_id, featured_image, meta_title, meta_description, tags, status, req.params.id]);

    const [updatedPost] = await pool.execute(`
      SELECT p.*, c.name as category_name 
      FROM posts p 
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.id = ?
    `, [req.params.id]);

    res.json(updatedPost[0]);
  } catch (error) {
    console.error('Error updating post:', error);
    res.status(500).json({ error: error.message, stack: error.stack }); 
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

export default router;
