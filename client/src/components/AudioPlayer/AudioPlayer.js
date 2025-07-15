import React, { useRef, useEffect, useCallback } from 'react';
import H5AudioPlayer from 'react-h5-audio-player';
import { isMobileOrTablet, slideOut } from '../../utils';
import { 
  useAudioPlayer, 
  useDragToDismiss, 
  useAudioPlayerState,
  useWaveform,
  useFullPagePlayer,
  useMediaSession,
  useAudioSync,
  useOs
} from '../../hooks';
import { usePlaylist } from '../../contexts';

import { ContextMenu } from '../ContextMenu';

import MobileAudioPlayer from './MobileAudioPlayer';
import DesktopAudioPlayer from './DesktopAudioPlayer';
import FullPageAudioPlayer from './FullPageAudioPlayer';

import 'react-h5-audio-player/lib/styles.css';
import './AudioPlayer.scss';
import { IoAddSharp, IoRemoveCircleOutline } from 'react-icons/io5';
import { Queue02 } from '../../assets/icons';

const AudioPlayer = ({
  currentBeat, setCurrentBeat,
  isPlaying, setIsPlaying,
  onNext, onPrev,
  shuffle, setShuffle,
  repeat, setRepeat,
  lyricsModal, setLyricsModal,
  onUpdateBeat,
  markBeatAsCached,
  onSessionUpdate
}) => {
  // Guard clause: Don't render if there's no current beat
  if (!currentBeat) {
    return null;
  }

  // Get browser info
  const { isSafari } = useOs();
  
  // Create refs for the audio players
  const mobilePlayerRef = useRef(null);
  const desktopPlayerRef = useRef(null);
  const fullPagePlayerRef = useRef(null);
  const fullPageProgressRef = useRef(null);
  
  // Store onSessionUpdate in a ref to prevent it from causing re-renders
  const onSessionUpdateRef = useRef(onSessionUpdate);
  
  // Update the ref when the prop changes
  useEffect(() => {
    onSessionUpdateRef.current = onSessionUpdate;
  }, [onSessionUpdate]);

  // Refs for error handling and Safari-specific issues
  const errorCountRef = useRef(0);
  const lastErrorTimeRef = useRef(0);
  const isErrorHandlingRef = useRef(false);
  const hasLoadedRef = useRef(false);

  // Log Safari detection
  useEffect(() => {
    console.log('AudioPlayer component - Safari detection:', isSafari);
  }, [isSafari]);

  // Get playlists
  const { playlists, playedPlaylistTitle } = usePlaylist();

  // Get audio player functionality (now includes audioCore and audioInteractions)
  const audioPlayer = useAudioPlayer({
    currentBeat,
    setCurrentBeat,
    isPlaying,
    setIsPlaying,
    onNext,
    onPrev,
    shuffle,
    repeat,
  });

  // Extract the properties we need for backward compatibility
  const {
    playerRef,
    volume,
    handleVolumeChange,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
    dragPosition,
    handlePrevClick,
    handlePlay,
    handleNext,
    handlePrev,
    currentTime,
    // Core audio functions
    play,
    pause,
    togglePlayPause,
    setVolume,
    setCurrentTime,
    getCurrentTime,
    getDuration,
    isReady,
    getReadyState,
    isEnded,
    isPaused,
    // Interactions
    updateCurrentTime,
  } = audioPlayer;

  // Get audio player state
  const {
    // Refs
    waveformRefDesktop,
    waveformRefFullPage,
    fullPageOverlayRef,
    wavesurfer,
    
    // State
    artistName,
    activeContextMenu,
    contextMenuX,
    contextMenuY,
    progress,
    setProgress,
    duration,
    setDuration,
    currentTimeState,
    setCurrentTimeState,
    isReturningFromLyrics,
    setIsReturningFromLyrics,
    audioSrc,
    autoPlay,
    isLoadingAudio,
    isCachedAudio,
    waveform,
    isFullPage,
    setIsFullPage,
    isFullPageVisible,
    setIsFullPageVisible,
    
    // Derived state
    shouldShowFullPagePlayer,
    shouldShowMobilePlayer,
    
    // Handlers
    toggleLyricsModal,
    toggleWaveform,
    handleEllipsisClick,
    handleCloseContextMenu,
    handleAudioReady
  } = useAudioPlayerState({
    currentBeat,
    setCurrentBeat,
    isPlaying,
    setIsPlaying,
    lyricsModal,
    setLyricsModal,
    markBeatAsCached
  });

  // Reset hasLoaded when audio source changes
  useEffect(() => {
    hasLoadedRef.current = false;
  }, [audioSrc]);

  // Get full page drag dismiss functionality
  const {
    dismissRef,
    handleDragStart,
    handleDragMove,
    handleDragEnd,
  } = useDragToDismiss(() => {
      // Use the same toggle function that handles proper slide-out animation
      if (isFullPage) {
        slideOut(fullPagePlayerRef.current, fullPageOverlayRef.current, () => {
          setIsFullPage(false);
          setIsFullPageVisible(false);
        });
      }
    });

  // Sync the dismissRef with our fullPagePlayerRef
  useEffect(() => {
    if (dismissRef.current !== fullPagePlayerRef.current) {
      dismissRef.current = fullPagePlayerRef.current;
    }
  }, [dismissRef]);

  // Get full page player functionality  
  const { toggleFullPagePlayer } = useFullPagePlayer({
    isFullPage,
    setIsFullPage,
    isFullPageVisible,
    setIsFullPageVisible,
    fullPagePlayerRef,
    fullPageOverlayRef,
    lyricsModal,
    isReturningFromLyrics,
    setIsReturningFromLyrics
  });

  // Create audioCore and audioInteractions objects for useAudioSync
  const audioCore = {
    playerRef,
    play,
    pause,
    togglePlayPause,
    setVolume,
    setCurrentTime,
    getCurrentTime,
    getDuration,
    isReady,
    getReadyState,
    isEnded,
    isPaused
  };

  const audioInteractions = {
    volume,
    updateCurrentTime,
    setVolume: (vol) => setVolume(vol)
  };

  // Get audio sync functionality
  const {
    syncAllPlayers,
    handleSeeked,
    preventDefaultAudioEvents,
    handlePlayPause,
    masterSession,
    currentSessionId,
    isCurrentSessionMaster,
    sessionName
  } = useAudioSync({
    audioCore,
    audioInteractions,
    setCurrentTimeState,
    setDuration,
    setProgress,
    wavesurfer,
    shouldShowMobilePlayer,
    mobilePlayerRef,
    isMobileOrTablet: isMobileOrTablet(),
    desktopPlayerRef,
    shouldShowFullPagePlayer,
    isFullPageVisible,
    fullPageProgressRef,
    onNext,
    setIsPlaying,
    repeat,
    currentBeat,
    isPlaying,
    setCurrentBeat
  });

  // Set up media session
  useMediaSession({
    handlePlayPause,
    handlePrevClick,
    onNext
  });

  // Pass session props up to App level for PlayingIndicator
  // Use a stable callback to prevent infinite updates
  const updateSessionInfo = useCallback(() => {
    if (onSessionUpdateRef.current) {
      onSessionUpdateRef.current({
        masterSession,
        currentSessionId,
        isCurrentSessionMaster,
        sessionName
      });
    }
  }, [masterSession, currentSessionId, isCurrentSessionMaster, sessionName]);

  // Call the stable callback in an effect
  useEffect(() => {
    updateSessionInfo();
  }, [updateSessionInfo]);

  // Set up waveform
  useWaveform({
    audioSrc,
    isFullPage,
    waveform,
    wavesurfer,
    waveformRefDesktop,
    waveformRefFullPage,
    playerRef,
    isFullPageVisible
  });

  // Safari-specific error handling
  const handleSafariError = useCallback((error) => {
    // Only handle errors in Safari
    if (!isSafari) return;
    
    // Prevent error handling recursion
    if (isErrorHandlingRef.current) return;
    
    const now = Date.now();
    
    // Reset error count if it's been more than 5 seconds since the last error
    if (now - lastErrorTimeRef.current > 5000) {
      errorCountRef.current = 0;
    }
    
    // Update last error time
    lastErrorTimeRef.current = now;
    
    // Increment error count
    errorCountRef.current += 1;
    
    // If we're getting too many errors, pause playback to prevent infinite loops
    if (errorCountRef.current > 3) {
      isErrorHandlingRef.current = true;
      
      // Pause playback
      setIsPlaying(false);
      
      // Reset error handling state after a delay
      setTimeout(() => {
        errorCountRef.current = 0;
        isErrorHandlingRef.current = false;
      }, 1000);
    }
  }, [isSafari, setIsPlaying]);

  // Handle adding to playlist
  const handleAddToPlaylist = useCallback((playlistId) => {
    // Implementation
  }, [currentBeat]);

  // Handle removing from playlist
  const handleRemoveFromPlaylist = useCallback(() => {
    // Implementation
  }, [currentBeat]);

  // Handle context menu items
  const contextMenuItems = [
    {
      icon: <IoAddSharp />,
      label: 'Add to Playlist',
      subItems: playlists.map(playlist => ({
        label: playlist.name,
        onClick: () => handleAddToPlaylist(playlist.id)
      }))
    }
  ];

  // Add remove from playlist option if in a playlist view
  if (playedPlaylistTitle) {
    contextMenuItems.push({
      icon: <IoRemoveCircleOutline />,
      label: `Remove from ${playedPlaylistTitle}`,
      onClick: handleRemoveFromPlaylist
    });
  }

  // Add to queue option
  contextMenuItems.push({
    icon: <Queue02 />,
    label: 'Add to Queue',
    onClick: () => {/* Implementation */}
  });

  // Custom handlers for audio events
  const handleCanPlay = useCallback((e) => {
    // Mark as loaded to prevent duplicate play attempts
    hasLoadedRef.current = true;
    
    // Call the original handler
    handleAudioReady(e);
    
    // For Safari, we need to manually trigger play if autoPlay is true
    if (isSafari && isPlaying && audioCore.isPaused()) {
      audioCore.play().catch(error => {
        console.error('Safari: Error playing audio on canplay event:', error);
      });
    }
  }, [handleAudioReady, isSafari, isPlaying, audioCore]);

  // Custom error handler with better logging
  const handleError = useCallback((e) => {
    const audio = e.target;
    const error = audio?.error;
    
    // Skip errors for empty src (during initialization)
    if (!audioSrc || audioSrc === '') {
      return;
    }
    
    // Handle Safari-specific errors
    if (isSafari && error) {
      handleSafariError(error);
      
      // For Safari, log detailed error info
      console.error('Safari audio error:', {
        errorCode: error.code,
        errorMessage: error.message,
        audioSrc: audio.src,
        currentBeat: currentBeat?.title,
        networkState: audio.networkState,
        readyState: audio.readyState
      });
    }
    
    if (error) {
      const errorTypes = {
        1: 'MEDIA_ERR_ABORTED - The fetching of the audio was aborted',
        2: 'MEDIA_ERR_NETWORK - A network error occurred while fetching the audio',
        3: 'MEDIA_ERR_DECODE - A decoding error occurred',
        4: 'MEDIA_ERR_SRC_NOT_SUPPORTED - The audio format is not supported'
      };
      
      const errorType = errorTypes[error.code] || `Unknown error code: ${error.code}`;
      console.error(`Audio error: ${errorType}`, error);
      
      // Test if it's a network/CORS issue by trying to fetch the URL directly
      if (error.code === 2 && audio.src) {
        // Testing direct fetch of audio URL
        fetch(audio.src, { method: 'HEAD' })
          .then(response => {
            console.log('Direct fetch successful:', response.status);
          })
          .catch(fetchError => {
            console.error('Direct fetch failed:', fetchError);
          });
      }
    }
  }, [audioSrc, currentBeat, handleSafariError, isSafari]);

  return (
    <>
      {/* Main audio player */}
      <H5AudioPlayer
        ref={playerRef}
        src={audioSrc || undefined}
        autoPlayAfterSrcChange={false}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onCanPlay={handleCanPlay}
        onError={handleError}
        {...preventDefaultAudioEvents}
        className="audio-player__main-player"
        style={{ display: 'none' }} // Hide the main player
      />

      {/* Mobile player */}
      {shouldShowMobilePlayer && (
        <MobileAudioPlayer
          ref={mobilePlayerRef}
          currentBeat={currentBeat}
          artistName={artistName}
          isPlaying={isPlaying}
          handlePlayPause={handlePlayPause}
          handlePrevClick={handlePrevClick}
          onNext={onNext}
          toggleFullPagePlayer={toggleFullPagePlayer}
          progress={progress}
          currentTime={currentTimeState}
          duration={duration}
          handleTouchStart={handleTouchStart}
          handleTouchMove={handleTouchMove}
          handleTouchEnd={handleTouchEnd}
          dragPosition={dragPosition}
          isLoadingAudio={isLoadingAudio}
          isCachedAudio={isCachedAudio}
          lyricsModal={lyricsModal}
        />
      )}

      {/* Desktop player */}
      {!isMobileOrTablet() && (
        <DesktopAudioPlayer
          ref={desktopPlayerRef}
          currentBeat={currentBeat}
          artistName={artistName}
          isPlaying={isPlaying}
          handlePlayPause={handlePlayPause}
          handlePrevClick={handlePrevClick}
          onNext={onNext}
          toggleFullPagePlayer={toggleFullPagePlayer}
          progress={progress}
          currentTime={currentTimeState}
          duration={duration}
          volume={volume}
          handleVolumeChange={handleVolumeChange}
          toggleLyricsModal={toggleLyricsModal}
          handleEllipsisClick={handleEllipsisClick}
          toggleWaveform={toggleWaveform}
          waveform={waveform}
          waveformRef={waveformRefDesktop}
          isLoadingAudio={isLoadingAudio}
          isCachedAudio={isCachedAudio}
          shuffle={shuffle}
          setShuffle={setShuffle}
          repeat={repeat}
          setRepeat={setRepeat}
          lyricsModal={lyricsModal}
        />
      )}

      {/* Full page player */}
      {shouldShowFullPagePlayer && (
        <FullPageAudioPlayer
          ref={fullPagePlayerRef}
          fullPageProgressRef={fullPageProgressRef}
          fullPageOverlayRef={fullPageOverlayRef}
          currentBeat={currentBeat}
          artistName={artistName}
          isPlaying={isPlaying}
          handlePlayPause={handlePlayPause}
          handlePrevClick={handlePrevClick}
          onNext={onNext}
          progress={progress}
          currentTime={currentTimeState}
          duration={duration}
          volume={volume}
          handleVolumeChange={handleVolumeChange}
          toggleFullPagePlayer={toggleFullPagePlayer}
          isFullPageVisible={isFullPageVisible}
          handleDragStart={handleDragStart}
          handleDragMove={handleDragMove}
          handleDragEnd={handleDragEnd}
          toggleLyricsModal={toggleLyricsModal}
          handleEllipsisClick={handleEllipsisClick}
          waveformRef={waveformRefFullPage}
          waveform={waveform}
          toggleWaveform={toggleWaveform}
          isLoadingAudio={isLoadingAudio}
          isCachedAudio={isCachedAudio}
          shuffle={shuffle}
          setShuffle={setShuffle}
          repeat={repeat}
          setRepeat={setRepeat}
          onUpdateBeat={onUpdateBeat}
          lyricsModal={lyricsModal}
        />
      )}

      {/* Context menu */}
      {activeContextMenu && (
        <ContextMenu
          x={contextMenuX}
          y={contextMenuY}
          onClose={handleCloseContextMenu}
          items={contextMenuItems}
        />
      )}
    </>
  );
}

export default AudioPlayer;