import React, { useCallback, useMemo, useRef, memo } from 'react';
import { useAudioState2 } from '../../hooks/audioPlayer/useAudioState2';
import { useSafariAudio } from '../../hooks/audioPlayer/useSafariAudio';
import { audioErrorRecovery } from '../../services/audioErrorRecovery';
import { LoadingIndicator } from './LoadingIndicator';
import { AudioErrorBoundary } from './AudioErrorBoundary';
import './OptimizedAudioPlayer.scss';

/**
 * Performance-optimized audio player component
 * Uses React.memo and useMemo for optimal rendering
 */
const OptimizedAudioPlayer = memo(({
  currentBeat,
  playlist,
  isPlaying,
  onPlayingChange,
  onNext,
  onPrev,
  volume = 1,
  onVolumeChange,
  onError,
  className
}) => {
  // Refs for event handling
  const progressUpdateRef = useRef(null);
  const volumeUpdateRef = useRef(null);
  const errorRecoveryRef = useRef(null);

  // Memoize beat info to prevent unnecessary re-renders
  const beatInfo = useMemo(() => ({
    id: currentBeat?.id,
    title: currentBeat?.title,
    artist: currentBeat?.artist,
    duration: currentBeat?.duration
  }), [currentBeat]);

  // Audio state management with gapless playback
  const {
    audioSrc,
    isLoading,
    loadingProgress,
    loadingPhase,
    error,
    playerRef,
    handleReady,
    handleError: handleAudioError,
    handleTimeUpdate,
    preloadNextTrack
  } = useAudioState2({
    currentBeat,
    playlist,
    onLoadingProgress: (phase, progress) => {
      // Batch loading updates to reduce renders
      if (progressUpdateRef.current) {
        cancelAnimationFrame(progressUpdateRef.current);
      }
      progressUpdateRef.current = requestAnimationFrame(() => {
        // Update loading UI
      });
    },
    onError: (error) => {
      onError?.(error);
    }
  });

  // Safari-specific handling
  const safariAudio = useSafariAudio(playerRef);

  // Memoized event handlers
  const handlePlay = useCallback(() => {
    onPlayingChange?.(true);
  }, [onPlayingChange]);

  const handlePause = useCallback(() => {
    onPlayingChange?.(false);
  }, [onPlayingChange]);

  const handleVolumeChange = useCallback((newVolume) => {
    // Debounce volume updates
    if (volumeUpdateRef.current) {
      clearTimeout(volumeUpdateRef.current);
    }
    volumeUpdateRef.current = setTimeout(() => {
      onVolumeChange?.(newVolume);
    }, 100);
  }, [onVolumeChange]);

  const handleErrorWithRecovery = useCallback(async (error) => {
    // Cancel any pending error recovery
    if (errorRecoveryRef.current) {
      clearTimeout(errorRecoveryRef.current);
    }

    // Attempt recovery
    const recovery = await audioErrorRecovery.handleError(error, currentBeat, {
      isPlaying,
      volume,
      loadingPhase
    });

    if (recovery.success) {
      switch (recovery.strategy) {
        case 'skip':
          onNext?.();
          break;
        case 'retry':
          errorRecoveryRef.current = setTimeout(() => {
            handleReady();
          }, recovery.retryDelay);
          break;
        // ... handle other strategies
      }
    }

    onError?.(error, recovery);
  }, [currentBeat, isPlaying, volume, loadingPhase, handleReady, onNext, onError]);

  // Memoize player controls UI
  const PlayerControls = useMemo(() => (
    <div className="optimized-player__controls">
      {/* Play/Pause */}
      <button
        className="optimized-player__button"
        onClick={() => onPlayingChange?.(!isPlaying)}
        aria-label={isPlaying ? 'Pause' : 'Play'}
      >
        {isPlaying ? 'Pause' : 'Play'}
      </button>

      {/* Previous */}
      <button
        className="optimized-player__button"
        onClick={onPrev}
        aria-label="Previous"
      >
        Previous
      </button>

      {/* Next */}
      <button
        className="optimized-player__button"
        onClick={onNext}
        aria-label="Next"
      >
        Next
      </button>

      {/* Volume */}
      <input
        type="range"
        min="0"
        max="1"
        step="0.01"
        value={volume}
        onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
        className="optimized-player__volume"
        aria-label="Volume"
      />
    </div>
  ), [isPlaying, volume, onPlayingChange, onPrev, onNext, handleVolumeChange]);

  // Memoize loading indicator
  const LoadingUI = useMemo(() => (
    isLoading && (
      <div className="optimized-player__loading">
        <LoadingIndicator
          progress={loadingProgress}
          phase={loadingPhase}
          size="medium"
          showText
        />
      </div>
    )
  ), [isLoading, loadingProgress, loadingPhase]);

  // Cleanup on unmount
  React.useEffect(() => {
    return () => {
      if (progressUpdateRef.current) {
        cancelAnimationFrame(progressUpdateRef.current);
      }
      if (volumeUpdateRef.current) {
        clearTimeout(volumeUpdateRef.current);
      }
      if (errorRecoveryRef.current) {
        clearTimeout(errorRecoveryRef.current);
      }
    };
  }, []);

  return (
    <AudioErrorBoundary
      currentBeat={currentBeat}
      onRetry={handleReady}
      onNext={onNext}
    >
      <div className={`optimized-player ${className || ''}`}>
        {/* Beat info */}
        <div className="optimized-player__info">
          <h3 className="optimized-player__title">
            {beatInfo.title}
          </h3>
          <p className="optimized-player__artist">
            {beatInfo.artist}
          </p>
        </div>

        {/* Loading UI */}
        {LoadingUI}

        {/* Controls */}
        {PlayerControls}

        {/* Hidden audio element */}
        {safariAudio.isSafari ? (
          <SafariAudioPlayer
            ref={playerRef}
            src={audioSrc}
            isPlaying={isPlaying}
            volume={volume}
            onPlay={handlePlay}
            onPause={handlePause}
            onError={handleErrorWithRecovery}
            onReady={handleReady}
          />
        ) : (
          <audio
            ref={playerRef}
            src={audioSrc}
            onPlay={handlePlay}
            onPause={handlePause}
            onError={handleErrorWithRecovery}
            onCanPlay={handleReady}
            style={{ display: 'none' }}
          />
        )}
      </div>
    </AudioErrorBoundary>
  );
});

OptimizedAudioPlayer.displayName = 'OptimizedAudioPlayer';

export default OptimizedAudioPlayer;