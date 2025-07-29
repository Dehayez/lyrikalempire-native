import React, { forwardRef } from 'react';
import H5AudioPlayer, { RHAP_UI } from 'react-h5-audio-player';
import { PiWaveform } from "react-icons/pi";
import { LiaMicrophoneAltSolid } from "react-icons/lia";
import { IoChevronDownSharp, IoEllipsisHorizontalSharp } from "react-icons/io5";

import { createSlides } from '../../utils';
import { IconButton } from '../Buttons';
import { NextButton, PlayPauseButton, PrevButton, ShuffleButton, RepeatButton } from './AudioControls';
import SwipeableContent from './SwipeableContent';
import BeatEditInputs from './BeatEditInputs';

import 'react-h5-audio-player/lib/styles.css';
import './AudioPlayer.scss';

const FullPageAudioPlayer = forwardRef(({
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
  lyricsModal = false, // Add default value
  isFullPageVisible,
  toggleFullPagePlayer,
  handleDragStart,
  handleDragMove,
  handleDragEnd,
  handleEllipsisClick,
  isLoadingAudio,
  isCachedAudio,
  progress,
  currentTime,
  duration,
  volume,
  handleVolumeChange,
  style = {}
}, ref) => {
  // Create edit inputs content for the third slide
  const editInputsContent = (
    <div className="audio-player__full-page-edit-content">
      <BeatEditInputs 
        currentBeat={currentBeat} 
        onUpdateBeat={onUpdateBeat}
      />
    </div>
  );

  // Generate slides for the full page player
  const slides = createSlides(currentBeat, editInputsContent);

  return (
    <>
      <div
        ref={fullPageOverlayRef}
        className={`audio-player--mobile audio-player__full-page-overlay ${isFullPageVisible ? 'visible' : ''}`}
      />
      <div
        ref={ref}
        className="audio-player audio-player__full-page"
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

        {/* SWIPEABLE CONTENT */}
        <SwipeableContent
          slides={slides}
        />

        {/* CONTROLS */}
        <div className="audio-player__full-page-controls">
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
FullPageAudioPlayer.displayName = 'FullPageAudioPlayer';

export default FullPageAudioPlayer; 