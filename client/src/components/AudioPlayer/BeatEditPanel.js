import React, { forwardRef, useCallback, useEffect, useRef } from 'react';
import H5AudioPlayer, { RHAP_UI } from 'react-h5-audio-player';
import { PiWaveform } from "react-icons/pi";
import { LiaMicrophoneAltSolid } from "react-icons/lia";
import { IoChevronDownSharp, IoEllipsisHorizontalSharp } from "react-icons/io5";

import { IconButton } from '../Buttons';
import { NextButton, PlayPauseButton, PrevButton, ShuffleButton, RepeatButton } from './AudioControls';
import BeatEditInputs from './BeatEditInputs';
import { setSeekingState } from '../../utils';

import 'react-h5-audio-player/lib/styles.css';
import './AudioPlayer.scss';

const BeatEditPanel = forwardRef(({
  fullPageOverlayRef,
  fullPageProgressRef,
  currentBeat,
  onUpdateBeat,
  isPlaying,
  handlePlayPause,
  handlePrevClick,
  onNext,
  artistName,
  shuffle,
  setShuffle,
  repeat,
  setRepeat,
  toggleWaveform,
  toggleLyricsModal,
  waveform,
  waveformRef,
  isLoadingAudio = false,
  showLoadingAnimation = false,
  lyricsModal = false,
  isFullPageVisible,
  toggleFullPagePlayer,
  handleDragStart,
  handleDragMove,
  handleDragEnd,
  handleEllipsisClick,
  style = {}
}, ref) => {
  const controlsRef = useRef(null);
  const loadingClass = showLoadingAnimation ? 'loading' : '';

  // Handle seeking state for progress bar interactions
  const handleSeekStart = useCallback((e) => {
    const target = e.target;
    if (target.closest('.rhap_progress-container') || 
        target.closest('.rhap_progress-bar') ||
        target.closest('.rhap_progress-indicator')) {
      setSeekingState(true);
    }
  }, []);

  const handleSeekEnd = useCallback(() => {
    setTimeout(() => {
      setSeekingState(false);
    }, 100);
  }, []);

  // Add event listeners for seeking state
  useEffect(() => {
    const container = controlsRef.current;
    if (!container) return;

    const progressContainer = container.querySelector('.rhap_progress-container');
    if (!progressContainer) return;

    // Touch events
    progressContainer.addEventListener('touchstart', handleSeekStart, { passive: true });
    progressContainer.addEventListener('touchend', handleSeekEnd);
    progressContainer.addEventListener('touchcancel', handleSeekEnd);
    
    // Mouse events
    progressContainer.addEventListener('mousedown', handleSeekStart);
    document.addEventListener('mouseup', handleSeekEnd);

    return () => {
      progressContainer.removeEventListener('touchstart', handleSeekStart);
      progressContainer.removeEventListener('touchend', handleSeekEnd);
      progressContainer.removeEventListener('touchcancel', handleSeekEnd);
      progressContainer.removeEventListener('mousedown', handleSeekStart);
      document.removeEventListener('mouseup', handleSeekEnd);
    };
  }, [handleSeekStart, handleSeekEnd]);

  return (
    <>
      <div
        ref={fullPageOverlayRef}
        className={`audio-player--mobile audio-player__full-page-overlay ${isFullPageVisible ? 'visible' : ''}`}
      />
      <div
        ref={ref}
        className={`audio-player audio-player__full-page ${loadingClass}`}
        style={style}
        onTouchStart={handleDragStart}
        onTouchMove={handleDragMove}
        onTouchEnd={handleDragEnd}
      >
        {/* HEADER */}
        <div className="audio-player__full-page-header">
          <IconButton
            className="audio-player__close-button"
            onClick={toggleFullPagePlayer}
            text="Close"
            ariaLabel="Close full-page player"
          >
            <IoChevronDownSharp />
          </IconButton>
          <p className="audio-player__full-page-title">
            Now Playing
          </p>
          <IconButton
            className="audio-player__ellipsis-button"
            onClick={handleEllipsisClick}
          >
            <IoEllipsisHorizontalSharp />
          </IconButton>
        </div>

        {/* EDIT FORM CONTENT */}
        <div className="audio-player__edit-panel-content">
          <BeatEditInputs 
            currentBeat={currentBeat} 
            onUpdateBeat={onUpdateBeat}
          />
        </div>

        {/* CONTROLS */}
        <div ref={controlsRef} className="audio-player__full-page-controls">
          <div className="audio-player__full-page-info">
            <div className="audio-player__full-page-text">
              <p className="audio-player__title">
                {currentBeat?.title || 'Audio Player'}
              </p>
              <p className="audio-player__artist">
                {artistName}
              </p>
            </div>
          </div>
          
          <H5AudioPlayer
            ref={fullPageProgressRef}
            className="smooth-progress-bar smooth-progress-bar--full-page"
            customProgressBarSection={[RHAP_UI.CURRENT_TIME, RHAP_UI.PROGRESS_BAR, RHAP_UI.DURATION]}
            customControlsSection={[
              <>
                <IconButton
                  onClick={toggleWaveform}
                  text={waveform ? 'Hide waveform' : 'Show waveform'}
                  ariaLabel={waveform ? 'Hide waveform' : 'Show waveform'}
                >
                  <PiWaveform className={waveform ? 'icon-primary' : ''} />
                </IconButton>
                <ShuffleButton shuffle={shuffle} setShuffle={setShuffle} />
                <PrevButton onPrev={handlePrevClick} />
                <PlayPauseButton isPlaying={isPlaying} setIsPlaying={handlePlayPause} />
                <NextButton onNext={onNext} />
                <RepeatButton repeat={repeat} setRepeat={setRepeat} />
                <IconButton
                  onClick={toggleLyricsModal}
                  text={lyricsModal ? 'Hide lyrics' : 'Show lyrics'}
                  ariaLabel={lyricsModal ? 'Hide lyrics' : 'Show lyrics'}
                >
                  <LiaMicrophoneAltSolid className={lyricsModal ? 'icon-primary' : ''} />
                </IconButton>
              </>
            ]}
            style={{ marginBottom: '20px' }}
          />
          
          <div ref={waveformRef} className={`waveform ${waveform ? 'waveform--active' : ''}`}></div>
        </div>
      </div>
    </>
  );
});

// Add display name for better debugging
BeatEditPanel.displayName = 'BeatEditPanel';

export default BeatEditPanel; 