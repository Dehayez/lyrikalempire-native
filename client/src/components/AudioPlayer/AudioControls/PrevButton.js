import React, { useState, useEffect, useCallback } from 'react';
import { IoPlaySkipBackSharp } from "react-icons/io5";
import IconButton from '../../Buttons/IconButton';
import './PrevButton.scss';

const PrevButton = ({ onPrev, iconSize = 24 }) => {
  const [isPrevActive, setIsPrevActive] = useState(false);

  // Optimized click handler for Safari
  const handleClick = useCallback(() => {
    setIsPrevActive(true);
    onPrev();
    // Reduced timeout for faster visual feedback
    setTimeout(() => setIsPrevActive(false), 150);
  }, [onPrev]);

  useEffect(() => {
    const setMediaSession = () => {
      if ('mediaSession' in navigator) {
        navigator.mediaSession.setActionHandler('previoustrack', handleClick);
      }
    };

    const handleKeyDown = (event) => {
      if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA' || event.target.tagName === 'SELECT') {
        return;
      }

      if (event.code === 'MediaTrackPrevious') {
        handleClick();
      }
    };

    const handleKeyUp = (event) => {
      if (event.code === 'MediaTrackPrevious') {
        setIsPrevActive(false);
      }
    };

    // Optimized event listeners for Safari
    window.addEventListener('keydown', handleKeyDown, { passive: true });
    window.addEventListener('keyup', handleKeyUp, { passive: true });
    setMediaSession();

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      if ('mediaSession' in navigator) {
        navigator.mediaSession.setActionHandler('previoustrack', null);
      }
    };
  }, [handleClick]);

  return (
    <IconButton
      className={`icon-button--prev ${isPrevActive ? 'active' : ''}`}
      onMouseDown={() => setIsPrevActive(true)}
      onMouseUp={() => setIsPrevActive(false)}
      onMouseLeave={() => setIsPrevActive(false)}
      onClick={handleClick}
      ariaLabel={'Previous Track'}
      text="Prev"
    >
      <IoPlaySkipBackSharp size={iconSize} />
    </IconButton>
  );
};

export default PrevButton;