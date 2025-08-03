import { audioCacheService } from './audioCacheService2';

class AudioErrorRecovery {
  constructor() {
    this.errorLog = new Map(); // Track errors by beat ID
    this.recoveryStrategies = new Map(); // Track active recovery strategies
    this.maxRetries = 3;
  }

  /**
   * Log an error and determine recovery strategy
   */
  async handleError(error, beat, context = {}) {
    if (!beat?.id) return null;

    // Log error
    const errorEntry = this.getErrorEntry(beat.id);
    errorEntry.count++;
    errorEntry.lastError = error;
    errorEntry.lastContext = context;
    errorEntry.timestamp = Date.now();

    // Determine recovery strategy
    const strategy = this.determineStrategy(error, errorEntry);
    
    // Execute strategy
    return this.executeStrategy(strategy, beat, errorEntry);
  }

  /**
   * Get or create error entry for a beat
   */
  getErrorEntry(beatId) {
    if (!this.errorLog.has(beatId)) {
      this.errorLog.set(beatId, {
        count: 0,
        lastError: null,
        lastContext: null,
        timestamp: null,
        strategies: new Set()
      });
    }
    return this.errorLog.get(beatId);
  }

  /**
   * Determine best recovery strategy
   */
  determineStrategy(error, errorEntry) {
    const strategies = [];

    // Network errors
    if (error.code === 2 || error.name === 'NetworkError') {
      if (!errorEntry.strategies.has('retry')) {
        strategies.push('retry');
      } else if (!errorEntry.strategies.has('cache')) {
        strategies.push('cache');
      } else if (!errorEntry.strategies.has('refresh')) {
        strategies.push('refresh');
      }
    }

    // Format/decode errors
    if (error.code === 3 || error.code === 4) {
      if (!errorEntry.strategies.has('transcode')) {
        strategies.push('transcode');
      } else if (!errorEntry.strategies.has('alternate')) {
        strategies.push('alternate');
      }
    }

    // If all strategies tried or too many errors
    if (errorEntry.count >= this.maxRetries || errorEntry.strategies.size >= 3) {
      strategies.push('skip');
    }

    return strategies[0] || 'skip';
  }

  /**
   * Execute recovery strategy
   */
  async executeStrategy(strategy, beat, errorEntry) {
    // Mark strategy as tried
    errorEntry.strategies.add(strategy);

    // Create recovery context
    const recovery = {
      strategy,
      beat,
      success: false,
      result: null,
      retryDelay: Math.min(1000 * Math.pow(2, errorEntry.count), 8000)
    };

    try {
      switch (strategy) {
        case 'retry':
          // Simple retry after delay
          recovery.result = new Promise(resolve => 
            setTimeout(resolve, recovery.retryDelay)
          );
          break;

        case 'cache':
          // Try to get from cache
          recovery.result = audioCacheService.getFromCache(
            audioCacheService.getCacheKey(beat.user_id, beat.audio)
          );
          break;

        case 'refresh':
          // Clear cache and get fresh URL
          await audioCacheService.clearCache();
          recovery.result = { shouldRefresh: true };
          break;

        case 'transcode':
          // Request transcode (if supported by backend)
          recovery.result = { shouldTranscode: true };
          break;

        case 'alternate':
          // Try alternate format/quality
          recovery.result = { shouldUseAlternate: true };
          break;

        case 'skip':
          // Skip track
          recovery.result = { shouldSkip: true };
          break;
      }

      recovery.success = true;

    } catch (error) {
      recovery.error = error;
      console.error('Recovery strategy failed:', {
        strategy,
        beat: beat.id,
        error
      });
    }

    return recovery;
  }

  /**
   * Clear error history for a beat
   */
  clearErrors(beatId) {
    this.errorLog.delete(beatId);
    this.recoveryStrategies.delete(beatId);
  }

  /**
   * Get error stats
   */
  getStats() {
    const stats = {
      totalErrors: 0,
      beatErrors: new Map(),
      strategies: new Map()
    };

    for (const [beatId, entry] of this.errorLog) {
      stats.totalErrors += entry.count;
      stats.beatErrors.set(beatId, entry.count);
      
      for (const strategy of entry.strategies) {
        stats.strategies.set(
          strategy,
          (stats.strategies.get(strategy) || 0) + 1
        );
      }
    }

    return stats;
  }
}

export const audioErrorRecovery = new AudioErrorRecovery();