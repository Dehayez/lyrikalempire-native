/**
 * Mobile Performance Monitor
 * Tracks CPU usage, memory leaks, excessive re-renders, and API calls
 */

// Store original methods ONCE at module load (before any interception)
const ORIGINAL_FETCH = window.fetch;
const ORIGINAL_XHR = window.XMLHttpRequest;
const ORIGINAL_SET_INTERVAL = window.setInterval;
const ORIGINAL_SET_TIMEOUT = window.setTimeout;
const ORIGINAL_CLEAR_INTERVAL = window.clearInterval;
const ORIGINAL_CLEAR_TIMEOUT = window.clearTimeout;
const ORIGINAL_AUDIO_PLAY = HTMLAudioElement.prototype.play;

class MobilePerformanceMonitor {
  constructor() {
    this.isEnabled = false;
    this.metrics = {
      cpuUsage: [],
      memoryUsage: [],
      renderTimes: [],
      apiCalls: [],
      audioOperations: [],
      domMutations: [],
      eventListeners: [],
      intervals: new Set(),
      timeouts: new Set()
    };
    
    // Use module-level originals (never overwritten)
    this.originalFetch = ORIGINAL_FETCH;
    this.originalXMLHttpRequest = ORIGINAL_XHR;
    this.originalSetInterval = ORIGINAL_SET_INTERVAL;
    this.originalSetTimeout = ORIGINAL_SET_TIMEOUT;
    this.originalClearInterval = ORIGINAL_CLEAR_INTERVAL;
    this.originalClearTimeout = ORIGINAL_CLEAR_TIMEOUT;
    this.originalAudioPlay = ORIGINAL_AUDIO_PLAY;
    
    this.startTime = Date.now();
    this.lastCpuCheck = Date.now();
    this.performanceObserver = null;
    this.cpuTimeoutId = null;
    this.memoryTimeoutId = null;
    this.renderAnimationFrameId = null;
    this.errorHandler = this.handleError.bind(this);
    this.promiseRejectionHandler = this.handlePromiseRejection.bind(this);
    
    // Track if methods are currently intercepted
    this.isIntercepted = false;
  }

  enable(options = {}) {
    if (this.isEnabled) return;
    this.isEnabled = true;
    
    // Clear any stale metrics first
    this.clearMetrics();
    
    // Only intercept if not already intercepted
    if (!this.isIntercepted) {
      this.interceptNetworkRequests();
      
      // Only intercept timers if explicitly requested (can cause conflicts)
      if (options.interceptTimers) {
        this.interceptTimers();
      }
      
      this.isIntercepted = true;
    }
    
    this.startCpuMonitoring();
    this.startMemoryMonitoring();
    this.startRenderMonitoring();
    
    // Add global error handler
    window.addEventListener('error', this.errorHandler);
    window.addEventListener('unhandledrejection', this.promiseRejectionHandler);
  }

  disable() {
    if (!this.isEnabled) return;
    this.isEnabled = false;
    
    // Clear all active timers and animation frames using original methods
    if (this.cpuTimeoutId !== null) {
      ORIGINAL_CLEAR_TIMEOUT(this.cpuTimeoutId);
      this.cpuTimeoutId = null;
    }
    if (this.memoryTimeoutId !== null) {
      ORIGINAL_CLEAR_TIMEOUT(this.memoryTimeoutId);
      this.memoryTimeoutId = null;
    }
    if (this.renderAnimationFrameId !== null) {
      cancelAnimationFrame(this.renderAnimationFrameId);
      this.renderAnimationFrameId = null;
    }
    
    // Restore all intercepted methods
    if (this.isIntercepted) {
      this.restoreNetworkRequests();
      this.restoreXMLHttpRequests();
      this.restoreTimers();
      this.restoreAudioMethods();
      this.isIntercepted = false;
    }
    
    this.stopMonitoring();
    
    // Clear metrics to prevent memory accumulation
    this.clearMetrics();
    
    window.removeEventListener('error', this.errorHandler);
    window.removeEventListener('unhandledrejection', this.promiseRejectionHandler);
  }

