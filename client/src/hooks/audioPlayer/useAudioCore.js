import { useCallback, useRef, useEffect } from 'react';
import { gaplessPlaybackService } from '../../services/gaplessPlaybackService';

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
  const currentBeatRef = useRef(currentBeat);
  const playlistRef = useRef([]);
  
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
    
    // Cancel any pending play promise
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

    // Suspend the AudioContext on Safari to free resources and avoid extra delay
    if (audioContextRef.current && audioContextRef.current.state === 'running') {
      // Suspends the context asynchronously but it's quick and light-weight
      audioContextRef.current.suspend().catch(() => {});
    }

    // Proactively update MediaSession state to minimise UI lag on iOS
    if ('mediaSession' in navigator && navigator.mediaSession.playbackState !== 'paused') {
      navigator.mediaSession.playbackState = 'paused';
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
        // Reset any previous AudioContext linkage so we can safely create a
        // fresh MediaElementSource for the upcoming track (prevents
        // "Media element is already associated with an audio source node" on iOS).
        audio._audioSourceConnected = false;
        audio.setAttribute('playsinline', 'true');
        audio.setAttribute('webkit-playsinline', 'true');
        
        try {
          // CRITICAL: Reset AudioContext connection for new track BEFORE loading
          audio.load();
        } catch (error) {
          // Ignore load errors
        }
      }
    }
  }, [updateUserInteraction, initAudioContext]);

  // Gapless playback and smart preloading functionality
  const setupGaplessPlayback = useCallback((playlist) => {
    playlistRef.current = playlist || [];
    
    // Set up track end handler for gapless transitions
    const handleTrackEnd = () => {
      const currentIndex = playlistRef.current.findIndex(beat => beat.id === currentBeatRef.current?.id);
      if (currentIndex !== -1 && currentIndex < playlistRef.current.length - 1) {
        const nextBeat = playlistRef.current[currentIndex + 1];
        // Trigger next track transition
        gaplessPlaybackService.transitionToNext();
      }
    };

    gaplessPlaybackService.onTrackEnd = handleTrackEnd;
  }, []);

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

  const handleTimeUpdate = useCallback((currentTime, duration) => {
    if (!duration) return;

    const progress = currentTime / duration;
    // Start preloading when current track is at 85%
    if (progress >= 0.85) {
      preloadNextTrack();
    }
  }, [preloadNextTrack]);

  // Enhanced play function with gapless support
  const playWithGapless = useCallback(async () => {
    if (!currentBeatRef.current?.audioSrc) return Promise.resolve();

    try {
      // Use gapless service for playback
      const success = await gaplessPlaybackService.play(currentBeatRef.current.audioSrc);
      if (success) {
        // Start preloading next track
        preloadNextTrack();
      }
      return success;
    } catch (error) {
      console.error('Error in gapless playback:', error);
      // Fallback to regular play
      return play();
    }
  }, [play, preloadNextTrack]);

  // Update current beat reference and set up gapless playback
  useEffect(() => {
    currentBeatRef.current = currentBeat;
  }, [currentBeat]);

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

    // Set attributes for mobile playback and PWA background audio
    audio.setAttribute('playsinline', 'true');
    audio.setAttribute('webkit-playsinline', 'true');
    audio.setAttribute('preload', 'auto');
    audio.setAttribute('controls', 'true');
    
    // iOS Safari specific attributes for background playback
    if (audio.hasOwnProperty('webkitAudioDecodedByteCount') || /iPad|iPhone|iPod/.test(navigator.userAgent)) {
      audio.setAttribute('x-webkit-airplay', 'allow');
      // Allow background audio on iOS
      audio.setAttribute('autoplay', 'false');
      audio.setAttribute('muted', 'false');
      
      // Disable automatic audio interruption (only with user gesture)
      const setupSinkId = () => {
        try {
          if (audio.setSinkId) {
            audio.setSinkId('').catch(() => {
              // setSinkId failed, that's okay
            });
          }
        } catch (e) {
          // setSinkId not supported, that's okay
        }
      };
      
      // Set up sink ID on first user interaction
      const handleUserGesture = () => {
        setupSinkId();
        document.removeEventListener('touchstart', handleUserGesture);
        document.removeEventListener('click', handleUserGesture);
        document.removeEventListener('play', handleUserGesture);
      };
      
      document.addEventListener('touchstart', handleUserGesture, { once: true });
      document.addEventListener('click', handleUserGesture, { once: true });
      audio.addEventListener('play', handleUserGesture, { once: true });
    }
    
    // CRITICAL FIX: Always set CORS for Safari iPhone BEFORE any loading
    // Since audio files are served from Backblaze B2, they're always cross-origin
    if (/iPad|iPhone|iPod/.test(navigator.userAgent)) {
      // Set CORS attributes immediately, before any audio loading
      audio.setAttribute('crossorigin', 'anonymous');
      audio.crossOrigin = 'anonymous';
    }
    
    if (isMobile()) {
      audio.setAttribute('muted', 'false');
      audio.removeAttribute('autoplay');
      audio.setAttribute('playsinline', 'true');
      audio.setAttribute('webkit-playsinline', 'true');
      audio.preload = 'metadata';
      
      // Prevent audio interruption on iOS
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);

      if (isIOS) {
        // ----
        // IMPORTANT: iOS mutes any track that is routed through Web-Audio when the
        // PWA goes to the background / the phone is locked.  The plain <audio> tag
        // keeps playing just fine.  Therefore on real iPhones we completely skip
        // creating a MediaElementSource.  Waveform / analyser features will still
        // work on desktop and Android but audio will always keep playing in the
        // background on iOS.
        // ----

        return; // ← do NOT set up Web-Audio on iOS
      }

      // ------- Non-iOS flow (desktop / Android) -------

      // Set audio session for background playback
      const setAudioSession = () => {
        // Check if this audio element already has an AudioContext connection
        if (audio._audioSourceConnected) {
          return;
        }
        
        try {
          const AudioContextClass = window.AudioContext || window.webkitAudioContext;
          if (!AudioContextClass) {
            return;
          }
          
          // Don't create AudioContext if one already exists from initAudioContext
          if (audioContextRef.current) {
            const audioContext = audioContextRef.current;
            try {
              const source = audioContext.createMediaElementSource(audio);
              source.connect(audioContext.destination);
              // Mark this specific audio element as connected
              audio._audioSourceConnected = true;
            } catch (sourceError) {
              // Mark as connected anyway to prevent retry loops
              audio._audioSourceConnected = true;
            }
            return;
          }
          
          const audioContext = new AudioContextClass();
          
          // Only create source if audio context is working
          if (audioContext) {
            const source = audioContext.createMediaElementSource(audio);
            source.connect(audioContext.destination);
            // Mark this specific audio element as connected
            audio._audioSourceConnected = true;
            
            // Resume audio context if suspended (required for iOS)
            if (audioContext.state === 'suspended') {
              audioContext.resume();
            }
          }
        } catch (e) {
          // Mark as connected to prevent retry loops
          audio._audioSourceConnected = true;
        }
      };
      
      // Set up audio session on first user interaction
      const setupAudioSession = () => {
        setAudioSession();
        document.removeEventListener('touchstart', setupAudioSession);
        document.removeEventListener('click', setupAudioSession);
      };

      document.addEventListener('touchstart', setupAudioSession, { once: true });
      document.addEventListener('click', setupAudioSession, { once: true });
    }

    // Enhanced media session handlers for background playback
    if ('mediaSession' in navigator) {
      navigator.mediaSession.setActionHandler('play', () => {
        play().catch(console.warn);
      });
      navigator.mediaSession.setActionHandler('pause', () => {
        pause();
      });
      
      // Set initial playback state
      navigator.mediaSession.playbackState = 'none';
    }

    // Listen for audio interruptions (phone calls, etc.)
    const handleAudioInterruption = () => {
      if (!audio.paused) {
        // Audio was interrupted, mark for resumption
        audio.dataset.wasPlayingBeforeInterruption = 'true';
      }
    };

    const handleAudioResume = () => {
      if (audio.dataset.wasPlayingBeforeInterruption === 'true') {
        // Resume playback after interruption
        audio.play().catch(console.warn);
        delete audio.dataset.wasPlayingBeforeInterruption;
      }
    };

    // Add interruption listeners for iOS
    audio.addEventListener('pause', handleAudioInterruption);
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) {
        handleAudioResume();
      }
    });

    return () => {
      audio.removeEventListener('pause', handleAudioInterruption);
    };
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
    initAudioContext,
    // Gapless playback and smart preloading
    setupGaplessPlayback,
    preloadNextTrack,
    handleTimeUpdate,
    playWithGapless
  };
}; 