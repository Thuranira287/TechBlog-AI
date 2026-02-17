import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { pool } from '../config/db.js';
import { authenticateCookie } from '../middleware/auth.js';
import rateLimit from 'express-rate-limit';
import Tokens from 'csrf';

const router = express.Router();
const isProduction = process.env.NODE_ENV === 'production';
const tokens = new Tokens();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { error: 'Too many login attempts' }
});

// Cookie options
const getCookieOptions = () => ({  
  httpOnly: true,
  secure: isProduction,
  sameSite: isProduction ? 'none' : 'lax',
  maxAge: 24 * 60 * 60 * 1000,
  path: '/'
});

// CSRF Middleware
const csrfMiddleware = (req, res, next) => {
  const secret = tokens.secretSync();
  const token = tokens.create(secret);

  // store secret in cookie
  res.cookie('_csrf_secret', secret, getCookieOptions());
  res.cookie('_csrf', token, getCookieOptions());

  req.csrfToken = () => token;
  next();
};

// CSRF verification for POST/PUT/DELETE routes
const verifyCsrf = (req, res, next) => {
  const token = req.headers['x-csrf-token'];
  const secret = req.cookies['_csrf_secret'];

  if (!secret || !token || !tokens.verify(secret, token)) {
    return res.status(403).json({ error: 'Invalid CSRF token' });
  }
  next();
};

// POST login
router.post('/login', loginLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }

    const [users] = await pool.execute(
      'SELECT * FROM admin_users WHERE email = ?',
      [email]
    );

    if (users.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = users[0];
    const isValidPassword = await bcrypt.compare(password, user.password_hash);

    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.cookie('admin_token', token, getCookieOptions());
    res.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Logout
router.post('/logout', (req, res) => {
  res.clearCookie('admin_token', getCookieOptions());
  res.clearCookie('_csrf', getCookieOptions());
  res.clearCookie('_csrf_secret', getCookieOptions());
  res.json({ success: true });
});

// GET current user
router.get('/me', authenticateCookie, async (req, res) => {
  try {
    const [users] = await pool.execute(
      'SELECT id, username, email, role FROM admin_users WHERE id = ?',
      [req.user.id]
    );

    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ user: users[0] });
  } catch (error) {
    console.error('Me error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Verify token
router.get('/verify', authenticateCookie, (req, res) => {
  res.json({ 
    valid: true, 
    user: req.user,
    expiresIn: '24h'
  });
});

// Get CSRF token
router.get('/csrf-token', authenticateCookie, csrfMiddleware, (req, res) => {
  res.json({ 
    csrfToken: req.csrfToken(),
    message: 'Use this token in X-CSRF-Token header for POST/PUT/DELETE requests'
  });
});

export default router;
