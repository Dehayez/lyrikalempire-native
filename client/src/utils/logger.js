// Centralized logging utility with environment-based control

const isDevelopment = process.env.NODE_ENV === 'development';

export const logger = {
  log: (...args) => {
    if (isDevelopment) {
      console.log(...args);
    }
  },
  
  info: (message, data) => {
    if (isDevelopment) {
      console.log(`ℹ️ ${message}`, data || '');
    }
  },
  
  success: (message, data) => {
    if (isDevelopment) {
      console.log(`✅ ${message}`, data || '');
    }
  },
  
  error: (message, error) => {
    // Always log errors, even in production
    console.error(`❌ ${message}`, error || '');
  },
  
  warn: (message, data) => {
    if (isDevelopment) {
      console.warn(`⚠️ ${message}`, data || '');
    }
  },
  
  perf: (label, duration) => {
    if (isDevelopment) {
      console.log(`⏱️ ${label}: ${duration.toFixed(2)}ms`);
    }
  }
};