  // CPU Usage Monitoring
  startCpuMonitoring() {
    const checkCpu = () => {
      if (!this.isEnabled) {
        this.cpuTimeoutId = null;
        return;
      }
      
      const now = Date.now();
      const timeDiff = now - this.lastCpuCheck;
      
      // Use performance.now() for high precision timing
      const startTime = performance.now();
      
      // Force a small computation to measure CPU usage
      let dummy = 0;
      for (let i = 0; i < 100000; i++) {
        dummy += Math.random();
      }
      
      const endTime = performance.now();
      const executionTime = endTime - startTime;
      
      // Calculate approximate CPU usage (this is a simplified metric)
      const cpuUsage = Math.min(100, (executionTime / 10) * 100);
      
      this.metrics.cpuUsage.push({
        timestamp: now,
        usage: cpuUsage,
        executionTime,
        timeDiff
      });
      
      // Keep only last 100 measurements
      if (this.metrics.cpuUsage.length > 100) {
        this.metrics.cpuUsage.shift();
      }
      
      // Log high CPU usage (disabled for production)
      // if (cpuUsage > 80) {
      //   console.warn(`[Performance] High CPU usage detected: ${cpuUsage.toFixed(2)}%`);
      // }
      
      this.lastCpuCheck = now;
      this.cpuTimeoutId = setTimeout(checkCpu, 1000); // Check every second
    };
    
    checkCpu();
  }

  // Memory Usage Monitoring
  startMemoryMonitoring() {
    const checkMemory = () => {
      if (!this.isEnabled) {
        this.memoryTimeoutId = null;
        return;
      }
      
      if ('memory' in performance) {
        const memory = performance.memory;
        const memoryUsage = {
          timestamp: Date.now(),
          used: Math.round(memory.usedJSHeapSize / 1024 / 1024),
          total: Math.round(memory.totalJSHeapSize / 1024 / 1024),
          limit: Math.round(memory.jsHeapSizeLimit / 1024 / 1024)
        };
        
        this.metrics.memoryUsage.push(memoryUsage);
        
        // Keep only last 50 measurements
        if (this.metrics.memoryUsage.length > 50) {
          this.metrics.memoryUsage.shift();
        }
        
        // Log high memory usage (disabled for production)
        // if (memoryUsage.used > memoryUsage.limit * 0.8) {
        //   console.warn(`[Performance] High memory usage: ${memoryUsage.used}MB / ${memoryUsage.limit}MB`);
        // }
      }
      
      this.memoryTimeoutId = setTimeout(checkMemory, 2000); // Check every 2 seconds
    };
    
    checkMemory();
  }

  // Render Performance Monitoring
  startRenderMonitoring() {
    this.performanceObserver = new PerformanceObserver((list) => {
      if (!this.isEnabled) return;
      
      for (const entry of list.getEntries()) {
        if (entry.entryType === 'measure') {
          this.metrics.renderTimes.push({
            timestamp: Date.now(),
            name: entry.name,
            duration: entry.duration,
            startTime: entry.startTime
          });
          
          // Keep only last 200 render measurements
          if (this.metrics.renderTimes.length > 200) {
            this.metrics.renderTimes.shift();
          }
          
          // Log slow renders (disabled for production)
          // if (entry.duration > 16) { // 60fps threshold
          //   console.warn(`[Performance] Slow render: ${entry.name} took ${entry.duration.toFixed(2)}ms`);
          // }
        }
      }
    });
    
    // Monitor multiple entry types for better coverage
    this.performanceObserver.observe({ entryTypes: ['measure', 'navigation', 'paint'] });
    
    // Create a periodic render performance check
    this.startRenderPerformanceCheck();
  }
  
