import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const createDatabaseIfNotExists = async () => {
  try {
    // Temporary connection without specifying database
    const tempConnection = await mysql.createConnection({
      host: process.env.DB_HOST || '127.0.0.1',
      port: process.env.DB_PORT || 3307,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD
    });

    await tempConnection.query(`CREATE DATABASE IF NOT EXISTS \`${process.env.DB_NAME}\``);
    console.log(`✅ Database '${process.env.DB_NAME}' ensured`);
    await tempConnection.end();
  } catch (error) {
    console.error('❌ Error creating database:', error.message);
    process.exit(1);
  }
};

// ✅ Run this immediately before pool is created
await createDatabaseIfNotExists();

const dbConfig = {
  host: process.env.DB_HOST || '127.0.0.1',
  port: process.env.DB_PORT || 3307,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
};

const pool = mysql.createPool(dbConfig);

export const connectDB = async () => {
  try {
    const connection = await pool.getConnection();
    console.log('✅ MySQL Connected successfully');
    connection.release();

    // Initialize tables
    await initializeTables();
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
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
      INDEX idx_published (published_at),
      FULLTEXT(title, content, excerpt)
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
    console.log('✅ Database tables initialized');

    // Insert sample data
    await insertSampleData();
  } catch (error) {
    console.error('Error initializing tables:', error);
  }
};

const insertSampleData = async () => {
  try {
    const connection = await pool.getConnection();

    const [categories] = await connection.execute('SELECT COUNT(*) as count FROM categories');
    if (categories[0].count === 0) {
      const sampleCategories = [
        ['Technology', 'technology', 'Latest tech news and tutorials'],
        ['Artificial Intelligence', 'artificial-intelligence', 'AI and machine learning advancements'],
        ['Web Development', 'web-development', 'Frontend and backend development guides'],
        ['Lifestyle', 'lifestyle', 'Life tips and personal development']
      ];

      for (const [name, slug, description] of sampleCategories) {
        await connection.execute(
          'INSERT INTO categories (name, slug, description) VALUES (?, ?, ?)',
          [name, slug, description]
        );
      }
    }

    const [authors] = await connection.execute('SELECT COUNT(*) as count FROM authors');
    if (authors[0].count === 0) {
      await connection.execute(
        'INSERT INTO authors (name, email, bio, avatar_url) VALUES (?, ?, ?, ?)',
        [
          'John Doe',
          'john@example.com',
          'Tech enthusiast and software developer with 10+ years of experience.',
          '/api/placeholder/100/100'
        ]
      );
    }

    const [adminUsers] = await connection.execute('SELECT COUNT(*) as count FROM admin_users');
    if (adminUsers[0].count === 0) {
      const bcrypt = await import('bcryptjs');
      const hashedPassword = await bcrypt.default.hash('admin123', 12);

      await connection.execute(
        'INSERT INTO admin_users (username, email, password_hash, role) VALUES (?, ?, ?, ?)',
        ['admin', 'admin@blog.com', hashedPassword, 'admin']
      );
    }

    connection.release();
    console.log('✅ Sample data inserted');
  } catch (error) {
    console.error('Error inserting sample data:', error);
  }
};

export default pool;
