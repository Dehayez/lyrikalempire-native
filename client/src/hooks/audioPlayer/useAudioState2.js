import { useState, useRef, useCallback, useEffect } from 'react';
import { audioCacheService } from '../../services/audioCacheService2';
import { audioPreloader } from '../../services/audioPreloader';
import { useOs } from '../useOs';

/**
 * Enhanced audio state management with better loading and caching
 */
export const useAudioState = ({
  currentBeat,
  playlist = [],
  onLoadingProgress,
  onError
}) => {
  const { isSafari } = useOs();
  
  // Core audio state
  const [audioSrc, setAudioSrc] = useState('');
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(() => {
    const saved = localStorage.getItem('audioVolume');
    return saved ? parseFloat(saved) : 1;
  });
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [progress, setProgress] = useState(0);
  
  // Loading state
  const [isLoading, setIsLoading] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [loadingPhase, setLoadingPhase] = useState(null);
  
  // Error state
  const [error, setError] = useState(null);
  const [retryCount, setRetryCount] = useState(0);
  const MAX_RETRIES = 3;
  
  // Refs
  const playerRef = useRef(null);
  const loadingTimeoutRef = useRef(null);
  const retryTimeoutRef = useRef(null);
  const preloadCancelRef = useRef(null);

  /**
   * Handle loading progress updates
   */
  const handleProgress = useCallback((phase, progress) => {
    setLoadingPhase(phase);
    setLoadingProgress(progress);
    onLoadingProgress?.(phase, progress);
  }, [onLoadingProgress]);

  /**
   * Load audio with proper error handling
   */
  const loadAudio = useCallback(async (force = false) => {
    if (!currentBeat) {
      setAudioSrc('');
      setIsLoading(false);
      setLoadingProgress(0);
      setLoadingPhase(null);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      handleProgress('loading', 0);

      // Try to load from cache first
      const cached = await audioCacheService.getFromCache(
        audioCacheService.getCacheKey(currentBeat.user_id, currentBeat.audio)
      );

      if (cached && !force) {
        setAudioSrc(cached.url);
        setIsLoading(false);
        handleProgress('ready', 100);
        return;
      }

      // Load fresh audio
      const url = await audioPreloader.preloadBeat(currentBeat, (progress) => {
        handleProgress('loading', progress);
      });

      setAudioSrc(url);
      setIsLoading(false);
      handleProgress('ready', 100);

      // Start preloading next tracks
      if (playlist.length > 0) {
        preloadCancelRef.current = audioPreloader.preloadUpcoming(
          currentBeat,
          playlist,
          3
        );
      }

    } catch (error) {
      console.error('Error loading audio:', error);
      setError(error);
      handleProgress('error', 0);
      onError?.(error);

      // Retry logic
      if (retryCount < MAX_RETRIES) {
        const delay = Math.min(1000 * Math.pow(2, retryCount), 8000);
        retryTimeoutRef.current = setTimeout(() => {
          setRetryCount(prev => prev + 1);
          loadAudio(true);
        }, delay);
      }
    }
  }, [currentBeat, playlist, retryCount, handleProgress, onError]);

  /**
   * Handle audio ready event
   */
  const handleReady = useCallback(() => {
    setIsLoading(false);
    setLoadingProgress(100);
    setLoadingPhase('ready');
    setError(null);
    setRetryCount(0);

    // Clear any pending timeouts
    if (loadingTimeoutRef.current) {
      clearTimeout(loadingTimeoutRef.current);
      loadingTimeoutRef.current = null;
    }
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }
  }, []);

  /**
   * Handle audio error event
   */
  const handleError = useCallback((error) => {
    setError(error);
    handleProgress('error', 0);
    onError?.(error);

    // Retry on network or format errors
    if ((error.code === 2 || error.code === 4) && retryCount < MAX_RETRIES) {
      loadAudio(true);
    }
  }, [loadAudio, retryCount, handleProgress, onError]);

  /**
   * Handle volume change
   */
  const handleVolumeChange = useCallback((newVolume) => {
    setVolume(newVolume);
    localStorage.setItem('audioVolume', newVolume.toString());
  }, []);

  /**
   * Load audio when currentBeat changes
   */
  useEffect(() => {
    loadAudio();
  }, [currentBeat?.id, loadAudio]);

  /**
   * Update volume when changed externally
   */
  useEffect(() => {
    if (playerRef.current?.audio?.current) {
      playerRef.current.audio.current.volume = volume;
    }
  }, [volume]);

  /**
   * Cleanup on unmount or beat change
   */
  useEffect(() => {
    return () => {
      // Clear timeouts
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
      }
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
      
      // Cancel preloading
      if (preloadCancelRef.current) {
        preloadCancelRef.current.cancel?.();
      }
    };
  }, [currentBeat?.id]);

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
    loadAudio
  };
};