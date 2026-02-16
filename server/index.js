import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import cookieParser from 'cookie-parser';
import { authenticate } from './middleware/auth.js';
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

// Trust proxy
if (isProduction) {
  app.set('trust proxy', 1);
}

// ========== CORS Configuration ==========
const corsOptions = {
  origin: (origin, callback) => {
    if (!origin) {
      return callback(null, true);
    }
    
    // Allow localhost
    const isLocalhost = origin.includes('localhost') || 
                       origin.includes('127.0.0.1') ||
                       origin.startsWith('http://192.168.') ||
                       origin.startsWith('http://10.0.');
    
    if (isLocalhost) {
      if (isDevelopment) {
         console.log(`Allowing localhost origin: ${origin}`);
      }
      return callback(null, true);
    }
    
    //allowed origins
    const allowedOrigins = [
      'https://aitechblogs.netlify.app',
      'https://techblogai-backend.onrender.com',
      'https://www.aitechblogs.netlify.app'
    ];
    // Allow any netlify or render subdomain
    if (origin?.endsWith('.netlify.app') || origin?.endsWith('.onrender.com')) {
      return callback(null, true);
    }
    
    // Check exact matches
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    
    console.warn(`Blocked by CORS: ${origin}`);
    callback(new Error('Not allowed by CORS'));
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
    'Cookie',
    'Set-Cookie'  
  ],
  exposedHeaders: [
    'Content-Range',
    'X-Content-Range',
    'X-Total-Count',
    'X-RateLimit-Limit',
    'X-RateLimit-Remaining',
    'X-RateLimit-Reset',
    'Set-Cookie'  
  ],
  maxAge: isProduction ? 3600 : 86400,
  preflightContinue: false,
  optionsSuccessStatus: 204
};

//CORS
app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

// ========== Body Parsers ==========
app.use(express.json({ limit: isProduction ? '5mb' : '10mb' }));
app.use(express.urlencoded({ extended: true, limit: isProduction ? '5mb' : '10mb' }));
app.use(cookieParser());

// ========== Rate Limiting ==========
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
  skip: (req) => {
    return req.path === '/api/health' || 
           req.path.startsWith('/uploads/') ||
           req.path === '/sitemap.xml' ||
           req.path === '/sitemap-ai.xml' ||
           req.path === '/robots.txt' ||
           req.path === '/api/rss.xml';
  },
  handler: (req, res, options) => {
    res.status(429).json({
      error: options.message.error,
      retryAfter: options.message.retryAfter,
      timestamp: new Date().toISOString()
    });
  },
  keyGenerator: (req) => {
    return req.ip || req.connection.remoteAddress;
  }
};

const limiter = rateLimit(rateLimitConfig);

app.use('/api', limiter);

// ========== Helmet Security Headers ==========
const helmetConfig = {
  crossOriginResourcePolicy: { policy: "cross-origin" },
  crossOriginEmbedderPolicy: false,
  contentSecurityPolicy: isDevelopment ? false : {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: [
        "'self'", 
        "'unsafe-inline'",
        "https://www.google.com",
        "https://www.google.com/recaptcha/",
        "https://www.gstatic.com",
        "https://www.googletagmanager.com",
        "https://ep2.adtrafficquality.google",
        "https://pagead2.googlesyndication.com",
        "https://analytics.ahrefs.com"
      ],
      styleSrc: [
        "'self'", 
        "'unsafe-inline'", 
        "https://fonts.googleapis.com"
      ],
      fontSrc: [
        "'self'", 
        "https://fonts.gstatic.com"
      ],
      imgSrc: [
        "'self'", 
        "https:", 
        "blob:", 
        "data:"
      ],
      connectSrc: [
        "'self'",
        "https://www.google-analytics.com",
        "https://analytics.ahrefs.com",
        "https://techblogai-backend.onrender.com",
        "https://aitechblogs.netlify.app",
        "https://ep1.adtrafficquality.google",
        "https://ep2.adtrafficquality.google",
        "wss://*.netlify.app" 
      ],
      frameSrc: [
        "'self'",
        "https://www.google.com",
        "https://ep2.adtrafficquality.google",
        "https://googleads.g.doubleclick.net",
        "https://tpc.googlesyndication.com"
      ],
      objectSrc: ["'none'"],
      baseUri: ["'self'"],
      formAction: ["'self'"],
      frameAncestors: ["'self'"],
      upgradeInsecureRequests: [],
    },
  },
  hsts: isProduction ? { 
    maxAge: 31536000, 
    includeSubDomains: true, 
    preload: true 
  } : false,
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  noSniff: true,
  xssFilter: true,
  hidePoweredBy: true,
  ieNoOpen: true,
  dnsPrefetchControl: { allow: false }
};

