import { useState, useEffect, useCallback, useRef } from 'react';
import { gaplessPlaybackService } from '../../services/gaplessPlaybackService';
import audioCacheService from '../../services/audioCacheService';
import { audioBufferService } from '../../services/audioBufferService';

export const useGaplessAudio = ({
  currentBeat,
  playlist = [],
  options = {},
  onLoadingProgress,
  onError
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [loadingPhase, setLoadingPhase] = useState('');
  const [playbackState, setPlaybackState] = useState('stopped');
  const currentBeatRef = useRef(currentBeat);
  const playlistRef = useRef(playlist);

  // Update refs when props change
  useEffect(() => {
    currentBeatRef.current = currentBeat;
    playlistRef.current = playlist;
  }, [currentBeat, playlist]);

  // Find next track in playlist
  const getNextTrack = useCallback(() => {
    if (!currentBeat || !playlist.length) return null;
    const currentIndex = playlist.findIndex(beat => beat.id === currentBeat.id);
    if (currentIndex === -1 || currentIndex === playlist.length - 1) return null;
    return playlist[currentIndex + 1];
  }, [currentBeat, playlist]);

  // Preload next track
  const preloadNextTrack = useCallback(async () => {
    const nextTrack = getNextTrack();
    if (!nextTrack) return;

    try {
      setLoadingPhase('preloading_next');
      await gaplessPlaybackService.preloadNext(nextTrack.audioSrc);
    } catch (error) {
      console.error('Error preloading next track:', error);
      onError?.(error);
    }
  }, [getNextTrack, onError]);

  // Handle track progress and preloading
  const handleTimeUpdate = useCallback((currentTime, duration) => {
    if (!duration) return;

    const progress = currentTime / duration;
    if (progress >= gaplessPlaybackService.preloadThreshold) {
      preloadNextTrack();
    }
  }, [preloadNextTrack]);

  // Initialize playback for current track
  const initializePlayback = useCallback(async (beat) => {
    if (!beat?.audioSrc) return false;

    try {
      setIsLoading(true);
      setLoadingPhase('loading_current');

      // Start playback
      const success = await gaplessPlaybackService.play(beat.audioSrc);
      if (success) {
        setPlaybackState('playing');
        // Start preloading next track
        preloadNextTrack();
      }

      setIsLoading(false);
      return success;
    } catch (error) {
      setIsLoading(false);
      console.error('Error initializing playback:', error);
      onError?.(error);
      return false;
    }
  }, [preloadNextTrack, onError]);

  // Handle track transitions
  const handleTrackEnd = useCallback(async () => {
    const nextTrack = getNextTrack();
    if (!nextTrack) return;

    try {
      const success = await gaplessPlaybackService.transitionToNext();
      if (success) {
        // Update current track in parent component
        setPlaybackState('playing');
        // Preload the next track in the queue
        preloadNextTrack();
      }
    } catch (error) {
      console.error('Error transitioning to next track:', error);
      onError?.(error);
    }
  }, [getNextTrack, preloadNextTrack, onError]);

  // Set up track end handler
  useEffect(() => {
    gaplessPlaybackService.onTrackEnd = handleTrackEnd;
    return () => {
      gaplessPlaybackService.onTrackEnd = null;
    };
  }, [handleTrackEnd]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      gaplessPlaybackService.cleanup();
    };
  }, []);

  // Expose control methods
  const play = useCallback(async () => {
    if (playbackState === 'playing') return;
    const success = await initializePlayback(currentBeatRef.current);
    if (success) {
      setPlaybackState('playing');
    }
  }, [initializePlayback, playbackState]);

  const pause = useCallback(() => {
    gaplessPlaybackService.stop();
    setPlaybackState('paused');
  }, []);

  const stop = useCallback(() => {
    gaplessPlaybackService.stop();
    setPlaybackState('stopped');
  }, []);

  const setVolume = useCallback((volume) => {
    gaplessPlaybackService.setVolume(volume);
  }, []);

  return {
    isLoading,
    loadingProgress,
    loadingPhase,
    playbackState,
    play,
    pause,
    stop,
    setVolume,
    handleTimeUpdate
  };
};