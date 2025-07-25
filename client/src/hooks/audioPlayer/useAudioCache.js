import { useState, useEffect, useCallback, useRef } from 'react';
import { audioCacheService, getSignedUrl } from '../../services';
import { initializeCacheCleanup, getCacheStatistics } from '../../utils/audioCacheUtils';

export const useAudioCache = () => {
  const [cacheStats, setCacheStats] = useState(null);
  const [isPreloading, setIsPreloading] = useState(false);
  const [preloadProgress, setPreloadProgress] = useState(0);
  const [cachedBeats, setCachedBeats] = useState(new Set());
  const initialized = useRef(false);

  // Initialize cache cleanup on first mount
  useEffect(() => {
    if (!initialized.current) {
      initializeCacheCleanup();
      initialized.current = true;
    }
  }, []);

  // Update cache statistics
  const updateCacheStats = useCallback(async () => {
    try {
      const stats = await getCacheStatistics();
      setCacheStats(stats);
    } catch (error) {
      console.warn('Error updating cache stats:', error);
    }
  }, []);

  // Generate cache key for a beat
  const getBeatCacheKey = useCallback((beat) => {
    if (!beat?.audio || !beat?.user_id) return null;
    return `${beat.user_id}_${beat.audio}`;
  }, []);

  // Check if a beat is cached (async)
  const isBeatCached = useCallback(async (beat) => {
    if (!beat?.audio || !beat?.user_id) return false;
    
    try {
      const cached = await audioCacheService.isAudioCached(beat.user_id, beat.audio);
      const cacheKey = getBeatCacheKey(beat);
      
      if (cacheKey) {
        if (cached) {
          setCachedBeats(prev => new Set([...prev, cacheKey]));
        } else {
          setCachedBeats(prev => {
            const newSet = new Set(prev);
            newSet.delete(cacheKey);
            return newSet;
          });
        }
      }
      
      return cached;
    } catch (error) {
      console.warn('Error checking if beat is cached:', error);
      return false;
    }
  }, [getBeatCacheKey]);

  // Check if a beat is cached (synchronous using cached state)
  const isBeatCachedSync = useCallback((beat) => {
    const cacheKey = getBeatCacheKey(beat);
    return cacheKey ? cachedBeats.has(cacheKey) : false;
  }, [cachedBeats, getBeatCacheKey]);

  // Preload a single beat
  const preloadBeat = useCallback(async (beat) => {
    if (!beat?.audio || !beat?.user_id) return false;
    
    try {
      // Check if already cached
      const isCached = await audioCacheService.isAudioCached(beat.user_id, beat.audio);
      if (isCached) return true;
      
      // Get signed URL and preload
      const signedUrl = await getSignedUrl(beat.user_id, beat.audio);
      await audioCacheService.preloadAudio(beat.user_id, beat.audio, signedUrl);
      
      // Update cached beats set
      const cacheKey = getBeatCacheKey(beat);
      if (cacheKey) {
        setCachedBeats(prev => new Set([...prev, cacheKey]));
      }
      
      return true;
    } catch (error) {
      console.warn('Error preloading beat:', error);
      return false;
    }
  }, [getBeatCacheKey]);

  // Preload multiple beats with progress tracking
  const preloadBeats = useCallback(async (beats, maxConcurrent = 3) => {
    if (!beats || beats.length === 0) return [];
    
    setIsPreloading(true);
    setPreloadProgress(0);
    
    const results = [];
    const totalBeats = beats.length;
    let completedBeats = 0;
    
    try {
      for (let i = 0; i < beats.length; i += maxConcurrent) {
        const batch = beats.slice(i, i + maxConcurrent);
        
        const batchPromises = batch.map(async (beat) => {
          try {
            const success = await preloadBeat(beat);
            completedBeats++;
            setPreloadProgress(Math.round((completedBeats / totalBeats) * 100));
            return { success, beat, error: success ? null : 'Failed to preload' };
          } catch (error) {
            completedBeats++;
            setPreloadProgress(Math.round((completedBeats / totalBeats) * 100));
            return { success: false, beat, error: error.message };
          }
        });
        
        const batchResults = await Promise.allSettled(batchPromises);
        results.push(...batchResults.map(result => 
          result.status === 'fulfilled' ? result.value : { success: false, error: result.reason }
        ));
      }
      
      await updateCacheStats();
      return results;
    } catch (error) {
      console.warn('Error preloading beats:', error);
      return [];
    } finally {
      setIsPreloading(false);
      setPreloadProgress(0);
    }
  }, [preloadBeat, updateCacheStats]);

  // Preload queue around current beat
  const preloadQueue = useCallback(async (beats, currentBeatIndex = 0, preloadCount = 3) => {
    if (!beats || beats.length === 0) return [];
    
    const startIndex = Math.max(0, currentBeatIndex - 1);
    const endIndex = Math.min(beats.length, currentBeatIndex + preloadCount);
    const beatsToPreload = beats.slice(startIndex, endIndex);
    
    return await preloadBeats(beatsToPreload, 2);
  }, [preloadBeats]);

  // Clear all cached audio
  const clearCache = useCallback(async () => {
    try {
      await audioCacheService.clearCache();
      setCachedBeats(new Set());
      await updateCacheStats();
      return true;
    } catch (error) {
      console.warn('Error clearing cache:', error);
      return false;
    }
  }, [updateCacheStats]);

  // Check cache status for multiple beats
  const checkBeatsCacheStatus = useCallback(async (beats) => {
    if (!beats || beats.length === 0) return;
    
    const promises = beats.map(beat => isBeatCached(beat));
    await Promise.allSettled(promises);
  }, [isBeatCached]);

  // Mark a beat as cached (for external cache updates)
  const markBeatAsCached = useCallback((beat) => {
    const cacheKey = getBeatCacheKey(beat);
    if (cacheKey) {
      setCachedBeats(prev => new Set([...prev, cacheKey]));
    }
  }, [getBeatCacheKey]);

  return {
    // State
    cacheStats,
    isPreloading,
    preloadProgress,
    cachedBeats,
    
    // Cache operations
    preloadBeat,
    preloadBeats,
    preloadQueue,
    clearCache,
    updateCacheStats,
    
    // Cache checking
    isBeatCached,
    isBeatCachedSync,
    checkBeatsCacheStatus,
    
    // Utilities
    getBeatCacheKey,
    markBeatAsCached
  };
}; 