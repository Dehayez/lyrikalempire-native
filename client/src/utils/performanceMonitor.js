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
    this.originalSetInterval = window.setInterval;
    this.originalSetTimeout = window.setTimeout;
    this.originalClearInterval = window.clearInterval;
    this.originalClearTimeout = window.clearTimeout;
    
    this.startTime = Date.now();
    this.lastCpuCheck = Date.now();
    this.performanceObserver = null;
  }

  enable(options = {}) {
    if (this.isEnabled) return;
    this.isEnabled = true;
    console.log('[Mobile Performance Monitor] Enabled');
    
    this.interceptNetworkRequests();
    
    // Only intercept timers if explicitly requested (can cause conflicts)
    if (options.interceptTimers) {
      this.interceptTimers();
    }
    
    this.startCpuMonitoring();
    this.startMemoryMonitoring();
    this.startRenderMonitoring();
    this.startAudioMonitoring();
    this.startDomMonitoring();
    
    // Add global error handler
    window.addEventListener('error', this.handleError.bind(this));
    window.addEventListener('unhandledrejection', this.handlePromiseRejection.bind(this));
  }

  disable() {
    if (!this.isEnabled) return;
    this.isEnabled = false;
    console.log('[Mobile Performance Monitor] Disabled');
    
    this.restoreNetworkRequests();
    this.restoreTimers();
    this.stopMonitoring();
    
    window.removeEventListener('error', this.handleError.bind(this));
    window.removeEventListener('unhandledrejection', this.handlePromiseRejection.bind(this));
  }

  // CPU Usage Monitoring
  startCpuMonitoring() {
    const checkCpu = () => {
      if (!this.isEnabled) return;
      
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
      
      // Log high CPU usage
      if (cpuUsage > 80) {
        console.warn(`[Performance] High CPU usage detected: ${cpuUsage.toFixed(2)}%`);
      }
      
      this.lastCpuCheck = now;
      setTimeout(checkCpu, 1000); // Check every second
    };
    
    checkCpu();
  }

  // Memory Usage Monitoring
  startMemoryMonitoring() {
    const checkMemory = () => {
      if (!this.isEnabled) return;
      
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
        
        // Log high memory usage
        if (memoryUsage.used > memoryUsage.limit * 0.8) {
          console.warn(`[Performance] High memory usage: ${memoryUsage.used}MB / ${memoryUsage.limit}MB`);
        }
      }
      
      setTimeout(checkMemory, 2000); // Check every 2 seconds
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
          
          // Log slow renders
          if (entry.duration > 16) { // 60fps threshold
            console.warn(`[Performance] Slow render: ${entry.name} took ${entry.duration.toFixed(2)}ms`);
          }
        }
      }
    });
    
    this.performanceObserver.observe({ entryTypes: ['measure'] });
  }

  // Audio Performance Monitoring
  startAudioMonitoring() {
    // Monitor audio context usage
    const originalCreateAnalyser = AudioContext.prototype.createAnalyser;
    AudioContext.prototype.createAnalyser = function() {
      const analyser = originalCreateAnalyser.call(this);
      console.log('[Performance] Audio analyser created');
      return analyser;
    };

    // Monitor audio element operations
    const originalAudioPlay = HTMLAudioElement.prototype.play;
    HTMLAudioElement.prototype.play = function() {
      const startTime = performance.now();
      this.metrics.audioOperations.push({
        timestamp: Date.now(),
        operation: 'play',
        startTime
      });
      
      return originalAudioPlay.call(this).then(() => {
        const endTime = performance.now();
        const duration = endTime - startTime;
        console.log(`[Performance] Audio play took ${duration.toFixed(2)}ms`);
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
      
      // Log excessive DOM mutations
      if (mutations.length > 50) {
        console.warn(`[Performance] Excessive DOM mutations: ${mutations.length}`);
      }
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
        
        // Log slow requests
        if (duration > 1000) {
          console.warn(`[Performance] Slow API call: ${url} took ${duration.toFixed(2)}ms`);
        }
        
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
        
        console.error(`[Performance] API call failed: ${url} after ${duration.toFixed(2)}ms`);
        throw error;
      }
    };
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
      
      console.log(`[Performance] setInterval created: ${args[1]}ms`);
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
      
      if (args[1] < 100) { // Log very short timeouts
        console.log(`[Performance] Short setTimeout: ${args[1]}ms`);
      }
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
        console.warn('[Performance] Error clearing interval:', error);
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
        console.warn('[Performance] Error clearing timeout:', error);
        return this.originalClearTimeout.call(this, id);
      }
    };
  }

  // Error Handling
  handleError(event) {
    console.error(`[Performance] Global error: ${event.error?.message}`, event.error);
  }

  handlePromiseRejection(event) {
    console.error(`[Performance] Unhandled promise rejection: ${event.reason}`);
  }

  // Restore Methods
  restoreNetworkRequests() {
    window.fetch = this.originalFetch;
  }

  restoreTimers() {
    window.setInterval = this.originalSetInterval;
    window.setTimeout = this.originalSetTimeout;
    window.clearInterval = this.originalClearInterval;
    window.clearTimeout = this.originalClearTimeout;
  }

  stopMonitoring() {
    if (this.performanceObserver) {
      this.performanceObserver.disconnect();
    }
    if (this.domObserver) {
      this.domObserver.disconnect();
    }
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

// Auto-enable in development
if (process.env.NODE_ENV === 'development') {
  mobilePerformanceMonitor.enable();
}

export default mobilePerformanceMonitor;
