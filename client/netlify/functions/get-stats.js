import mysql from "mysql2/promise";

export const handler = async () => {
  try {
    //environment variables
    const connection = await mysql.createConnection({
      host: process.env.MYSQL_HOST || "localhost",
      user: process.env.MYSQL_USER || "root",
      password: process.env.MYSQL_PASSWORD || "",
      database: process.env.MYSQL_DB || "techblog",
      port: process.env.MYSQL_PORT || 3306
    });

    // Fetch affiliate clicks
    const [affiliateRows] = await connection.execute(
      "SELECT name, COUNT(*) as clicks FROM affiliate_clicks GROUP BY name ORDER BY clicks DESC LIMIT 5"
    );

    // Fetch monthly visitors
    const [visitorRows] = await connection.execute(
      `SELECT 
        DATE_FORMAT(created_at, '%Y-%m') as month,
        COUNT(DISTINCT session_id) as visitors
       FROM analytics 
       WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
       GROUP BY DATE_FORMAT(created_at, '%Y-%m')
       ORDER BY month DESC
       LIMIT 1`
    );

    await connection.end();

    const monthlyVisitors = visitorRows[0]?.visitors || "5000";
    
    // Return formatted data
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({ 
        monthlyVisitors,
        affiliates: affiliateRows.map(row => ({
          name: row.name,
          clicks: row.clicks
        })),
        timestamp: new Date().toISOString()
      })
    };
  } catch (err) {
    if (process.env.NODE_ENV !== 'production') {
    console.error("Error fetching stats:", err);}
    
    // Return fallback data
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({ 
        monthlyVisitors: "5000",
        affiliates: [
          { name: "DigitalOcean", clicks: 1200 },
          { name: "Cloudflare", clicks: 850 },
          { name: "Tech Learning Platforms", clicks: 2300 }
        ],
        timestamp: new Date().toISOString(),
        note: "Using fallback data due to database error"
      })
    };
  }
};