import React, { useCallback, useEffect, useRef } from 'react';
import H5AudioPlayer from 'react-h5-audio-player';
import { useSafariAudio } from '../../hooks/audioPlayer/useSafariAudio';
import { 
  setupSafariAudioElement, 
  playSafariAudio, 
  pauseSafariAudio,
  switchSafariTrack,
  setSafariVolume,
  monitorSafariPerformance
} from '../../utils/safariOptimizations';

/**
 * Optimized audio player component for Safari with reduced latency
 * and improved performance for track switching
 */
const SafariAudioPlayer = ({
  audioSrc,
  isPlaying,
  volume = 1,
  onPlay,
  onPause,
  onEnded,
  onTimeUpdate,
  onDurationChange,
  onError,
  onReady,
  className
}) => {
  const playerRef = useRef(null);
  const isPlayingRef = useRef(false);
  const performanceMonitor = useRef(null);

  const {
    initAudioContext,
    updateInteraction,
    hasRecentInteraction,
    unlockAudio,
    setupAudioElement,
    isIOS
  } = useSafariAudio(playerRef);

  /**
   * Optimized play handler with performance monitoring
   */
  const handlePlay = useCallback(() => {
    performanceMonitor.current = monitorSafariPerformance();
    
    try {
      updateInteraction();
      
      const audio = playerRef.current?.audio?.current;
      if (!audio) return;

      // Quick unlock check for iOS
      if (isIOS && !hasRecentInteraction()) {
        unlockAudio();
      }

      // Initialize audio context (non-blocking)
      initAudioContext();

      // Use optimized play function
      playSafariAudio(audio).then((success) => {
        if (success) {
          isPlayingRef.current = true;
          onPlay?.();
        }
        if (performanceMonitor.current) {
          performanceMonitor.current.end();
        }
      }).catch((error) => {
        // Only log critical errors
        if (error.name !== 'NotAllowedError') {
          console.warn('Safari play failed:', error);
        }
        if (performanceMonitor.current) {
          performanceMonitor.current.end();
        }
      });

    } catch (error) {
      // Silent fail for better performance
      if (performanceMonitor.current) {
        performanceMonitor.current.end();
      }
    }
  }, [initAudioContext, updateInteraction, hasRecentInteraction, unlockAudio, isIOS, onPlay]);

  /**
   * Optimized pause handler
   */
  const handlePause = useCallback(() => {
    const audio = playerRef.current?.audio?.current;
    if (!audio) return;

    try {
      pauseSafariAudio(audio);
      isPlayingRef.current = false;
      onPause?.();
    } catch (error) {
      // Silent fail for better performance
    }
  }, [onPause]);

  /**
   * Optimized track switching
   */
  const handleTrackSwitch = useCallback((newSrc) => {
    const audio = playerRef.current?.audio?.current;
    if (!audio || audio.src === newSrc) return;

    performanceMonitor.current = monitorSafariPerformance();
    
    try {
      switchSafariTrack(audio, newSrc);
      if (performanceMonitor.current) {
        performanceMonitor.current.end();
      }
    } catch (error) {
      // Silent fail for better performance
      if (performanceMonitor.current) {
        performanceMonitor.current.end();
      }
    }
  }, []);

  /**
   * Simplified error handler
   */
  const handleError = useCallback((e) => {
    const audio = e.target;
    const error = audio?.error;

    // Only log critical errors for better performance
    if (error && error.code !== 4) { // MEDIA_ERR_SRC_NOT_SUPPORTED
      console.error('Safari audio error:', {
        code: error?.code,
        message: error?.message,
        src: audio?.src
      });
    }
    
    onError?.(error);
  }, [onError]);

  // Optimized play state updates
  useEffect(() => {
    const audio = playerRef.current?.audio?.current;
    if (!audio) return;

    if (isPlaying && !isPlayingRef.current) {
      handlePlay();
    } else if (!isPlaying && isPlayingRef.current) {
      handlePause();
    }
  }, [isPlaying, handlePlay, handlePause]);

  // Optimized volume updates
  useEffect(() => {
    const audio = playerRef.current?.audio?.current;
    if (audio) {
      setSafariVolume(audio, volume);
    }
  }, [volume]);

  // Optimized source updates
  useEffect(() => {
    if (audioSrc) {
      handleTrackSwitch(audioSrc);
    }
  }, [audioSrc, handleTrackSwitch]);

  // Initial setup (once)
  useEffect(() => {
    setupAudioElement();
  }, [setupAudioElement]);

  return (
    <H5AudioPlayer
      ref={playerRef}
      src={audioSrc}
      autoPlay={false}
      volume={volume}
      onPlay={handlePlay}
      onPause={handlePause}
      onEnded={onEnded}
      onTimeUpdate={onTimeUpdate}
      onDurationChange={onDurationChange}
      onError={handleError}
      onCanPlay={onReady}
      showJumpControls={false}
      customProgressBarSection={[]}
      customControlsSection={[]}
      className={className}
      style={{ display: 'none' }}
    />
  );
};

export default React.memo(SafariAudioPlayer);