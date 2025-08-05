import React, { useState, useEffect, useCallback } from 'react';
import { IoPlaySharp, IoPauseSharp } from "react-icons/io5";
import IconButton from '../../Buttons/IconButton';
import './PlayPauseButton.scss';

const PlayPauseButton = ({ isPlaying, setIsPlaying, className, iconSize = 24 }) => {
  const [animatePlayPause, setAnimatePlayPause] = useState(false);

  // Optimized toggle function for Safari
  const togglePlayPause = useCallback(() => {
    const newPlayState = !isPlaying;
    setIsPlaying(newPlayState);
    setAnimatePlayPause(true);
    // Reduced timeout for faster visual feedback
    setTimeout(() => setAnimatePlayPause(false), 150);
  }, [isPlaying, setIsPlaying]);

  const handlePlayPauseClick = useCallback((e) => {
    togglePlayPause();
    e.stopPropagation();
  }, [togglePlayPause]);

  useEffect(() => {
    const setMediaSession = () => {
      if ('mediaSession' in navigator) {
        navigator.mediaSession.setActionHandler('play', () => {
          if (!isPlaying) togglePlayPause();
        });
        navigator.mediaSession.setActionHandler('pause', () => {
          if (isPlaying) togglePlayPause();
        });
      }
    };

    const handleKeyDown = (event) => {
      if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA' || event.target.tagName === 'SELECT') {
        return;
      }

      if (event.key === ' ' || event.code === 'MediaPlayPause') {
        event.preventDefault();
        togglePlayPause();
      }
    };

    // Optimized event listeners for Safari
    window.addEventListener('keydown', handleKeyDown, { passive: false });
    setMediaSession();

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      if ('mediaSession' in navigator) {
        navigator.mediaSession.setActionHandler('play', null);
        navigator.mediaSession.setActionHandler('pause', null);
      }
    };
  }, [isPlaying, togglePlayPause]);

  return (
    <IconButton
      className={`play-pause ${animatePlayPause ? 'animate-scale' : ''} ${className}`}
      onMouseDown={() => setAnimatePlayPause(true)}
      onMouseUp={() => setAnimatePlayPause(false)}
      onMouseLeave={() => setAnimatePlayPause(false)}
      onClick={handlePlayPauseClick}
      text={isPlaying ? 'Pause' : 'Play'}
      ariaLabel={isPlaying ? 'Pause' : 'Play'}
    >
      {isPlaying ? <IoPauseSharp size={iconSize} /> : <IoPlaySharp size={iconSize} className="play-icon" />}
    </IconButton>
  );
};

export default PlayPauseButton;