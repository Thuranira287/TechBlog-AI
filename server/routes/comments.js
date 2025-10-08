import express from 'express';
import pool from '../config/db.js';

const router = express.Router();

// GET comments for a post
router.get('/post/:postId', async (req, res) => {
  try {
    const [comments] = await pool.execute(
      `SELECT * FROM comments 
       WHERE post_id = ? AND status = 'approved'
       ORDER BY created_at DESC`,
      [req.params.postId]
    );
    res.json(comments);
  } catch (error) {
    console.error('Error fetching comments:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST new comment
router.post('/', async (req, res) => {
  try {
    const { post_id, author_name, author_email, content } = req.body;

    if (!post_id || !author_name || !author_email || !content) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    // Verify post exists
    const [posts] = await pool.execute(
      'SELECT id FROM posts WHERE id = ? AND status = "published"',
      [post_id]
    );

    if (posts.length === 0) {
      return res.status(404).json({ error: 'Post not found' });
    }

    const [result] = await pool.execute(
      `INSERT INTO comments (post_id, author_name, author_email, content, status)
       VALUES (?, ?, ?, ?, 'pending')`,
      [post_id, author_name, author_email, content]
    );

    res.status(201).json({
      id: result.insertId,
      message: 'Comment submitted for moderation'
    });
  } catch (error) {
    console.error('Error creating comment:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;