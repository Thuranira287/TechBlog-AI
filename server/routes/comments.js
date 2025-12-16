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
      `SELECT id FROM posts WHERE id = ? AND status = 'published'`,
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

// Admin: Get all comments (for moderation)
router.get('/', async (req, res) => {
  try {
    const [comments] = await pool.execute(`
      SELECT c.*, p.title as post_title
      FROM comments c
      LEFT JOIN posts p ON c.post_id = p.id
      ORDER BY c.created_at DESC
    `);
    
    res.json(comments);
  } catch (error) {
    console.error('Error fetching all comments:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Admin: Update comment (approve/unapprove)
router.put('/:id', async (req, res) => {
  try {
    const { approved } = req.body;
    await pool.execute('UPDATE comments SET approved = ? WHERE id = ?', [approved, req.params.id]);
    res.json({ message: 'Comment updated successfully' });
  } catch (error) {
    console.error('Error updating comment:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Admin: Delete comment
router.delete('/:id', async (req, res) => {
  try {
    await pool.execute('DELETE FROM comments WHERE id = ?', [req.params.id]);
    res.json({ message: 'Comment deleted successfully' });
  } catch (error) {
    console.error('Error deleting comment:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;