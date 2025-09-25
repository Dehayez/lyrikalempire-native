/**
 * Beat Click Optimizer
 * Optimizes beat click performance to prevent UI freezing
 */

class BeatClickOptimizer {
  constructor() {
    this.isEnabled = false;
    this.clickQueue = [];
    this.processing = false;
    this.lastClickTime = 0;
    this.minClickInterval = 100; // Minimum 100ms between clicks
  }

  enable() {
    if (this.isEnabled) return;
    this.isEnabled = true;
    console.log('[Beat Click Optimizer] Enabled');
  }

  disable() {
    if (!this.isEnabled) return;
    this.isEnabled = false;
    console.log('[Beat Click Optimizer] Disabled');
  }

  // Throttled beat click handler
  handleBeatClick(beat, originalHandler) {
    if (!this.isEnabled) {
      return originalHandler(beat);
    }

    const now = Date.now();
    
    // Prevent rapid clicks
    if (now - this.lastClickTime < this.minClickInterval) {
      console.log('[Beat Click Optimizer] Click throttled - too rapid');
      return;
    }

    this.lastClickTime = now;
    
    // Use requestAnimationFrame to defer the click to the next frame
    requestAnimationFrame(() => {
      try {
        console.log(`[Beat Click Optimizer] Processing beat click: ${beat?.title || 'Unknown'}`);
        originalHandler(beat);
      } catch (error) {
        console.error('[Beat Click Optimizer] Error handling beat click:', error);
      }
    });
  }

  // Batch process multiple beat operations
  batchProcess(operations, delay = 16) {
    if (!this.isEnabled) {
      return operations.forEach(op => op());
    }

    let index = 0;
    const processNext = () => {
      if (index < operations.length) {
        operations[index]();
        index++;
        setTimeout(processNext, delay);
      }
    };
    
    processNext();
  }

  // Optimize DOM updates during beat changes
  optimizeDOMUpdates(callback) {
    if (!this.isEnabled) {
      return callback();
    }

    // Use requestIdleCallback if available, otherwise setTimeout
    const scheduler = window.requestIdleCallback || ((cb) => setTimeout(cb, 0));
    
    scheduler(() => {
      callback();
    });
  }
}

// Create singleton instance
const beatClickOptimizer = new BeatClickOptimizer();

// Make it available globally for debugging
window.beatClickOptimizer = beatClickOptimizer;

export default beatClickOptimizer;
