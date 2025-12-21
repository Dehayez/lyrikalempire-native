/**
 * Mobile Performance Monitor
 * Tracks CPU usage, memory leaks, excessive re-renders, and API calls
 */

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
    
    this.originalFetch = window.fetch;
    this.originalXMLHttpRequest = window.XMLHttpRequest;
    this.originalSetInterval = window.setInterval;
    this.originalSetTimeout = window.setTimeout;
    this.originalClearInterval = window.clearInterval;
    this.originalClearTimeout = window.clearTimeout;
    
    // Store original audio methods
    this.originalAudioPlay = HTMLAudioElement.prototype.play;
    
    this.startTime = Date.now();
    this.lastCpuCheck = Date.now();
    this.performanceObserver = null;
    this.cpuTimeoutId = null;
    this.memoryTimeoutId = null;
    this.renderAnimationFrameId = null;
    this.errorHandler = this.handleError.bind(this);
    this.promiseRejectionHandler = this.handlePromiseRejection.bind(this);
  }

  enable(options = {}) {
    if (this.isEnabled) return;
    this.isEnabled = true;
    
    this.interceptNetworkRequests();
    
    // Only intercept timers if explicitly requested (can cause conflicts)
    if (options.interceptTimers) {
      this.interceptTimers();
    }
    
    this.startCpuMonitoring();
    this.startMemoryMonitoring();
    this.startRenderMonitoring();
    // this.startAudioMonitoring(); // Disabled - too intrusive, breaks audio playback
    // this.startDomMonitoring(); // Temporarily disabled - causing too much noise
    
    // Test API monitoring with a simple call
    this.testApiMonitoring();
    
    // Add global error handler
    window.addEventListener('error', this.errorHandler);
    window.addEventListener('unhandledrejection', this.promiseRejectionHandler);
  }

  disable() {
    if (!this.isEnabled) return;
    this.isEnabled = false;
    
    // Clear all active timers and animation frames
    if (this.cpuTimeoutId !== null) {
      clearTimeout(this.cpuTimeoutId);
      this.cpuTimeoutId = null;
    }
    if (this.memoryTimeoutId !== null) {
      clearTimeout(this.memoryTimeoutId);
      this.memoryTimeoutId = null;
    }
    if (this.renderAnimationFrameId !== null) {
      cancelAnimationFrame(this.renderAnimationFrameId);
      this.renderAnimationFrameId = null;
    }
    
    this.restoreNetworkRequests();
    this.restoreXMLHttpRequests();
    this.restoreTimers();
    this.restoreAudioMethods();
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
    window.fetch = async (...args) => {
      const startTime = performance.now();
      const url = args[0];
      
      try {
        const response = await this.originalFetch.apply(this, args);
        const endTime = performance.now();
        const duration = endTime - startTime;
        
        this.metrics.apiCalls.push({
          timestamp: Date.now(),
          url: typeof url === 'string' ? url : url.toString(),
          method: 'GET',
          duration,
          status: response.status,
          size: response.headers.get('content-length') || 'unknown'
        });
        
        // Keep only last 500 API calls
        if (this.metrics.apiCalls.length > 500) {
          this.metrics.apiCalls.shift();
        }
        
      // Log slow requests (disabled for production)
      // if (duration > 1000) {
      //   console.warn(`[Performance] Slow API call: ${url} took ${duration.toFixed(2)}ms`);
      // }
        
        return response;
      } catch (error) {
        const endTime = performance.now();
        const duration = endTime - startTime;
        
        this.metrics.apiCalls.push({
          timestamp: Date.now(),
          url: typeof url === 'string' ? url : url.toString(),
          method: 'GET',
          duration,
          status: 'error',
          error: error.message
        });
        
        // Keep only last 500 API calls
        if (this.metrics.apiCalls.length > 500) {
          this.metrics.apiCalls.shift();
        }
        
        throw error;
      }
    };

    // Intercept XMLHttpRequest
    this.interceptXMLHttpRequests();
  }

  interceptXMLHttpRequests() {
    const originalXHR = this.originalXMLHttpRequest;
    const performanceMonitor = this;

    window.XMLHttpRequest = function() {
      const xhr = new originalXHR();
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

          // Keep only last 500 API calls
          if (performanceMonitor.metrics.apiCalls.length > 500) {
            performanceMonitor.metrics.apiCalls.shift();
          }

          // Log slow requests (disabled for production)
          // if (duration > 1000) {
          //   console.warn(`[Performance] Slow XHR request: ${url} took ${duration.toFixed(2)}ms`);
          // }
        });

        return originalSend.apply(this, [data]);
      };

      return xhr;
    };

    // Copy static properties from original XMLHttpRequest
    Object.setPrototypeOf(window.XMLHttpRequest, originalXHR);
    Object.defineProperty(window.XMLHttpRequest, 'prototype', {
      value: originalXHR.prototype,
      writable: false
    });
  }

  // Timer Monitoring
  interceptTimers() {
    window.setInterval = (...args) => {
      const id = this.originalSetInterval.apply(this, args);
      this.metrics.intervals.add({
        id,
        timestamp: Date.now(),
        delay: args[1],
        callback: args[0].toString().substring(0, 100)
      });
      
      // console.log(`[Performance] setInterval created: ${args[1]}ms`); // Disabled for production
      return id;
    };

    window.setTimeout = (...args) => {
      const id = this.originalSetTimeout.apply(this, args);
      this.metrics.timeouts.add({
        id,
        timestamp: Date.now(),
        delay: args[1],
        callback: args[0].toString().substring(0, 100)
      });
      
      // Log very short timeouts (disabled for production)
      // if (args[1] < 100) {
      //   console.log(`[Performance] Short setTimeout: ${args[1]}ms`);
      // }
      return id;
    };

    window.clearInterval = (id) => {
      try {
        // Find and remove the interval object by ID
        for (const interval of this.metrics.intervals) {
          if (interval.id === id) {
            this.metrics.intervals.delete(interval);
            break;
          }
        }
        return this.originalClearInterval.call(this, id);
      } catch (error) {
        // console.warn('[Performance] Error clearing interval:', error); // Disabled for production
        return this.originalClearInterval.call(this, id);
      }
    };

    window.clearTimeout = (id) => {
      try {
        // Find and remove the timeout object by ID
        for (const timeout of this.metrics.timeouts) {
          if (timeout.id === id) {
            this.metrics.timeouts.delete(timeout);
            break;
          }
        }
        return this.originalClearTimeout.call(this, id);
      } catch (error) {
        // console.warn('[Performance] Error clearing timeout:', error); // Disabled for production
        return this.originalClearTimeout.call(this, id);
      }
    };
  }

  // Error Handling
  handleError(event) {
    // console.error(`[Performance] Global error: ${event.error?.message}`, event.error); // Disabled for production
  }

  handlePromiseRejection(event) {
    // console.error(`[Performance] Unhandled promise rejection: ${event.reason}`); // Disabled for production
  }

  // Restore Methods
  restoreNetworkRequests() {
    window.fetch = this.originalFetch;
  }

  restoreXMLHttpRequests() {
    window.XMLHttpRequest = this.originalXMLHttpRequest;
  }

  restoreTimers() {
    window.setInterval = this.originalSetInterval;
    window.setTimeout = this.originalSetTimeout;
    window.clearInterval = this.originalClearInterval;
    window.clearTimeout = this.originalClearTimeout;
  }

  restoreAudioMethods() {
    HTMLAudioElement.prototype.play = this.originalAudioPlay;
  }

  // Test API monitoring
  testApiMonitoring() {
    // Make a simple API call to test the monitoring (silent)
    fetch('/api/test', { method: 'HEAD' }).catch(() => {});
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
