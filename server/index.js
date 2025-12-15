import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import { connectDB, pool } from './config/db.js';
import postsRouter from './routes/posts.js';
import categoriesRouter from './routes/categories.js';
import commentsRouter from './routes/comments.js';
import authRouter from './routes/auth.js';
import adminRouter from './routes/admin.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.set('trust proxy', 1);

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});

// CORS Configuration
const corsOptions = {
  origin: [
    'https://aitechblogs.netlify.app',
    'http://localhost:5173',
    'http://localhost:3000'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
};

//Configure Helmet to allow cross-origin images
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  crossOriginEmbedderPolicy: false,
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      baseUri: ["'self'"],
      fontSrc: ["'self'", "https:", "data:"],
      formAction: ["'self'"],
      frameAncestors: ["'self'", "https://www.google.com"],
      imgSrc: ["'self'", "data:", "https:", "blob:"],
      objectSrc: ["'none'"],
      scriptSrc: ["'self'"],
      scriptSrcAttr: ["'none'"],
      styleSrc: ["'self'", "https:", "'unsafe-inline'"],
      upgradeInsecureRequests: [],
    },
  },
}));

app.use(limiter);
app.use(cors(corsOptions)); // Use CORS before other middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// CORS handling for images
app.use('/uploads', (req, res, next) => {
  // Set CORS headers specifically for images
  res.header('Access-Control-Allow-Origin', 'https://aitechblogs.netlify.app');
  res.header('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.header('Access-Control-Allow-Credentials', 'true');
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  next();
});

// Serve uploaded files statically - AFTER the CORS middleware
app.use('/uploads', express.static('uploads'));

// Routes
app.use('/api/posts', postsRouter);
app.use('/api/categories', categoriesRouter);
app.use('/api/comments', commentsRouter);
app.use('/api/auth', authRouter);
app.use('/api/admin', adminRouter);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV 
  });
});

// Sitemap generator
app.get('/sitemap.xml', async (req, res) => {
  try {
    const [posts] = await pool.execute(
      'SELECT slug, updated_at FROM posts WHERE status = "published" ORDER BY published_at DESC'
    );
    
    const baseUrl = process.env.FRONTEND_URL || 'https://aitechblogs.netlify.app';
    
    let sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${baseUrl}</loc>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>`;
    
    posts.forEach(post => {
      sitemap += `
  <url>
    <loc>${baseUrl}/post/${post.slug}</loc>
    <lastmod>${new Date(post.updated_at).toISOString().split('T')[0]}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`;
    });
    
    sitemap += '\n</urlset>';
    
    res.set('Content-Type', 'text/xml');
    res.send(sitemap);
  } catch (error) {
    console.error('Error generating sitemap:', error);
    res.status(500).send('Error generating sitemap');
  }
});

// Robots.txt
app.get('/robots.txt', (req, res) => {
  const robots = `User-agent: *
Allow: /
Sitemap: ${process.env.FRONTEND_URL || 'https://aitechblogs.netlify.app'}/sitemap.xml`;
  
  res.set('Content-Type', 'text/plain');
  res.send(robots);
});

// Debug endpoints
app.get('/api/debug/db', async (req, res) => {
  try {
    const [categories] = await pool.execute('SELECT * FROM categories');
    const [posts] = await pool.execute('SELECT * FROM posts');
    const [authors] = await pool.execute('SELECT * FROM authors');
    
    res.json({
      categories,
      posts,
      authors,
      stats: {
        totalCategories: categories.length,
        totalPosts: posts.length,
        totalAuthors: authors.length
      }
    });
  } catch (error) {
    console.error('Database debug error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/test-db', async (req, res) => {
  try {
    const [posts] = await pool.execute('SELECT COUNT(*) as count FROM posts');
    const [categories] = await pool.execute('SELECT COUNT(*) as count FROM categories');
    
    res.json({
      posts: posts[0].count,
      categories: categories[0].count,
      status: 'Database connection successful'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Error handling
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Start server
const startServer = async () => {
  try {
    await connectDB();
    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📝 API available at http://localhost:${PORT}/api`);
      console.log(`🗺️ Sitemap at http://localhost:${PORT}/sitemap.xml`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();