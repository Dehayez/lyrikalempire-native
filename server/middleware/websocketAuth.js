const jwt = require('jsonwebtoken');

/**
 * WebSocket authentication middleware
 * Validates JWT token from handshake query or auth token
 */
const authenticateWebSocket = (socket, next) => {
  try {
    // Get token from handshake query or auth header
    const token = socket.handshake.query?.token || socket.handshake.auth?.token;
    
    if (!token) {
      return next(new Error('Authentication token required'));
    }

    // Verify JWT token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Attach user data to socket for use in handlers
    socket.userId = decoded.id;
    socket.userEmail = decoded.email;
    socket.userPlan = decoded.plan_type;
    
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return next(new Error('Token expired'));
    } else if (error.name === 'JsonWebTokenError') {
      return next(new Error('Invalid token'));
    }
    return next(new Error('Authentication failed'));
  }
};

module.exports = authenticateWebSocket;

