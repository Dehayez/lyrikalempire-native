/**
 * WebSocket rate limiting middleware
 * Prevents spam and DoS attacks
 */

// Store event counts per socket
const eventCounts = new Map();

// Rate limit configuration
const RATE_LIMITS = {
  'audio-play': { max: 10, window: 10000 }, // 10 events per 10 seconds
  'audio-pause': { max: 10, window: 10000 },
  'audio-seek': { max: 20, window: 5000 }, // 20 events per 5 seconds
  'beat-change': { max: 5, window: 5000 }, // 5 events per 5 seconds
  'state-response': { max: 5, window: 10000 },
  'request-state': { max: 5, window: 10000 },
  'master-closed': { max: 5, window: 60000 }, // 5 events per minute
  default: { max: 30, window: 10000 } // Default: 30 events per 10 seconds
};

// Cleanup old entries every minute
setInterval(() => {
  const now = Date.now();
  for (const [socketId, events] of eventCounts.entries()) {
    for (const [eventName, timestamps] of events.entries()) {
      const limit = RATE_LIMITS[eventName] || RATE_LIMITS.default;
      // Remove timestamps older than the window
      const filtered = timestamps.filter(ts => now - ts < limit.window);
      if (filtered.length === 0) {
        events.delete(eventName);
      } else {
        events.set(eventName, filtered);
      }
    }
    if (events.size === 0) {
      eventCounts.delete(socketId);
    }
  }
}, 60000); // Cleanup every minute

/**
 * Check if an event exceeds rate limit
 */
const checkRateLimit = (socketId, eventName) => {
  const limit = RATE_LIMITS[eventName] || RATE_LIMITS.default;
  const now = Date.now();

  if (!eventCounts.has(socketId)) {
    eventCounts.set(socketId, new Map());
  }

  const socketEvents = eventCounts.get(socketId);

  if (!socketEvents.has(eventName)) {
    socketEvents.set(eventName, []);
  }

  const timestamps = socketEvents.get(eventName);

  // Remove old timestamps outside the window
  const recentTimestamps = timestamps.filter(ts => now - ts < limit.window);

  // Check if limit exceeded
  if (recentTimestamps.length >= limit.max) {
    return {
      allowed: false,
      error: `Rate limit exceeded for ${eventName}. Max ${limit.max} events per ${limit.window}ms`
    };
  }

  // Add current timestamp
  recentTimestamps.push(now);
  socketEvents.set(eventName, recentTimestamps);

  return { allowed: true };
};

/**
 * Clean up rate limit data when socket disconnects
 */
const cleanupSocket = (socketId) => {
  eventCounts.delete(socketId);
};

module.exports = {
  checkRateLimit,
  cleanupSocket
};

