import { useState, useEffect, useCallback, useRef } from 'react';
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

  // Enable live progress bar updates during dragging
  useEffect(() => {
    // Find all progress containers
    const progressContainers = document.querySelectorAll('.rhap_progress-container');
    
    if (!progressContainers.length) return;
    
    // Function to handle progress bar drag start
    const handleProgressMouseDown = (e) => {
      // Add dragging class for styling
      e.currentTarget.classList.add('rhap_progress-dragging');
      
      // Calculate initial position
      const rect = e.currentTarget.getBoundingClientRect();
      const relativePos = (e.clientX - rect.left) / rect.width;
      const duration = audioCore.getDuration();
      const newTime = relativePos * duration;
      
      // Update UI immediately for responsive feel
      updateProgressUI(e.currentTarget, relativePos);
      
      // Function to handle mouse move during drag
      const handleProgressMouseMove = (moveEvent) => {
        const newRect = e.currentTarget.getBoundingClientRect();
        const newRelativePos = Math.max(0, Math.min(1, (moveEvent.clientX - newRect.left) / newRect.width));
        const newDragTime = newRelativePos * duration;
        
        // Update UI without changing actual playback position yet
        updateProgressUI(e.currentTarget, newRelativePos);
        
        moveEvent.preventDefault();
        moveEvent.stopPropagation();
      };
      
      // Function to handle mouse up at end of drag
      const handleProgressMouseUp = (upEvent) => {
        // Remove dragging class
        e.currentTarget.classList.remove('rhap_progress-dragging');
        
        // Calculate final position
        const finalRect = e.currentTarget.getBoundingClientRect();
        const finalRelativePos = Math.max(0, Math.min(1, (upEvent.clientX - finalRect.left) / finalRect.width));
        const finalTime = finalRelativePos * duration;
        
        // Set the actual playback position
        audioCore.setCurrentTime(finalTime);
        updateCurrentTime(finalTime);
        
        // Clean up event listeners
        document.removeEventListener('mousemove', handleProgressMouseMove);
        document.removeEventListener('mouseup', handleProgressMouseUp);
        
        upEvent.preventDefault();
        upEvent.stopPropagation();
      };
      
      // Add event listeners for dragging
      document.addEventListener('mousemove', handleProgressMouseMove);
      document.addEventListener('mouseup', handleProgressMouseUp);
      
      e.preventDefault();
      e.stopPropagation();
    };
    
    // Function to handle touch start on progress bar
    const handleProgressTouchStart = (e) => {
      // Add dragging class for styling
      e.currentTarget.classList.add('rhap_progress-dragging');
      
      // Calculate initial position
      const rect = e.currentTarget.getBoundingClientRect();
      const touch = e.touches[0];
      const relativePos = (touch.clientX - rect.left) / rect.width;
      const duration = audioCore.getDuration();
      const newTime = relativePos * duration;
      
      // Update UI immediately for responsive feel
      updateProgressUI(e.currentTarget, relativePos);
      
      // Function to handle touch move during drag
      const handleProgressTouchMove = (moveEvent) => {
        const newRect = e.currentTarget.getBoundingClientRect();
        const touch = moveEvent.touches[0];
        const newRelativePos = Math.max(0, Math.min(1, (touch.clientX - newRect.left) / newRect.width));
        const newDragTime = newRelativePos * duration;
        
        // Update UI without changing actual playback position yet
        updateProgressUI(e.currentTarget, newRelativePos);
        
        moveEvent.preventDefault();
        moveEvent.stopPropagation();
      };
      
      // Function to handle touch end at end of drag
      const handleProgressTouchEnd = (endEvent) => {
        // Remove dragging class
        e.currentTarget.classList.remove('rhap_progress-dragging');
        
        // Calculate final position
        const finalRect = e.currentTarget.getBoundingClientRect();
        const touch = endEvent.changedTouches[0];
        const finalRelativePos = Math.max(0, Math.min(1, (touch.clientX - finalRect.left) / finalRect.width));
        const finalTime = finalRelativePos * duration;
        
        // Set the actual playback position
        audioCore.setCurrentTime(finalTime);
        updateCurrentTime(finalTime);
        
        // Clean up event listeners
        document.removeEventListener('touchmove', handleProgressTouchMove);
        document.removeEventListener('touchend', handleProgressTouchEnd);
        
        endEvent.preventDefault();
        endEvent.stopPropagation();
      };
      
      // Add event listeners for dragging
      document.addEventListener('touchmove', handleProgressTouchMove, { passive: false });
      document.addEventListener('touchend', handleProgressTouchEnd, { passive: false });
      
      e.preventDefault();
      e.stopPropagation();
    };
    
    // Helper function to update progress UI elements
    const updateProgressUI = (container, progressPercent) => {
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
        const duration = audioCore.getDuration();
        const newTime = progressPercent * duration;
        const minutes = Math.floor(newTime / 60);
        const seconds = Math.floor(newTime % 60);
        currentTimeEl.textContent = `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
      }
    };
    
    // Add event listeners to all progress containers
    progressContainers.forEach(container => {
      // Remove existing listeners first to avoid duplicates
      container.removeEventListener('mousedown', handleProgressMouseDown);
      container.removeEventListener('touchstart', handleProgressTouchStart);
      
      // Add new listeners
      container.addEventListener('mousedown', handleProgressMouseDown);
      container.addEventListener('touchstart', handleProgressTouchStart, { passive: false });
    });
    
    // Clean up on unmount
    return () => {
      progressContainers.forEach(container => {
        container.removeEventListener('mousedown', handleProgressMouseDown);
        container.removeEventListener('touchstart', handleProgressTouchStart);
      });
    };
  }, [audioCore, updateCurrentTime]);

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