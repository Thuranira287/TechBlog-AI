import express from 'express';
import pool from '../config/db.js';
import { authenticateToken } from '../middleware/auth.js'; 

const router = express.Router();

// Helper function to organize comments hierarchically
const organizeCommentsHierarchy = (comments) => {
  const commentMap = {};
  const rootComments = [];
  
  // First pass: Store all comments in a map
  comments.forEach(comment => {
    comment.replies = [];
    commentMap[comment.id] = comment;
  });
  
  // Second pass: Build hierarchy
  comments.forEach(comment => {
    if (comment.parent_id) {
      // This is a reply
      const parent = commentMap[comment.parent_id];
      if (parent) {
        parent.replies.push(comment);
      } else {
        // If parent not found, treat as root comment
        rootComments.push(comment);
      }
    } else {
      // This is a root comment
      rootComments.push(comment);
    }
  });
  
  return rootComments;
};

// ========== PUBLIC ROUTES ==========

// GET comments for a post - UPDATED with hierarchy and reactions
router.get('/post/:postId', async (req, res) => {
  try {
    const [comments] = await pool.execute(
      `SELECT c.*, 
       COALESCE(c.likes, 0) as likes,
       COALESCE(c.dislikes, 0) as dislikes
       FROM comments c
       WHERE post_id = ? AND status = 'approved'
       ORDER BY 
         CASE WHEN parent_id IS NULL THEN 0 ELSE 1 END,
         created_at ASC`,
      [req.params.postId]
    );
    
    // Organize comments into hierarchy
    const organizedComments = organizeCommentsHierarchy(comments);
    
    res.json(organizedComments);
  } catch (error) {
    console.error('Error fetching comments:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST new comment
router.post('/', async (req, res) => {
  try {
    const { post_id, author_name, author_email, content, parent_id = null } = req.body;

    if (!post_id || !author_name || !author_email || !content) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    const [posts] = await pool.execute(
      `SELECT id FROM posts WHERE id = ? AND status = 'published'`,
      [post_id]
    );

    if (posts.length === 0) {
      return res.status(404).json({ error: 'Post not found' });
    }

    const [result] = await pool.execute(
      `INSERT INTO comments (post_id, author_name, author_email, content, parent_id, status, likes, dislikes)
       VALUES (?, ?, ?, ?, ?, 'pending', 0, 0)`,
      [post_id, author_name, author_email, content, parent_id]
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

// POST reaction to comment - KEEP ONLY ONE VERSION
router.post('/:id/reactions', async (req, res) => {
  let connection;
  try {
    const { type, user_email } = req.body;
    const commentId = req.params.id;

    if (!type || !user_email) {
      return res.status(400).json({ error: 'Type and user_email are required' });
    }

    if (type !== 'like' && type !== 'dislike') {
      return res.status(400).json({ error: 'Invalid reaction type' });
    }

    connection = await pool.getConnection();
    await connection.execute('START TRANSACTION');

    try {
      const [existingReactions] = await connection.execute(
        'SELECT type FROM reactions WHERE comment_id = ? AND user_email = ?',
        [commentId, user_email]
      );

      if (existingReactions.length > 0) {
        const existingType = existingReactions[0].type;
        
        if (existingType === type) {
          // Remove reaction
          await connection.execute(
            'DELETE FROM reactions WHERE comment_id = ? AND user_email = ?',
            [commentId, user_email]
          );
          
          const column = type === 'like' ? 'likes' : 'dislikes';
          await connection.execute(
            `UPDATE comments SET ${column} = GREATEST(0, ${column} - 1) WHERE id = ?`,
            [commentId]
          );
        } else {
          // Change reaction
          await connection.execute(
            'DELETE FROM reactions WHERE comment_id = ? AND user_email = ?',
            [commentId, user_email]
          );
          
          const oldColumn = existingType === 'like' ? 'likes' : 'dislikes';
          await connection.execute(
            `UPDATE comments SET ${oldColumn} = GREATEST(0, ${oldColumn} - 1) WHERE id = ?`,
            [commentId]
          );
          
          await connection.execute(
            'INSERT INTO reactions (comment_id, user_email, type) VALUES (?, ?, ?)',
            [commentId, user_email, type]
          );
          
          const newColumn = type === 'like' ? 'likes' : 'dislikes';
          await connection.execute(
            `UPDATE comments SET ${newColumn} = ${newColumn} + 1 WHERE id = ?`,
            [commentId]
          );
        }
      } else {
        // New reaction
        await connection.execute(
          'INSERT INTO reactions (comment_id, user_email, type) VALUES (?, ?, ?)',
          [commentId, user_email, type]
        );
        
        const column = type === 'like' ? 'likes' : 'dislikes';
        await connection.execute(
          `UPDATE comments SET ${column} = ${column} + 1 WHERE id = ?`,
          [commentId]
        );
      }

      const [updatedComments] = await connection.execute(
        'SELECT id, likes, dislikes FROM comments WHERE id = ?',
        [commentId]
      );

      await connection.execute('COMMIT');
      res.json({
        success: true,
        comment: updatedComments[0],
        message: existingReactions.length > 0 ? 'Reaction updated' : 'Reaction added'
      });

    } catch (error) {
      await connection.execute('ROLLBACK');
      throw error;
    }
  } catch (error) {
    console.error('Error handling reaction:', error);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    if (connection) connection.release();
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

// ========== ADMIN ROUTES (Protected) ==========

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