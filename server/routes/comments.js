import express from 'express';
import pool from '../config/db.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

/* -----------------------------
   VALIDATION FUNCTIONS
----------------------------- */
const validateCommentData = (data) => {
  const { post_id, author_name, author_email, content } = data;
  const errors = [];
  
  if (!post_id) errors.push('Post ID is required');
  if (!author_name?.trim()) errors.push('Name is required');
  if (!author_email?.trim()) errors.push('Email is required');
  if (!content?.trim()) errors.push('Comment content is required');
  
  // Email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (author_email && !emailRegex.test(author_email)) {
    errors.push('Invalid email format');
  }
  
  return errors;
};

const validateReactionData = (data) => {
  const { type, user_email } = data;
  const errors = [];
  
  if (!type || !['like', 'dislike'].includes(type)) {
    errors.push('Reaction type must be "like" or "dislike"');
  }
  
  if (!user_email?.trim()) {
    errors.push('User email is required');
  }
  
  return errors;
};

/* -----------------------------
   HELPER FUNCTIONS
----------------------------- */
const getUpdatedComment = async (commentId) => {
  const [updated] = await pool.execute(
    'SELECT id, likes, dislikes FROM comments WHERE id = ?',
    [commentId]
  );
  return updated[0];
};

/* -----------------------------
   PUBLIC ROUTES
----------------------------- */

