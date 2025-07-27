const jwt = require('jsonwebtoken');
const crypto = require('crypto');

// Token configuration
const TOKEN_CONFIG = {
  access: {
    secret: process.env.JWT_SECRET,
    expiresIn: '15m' // 15 minutes - production value
  },
  refresh: {
    secret: process.env.JWT_REFRESH_SECRET,
    expiresIn: '30d' // 30 days - keeps you logged in like Spotify
  }
};

// Store for blacklisted refresh tokens (in production, use Redis or a database)
const tokenBlacklist = new Set();

/**
 * Generate JWT access token
 * @param {Object} user - User object containing id, email, plan_type
 * @returns {String} JWT access token
 */
const generateAccessToken = (user) => {
  return jwt.sign(
    { 
      id: user.id, 
      email: user.email, 
      plan_type: user.plan_type,
      tokenType: 'access'
    },
    TOKEN_CONFIG.access.secret,
    { expiresIn: TOKEN_CONFIG.access.expiresIn }
  );
};

/**
 * Generate JWT refresh token
 * @param {Object} user - User object containing id, email, plan_type
 * @returns {String} JWT refresh token
 */
const generateRefreshToken = (user) => {
  // Add a unique token identifier to track revoked tokens
  const tokenId = crypto.randomBytes(16).toString('hex');
  
  return jwt.sign(
    { 
      id: user.id, 
      email: user.email, 
      plan_type: user.plan_type,
      tokenType: 'refresh',
      jti: tokenId // JWT ID claim
    },
    TOKEN_CONFIG.refresh.secret,
    { expiresIn: TOKEN_CONFIG.refresh.expiresIn }
  );
};

/**
 * Refresh access token using refresh token
 */
const refreshToken = async (req, res) => {
  const { token } = req.body;

  if (!token) {
    return res.status(401).json({ error: 'Refresh token is required' });
  }

  try {
    // Verify the refresh token
    const decoded = jwt.verify(token, TOKEN_CONFIG.refresh.secret);
    
    // Check if token is blacklisted
    if (decoded.jti && tokenBlacklist.has(decoded.jti)) {
      return res.status(401).json({ error: 'Token has been revoked' });
    }
    
    // Check token type
    if (decoded.tokenType !== 'refresh') {
      return res.status(401).json({ error: 'Invalid token type' });
    }
    
    // User data to include in new tokens
    const userData = {
      id: decoded.id,
      email: decoded.email,
      plan_type: decoded.plan_type
    };

    // Generate new access token
    const accessToken = generateAccessToken(userData);
    
    // Only generate new refresh token if current one is close to expiry
    const now = Math.floor(Date.now() / 1000);
    const refreshTokenExpiresIn = decoded.exp;
    const refreshThreshold = 3 * 24 * 60 * 60; // 3 days - when to renew refresh token
    
    let refreshToken = token;
    
    // If refresh token is within 3 days of expiry, issue a new one
    if (refreshTokenExpiresIn - now < refreshThreshold) {
      // Blacklist the old token
      if (decoded.jti) {
        tokenBlacklist.add(decoded.jti);
      }
      
      // Generate new refresh token
      refreshToken = generateRefreshToken(userData);
    }
    
    res.json({ accessToken, refreshToken });
  } catch (error) {
    // Provide helpful error messages based on the error type
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Refresh token has expired, please login again' });
    } else if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Invalid refresh token' });
    }
    
    res.status(500).json({ error: 'Server error during token refresh' });
  }
};

/**
 * Revoke a refresh token (used during logout)
 */
const revokeToken = async (req, res) => {
  const { token } = req.body;
  
  if (!token) {
    return res.status(400).json({ error: 'Token is required' });
  }
  
  try {
    // Verify and decode the token to get the jti
    const decoded = jwt.verify(token, TOKEN_CONFIG.refresh.secret);
    
    if (decoded.jti) {
      // Add the token to blacklist
      tokenBlacklist.add(decoded.jti);
      res.json({ message: 'Token revoked successfully' });
    } else {
      res.status(400).json({ error: 'Token does not contain a valid identifier' });
    }
  } catch (error) {
    res.status(400).json({ error: 'Invalid token' });
  }
};

/**
 * Verify a token is valid
 */
const verifyUserToken = (req, res) => {
  const { token } = req.body;
  
  if (!token) {
    return res.status(400).json({ error: 'Token is required' });
  }
  
  try {
    // Determine the token type and use the appropriate secret
    const decoded = jwt.decode(token);
    const secret = decoded && decoded.tokenType === 'refresh' 
      ? TOKEN_CONFIG.refresh.secret
      : TOKEN_CONFIG.access.secret;
    
    // Verify the token
    jwt.verify(token, secret);
    
    // For refresh tokens, check if it's blacklisted
    if (decoded && decoded.tokenType === 'refresh' && decoded.jti && tokenBlacklist.has(decoded.jti)) {
      return res.status(401).json({ error: 'Token has been revoked' });
    }
    
    res.json({ valid: true });
  } catch (error) {
    res.json({ valid: false, error: error.message });
  }
};

// Cleanup function for blacklisted tokens (should be called periodically)
const cleanupBlacklist = () => {
  // In a production environment, you'd remove expired tokens from the blacklist
  // With a database or Redis, you could set expiry times on blacklisted tokens
};

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  refreshToken,
  revokeToken,
  verifyUserToken,
  cleanupBlacklist
};