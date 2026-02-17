import jwt from 'jsonwebtoken';

const isProduction = process.env.NODE_ENV === 'production';

//cookie options
const getCookieOptions = () => {  
  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'none' : 'lax',
    path: '/',
    //...(isProduction && process.env.COOKIE_DOMAIN && { domain: process.env.COOKIE_DOMAIN })
  };
};

// Helper to clear auth cookie
const clearAuthCookie = (res) => {
  res.clearCookie('admin_token', getCookieOptions());
};

export const authenticateCookie = (req, res, next) => {
  const token = req.cookies?.admin_token;
    
  if (!token) {
    return res.status(401).json({ 
      error: 'Authentication required',
      redirect: false 
    });
  }
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    // Clear invalid cookie
    clearAuthCookie(res);
        const message = err.name === 'TokenExpiredError' 
      ? 'Token expired' 
      : 'Invalid token';
    
    res.status(403).json({ 
      error: message,
      action: 'Please login again'
    });
  }
};

// Token-based authentication
export const authenticateToken = (req, res, next) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.startsWith('Bearer ') 
    ? authHeader.substring(7) 
    : null;
  
  if (!token) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    const message = err.name === 'TokenExpiredError' 
      ? 'Token expired' 
      : 'Invalid token';
    
    res.status(403).json({ error: message });
  }
};

// Universal authentication for all routes
export const authenticate = (req, res, next) => {
  let token = req.cookies?.admin_token;
  let source = 'cookie';
  
  // Fallback to Authorization header
  if (!token && req.headers.authorization?.startsWith('Bearer ')) {
    token = req.headers.authorization.substring(7);
    source = 'header';
  }
  
  if (!token) {
    return res.status(401).json({ 
      error: 'Authentication required',
      message: 'No authentication token found'
    });
  }
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    req.authSource = source;
    next();
  } catch (err) {
    // Clear cookie if it exists and was the source
    if (req.cookies?.admin_token) {
      clearAuthCookie(res);
    }
    
    const message = err.name === 'TokenExpiredError' 
      ? 'Token expired' 
      : 'Invalid token';
    
    res.status(403).json({ 
      error: message,
      action: 'Please login again'
    });
  }
};

// Optional: Role-based authorization middleware
export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ 
        error: 'Insufficient permissions',
        required: roles,
        current: req.user.role
      });
    }
    
    next();
  };
};

// Optional: Optional auth (doesn't error if no token)
export const optionalAuth = (req, res, next) => {
  try {
    const token = req.cookies?.admin_token || 
                 (req.headers.authorization?.startsWith('Bearer ') 
                   ? req.headers.authorization.substring(7) 
                   : null);
    
    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = decoded;
    }
  } catch (err) {
    // Ignore token errors for optional auth
    if (req.cookies?.admin_token) {
      clearAuthCookie(res);
    }
  }
  
  next();
};