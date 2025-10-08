import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

const test = async () => {
  try {
    const conn = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      port: process.env.DB_PORT || 3307
    });
    console.log('✅ MySQL connection successful');
    await conn.end();
  } catch (err) {
    console.error('❌ Connection failed:', err.message);
  }
};

test();
