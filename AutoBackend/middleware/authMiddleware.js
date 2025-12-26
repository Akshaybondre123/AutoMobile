// Simple authentication middleware to validate user data
// In production, this should use JWT tokens or session-based authentication

export const validateServiceManager = (req, res, next) => {
  const { uploadedBy, city } = req.body;

  if (!uploadedBy || !city) {
    return res.status(401).json({
      message: "Unauthorized: Missing authentication credentials",
    });
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(uploadedBy)) {
    return res.status(401).json({
      message: "Unauthorized: Invalid email format",
    });
  }

  // Validate city (allow any non-empty trimmed string)
  if (typeof city !== 'string' || city.trim().length === 0) {
    return res.status(401).json({
      message: "Unauthorized: Invalid city",
    });
  }

  // Attach user info to request for use in controllers
  req.userAuth = {
    uploadedBy,
    city,
  };

  next();
};

// Middleware to ensure data isolation - user can only access their own data
export const ensureDataOwnership = (req, res, next) => {
  const { uploadedBy, city } = req.query;
  
  if (!uploadedBy || !city) {
    return res.status(403).json({
      message: "Forbidden: Access denied",
    });
  }

  // In a real application, you would verify this against a JWT token
  // For now, we trust the client to send the correct credentials
  // The database query will filter by these credentials anyway
  
  req.userAuth = {
    uploadedBy,
    city,
  };

  next();
};
