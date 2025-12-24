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
import { usePlaylist, useUser } from '../../contexts';
import { AudioErrorBoundary } from './AudioErrorBoundary';

import { ContextMenu } from '../ContextMenu';
import { DuplicateConfirmModal } from '../Modals';

import MobileAudioPlayer from './MobileAudioPlayer';
import DesktopAudioPlayer from './DesktopAudioPlayer';
import BeatEditPanel from './BeatEditPanel';

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
  onSessionUpdate,
  addToCustomQueue,
  isScrolledBottom = false,
  scrollOpacityBottom = 0
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
  useEffect(() => {
    onSessionUpdateRef.current = onSessionUpdate;
  }, [onSessionUpdate]);

  // Error handling refs - consolidated
  const errorStateRef = useRef({
    count: 0,
    lastTime: 0,
    isHandling: false,
    hasLoaded: false,
    retryCount: 0,
    retryDelay: 1000
  });
  const timersRef = useRef({
    urlRetry: null,
    loadTimeout: null,
    errorRecovery: null
  });
  const maxRetries = 3;

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      Object.values(timersRef.current).forEach(timer => {
        if (timer) clearTimeout(timer);
      });
    };
  }, []);

  // Get playlists
  const { playlists, playedPlaylistTitle } = usePlaylist();
  
  // Get user context
  const { user } = useUser();

  // Get current playlist
  const currentPlaylist = playlists.find(p => p.title === playedPlaylistTitle)?.beats || [];

  // Calculate next beat for preloading
  const nextBeatForPreload = (() => {
    if (!currentPlaylist.length || !currentBeat) return null;
    const currentIndex = currentPlaylist.findIndex(b => b.id === currentBeat.id);
    if (currentIndex === -1) return null;
    const nextIndex = (currentIndex + 1) % currentPlaylist.length;
    return currentPlaylist[nextIndex];
  })();

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
    playlist: currentPlaylist
  });

  // Direct volume handling without debouncing for smooth slider updates
  const handleVolumeChangeDirect = useCallback((newVolume) => {
    // Call volume change directly for immediate updates
    audioPlayer.handleVolumeChange?.(newVolume);
  }, [audioPlayer.handleVolumeChange]);

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

  // Simplified error recovery handler
  const handleErrorWithRecovery = useCallback((error) => {
    // Cancel any pending error recovery
    if (timersRef.current.errorRecovery) {
      clearTimeout(timersRef.current.errorRecovery);
    }
    // Error recovery is handled by handleError below
  }, []);

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
    showLoadingAnimation,
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
    handleAudioReady,
    refreshAudioSrc,
    duplicateModal,
    setDuplicateModal,
    handleDuplicateConfirm,
    handleDuplicateCancel
  } = useAudioPlayerState({
    currentBeat,
    setCurrentBeat,
    isPlaying,
    setIsPlaying,
    lyricsModal,
    setLyricsModal,
    markBeatAsCached,
    nextBeat: nextBeatForPreload
  });

  // MediaSession metadata is now handled by useMediaSession hook

  // Position state updates are now handled by useMediaSession hook

  // Reset error state when audio source changes
  useEffect(() => {
    errorStateRef.current.hasLoaded = false;
    errorStateRef.current.retryCount = 0;
    
    // Clear any pending retry timers
    if (timersRef.current.urlRetry) {
      clearTimeout(timersRef.current.urlRetry);
      timersRef.current.urlRetry = null;
    }
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

  // Store onNext in a ref to use in effects without causing re-runs
  const onNextRef = useRef(onNext);
  useEffect(() => {
    onNextRef.current = onNext;
  }, [onNext]);

  // Reset time/progress on beat change
  useEffect(() => {
    // Reset retry counters when switching tracks
    errorStateRef.current.retryCount = 0;
    errorStateRef.current.retryDelay = 1000;
    errorStateRef.current.hasLoaded = false;
    
    // Clear any existing load timeout
    if (timersRef.current.loadTimeout) {
      clearTimeout(timersRef.current.loadTimeout);
      timersRef.current.loadTimeout = null;
    }
    
    // Set a timeout to detect failed loads (CORS errors might not trigger error event)
    if (currentBeat && audioSrc) {
      timersRef.current.loadTimeout = setTimeout(() => {
        const audio = playerRef.current?.audio?.current;
        if (audio && !errorStateRef.current.hasLoaded && audio.readyState === 0) {
          // Try to fetch the URL to confirm it's a CORS/404 issue
          fetch(audio.src, { method: 'HEAD' })
            .then(response => {
              if (response.status === 404) {
                errorStateRef.current.retryCount = 0;
                onNextRef.current?.();
              }
            })
            .catch(() => {
              errorStateRef.current.retryCount = 0;
              onNextRef.current?.();
            });
        }
      }, 3000);
    }
    
    // Reset UI state
    const timeoutId = setTimeout(() => {
      setCurrentTimeState(0);
      setProgress(0);
      try { audioCore.pause(); } catch (e) {}
      audioCore.setCurrentTime(0);
      syncAllPlayers(true);
    }, 0);
    
    return () => {
      clearTimeout(timeoutId);
      if (timersRef.current.loadTimeout) {
        clearTimeout(timersRef.current.loadTimeout);
        timersRef.current.loadTimeout = null;
      }
    };
  }, [currentBeat?.id, audioSrc]);

  // Set up media session
  useMediaSession({
    handlePlayPause,
    handlePrevClick,
    onNext,
    currentBeat,
    isPlaying,
    artistName // Use the actual username fetched from user data
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
    if (!isSafari) return;
    if (errorStateRef.current.isHandling) return;
    
    const now = Date.now();
    const state = errorStateRef.current;
    
    // Reset error count if it's been more than 5 seconds
    if (now - state.lastTime > 5000) {
      state.count = 0;
    }
    
    state.lastTime = now;
    state.count += 1;
    
    // Pause playback if too many errors
    if (state.count > 3) {
      state.isHandling = true;
      setIsPlaying(false);
      
      setTimeout(() => {
        state.count = 0;
        state.isHandling = false;
      }, 1000);
    }
  }, [isSafari, setIsPlaying]);

  // Retry loading audio with a fresh URL
  const retryWithFreshUrl = useCallback(() => {
    if (!currentBeat) return;
    
    const state = errorStateRef.current;
    
    // If max retries exceeded, skip to next track
    if (state.retryCount >= maxRetries) {
      state.retryCount = 0;
      state.retryDelay = 1000;
      onNextRef.current?.();
      return;
    }
    
    state.retryCount += 1;
    state.retryDelay = Math.min(state.retryDelay * 2, 8000);
    
    // Clear any existing timer
    if (timersRef.current.urlRetry) {
      clearTimeout(timersRef.current.urlRetry);
    }
    
    // Set a new timer for retry
    timersRef.current.urlRetry = setTimeout(() => {
      if (refreshAudioSrc) {
        refreshAudioSrc(true);
      }
    }, state.retryDelay);
  }, [currentBeat, refreshAudioSrc]);

  // Handle adding to playlist
  const handleAddToPlaylist = useCallback((playlistId) => {
    if (currentBeat && playlistId) {
      // Import the addBeatsToPlaylist service
      import('../../services/playlistService').then(({ addBeatsToPlaylist }) => {
        addBeatsToPlaylist(playlistId, [currentBeat.id])
          .then((result) => {
            // Check if it's a duplicate
            if (result.isDuplicate) {
              const playlist = playlists.find(p => p.id === playlistId);
              setDuplicateModal({
                isOpen: true,
                beatTitle: currentBeat.title,
                playlistTitle: playlist?.title || 'playlist',
                pendingPlaylistId: playlistId
              });
            } else {
              // Show success message
              import('../../components/Toaster').then(({ toastService }) => {
                const playlist = playlists.find(p => p.id === playlistId);
                toastService.addToPlaylist(currentBeat.title, playlist?.title || 'playlist');
              });
            }
          })
          .catch((error) => {
            console.error('Error adding beat to playlist:', error);
            import('../../components/Toaster').then(({ toastService }) => {
              toastService.warning('Failed to add track to playlist');
            });
          });
      });
    }
  }, [currentBeat, playlists, setDuplicateModal]);

  // Handle removing from playlist
  const handleRemoveFromPlaylist = useCallback(() => {
    if (currentBeat && playedPlaylistTitle) {
      // Find the playlist by title
      const playlist = playlists.find(p => p.title === playedPlaylistTitle);
      if (playlist) {
        import('../../services/playlistService').then(({ removeBeatFromPlaylist }) => {
          removeBeatFromPlaylist(playlist.id, currentBeat.id)
            .then(() => {
              import('../../components/Toaster').then(({ toastService }) => {
                toastService.removeFromPlaylist(currentBeat.title, playedPlaylistTitle);
              });
            })
            .catch((error) => {
              console.error('Error removing beat from playlist:', error);
              import('../../components/Toaster').then(({ toastService }) => {
                toastService.warning('Failed to remove track from playlist');
              });
            });
        });
      }
    }
  }, [currentBeat, playedPlaylistTitle, playlists]);

  // Handle adding to queue
  const handleAddToQueue = useCallback(() => {
    if (currentBeat && addToCustomQueue) {
      addToCustomQueue(currentBeat);
      import('../../components/Toaster').then(({ toastService }) => {
        toastService.addToQueue(currentBeat.title);
      });
    }
  }, [currentBeat, addToCustomQueue]);

  // Handle context menu items
  const contextMenuItems = [
    {
      icon: IoAddSharp,
      iconClass: 'add-playlist',
      text: 'Add to Playlist',
      buttonClass: 'add-playlist',
      subItems: playlists.map(playlist => ({
        text: playlist.title,
        onClick: () => handleAddToPlaylist(playlist.id)
      }))
    }
  ];

  // Add remove from playlist option if in a playlist view
  if (playedPlaylistTitle) {
    contextMenuItems.push({
      icon: IoRemoveCircleOutline,
      iconClass: 'remove-playlist',
      text: `Remove from ${playedPlaylistTitle}`,
      buttonClass: 'remove-playlist',
      onClick: handleRemoveFromPlaylist
    });
  }

  // Add to queue option
  contextMenuItems.push({
    icon: Queue02,
    iconClass: 'add-queue',
    text: 'Add to Queue',
    buttonClass: 'add-queue',
    onClick: handleAddToQueue
  });

  // Custom handlers for audio events
  const handleCanPlay = useCallback((e) => {
    const state = errorStateRef.current;
    
    // Mark as loaded and reset retry counters
    state.hasLoaded = true;
    state.retryCount = 0;
    state.retryDelay = 1000;
    
    // Clear any pending timers
    if (timersRef.current.urlRetry) {
      clearTimeout(timersRef.current.urlRetry);
      timersRef.current.urlRetry = null;
    }
    if (timersRef.current.loadTimeout) {
      clearTimeout(timersRef.current.loadTimeout);
      timersRef.current.loadTimeout = null;
    }
    
    // Call the original handler
    handleAudioReady(e);
    
    // For Safari, manually trigger play if needed
    if (isSafari && isPlaying && audioCore.isPaused()) {
      setTimeout(() => {
        audioCore.play().catch(() => {});
      }, 100);
    }
  }, [handleAudioReady, isSafari, isPlaying, audioCore]);

  // Simplified error handler
  const handleError = useCallback((e) => {
    const audio = e.target;
    const error = audio?.error;
    const state = errorStateRef.current;
    
    // Clear load timeout
    if (timersRef.current.loadTimeout) {
      clearTimeout(timersRef.current.loadTimeout);
      timersRef.current.loadTimeout = null;
    }
    
    // Handle Safari-specific errors
    if (isSafari && error) {
      handleSafariError(error);
      
      if ((error.code === 2 || error.code === 4) && !state.hasLoaded) {
        retryWithFreshUrl();
        return;
      }
    }
    
    if (error) {
      // Format errors (code 4) are non-recoverable - skip immediately
      if (error.code === 4) {
        state.retryCount = 0;
        state.retryDelay = 1000;
        onNextRef.current?.();
        return;
      }
      
      // For network errors (code 2), check if it's a 404 or CORS issue
      if (error.code === 2 && audio.src) {
        fetch(audio.src, { method: 'HEAD' })
          .then(response => {
            if (response.status === 404) {
              state.retryCount = 0;
              onNextRef.current?.();
              return;
            }
            if (!state.hasLoaded && state.retryCount < maxRetries) {
              retryWithFreshUrl();
            } else if (state.retryCount >= maxRetries) {
              state.retryCount = 0;
              onNextRef.current?.();
            }
          })
          .catch(() => {
            if (state.retryCount >= maxRetries) {
              state.retryCount = 0;
              onNextRef.current?.();
            } else {
              retryWithFreshUrl();
            }
          });
        return;
      }
      
      // For non-Safari browsers, retry on network errors
      if (!isSafari && error.code === 2 && !state.hasLoaded) {
        retryWithFreshUrl();
      }
    } else if (audio && audio.src && !state.hasLoaded) {
      // Audio stuck - likely CORS issue
      setTimeout(() => {
        if (audio.readyState === 0 && !state.hasLoaded) {
          state.retryCount = 0;
          onNextRef.current?.();
        }
      }, 5000);
    }
  }, [handleSafariError, isSafari, retryWithFreshUrl]);


  return (
    <AudioErrorBoundary
      currentBeat={currentBeat}
      onRetry={() => {
        if (audioPlayer.play) {
          audioPlayer.play();
        }
      }}
      onNext={onNext}
    >
      <>
        {/* Main audio player */}
        <H5AudioPlayer
          ref={playerRef}
          src={audioSrc || undefined}
          autoPlayAfterSrcChange={false}
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          onCanPlay={handleCanPlay}
          onError={handleErrorWithRecovery}
          {...preventDefaultAudioEvents}
          className="audio-player__main-player"
          style={{ display: 'none' }} // Hide the main player
          // Note: onEnded is handled by useAudioSync event listener for proper iOS PWA support
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
          showLoadingAnimation={showLoadingAnimation}
          isCachedAudio={isCachedAudio}
          lyricsModal={lyricsModal}
          isScrolledBottom={isScrolledBottom}
          scrollOpacityBottom={scrollOpacityBottom}
        />
      )}

      {/* Desktop player */}
      {!shouldShowMobilePlayer && (
        <DesktopAudioPlayer
          ref={desktopPlayerRef}
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
          handleVolumeChange={handleVolumeChangeDirect}
          toggleLyricsModal={toggleLyricsModal}
          handleEllipsisClick={handleEllipsisClick}
          waveformRef={waveformRefDesktop}
          waveform={waveform}
          toggleWaveform={toggleWaveform}
          isLoadingAudio={isLoadingAudio}
          showLoadingAnimation={showLoadingAnimation}
          isCachedAudio={isCachedAudio}
          shuffle={shuffle}
          setShuffle={setShuffle}
          repeat={repeat}
          setRepeat={setRepeat}
          lyricsModal={lyricsModal}
          isScrolledBottom={isScrolledBottom}
          scrollOpacityBottom={scrollOpacityBottom}
        />
      )}

      <BeatEditPanel
        ref={fullPagePlayerRef}
        style={{ display: shouldShowFullPagePlayer ? 'flex' : 'none' }}
        fullPageProgressRef={fullPageProgressRef}
        fullPageOverlayRef={fullPageOverlayRef}
        currentBeat={currentBeat || {}}
        artistName={artistName}
        isPlaying={isPlaying}
        handlePlayPause={handlePlayPause}
        handlePrevClick={handlePrevClick}
        onNext={onNext}
        progress={progress}
        currentTime={currentTimeState}
        duration={duration}
        volume={volume}
        handleVolumeChange={handleVolumeChangeDirect}
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
        showLoadingAnimation={showLoadingAnimation}
        isCachedAudio={isCachedAudio}
        shuffle={shuffle}
        setShuffle={setShuffle}
        repeat={repeat}
        setRepeat={setRepeat}
        onUpdateBeat={onUpdateBeat}
        lyricsModal={lyricsModal}
      />

      {/* Context menu */}
      {activeContextMenu && (
        <ContextMenu
          position={{ top: contextMenuY, left: contextMenuX }}
          beat={currentBeat}
          setActiveContextMenu={handleCloseContextMenu}
          items={contextMenuItems}
        />
      )}

      {/* Duplicate confirmation modal */}
      {duplicateModal.isOpen && (
        <DuplicateConfirmModal
          isOpen={duplicateModal.isOpen}
          beatTitle={duplicateModal.beatTitle}
          playlistTitle={duplicateModal.playlistTitle}
          onConfirm={handleDuplicateConfirm}
          onCancel={handleDuplicateCancel}
        />
      )}
      </>
    </AudioErrorBoundary>
  );
};

export default AudioPlayer;
