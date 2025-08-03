import React, { useCallback, useEffect } from 'react';
import H5AudioPlayer from 'react-h5-audio-player';
import { useAudioState } from '../../hooks/audioPlayer/useAudioState';

/**
 * Core audio player component that handles the actual audio playback
 * Separates audio logic from UI components
 */
const AudioCore = ({
  currentBeat,
  onPlay,
  onPause,
  onEnded,
  onTimeUpdate,
  onDurationChange,
  onError
}) => {
  const {
    audioSrc,
    isPlaying,
    setIsPlaying,
    volume,
    setVolume,
    currentTime,
    setCurrentTime,
    duration,
    setDuration,
    progress,
    setProgress,
    isLoading,
    error,
    playerRef,
    handleReady,
    handleError
  } = useAudioState(currentBeat);

  // Handle play/pause
  const handlePlay = useCallback(() => {
    setIsPlaying(true);
    onPlay?.();
  }, [setIsPlaying, onPlay]);

  const handlePause = useCallback(() => {
    setIsPlaying(false);
    onPause?.();
  }, [setIsPlaying, onPause]);

  // Handle time updates
  const handleTimeUpdate = useCallback((e) => {
    const time = e.target.currentTime;
    setCurrentTime(time);
    setProgress((time / duration) * 100);
    onTimeUpdate?.(time);
  }, [duration, setCurrentTime, setProgress, onTimeUpdate]);

  // Handle duration change
  const handleDurationChange = useCallback((e) => {
    const newDuration = e.target.duration;
    setDuration(newDuration);
    onDurationChange?.(newDuration);
  }, [setDuration, onDurationChange]);

  // Handle errors
  const handleAudioError = useCallback((e) => {
    handleError(e.target.error);
    onError?.(e.target.error);
  }, [handleError, onError]);

  // Update volume when changed externally
  useEffect(() => {
    if (playerRef.current?.audio?.current) {
      playerRef.current.audio.current.volume = volume;
    }
  }, [volume, playerRef]);

  // Update playback state when changed externally
  useEffect(() => {
    const audio = playerRef.current?.audio?.current;
    if (!audio) return;

    if (isPlaying && audio.paused) {
      audio.play().catch(() => setIsPlaying(false));
    } else if (!isPlaying && !audio.paused) {
      audio.pause();
    }
  }, [isPlaying, playerRef, setIsPlaying]);

  return (
    <H5AudioPlayer
      ref={playerRef}
      src={audioSrc}
      autoPlay={false}
      volume={volume}
      onPlay={handlePlay}
      onPause={handlePause}
      onEnded={onEnded}
      onTimeUpdate={handleTimeUpdate}
      onDurationChange={handleDurationChange}
      onError={handleAudioError}
      onCanPlay={handleReady}
      showJumpControls={false}
      customProgressBarSection={[]}
      customControlsSection={[]}
      style={{ display: 'none' }}
      className="audio-core"
    />
  );
};

export default React.memo(AudioCore);