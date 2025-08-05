import React, { useState, useEffect, useCallback } from 'react';
import { IoPlaySkipForwardSharp } from "react-icons/io5";
import IconButton from '../../Buttons/IconButton';
import './NextButton.scss';

const NextButton = ({ onNext, iconSize = 24 }) => {
  const [isNextActive, setIsNextActive] = useState(false);

  // Optimized click handler for Safari
  const handleClick = useCallback(() => {
    setIsNextActive(true);
    onNext();
    // Reduced timeout for faster visual feedback
    setTimeout(() => setIsNextActive(false), 150);
  }, [onNext]);

  useEffect(() => {
    const setMediaSession = () => {
      if ('mediaSession' in navigator) {
        navigator.mediaSession.setActionHandler('nexttrack', handleClick);
      }
    };

    const handleKeyDown = (event) => {
      if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA' || event.target.tagName === 'SELECT') {
        return;
      }

      if (event.code === 'MediaTrackNext') {
        handleClick();
      }
    };

    const handleKeyUp = (event) => {
      if (event.code === 'MediaTrackNext') {
        setIsNextActive(false);
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
        navigator.mediaSession.setActionHandler('nexttrack', null);
      }
    };
  }, [handleClick]);

  return (
    <IconButton
      className={`icon-button--next ${isNextActive ? 'active' : ''}`}
      onMouseDown={() => setIsNextActive(true)}
      onMouseUp={() => setIsNextActive(false)}
      onMouseLeave={() => setIsNextActive(false)}
      onClick={handleClick}
      ariaLabel={'Next Track'}
      text="Next"
    >
      <IoPlaySkipForwardSharp size={iconSize} />
    </IconButton>
  );
};

export default NextButton;