import { useState, useEffect, useCallback } from 'react';
import { useLocalStorageSync } from './useLocalStorageSync';

export const useAudioInteractions = ({ 
  onNext, 
  onPrev, 
  currentBeat, 
  shuffle, 
  repeat,
  audioCore 
}) => {
  // User interaction state
  const [volume, setVolume] = useState(() => parseFloat(localStorage.getItem('volume')) || 1.0);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [dragPosition, setDragPosition] = useState(0);
  const [currentTime, setCurrentTime] = useState(() => parseFloat(localStorage.getItem('currentTime')) || 0);

  // Sync with localStorage
  useLocalStorageSync({ shuffle, repeat, currentBeat, volume, currentTime });

  // Volume control
  const handleVolumeChange = useCallback((e) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
    audioCore.setVolume(newVolume);
    localStorage.setItem('volume', newVolume.toString());
  }, [audioCore]);

  // Touch gesture handling
  const handleTouchStart = useCallback((e) => {
    const touch = e.touches[0];
    setStartX(touch.clientX);
    setIsDragging(true);
  }, []);

  const handleTouchEnd = useCallback((e) => {
    const endX = e.changedTouches[0].clientX;
    setIsDragging(false);
    setDragPosition(0);
    
    const swipeDistance = startX - endX;
    if (swipeDistance > 50) {
      onNext?.();
    } else if (swipeDistance < -50) {
      onPrev?.();
    }
  }, [startX, onNext, onPrev]);

  const handleTouchMove = useCallback((e) => {
    if (!isDragging) return;
    const touch = e.touches[0];
    setDragPosition(touch.clientX - startX);
  }, [isDragging, startX]);

  // Previous/Next with smart behavior
  const handlePrevClick = useCallback(() => {
    if (audioCore.getCurrentTime() > 3) {
      // If more than 3 seconds in, restart current track
      audioCore.setCurrentTime(0);
    } else {
      // Otherwise go to previous track
      onPrev?.();
    }
  }, [audioCore, onPrev]);

  // Time tracking
  const updateCurrentTime = useCallback((time) => {
    setCurrentTime(time);
    localStorage.setItem('currentTime', time.toString());
  }, []);

  // Set up touch event prevention for smooth gestures
  useEffect(() => {
    const element = document.querySelector('.rhap_container');
    if (!element) return;

    const onTouchMove = (e) => {
      handleTouchMove(e);
      e.preventDefault();
    };

    element.addEventListener('touchmove', onTouchMove, { passive: false });

    return () => {
      element.removeEventListener('touchmove', onTouchMove);
    };
  }, [handleTouchMove]);

  // Apply volume to audio element when it changes (with delay to prevent race conditions)
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (audioCore.isReady()) {
        audioCore.setVolume(volume);
      }
    }, 50);

    return () => clearTimeout(timeoutId);
  }, [volume, audioCore]);

  // Remove focus from progress containers (accessibility fix)
  useEffect(() => {
    const rhapContainer = document.querySelector('.rhap_container');
    const rhapProgressContainer = document.querySelector('.rhap_progress-container');
    if (rhapContainer) rhapContainer.tabIndex = -1;
    if (rhapProgressContainer) rhapProgressContainer.tabIndex = -1;
  }, []);

  return {
    // State
    volume,
    isDragging,
    dragPosition,
    currentTime,
    
    // Handlers
    handleVolumeChange,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
    handlePrevClick,
    updateCurrentTime,
    
    // Utilities
    setVolume,
    setCurrentTimeState: setCurrentTime
  };
}; 