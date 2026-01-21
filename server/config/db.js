import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

if (process.env.NODE_ENV !== 'production') {
  console.log('🌍 DB environment variables loaded');
}

const createDatabaseIfNotExists = async () => {
  try {
    const tempConnection = await mysql.createConnection({
      host: process.env.DB_HOST || '127.0.0.1',
      port: process.env.DB_PORT || 17165 || 3307,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD
    });

    await tempConnection.query(`CREATE DATABASE IF NOT EXISTS \`${process.env.DB_NAME}\``);
    if (process.env.NODE_ENV !== 'production') {
    console.log(`✅ Database '${process.env.DB_NAME}' ensured`);}
    await tempConnection.end();
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
    console.error('❌ Error creating database:', error.message);}
    process.exit(1);
  }
};

if (process.env.NODE_ENV !== 'production') {
  await createDatabaseIfNotExists();
}

const dbConfig = {
  host: process.env.DB_HOST || '127.0.0.1',
  port: process.env.DB_PORT ||3307,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
};

const pool = mysql.createPool(dbConfig);

//function to check existing posts
const checkAndFixPosts = async () => {
  try {
    const connection = await pool.getConnection();
    if (process.env.NODE_ENV !== 'production') {
    console.log('🔍 Checking existing posts...');}
    
    const [posts] = await connection.execute(`
      SELECT p.id, p.title, p.status, p.category_id, c.name as category_name, c.slug as category_slug
      FROM posts p
      LEFT JOIN categories c ON p.category_id = c.id
    `);

if (process.env.NODE_ENV !== 'production') {
  console.log(`📊 Found ${posts.length} posts`);
}

    
    const publishedPosts = posts.filter(p => p.status === "published");
    const postsWithCategories = publishedPosts.filter(p => p.category_id !== null);
    if (process.env.NODE_ENV !== 'production') {
    console.log(`📈 Published posts: ${publishedPosts.length}`);
    console.log(`📈 Published posts with categories: ${postsWithCategories.length}`);}
    
    if (publishedPosts.length > 0 && postsWithCategories.length === 0) {
      if (process.env.NODE_ENV !== 'production') {
      console.log('⚠️  Published posts found but no categories assigned!');
      console.log('💡 Assigning categories to published posts...');}
      
      const [categories] = await connection.execute('SELECT id FROM categories LIMIT 1');
      if (categories.length > 0) {
        const defaultCategoryId = categories[0].id;
        await connection.execute(
          'UPDATE posts SET category_id = ? WHERE status = "published" AND category_id IS NULL',
          [defaultCategoryId]
        );
        if (process.env.NODE_ENV !== 'production') {
        console.log('✅ Assigned default category to published posts');}
      }
    }
  } catch (tableError) {
    if (process.env.NODE_ENV !== 'production') {
      console.log('⚠️  Could not check posts table:', tableError.message);}
      return; // Exit gracefully if there's a table issue
    } finally {
    if (connection) {
      connection.release();
    }
  }

};

export const connectDB = async () => {
  try {
    const connection = await pool.getConnection();
    if (process.env.NODE_ENV !== 'production') {
    console.log('✅ MySQL Connected successfully');}
    connection.release();

    await initializeTables();
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
    console.error('❌ Database connection failed:', error.message);}
    process.exit(1);
  }
};

