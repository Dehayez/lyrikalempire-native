import React, { forwardRef, useCallback } from 'react';
import H5AudioPlayer, { RHAP_UI } from 'react-h5-audio-player';
import { PlayPauseButton } from './AudioControls';
import PrevButton from './AudioControls/PrevButton';
import NextButton from './AudioControls/NextButton';

import 'react-h5-audio-player/lib/styles.css';
import './AudioPlayer.scss';

const MobileAudioPlayer = forwardRef(({
  currentBeat,
  isPlaying,
  handlePlayPause,
  artistName,
  toggleFullPagePlayer,
  handleTouchStart,
  handleTouchMove,
  handleTouchEnd,
  dragPosition,
  isLoadingAudio = false,
  showLoadingAnimation = false,
  lyricsModal = false,
  isScrolledBottom = false,
  scrollOpacityBottom = 0,
  handlePrevClick,
  onNext
}, ref) => {
  
  const handleMobilePlayPause = useCallback((shouldPlay) => {
    // Always call the original handler - let the audio core handle any restrictions
    if (handlePlayPause) {
      handlePlayPause(shouldPlay);
    }
  }, [handlePlayPause, isPlaying, currentBeat]);

  return (
    <div
      className={`audio-player audio-player--mobile ${lyricsModal ? 'audio-player--lyrics-modal-open' : ''} ${showLoadingAnimation ? 'loading' : ''}`}
      style={{ '--scroll-opacity-bottom': scrollOpacityBottom }}
      onClick={toggleFullPagePlayer}
    >
      <H5AudioPlayer
        ref={ref}
        className="smooth-progress-bar smooth-progress-bar--mobile"
        customProgressBarSection={[RHAP_UI.CURRENT_TIME, RHAP_UI.PROGRESS_BAR, RHAP_UI.DURATION]}
        customControlsSection={[]}
      />
      
      <div className="audio-player__text" 
           onTouchStart={handleTouchStart} 
           onTouchEnd={handleTouchEnd} 
           onTouchMove={handleTouchMove} 
           style={{ transform: `translateX(${dragPosition}px)` }}>
        <div className="audio-player__title-row">
          <p className="audio-player__title">{currentBeat.title}</p>
        </div>
        <p className="audio-player__artist">{artistName}</p>
      </div>
      
      <div 
        className="audio-player__controls"
        onClick={(e) => e.stopPropagation()}
      >
        <PrevButton onPrev={handlePrevClick} iconSize={20} />
        <PlayPauseButton 
          isPlaying={isPlaying} 
          setIsPlaying={handleMobilePlayPause} 
          className="small"
          iconSize={20}
        />
        <NextButton onNext={onNext} iconSize={20} />
      </div>
    </div>
  );
});

// Add display name for better debugging
MobileAudioPlayer.displayName = 'MobileAudioPlayer';

export default MobileAudioPlayer; 