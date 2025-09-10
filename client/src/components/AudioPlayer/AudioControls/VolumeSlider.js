import React, { useRef, useEffect, useState, useCallback } from 'react';
import { IoVolumeMuteSharp, IoVolumeMediumSharp, IoVolumeHighSharp, IoVolumeLowSharp } from "react-icons/io5";
import IconButton from '../../Buttons/IconButton';
import './VolumeSlider.scss';

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

const VolumeSlider = ({ volume, handleVolumeChange }) => {
  const sliderRef = useRef();
  const volumeRef = useRef(volume);
  const handleVolumeChangeRef = useRef(handleVolumeChange);
  const [isDragging, setIsDragging] = useState(false);
  const [isHovering, setIsHovering] = useState(false);
  const [isMuted, setIsMuted] = useState(() => JSON.parse(localStorage.getItem('isMuted')) || false);
  const [prevVolume, setPrevVolume] = useState(() => parseFloat(localStorage.getItem('prevVolume')) || volume);
  const [localVolume, setLocalVolume] = useState(volume);
  const initialSetupDone = useRef(false);
  
  // Check if device is mobile
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

  // Update refs when props change
  useEffect(() => {
    volumeRef.current = volume;
    handleVolumeChangeRef.current = handleVolumeChange;
    // Update local volume when not dragging to sync with external changes
    if (!isDragging) {
      setLocalVolume(volume);
    }
  }, [volume, handleVolumeChange, isDragging]);

  const calculateVolume = useCallback((event) => {
    // Prevent volume changes on mobile devices
    if (isMobile) return;
    
    const rect = sliderRef.current.getBoundingClientRect();
    const newVolume = clamp((event.clientX - rect.left) / rect.width, 0, 1);
    
    // Always update local volume for smooth UI updates
    setLocalVolume(newVolume);
    
    // Only update parent if volume actually changed by more than 1%
    if (Math.abs(newVolume - volumeRef.current) > 0.01) {
      handleVolumeChangeRef.current({ target: { value: newVolume } });
      setIsMuted(newVolume === 0);
      localStorage.setItem('isMuted', JSON.stringify(newVolume === 0));
      localStorage.setItem('prevVolume', newVolume.toString());
    }
  }, [isMobile]);

  const toggleMute = useCallback(() => {
    // Prevent muting on mobile devices
    if (isMobile) return;
    
    if (isMuted) {
      const volumeToRestore = prevVolume === 0 ? 1 : prevVolume;
      handleVolumeChangeRef.current({ target: { value: volumeToRestore } });
      setIsMuted(false);
      localStorage.setItem('isMuted', JSON.stringify(false));
    } else {
      setPrevVolume(volumeRef.current);
      handleVolumeChangeRef.current({ target: { value: 0 } });
      setIsMuted(true);
      localStorage.setItem('isMuted', JSON.stringify(true));
      localStorage.setItem('prevVolume', volumeRef.current.toString());
    }
  }, [isMuted, prevVolume, isMobile]);

  const handleMouseMove = useCallback((event) => {
    if (isDragging) calculateVolume(event);
  }, [isDragging, calculateVolume]);

  const handleMouseUp = useCallback(() => {
    if (isDragging) {
      setIsDragging(false);
      // Sync local volume with actual volume when drag ends
      setLocalVolume(volumeRef.current);
    }
  }, [isDragging]);

  useEffect(() => {
    document.addEventListener('mouseup', handleMouseUp);
    document.addEventListener('mousemove', handleMouseMove);
    return () => {
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('mousemove', handleMouseMove);
    };
  }, [handleMouseUp, handleMouseMove]);

  useEffect(() => {
    // Restore volume and mute state on component mount - only once
    if (!initialSetupDone.current) {
      const savedIsMuted = JSON.parse(localStorage.getItem('isMuted'));
      const savedPrevVolume = parseFloat(localStorage.getItem('prevVolume'));
      
      if (savedIsMuted) {
        setIsMuted(true);
        // Use setTimeout to avoid triggering during render
        setTimeout(() => {
          handleVolumeChangeRef.current({ target: { value: 0 } });
        }, 0);
      } else if (!isNaN(savedPrevVolume)) {
        setTimeout(() => {
          handleVolumeChangeRef.current({ target: { value: savedPrevVolume } });
        }, 0);
      }
      
      initialSetupDone.current = true;
    }
  }, []); // Empty dependency array = only run once on mount

  // Use localVolume for icon display to show smooth updates during drag
  const displayVolume = isDragging ? localVolume : volume;
  const volumeIcon = displayVolume > 0.66 ? <IoVolumeHighSharp size={24} />
    : displayVolume > 0.33 ? <IoVolumeMediumSharp size={24} />
    : displayVolume > 0 ? <IoVolumeLowSharp size={24} />
    : <IoVolumeMuteSharp size={24} />;

  return (
    <div className={`volume-slider ${isMobile ? 'volume-slider--mobile-disabled' : ''}`}>
      <IconButton
        className='volume-slider__icon'
        onClick={toggleMute}
        text={isMobile ? 'Volume fixed at maximum' : (isMuted ? 'Unmute' : 'Mute')}
        tooltipPosition="top"
        ariaLabel={isMobile ? 'Volume fixed at maximum' : (isMuted ? 'Unmute' : 'Mute')}
      >
        {volumeIcon}
      </IconButton>
      <div
        className={`volume-slider__track ${isHovering || isDragging ? 'hover' : ''} ${isMobile ? 'disabled' : ''}`}
        ref={sliderRef}
        onMouseDown={isMobile ? undefined : () => setIsDragging(true)}
        onMouseEnter={isMobile ? undefined : () => setIsHovering(true)}
        onMouseLeave={isMobile ? undefined : () => setIsHovering(false)}
      >
        <div
          className='volume-slider__progress'
          style={{ width: `${displayVolume * 100}%` }}
        />
        <div
          className='volume-slider__thumb'
          style={{ left: `${displayVolume * 100}%` }}
        />
        <div
          className='volume-slider__click-capture'
          onClick={calculateVolume}
        />
      </div>
    </div>
  );
};

export default VolumeSlider;