import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import { connectDB, pool } from './config/db.js';
import postsRouter from './routes/posts.js';
import categoriesRouter from './routes/categories.js';
import commentsRouter from './routes/comments.js';
import authRouter from './routes/auth.js';
import adminRouter from './routes/admin.js';
import jobsRouter from './routes/jobs.js';
import aiRouter from './routes/ai.js';
import feedRouter from './routes/feed.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const isProduction = process.env.NODE_ENV === 'production';
const isDevelopment = process.env.NODE_ENV === 'development';

// ========== Middleware ==========

//Trust proxy
app.set('trust proxy', 1);

// CORS Configuration
const corsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin
    if (!origin && isDevelopment) {
      return callback(null, true);
    }
    
    const allowedOrigins = [
      'https://aitechblogs.netlify.app',
      'https://techblogai-backend.onrender.com',
      'http://localhost:5173',
      'http://localhost:3000',
      'http://localhost:8888',
      'http://localhost:5000'
    ];
    
    // Check the origin
    if (
      allowedOrigins.includes(origin) ||
      (isDevelopment && origin?.includes('localhost')) ||
      (isProduction && origin?.endsWith('.netlify.app'))
    ) {
      callback(null, true);
    } else {
      console.warn(`Blocked by CORS: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type', 
    'Authorization', 
    'X-Requested-With',
    'Accept',
    'Origin',
    'X-CSRF-Token',
    'X-API-Key',
    'Cache-Control',
    'x-request-id',
    'X-Request-Type',
    'Cookie'
  ],
  exposedHeaders: [
    'Content-Range',
    'X-Content-Range',
    'X-Total-Count',
    'X-RateLimit-Limit',
    'X-RateLimit-Remaining',
    'X-RateLimit-Reset'
  ],
  maxAge: 86400,
  preflightContinue: false,
  optionsSuccessStatus: 204
};

// CORS middleware
app.use(cors(corsOptions));
app.options('*', cors(corsOptions));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());
//Rate limiting 
const rateLimitConfig = {
  windowMs: isDevelopment ? 60 * 1000 : 15 * 60 * 1000,
  max: isDevelopment ? 1000 : 100,
  message: {
    error: 'Too many requests, please try again later.',
    retryAfter: isDevelopment ? 60 : 900
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false,
  skip: (req, res) => {
    if (req.path === '/api/health' || req.path.startsWith('/uploads/')) {
      return true;
    }
    return false;
  },
  handler: (req, res, next, options) => {
    res.status(429).json({
      error: options.message.error,
      retryAfter: options.message.retryAfter,
      timestamp: new Date().toISOString()
    });
  }
};

const limiter = rateLimit(rateLimitConfig);

// Rate limiting to API routes only
app.use('/api', limiter);

//Helmet CSP headers
const helmetConfig = {
  crossOriginResourcePolicy: { policy: "cross-origin" },
  crossOriginEmbedderPolicy: false,
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      baseUri: ["'self'"],
      fontSrc: ["'self'", "https:", "data:"],
      formAction: ["'self'"],
      frameAncestors: ["'self'"],
      frameSrc: ["'self'"],
      imgSrc: ["'self'", "https:", "blob:", "data:", "http://localhost:*"],
      objectSrc: ["'none'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      scriptSrcAttr: ["'none'"],
      styleSrc: ["'self'", "https:", "'unsafe-inline'"],
      connectSrc: [
        "'self'",
        "https://techblogai-backend.onrender.com",
        "https://aitechblogs.netlify.app",
        "http://localhost:*",
        "ws://localhost:*"
      ],
      upgradeInsecureRequests: isProduction ? [] : null,
    },
  },
  // Disable strict transport security in development
  hsts: isProduction ? { maxAge: 31536000, includeSubDomains: true } : false
};

app.use(helmet(helmetConfig));

// ========== Routes ==========

// Serve uploaded files statically
app.use('/uploads', express.static('uploads', {
  setHeaders: (res, path) => {
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Cache-Control', 'public, max-age=31536000');
  }
}));

// Development 
if (isDevelopment) {
  app.use('/api/admin', (req, res, next) => {
    console.log(`Admin Route: ${req.method} ${req.path}`);
    next();
  });
  
  // Debug endpoint for CORS
  app.get('/api/debug/cors', (req, res) => {
    res.json({
      origin: req.headers.origin,
      headers: req.headers,
      method: req.method,
      url: req.url,
      timestamp: new Date().toISOString()
    });
  });
}

// API Routes
app.use('/api/posts', postsRouter);
app.use('/api/categories', categoriesRouter);
app.use('/api/comments', commentsRouter);
app.use('/api/auth', authRouter);
app.use('/api/admin', authenticate, adminRouter);
app.use('/api/comments/delete', authenticate);
app.use('/api/jobs', jobsRouter);
app.use('/api/ai', aiRouter);
app.use('/api', feedRouter);
app.use('/api/auth', authRouter);

// ========== Health Check ==========
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    cors: {
      origin: req.headers.origin,
      allowed: true
    }
  });
});

// Helper to escape XML special characters
function escapeXml(unsafe) {
  if (!unsafe) return '';
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

// Sitemap generator 
app.get('/sitemap.xml', async (req, res) => {
  try {
    const baseUrl = process.env.FRONTEND_URL || 'https://aitechblogs.netlify.app';

    // posts
    const [posts] = await pool.execute(
      `SELECT slug, updated_at FROM posts WHERE status = 'published' ORDER BY published_at DESC`
    );

    // categories
    const [categories] = await pool.execute(
      `SELECT slug FROM categories ORDER BY name ASC`
    );

    // Static pages
    const STATIC_PAGES = [
      { path: "/about", changefreq: "monthly", priority: 0.6 },
      { path: "/policy/privacy", changefreq: "monthly", priority: 0.6 },
      { path: "/policy/cookie", changefreq: "monthly", priority: 0.6 },
      { path: "/policy/terms", changefreq: "monthly", priority: 0.6 },
      { path: "/advertise", changefreq: "monthly", priority: 0.5 },
      { path: "/jobs", changefreq: "weekly", priority: 0.7 },
    ];

    // Build sitemap XML
    let sitemap = `<?xml version="1.0" encoding="UTF-8"?>
    <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`;
    // Homepage
    sitemap += `
    <url>
      <loc>${baseUrl}</loc>
      <changefreq>daily</changefreq>
      <priority>1.0</priority>
    </url>`;
    STATIC_PAGES.forEach(page => {
      sitemap += `
      <url>
        <loc>${baseUrl}${page.path}</loc>
        <changefreq>${page.changefreq}</changefreq>
        <priority>${page.priority}</priority>
      </url>`;
    });
    categories.forEach(cat => {
      sitemap += `
    <url>
      <loc>${baseUrl}/category/${cat.slug}</loc>
      <changefreq>weekly</changefreq>
      <priority>0.6</priority>
    </url>`;
      });

    // Posts
    posts.forEach(post => {
      sitemap += `
    <url>
      <loc>${baseUrl}/post/${post.slug}</loc>
      <lastmod>${new Date(post.updated_at).toISOString().split('T')[0]}</lastmod>
      <changefreq>weekly</changefreq>
      <priority>0.8</priority>
    </url>`;
      });

    sitemap += `
  </urlset>`;

    res.set('Content-Type', 'application/xml');
    res.set('Cache-Control', 'public, max-age=3600');
    res.send(sitemap);
    } catch (error) {
      console.error('Error generating sitemap:', error);
      res.status(500).send('Error generating sitemap');
    }
});


// AI Training-optimized sitemap
app.get('/sitemap-ai.xml', async (req, res) => {
  try {
    const baseUrl = process.env.FRONTEND_URL || 'https://aitechblogs.netlify.app';
    const apiUrl = process.env.BACKEND_URL || 'https://techblogai-backend.onrender.com';

    const [posts] = await pool.execute(
      `SELECT p.slug, p.title, p.updated_at, p.content, c.name AS category_name
       FROM posts p
       LEFT JOIN categories c ON p.category_id = c.id
       WHERE p.status = 'published'
       ORDER BY p.updated_at DESC
       LIMIT 1000`
    );

    let sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:ai="https://schema.org/">
  <!-- AI Training Sitemap for TechBlog AI -->
  <!-- License: CC BY 4.0 -->
  <!-- Contact: admin@aitechblogs.com -->
  
  <url>
    <loc>${escapeXml(baseUrl + '/api/ai/feed')}</loc>
    <lastmod>${new Date().toISOString()}</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
    <ai:dataset>
      <ai:name>TechBlog AI Complete Dataset</ai:name>
      <ai:description>Full content feed for AI discovery, training, and research</ai:description>
      <ai:license>https://creativecommons.org/licenses/by/4.0/</ai:license>
      <ai:format>application/json</ai:format>
    </ai:dataset>
  </url>

    <!-- RSS Feed -->
  <url>
    <loc>${escapeXml(baseUrl + '/rss.xml')}</loc>
    <lastmod>${new Date().toISOString()}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.8</priority>
    <ai:dataset>
      <ai:name>TechBlog AI RSS Feed</ai:name>
      <ai:description>Latest posts in RSS format for AI discovery</ai:description>
      <ai:license>https://creativecommons.org/licenses/by/4.0/</ai:license>
      <ai:format>application/rss+xml</ai:format>
    </ai:dataset>
  </url>
`;
    
    posts.forEach(post => {
      const contentText = post.content ? post.content.replace(/<[^>]*>/g, '').trim() : '';
      const wordCount = contentText ? contentText.split(/\s+/).length : 50;
      const readTime = Math.max(1, Math.ceil(wordCount / 200));
      const tagList = post.tags ? post.tags.split(',') : [];

      sitemap += `
  <url>
    <loc>${escapeXml(baseUrl + '/post/' + post.slug)}</loc>
    <lastmod>${new Date(post.updated_at).toISOString()}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.9</priority>
    <ai:article>
      <ai:title>${escapeXml(post.title)}</ai:title>
      <ai:author>${escapeXml(post.author_name || 'Admin')}</ai:author>
      <ai:category>${escapeXml(post.category_name || 'Technology')}</ai:category>
      <ai:tags>${escapeXml(tagList.join(','))}</ai:tags>
      <ai:contentUrl>${escapeXml(apiUrl + '/api/posts/' + post.slug + '/full')}</ai:contentUrl>
      <ai:wordCount>${wordCount}</ai:wordCount>
      <ai:readingTime>${readTime}min</ai:readingTime>
      <ai:license>CC-BY-4.0</ai:license>
      <ai:discovery>true</ai:discovery>
    </ai:article>
  </url>`;
    });

    sitemap += `
</urlset>`;

    res.set('Content-Type', 'application/xml');
    res.set('Cache-Control', 'public, max-age=3600');
    res.set('X-Robots-Tag', 'all');
    res.send(sitemap);
  } catch (error) {
    console.error('Error generating AI sitemap:', error);
    res.status(500).send('Error generating AI sitemap');
  }
});

