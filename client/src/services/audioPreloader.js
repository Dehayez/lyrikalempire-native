import audioCacheService from './audioCacheService';
import { getSignedUrl } from './beatService';

class AudioPreloader {
  constructor() {
    this.preloadQueue = new Map();
    this.activePreloads = new Set();
    this.maxConcurrent = 2;
    this.retryDelays = [1000, 2000, 4000];
  }

  /**
   * Preload a single beat
   */
  async preloadBeat(beat, onProgress) {
    if (!beat?.audio || !beat?.user_id) return null;

    const cacheKey = audioCacheService.getCacheKey(beat.user_id, beat.audio);

    try {
      // Check if already preloading
      if (this.preloadQueue.has(cacheKey)) {
        return this.preloadQueue.get(cacheKey);
      }

      // Check cache first
      const cached = await audioCacheService.getAudio(beat.user_id, beat.audio);
      if (cached) return cached;

      // Get signed URL
      const signedUrl = await getSignedUrl(beat.user_id, beat.audio);

      // Start preload
      const preloadPromise = audioCacheService.preloadAudio(
        beat.user_id,
        beat.audio,
        signedUrl,
        onProgress
      );

      this.preloadQueue.set(cacheKey, preloadPromise);
      
      const result = await preloadPromise;
      this.preloadQueue.delete(cacheKey);
      
      return result;

    } catch (error) {
      console.error('Error preloading beat:', error);
      this.preloadQueue.delete(cacheKey);
      throw error;
    }
  }

  /**
   * Preload multiple beats with priority and concurrency control
   */
  async preloadBeats(beats, options = {}) {
    const {
      maxConcurrent = this.maxConcurrent,
      onProgress,
      onBeatComplete,
      priority = 'sequential' // 'sequential' or 'parallel'
    } = options;

    if (!beats?.length) return [];

    const results = [];
    const errors = [];

    if (priority === 'parallel') {
      // Preload all beats in parallel with concurrency limit
      const chunks = [];
      for (let i = 0; i < beats.length; i += maxConcurrent) {
        chunks.push(beats.slice(i, i + maxConcurrent));
      }

      for (const chunk of chunks) {
        const chunkPromises = chunk.map(beat => 
          this.preloadBeat(beat, (progress) => {
            onProgress?.(beat.id, progress);
          })
          .then(url => {
            onBeatComplete?.(beat.id, true);
            results.push({ beat, url, success: true });
          })
          .catch(error => {
            onBeatComplete?.(beat.id, false, error);
            errors.push({ beat, error });
          })
        );

        await Promise.allSettled(chunkPromises);
      }

    } else {
      // Preload beats sequentially
      for (const beat of beats) {
        try {
          const url = await this.preloadBeat(beat, (progress) => {
            onProgress?.(beat.id, progress);
          });
          
          onBeatComplete?.(beat.id, true);
          results.push({ beat, url, success: true });

        } catch (error) {
          onBeatComplete?.(beat.id, false, error);
          errors.push({ beat, error });
        }
      }
    }

    return {
      results,
      errors,
      success: errors.length === 0
    };
  }

  /**
   * Preload the next N beats in a playlist
   */
  async preloadUpcoming(currentBeat, playlist, count = 3) {
    if (!currentBeat || !playlist?.length) return;

    const currentIndex = playlist.findIndex(b => b.id === currentBeat.id);
    if (currentIndex === -1) return;

    const upcomingBeats = playlist.slice(
      currentIndex + 1,
      currentIndex + 1 + count
    );

    return this.preloadBeats(upcomingBeats, {
      priority: 'parallel',
      maxConcurrent: 2
    });
  }

  /**
   * Cancel all active preloads
   */
  cancelAll() {
    this.preloadQueue.clear();
    this.activePreloads.clear();
  }
}

export const audioPreloader = new AudioPreloader();