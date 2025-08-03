import { useState, useRef, useCallback, useEffect } from 'react';
import { audioCacheService, getSignedUrl } from '../../services';
import { useOs } from '../useOs';

/**
 * Central state manager for audio playback
 * Handles all audio-related state and operations in one place
 */
export const useAudioState = (currentBeat) => {
  const { isSafari } = useOs();
  
  // Core audio state
  const [audioSrc, setAudioSrc] = useState('');
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(1);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [progress, setProgress] = useState(0);
  
  // Loading and caching state
  const [isLoading, setIsLoading] = useState(false);
  const [isCached, setIsCached] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  
  // Error handling state
  const [error, setError] = useState(null);
  const [retryCount, setRetryCount] = useState(0);
  const MAX_RETRIES = 3;
  
  // Refs for cleanup and async operations
  const playerRef = useRef(null);
  const loadingTimeoutRef = useRef(null);
  const retryTimeoutRef = useRef(null);
  const lastUrlRefreshRef = useRef(0);
  
  /**
   * Clear all timeouts and reset loading states
   */
  const cleanup = useCallback(() => {
    if (loadingTimeoutRef.current) {
      clearTimeout(loadingTimeoutRef.current);
      loadingTimeoutRef.current = null;
    }
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }
    setIsLoading(false);
    setLoadingProgress(0);
    setError(null);
  }, []);

  /**
   * Load audio source with proper error handling and retries
   */
  const loadAudio = useCallback(async (force = false) => {
    if (!currentBeat) {
      cleanup();
      setAudioSrc('');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      // Check cache first
      const isCached = await audioCacheService.isAudioCached(
        currentBeat.user_id,
        currentBeat.audio
      );
      setIsCached(isCached);

      if (isCached) {
        const cachedUrl = await audioCacheService.getAudio(
          currentBeat.user_id,
          currentBeat.audio
        );
        if (cachedUrl) {
          setAudioSrc(cachedUrl);
          setIsLoading(false);
          return;
        }
      }

      // Get fresh signed URL
      const signedUrl = await getSignedUrl(currentBeat.user_id, currentBeat.audio);
      lastUrlRefreshRef.current = Date.now();

      if (isSafari) {
        // Safari: use signed URL directly
        setAudioSrc(signedUrl);
        audioCacheService.originalUrls.set(
          audioCacheService.getCacheKey(currentBeat.user_id, currentBeat.audio),
          signedUrl
        );
      } else {
        // Other browsers: cache and use blob URL
        const audioUrl = await audioCacheService.preloadAudio(
          currentBeat.user_id,
          currentBeat.audio,
          signedUrl,
          (progress) => setLoadingProgress(progress)
        );
        setAudioSrc(audioUrl);
      }

      setIsLoading(false);
      setRetryCount(0);

    } catch (err) {
      console.error('Error loading audio:', err);
      setError(err);

      // Retry logic
      if (retryCount < MAX_RETRIES) {
        const delay = Math.min(1000 * Math.pow(2, retryCount), 8000);
        retryTimeoutRef.current = setTimeout(() => {
          setRetryCount(prev => prev + 1);
          loadAudio(true);
        }, delay);
      }
    }
  }, [currentBeat, cleanup, isSafari, retryCount]);

  /**
   * Handle audio ready event
   */
  const handleReady = useCallback(() => {
    setIsLoading(false);
    setLoadingProgress(100);
    setError(null);
    setRetryCount(0);
    cleanup();
  }, [cleanup]);

  /**
   * Handle audio error event
   */
  const handleError = useCallback((error) => {
    setError(error);
    if (error.code === 2 || error.code === 4) { // Network or format error
      loadAudio(true);
    }
  }, [loadAudio]);

  // Load audio when currentBeat changes
  useEffect(() => {
    loadAudio();
  }, [currentBeat?.id, loadAudio]);

  // Cleanup on unmount
  useEffect(() => {
    return cleanup;
  }, [cleanup]);

  return {
    // Audio state
    audioSrc,
    isPlaying,
    setIsPlaying,
    volume,
    setVolume,
    currentTime,
    setCurrentTime,
    duration,
    setDuration,
    progress,
    setProgress,
    
    // Loading state
    isLoading,
    isCached,
    loadingProgress,
    
    // Error state
    error,
    retryCount,
    
    // Refs
    playerRef,
    
    // Handlers
    handleReady,
    handleError,
    loadAudio,
    cleanup
  };
};