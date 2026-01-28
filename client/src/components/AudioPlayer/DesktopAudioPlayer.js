import React, { forwardRef, useCallback, useEffect, useRef } from 'react';
import H5AudioPlayer, { RHAP_UI } from 'react-h5-audio-player';
import { PiWaveform } from "react-icons/pi";
import { LiaMicrophoneAltSolid } from "react-icons/lia";
import { IoEnterOutline } from "react-icons/io5";

import { IconButton } from '../Buttons';
import { NextButton, PlayPauseButton, PrevButton, VolumeSlider, ShuffleButton, RepeatButton } from './AudioControls';
import { setSeekingState } from '../../utils';

import 'react-h5-audio-player/lib/styles.css';
import './AudioPlayer.scss';

const DesktopAudioPlayer = forwardRef(({
  currentBeat,
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
  volume,
  handleVolumeChange,
  waveform,
  waveformRef,
  showLoadingAnimation = false,
  lyricsModal = false, // Add default value
  scrollOpacityBottom = 0
}, ref) => {
  const containerRef = useRef(null);
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

  const handleScrollToCurrentBeat = useCallback(() => {
    if (!currentBeat || !currentBeat.id || typeof window === 'undefined') {
      return;
    }

    window.dispatchEvent(new CustomEvent('scroll-to-current-beat'));
  }, [currentBeat]);

  // Add event listeners for seeking state
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const progressContainer = container.querySelector('.rhap_progress-container');
    if (!progressContainer) return;

    progressContainer.addEventListener('mousedown', handleSeekStart);
    document.addEventListener('mouseup', handleSeekEnd);

    return () => {
      progressContainer.removeEventListener('mousedown', handleSeekStart);
      document.removeEventListener('mouseup', handleSeekEnd);
    };
  }, [handleSeekStart, handleSeekEnd]);

  return (
    <div 
      ref={containerRef}
      className={`audio-player audio-player--desktop audio ${loadingClass}`}
      style={{ '--scroll-opacity-bottom': scrollOpacityBottom }}
    >
      <div className='audio-player__text audio-player__text--desktop' style={{ flex: '1' }}>
        <p
          className="audio-player__title audio-player__title--scrollable"
          onClick={handleScrollToCurrentBeat}
          role="button"
          tabIndex={0}
          aria-label="Scroll to current beat in list"
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              handleScrollToCurrentBeat();
            }
          }}
        >
          {currentBeat.title}
        </p>
        <p className="audio-player__artist">{artistName}</p>
      </div>
      <div style={{ flex: '3' }}>
        <H5AudioPlayer
          ref={ref}
          className="smooth-progress-bar smooth-progress-bar--desktop"
          customProgressBarSection={[RHAP_UI.CURRENT_TIME, RHAP_UI.PROGRESS_BAR, RHAP_UI.DURATION]}
          customControlsSection={[
            <>
              <ShuffleButton shuffle={shuffle} setShuffle={setShuffle} />
              <PrevButton onPrev={handlePrevClick} />
              <PlayPauseButton isPlaying={isPlaying} setIsPlaying={handlePlayPause} />
              <NextButton onNext={onNext} />
              <RepeatButton repeat={repeat} setRepeat={setRepeat} />
            </>
          ]}
        />
        <div
          ref={waveformRef}
          className={`waveform ${waveform ? 'waveform--active' : ''}`}
        ></div>
      </div>
      <div className='audio-player__settings' style={{ flex: '1' }}>
        <IconButton
          onClick={toggleWaveform}
          text={waveform ? 'Hide waveform' : 'Show waveform'}
          ariaLabel={waveform ? 'Hide waveform' : 'Show waveform'}
        >
          <PiWaveform className={waveform ? 'icon-primary' : ''} />
        </IconButton>
        <IconButton
          onClick={toggleLyricsModal}
          text={lyricsModal ? 'Hide lyrics' : 'Show lyrics'}
          ariaLabel={lyricsModal ? 'Hide lyrics' : 'Show lyrics'}
        >
          <LiaMicrophoneAltSolid className={lyricsModal ? 'icon-primary' : ''} />
        </IconButton>
        <VolumeSlider volume={volume} handleVolumeChange={handleVolumeChange} />
      </div>
    </div>
  );
});

// Add display name for better debugging
DesktopAudioPlayer.displayName = 'DesktopAudioPlayer';

export default DesktopAudioPlayer; 