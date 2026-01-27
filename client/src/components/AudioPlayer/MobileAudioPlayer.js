import React, { forwardRef, useCallback, useEffect, useRef } from 'react';
import H5AudioPlayer, { RHAP_UI } from 'react-h5-audio-player';
import { PlayPauseButton } from './AudioControls';
import PrevButton from './AudioControls/PrevButton';
import NextButton from './AudioControls/NextButton';
import { IoLocateSharp } from "react-icons/io5";
import { IconButton } from '../Buttons';
import { setSeekingState } from '../../utils';

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
  onNext,
  waveformRef
}, ref) => {
  const containerRef = useRef(null);
  const isSeekingRef = useRef(false);
  
  const handleMobilePlayPause = useCallback((shouldPlay) => {
    // Always call the original handler - let the audio core handle any restrictions
    if (handlePlayPause) {
      handlePlayPause(shouldPlay);
    }
  }, [handlePlayPause, isPlaying, currentBeat]);

  const handleScrollToCurrentBeat = useCallback((event) => {
    event.stopPropagation();

    if (!currentBeat || !currentBeat.id || typeof window === 'undefined') {
      return;
    }

    window.dispatchEvent(new CustomEvent('scroll-to-current-beat'));
  }, [currentBeat]);

  // Handle seeking state for progress bar interactions
  const handleSeekStart = useCallback((e) => {
    // Check if touching the progress bar area
    const target = e.target;
    if (target.closest('.rhap_progress-container') || 
        target.closest('.rhap_progress-bar') ||
        target.closest('.rhap_progress-indicator')) {
      isSeekingRef.current = true;
      setSeekingState(true);
      // Add seeking class to container for CSS-based detection
      containerRef.current?.classList.add('seeking');
    }
  }, []);

  const handleSeekMove = useCallback(() => {
    // Keep seeking state active during drag
    if (isSeekingRef.current) {
      setSeekingState(true);
    }
  }, []);

  const handleSeekEnd = useCallback(() => {
    if (isSeekingRef.current) {
      isSeekingRef.current = false;
      containerRef.current?.classList.remove('seeking');
      // Longer delay to ensure sync doesn't override the final seek position
      setTimeout(() => {
        setSeekingState(false);
      }, 200);
    }
  }, []);

  // Add event listeners for seeking state - use MutationObserver to wait for H5AudioPlayer to render
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const attachListeners = () => {
      const progressContainer = container.querySelector('.rhap_progress-container');
      if (!progressContainer) return false;

      // Touch events - capture phase to get them before H5AudioPlayer
      progressContainer.addEventListener('touchstart', handleSeekStart, { passive: true, capture: true });
      progressContainer.addEventListener('touchmove', handleSeekMove, { passive: true, capture: true });
      progressContainer.addEventListener('touchend', handleSeekEnd, { capture: true });
      progressContainer.addEventListener('touchcancel', handleSeekEnd, { capture: true });
      
      // Mouse events (for testing on desktop)
      progressContainer.addEventListener('mousedown', handleSeekStart, { capture: true });
      document.addEventListener('mousemove', handleSeekMove);
      document.addEventListener('mouseup', handleSeekEnd);

      return true;
    };

    // Try to attach immediately
    if (attachListeners()) {
      return () => {
        const progressContainer = container.querySelector('.rhap_progress-container');
        if (progressContainer) {
          progressContainer.removeEventListener('touchstart', handleSeekStart, { capture: true });
          progressContainer.removeEventListener('touchmove', handleSeekMove, { capture: true });
          progressContainer.removeEventListener('touchend', handleSeekEnd, { capture: true });
          progressContainer.removeEventListener('touchcancel', handleSeekEnd, { capture: true });
          progressContainer.removeEventListener('mousedown', handleSeekStart, { capture: true });
        }
        document.removeEventListener('mousemove', handleSeekMove);
        document.removeEventListener('mouseup', handleSeekEnd);
      };
    }

    // If not found, use MutationObserver to wait for it
    const observer = new MutationObserver(() => {
      if (attachListeners()) {
        observer.disconnect();
      }
    });

    observer.observe(container, { childList: true, subtree: true });

    return () => {
      observer.disconnect();
      const progressContainer = container.querySelector('.rhap_progress-container');
      if (progressContainer) {
        progressContainer.removeEventListener('touchstart', handleSeekStart, { capture: true });
        progressContainer.removeEventListener('touchmove', handleSeekMove, { capture: true });
        progressContainer.removeEventListener('touchend', handleSeekEnd, { capture: true });
        progressContainer.removeEventListener('touchcancel', handleSeekEnd, { capture: true });
        progressContainer.removeEventListener('mousedown', handleSeekStart, { capture: true });
      }
      document.removeEventListener('mousemove', handleSeekMove);
      document.removeEventListener('mouseup', handleSeekEnd);
    };
  }, [handleSeekStart, handleSeekMove, handleSeekEnd]);

  const loadingClass = showLoadingAnimation ? 'loading' : '';

  return (
    <div
      ref={containerRef}
      className={`audio-player audio-player--mobile ${lyricsModal ? 'audio-player--lyrics-modal-open' : ''} ${loadingClass}`}
      style={{ '--scroll-opacity-bottom': scrollOpacityBottom }}
      onClick={toggleFullPagePlayer}
    >
      <H5AudioPlayer
        ref={ref}
        className="smooth-progress-bar smooth-progress-bar--mobile"
        customProgressBarSection={[RHAP_UI.CURRENT_TIME, RHAP_UI.PROGRESS_BAR, RHAP_UI.DURATION]}
        customControlsSection={[]}
      />
      
      {/* Waveform element - positioned into progress container by useWaveform hook */}
      <div ref={waveformRef} className="waveform waveform--mobile"></div>
      
      <div className="audio-player__text" 
           onTouchStart={handleTouchStart} 
           onTouchEnd={handleTouchEnd} 
           onTouchMove={handleTouchMove} 
           style={{ transform: `translateX(${dragPosition}px)` }}>
        <div className="audio-player__scroll-row">
          <IconButton
            className="audio-player__scroll-button"
            onClick={handleScrollToCurrentBeat}
            text="Go to beat"
            ariaLabel="Scroll to current beat in list"
          >
            <IoLocateSharp />
          </IconButton>
        </div>
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