const initializeTables = async () => {
  const createTables = `
    CREATE TABLE IF NOT EXISTS categories (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(255) NOT NULL UNIQUE,
      slug VARCHAR(255) NOT NULL UNIQUE,
      description TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS authors (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      email VARCHAR(255) UNIQUE NOT NULL,
      bio TEXT,
      avatar_url VARCHAR(500),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS posts (
      id INT AUTO_INCREMENT PRIMARY KEY,
      title VARCHAR(500) NOT NULL,
      slug VARCHAR(500) NOT NULL UNIQUE,
      excerpt TEXT,
      content LONGTEXT NOT NULL,
      featured_image VARCHAR(500),
      author_id INT,
      category_id INT,
      status ENUM('published', 'draft') DEFAULT 'published',
      meta_title VARCHAR(500),
      meta_description TEXT,
      tags JSON,
      view_count INT DEFAULT 0,
      published_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (author_id) REFERENCES authors(id) ON DELETE SET NULL,
      FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL,
      INDEX idx_slug (slug),
      INDEX idx_status (status),
      INDEX idx_published (published_at)
    );

    CREATE TABLE IF NOT EXISTS comments (
      id INT AUTO_INCREMENT PRIMARY KEY,
      post_id INT NOT NULL,
      author_name VARCHAR(255) NOT NULL,
      author_email VARCHAR(255) NOT NULL,
      content TEXT NOT NULL,
      status ENUM('approved', 'pending', 'spam') DEFAULT 'pending',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
      INDEX idx_post_id (post_id),
      INDEX idx_status (status)
    );

    CREATE TABLE IF NOT EXISTS admin_users (
      id INT AUTO_INCREMENT PRIMARY KEY,
      username VARCHAR(255) UNIQUE NOT NULL,
      email VARCHAR(255) UNIQUE NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      role ENUM('admin', 'editor') DEFAULT 'editor',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `;

  try {
    const connection = await pool.getConnection();

    const statements = createTables.split(';').filter(stmt => stmt.trim());

    for (const statement of statements) {
      if (statement.trim()) {
        await connection.execute(statement + ';');
      }
    }

    connection.release();
    if (process.env.NODE_ENV !== 'production') {
    console.log('✅ Database tables initialized');}

    await insertEssentialData();
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
    console.error('Error initializing tables:', error.message);}
  }
};

const insertEssentialData = async () => {
  try {
    const connection = await pool.getConnection();
    if (process.env.NODE_ENV !== 'production') {
    console.log('📝 Setting up essential data for admin...');}

    // 1. Create categories if they don't exist
    const [categories] = await connection.execute('SELECT COUNT(*) as count FROM categories');
    if (categories[0].count === 0) {
      if (process.env.NODE_ENV !== 'production') {
      console.log('🗂️ Creating categories...');}
      
      const sampleCategories = [
        ['Technology', 'technology', 'Latest tech news and tutorials'],
        ['Artificial Intelligence', 'artificial-intelligence', 'AI and machine learning advancements'],
        ['Web Development', 'web-development', 'Frontend and backend development guides'],
        ['Lifestyle', 'lifestyle', 'Life tips and personal development']
      ];

      for (const [name, slug, description] of sampleCategories) {
        await connection.execute(
          'INSERT IGNORE INTO categories (name, slug, description) VALUES (?, ?, ?)',
          [name, slug, description]
        );
      }
      if (process.env.NODE_ENV !== 'production') {
      console.log('✅ Categories created');}
    } else {
      if (process.env.NODE_ENV !== 'production') {
      console.log(`📊 Found ${categories[0].count} existing categories`);}
    }

    // 2. Create default author if none exists
    const [authors] = await connection.execute('SELECT COUNT(*) as count FROM authors');
    if (authors[0].count === 0) {
      if (process.env.NODE_ENV !== 'production') {
      console.log('👤 Creating default author...');}
      
      await connection.execute(
        'INSERT INTO authors (name, email, bio, avatar_url) VALUES (?, ?, ?, ?)',
        [
          'Admin',
          'admin@techblog.com',
          'Technology enthusiast and content creator passionate about AI, web development, and emerging technologies.',
          'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face'
        ]
      );
      if (process.env.NODE_ENV !== 'production') {
      console.log('✅ Default author created');}
    } else {
      if (process.env.NODE_ENV !== 'production') {
      console.log(`📊 Found ${authors[0].count} existing authors`);}
    }

    // 3. Create admin user if none exists
    const [adminUsers] = await connection.execute(
      'SELECT COUNT(*) as count FROM admin_users'
     );

      if (adminUsers[0].count === 0) {
        console.warn(
        '⚠️ No admin user found. Please create one manually using a secure method.'
        );
       } else {
        if (process.env.NODE_ENV !== 'production') {
        console.log(`📊 Found ${adminUsers[0].count} existing admin user(s)`);}
      }
    connection.release();
    if (process.env.NODE_ENV !== 'production') {
    console.log('✅ Essential data setup completed');}
    
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('❌ Error setting up essential data:', error.message);
      console.log('📊 Current Database Status:');
      console.log('- Published Posts: 0');
      console.log('- Draft Posts: 0');
    }
  }
};
export { pool };

export default pool;