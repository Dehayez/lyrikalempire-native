import { useCallback, useRef, useEffect } from 'react';

// Browser detection utilities
const isSafari = () => {
  const ua = navigator.userAgent.toLowerCase();
  return ua.indexOf('safari') !== -1 && ua.indexOf('chrome') === -1;
};

const isMobile = () => /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

export const useAudioCore = (currentBeat) => {
  const playerRef = useRef();
  const audioContextRef = useRef(null);
  const lastUserInteractionRef = useRef(0);
  const lastMobileInteractionRef = useRef(0);
  const pendingPlayPromiseRef = useRef(null);
  
  // Initialize audio context for Safari
  const initAudioContext = useCallback(() => {
    if (typeof window === 'undefined') return;
    
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    
    if (!audioContextRef.current) {
      try {
        audioContextRef.current = new AudioContext();
      } catch (error) {
        console.warn('Could not create AudioContext:', error);
        return;
      }
    }
    
    if (audioContextRef.current.state === 'suspended') {
      audioContextRef.current.resume().catch(error => {
        console.warn('Failed to resume AudioContext:', error);
      });
    }
  }, []);

  // Track user interaction for Safari autoplay restrictions
  const updateUserInteraction = useCallback(() => {
    const now = Date.now();
    lastUserInteractionRef.current = now;
    
    if (isMobile()) {
      lastMobileInteractionRef.current = now;
    }
  }, []);

  // Check if we have recent user interaction
  const hasRecentUserInteraction = useCallback(() => {
    const now = Date.now();
    const mobileDevice = isMobile();
    const interactionWindow = mobileDevice ? 30000 : 5000;
    
    const hasDesktopInteraction = now - lastUserInteractionRef.current < interactionWindow;
    const hasMobileInteraction = now - lastMobileInteractionRef.current < interactionWindow;
    
    return hasDesktopInteraction || hasMobileInteraction;
  }, []);

  // Core audio control functions
  const play = useCallback(() => {
    const audio = playerRef.current?.audio?.current;
    
    if (!audio) {
      return Promise.resolve();
    }

    initAudioContext();
    updateUserInteraction();
    
    if (audio.paused && audio.readyState >= 1) {
      // Cancel any pending play promise
      if (pendingPlayPromiseRef.current) {
        pendingPlayPromiseRef.current.catch(() => {});
        pendingPlayPromiseRef.current = null;
      }
      
      const playPromise = audio.play().catch(error => {
        if (error.name === 'NotAllowedError') {
          // Safari autoplay blocked - dispatch event for UI handling
          if (isMobile()) {
            window.dispatchEvent(new CustomEvent('safari-autoplay-blocked', { 
              detail: { needsUserInteraction: true } 
            }));
          }
        }
        
        return Promise.resolve();
      });
      
      pendingPlayPromiseRef.current = playPromise;
      return playPromise;
    }
    
    return Promise.resolve();
  }, [initAudioContext, updateUserInteraction]);

  const pause = useCallback(() => {
    const audio = playerRef.current?.audio?.current;
    
    if (pendingPlayPromiseRef.current) {
      pendingPlayPromiseRef.current.catch(() => {});
      pendingPlayPromiseRef.current = null;
    }
    
    if (audio && !audio.paused) {
      try {
        audio.pause();
      } catch (error) {
        // Ignore pause errors
      }
    }
  }, []);

  const togglePlayPause = useCallback((shouldPlay) => {
    const audio = playerRef.current?.audio?.current;
    if (!audio) return Promise.resolve();

    updateUserInteraction();

    const isCurrentlyPaused = audio.paused;
    
    if (shouldPlay && isCurrentlyPaused) {
      return play();
    } else if (!shouldPlay && !isCurrentlyPaused) {
      pause();
    }
    
    return Promise.resolve();
  }, [play, pause, updateUserInteraction]);

  const setVolume = useCallback((volume) => {
    const audio = playerRef.current?.audio?.current;
    if (!audio) return;

    try {
      const clampedVolume = Math.max(0, Math.min(1, volume));
      audio.volume = clampedVolume;
    } catch (error) {
      console.warn('Volume control not allowed:', error.message);
    }
  }, []);

  const setCurrentTime = useCallback((time) => {
    const audio = playerRef.current?.audio?.current;
    
    if (audio && !isNaN(time)) {
      audio.currentTime = time;
    }
  }, []);

  // State getters
  const getCurrentTime = useCallback(() => {
    const audio = playerRef.current?.audio?.current;
    return audio?.currentTime || 0;
  }, []);

  const getDuration = useCallback(() => {
    // Use database duration instead of audio element duration to avoid AAC conversion discrepancies
    return currentBeat?.duration || 0;
  }, [currentBeat]);

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

  const isReady = useCallback(() => {
    const audio = playerRef.current?.audio?.current;
    return audio && audio.readyState >= 1;
  }, []);

  // Safari-specific preparation for new track
  const prepareForNewTrack = useCallback(() => {
    updateUserInteraction();
    initAudioContext();
    
    if (isMobile()) {
      const audio = playerRef.current?.audio?.current;
      if (audio) {
        audio.setAttribute('playsinline', 'true');
        audio.setAttribute('webkit-playsinline', 'true');
        
        try {
          audio.load();
        } catch (error) {
          // Ignore load errors
        }
      }
    }
  }, [updateUserInteraction, initAudioContext]);

  // Track user interactions globally for Safari
  useEffect(() => {
    const trackUserInteraction = (event) => {
      updateUserInteraction();
      
      if (event.type === 'touchstart' || event.type === 'touchend') {
        // Mobile-specific interaction handling
      }
    };

    const events = ['click', 'touchstart', 'touchend', 'keydown'];
    events.forEach(event => {
      document.addEventListener(event, trackUserInteraction, { passive: true });
    });

    return () => {
      events.forEach(event => {
        document.removeEventListener(event, trackUserInteraction);
      });
    };
  }, [updateUserInteraction]);

  // Listen for custom Safari interaction events
  useEffect(() => {
    const handleCustomSafariInteraction = (event) => {
      const { type } = event.detail;
      
      updateUserInteraction();
      
      const interactionTypes = [
        'play-pause', 'track-selection', 'next-track', 
        'prev-track', 'manual-play', 'toggle-play-pause'
      ];
      
      if (interactionTypes.includes(type)) {
        initAudioContext();
        
        if (isMobile()) {
          const audio = playerRef.current?.audio?.current;
          if (audio) {
            audio.setAttribute('playsinline', 'true');
            audio.setAttribute('webkit-playsinline', 'true');
          }
        }
      }
    };

    document.addEventListener('safari-user-interaction', handleCustomSafariInteraction);
    
    return () => {
      document.removeEventListener('safari-user-interaction', handleCustomSafariInteraction);
    };
  }, [initAudioContext, updateUserInteraction]);

  // Configure audio element for optimal playback
  useEffect(() => {
    const audio = playerRef.current?.audio?.current;
    if (!audio) return;

    // Set attributes for mobile playback
    audio.setAttribute('playsinline', 'true');
    audio.setAttribute('webkit-playsinline', 'true');
    audio.setAttribute('preload', 'auto');
    audio.setAttribute('controls', '');
    
    if (audio.hasOwnProperty('webkitAudioDecodedByteCount')) {
      audio.setAttribute('x-webkit-airplay', 'allow');
    }
    
    if (isMobile()) {
      audio.setAttribute('muted', 'false');
      audio.removeAttribute('autoplay');
    }

    // Set up media session handlers
    if ('mediaSession' in navigator) {
      navigator.mediaSession.setActionHandler('play', () => play());
      navigator.mediaSession.setActionHandler('pause', () => pause());
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