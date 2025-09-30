import { useState, useRef, useCallback, useEffect } from 'react';
import { audioCacheService, getSignedUrl } from '../../services';
import { useOs } from '../useOs';

/**
 * Enhanced audio state management with improved loading, caching, and error handling
 */
export const useAudioState = ({
  currentBeat,
  onLoadingProgress,
  onError,
  initialVolume = 1
}) => {
  const { isSafari } = useOs();
  
  // Core audio state
  const [audioSrc, setAudioSrc] = useState('');
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(() => {
    const saved = localStorage.getItem('audioVolume');
    return saved ? parseFloat(saved) : initialVolume;
  });
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [progress, setProgress] = useState(0);
  
  // Loading state
  const [isLoading, setIsLoading] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [loadingPhase, setLoadingPhase] = useState(null);
  const [isCached, setIsCached] = useState(false);
  
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
   * Handle loading progress updates
   */
  const handleProgress = useCallback((phase, progress) => {
    setLoadingPhase(phase);
    setLoadingProgress(progress);
    onLoadingProgress?.(phase, progress);
  }, [onLoadingProgress]);

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
    setLoadingPhase(null);
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
      handleProgress('checking-cache', 0);

      // Check cache first
      const isCached = await audioCacheService.isAudioCached(
        currentBeat.user_id,
        currentBeat.audio
      );
      setIsCached(isCached);

      if (isCached && !force) {
        handleProgress('loading-cache', 50);
        const cachedUrl = await audioCacheService.getAudio(
          currentBeat.user_id,
          currentBeat.audio
        );
        if (cachedUrl) {
          setAudioSrc(cachedUrl);
          setIsLoading(false);
          handleProgress('ready', 100);
          return;
        }
      }

      // Get fresh signed URL
      handleProgress('fetching-url', 20);
      const signedUrl = await getSignedUrl(currentBeat.user_id, currentBeat.audio);
      lastUrlRefreshRef.current = Date.now();

      if (isSafari) {
        // Safari: use signed URL directly
        setAudioSrc(signedUrl);
        audioCacheService.originalUrls.set(
          audioCacheService.getCacheKey(currentBeat.user_id, currentBeat.audio),
          signedUrl
        );
        handleProgress('ready', 100);
      } else {
        // Other browsers: cache and use blob URL
        handleProgress('downloading', 30);
        const audioUrl = await audioCacheService.preloadAudio(
          currentBeat.user_id,
          currentBeat.audio,
          signedUrl,
          (progress) => handleProgress('downloading', 30 + (progress * 0.7))
        );
        setAudioSrc(audioUrl);
      }

      setIsLoading(false);
      setRetryCount(0);
      handleProgress('ready', 100);

    } catch (err) {
      console.error('Error loading audio:', err);
      setError(err);
      handleProgress('error', 0);
      onError?.(err);

      // Retry logic with exponential backoff
      if (retryCount < MAX_RETRIES) {
        const delay = Math.min(1000 * Math.pow(2, retryCount), 8000);
        retryTimeoutRef.current = setTimeout(() => {
          setRetryCount(prev => prev + 1);
          loadAudio(true);
        }, delay);
      }
    }
  }, [currentBeat, cleanup, isSafari, retryCount, handleProgress, onError]);

  /**
   * Handle audio ready event
   */
  const handleReady = useCallback(() => {
    setIsLoading(false);
    setLoadingProgress(100);
    setLoadingPhase('ready');
    setError(null);
    setRetryCount(0);
    cleanup();
  }, [cleanup]);

  /**
   * Handle audio error event
   */
  const handleError = useCallback((error) => {
    setError(error);
    handleProgress('error', 0);
    onError?.(error);

    if (error.code === 2 || error.code === 4) { // Network or format error
      loadAudio(true);
    }
  }, [loadAudio, handleProgress, onError]);

  /**
   * Handle volume change with persistence
   */
  const handleVolumeChange = useCallback((newVolume) => {
    setVolume(newVolume);
    localStorage.setItem('audioVolume', newVolume.toString());
  }, []);

  // Load audio when currentBeat changes
  useEffect(() => {
    loadAudio();
  }, [currentBeat?.id, loadAudio]);

  // Update volume when changed externally
  useEffect(() => {
    if (playerRef.current?.audio?.current) {
      playerRef.current.audio.current.volume = volume;
    }
  }, [volume]);

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
    setVolume: handleVolumeChange,
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
    loadingPhase,
    
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