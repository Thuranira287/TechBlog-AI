import express from 'express';
import pool from '../config/db.js';
import { authenticateToken } from '../middleware/auth.js';
import { parser, uploadBufferToCloudinary } from "../config/cloudinary.js";
import { submitSitemapToSearchEngines, submitUrlToIndexNow } from "../utils/sitemapSubmitter.js";

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
    process.env.NODE_ENV === 'development' &&
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
    process.env.NODE_ENV === 'development' &&
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
    process.env.NODE_ENV === 'development' &&
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
      fb_title, fb_description, twitter_image, fb_image,
      tags, status = 'draft' 
    } = req.body;

    // Debug logging
    if (process.env.NODE_ENV !== 'production') {
    console.log('📝 Received post data:', {
      title: title?.substring(0, 50),
      slug,
      category_id,
      hasFile: !!req.file,
      tags: tags?.substring(0, 100)
    });}

    // Validate required fields
    if (!title || !slug || !content || !category_id) {
      process.env.NODE_ENV !== 'production' &&
      console.error('Missing required fields');
      return res.status(400).json({
        error: 'Missing required fields',
        required: ['title', 'slug', 'content', 'category_id'],
        received: { title: !!title, slug: !!slug, content: !!content, category_id: !!category_id }
      });
    }

    // Get default author
    const [authors] = await pool.execute('SELECT id FROM authors LIMIT 1');
    const author_id = authors[0]?.id;
    
    if (!author_id) {
      process.env.NODE_ENV !== 'production' &&
      console.error('No author found in database');
      return res.status(500).json({ error: 'No author configured in system' });
    }

    // Handle featured image
    let featured_image = null;
    if (req.file) {
      try {
        process.env.NODE_ENV !== 'production' &&
        console.log('Uploading featured image...');
        const uploadResult = await uploadBufferToCloudinary(req.file.buffer);
        featured_image = uploadResult.secure_url;
        process.env.NODE_ENV !== 'production' &&
        console.log('Image uploaded:', featured_image);
      } catch (uploadError) {
        process.env.NODE_ENV !== 'production' &&
        console.error('Image upload failed:', uploadError);
      }
    }

    // Parse tags safely - handle both JSON string and comma-separated
    let parsedTags = [];
    if (tags) {
      try {
        if (typeof tags === 'string' && tags.trim().startsWith('[')) {
          parsedTags = JSON.parse(tags);
        } else {
          parsedTags = tags.split(',').map(t => t.trim()).filter(t => t);
        }
      } catch (e) {
        process.env.NODE_ENV !== 'production' &&
        console.warn('⚠️ Tag parsing failed, using as is:', e.message);
        parsedTags = [tags];
      }
    }

    // CONVERT ALL UNDEFINED VALUES TO NULL
    const safeValues = {
      title: title || null,
      slug: slug || null,
      excerpt: excerpt || null,
      content: content || null,
      author_id: parseInt(author_id),
      category_id: parseInt(category_id),
      featured_image: featured_image || null,
      meta_title: meta_title || null,
      meta_description: meta_description || null,
      keywords: keywords || null,
      og_title: og_title || null,
      og_description: og_description || null,
      twitter_title: twitter_title || null,
      twitter_description: twitter_description || null,
      twitter_image: twitter_image || null,
      fb_title: fb_title || null,
      fb_description: fb_description || null,
      fb_image: fb_image || null,
      tags: JSON.stringify(parsedTags),
      status: status || 'draft',
      view_count: 0
    };
    Object.entries(safeValues).forEach(([key, value]) => {
      process.env.NODE_ENV !== 'production' &&
      console.log(`  ${key}: ${value === null ? 'NULL' : typeof value === 'string' ? `"${value.substring(0, 30)}..."` : value}`);
    });

    // INSERT QUERY TABLE STRUCTURE
    const [result] = await pool.execute(`
      INSERT INTO posts 
      (title, slug, excerpt, content, author_id, category_id, featured_image, 
       meta_title, meta_description, keywords,
       og_title, og_description, twitter_title, twitter_description,
       twitter_image, fb_title, fb_description, fb_image,
       tags, status, view_count, published_at, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 
              CASE WHEN ? = 'published' THEN NOW() ELSE NULL END, 
              NOW(), NOW())
    `, [
      safeValues.title,
      safeValues.slug,
      safeValues.excerpt,
      safeValues.content,
      safeValues.author_id,
      safeValues.category_id,
      safeValues.featured_image,
      safeValues.meta_title,
      safeValues.meta_description,
      safeValues.keywords,
      safeValues.og_title,
      safeValues.og_description,
      safeValues.twitter_title,
      safeValues.twitter_description,
      safeValues.twitter_image,
      safeValues.fb_title,
      safeValues.fb_description,
      safeValues.fb_image,
      safeValues.tags,
      safeValues.status,
      safeValues.view_count,
      safeValues.status  // For published_at conditional
    ]);
    process.env.NODE_ENV !== 'production' &&
    console.log(`Post created with ID: ${result.insertId}`);
    // Fetch the created post with joins
    const [newPost] = await pool.execute(`
      SELECT p.*, 
             c.name as category_name, 
             c.slug as category_slug,
             a.name as author_name,
             a.email as author_email
      FROM posts p 
      LEFT JOIN categories c ON p.category_id = c.id 
      LEFT JOIN authors a ON p.author_id = a.id
      WHERE p.id = ?
    `, [result.insertId]);

    if (!newPost.length) {
      throw new Error('Failed to retrieve created post');
    }

    // Parse tags back
    const postWithTags = {
      ...newPost[0],
      tags: typeof newPost[0].tags === 'string' ? JSON.parse(newPost[0].tags) : newPost[0].tags || []
    };
    // SEO: Notify search engines ONLY if published
    if (safeValues.status === "published") {
      const postUrl = `https://aitechblogs.netlify.app/post/${safeValues.slug}`;

      // Fire-and-forget (no await → no slowdown)
      submitSitemapToSearchEngines().catch(() => {});
      submitUrlToIndexNow(postUrl).catch(() => {});
      process.env.NODE_ENV !== 'production' &&
      console.log("SEO ping sent for new post:", postUrl);
    }

    res.status(201).json({
      success: true,
      message: 'Post created successfully',
      post: postWithTags
    });

  } catch (error) {
    process.env.NODE_ENV !== 'production' &&
    console.error('Error creating post:', error);
    
    // Enhanced error handling
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({
        error: 'Duplicate entry',
        details: 'A post with this slug already exists',
        suggestion: 'Try a different slug'
      });
    } else if (error.message.includes('Bind parameters must not contain undefined')) {
      return res.status(400).json({
        error: 'Invalid data',
        details: 'Some fields contain undefined values',
        solution: 'Ensure all optional fields are either provided or omitted (not undefined)'
      });
    } else if (error.message.includes('foreign key constraint')) {
      return res.status(400).json({
        error: 'Invalid reference',
        details: 'The category or author does not exist',
        solution: 'Check that category_id and author_id are valid'
      });
    }

    res.status(500).json({ 
      error: 'Failed to create post',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Update post
router.put('/posts/:id', parser.single('featured_image'), async (req, res) => {
  try {
    const { 
      title, slug, excerpt, content, category_id, 
      meta_title, meta_description, keywords,
      og_title, og_description, twitter_title, twitter_description,
      fb_title, fb_description, twitter_image, fb_image,
      tags, status, existing_featured_image 
    } = req.body;
    process.env.NODE_ENV !== 'production' &&
    console.log('Updating post ID:', req.params.id);

    // Get existing post first
    const [existingPosts] = await pool.execute('SELECT * FROM posts WHERE id = ?', [req.params.id]);
    if (!existingPosts.length) {
      return res.status(404).json({ error: 'Post not found' });
    }
    
    const existingPost = existingPosts[0];
    const wasJustPublished = existingPost.status !== "published" && status === "published";

    // Handle featured image
    let featured_image = existing_featured_image || existingPost.featured_image;
    if (req.file) {
      try {
        const uploadResult = await uploadBufferToCloudinary(req.file.buffer);
        featured_image = uploadResult.secure_url;
      } catch (uploadError) {
        console.error('Image upload failed:', uploadError);
      }
    }

    // Parse tags
    let parsedTags = [];
    if (tags !== undefined) {
      try {
        if (typeof tags === 'string' && tags.trim().startsWith('[')) {
          parsedTags = JSON.parse(tags);
        } else {
          parsedTags = tags.split(',').map(t => t.trim()).filter(t => t);
        }
      } catch (e) {
        parsedTags = typeof existingPost.tags === 'string' ? JSON.parse(existingPost.tags) : existingPost.tags || [];
      }
    } else {
      parsedTags = typeof existingPost.tags === 'string' ? JSON.parse(existingPost.tags) : existingPost.tags || [];
    }

    // Prepare update values
    const updateValues = {
      title: title || existingPost.title,
      slug: slug || existingPost.slug,
      excerpt: excerpt !== undefined ? excerpt : existingPost.excerpt,
      content: content || existingPost.content,
      category_id: category_id || existingPost.category_id,
      featured_image: featured_image,
      meta_title: meta_title !== undefined ? meta_title : existingPost.meta_title,
      meta_description: meta_description !== undefined ? meta_description : existingPost.meta_description,
      keywords: keywords !== undefined ? keywords : existingPost.keywords,
      og_title: og_title !== undefined ? og_title : existingPost.og_title,
      og_description: og_description !== undefined ? og_description : existingPost.og_description,
      twitter_title: twitter_title !== undefined ? twitter_title : existingPost.twitter_title,
      twitter_description: twitter_description !== undefined ? twitter_description : existingPost.twitter_description,
      twitter_image: twitter_image !== undefined ? twitter_image : existingPost.twitter_image,
      fb_title: fb_title !== undefined ? fb_title : existingPost.fb_title,
      fb_description: fb_description !== undefined ? fb_description : existingPost.fb_description,
      fb_image: fb_image !== undefined ? fb_image : existingPost.fb_image,
      tags: JSON.stringify(parsedTags),
      status: status || existingPost.status
    };
    await pool.execute(`
      UPDATE posts 
      SET title = ?, slug = ?, excerpt = ?, content = ?, category_id = ?,
          featured_image = ?, meta_title = ?, meta_description = ?, keywords = ?,
          og_title = ?, og_description = ?, twitter_title = ?, twitter_description = ?,
          twitter_image = ?, fb_title = ?, fb_description = ?, fb_image = ?,
          tags = ?, status = ?, updated_at = NOW()
      WHERE id = ?
    `, [
      updateValues.title,
      updateValues.slug,
      updateValues.excerpt,
      updateValues.content,
      updateValues.category_id,
      updateValues.featured_image,
      updateValues.meta_title,
      updateValues.meta_description,
      updateValues.keywords,
      updateValues.og_title,
      updateValues.og_description,
      updateValues.twitter_title,
      updateValues.twitter_description,
      updateValues.twitter_image,
      updateValues.fb_title,
      updateValues.fb_description,
      updateValues.fb_image,
      updateValues.tags,
      updateValues.status,
      req.params.id
    ]);

    // Fetch updated post
    const [updatedPost] = await pool.execute(`
      SELECT p.*, c.name as category_name 
      FROM posts p 
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.id = ?
    `, [req.params.id]);
    // SEO: Notify search engines if post was just published
    if (wasJustPublished) {
      const postUrl = `https://aitechblogs.netlify.app/post/${updateValues.slug}`;

      submitSitemapToSearchEngines().catch(() => {});
      submitUrlToIndexNow(postUrl).catch(() => {});
      process.env.NODE_ENV !== 'production' &&
      console.log("SEO ping sent for published update:", postUrl);
    }

    res.json({
      success: true,
      message: 'Post updated successfully',
      post: {
        ...updatedPost[0],
        tags: parsedTags
      }
    });
  } catch (error) {
    process.env.NODE_ENV === 'development' &&
    console.error('Error updating post:', error);
    res.status(500).json({ 
      error: 'Failed to update post',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Delete post
router.delete('/posts/:id', async (req, res) => {
  try {
    await pool.execute('DELETE FROM posts WHERE id = ?', [req.params.id]);
    res.json({ message: 'Post deleted successfully' });
  } catch (error) {
    process.env.NODE_ENV === 'development' &&
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
    process.env.NODE_ENV === 'development' &&
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
    process.env.NODE_ENV === 'development' &&
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
    process.env.NODE_ENV === 'development' &&
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
    process.env.NODE_ENV === 'development' &&
    console.error('Error updating comment:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/comments/:id', async (req, res) => {
  try {
    await pool.execute('DELETE FROM comments WHERE id = ?', [req.params.id]);
    res.json({ message: 'Comment deleted successfully' });
  } catch (error) {
    process.env.NODE_ENV === 'development' &&
    console.error('Error deleting comment:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;