app.use(helmet(helmetConfig));

// ========== Cookie Security Headers ==========
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  next();
});

// ========== Static Files ==========
app.use('/uploads', express.static('uploads', {
  setHeaders: (res, path) => {
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Cache-Control', 'public, max-age=31536000, immutable');
    res.set('X-Content-Type-Options', 'nosniff');
  },
  maxAge: '1y',
  immutable: true
}));

// ========== Development Middleware ==========
if (isDevelopment) {
  // Logging middleware
  app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path} - ${req.ip}`);
    next();
  });

  app.use('/api/admin', (req, res, next) => {
    console.log(`Admin Route: ${req.method} ${req.path}`);
    next();
  });
  
  // Debug endpoint for CORS
  app.get('/api/debug/cors', (req, res) => {
    res.json({
      origin: req.headers.origin,
      ip: req.ip,
      headers: req.headers,
      method: req.method,
      url: req.url,
      timestamp: new Date().toISOString()
    });
  });
}

// ========== API Routes ==========
app.use('/api/posts', postsRouter);
app.use('/api/categories', categoriesRouter);
app.use('/api/comments', commentsRouter);
app.use('/api/auth', authRouter);
app.use('/api/admin', authenticate, adminRouter);
app.use('/api/jobs', jobsRouter);
app.use('/api/ai', aiRouter);
app.use('/api', feedRouter);

// ========== Health Check ==========
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    cors: {
      origin: req.headers.origin || 'none',
      allowed: true
    }
  });
});

// ========== Sitemaps & SEO ==========

// Helper to escape XML
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

    const [posts] = await pool.execute(
      `SELECT slug, updated_at FROM posts WHERE status = 'published' ORDER BY published_at DESC`
    );

    const [categories] = await pool.execute(
      `SELECT slug FROM categories ORDER BY name ASC`
    );

    const STATIC_PAGES = [
      { path: "/about", changefreq: "monthly", priority: 0.6 },
      { path: "/policy/privacy", changefreq: "monthly", priority: 0.6 },
      { path: "/policy/cookie", changefreq: "monthly", priority: 0.6 },
      { path: "/policy/terms", changefreq: "monthly", priority: 0.6 },
      { path: "/advertise", changefreq: "monthly", priority: 0.5 },
      { path: "/jobs", changefreq: "weekly", priority: 0.7 },
    ];

    let sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`;
    
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
  <!-- AI Training Sitemap - Generated: ${new Date().toISOString().split('T')[0]} -->
  
  <url>
    <loc>${escapeXml(baseUrl + '/api/ai/feed')}</loc>
    <lastmod>${new Date().toISOString()}</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
    <ai:dataset>
      <ai:name>TechBlog AI Complete Dataset</ai:name>
      <ai:description>Full content feed for AI discovery and training</ai:description>
      <ai:license>https://creativecommons.org/licenses/by/4.0/</ai:license>
      <ai:format>application/json</ai:format>
    </ai:dataset>
  </url>

  <url>
    <loc>${escapeXml(apiUrl + '/api/rss.xml')}</loc>
    <lastmod>${new Date().toISOString()}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.8</priority>
    <ai:dataset>
      <ai:name>TechBlog AI RSS Feed</ai:name>
      <ai:description>Latest posts in RSS format</ai:description>
      <ai:license>https://creativecommons.org/licenses/by/4.0/</ai:license>
      <ai:format>application/rss+xml</ai:format>
    </ai:dataset>
  </url>`;
    
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
app.get('/robots.txt', (req, res) => {
  const baseUrl = process.env.FRONTEND_URL || 'https://aitechblogs.netlify.app';
  
  const robots = `# TechBlog AI - Robots.txt
# Generated: ${new Date().toISOString().split('T')[0]}

