import jwt from 'jsonwebtoken';

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
    res.clearCookie('admin_token', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'Strict',
      path: '/'
    });
    
    res.status(403).json({ 
      error: 'Invalid or expired token',
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
    res.status(403).json({ error: 'Invalid or expired token' });
  }
};

// Universal authentication
export const authenticate = (req, res, next) => {
  let token = req.cookies?.admin_token;
  
  // Fallback to Authorization header
  if (!token && req.headers.authorization?.startsWith('Bearer ')) {
    token = req.headers.authorization.substring(7);
  }
  
  if (!token) {
    return res.status(401).json({ 
      error: 'Authentication required',
      note: 'No admin_token cookie or Bearer token found'
    });
  }
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    // Clear cookie if it exists
    if (req.cookies?.admin_token) {
      res.clearCookie('admin_token', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'Strict',
        path: '/'
      });
    }
    
    res.status(403).json({ 
      error: 'Invalid or expired token',
      action: 'Please login again'
    });
  }
};