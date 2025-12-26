import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'devsecret';

/**
 * Middleware to extract user info from JWT token
 * Adds req.user with user ID, isServiceAdvisor flag, and other info
 * isServiceAdvisor: true if user has Service Advisor role, false for all other roles
 */
export const authenticateToken = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({
        success: false,
        message: 'Missing Authorization header'
      });
    }

    const token = authHeader.replace(/^Bearer\s+/i, '');
    
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      
      // Attach user info to request
      req.user = {
        _id: decoded.sub,
        email: decoded.email,
        isServiceAdvisor: decoded.isServiceAdvisor || false, // true if Service Advisor role, false otherwise
        showroom_id: decoded.showroom_id
      };

      next();
    } catch (tokenError) {
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired token',
        error: tokenError.message
      });
    }
  } catch (error) {
    console.error('Authentication middleware error:', error);
    return res.status(500).json({
      success: false,
      message: 'Authentication error',
      error: error.message
    });
  }
};

/**
 * Middleware to ensure user is NOT a Service Advisor (has other roles)
 */
export const requireNonAdvisor = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required'
    });
  }

  if (req.user.isServiceAdvisor) {
    return res.status(403).json({
      success: false,
      message: 'This endpoint requires a role other than Service Advisor'
    });
  }

  next();
};

/**
 * Middleware to ensure user is a Service Advisor
 */
export const requireServiceAdvisor = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required'
    });
  }

  if (!req.user.isServiceAdvisor) {
    return res.status(403).json({
      success: false,
      message: 'Service Advisor access required'
    });
  }

  next();
};

