import { useState, useEffect, useCallback, useRef } from 'react';
import { gaplessPlaybackService } from '../../services/gaplessPlaybackService';
import audioCacheService from '../../services/audioCacheService';

export const useAudioState2 = ({
  currentBeat,
  playlist = [],
  onLoadingProgress,
  onError
}) => {
  const [audioSrc, setAudioSrc] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [loadingPhase, setLoadingPhase] = useState('');
  const [error, setError] = useState(null);
  const playerRef = useRef(null);
  const currentBeatRef = useRef(currentBeat);
  const playlistRef = useRef(playlist);
  const loadingRef = useRef(false);

  // Update refs when props change
  useEffect(() => {
    currentBeatRef.current = currentBeat;
    playlistRef.current = playlist;
  }, [currentBeat, playlist]);

  // Optimized audio source loading for Safari
  const loadAudioSource = useCallback((beat) => {
    if (!beat?.audioSrc) {
      setAudioSrc('');
      return;
    }

    // Prevent multiple simultaneous loads
    if (loadingRef.current) return;
    loadingRef.current = true;

    try {
      setIsLoading(true);
      setLoadingPhase('loading');
      setError(null);

      // Set source immediately for faster response
      setAudioSrc(beat.audioSrc);
      
      // Try to get cached audio in background (non-blocking)
      audioCacheService.getFromCache(beat.audioSrc).then((cachedAudio) => {
        if (cachedAudio && cachedAudio.url !== beat.audioSrc) {
          setAudioSrc(cachedAudio.url);
        }
        setIsLoading(false);
        setLoadingPhase('ready');
        loadingRef.current = false;
      }).catch(() => {
        // If cache fails, continue with original source
        setIsLoading(false);
        setLoadingPhase('ready');
        loadingRef.current = false;
      });

    } catch (error) {
      console.error('Error loading audio source:', error);
      setError(error);
      setIsLoading(false);
      setLoadingPhase('error');
      loadingRef.current = false;
      onError?.(error);
    }
  }, [onError]);

  // Load audio source when beat changes
  useEffect(() => {
    loadAudioSource(currentBeat);
  }, [currentBeat, loadAudioSource]);

  // Simplified gapless playback setup
  useEffect(() => {
    const handleTrackEnd = () => {
      const currentIndex = playlistRef.current.findIndex(beat => beat.id === currentBeatRef.current?.id);
      if (currentIndex !== -1 && currentIndex < playlistRef.current.length - 1) {
        // Trigger next track
        const nextBeat = playlistRef.current[currentIndex + 1];
        if (nextBeat) {
          loadAudioSource(nextBeat);
        }
      }
    };

    gaplessPlaybackService.onTrackEnd = handleTrackEnd;

    return () => {
      gaplessPlaybackService.onTrackEnd = null;
    };
  }, [loadAudioSource]);

  // Optimized preload next track
  const preloadNextTrack = useCallback(() => {
    if (!currentBeatRef.current || !playlistRef.current.length) return;

    const currentIndex = playlistRef.current.findIndex(beat => beat.id === currentBeatRef.current.id);
    if (currentIndex !== -1 && currentIndex < playlistRef.current.length - 1) {
      const nextBeat = playlistRef.current[currentIndex + 1];
      if (nextBeat?.audioSrc) {
        // Non-blocking preload
        gaplessPlaybackService.preloadNext(nextBeat.audioSrc).catch(() => {
          // Ignore preload errors for better performance
        });
      }
    }
  }, []);

  // Optimized time updates for preloading
  const handleTimeUpdate = useCallback((currentTime, duration) => {
    if (!duration) return;

    const progress = currentTime / duration;
    if (progress >= 0.85) {
      preloadNextTrack();
    }
  }, [preloadNextTrack]);

  // Optimized ready state handler
  const handleReady = useCallback(() => {
    setLoadingPhase('ready');
    setIsLoading(false);
    loadingRef.current = false;
  }, []);

  // Optimized error handler
  const handleError = useCallback((error) => {
    setError(error);
    setLoadingPhase('error');
    setIsLoading(false);
    loadingRef.current = false;
    onError?.(error);
  }, [onError]);

  return {
    audioSrc,
    isLoading,
    loadingProgress,
    loadingPhase,
    error,
    playerRef,
    handleReady,
    handleError,
    handleTimeUpdate,
    preloadNextTrack
  };
}; 