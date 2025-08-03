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

  // Update refs when props change
  useEffect(() => {
    currentBeatRef.current = currentBeat;
    playlistRef.current = playlist;
  }, [currentBeat, playlist]);

  // Handle audio source loading
  const loadAudioSource = useCallback(async (beat) => {
    if (!beat?.audioSrc) {
      setAudioSrc('');
      return;
    }

    try {
      setIsLoading(true);
      setLoadingPhase('loading');
      setError(null);

      // Try to get cached audio first
      const cachedAudio = await audioCacheService.getFromCache(beat.audioSrc);
      if (cachedAudio) {
        setAudioSrc(cachedAudio.url);
        setIsLoading(false);
        setLoadingPhase('ready');
        return;
      }

      // If not cached, use original URL
      setAudioSrc(beat.audioSrc);
      setIsLoading(false);
      setLoadingPhase('ready');
    } catch (error) {
      console.error('Error loading audio source:', error);
      setError(error);
      setIsLoading(false);
      setLoadingPhase('error');
      onError?.(error);
    }
  }, [onError]);

  // Load audio source when beat changes
  useEffect(() => {
    loadAudioSource(currentBeat);
  }, [currentBeat, loadAudioSource]);

  // Set up gapless playback
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

  // Preload next track
  const preloadNextTrack = useCallback(() => {
    if (!currentBeatRef.current || !playlistRef.current.length) return;

    const currentIndex = playlistRef.current.findIndex(beat => beat.id === currentBeatRef.current.id);
    if (currentIndex !== -1 && currentIndex < playlistRef.current.length - 1) {
      const nextBeat = playlistRef.current[currentIndex + 1];
      if (nextBeat?.audioSrc) {
        gaplessPlaybackService.preloadNext(nextBeat.audioSrc);
      }
    }
  }, []);

  // Handle time updates for preloading
  const handleTimeUpdate = useCallback((currentTime, duration) => {
    if (!duration) return;

    const progress = currentTime / duration;
    if (progress >= 0.85) {
      preloadNextTrack();
    }
  }, [preloadNextTrack]);

  // Handle ready state
  const handleReady = useCallback(() => {
    setLoadingPhase('ready');
    setIsLoading(false);
  }, []);

  // Handle errors
  const handleError = useCallback((error) => {
    setError(error);
    setLoadingPhase('error');
    setIsLoading(false);
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