import { useState, useEffect, useCallback, useRef } from 'react';
import { useLocalStorageSync } from '../useLocalStorageSync';

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
    localStorage.setItem('volume', newVolume.toString());
    audioCore.setVolume(newVolume);
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

  // Previous button with smart behavior
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

  // Progress bar interaction helpers
  const updateProgressUI = useCallback((container, progressPercent) => {
    const progressBar = container.querySelector('.rhap_progress-filled');
    const progressIndicator = container.querySelector('.rhap_progress-indicator');
    const currentTimeEl = container.closest('.rhap_container').querySelector('.rhap_current-time');
    
    if (progressBar) {
      progressBar.style.width = `${progressPercent * 100}%`;
    }
    
    if (progressIndicator) {
      progressIndicator.style.left = `${progressPercent * 100}%`;
    }
    
    if (currentTimeEl) {
      const duration = audioCore.getDuration(); // Now uses database duration
      const newTime = progressPercent * duration;
      const minutes = Math.floor(newTime / 60);
      const seconds = Math.floor(newTime % 60);
      currentTimeEl.textContent = `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
    }
    
    // Update waveform to show drag position - the normal sync is prevented during dragging
    // so there won't be a conflict between drag position and actual audio currentTime
    const wavesurferInstance = window.globalWavesurfer;
    if (wavesurferInstance && wavesurferInstance.getDuration) {
      try {
        wavesurferInstance.seekTo(progressPercent);
      } catch (error) {
        // Silently handle waveform errors
      }
    }
  }, [audioCore]);

  const createProgressHandler = useCallback((eventType) => {
    return (e) => {
      if (!e.currentTarget) return;
      
      // Store the target element reference to use in move/end handlers
      const targetElement = e.currentTarget;
      
      targetElement.classList.add('rhap_progress-dragging');
      
      const rect = targetElement.getBoundingClientRect();
      const clientX = eventType === 'mouse' ? e.clientX : e.touches[0].clientX;
      const relativePos = (clientX - rect.left) / rect.width;
              const duration = audioCore.getDuration(); // Now uses database duration
        
        updateProgressUI(targetElement, relativePos);
      
      const handleMove = (moveEvent) => {
        if (!targetElement) return;
        
        const newRect = targetElement.getBoundingClientRect();
        const newClientX = eventType === 'mouse' ? moveEvent.clientX : moveEvent.touches[0].clientX;
        const newRelativePos = Math.max(0, Math.min(1, (newClientX - newRect.left) / newRect.width));
        
        updateProgressUI(targetElement, newRelativePos);
        
        moveEvent.preventDefault();
        moveEvent.stopPropagation();
      };
      
      const handleEnd = (endEvent) => {
        if (!targetElement) return;
        
        targetElement.classList.remove('rhap_progress-dragging');
        
        const finalRect = targetElement.getBoundingClientRect();
        const finalClientX = eventType === 'mouse' ? endEvent.clientX : endEvent.changedTouches[0].clientX;
        const finalRelativePos = Math.max(0, Math.min(1, (finalClientX - finalRect.left) / finalRect.width));
        const finalTime = finalRelativePos * duration;
        
        audioCore.setCurrentTime(finalTime);
        updateCurrentTime(finalTime);
        
        const moveEventName = eventType === 'mouse' ? 'mousemove' : 'touchmove';
        const endEventName = eventType === 'mouse' ? 'mouseup' : 'touchend';
        
        document.removeEventListener(moveEventName, handleMove);
        document.removeEventListener(endEventName, handleEnd);
        
        endEvent.preventDefault();
        endEvent.stopPropagation();
      };
      
      const moveEventName = eventType === 'mouse' ? 'mousemove' : 'touchmove';
      const endEventName = eventType === 'mouse' ? 'mouseup' : 'touchend';
      const options = eventType === 'touch' ? { passive: false } : undefined;
      
      document.addEventListener(moveEventName, handleMove, options);
      document.addEventListener(endEventName, handleEnd, options);
      
      e.preventDefault();
      e.stopPropagation();
    };
  }, [audioCore, updateProgressUI, updateCurrentTime]);

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

  // Apply volume to audio element when it changes
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

  // Enable live progress bar updates during dragging
  useEffect(() => {
    const progressContainers = document.querySelectorAll('.rhap_progress-container');
    
    if (!progressContainers.length) return;
    
    const handleProgressMouseDown = createProgressHandler('mouse');
    const handleProgressTouchStart = createProgressHandler('touch');


    
    progressContainers.forEach(container => {
      // Remove existing listeners first to avoid duplicates
      container.removeEventListener('mousedown', handleProgressMouseDown);
      container.removeEventListener('touchstart', handleProgressTouchStart);
      
      // Add new listeners
      container.addEventListener('mousedown', handleProgressMouseDown);
      container.addEventListener('touchstart', handleProgressTouchStart, { passive: false });
    });
    
    return () => {
      progressContainers.forEach(container => {
        container.removeEventListener('mousedown', handleProgressMouseDown);
        container.removeEventListener('touchstart', handleProgressTouchStart);
      });
    };
  }, [createProgressHandler]);

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