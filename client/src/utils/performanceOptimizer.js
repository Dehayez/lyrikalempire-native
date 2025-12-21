/**
 * Performance Optimizer
 * Helps identify and fix performance issues in real-time
 */

class PerformanceOptimizer {
  constructor() {
    this.isEnabled = false;
    this.originalConsoleWarn = console.warn;
    this.originalConsoleError = console.error;
    this.performanceMetrics = {
      slowOperations: [],
      domMutations: 0,
      renderCount: 0
    };
    this.domObserver = null;
  }

  enable() {
    if (this.isEnabled) return;
    this.isEnabled = true;
    console.log('[Performance Optimizer] Enabled');

    // Override console methods to track performance issues
    this.interceptConsole();
    
    // Track slow operations
    this.trackSlowOperations();
    
    // Track DOM mutations
    this.trackDOMChanges();
  }

  disable() {
    if (!this.isEnabled) return;
    this.isEnabled = false;
    console.log('[Performance Optimizer] Disabled');

    // Restore original console methods
    console.warn = this.originalConsoleWarn;
    console.error = this.originalConsoleError;
    
    // Disconnect DOM observer
    if (this.domObserver) {
      this.domObserver.disconnect();
      this.domObserver = null;
    }
    
    // Clear metrics to prevent memory accumulation
    this.performanceMetrics.slowOperations = [];
    this.performanceMetrics.domMutations = 0;
  }

  interceptConsole() {
    const optimizer = this;
    
    console.warn = function(...args) {
      const message = args.join(' ');
      
      // Track specific performance warnings
      if (message.includes('Violation') || message.includes('handler took')) {
        optimizer.performanceMetrics.slowOperations.push({
          type: 'slow-handler',
          message,
          timestamp: Date.now()
        });
        
        // Log only the first few slow operations to avoid spam
        if (optimizer.performanceMetrics.slowOperations.length <= 3) {
          optimizer.originalConsoleWarn.apply(console, args);
        }
      } else {
        optimizer.originalConsoleWarn.apply(console, args);
      }
    };
  }

  trackSlowOperations() {
    // DISABLED: This was causing infinite logging loops
    // The optimizer was monitoring its own setTimeout calls
    console.log('[Performance Optimizer] Slow operation tracking disabled to prevent logging loops');
  }

  trackDOMChanges() {
    // Disconnect existing observer if any
    if (this.domObserver) {
      this.domObserver.disconnect();
    }
    
    const optimizer = this;
    
    // Simple DOM mutation tracking
    this.domObserver = new MutationObserver((mutations) => {
      if (!optimizer.isEnabled) return;
      
      optimizer.performanceMetrics.domMutations += mutations.length;
      
      // Log excessive DOM mutations (increased threshold to reduce noise)
      if (mutations.length > 500) {
        console.warn(`[Performance] High DOM mutation count: ${mutations.length}`);
      }
    });

    this.domObserver.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true
    });
  }

  // Throttle function to limit how often expensive operations run
  throttle(func, delay) {
    let timeoutId;
    let lastExecTime = 0;
    
    return function(...args) {
      const currentTime = Date.now();
      
      if (currentTime - lastExecTime > delay) {
        func.apply(this, args);
        lastExecTime = currentTime;
      } else {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
          func.apply(this, args);
          lastExecTime = Date.now();
        }, delay - (currentTime - lastExecTime));
      }
    };
  }

  // Debounce function to delay expensive operations
  debounce(func, delay) {
    let timeoutId;
    
    return function(...args) {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => func.apply(this, args), delay);
    };
  }

  getReport() {
    return {
      isEnabled: this.isEnabled,
      slowOperations: this.performanceMetrics.slowOperations.length,
      domMutations: this.performanceMetrics.domMutations,
      recentSlowOps: this.performanceMetrics.slowOperations.slice(-5)
    };
  }

  logReport() {
    const report = this.getReport();
    console.log('=== Performance Optimizer Report ===');
    console.log(`Slow Operations: ${report.slowOperations}`);
    console.log(`DOM Mutations: ${report.domMutations}`);
    console.log('Recent Slow Operations:');
    report.recentSlowOps.forEach((op, index) => {
      console.log(`  ${index + 1}. ${op.message}`);
    });
    console.log('====================================');
  }
}

// Create singleton instance
const performanceOptimizer = new PerformanceOptimizer();

// Make it available globally for debugging
window.performanceOptimizer = performanceOptimizer;

export default performanceOptimizer;
