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
import jobsRouter from './routes/jobs.js';

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
    'http://localhost:3000',
    'http://localhost:8888'
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
app.use('/api/admin', (req, res, next) => {
  console.log(`🛣️  Route hit: ${req.method} ${req.path}`);
  console.log(`📡 Original URL: ${req.originalUrl}`);
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
if (process.env.NODE_ENV === 'development') {
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
}

if (process.env.NODE_ENV !== 'production') {
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
}

// Error handling
app.use((err, req, res, next) => {
  if (process.env.NODE_ENV !== 'production') {
    console.error(err.stack);
  } else {
    console.error(err.message);
  }

  res.status(500).json({ error: 'Something went wrong!' });
});

// ====== Stats Endpoint ======
app.get('/api/stats', async (req, res) => {
  try {
    // Get monthly visitors (last 30 days)
    const [visitorResult] = await pool.execute(`
      SELECT COUNT(DISTINCT ip_address) as monthly_visitors
      FROM analytics 
      WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
    `);
    
    // Get affiliate clicks (last 30 days)
    const [affiliateResult] = await pool.execute(`
      SELECT affiliate_name as name, 
             COUNT(*) as clicks,
             ROUND((COUNT(*) * 100.0 / NULLIF(SUM(impressions), 0)), 1) as conversion_rate
      FROM affiliate_clicks
      WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
      GROUP BY affiliate_name
      ORDER BY clicks DESC
      LIMIT 5
    `);
    
    // Get total posts
    const [postsResult] = await pool.execute(
      'SELECT COUNT(*) as total_posts FROM posts WHERE status = "published"'
    );
    
    // Get total categories
    const [categoriesResult] = await pool.execute(
      'SELECT COUNT(*) as total_categories FROM categories'
    );
    
    // Get top categories
    const [topCategories] = await pool.execute(`
      SELECT c.name, COUNT(p.id) as post_count
      FROM categories c
      LEFT JOIN posts p ON c.id = p.category_id AND p.status = 'published'
      GROUP BY c.id
      ORDER BY post_count DESC
      LIMIT 5
    `);

    res.json({
      success: true,
      data: {
        monthlyVisitors: visitorResult[0]?.monthly_visitors || 0,
        affiliates: affiliateResult.length > 0 ? affiliateResult.map(a => ({
          name: a.name,
          clicks: a.clicks,
          conversionRate: a.conversion_rate || 0
        })) : [
          { name: "DigitalOcean", clicks: 1200, conversionRate: 4.2 },
          { name: "Cloudflare", clicks: 850, conversionRate: 3.8 },
          { name: "Tech Learning Platforms", clicks: 2300, conversionRate: 4.5 }
        ],
        totalPosts: postsResult[0]?.total_posts || 0,
        totalCategories: categoriesResult[0]?.total_categories || 0,
        topCategories: topCategories,
        lastUpdated: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch statistics',
      fallbackData: {
        monthlyVisitors: 5000,
        affiliates: [
          { name: "DigitalOcean", clicks: 1200, conversionRate: 4.2 },
          { name: "Cloudflare", clicks: 850, conversionRate: 3.8 },
          { name: "Tech Learning Platforms", clicks: 2300, conversionRate: 4.5 }
        ],
        totalPosts: 0,
        totalCategories: 0,
        lastUpdated: new Date().toISOString()
      }
    });
  }
});

// ====== Media Kit PDF Endpoint ======
app.get('/api/media-kit', async (req, res) => {
  try {
    // We'll implement PDF generation here
    // For now, return a message
    res.json({
      success: true,
      message: "PDF media kit generation coming soon",
      downloadUrl: "#"
    });
  } catch (error) {
    console.error('Media kit error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate media kit'
    });
  }
});

// ====== Logos Endpoint ======
app.get('/api/logos', async (req, res) => {
  try {
    const [logos] = await pool.execute(`
      SELECT id, name, image_url as logo, website, description, is_active
      FROM partner_logos 
      WHERE is_active = 1 
      ORDER BY display_order ASC
      LIMIT 12
    `);
    
    // If no logos in database, return default ones
    if (logos.length === 0) {
      const defaultLogos = [
        { 
          id: 1, 
          name: "DigitalOcean", 
          logo: "https://www.digitalocean.com/_next/static/media/logo.6b42f3d3.svg",
          website: "https://www.digitalocean.com",
          description: "Cloud Infrastructure"
        },
        // ... add more defaults as needed
      ];
      res.json(defaultLogos);
    } else {
      res.json(logos);
    }
  } catch (error) {
    console.error('Error fetching logos:', error);
    // Return default logos on error
    res.json([
      { 
        id: 1, 
        name: "DigitalOcean", 
        logo: "https://www.digitalocean.com/_next/static/media/logo.6b42f3d3.svg",
        website: "https://www.digitalocean.com",
        description: "Cloud Infrastructure"
      },
      { 
        id: 2, 
        name: "Cloudflare", 
        logo: "https://www.cloudflare.com/img/logo/cloudflare-logo-white.svg",
        website: "https://www.cloudflare.com",
        description: "Web Performance & Security"
      }
    ]);
  }
});
app.use('/api/jobs', jobsRouter);
app.use('/api/admin/jobs', jobsRouter);

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