import React, { useState, useEffect } from 'react';
import { IoPlaySkipForwardSharp } from "react-icons/io5";
import IconButton from '../../Buttons/IconButton';
import './NextButton.scss';

const NextButton = ({ onNext, iconSize = 24 }) => {
  const [isNextActive, setIsNextActive] = useState(false);

  useEffect(() => {
    const setMediaSession = () => {
      if ('mediaSession' in navigator) {
        navigator.mediaSession.setActionHandler('nexttrack', () => {
          setIsNextActive(true);
          onNext();
          setTimeout(() => setIsNextActive(false), 200);
        });
      }
    };

    const handleKeyDown = (event) => {
      if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA' || event.target.tagName === 'SELECT') {
        return;
      }

      if (event.code === 'MediaTrackNext') {
        setIsNextActive(true);
        onNext();
      }
    };

    const handleKeyUp = (event) => {
      if (event.code === 'MediaTrackNext') {
        setIsNextActive(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    setMediaSession();

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      if ('mediaSession' in navigator) {
        navigator.mediaSession.setActionHandler('nexttrack', null);
      }
    };
  }, [onNext]);

  return (
    <IconButton
      className={`icon-button--next ${isNextActive ? 'active' : ''}`}
      onMouseDown={() => setIsNextActive(true)}
      onMouseUp={() => setIsNextActive(false)}
      onMouseLeave={() => setIsNextActive(false)}
      onClick={onNext}
      ariaLabel={'Next Track'}
      text="Next"
    >
      <IoPlaySkipForwardSharp size={iconSize} />
    </IconButton>
  );
};

export default NextButton;