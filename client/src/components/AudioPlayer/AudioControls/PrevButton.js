import React, { useState, useEffect } from 'react';
import { IoPlaySkipBackSharp } from "react-icons/io5";
import IconButton from '../../Buttons/IconButton';
import './PrevButton.scss';

const PrevButton = ({ onPrev, iconSize = 24 }) => {
  const [isPrevActive, setIsPrevActive] = useState(false);

  useEffect(() => {
    const setMediaSession = () => {
      if ('mediaSession' in navigator) {
        navigator.mediaSession.setActionHandler('previoustrack', () => {
          setIsPrevActive(true);
          onPrev();
          setTimeout(() => setIsPrevActive(false), 200);
        });
      }
    };

    const handleKeyDown = (event) => {
      if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA' || event.target.tagName === 'SELECT') {
        return;
      }

      if (event.code === 'MediaTrackPrevious') {
        setIsPrevActive(true);
        onPrev();
      }
    };

    const handleKeyUp = (event) => {
      if (event.code === 'MediaTrackPrevious') {
        setIsPrevActive(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    setMediaSession();

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      if ('mediaSession' in navigator) {
        navigator.mediaSession.setActionHandler('previoustrack', null);
      }
    };
  }, [onPrev]);

  return (
    <IconButton
      className={`icon-button--prev ${isPrevActive ? 'active' : ''}`}
      onMouseDown={() => setIsPrevActive(true)}
      onMouseUp={() => setIsPrevActive(false)}
      onMouseLeave={() => setIsPrevActive(false)}
      onClick={onPrev}
      ariaLabel={'Previous Track'}
      text="Prev"
    >
      <IoPlaySkipBackSharp size={iconSize} />
    </IconButton>
  );
};

export default PrevButton;