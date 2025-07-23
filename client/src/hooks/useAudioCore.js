import { useCallback, useRef, useEffect } from 'react';

export const useAudioCore = () => {
  const playerRef = useRef();
  
  // Safari-specific audio context management - declare refs first
  const audioContextRef = useRef(null);
  const lastUserInteractionRef = useRef(0);
  
  // Initialize audio context for Safari
  const initAudioContext = useCallback(() => {
    if (typeof window !== 'undefined' && window.AudioContext || window.webkitAudioContext) {
      if (!audioContextRef.current) {
        try {
          audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
        } catch (error) {
          console.log('🍎 [SAFARI] Could not create AudioContext:', error);
        }
      }
      
      // Resume audio context if suspended (Safari requirement)
      if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
        audioContextRef.current.resume().then(() => {
          console.log('🍎 [SAFARI] AudioContext resumed');
        }).catch(error => {
          console.log('🍎 [SAFARI] Failed to resume AudioContext:', error);
        });
      }
    }
  }, []);

  // Core audio control functions with Safari handling
  const play = useCallback(() => {
    const audio = playerRef.current?.audio?.current;
    
    if (!audio) {
      return Promise.resolve();
    }

    // For Safari, ensure audio context is ready
    initAudioContext();
    
    // Check if we have a recent user interaction (within 5 seconds)
    const now = Date.now();
    const hasRecentInteraction = now - lastUserInteractionRef.current < 5000;
    
    if (audio.paused && audio.readyState >= 1) {
      return audio.play().catch(error => {
        console.log('🍎 [SAFARI] Play failed:', {
          error: error.name,
          message: error.message,
          hasRecentInteraction,
          readyState: audio.readyState,
          networkState: audio.networkState
        });
        
        // For Safari, if play fails due to user interaction requirements,
        // we'll need to wait for the next user click
        if (error.name === 'NotAllowedError') {
          console.log('🍎 [SAFARI] Play blocked - requires user interaction');
        }
        
        // Don't throw for Safari autoplay restrictions
        if (error.name === 'NotAllowedError' || error.name === 'AbortError') {
          return Promise.resolve();
        }
        
        throw error;
      });
    }
    
    return Promise.resolve();
  }, [initAudioContext]);

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

    // Track user interaction for Safari
    lastUserInteractionRef.current = Date.now();

    // Check current state to avoid unnecessary calls
    const isCurrentlyPaused = audio.paused;
    
    if (shouldPlay && isCurrentlyPaused) {
      console.log('🍎 [SAFARI] User requested play - should work');
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
      // Safari often ignores programmatic volume changes
      // Try to set it, but don't expect it to work in Safari
      try {
        const clampedVolume = Math.max(0, Math.min(1, volume));
        audio.volume = clampedVolume;
        
        // For Safari, log if volume change was ignored
        if (Math.abs(audio.volume - clampedVolume) > 0.01) {
          console.log('🍎 [SAFARI] Volume change ignored by browser (expected behavior)');
        }
      } catch (error) {
        console.log('🍎 [SAFARI] Volume control not allowed:', error.message);
      }
    }
  }, []);

  const setCurrentTime = useCallback((time) => {
    const audio = playerRef.current?.audio?.current;
    
    if (audio && !isNaN(time)) {
      audio.currentTime = time;
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

  // Safari-specific: Prepare for new track playback
  const prepareForNewTrack = useCallback(() => {
    // Track that user interaction is happening for Safari
    lastUserInteractionRef.current = Date.now();
    
    // Initialize audio context for Safari
    initAudioContext();
    
    console.log('🍎 [SAFARI] Prepared for new track playback');
  }, [initAudioContext]);

  // Check if we have recent user interaction (for Safari autoplay restrictions)
  const hasRecentUserInteraction = useCallback(() => {
    const now = Date.now();
    return now - lastUserInteractionRef.current < 5000; // 5 second window
  }, []);

  // Track user interactions globally for Safari
  useEffect(() => {
    const trackUserInteraction = () => {
      lastUserInteractionRef.current = Date.now();
    };

    // Listen for user interactions across the entire app
    const events = ['click', 'touchstart', 'keydown'];
    events.forEach(event => {
      document.addEventListener(event, trackUserInteraction, { passive: true });
    });

    return () => {
      events.forEach(event => {
        document.removeEventListener(event, trackUserInteraction);
      });
    };
  }, []);

  // Configure audio for background playback
  useEffect(() => {
    const audio = playerRef.current?.audio?.current;
    if (audio) {
      // Enable background audio playback
      if ('mediaSession' in navigator) {
        navigator.mediaSession.setActionHandler('play', () => play());
        navigator.mediaSession.setActionHandler('pause', () => pause());
      }
      
      // Set audio attributes for iOS/Safari background playback
      audio.setAttribute('playsinline', 'true');
      audio.setAttribute('webkit-playsinline', 'true');
      audio.setAttribute('preload', 'auto');
      
      // This is crucial for iOS background playback
      audio.setAttribute('controls', '');
      
      // Set audio to continue playing when screen is locked or app is in background
      if (audio.hasOwnProperty('webkitAudioDecodedByteCount')) {
        // Safari-specific
        audio.setAttribute('x-webkit-airplay', 'allow');
      }
    }
  }, [play, pause]);

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
    isReady,
    // Safari-specific helpers
    prepareForNewTrack,
    hasRecentUserInteraction,
    initAudioContext
  };
}; 