  startRenderPerformanceCheck() {
    let lastFrameTime = performance.now();
    let frameCount = 0;
    
    const checkRenderPerformance = () => {
      if (!this.isEnabled) {
        this.renderAnimationFrameId = null;
        return;
      }
      
      const currentTime = performance.now();
      const deltaTime = currentTime - lastFrameTime;
      
      // Track frame timing (60fps = 16.67ms per frame)
      frameCount++;
      if (frameCount % 10 === 0) { // Check every 10 frames
        const avgFrameTime = deltaTime / 10;
        
        this.metrics.renderTimes.push({
          timestamp: Date.now(),
          name: 'frame-timing',
          duration: avgFrameTime,
          startTime: currentTime
        });
        
        // Keep only last 200 render measurements
        if (this.metrics.renderTimes.length > 200) {
          this.metrics.renderTimes.shift();
        }
        
        // Log slow frame timing (disabled for production)
        // if (avgFrameTime > 16.67) {
        //   console.warn(`[Performance] Slow frame timing: ${avgFrameTime.toFixed(2)}ms (target: 16.67ms for 60fps)`);
        // }
      }
      
      lastFrameTime = currentTime;
      this.renderAnimationFrameId = requestAnimationFrame(checkRenderPerformance);
    };
    
    this.renderAnimationFrameId = requestAnimationFrame(checkRenderPerformance);
  }

  // Audio Performance Monitoring
  startAudioMonitoring() {
    if (!this.isEnabled) return;
    
    // Monitor audio context usage
    const originalCreateAnalyser = AudioContext.prototype.createAnalyser;
    AudioContext.prototype.createAnalyser = function() {
      const analyser = originalCreateAnalyser.call(this);
      // console.log('[Performance] Audio analyser created'); // Disabled for production
      return analyser;
    };

    // Monitor audio element operations
    const originalAudioPlay = HTMLAudioElement.prototype.play;
    const performanceMonitor = this; // Capture the correct 'this' context
    
    HTMLAudioElement.prototype.play = function() {
      const startTime = performance.now();
      
      // Use the correct metrics reference
      performanceMonitor.metrics.audioOperations.push({
        timestamp: Date.now(),
        operation: 'play',
        startTime
      });
      
      return originalAudioPlay.call(this).then(() => {
        const endTime = performance.now();
        const duration = endTime - startTime;
        // console.log(`[Performance] Audio play took ${duration.toFixed(2)}ms`); // Disabled for production
      });
    };
  }