User-agent: *
Allow: /
Crawl-delay: 1
Disallow: /api/*
Disallow: /admin/*
Disallow: /private/*

User-agent: GPTBot
Allow: /
Crawl-delay: 0.5

User-agent: ChatGPT-User
Allow: /
Crawl-delay: 0.5

User-agent: Googlebot
Allow: /
Crawl-delay: 0.5

User-agent: Bingbot
Allow: /
Crawl-delay: 0.5

# Disallow commercial crawlers
User-agent: AhrefsBot
Disallow: /

User-agent: SemrushBot
Disallow: /

User-agent: MJ12bot
Disallow: /

# Sitemaps
Sitemap: ${baseUrl}/sitemap.xml
Sitemap: ${baseUrl}/sitemap-ai.xml`;
  
  res.type('text/plain');
  res.set('Cache-Control', 'public, max-age=86400');
  res.send(robots);
});

// ====== Stats Endpoint ======
app.get('/api/stats', async (req, res) => {
  try {
    //caching headers for stats
    res.set('Cache-Control', 'public, max-age=300');
    
    const [visitorResult] = await pool.execute(`
      SELECT COUNT(DISTINCT ip_address) as monthly_visitors
      FROM analytics 
      WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
    `);
    
    const [affiliateResult] = await pool.execute(`
      SELECT affiliate_name as name, 
             SUM(clicks) as clicks,
             ROUND((SUM(clicks) * 100.0 / NULLIF(SUM(impressions), 0)), 1) as conversion_rate
      FROM affiliate_clicks
      WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
      GROUP BY affiliate_name
      ORDER BY clicks DESC
      LIMIT 5
    `);
    
    const [postsResult] = await pool.execute(
      'SELECT COUNT(*) as total_posts FROM posts WHERE status = "published"'
    );
    
    const [categoriesResult] = await pool.execute(
      'SELECT COUNT(*) as total_categories FROM categories'
    );
    
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

// ====== Logos Endpoint ======
app.get('/api/logos', async (req, res) => {
  try {
    //caching headers
    res.set('Cache-Control', 'public, max-age=3600'); // 1 hour cache
    
    const [logos] = await pool.execute(`
      SELECT id, name, image_url as logo, website, description
      FROM partner_logos 
      WHERE is_active = 1 
      ORDER BY display_order ASC
      LIMIT 12
    `);
    
    if (logos.length === 0) {
      // Return default logos
      const defaultLogos = [
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
      ];
      res.json(defaultLogos);
    } else {
      res.json(logos);
    }
  } catch (error) {
    console.error('Error fetching logos:', error);
    res.status(500).json({ error: 'Failed to fetch logos' });
  }
});

// ====== API Documentation ======
app.get('/api', (req, res) => {
  const endpoints = {
    posts: '/api/posts',
    categories: '/api/categories',
    comments: '/api/comments',
    auth: '/api/auth',
    admin: '/api/admin',
    health: '/api/health',
    stats: '/api/stats',
    jobs: '/api/jobs',
    mediaKit: '/api/media-kit',
    logos: '/api/logos',
    ai: '/api/ai'
  };
  
  res.json({
    message: 'AI Tech Blogs API',
    version: '1.0.0',
    documentation: 'https://github.com/Thuranira287/aitechblogs-api',
    endpoints: endpoints,
    status: 'operational',
    timestamp: new Date().toISOString()
  });
});

// ====== 404 Handler ======
app.use((req, res) => {
  res.status(404).json({ 
    error: 'Route not found',
    path: req.path,
    method: req.method,
    timestamp: new Date().toISOString()
  });
});

// ====== Global Error Handler ======
app.use((err, req, res, next) => {
  const status = err.status || 500;
  const message = isDevelopment ? err.message : 'Internal Server Error';
  
  console.error(`[${new Date().toISOString()}] Error:`, {
    status,
    message: err.message,
    stack: isDevelopment ? err.stack : undefined,
    path: req.path,
    method: req.method,
    ip: req.ip
  });

  res.status(status).json({
    error: message,
    ...(isDevelopment && { stack: err.stack }),
    timestamp: new Date().toISOString()
  });
});

// ========== Start Server ==========
const startServer = async () => {
  try {
    await connectDB();
    
    const server = app.listen(PORT, () => {
      console.log(`
🚀 Server running on port ${PORT}
📝 Environment: ${process.env.NODE_ENV || 'development'}
🌐 API: http://localhost:${PORT}/api
🔒 Rate Limiting: ${rateLimitConfig.max} requests per ${rateLimitConfig.windowMs / 60000} minutes
📊 Health: http://localhost:${PORT}/api/health
📄 Sitemap: http://localhost:${PORT}/sitemap.xml
📄 Sitemap: http://localhost:${PORT}/sitemap-ai.xml
      `);
    });

    // Graceful shutdown
    process.on('SIGTERM', () => {
      console.log('SIGTERM signal received: closing HTTP server');
      server.close(() => {
        console.log('HTTP server closed');
        pool.end().then(() => process.exit(0));
      });
    });

    process.on('SIGINT', () => {
      console.log('SIGINT signal received: closing HTTP server');
      server.close(() => {
        console.log('HTTP server closed');
        pool.end().then(() => process.exit(0));
      });
    });

  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();