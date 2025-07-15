import React, { forwardRef } from 'react';
import H5AudioPlayer, { RHAP_UI } from 'react-h5-audio-player';
import { PlayPauseButton } from './AudioControls';

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
  isLoadingAudio,
  isCachedAudio,
  progress,
  currentTime,
  duration,
  lyricsModal = false // Add default value
}, ref) => {
  return (
    <div
      className={`audio-player audio-player--mobile ${lyricsModal ? 'audio-player--lyrics-modal-open' : ''}`}
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
      <PlayPauseButton isPlaying={isPlaying} setIsPlaying={handlePlayPause} className="small" />
    </div>
  );
});

// Add display name for better debugging
MobileAudioPlayer.displayName = 'MobileAudioPlayer';

export default MobileAudioPlayer; 