  // DOM Mutation Monitoring
  startDomMonitoring() {
    this.domObserver = new MutationObserver((mutations) => {
      if (!this.isEnabled) return;
      
      const domMutations = {
        timestamp: Date.now(),
        count: mutations.length,
        types: mutations.map(m => m.type)
      };
      
      this.metrics.domMutations.push(domMutations);
      
      // Log excessive DOM mutations (disabled for production)
      // if (mutations.length > 200) {
      //   console.warn(`[Performance] Excessive DOM mutations: ${mutations.length}`);
      // }
    });
    
    this.domObserver.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeOldValue: true
    });
  }

  // Network Request Monitoring
  interceptNetworkRequests() {
    const performanceMonitor = this;
    
    window.fetch = function(...args) {
      const startTime = performance.now();
      const url = args[0];
      
      return ORIGINAL_FETCH.apply(window, args)
        .then(response => {
          if (!performanceMonitor.isEnabled) return response;
          
          const endTime = performance.now();
          const duration = endTime - startTime;
          
          performanceMonitor.metrics.apiCalls.push({
            timestamp: Date.now(),
            url: typeof url === 'string' ? url : url.toString(),
            method: 'GET',
            duration,
            status: response.status,
            size: response.headers.get('content-length') || 'unknown'
          });
          
          // Keep only last 100 API calls (reduced from 500)
          if (performanceMonitor.metrics.apiCalls.length > 100) {
            performanceMonitor.metrics.apiCalls.shift();
          }
          
          return response;
        })
        .catch(error => {
          if (!performanceMonitor.isEnabled) throw error;
          
          const endTime = performance.now();
          const duration = endTime - startTime;
          
          performanceMonitor.metrics.apiCalls.push({
            timestamp: Date.now(),
            url: typeof url === 'string' ? url : url.toString(),
            method: 'GET',
            duration,
            status: 'error',
            error: error.message
          });
          
          // Keep only last 100 API calls (reduced from 500)
          if (performanceMonitor.metrics.apiCalls.length > 100) {
            performanceMonitor.metrics.apiCalls.shift();
          }
          
          throw error;
        });
    };

    // Intercept XMLHttpRequest
    this.interceptXMLHttpRequests();
  }

  interceptXMLHttpRequests() {
    const performanceMonitor = this;

    window.XMLHttpRequest = function() {
      const xhr = new ORIGINAL_XHR();
      const startTime = performance.now();
      let url = '';
      let method = 'GET';

      // Override open to capture URL and method
      const originalOpen = xhr.open;
      xhr.open = function(m, u, ...args) {
        method = m;
        url = u;
        return originalOpen.apply(this, [m, u, ...args]);
      };

      // Override send to track the request
      const originalSend = xhr.send;
      xhr.send = function(data) {
        xhr.addEventListener('loadend', function() {
          if (!performanceMonitor.isEnabled) return;
          
          const endTime = performance.now();
          const duration = endTime - startTime;

          performanceMonitor.metrics.apiCalls.push({
            timestamp: Date.now(),
            url: url,
            method: method,
            duration,
            status: xhr.status,
            size: xhr.getResponseHeader('content-length') || 'unknown',
            type: 'xhr'
          });

          // Keep only last 100 API calls (reduced from 500)
          if (performanceMonitor.metrics.apiCalls.length > 100) {
            performanceMonitor.metrics.apiCalls.shift();
          }
        });

        return originalSend.apply(this, [data]);
      };

      return xhr;
    };

    // Copy static properties from original XMLHttpRequest
    Object.setPrototypeOf(window.XMLHttpRequest, ORIGINAL_XHR);
    Object.defineProperty(window.XMLHttpRequest, 'prototype', {
      value: ORIGINAL_XHR.prototype,
      writable: false
    });
  }

  // Timer Monitoring
  interceptTimers() {
    const performanceMonitor = this;
    
    window.setInterval = function(...args) {
      const id = ORIGINAL_SET_INTERVAL.apply(window, args);
      if (performanceMonitor.isEnabled) {
        performanceMonitor.metrics.intervals.add({ id, timestamp: Date.now(), delay: args[1] });
      }
      return id;
    };

    window.setTimeout = function(...args) {
      const id = ORIGINAL_SET_TIMEOUT.apply(window, args);
      if (performanceMonitor.isEnabled) {
        performanceMonitor.metrics.timeouts.add({ id, timestamp: Date.now(), delay: args[1] });
      }
      return id;
    };

    window.clearInterval = function(id) {
      if (performanceMonitor.isEnabled) {
        for (const interval of performanceMonitor.metrics.intervals) {
          if (interval.id === id) {
            performanceMonitor.metrics.intervals.delete(interval);
            break;
          }
        }
      }
      return ORIGINAL_CLEAR_INTERVAL.call(window, id);
    };

    window.clearTimeout = function(id) {
      if (performanceMonitor.isEnabled) {
        for (const timeout of performanceMonitor.metrics.timeouts) {
          if (timeout.id === id) {
            performanceMonitor.metrics.timeouts.delete(timeout);
            break;
          }
        }
      }
      return ORIGINAL_CLEAR_TIMEOUT.call(window, id);
    };
  }

  // Error Handling
  handleError(event) {
    // console.error(`[Performance] Global error: ${event.error?.message}`, event.error); // Disabled for production
  }

  handlePromiseRejection(event) {
    // console.error(`[Performance] Unhandled promise rejection: ${event.reason}`); // Disabled for production
  }

  // Restore Methods - use module-level originals
  restoreNetworkRequests() {
    window.fetch = ORIGINAL_FETCH;
  }

  restoreXMLHttpRequests() {
    window.XMLHttpRequest = ORIGINAL_XHR;
  }

  restoreTimers() {
    window.setInterval = ORIGINAL_SET_INTERVAL;
    window.setTimeout = ORIGINAL_SET_TIMEOUT;
    window.clearInterval = ORIGINAL_CLEAR_INTERVAL;
    window.clearTimeout = ORIGINAL_CLEAR_TIMEOUT;
  }

  restoreAudioMethods() {
    HTMLAudioElement.prototype.play = ORIGINAL_AUDIO_PLAY;
  }

  // Test API monitoring - disabled to prevent unnecessary network requests
  testApiMonitoring() {
    // Disabled - was making unnecessary network requests
  }

  stopMonitoring() {
    if (this.performanceObserver) {
      this.performanceObserver.disconnect();
      this.performanceObserver = null;
    }
    if (this.domObserver) {
      this.domObserver.disconnect();
      this.domObserver = null;
    }
  }

  // Clear all metrics to prevent memory accumulation
  clearMetrics() {
    this.metrics.cpuUsage = [];
    this.metrics.memoryUsage = [];
    this.metrics.renderTimes = [];
    this.metrics.apiCalls = [];
    this.metrics.audioOperations = [];
    this.metrics.domMutations = [];
    this.metrics.eventListeners = [];
    this.metrics.intervals.clear();
    this.metrics.timeouts.clear();
    this.startTime = Date.now();
    this.lastCpuCheck = Date.now();
  }

  // Get Performance Report
  getReport() {
    const now = Date.now();
    const uptime = now - this.startTime;
    
    const avgCpuUsage = this.metrics.cpuUsage.length > 0 
      ? this.metrics.cpuUsage.reduce((sum, m) => sum + m.usage, 0) / this.metrics.cpuUsage.length 
      : 0;
    
    const avgMemoryUsage = this.metrics.memoryUsage.length > 0 
      ? this.metrics.memoryUsage.reduce((sum, m) => sum + m.used, 0) / this.metrics.memoryUsage.length 
      : 0;
    
    const avgRenderTime = this.metrics.renderTimes.length > 0 
      ? this.metrics.renderTimes.reduce((sum, m) => sum + m.duration, 0) / this.metrics.renderTimes.length 
      : 0;
    
    const avgApiLatency = this.metrics.apiCalls.length > 0 
      ? this.metrics.apiCalls.reduce((sum, m) => sum + m.duration, 0) / this.metrics.apiCalls.length 
      : 0;
    
    const activeIntervals = this.metrics.intervals.size;
    const activeTimeouts = this.metrics.timeouts.size;
    
    return {
      uptime: Math.round(uptime / 1000),
      avgCpuUsage: Math.round(avgCpuUsage * 100) / 100,
      avgMemoryUsage: Math.round(avgMemoryUsage),
      avgRenderTime: Math.round(avgRenderTime * 100) / 100,
      avgApiLatency: Math.round(avgApiLatency * 100) / 100,
      totalApiCalls: this.metrics.apiCalls.length,
      activeIntervals,
      activeTimeouts,
      totalDomMutations: this.metrics.domMutations.reduce((sum, m) => sum + m.count, 0),
      totalAudioOperations: this.metrics.audioOperations.length,
      metrics: this.metrics
    };
  }

  // Log Performance Report
  logReport() {
    const report = this.getReport();
    console.log('=== Mobile Performance Report ===');
    console.log(`Uptime: ${report.uptime}s`);
    console.log(`Avg CPU Usage: ${report.avgCpuUsage}%`);
    console.log(`Avg Memory Usage: ${report.avgMemoryUsage}MB`);
    console.log(`Avg Render Time: ${report.avgRenderTime}ms`);
    console.log(`Avg API Latency: ${report.avgApiLatency}ms`);
    console.log(`Total API Calls: ${report.totalApiCalls}`);
    console.log(`Active Intervals: ${report.activeIntervals}`);
    console.log(`Active Timeouts: ${report.activeTimeouts}`);
    console.log(`Total DOM Mutations: ${report.totalDomMutations}`);
    console.log(`Total Audio Operations: ${report.totalAudioOperations}`);
    console.log('================================');
    
    return report;
  }

  // Export data for analysis
  exportData() {
    return {
      report: this.getReport(),
      rawMetrics: this.metrics,
      timestamp: Date.now()
    };
  }
}

// Create singleton instance
const mobilePerformanceMonitor = new MobilePerformanceMonitor();

// Note: Enable/disable is handled by App.js based on user permissions
// Auto-enable removed to prevent conflicts and ensure proper cleanup

export default mobilePerformanceMonitor;
