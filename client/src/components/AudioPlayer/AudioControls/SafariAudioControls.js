import React, { useCallback, useRef } from 'react';
import { IoPlaySharp, IoPauseSharp, IoPlaySkipForwardSharp, IoPlaySkipBackSharp } from "react-icons/io5";
import { isSafari } from '../../../utils/safariOptimizations';

/**
 * Ultra-optimized Safari audio controls for maximum performance
 * Uses direct DOM manipulation and minimal state updates
 */
const SafariAudioControls = ({
  isPlaying,
  onPlay,
  onPause,
  onNext,
  onPrev,
  className = '',
  iconSize = 24
}) => {
  const buttonRefs = useRef({
    play: null,
    next: null,
    prev: null
  });

  // Ultra-fast play/pause handler
  const handlePlayPause = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (isSafari()) {
      // Direct call for maximum speed
      if (isPlaying) {
        onPause?.();
      } else {
        onPlay?.();
      }
    } else {
      // Standard logic for other browsers
      if (isPlaying) {
        onPause?.();
      } else {
        onPlay?.();
      }
    }
  }, [isPlaying, onPlay, onPause]);

  // Ultra-fast next handler
  const handleNext = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Direct call for maximum speed
    onNext?.();
  }, [onNext]);

  // Ultra-fast previous handler
  const handlePrev = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Direct call for maximum speed
    onPrev?.();
  }, [onPrev]);

  // Ultra-fast button press feedback
  const handleButtonPress = useCallback((buttonType) => {
    const button = buttonRefs.current[buttonType];
    if (button) {
      button.style.transform = 'scale(0.95)';
      setTimeout(() => {
        button.style.transform = 'scale(1)';
      }, 100);
    }
  }, []);

  return (
    <div className={`safari-audio-controls ${className}`}>
      {/* Previous Button */}
      <button
        ref={(el) => buttonRefs.current.prev = el}
        className="safari-control-button safari-control-button--prev"
        onClick={(e) => {
          handleButtonPress('prev');
          handlePrev(e);
        }}
        aria-label="Previous Track"
        style={{
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          padding: '8px',
          borderRadius: '50%',
          transition: 'transform 0.1s ease',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        <IoPlaySkipBackSharp size={iconSize} />
      </button>

      {/* Play/Pause Button */}
      <button
        ref={(el) => buttonRefs.current.play = el}
        className="safari-control-button safari-control-button--play"
        onClick={(e) => {
          handleButtonPress('play');
          handlePlayPause(e);
        }}
        aria-label={isPlaying ? 'Pause' : 'Play'}
        style={{
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          padding: '12px',
          borderRadius: '50%',
          transition: 'transform 0.1s ease',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        {isPlaying ? <IoPauseSharp size={iconSize} /> : <IoPlaySharp size={iconSize} />}
      </button>

      {/* Next Button */}
      <button
        ref={(el) => buttonRefs.current.next = el}
        className="safari-control-button safari-control-button--next"
        onClick={(e) => {
          handleButtonPress('next');
          handleNext(e);
        }}
        aria-label="Next Track"
        style={{
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          padding: '8px',
          borderRadius: '50%',
          transition: 'transform 0.1s ease',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        <IoPlaySkipForwardSharp size={iconSize} />
      </button>
    </div>
  );
};

export default React.memo(SafariAudioControls); 