// GET comments for a post
router.get('/post/:postId', async (req, res) => {
  try {
    const { postId } = req.params;
    process.env.NODE_ENV === 'development' &&
    console.log(`📋 Fetching comments for post ${postId}`);
    
    const [comments] = await pool.execute(
      `SELECT c.*, 
              COALESCE(c.likes, 0) AS likes, 
              COALESCE(c.dislikes, 0) AS dislikes
       FROM comments c
       WHERE c.post_id = ? AND c.status = 'approved'
       ORDER BY 
         CASE WHEN parent_id IS NULL THEN 0 ELSE 1 END,
         created_at ASC`,
      [postId]
    );

    process.env.NODE_ENV === 'development' &&
    console.log(`Found ${comments.length} comments for post ${postId}`);
    res.json(comments);
  } catch (err) {
    process.env.NODE_ENV === 'development' && console.error('❌ Error fetching comments:', err);
    res.status(500).json({ 
      error: 'Failed to fetch comments',
      message: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
});

// POST new comment or reply
router.post('/', async (req, res) => {
  const connection = await pool.getConnection();
  
  try {
    const { post_id, author_name, author_email, content, parent_id = null } = req.body;

    // Validate input
    const validationErrors = validateCommentData(req.body);
    if (validationErrors.length > 0) {
      return res.status(400).json({ 
        error: 'Validation failed',
        details: validationErrors 
      });
    }

    await connection.beginTransaction();

    // Check if post exists and is published
    const [posts] = await connection.execute(
      `SELECT id FROM posts WHERE id = ? AND status = 'published'`,
      [post_id]
    );
    
    if (!posts.length) {
      await connection.rollback();
      return res.status(404).json({ error: 'Post not found or not published' });
    }

    // Insert comment
    const [result] = await connection.execute(
      `INSERT INTO comments 
       (post_id, author_name, author_email, content, parent_id, status, likes, dislikes)
       VALUES (?, ?, ?, ?, ?, 'pending', 0, 0)`,
      [post_id, author_name.trim(), author_email.trim(), content.trim(), parent_id]
    );

    await connection.commit();

    res.status(201).json({ 
      id: result.insertId, 
      message: 'Comment submitted for moderation' 
    });
  } catch (err) {
    await connection.rollback();
    console.error('❌ Error creating comment:', err);
    res.status(500).json({ 
      error: 'Failed to create comment',
      message: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  } finally {
    connection.release();
  }
});

// POST reaction to comment
router.post('/:id/reactions', async (req, res) => {
  const connection = await pool.getConnection();
  
  try {
    const { type, user_email } = req.body;
    const commentId = req.params.id;

    // Validate input
    const validationErrors = validateReactionData(req.body);
    if (validationErrors.length > 0) {
      return res.status(400).json({ 
        error: 'Validation failed',
        details: validationErrors 
      });
    }

    await connection.beginTransaction();

    // Check if comment exists
    const [comments] = await connection.execute(
      `SELECT id FROM comments WHERE id = ? AND status = 'approved'`,
      [commentId]
    );
    
    if (!comments.length) {
      await connection.rollback();
      return res.status(404).json({ error: 'Comment not found or not approved' });
    }

    // Check existing reaction
    const [existing] = await connection.execute(
      'SELECT type FROM reactions WHERE comment_id = ? AND user_email = ?',
      [commentId, user_email.trim()]
    );

    let action = 'created';
    
    if (existing.length > 0) {
      const oldType = existing[0].type;
      
      if (oldType === type) {
        // Remove reaction (toggle off)
        await connection.execute(
          'DELETE FROM reactions WHERE comment_id = ? AND user_email = ?',
          [commentId, user_email.trim()]
        );
        
        await connection.execute(
          `UPDATE comments SET ${type}s = GREATEST(0, ${type}s - 1) WHERE id = ?`,
          [commentId]
        );
        
        action = 'removed';
      } else {
        // Change reaction type
        // Remove old reaction
        await connection.execute(
          'DELETE FROM reactions WHERE comment_id = ? AND user_email = ?',
          [commentId, user_email.trim()]
        );
        
        // Decrement old reaction count
        const oldColumn = oldType === 'like' ? 'likes' : 'dislikes';
        await connection.execute(
          `UPDATE comments SET ${oldColumn} = GREATEST(0, ${oldColumn} - 1) WHERE id = ?`,
          [commentId]
        );
        
        // Add new reaction
        await connection.execute(
          'INSERT INTO reactions (comment_id, user_email, type) VALUES (?, ?, ?)',
          [commentId, user_email.trim(), type]
        );
        
        // Increment new reaction count
        const newColumn = type === 'like' ? 'likes' : 'dislikes';
        await connection.execute(
          `UPDATE comments SET ${newColumn} = ${newColumn} + 1 WHERE id = ?`,
          [commentId]
        );
        
        action = 'changed';
      }
    } else {
      // New reaction
      await connection.execute(
        'INSERT INTO reactions (comment_id, user_email, type) VALUES (?, ?, ?)',
        [commentId, user_email.trim(), type]
      );
      
      const column = type === 'like' ? 'likes' : 'dislikes';
      await connection.execute(
        `UPDATE comments SET ${column} = ${column} + 1 WHERE id = ?`,
        [commentId]
      );
    }

    await connection.commit();

    // Return updated comment
    const updatedComment = await getUpdatedComment(commentId);
    
    res.json({ 
      success: true, 
      action,
      type,
      comment: updatedComment
    });

  } catch (err) {
    await connection.rollback();
    console.error('❌ Error handling reaction:', err);
    
    // Handle specific MySQL errors
    let statusCode = 500;
    let errorMessage = 'Failed to process reaction';
    
    if (err.code === 'ER_NO_REFERENCED_ROW_2') {
      statusCode = 404;
      errorMessage = 'Comment not found';
    }
    
    res.status(statusCode).json({ 
      error: errorMessage,
      message: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  } finally {
    connection.release();
  }
});

// GET reaction status for a user
router.get('/:id/reactions/:user_email', async (req, res) => {
  try {
    const { id, user_email } = req.params;
    
    const [reactions] = await pool.execute(
      'SELECT type FROM reactions WHERE comment_id = ? AND user_email = ?',
      [id, user_email]
    );
    
    res.json({ 
      hasReacted: reactions.length > 0, 
      type: reactions.length ? reactions[0].type : null 
    });
  } catch (err) {
    console.error('❌ Error fetching reaction:', err);
    res.status(500).json({ 
      error: 'Failed to fetch reaction status',
      message: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
});

/* -----------------------------
   ADMIN ROUTES (Protected)
----------------------------- */
router.use('/admin', authenticateToken);

router.get('/admin', async (req, res) => {
  try {
    const [comments] = await pool.execute(
      `SELECT c.*, 
              p.title AS post_title, 
              p.slug AS post_slug,
              COUNT(r.id) AS total_reactions
       FROM comments c
       LEFT JOIN posts p ON c.post_id = p.id
       LEFT JOIN reactions r ON c.id = r.comment_id
       GROUP BY c.id
       ORDER BY c.created_at DESC`
    );
    res.json(comments);
  } catch (err) {
    console.error('❌ Error fetching admin comments:', err);
    res.status(500).json({ 
      error: 'Failed to fetch comments',
      message: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
});

router.put('/admin/:id', async (req, res) => {
  const connection = await pool.getConnection();
  
  try {
    const { id } = req.params;
    const { status, admin_notes } = req.body;
    
    if (!status || !['approved', 'rejected', 'pending'].includes(status)) {
      return res.status(400).json({ 
        error: 'Valid status is required (approved, rejected, pending)' 
      });
    }

    await connection.beginTransaction();

    const [result] = await connection.execute(
      'UPDATE comments SET status = ?, admin_notes = ? WHERE id = ?',
      [status, admin_notes || null, id]
    );

    if (result.affectedRows === 0) {
      await connection.rollback();
      return res.status(404).json({ error: 'Comment not found' });
    }

    await connection.commit();
    
    res.json({ 
      message: 'Comment updated successfully',
      status,
      id 
    });
  } catch (err) {
    await connection.rollback();
    console.error('❌ Error updating comment:', err);
    res.status(500).json({ 
      error: 'Failed to update comment',
      message: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  } finally {
    connection.release();
  }
});

router.delete('/admin/:id', async (req, res) => {
  const connection = await pool.getConnection();
  
  try {
    const { id } = req.params;
    
    await connection.beginTransaction();

    // First delete reactions to maintain referential integrity
    await connection.execute(
      'DELETE FROM reactions WHERE comment_id = ?',
      [id]
    );

    // Then delete the comment
    const [result] = await connection.execute(
      'DELETE FROM comments WHERE id = ?',
      [id]
    );

    if (result.affectedRows === 0) {
      await connection.rollback();
      return res.status(404).json({ error: 'Comment not found' });
    }

    await connection.commit();
    
    res.json({ 
      message: 'Comment and associated reactions deleted successfully',
      id 
    });
  } catch (err) {
    await connection.rollback();
    console.error('❌ Error deleting comment:', err);
    res.status(500).json({ 
      error: 'Failed to delete comment',
      message: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  } finally {
    connection.release();
  }
});

// GET comment statistics
router.get('/admin/stats', authenticateToken, async (req, res) => {
  try {
    const [stats] = await pool.execute(
      `SELECT 
        COUNT(*) as total_comments,
        SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) as approved,
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
        SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) as rejected,
        SUM(likes) as total_likes,
        SUM(dislikes) as total_dislikes
       FROM comments`
    );
    
    res.json(stats[0]);
  } catch (err) {
    process.env.NODE_ENV === 'development' && console.error('❌ Error fetching comment stats:', err);
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
});

// Health check endpoint
router.get('/health', (req, res) => {
  res.json({ 
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'Comments API'
  });
});

export default router;