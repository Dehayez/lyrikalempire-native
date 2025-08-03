import { useCallback, useRef, useEffect } from 'react';
import { useOs } from '../useOs';

/**
 * Specialized hook for handling Safari-specific audio behaviors
 */
export const useSafariAudio = (playerRef) => {
  const { isSafari, isIOS } = useOs();
  
  // Refs for tracking interaction and audio state
  const audioContextRef = useRef(null);
  const lastInteractionRef = useRef(0);
  const setupDoneRef = useRef(false);
  const unlockAttemptRef = useRef(0);
  const maxUnlockAttempts = 3;

  /**
   * Initialize AudioContext for Safari
   */
  const initAudioContext = useCallback(async () => {
    if (!isSafari || setupDoneRef.current) return;

    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;

      if (!audioContextRef.current) {
        audioContextRef.current = new AudioContext();
      }

      if (audioContextRef.current.state === 'suspended') {
        await audioContextRef.current.resume();
      }

      // On iOS, we skip Web Audio to allow background playback
      if (!isIOS) {
        const audio = playerRef.current?.audio?.current;
        if (audio && !audio._audioSourceConnected) {
          const source = audioContextRef.current.createMediaElementSource(audio);
          source.connect(audioContextRef.current.destination);
          audio._audioSourceConnected = true;
        }
      }

      setupDoneRef.current = true;
    } catch (error) {
      console.warn('Safari AudioContext setup failed:', error);
    }
  }, [isSafari, isIOS]);

  /**
   * Track user interactions for autoplay
   */
  const updateInteraction = useCallback(() => {
    lastInteractionRef.current = Date.now();
    
    // Try to initialize audio context on interaction
    if (!setupDoneRef.current) {
      initAudioContext();
    }
  }, [initAudioContext]);

  /**
   * Check if we have recent user interaction
   */
  const hasRecentInteraction = useCallback(() => {
    const now = Date.now();
    const interactionWindow = isIOS ? 30000 : 5000; // Longer window for iOS
    return now - lastInteractionRef.current < interactionWindow;
  }, [isIOS]);

  /**
   * Unlock audio playback on iOS
   */
  const unlockAudio = useCallback(async () => {
    if (!isIOS || unlockAttemptRef.current >= maxUnlockAttempts) return;

    const audio = playerRef.current?.audio?.current;
    if (!audio) return;

    try {
      unlockAttemptRef.current++;

      // Create and play a silent audio buffer
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      const context = new AudioContext();
      const buffer = context.createBuffer(1, 1, 22050);
      const source = context.createBufferSource();
      source.buffer = buffer;
      source.connect(context.destination);
      source.start(0);

      // Try to play the actual audio element
      await audio.play();
      audio.pause();
      
      // Reset unlock attempts on success
      unlockAttemptRef.current = 0;
      
    } catch (error) {
      console.warn('Safari audio unlock failed:', error);
    }
  }, [isIOS]);

  /**
   * Configure audio element for Safari
   */
  const setupAudioElement = useCallback(() => {
    const audio = playerRef.current?.audio?.current;
    if (!audio) return;

    // Set attributes for mobile playback
    audio.setAttribute('playsinline', 'true');
    audio.setAttribute('webkit-playsinline', 'true');
    audio.setAttribute('preload', 'auto');

    // iOS-specific attributes
    if (isIOS) {
      audio.setAttribute('x-webkit-airplay', 'allow');
      audio.removeAttribute('autoplay');
      audio.setAttribute('muted', 'false');
    }

    // Set CORS attributes for Backblaze
    audio.setAttribute('crossorigin', 'anonymous');
    audio.crossOrigin = 'anonymous';

  }, [isIOS]);

  /**
   * Handle audio interruptions (phone calls, etc.)
   */
  const handleInterruption = useCallback((event) => {
    const audio = playerRef.current?.audio?.current;
    if (!audio) return;

    if (event.type === 'pause' || event.type === 'waiting') {
      // Audio was interrupted
      audio.pause();
    } else if (event.type === 'play' && hasRecentInteraction()) {
      // Try to resume if we have recent interaction
      audio.play().catch(() => {});
    }
  }, [hasRecentInteraction]);

  // Set up event listeners
  useEffect(() => {
    if (!isSafari) return;

    const audio = playerRef.current?.audio?.current;
    if (!audio) return;

    // Track user interactions
    const events = ['touchstart', 'touchend', 'click', 'keydown'];
    events.forEach(event => {
      document.addEventListener(event, updateInteraction, { passive: true });
    });

    // Handle interruptions
    audio.addEventListener('pause', handleInterruption);
    audio.addEventListener('waiting', handleInterruption);
    audio.addEventListener('play', handleInterruption);

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
      audio.removeEventListener('play', handleInterruption);
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