import { useCallback, useRef, useEffect } from 'react';

export const useAudioCore = () => {
  const playerRef = useRef();
  
  // Safari-specific audio context management - declare refs first
  const audioContextRef = useRef(null);
  const lastUserInteractionRef = useRef(0);
  // Add mobile-specific interaction tracking
  const lastMobileInteractionRef = useRef(0);
  const pendingPlayPromiseRef = useRef(null);
  
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
      console.log('🔍 [DEBUG] No audio element found');
      return Promise.resolve();
    }

    // For Safari, ensure audio context is ready
    initAudioContext();
    
    // Check if we have a recent user interaction (within 5 seconds)
    const now = Date.now();
    const hasRecentInteraction = now - lastUserInteractionRef.current < 5000;
    const timeSinceLastInteraction = now - lastUserInteractionRef.current;
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    const isSafari = /Safari/.test(navigator.userAgent) && !/Chrome/.test(navigator.userAgent);
    
    console.log('🔍 [DEBUG] Play attempt:', {
      isMobile,
      isSafari,
      hasRecentInteraction,
      timeSinceLastInteraction: Math.round(timeSinceLastInteraction / 1000) + 's',
      audioPaused: audio.paused,
      audioReadyState: audio.readyState,
      audioSrc: audio.src ? audio.src.substring(0, 50) + '...' : 'no src'
    });
    
    if (audio.paused && audio.readyState >= 1) {
      // Cancel any pending play promise to avoid conflicts
      if (pendingPlayPromiseRef.current) {
        try {
          pendingPlayPromiseRef.current.catch(() => {}); // Ignore rejection
        } catch (e) {}
        pendingPlayPromiseRef.current = null;
      }
      
      const playPromise = audio.play().catch(error => {
        console.log('🔍 [DEBUG] Audio play failed:', {
          error: error.name,
          message: error.message,
          hasRecentInteraction,
          timeSinceLastInteraction: Math.round(timeSinceLastInteraction / 1000) + 's',
          readyState: audio.readyState,
          networkState: audio.networkState,
          isMobile,
          isSafari
        });
        
        // For Safari, if play fails due to user interaction requirements,
        // we'll need to wait for the next user click
        if (error.name === 'NotAllowedError') {
          console.log('🔍 [DEBUG] Safari blocked autoplay - user interaction required');
          
          // For mobile Safari, show a user-friendly message or handle gracefully
          if (isMobile) {
            console.log('🍎 [MOBILE SAFARI] Autoplay blocked - user needs to tap play button');
            // Could dispatch a custom event here to show UI feedback
            window.dispatchEvent(new CustomEvent('safari-autoplay-blocked', { 
              detail: { needsUserInteraction: true } 
            }));
          }
        }
        
        // Don't throw for Safari autoplay restrictions - just return resolved promise
        if (error.name === 'NotAllowedError' || error.name === 'AbortError') {
          return Promise.resolve();
        }
        
        // For other errors, still resolve to prevent breaking the app
        console.warn('Audio play error:', error);
        return Promise.resolve();
      });
      
      // Store the play promise to cancel if needed
      pendingPlayPromiseRef.current = playPromise;
      
      return playPromise;
    } else {
      console.log('🔍 [DEBUG] Audio not ready or already playing:', {
        paused: audio.paused,
        readyState: audio.readyState
      });
    }
    
    return Promise.resolve();
  }, [initAudioContext]);

  const pause = useCallback(() => {
    const audio = playerRef.current?.audio?.current;
    
    // Cancel any pending play promise
    if (pendingPlayPromiseRef.current) {
      try {
        pendingPlayPromiseRef.current.catch(() => {}); // Ignore rejection
      } catch (e) {}
      pendingPlayPromiseRef.current = null;
    }
    
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

    // Track user interaction for Safari - update both desktop and mobile timestamps
    const now = Date.now();
    lastUserInteractionRef.current = now;
    
    // Special handling for mobile interactions
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    if (isMobile) {
      lastMobileInteractionRef.current = now;
    }

    // Check current state to avoid unnecessary calls
    const isCurrentlyPaused = audio.paused;
    
    if (shouldPlay && isCurrentlyPaused) {
      console.log('🍎 [SAFARI] User requested play - should work', { isMobile });
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
    const now = Date.now();
    
    // Track that user interaction is happening for Safari
    lastUserInteractionRef.current = now;
    
    // Special handling for mobile Safari
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    if (isMobile) {
      lastMobileInteractionRef.current = now;
      
      // For mobile Safari, also try to preload the audio element
      const audio = playerRef.current?.audio?.current;
      if (audio) {
        // Set attributes that help with mobile playback
        audio.setAttribute('playsinline', 'true');
        audio.setAttribute('webkit-playsinline', 'true');
        
        // Try to load the audio metadata
        try {
          audio.load();
        } catch (error) {
          // Ignore load errors
        }
      }
    }
    
    // Initialize audio context for Safari
    initAudioContext();
    
    console.log('🍎 [SAFARI] Prepared for new track playback', { isMobile });
  }, [initAudioContext]);

  // Check if we have recent user interaction (for Safari autoplay restrictions)
  const hasRecentUserInteraction = useCallback(() => {
    const now = Date.now();
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    const interactionWindow = isMobile ? 30000 : 5000; // 30 second window for mobile
    
    const hasDesktopInteraction = now - lastUserInteractionRef.current < interactionWindow;
    const hasMobileInteraction = now - lastMobileInteractionRef.current < interactionWindow;
    
    const hasRecentInteraction = hasDesktopInteraction || hasMobileInteraction;
    
    // For debugging - if no recent interaction, show when the last interaction was
    if (!hasRecentInteraction) {
      const lastInteraction = Math.max(lastUserInteractionRef.current, lastMobileInteractionRef.current);
      const timeSinceLastInteraction = now - lastInteraction;
      console.log('🍎 [SAFARI] No recent user interaction:', {
        timeSinceLastInteraction: Math.round(timeSinceLastInteraction / 1000) + 's',
        isMobile,
        interactionWindow: interactionWindow / 1000 + 's'
      });
    }
    
    return hasRecentInteraction;
  }, []);

  // Track user interactions globally for Safari with mobile-specific events
  useEffect(() => {
    const trackUserInteraction = (event) => {
      const now = Date.now();
      const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
      const isSafari = /Safari/.test(navigator.userAgent) && !/Chrome/.test(navigator.userAgent);
      
      lastUserInteractionRef.current = now;
      
      // Track mobile-specific interactions separately
      if (event.type === 'touchstart' || event.type === 'touchend') {
        lastMobileInteractionRef.current = now;
        console.log('🍎 [MOBILE SAFARI] Touch interaction tracked');
      }
      
      console.log('🔍 [DEBUG] User interaction detected:', {
        isMobile,
        isSafari,
        timestamp: now,
        eventType: event?.type || 'unknown'
      });
    };

    // Listen for user interactions across the entire app
    const events = ['click', 'touchstart', 'touchend', 'keydown'];
    events.forEach(event => {
      document.addEventListener(event, trackUserInteraction, { passive: true });
    });

    return () => {
      events.forEach(event => {
        document.removeEventListener(event, trackUserInteraction);
      });
    };
  }, []);

  // Listen for custom Safari interaction events
  useEffect(() => {
    const handleCustomSafariInteraction = (event) => {
      const { type, timestamp } = event.detail;
      const now = Date.now();
      
      console.log('🍎 [SAFARI] Custom interaction event received in audioCore:', { type, timestamp });
      
      // Update interaction timestamps
      lastUserInteractionRef.current = now;
      
      // For mobile interactions, also update mobile timestamp
      const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
      if (isMobile) {
        lastMobileInteractionRef.current = now;
      }
      
      // For certain interaction types, ensure audio context is ready
      if (['play-pause', 'track-selection', 'next-track', 'prev-track', 'manual-play', 'toggle-play-pause'].includes(type)) {
        initAudioContext();
        
        // Also prepare the audio element for mobile Safari
        if (isMobile) {
          const audio = playerRef.current?.audio?.current;
          if (audio) {
            // Ensure mobile-friendly attributes are set
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
  }, [initAudioContext]);

  // Configure audio for background playback - MOVED TO AFTER FUNCTIONS ARE DEFINED
  useEffect(() => {
    const audio = playerRef.current?.audio?.current;
    if (audio) {
      // Set audio attributes for iOS/Safari background playback
      audio.setAttribute('playsinline', 'true');
      audio.setAttribute('webkit-playsinline', 'true');
      audio.setAttribute('preload', 'auto');
      
      // This is crucial for iOS background playbook
      audio.setAttribute('controls', '');
      
      // Set audio to continue playing when screen is locked or app is in background
      if (audio.hasOwnProperty('webkitAudioDecodedByteCount')) {
        // Safari-specific
        audio.setAttribute('x-webkit-airplay', 'allow');
      }
      
      // Mobile Safari specific attributes
      const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
      if (isMobile) {
        audio.setAttribute('muted', 'false');
        audio.removeAttribute('autoplay'); // Ensure autoplay is not set
      }

      // Enable background audio playbook - SET UP AFTER FUNCTIONS ARE DEFINED
      if ('mediaSession' in navigator) {
        navigator.mediaSession.setActionHandler('play', () => play());
        navigator.mediaSession.setActionHandler('pause', () => pause());
      }
    }
  }, [play, pause]); // Now we can safely depend on play and pause

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