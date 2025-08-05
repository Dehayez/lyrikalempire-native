import { useCallback, useRef, useEffect } from 'react';
import { useOs } from '../useOs';

/**
 * Optimized hook for handling Safari-specific audio behaviors
 * Focused on reducing latency and improving performance
 */
export const useSafariAudio = (playerRef) => {
  const { isSafari, isIOS } = useOs();
  
  // Simplified refs for better performance
  const audioContextRef = useRef(null);
  const lastInteractionRef = useRef(0);
  const setupDoneRef = useRef(false);
  const unlockAttemptRef = useRef(0);
  const maxUnlockAttempts = 2; // Reduced from 3

  /**
   * Simplified AudioContext initialization for Safari
   */
  const initAudioContext = useCallback(() => {
    if (!isSafari || setupDoneRef.current) return;

    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;

      if (!audioContextRef.current) {
        audioContextRef.current = new AudioContext();
      }

      // Resume context if suspended (non-blocking)
      if (audioContextRef.current.state === 'suspended') {
        audioContextRef.current.resume().catch(() => {
          // Ignore resume errors for better performance
        });
      }

      // Skip Web Audio on iOS for better performance
      if (!isIOS) {
        const audio = playerRef.current?.audio?.current;
        if (audio && !audio._audioSourceConnected) {
          try {
            const source = audioContextRef.current.createMediaElementSource(audio);
            source.connect(audioContextRef.current.destination);
            audio._audioSourceConnected = true;
          } catch (error) {
            // Ignore connection errors
          }
        }
      }

      setupDoneRef.current = true;
    } catch (error) {
      // Silent fail for better performance
      setupDoneRef.current = true;
    }
  }, [isSafari, isIOS]);

  /**
   * Optimized interaction tracking
   */
  const updateInteraction = useCallback(() => {
    lastInteractionRef.current = Date.now();
    
    // Initialize audio context immediately on interaction
    if (!setupDoneRef.current) {
      initAudioContext();
    }
  }, [initAudioContext]);

  /**
   * Check if we have recent user interaction
   */
  const hasRecentInteraction = useCallback(() => {
    const now = Date.now();
    const interactionWindow = isIOS ? 15000 : 3000; // Reduced windows for faster response
    return now - lastInteractionRef.current < interactionWindow;
  }, [isIOS]);

  /**
   * Simplified audio unlock for iOS
   */
  const unlockAudio = useCallback(() => {
    if (!isIOS || unlockAttemptRef.current >= maxUnlockAttempts) return;

    const audio = playerRef.current?.audio?.current;
    if (!audio) return;

    try {
      unlockAttemptRef.current++;

      // Simplified unlock - just try to play and pause
      audio.play().then(() => {
        audio.pause();
        unlockAttemptRef.current = 0;
      }).catch(() => {
        // Ignore unlock errors
      });
      
    } catch (error) {
      // Silent fail for better performance
    }
  }, [isIOS]);

  /**
   * Optimized audio element setup
   */
  const setupAudioElement = useCallback(() => {
    const audio = playerRef.current?.audio?.current;
    if (!audio) return;

    // Essential attributes only for better performance
    audio.setAttribute('playsinline', 'true');
    audio.setAttribute('webkit-playsinline', 'true');
    audio.setAttribute('preload', 'metadata'); // Changed from 'auto' for faster loading

    // iOS-specific optimizations
    if (isIOS) {
      audio.setAttribute('x-webkit-airplay', 'allow');
      audio.removeAttribute('autoplay');
      audio.setAttribute('muted', 'false');
    }

    // CORS attributes for Backblaze
    audio.setAttribute('crossorigin', 'anonymous');
    audio.crossOrigin = 'anonymous';

  }, [isIOS]);

  /**
   * Simplified interruption handling
   */
  const handleInterruption = useCallback((event) => {
    const audio = playerRef.current?.audio?.current;
    if (!audio) return;

    if (event.type === 'pause' || event.type === 'waiting') {
      audio.pause();
    }
  }, []);

  // Optimized event listeners setup
  useEffect(() => {
    if (!isSafari) return;

    const audio = playerRef.current?.audio?.current;
    if (!audio) return;

    // Reduced event listeners for better performance
    const events = ['touchstart', 'click'];
    events.forEach(event => {
      document.addEventListener(event, updateInteraction, { passive: true });
    });

    // Simplified interruption handling
    audio.addEventListener('pause', handleInterruption);
    audio.addEventListener('waiting', handleInterruption);

    // Initial setup
    setupAudioElement();
    if (isIOS) {
      unlockAudio();
    }

    return () => {
      events.forEach(event => {
        document.removeEventListener(event, updateInteraction);
      });
      
      audio.removeEventListener('pause', handleInterruption);
      audio.removeEventListener('waiting', handleInterruption);
    };
  }, [isSafari, isIOS, updateInteraction, handleInterruption, setupAudioElement, unlockAudio]);

  return {
    initAudioContext,
    updateInteraction,
    hasRecentInteraction,
    unlockAudio,
    setupAudioElement,
    isSafari,
    isIOS
  };
};