import { useCallback, useRef } from 'react';

export const useAudioCore = () => {
  const playerRef = useRef();

  // Core audio control functions
  const play = useCallback(() => {
    const audio = playerRef.current?.audio?.current;
    
    if (audio && audio.paused && audio.readyState >= 2) {
      return audio.play().catch(error => {
        // Only log non-AbortError issues
        if (error.name !== 'AbortError') {
          // Audio play failed
        }
        throw error;
      });
    }
    
    return Promise.resolve();
  }, []);

  const pause = useCallback(() => {
    const audio = playerRef.current?.audio?.current;
    
    if (audio && !audio.paused) {
      try {
        audio.pause();
      } catch (error) {
        // Ignore errors during pause - they're usually harmless
        // Audio pause failed
      }
    }
  }, []);

  const togglePlayPause = useCallback((shouldPlay) => {
    const audio = playerRef.current?.audio?.current;
    if (!audio) {
      return Promise.resolve();
    }

    // Check current state to avoid unnecessary calls
    const isCurrentlyPaused = audio.paused;
    
    if (shouldPlay && isCurrentlyPaused) {
      return play();
    } else if (!shouldPlay && !isCurrentlyPaused) {
      pause();
      return Promise.resolve();
    }
    
    // Already in the desired state
    return Promise.resolve();
  }, [play, pause]);

  const setVolume = useCallback((volume) => {
    const audio = playerRef.current?.audio?.current;
    if (audio) {
      audio.volume = Math.max(0, Math.min(1, volume));
    }
  }, []);

  const setCurrentTime = useCallback((time) => {
    console.log('🕐 Seeking to:', time);
    const audio = playerRef.current?.audio?.current;
    
    if (audio && !isNaN(time)) {
      audio.currentTime = time;
      console.log('✅ Successfully set currentTime to:', audio.currentTime);
    } else {
      console.log('❌ Cannot set currentTime:', { 
        hasAudio: !!audio, 
        isValidTime: !isNaN(time), 
        time 
      });
    }
  }, []);

  const getCurrentTime = useCallback(() => {
    const audio = playerRef.current?.audio?.current;
    const currentTime = audio?.currentTime || 0;
    return currentTime;
  }, []);

  const getDuration = useCallback(() => {
    const audio = playerRef.current?.audio?.current;
    return audio?.duration || 0;
  }, []);

  const getReadyState = useCallback(() => {
    const audio = playerRef.current?.audio?.current;
    return audio?.readyState || 0;
  }, []);

  const isEnded = useCallback(() => {
    const audio = playerRef.current?.audio?.current;
    return audio?.ended || false;
  }, []);

  const isPaused = useCallback(() => {
    const audio = playerRef.current?.audio?.current;
    return audio?.paused ?? true;
  }, []);

  // Helper to check if audio element exists and is ready
  const isReady = useCallback(() => {
    const audio = playerRef.current?.audio?.current;
    return audio && audio.readyState >= 1;
  }, []);

  return {
    playerRef,
    // Core controls
    play,
    pause,
    togglePlayPause,
    setVolume,
    setCurrentTime,
    // State getters
    getCurrentTime,
    getDuration,
    getReadyState,
    isEnded,
    isPaused,
    isReady
  };
}; 