/**
 * Safari-specific performance optimizations
 * Reduces latency and improves audio playback performance
 */

// Detect Safari browser
export const isSafari = () => {
  return /^((?!chrome|android).)*safari/i.test(navigator.userAgent) || 
         /iPad|iPhone|iPod/.test(navigator.userAgent);
};

// Detect iOS Safari
export const isIOSSafari = () => {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && 
         /Safari/.test(navigator.userAgent) && 
         !/CriOS|FxiOS|OPiOS|mercury/.test(navigator.userAgent);
};

// Optimized audio element setup for Safari
export const setupSafariAudioElement = (audioElement) => {
  if (!audioElement || !isSafari()) return;

  // Essential attributes for Safari performance
  audioElement.setAttribute('playsinline', 'true');
  audioElement.setAttribute('webkit-playsinline', 'true');
  audioElement.setAttribute('preload', 'metadata'); // Faster than 'auto'
  audioElement.setAttribute('crossorigin', 'anonymous');
  audioElement.crossOrigin = 'anonymous';

  // iOS-specific optimizations
  if (isIOSSafari()) {
    audioElement.setAttribute('x-webkit-airplay', 'allow');
    audioElement.removeAttribute('autoplay');
    audioElement.setAttribute('muted', 'false');
    
    // Disable automatic audio interruption
    audioElement.setAttribute('webkit-playsinline', 'true');
  }

  // Performance optimizations
  audioElement.setAttribute('controls', 'false');
  audioElement.style.display = 'none';
};

// Optimized play function for Safari
export const playSafariAudio = async (audioElement) => {
  if (!audioElement || !isSafari()) return;

  try {
    // For iOS Safari, ensure we have user interaction
    if (isIOSSafari()) {
      // Quick unlock attempt
      await audioElement.play();
      audioElement.pause();
    }
    
    // Play the audio
    await audioElement.play();
    return true;
  } catch (error) {
    // Handle autoplay restrictions silently
    if (error.name === 'NotAllowedError') {
      return false;
    }
    throw error;
  }
};

// Optimized pause function for Safari
export const pauseSafariAudio = (audioElement) => {
  if (!audioElement || !isSafari()) return;

  try {
    audioElement.pause();
    return true;
  } catch (error) {
    // Silent fail for better performance
    return false;
  }
};

// Optimized track switching for Safari
export const switchSafariTrack = (audioElement, newSrc) => {
  if (!audioElement || !isSafari()) return;

  try {
    // Pause current audio immediately
    audioElement.pause();
    
    // Set new source
    audioElement.src = newSrc;
    
    // Load metadata for faster playback
    audioElement.load();
    
    return true;
  } catch (error) {
    // Silent fail for better performance
    return false;
  }
};

// Optimized volume control for Safari
export const setSafariVolume = (audioElement, volume) => {
  if (!audioElement || !isSafari()) return;

  try {
    // Only update if volume changed significantly
    if (Math.abs(audioElement.volume - volume) > 0.01) {
      audioElement.volume = Math.max(0, Math.min(1, volume));
    }
    return true;
  } catch (error) {
    // Silent fail for better performance
    return false;
  }
};

// Optimized seek function for Safari
export const seekSafariAudio = (audioElement, time) => {
  if (!audioElement || !isSafari()) return;

  try {
    audioElement.currentTime = Math.max(0, time);
    return true;
  } catch (error) {
    // Silent fail for better performance
    return false;
  }
};

// Performance monitoring for Safari
export const monitorSafariPerformance = () => {
  if (!isSafari()) return null;

  const startTime = performance.now();
  
  return {
    end: () => {
      const duration = performance.now() - startTime;
      if (duration > 100) {
        console.warn(`Safari performance issue detected: ${duration.toFixed(2)}ms`);
      }
      return duration;
    }
  };
};

// Safari-specific event optimization
export const addSafariEventListener = (element, event, handler, options = {}) => {
  if (!isSafari()) {
    element.addEventListener(event, handler, options);
    return;
  }

  // Optimized options for Safari
  const safariOptions = {
    ...options,
    passive: options.passive !== false, // Default to passive for better performance
    capture: options.capture || false
  };

  element.addEventListener(event, handler, safariOptions);
};

// Safari-specific debounce for better performance
export const safariDebounce = (func, wait) => {
  if (!isSafari()) return func;

  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

// Safari-specific throttle for better performance
export const safariThrottle = (func, limit) => {
  if (!isSafari()) return func;

  let inThrottle;
  return function executedFunction(...args) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}; 