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

// POST reaction to comment
router.post('/:id/reactions', async (req, res) => {
  try {
    const { type, user_email } = req.body;
    const commentId = req.params.id;

    if (!type || !user_email) {
      return res.status(400).json({ error: 'Type and user_email are required' });
    }

    if (type !== 'like' && type !== 'dislike') {
      return res.status(400).json({ error: 'Invalid reaction type' });
    }

    // Start transaction
    await pool.execute('START TRANSACTION');

    try {
      // Check if user already reacted to this comment
      const [existingReactions] = await pool.execute(
        'SELECT type FROM reactions WHERE comment_id = ? AND user_email = ?',
        [commentId, user_email]
      );

      if (existingReactions.length > 0) {
        const existingType = existingReactions[0].type;
        
        // If same reaction, remove it
        if (existingType === type) {
          // Remove reaction
          await pool.execute(
            'DELETE FROM reactions WHERE comment_id = ? AND user_email = ?',
            [commentId, user_email]
          );
          
          // Decrement count
          const column = type === 'like' ? 'likes' : 'dislikes';
          await pool.execute(
            `UPDATE comments SET ${column} = GREATEST(0, ${column} - 1) WHERE id = ?`,
            [commentId]
          );
        } else {
          // Change reaction from like to dislike or vice versa
          // Remove old reaction
          await pool.execute(
            'DELETE FROM reactions WHERE comment_id = ? AND user_email = ?',
            [commentId, user_email]
          );
          
          // Decrement old reaction count
          const oldColumn = existingType === 'like' ? 'likes' : 'dislikes';
          await pool.execute(
            `UPDATE comments SET ${oldColumn} = GREATEST(0, ${oldColumn} - 1) WHERE id = ?`,
            [commentId]
          );
          
          // Add new reaction
          await pool.execute(
            'INSERT INTO reactions (comment_id, user_email, type) VALUES (?, ?, ?)',
            [commentId, user_email, type]
          );
          
          // Increment new reaction count
          const newColumn = type === 'like' ? 'likes' : 'dislikes';
          await pool.execute(
            `UPDATE comments SET ${newColumn} = ${newColumn} + 1 WHERE id = ?`,
            [commentId]
          );
        }
      } else {
        // Add new reaction
        await pool.execute(
          'INSERT INTO reactions (comment_id, user_email, type) VALUES (?, ?, ?)',
          [commentId, user_email, type]
        );
        
        // Increment count
        const column = type === 'like' ? 'likes' : 'dislikes';
        await pool.execute(
          `UPDATE comments SET ${column} = ${column} + 1 WHERE id = ?`,
          [commentId]
        );
      }

      // Get updated comment
      const [updatedComments] = await pool.execute(
        'SELECT id, likes, dislikes FROM comments WHERE id = ?',
        [commentId]
      );

      await pool.execute('COMMIT');

      res.json({
        success: true,
        comment: updatedComments[0],
        message: existingReactions.length > 0 ? 'Reaction updated' : 'Reaction added'
      });

    } catch (error) {
      await pool.execute('ROLLBACK');
      throw error;
    }

  } catch (error) {
    console.error('Error handling reaction:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET reaction status for a user
router.get('/:id/reactions/:user_email', async (req, res) => {
  try {
    const [reactions] = await pool.execute(
      'SELECT type FROM reactions WHERE comment_id = ? AND user_email = ?',
      [req.params.id, req.params.user_email]
    );

    res.json({
      hasReacted: reactions.length > 0,
      type: reactions.length > 0 ? reactions[0].type : null
    });
  } catch (error) {
    console.error('Error fetching reaction:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;