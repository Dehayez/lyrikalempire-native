/**
 * Browser detection utilities
 */

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
 * @returns {string} Short browser name
 */
export const getShortBrowserName = () => {
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