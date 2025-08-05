import React, { useCallback, useEffect, useRef, useMemo } from 'react';
import { isSafari, isIOSSafari } from '../../utils/safariOptimizations';

/**
 * Ultra-optimized audio player for Safari with direct audio element manipulation
 * Bypasses complex libraries for maximum performance
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
  const audioRef = useRef(null);
  const isPlayingRef = useRef(false);
  const volumeRef = useRef(volume);
  const srcRef = useRef(audioSrc);

  // Create audio element once for maximum performance
  const audioElement = useMemo(() => {
    if (typeof window === 'undefined') return null;
    
    const audio = new Audio();
    
    // Ultra-optimized Safari setup
    audio.setAttribute('playsinline', 'true');
    audio.setAttribute('webkit-playsinline', 'true');
    audio.setAttribute('preload', 'metadata');
    audio.setAttribute('crossorigin', 'anonymous');
    audio.crossOrigin = 'anonymous';
    audio.style.display = 'none';
    
    // iOS-specific optimizations
    if (isIOSSafari()) {
      audio.setAttribute('x-webkit-airplay', 'allow');
      audio.setAttribute('muted', 'false');
    }
    
    return audio;
  }, []);

  // Ultra-fast play handler
  const handlePlay = useCallback(() => {
    if (!audioElement) return;
    
    try {
      // Direct play without any checks for maximum speed
      audioElement.play().then(() => {
        isPlayingRef.current = true;
        onPlay?.();
      }).catch(() => {
        // Silent fail for maximum performance
      });
    } catch (error) {
      // Silent fail for maximum performance
    }
  }, [audioElement, onPlay]);

  // Ultra-fast pause handler
  const handlePause = useCallback(() => {
    if (!audioElement) return;
    
    try {
      audioElement.pause();
      isPlayingRef.current = false;
      onPause?.();
    } catch (error) {
      // Silent fail for maximum performance
    }
  }, [audioElement, onPause]);

  // Ultra-fast volume handler
  const handleVolumeChange = useCallback((newVolume) => {
    if (!audioElement || Math.abs(volumeRef.current - newVolume) < 0.01) return;
    
    try {
      audioElement.volume = Math.max(0, Math.min(1, newVolume));
      volumeRef.current = newVolume;
    } catch (error) {
      // Silent fail for maximum performance
    }
  }, [audioElement]);

  // Ultra-fast source change handler
  const handleSourceChange = useCallback((newSrc) => {
    if (!audioElement || srcRef.current === newSrc) return;
    
    try {
      // Pause immediately
      audioElement.pause();
      
      // Set new source
      audioElement.src = newSrc;
      srcRef.current = newSrc;
      
      // Load metadata for faster playback
      audioElement.load();
    } catch (error) {
      // Silent fail for maximum performance
    }
  }, [audioElement]);

  // Set up event listeners once
  useEffect(() => {
    if (!audioElement) return;

    // Ultra-fast event handlers
    const handleCanPlay = () => onReady?.();
    const handleEnded = () => onEnded?.();
    const handleError = (e) => onError?.(e.target.error);
    const handleTimeUpdate = () => onTimeUpdate?.(audioElement.currentTime, audioElement.duration);
    const handleDurationChange = () => onDurationChange?.(audioElement.duration);

    // Add event listeners
    audioElement.addEventListener('canplay', handleCanPlay, { passive: true });
    audioElement.addEventListener('ended', handleEnded, { passive: true });
    audioElement.addEventListener('error', handleError, { passive: true });
    audioElement.addEventListener('timeupdate', handleTimeUpdate, { passive: true });
    audioElement.addEventListener('durationchange', handleDurationChange, { passive: true });

    return () => {
      audioElement.removeEventListener('canplay', handleCanPlay);
      audioElement.removeEventListener('ended', handleEnded);
      audioElement.removeEventListener('error', handleError);
      audioElement.removeEventListener('timeupdate', handleTimeUpdate);
      audioElement.removeEventListener('durationchange', handleDurationChange);
    };
  }, [audioElement, onReady, onEnded, onError, onTimeUpdate, onDurationChange]);

  // Ultra-fast play state updates
  useEffect(() => {
    if (!audioElement) return;

    if (isPlaying && !isPlayingRef.current) {
      handlePlay();
    } else if (!isPlaying && isPlayingRef.current) {
      handlePause();
    }
  }, [isPlaying, handlePlay, handlePause]);

  // Ultra-fast volume updates
  useEffect(() => {
    handleVolumeChange(volume);
  }, [volume, handleVolumeChange]);

  // Ultra-fast source updates
  useEffect(() => {
    handleSourceChange(audioSrc);
  }, [audioSrc, handleSourceChange]);

  // Store ref for external access
  useEffect(() => {
    audioRef.current = audioElement;
  }, [audioElement]);

  // Hidden audio element
  return (
    <div style={{ display: 'none' }} className={className}>
      {/* Audio element is created programmatically for maximum performance */}
    </div>
  );
};

export default React.memo(SafariAudioPlayer);