const mysql = require("mysql2/promise");

// Create connection pool 
let pool = null;
let lastUsed = Date.now();
const POOL_TTL = 5 * 60 * 1000; 

function getPool() {
  const now = Date.now();
  
  // Destroy old pool if exists and expired
  if (pool && (now - lastUsed) > POOL_TTL) {
    console.log('Destroying old connection pool due to inactivity');
    pool.end().catch(() => {});
    pool = null;
  }
  
  // Create new pool
  if (!pool) {
    console.log('Creating new connection pool');
    pool = mysql.createPool({
      host: process.env.MYSQL_HOST,
      user: process.env.MYSQL_USER,
      password: process.env.MYSQL_PASSWORD,
      database: process.env.MYSQL_DB,
      port: process.env.MYSQL_PORT || 3306,
      
      waitForConnections: true,
      connectionLimit: 2, 
      queueLimit: 5,
      connectTimeout: 10000, 
      idleTimeout: 30000, 
      
      // SSL for production
      ssl: process.env.NODE_ENV === 'production' ? {
        rejectUnauthorized: false
      } : undefined,
      
      // Enable keep-alive with short intervals
      enableKeepAlive: true,
      keepAliveInitialDelay: 10000 
    });
  }
  
  lastUsed = now;
  return pool;
}

// Helper function to generate mock data
function generateMockData() {
  const baseVisitors = 5000;
  const randomFactor = 1 + (Math.random() * 0.4 - 0.2);
  return {
    monthlyVisitors: Math.floor(baseVisitors * randomFactor),
    affiliates: [
      { 
        name: "DigitalOcean", 
        clicks: 1200 + Math.floor(Math.random() * 200),
        impressions: 15000,
        conversionRate: parseFloat((4.2 + (Math.random() * 0.4 - 0.2)).toFixed(2))
      },
      { 
        name: "Cloudflare", 
        clicks: 850 + Math.floor(Math.random() * 150),
        impressions: 12000,
        conversionRate: parseFloat((3.8 + (Math.random() * 0.4 - 0.2)).toFixed(2))
      },
      { 
        name: "Tech Learning Platforms", 
        clicks: 2300 + Math.floor(Math.random() * 300),
        impressions: 25000,
        conversionRate: parseFloat((4.5 + (Math.random() * 0.4 - 0.2)).toFixed(2))
      }
    ],
    timestamp: new Date().toISOString(),
    source: 'mock'
  };
}

// Helper function to format database results
function formatAffiliateData(rows) {
  return rows.map(row => ({
    name: row.name,
    clicks: parseInt(row.clicks) || 0,
    impressions: parseInt(row.impressions) || 0,
    conversionRate: parseFloat(row.conversionRate) || 0
  }));
}

module.exports.handler = async function(event, context) {
  let connection;
  
  try {
    const pool = getPool();
    
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Function timeout')), 9000);
    });
    
    const result = await Promise.race([
      (async () => {
        connection = await pool.getConnection();
        
        console.log('Fetching stats from database...');
        
        // Query affiliate data
        let affiliateRows = [];
        try {
          [affiliateRows] = await connection.execute(`
            SELECT 
              name, 
              COALESCE(clicks, 0) as clicks,
              COALESCE(impressions, 0) as impressions,
              COALESCE(conversion_rate, 0.0) as conversionRate
            FROM affiliate_clicks 
            WHERE clicks > 0
            ORDER BY clicks DESC 
            LIMIT 5
          `);
        } catch (tableError) {
          console.warn('Affiliate table query failed:', tableError.message);
          throw tableError;
        }
        
        // Query monthly visitors
        let monthlyVisitors = 5000;
        try {
          const [visitorRows] = await connection.execute(`
            SELECT COUNT(DISTINCT ip_address) as monthly_visitors
            FROM analytics 
            WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
          `);
          
          if (visitorRows && visitorRows[0]) {
            monthlyVisitors = visitorRows[0].monthly_visitors || 5000;
          }
        } catch (analyticsError) {
          console.warn('Analytics query failed:', analyticsError.message);
          monthlyVisitors = 5000; 
        }
        
        // Release connection back to pool
        if (connection) {
          connection.release();
          connection = null;
        }
        
        // Format response
        const affiliates = affiliateRows.length > 0 
          ? formatAffiliateData(affiliateRows)
          : generateMockData().affiliates;
        
        console.log(`Stats fetched: ${monthlyVisitors} visitors, ${affiliates.length} affiliates`);
        
        return {
          statusCode: 200,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Cache-Control': 'public, max-age=300, stale-while-revalidate=600',
            'CDN-Cache-Control': 'public, max-age=300'
          },
          body: JSON.stringify({ 
            monthlyVisitors,
            affiliates,
            timestamp: new Date().toISOString(),
            source: affiliateRows.length > 0 ? 'database' : 'mock'
          })
        };
      })(),
      timeoutPromise
    ]);
    
    return result;
    
  } catch (err) {
    console.error('Error fetching stats:', err.message);
        if (connection) {
      try {
        connection.release();
      } catch (releaseError) {
        console.warn('Failed to release connection:', releaseError.message);
      }
    }
    
    // Generate enhanced mock data
    const mockData = generateMockData();
    
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'no-cache, must-revalidate'
      },
      body: JSON.stringify({ 
        ...mockData,
        note: "Using enhanced mock data due to database error",
        error: process.env.NODE_ENV === 'development' ? err.message : undefined
      })
    };
  } finally {
    // Update last used time for pool TTL
    lastUsed = Date.now();
  }
};

// Cleanup handler 
if (typeof global !== 'undefined') {
  // graceful shutdown in production
  if (process.env.NODE_ENV === 'production') {
    ['SIGTERM', 'SIGINT', 'SIGUSR2'].forEach(signal => {
      process.once(signal, async () => {
        console.log(`Received ${signal}, closing database pool...`);
        if (pool) {
          try {
            await pool.end();
            console.log('Database pool closed');
          } catch (err) {
            console.error('Error closing pool:', err);
          }
        }
        process.exit(0);
      });
    });
  }
}