router.get('/category/:categorySlug', async (req, res) => {
  try {
    const { categorySlug } = req.params;
    const { full } = req.query; // For AI crawlers
    
    // SIMPLE query - no complex pagination for Edge
    const [category] = await pool.execute(
      `SELECT id, name, slug, description FROM categories WHERE slug = ?`,
      [categorySlug]
    );
    
    if (!category.length) {
      return res.status(404).json({ error: 'Category not found' });
    }
    
    // Get minimal post data (no JOINs if possible)
    const [posts] = await pool.execute(`
      SELECT id, title, slug, excerpt, published_at, author_id,
             (SELECT name FROM authors WHERE id = posts.author_id) as author_name
      FROM posts 
      WHERE category_id = ? AND status = 'published'
      ORDER BY published_at DESC
      LIMIT ${full ? 20 : 6}  // More for AI, less for regular bots
    `, [category[0].id]);
    
    // For AI crawlers, add some content
    if (full === 'true') {
      const postIds = posts.map(p => p.id);
      if (postIds.length > 0) {
        const [contents] = await pool.execute(`
          SELECT id, content FROM posts WHERE id IN (?)
        `, [postIds]);
        
        // Map content to posts
        posts.forEach(post => {
          const content = contents.find(c => c.id === post.id);
          if (content) {
            post.content = content.content.substring(0, 3000); // Limit for performance
          }
        });
      }
    }
    
    res.json({
      category: category[0],
      posts: posts,
      _meta: {
        fetched_at: new Date().toISOString(),
        post_count: posts.length,
        for_edge: true
      }
    });
    
  } catch (error) {
    console.error('[Edge API] Error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      category: {
        name: req.params.categorySlug.replace(/-/g, ' '),
        slug: req.params.categorySlug,
        description: `Technology articles about ${req.params.categorySlug.replace(/-/g, ' ')}`
      },
      posts: []
    });
  }
});