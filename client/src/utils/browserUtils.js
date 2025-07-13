/**
 * Browser detection utilities
 */

/**
 * Check if the app is running as a PWA (Progressive Web App)
 * @returns {boolean} True if running as PWA
 */
export const isPWA = () => {
  // Check if running in standalone mode (PWA)
  if (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) {
    return true;
  }
  
  // Check if running in fullscreen mode (PWA)
  if (window.matchMedia && window.matchMedia('(display-mode: fullscreen)').matches) {
    return true;
  }
  
  // Check if running in minimal-ui mode (PWA)
  if (window.matchMedia && window.matchMedia('(display-mode: minimal-ui)').matches) {
    return true;
  }
  
  // Fallback: check if the app is installed and running from home screen
  if (window.navigator.standalone === true) {
    return true;
  }
  
  return false;
};

/**
 * Get device type from user agent
 * @returns {string} Device type
 */
export const getDeviceType = () => {
  const userAgent = navigator.userAgent;
  
  if (/Android/i.test(userAgent)) {
    return 'Android';
  } else if (/iPhone|iPad|iPod/i.test(userAgent)) {
    return 'iOS';
  } else if (/Windows Phone/i.test(userAgent)) {
    return 'Windows Phone';
  } else if (/BlackBerry/i.test(userAgent)) {
    return 'BlackBerry';
  } else {
    return 'Desktop';
  }
};

/**
 * Get device name when available
 * @returns {string} Device name or null if not available
 */
export const getDeviceName = () => {
  // Try to get device name from various sources
  if ('deviceMemory' in navigator && 'hardwareConcurrency' in navigator) {
    // This indicates we're on a device that supports device info
    if ('userAgentData' in navigator && navigator.userAgentData.platform) {
      return navigator.userAgentData.platform;
    }
  }
  
  // Try to get from user agent for specific devices
  const userAgent = navigator.userAgent;
  
  // iOS device detection
  if (/iPhone/i.test(userAgent)) {
    // Extract iPhone model if available
    const match = userAgent.match(/iPhone\s*(?:OS\s*)?(\d+)?/i);
    if (match) {
      return 'iPhone';
    }
  }
  
  if (/iPad/i.test(userAgent)) {
    return 'iPad';
  }
  
  if (/iPod/i.test(userAgent)) {
    return 'iPod';
  }
  
  // Android device detection
  if (/Android/i.test(userAgent)) {
    // Try to extract device model from user agent
    const match = userAgent.match(/Android.*?;\s*([^;)]+)/i);
    if (match && match[1]) {
      const deviceModel = match[1].trim();
      // Clean up common device model names
      if (deviceModel && deviceModel !== 'Linux' && deviceModel !== 'Android') {
        return deviceModel;
      }
    }
  }
  
  return null;
};

/**
 * Get a friendly device identifier
 * @returns {string} Device name or type
 */
export const getDeviceIdentifier = () => {
  // First try to get the actual device name
  const deviceName = getDeviceName();
  if (deviceName) {
    return deviceName;
  }
  
  // Fallback to device type
  return getDeviceType();
};

/**
 * Get the browser name from user agent
 * @returns {string} Browser name
 */
export const getBrowserName = () => {
  const userAgent = navigator.userAgent;
  
  if (userAgent.includes('Chrome') && !userAgent.includes('Edg')) {
    return 'Chrome';
  } else if (userAgent.includes('Firefox')) {
    return 'Firefox';
  } else if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) {
    return 'Safari';
  } else if (userAgent.includes('Edg')) {
    return 'Edge';
  } else if (userAgent.includes('Opera') || userAgent.includes('OPR')) {
    return 'Opera';
  } else if (userAgent.includes('MSIE') || userAgent.includes('Trident')) {
    return 'Internet Explorer';
  } else {
    return 'Unknown Browser';
  }
};

/**
 * Get a short browser identifier for display
 * @returns {string} Short browser name or device name/type if PWA
 */
export const getShortBrowserName = () => {
  // If running as PWA, show device name/type instead of browser
  if (isPWA()) {
    const deviceIdentifier = getDeviceIdentifier();
    return deviceIdentifier;
  }
  
  const browserName = getBrowserName();
  
  // Return shorter names for common browsers
  switch (browserName) {
    case 'Chrome':
      return 'Chrome';
    case 'Firefox':
      return 'Firefox';
    case 'Safari':
      return 'Safari';
    case 'Edge':
      return 'Edge';
    case 'Opera':
      return 'Opera';
    case 'Internet Explorer':
      return 'IE';
    default:
      return browserName;
  }
}; 