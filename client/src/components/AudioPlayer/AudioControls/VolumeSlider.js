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
  const initialSetupDone = useRef(false);

  // Update refs when props change
  useEffect(() => {
    volumeRef.current = volume;
    handleVolumeChangeRef.current = handleVolumeChange;
  }, [volume, handleVolumeChange]);

  const calculateVolume = useCallback((event) => {
    const rect = sliderRef.current.getBoundingClientRect();
    const newVolume = clamp((event.clientX - rect.left) / rect.width, 0, 1);
    
    // Only update if volume actually changed by more than 1%
    if (Math.abs(newVolume - volumeRef.current) > 0.01) {
      handleVolumeChangeRef.current({ target: { value: newVolume } });
      setIsMuted(newVolume === 0);
      localStorage.setItem('isMuted', JSON.stringify(newVolume === 0));
      localStorage.setItem('prevVolume', newVolume.toString());
    }
  }, []);

  const toggleMute = useCallback(() => {
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
  }, [isMuted, prevVolume]);

  const handleMouseMove = useCallback((event) => {
    if (isDragging) calculateVolume(event);
  }, [isDragging, calculateVolume]);

  useEffect(() => {
    const handleMouseUp = () => setIsDragging(false);
    document.addEventListener('mouseup', handleMouseUp);
    document.addEventListener('mousemove', handleMouseMove);
    return () => {
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('mousemove', handleMouseMove);
    };
  }, [isDragging, handleMouseMove]);

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

  const volumeIcon = volume > 0.66 ? <IoVolumeHighSharp size={24} />
    : volume > 0.33 ? <IoVolumeMediumSharp size={24} />
    : volume > 0 ? <IoVolumeLowSharp size={24} />
    : <IoVolumeMuteSharp size={24} />;

  return (
    <div className='volume-slider'>
      <IconButton
        className='volume-slider__icon'
        onClick={toggleMute}
        text={isMuted ? 'Unmute' : 'Mute'}
        tooltipPosition="top"
        ariaLabel={isMuted ? 'Unmute' : 'Mute'}
      >
        {volumeIcon}
      </IconButton>
      <div
        className={`volume-slider__track ${isHovering || isDragging ? 'hover' : ''}`}
        ref={sliderRef}
        onMouseDown={() => setIsDragging(true)}
        onMouseEnter={() => setIsHovering(true)}
        onMouseLeave={() => setIsHovering(false)}
      >
        <div
          className='volume-slider__progress'
          style={{ width: `${volume * 100}%` }}
        />
        <div
          className='volume-slider__thumb'
          style={{ left: `${volume * 100}%` }}
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