// Robots.txt
if (process.env.NODE_ENV !== 'production') {
  app.get('/robots.txt', (req, res) => {
    res.type('text/plain');
    res.send('User-agent: *\nDisallow: /');
  });
} else {
app.get('/robots.txt', (req, res) => {
  const baseUrl = process.env.FRONTEND_URL || 'https://aitechblogs.netlify.app';
  
  const robots = `# TechBlog AI - Robots.txt
# Updated: ${new Date().toISOString().split('T')[0]}

# General Web Crawlers
User-agent: *
Allow: /
Crawl-delay: 1

# AI Training Crawlers - Priority Access
User-agent: GPTBot
User-agent: ChatGPT-User
User-agent: Anthropic-AI
User-agent: Claude-Web
User-agent: Google-Extended
User-agent: cohere-ai
User-agent: PerplexityBot
User-agent: YouBot
Allow: /
Crawl-delay: 0.5

# Search Engine Bots
User-agent: Googlebot
User-agent: Bingbot
User-agent: Slurp
User-agent: DuckDuckBot
User-agent: CCBot
Allow: /
Crawl-delay: 0.5

# Disallow commercial crawlers
User-agent: AhrefsBot
User-agent: SemrushBot
User-agent: MJ12bot
User-agent: dotbot
User-agent: rogerbot
Disallow: /

# Sitemaps
Sitemap: ${baseUrl}/sitemap.xml
Sitemap: ${baseUrl}/sitemap-ai.xml

# AI Training Resources
# API Feed: ${baseUrl}/api/ai/feed
# License: https://creativecommons.org/licenses/by/4.0/
# Contact: admin@aitechblogs.netlify.app`;
  
  res.type('text/plain');
  res.set('Cache-Control', 'public, max-age=86400'); // Cache 24 hours
  res.send(robots);
});}

