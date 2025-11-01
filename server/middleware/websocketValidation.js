/**
 * WebSocket input validation middleware
 * Validates all incoming WebSocket event data
 */

const validateBeatId = (beatId) => {
  if (!beatId || typeof beatId !== 'number') {
    return { valid: false, error: 'Invalid beatId: must be a number' };
  }
  if (beatId <= 0 || !Number.isInteger(beatId)) {
    return { valid: false, error: 'Invalid beatId: must be a positive integer' };
  }
  return { valid: true };
};

const validateSessionId = (sessionId) => {
  if (!sessionId || typeof sessionId !== 'string') {
    return { valid: false, error: 'Invalid sessionId: must be a string' };
  }
  if (sessionId.length < 10 || sessionId.length > 100) {
    return { valid: false, error: 'Invalid sessionId: length must be between 10 and 100 characters' };
  }
  // Prevent XSS attempts in sessionId
  if (!/^[a-zA-Z0-9_-]+$/.test(sessionId)) {
    return { valid: false, error: 'Invalid sessionId: contains invalid characters' };
  }
  return { valid: true };
};

const validateTimestamp = (timestamp) => {
  if (!timestamp || typeof timestamp !== 'number') {
    return { valid: false, error: 'Invalid timestamp: must be a number' };
  }
  const now = Date.now();
  const maxAge = 60 * 60 * 1000; // 1 hour
  // Timestamp should be recent (not too old, not in the future)
  if (timestamp < now - maxAge || timestamp > now + 5000) {
    return { valid: false, error: 'Invalid timestamp: too old or in the future' };
  }
  return { valid: true };
};

const validateCurrentTime = (currentTime) => {
  if (currentTime === undefined || currentTime === null) {
    return { valid: false, error: 'Invalid currentTime: required' };
  }
  if (typeof currentTime !== 'number') {
    return { valid: false, error: 'Invalid currentTime: must be a number' };
  }
  if (currentTime < 0) {
    return { valid: false, error: 'Invalid currentTime: must be non-negative' };
  }
  // Reasonable max duration (24 hours in seconds)
  if (currentTime > 86400) {
    return { valid: false, error: 'Invalid currentTime: exceeds maximum duration' };
  }
  return { valid: true };
};

/**
 * Validate audio-play event data
 */
const validateAudioPlay = (data) => {
  if (!data || typeof data !== 'object') {
    return { valid: false, error: 'Invalid data: must be an object' };
  }

  const beatIdValidation = validateBeatId(data.beatId);
  if (!beatIdValidation.valid) return beatIdValidation;

  const sessionIdValidation = validateSessionId(data.sessionId);
  if (!sessionIdValidation.valid) return sessionIdValidation;

  const timestampValidation = validateTimestamp(data.timestamp);
  if (!timestampValidation.valid) return timestampValidation;

  const currentTimeValidation = validateCurrentTime(data.currentTime);
  if (!currentTimeValidation.valid) return currentTimeValidation;

  if (data.sessionName && (typeof data.sessionName !== 'string' || data.sessionName.length > 50)) {
    return { valid: false, error: 'Invalid sessionName: must be a string with max 50 characters' };
  }

  return { valid: true };
};

/**
 * Validate audio-pause event data
 */
const validateAudioPause = (data) => {
  if (!data || typeof data !== 'object') {
    return { valid: false, error: 'Invalid data: must be an object' };
  }

  const beatIdValidation = validateBeatId(data.beatId);
  if (!beatIdValidation.valid) return beatIdValidation;

  const timestampValidation = validateTimestamp(data.timestamp);
  if (!timestampValidation.valid) return timestampValidation;

  const currentTimeValidation = validateCurrentTime(data.currentTime);
  if (!currentTimeValidation.valid) return currentTimeValidation;

  if (data.sessionId) {
    const sessionIdValidation = validateSessionId(data.sessionId);
    if (!sessionIdValidation.valid) return sessionIdValidation;
  }

  return { valid: true };
};

/**
 * Validate audio-seek event data
 */
const validateAudioSeek = (data) => {
  if (!data || typeof data !== 'object') {
    return { valid: false, error: 'Invalid data: must be an object' };
  }

  const beatIdValidation = validateBeatId(data.beatId);
  if (!beatIdValidation.valid) return beatIdValidation;

  const timestampValidation = validateTimestamp(data.timestamp);
  if (!timestampValidation.valid) return timestampValidation;

  const currentTimeValidation = validateCurrentTime(data.currentTime);
  if (!currentTimeValidation.valid) return currentTimeValidation;

  return { valid: true };
};

/**
 * Validate beat-change event data
 */
const validateBeatChange = (data) => {
  if (!data || typeof data !== 'object') {
    return { valid: false, error: 'Invalid data: must be an object' };
  }

  const beatIdValidation = validateBeatId(data.beatId);
  if (!beatIdValidation.valid) return beatIdValidation;

  const timestampValidation = validateTimestamp(data.timestamp);
  if (!timestampValidation.valid) return timestampValidation;

  if (data.beat && typeof data.beat !== 'object') {
    return { valid: false, error: 'Invalid beat: must be an object' };
  }

  return { valid: true };
};

/**
 * Validate state-response event data
 */
const validateStateResponse = (data) => {
  if (!data || typeof data !== 'object') {
    return { valid: false, error: 'Invalid data: must be an object' };
  }

  const beatIdValidation = validateBeatId(data.beatId);
  if (!beatIdValidation.valid) return beatIdValidation;

  const sessionIdValidation = validateSessionId(data.sessionId);
  if (!sessionIdValidation.valid) return sessionIdValidation;

  const timestampValidation = validateTimestamp(data.timestamp);
  if (!timestampValidation.valid) return timestampValidation;

  if (typeof data.isPlaying !== 'boolean') {
    return { valid: false, error: 'Invalid isPlaying: must be a boolean' };
  }

  if (data.isPlaying) {
    const currentTimeValidation = validateCurrentTime(data.currentTime);
    if (!currentTimeValidation.valid) return currentTimeValidation;
  }

  if (data.beat && typeof data.beat !== 'object') {
    return { valid: false, error: 'Invalid beat: must be an object' };
  }

  return { valid: true };
};

/**
 * WebSocket validation wrapper
 */
const validateWebSocketEvent = (eventName, data) => {
  switch (eventName) {
    case 'audio-play':
      return validateAudioPlay(data);
    case 'audio-pause':
      return validateAudioPause(data);
    case 'audio-seek':
      return validateAudioSeek(data);
    case 'beat-change':
      return validateBeatChange(data);
    case 'state-response':
      return validateStateResponse(data);
    case 'request-state':
      // No data needed for state request
      return { valid: true };
    case 'master-closed':
      // Basic validation for master-closed
      if (data && typeof data === 'object') {
        const beatIdValidation = data.beatId ? validateBeatId(data.beatId) : { valid: true };
        if (!beatIdValidation.valid) return beatIdValidation;
      }
      return { valid: true };
    default:
      return { valid: false, error: `Unknown event type: ${eventName}` };
  }
};

module.exports = {
  validateWebSocketEvent,
  validateBeatId,
  validateSessionId,
  validateTimestamp,
  validateCurrentTime
};

