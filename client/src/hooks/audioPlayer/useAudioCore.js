import { useCallback, useRef, useEffect } from 'react';
import { gaplessPlaybackService } from '../../services/gaplessPlaybackService';
import { mobileAudioPreloader } from '../../services/mobileAudioPreloader';
import { getSignedUrl } from '../../services';

// Browser detection utilities
const isSafari = () => {
  const ua = navigator.userAgent.toLowerCase();
  return ua.indexOf('safari') !== -1 && ua.indexOf('chrome') === -1;
};

const isMobile = () => /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

const isIOS = () => /iPhone|iPad|iPod/i.test(navigator.userAgent);

const isPWA = () => {
  if (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) {
    return true;
  }
  if (window.navigator.standalone === true) {
    return true;
  }
  return false;
};

// Track if we're waiting for user interaction to resume playback
let pendingPlaybackAfterTrackEnd = false;

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
  const play = useCallback((options = {}) => {
    const audio = playerRef.current?.audio?.current;
    const { isUserGesture = false, isAutoPlayAfterEnd = false } = options;
    
    if (!audio) {
      return Promise.resolve({ success: false, reason: 'no-audio-element' });
    }

    initAudioContext();
    updateUserInteraction();
    
    // On iOS PWA, if this is an auto-play after track end (no user gesture),
    // we need to handle it specially
    const isIOSPWA = isIOS() && isPWA();
    
    // If audio is paused and has some data loaded
    if (audio.paused) {
      // Cancel any pending play promise
      if (pendingPlayPromiseRef.current) {
        pendingPlayPromiseRef.current.catch(() => {});
        pendingPlayPromiseRef.current = null;
      }
      
      // On iOS PWA with user gesture, try to play even if not fully ready
      // The play() call itself can trigger loading on iOS
      if (isUserGesture && isIOSPWA) {
        const playPromise = audio.play()
          .then(() => {
            pendingPlaybackAfterTrackEnd = false;
            return { success: true };
          })
          .catch(error => {
            // Ignore AbortError - happens when play is interrupted by pause/load
            if (error.name === 'AbortError') {
              return { success: false, reason: 'aborted' };
            }
            if (error.name === 'NotAllowedError') {
              return { success: false, reason: 'autoplay-blocked' };
            }
            return { success: false, reason: error.name };
          });
        
        pendingPlayPromiseRef.current = playPromise;
        return playPromise;
      }
      
      // Standard play logic - require readyState >= 1
      if (audio.readyState >= 1) {
        const playPromise = audio.play()
          .then(() => {
            // Successfully playing
            pendingPlaybackAfterTrackEnd = false;
            return { success: true };
          })
          .catch(error => {
            if (error.name === 'NotAllowedError') {
              // Safari autoplay blocked - dispatch event for UI handling
              if (isMobile() || isIOSPWA) {
                // Mark that we need user interaction to continue
                pendingPlaybackAfterTrackEnd = isAutoPlayAfterEnd;
                
                window.dispatchEvent(new CustomEvent('safari-autoplay-blocked', { 
                  detail: { 
                    needsUserInteraction: true,
                    isAutoPlayAfterEnd: isAutoPlayAfterEnd
                  } 
                }));
              }
              return { success: false, reason: 'autoplay-blocked' };
            }
            
            // Ignore AbortError - happens when play is interrupted
            if (error.name === 'AbortError') {
              return { success: false, reason: 'aborted' };
            }
            
            return { success: false, reason: error.name };
          });
        
        pendingPlayPromiseRef.current = playPromise;
        return playPromise;
      }
      
      // If audio isn't ready yet but we want to play, mark as pending
      if (audio.readyState < 1 && isAutoPlayAfterEnd && isIOSPWA) {
        pendingPlaybackAfterTrackEnd = true;
        return Promise.resolve({ success: false, reason: 'not-ready-ios-pwa' });
      }
    }
    
    return Promise.resolve({ success: true });
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
    
    // Clear pending playback state since user is actively interacting
    pendingPlaybackAfterTrackEnd = false;

    const isCurrentlyPaused = audio.paused;
    
    if (shouldPlay && isCurrentlyPaused) {
      // On iOS PWA, if audio isn't ready yet, we need to wait for it
      // but since this is a user gesture, we should try to trigger load
      if (audio.readyState < 1 && isIOS() && isPWA()) {
        // Try to load the audio first
        try {
          audio.load();
        } catch (e) {
          // Ignore load errors
        }
        
        // Set up a one-time listener for when audio is ready
        const playWhenReady = () => {
          audio.removeEventListener('canplay', playWhenReady);
          play({ isUserGesture: true });
        };
        audio.addEventListener('canplay', playWhenReady, { once: true });
        
        // Also try to play immediately in case it becomes ready quickly
        return play({ isUserGesture: true });
      }
      
      return play({ isUserGesture: true });
    } else if (!shouldPlay && !isCurrentlyPaused) {
      pause();
    }
    
    return Promise.resolve({ success: true });
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

  // Check if we have pending playback waiting for user interaction
  const hasPendingPlayback = useCallback(() => {
    return pendingPlaybackAfterTrackEnd;
  }, []);

  // Clear pending playback state
  const clearPendingPlayback = useCallback(() => {
    pendingPlaybackAfterTrackEnd = false;
  }, []);

  // Safari-specific preparation for new track
  const prepareForNewTrack = useCallback(() => {
    updateUserInteraction();
    initAudioContext();
    
    // Reset pending playback state when switching tracks
    pendingPlaybackAfterTrackEnd = false;
    
    if (isMobile()) {
      const audio = playerRef.current?.audio?.current;
      if (audio) {
        // Reset any previous AudioContext linkage so we can safely create a
        // fresh MediaElementSource for the upcoming track (prevents
        // "Media element is already associated with an audio source node" on iOS).
        audio._audioSourceConnected = false;
        audio.setAttribute('playsinline', 'true');
        audio.setAttribute('webkit-playsinline', 'true');
        
        // Cancel any pending play promise before loading new track
        if (pendingPlayPromiseRef.current) {
          pendingPlayPromiseRef.current.catch(() => {});
          pendingPlayPromiseRef.current = null;
        }
        
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
    
    // Disable gapless on mobile - doesn't work well
    const isMobileDevice = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    if (isMobileDevice) {
      gaplessPlaybackService.onTrackEnd = null;
      return;
    }
    
    // Set up track end handler for gapless transitions (desktop only)
    gaplessPlaybackService.onTrackEnd = () => {
      const currentIndex = playlistRef.current.findIndex(beat => beat.id === currentBeatRef.current?.id);
      if (currentIndex !== -1 && currentIndex < playlistRef.current.length - 1) {
        gaplessPlaybackService.transitionToNext();
      }
    };
  }, []);

  // Track which beats we've already started preloading to avoid duplicate requests
  const preloadingBeatsRef = useRef(new Set());

  const preloadNextTrack = useCallback(() => {
    if (!currentBeatRef.current || !playlistRef.current.length) return;

    const currentIndex = playlistRef.current.findIndex(beat => beat.id === currentBeatRef.current.id);
    if (currentIndex === -1 || currentIndex >= playlistRef.current.length - 1) return;

    const nextBeat = playlistRef.current[currentIndex + 1];
    if (!nextBeat?.user_id || !nextBeat?.audio) return;

    // Skip if already preloading this beat
    const preloadKey = `${nextBeat.user_id}_${nextBeat.audio}`;
    if (preloadingBeatsRef.current.has(preloadKey)) return;
    preloadingBeatsRef.current.add(preloadKey);

    const isMobileDevice = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    
    // Get signed URL then preload audio data
    getSignedUrl(nextBeat.user_id, nextBeat.audio)
      .then(signedUrl => {
        if (isMobileDevice) {
          // Use lightweight HTML5 Audio preloader for mobile
          mobileAudioPreloader.preload(signedUrl);
        } else {
          // Use gapless playback service for desktop
          gaplessPlaybackService.preloadNext(signedUrl);
        }
      })
      .catch(() => {
        // Remove from tracking on error so we can retry
        preloadingBeatsRef.current.delete(preloadKey);
      });
  }, []);

  const handleTimeUpdate = useCallback((currentTime, duration) => {
    if (!duration) return;

    const progress = currentTime / duration;
    const isMobileDevice = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    
    // Start preloading earlier on mobile (50%) since network is slower
    // Desktop starts at 85%
    const preloadThreshold = isMobileDevice ? 0.50 : 0.85;
    
    if (progress >= preloadThreshold) {
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

  // Update current beat reference and immediately start preloading next track
  useEffect(() => {
    currentBeatRef.current = currentBeat;
    
    // Clear preload tracking when beat changes so we can preload the new next track
    if (currentBeat?.user_id && currentBeat?.audio) {
      const currentKey = `${currentBeat.user_id}_${currentBeat.audio}`;
      preloadingBeatsRef.current.delete(currentKey);
      
      // Immediately start preloading the next track when current track starts
      // Small delay to let the current track start loading first
      const preloadTimer = setTimeout(() => {
        preloadNextTrack();
      }, 500);
      
      return () => clearTimeout(preloadTimer);
    }
  }, [currentBeat, preloadNextTrack]);

  // Cleanup AudioContext and mobile preloader on unmount to prevent memory leaks
  useEffect(() => {
    return () => {
      if (audioContextRef.current) {
        audioContextRef.current.close().catch(() => {});
        audioContextRef.current = null;
      }
      // Cleanup mobile preloader
      mobileAudioPreloader.cleanup();
      // Clear preloading tracking
      preloadingBeatsRef.current.clear();
    };
  }, []);

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
    
    // Detect iOS for special handling
    const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent);
    
    if (isMobile()) {
      audio.setAttribute('muted', 'false');
      audio.removeAttribute('autoplay');
      audio.setAttribute('playsinline', 'true');
      audio.setAttribute('webkit-playsinline', 'true');
      audio.preload = 'metadata';

      // ------- Non-iOS mobile flow (Android) -------
      // iOS skips Web-Audio setup because it mutes audio when PWA goes to background
      if (!isIOSDevice) {
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
                audio._audioSourceConnected = true;
              } catch (sourceError) {
                audio._audioSourceConnected = true;
              }
              return;
            }
            
            const audioContext = new AudioContextClass();
            
            if (audioContext) {
              const source = audioContext.createMediaElementSource(audio);
              source.connect(audioContext.destination);
              audio._audioSourceConnected = true;
              
              if (audioContext.state === 'suspended') {
                audioContext.resume();
              }
            }
          } catch (e) {
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
    }

    // Note: Media session handlers are set up in useMediaSession.js hook
    // to avoid duplication and ensure proper state management
    
    // Handle app being fully closed (iOS PWA) - only pagehide, NOT visibilitychange
    // visibilitychange fires when backgrounding which should allow continued playback
    const handlePageHide = (event) => {
      // On iOS PWA, pagehide with persisted=false means app is being terminated
      // pagehide with persisted=true means page might be restored (bfcache)
      if (!event.persisted && !audio.paused) {
        audio.pause();
      }
    };
    window.addEventListener('pagehide', handlePageHide);

    // Handle beforeunload for desktop browsers closing the tab/window
    const handleBeforeUnload = () => {
      if (!audio.paused) {
        audio.pause();
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('pagehide', handlePageHide);
      window.removeEventListener('beforeunload', handleBeforeUnload);
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
    hasPendingPlayback,
    clearPendingPlayback,
    // Gapless playback and smart preloading
    setupGaplessPlayback,
    preloadNextTrack,
    handleTimeUpdate,
    playWithGapless
  };
}; 