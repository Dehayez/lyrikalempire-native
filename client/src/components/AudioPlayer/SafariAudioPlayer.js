import React, { useCallback, useEffect, useRef } from 'react';
import H5AudioPlayer from 'react-h5-audio-player';
import { useSafariAudio } from '../../hooks/audioPlayer/useSafariAudio';

/**
 * Specialized audio player component for Safari with better error handling
 * and background playback support
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
  const playAttemptRef = useRef(0);
  const maxPlayAttempts = 3;

  const {
    initAudioContext,
    updateInteraction,
    hasRecentInteraction,
    unlockAudio,
    setupAudioElement,
    isIOS
  } = useSafariAudio(playerRef);

  /**
   * Handle play with retry logic
   */
  const handlePlay = useCallback(async () => {
    try {
      updateInteraction();
      
      const audio = playerRef.current?.audio?.current;
      if (!audio) return;

      // Check if we need to unlock audio
      if (isIOS && !hasRecentInteraction()) {
        await unlockAudio();
      }

      // Initialize audio context
      await initAudioContext();

      // Try to play
      await audio.play();
      playAttemptRef.current = 0;
      onPlay?.();

    } catch (error) {
      console.warn('Safari play failed:', error);

      // Retry logic for autoplay blocks
      if (error.name === 'NotAllowedError' && playAttemptRef.current < maxPlayAttempts) {
        playAttemptRef.current++;
        
        // Wait for interaction and try again
        const cleanup = () => {
          document.removeEventListener('touchend', retry);
          document.removeEventListener('click', retry);
        };

        const retry = async () => {
          cleanup();
          await handlePlay();
        };

        document.addEventListener('touchend', retry, { once: true });
        document.addEventListener('click', retry, { once: true });
      }
    }
  }, [initAudioContext, updateInteraction, hasRecentInteraction, unlockAudio, isIOS, onPlay]);

  /**
   * Handle pause
   */
  const handlePause = useCallback(() => {
    const audio = playerRef.current?.audio?.current;
    if (!audio) return;

    try {
      audio.pause();
      onPause?.();
    } catch (error) {
      console.warn('Safari pause failed:', error);
    }
  }, [onPause]);

  /**
   * Handle errors with better reporting
   */
  const handleError = useCallback((e) => {
    const audio = e.target;
    const error = audio?.error;

    // Enhanced error info for debugging
    const errorInfo = {
      code: error?.code,
      message: error?.message,
      name: error?.name,
      readyState: audio?.readyState,
      networkState: audio?.networkState,
      src: audio?.src,
      currentTime: audio?.currentTime,
      paused: audio?.paused,
      ended: audio?.ended,
      seeking: audio?.seeking,
      duration: audio?.duration,
      playbackRate: audio?.playbackRate,
      defaultPlaybackRate: audio?.defaultPlaybackRate,
      played: audio?.played?.length,
      buffered: audio?.buffered?.length,
      volume: audio?.volume,
      muted: audio?.muted
    };

    console.error('Safari audio error:', errorInfo);
    onError?.(error, errorInfo);
  }, [onError]);

  // Update play state
  useEffect(() => {
    if (isPlaying) {
      handlePlay();
    } else {
      handlePause();
    }
  }, [isPlaying, handlePlay, handlePause]);

  // Update volume
  useEffect(() => {
    const audio = playerRef.current?.audio?.current;
    if (audio) {
      audio.volume = volume;
    }
  }, [volume]);

  // Initial setup
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