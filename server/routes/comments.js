import express from 'express';
import pool from '../config/db.js';
import { authenticateToken } from '../middleware/auth.js'; 


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

// Get all comments (admin only)
router.get('/admin', authenticateToken, async (req, res) => {
  try {
    console.log('Fetching all comments for admin');
    
    const [comments] = await pool.execute(`
      SELECT c.*, p.title as post_title, p.slug as post_slug
      FROM comments c
      LEFT JOIN posts p ON c.post_id = p.id
      ORDER BY c.created_at DESC
    `);
    
    console.log(`Found ${comments.length} comments`);
    res.json(comments);
  } catch (error) {
    console.error('Error fetching all comments:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update comment status (admin only)
router.put('/admin/:id', authenticateToken, async (req, res) => {
  try {
    const { approved, status } = req.body;
    
    // Check which column exists
    const [columns] = await pool.execute('SHOW COLUMNS FROM comments');
    const hasApprovedColumn = columns.some(col => col.Field === 'approved');
    const hasStatusColumn = columns.some(col => col.Field === 'status');
    
    if (hasApprovedColumn && approved !== undefined) {
      await pool.execute('UPDATE comments SET approved = ? WHERE id = ?', [approved, req.params.id]);
    } else if (hasStatusColumn && status) {
      await pool.execute('UPDATE comments SET status = ? WHERE id = ?', [status, req.params.id]);
    } else {
      return res.status(400).json({ error: 'No valid status field provided' });
    }
    
    res.json({ message: 'Comment updated successfully' });
  } catch (error) {
    console.error('Error updating comment:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete comment (admin only)
router.delete('/admin/:id', authenticateToken, async (req, res) => {
  try {
    await pool.execute('DELETE FROM comments WHERE id = ?', [req.params.id]);
    res.json({ message: 'Comment deleted successfully' });
  } catch (error) {
    console.error('Error deleting comment:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;