// endpoints
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
    // monthly visitors (last 30 days)
    const [visitorResult] = await pool.execute(`
      SELECT COUNT(DISTINCT ip_address) as monthly_visitors
      FROM analytics 
      WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
    `);
    
    // affiliate clicks (last 30 days)
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
    
    // total posts
    const [postsResult] = await pool.execute(
      'SELECT COUNT(*) as total_posts FROM posts WHERE status = "published"'
    );
    
    // total categories
    const [categoriesResult] = await pool.execute(
      'SELECT COUNT(*) as total_categories FROM categories'
    );
    
    // top categories
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

//all /api/* routes
app.get('/api', (req, res) => {
  const endpoints = {
    posts: '/api/posts',
    categories: '/api/categories',
    comments: '/api/comments',
    auth: '/api/auth',
    health: '/api/health',
    stats: '/api/stats',
    jobs: '/api/jobs',
    mediaKit: '/api/media-kit',
    logos: '/api/logos'
  };
  if (process.env.NODE_ENV === 'development') {
    endpoints.admin = '/api/admin';
  }
  res.json({
    message: 'AI Tech Blogs API',
    version: '1.0.0',
    documentation: 'https://github.com/Thuranira287/aitechblogs-api',
    endpoints: endpoints,
    status: 'operational',
    timestamp: new Date().toISOString()
  });
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
      console.log(`AI Training Feed at http://localhost:${PORT}/api/ai/feed`);
      console.log(`Sitemap at http://localhost:${PORT}/sitemap.xml`);
      console.log(`AI Sitemap at http://localhost:${PORT}/sitemap-ai.xml`);
      console.log(`RSS feed at http://localhost:${PORT}/api/rss.xml`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();