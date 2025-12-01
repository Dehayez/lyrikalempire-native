import React, { useRef, useEffect, useCallback, useMemo } from 'react';
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
import { audioErrorRecovery } from '../../services/audioErrorRecovery';
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
  
  // Update the ref when the prop changes
  useEffect(() => {
    onSessionUpdateRef.current = onSessionUpdate;
  }, [onSessionUpdate]);

  // Cleanup performance optimization refs on unmount
  useEffect(() => {
    return () => {
      if (progressUpdateRef.current) {
        cancelAnimationFrame(progressUpdateRef.current);
      }
      if (errorRecoveryRef.current) {
        clearTimeout(errorRecoveryRef.current);
      }
    };
  }, []);

  // Refs for error handling and Safari-specific issues
  const errorCountRef = useRef(0);
  const lastErrorTimeRef = useRef(0);
  const isErrorHandlingRef = useRef(false);
  const hasLoadedRef = useRef(false);
  const retryCountRef = useRef(0);
  const maxRetries = 3;
  const retryDelayRef = useRef(1000);
  const urlRetryTimerRef = useRef(null);
  const loadTimeoutRef = useRef(null);

  // Performance optimization refs
  const progressUpdateRef = useRef(null);
  const errorRecoveryRef = useRef(null);

  // Get playlists
  const { playlists, playedPlaylistTitle } = usePlaylist();
  
  // Get user context
  const { user } = useUser();

  // Get current playlist
  const currentPlaylist = playlists.find(p => p.title === playedPlaylistTitle)?.beats || [];

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

  // Enhanced error recovery (moved after volume extraction)
  const handleErrorWithRecovery = useCallback(async (error) => {
    // Cancel any pending error recovery
    if (errorRecoveryRef.current) {
      clearTimeout(errorRecoveryRef.current);
    }
    
    /*
    // Attempt recovery
    const recovery = await audioErrorRecovery.handleError(error, currentBeat, {
      isPlaying,
      volume,
      loadingPhase: 'playback'
    });

    console.log('🔄 [ERROR RECOVERY] Recovery strategy:', recovery.strategy);

    if (recovery.success) {
      switch (recovery.strategy) {
        case 'skip':
          console.log('⏭️ [ERROR RECOVERY] Skipping to next track');
          onNext?.();
          break;
        case 'retry':
          console.log(`🔄 [ERROR RECOVERY] Retrying in ${recovery.retryDelay}ms`);
          errorRecoveryRef.current = setTimeout(() => {
            // Retry playback
            if (audioPlayer.play) {
              audioPlayer.play();
            }
          }, recovery.retryDelay);
          break;
        // ... handle other strategies
      }
    }

    console.error('❌ [ERROR RECOVERY] Audio error with recovery:', error, recovery);
    */
  }, [currentBeat, isPlaying, volume, onNext, audioPlayer, playerRef]);

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
    markBeatAsCached
  });

  // MediaSession metadata is now handled by useMediaSession hook

  // Position state updates are now handled by useMediaSession hook

  // Reset hasLoaded when audio source changes
  useEffect(() => {
    hasLoadedRef.current = false;
    retryCountRef.current = 0;
    
    // Clear any pending retry timers
    if (urlRetryTimerRef.current) {
      clearTimeout(urlRetryTimerRef.current);
      urlRetryTimerRef.current = null;
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

  // Immediately reset time/progress on beat change (click or programmatic)
  useEffect(() => {
    // Reset retry counters when switching tracks
    retryCountRef.current = 0;
    retryDelayRef.current = 1000;
    hasLoadedRef.current = false;
    
    // Clear any existing load timeout
    if (loadTimeoutRef.current) {
      clearTimeout(loadTimeoutRef.current);
      loadTimeoutRef.current = null;
    }
    
    // Set a timeout to detect failed loads (CORS errors might not trigger error event)
    if (currentBeat && audioSrc) {
      // Check immediately after a short delay to catch CORS errors
      loadTimeoutRef.current = setTimeout(() => {
        const audio = playerRef.current?.audio?.current;
        if (audio && !hasLoadedRef.current) {
          // Check if audio is stuck at readyState 0 (not loading)
          if (audio.readyState === 0) {
            // Try to fetch the URL to confirm it's a CORS/404 issue
            fetch(audio.src, { method: 'HEAD' })
              .then(response => {
                if (response.status === 404) {
                  console.warn('404 detected. Skipping track.');
                  retryCountRef.current = 0;
                  retryDelayRef.current = 1000;
                  onNext?.();
                }
              })
              .catch(() => {
                // CORS error or network failure - skip immediately
                console.warn('CORS/network error detected. Skipping track.');
                retryCountRef.current = 0;
                retryDelayRef.current = 1000;
                onNext?.();
              });
          }
        }
      }, 3000); // 3 second timeout - CORS errors happen quickly
    }
    
    // Prevent sync during initial state updates to avoid loops
    const timeoutId = setTimeout(() => {
      // Ensure UI shows 00:00 instantly and prevent carryover
      setCurrentTimeState(0);
      setProgress(0);
      // Pause any current playback to prevent previous track resuming during load
      try { audioCore.pause(); } catch (e) {}
      audioCore.setCurrentTime(0);
      syncAllPlayers(true);
    }, 0);
    
    return () => {
      clearTimeout(timeoutId);
      if (loadTimeoutRef.current) {
        clearTimeout(loadTimeoutRef.current);
        loadTimeoutRef.current = null;
      }
    };
  }, [currentBeat?.id, audioSrc, onNext]);

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

  // Retry loading audio with a fresh URL
  const retryWithFreshUrl = useCallback(() => {
    if (!currentBeat) {
      return;
    }
    
    // If max retries exceeded, skip to next track
    if (retryCountRef.current >= maxRetries) {
      console.warn(`Max retries (${maxRetries}) exceeded for track "${currentBeat.title}". Skipping to next track.`);
      retryCountRef.current = 0;
      retryDelayRef.current = 1000;
      onNext?.();
      return;
    }
    
    retryCountRef.current += 1;
    
    // Exponential backoff for retries
    retryDelayRef.current = Math.min(retryDelayRef.current * 2, 8000);
    
    // Clear any existing timer
    if (urlRetryTimerRef.current) {
      clearTimeout(urlRetryTimerRef.current);
    }
    
    // Set a new timer for retry
    urlRetryTimerRef.current = setTimeout(() => {
      if (refreshAudioSrc) {
        refreshAudioSrc(true); // Force refresh the URL
      }
    }, retryDelayRef.current);
  }, [currentBeat, refreshAudioSrc, onNext]);

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
    // Mark as loaded to prevent duplicate play attempts
    hasLoadedRef.current = true;
    
    // Reset retry counters on successful load
    retryCountRef.current = 0;
    retryDelayRef.current = 1000;
    
    // Clear any pending retry timers and load timeout
    if (urlRetryTimerRef.current) {
      clearTimeout(urlRetryTimerRef.current);
      urlRetryTimerRef.current = null;
    }
    if (loadTimeoutRef.current) {
      clearTimeout(loadTimeoutRef.current);
      loadTimeoutRef.current = null;
    }
    
    // Call the original handler
    handleAudioReady(e);
    
    // For Safari, we need to manually trigger play if autoPlay is true
    if (isSafari && isPlaying && audioCore.isPaused()) {
      setTimeout(() => {
        audioCore.play().catch(error => {
          console.error('Safari: Error playing audio on canplay event:', error);
        });
      }, 100);
    }
  }, [handleAudioReady, isSafari, isPlaying, audioCore]);

  // Custom error handler with better logging
  const handleError = useCallback((e) => {
    const audio = e.target;
    const error = audio?.error;
    
    // Clear load timeout since we got an error
    if (loadTimeoutRef.current) {
      clearTimeout(loadTimeoutRef.current);
      loadTimeoutRef.current = null;
    }
    
    if (error) {
      console.error('Audio error:', error.code, error.message);
    }
    
    // Handle Safari-specific errors
    if (isSafari && error) {
      handleSafariError(error);
      
      // For network errors or CORS issues in Safari, retry with fresh URL
      if ((error.code === 2 || error.code === 4) && !hasLoadedRef.current) {
        retryWithFreshUrl();
        return;
      }
    }
    
    if (error) {
      // Format errors (code 4) are usually non-recoverable - skip immediately
      if (error.code === 4) {
        console.warn('Format error detected. Skipping track immediately.');
        retryCountRef.current = 0;
        retryDelayRef.current = 1000;
        onNext?.();
        return;
      }
      
      // For network errors (code 2), check if it's a 404 or CORS issue
      if (error.code === 2 && audio.src) {
        // Try to fetch the URL to check for 404 or CORS
        fetch(audio.src, { method: 'HEAD' })
          .then(response => {
            // 404 errors are non-recoverable - skip immediately
            if (response.status === 404) {
              console.warn('404 error detected. Skipping track immediately.');
              retryCountRef.current = 0;
              retryDelayRef.current = 1000;
              onNext?.();
              return;
            }
            // If fetch succeeds but audio still failed, try retry
            if (!hasLoadedRef.current && retryCountRef.current < maxRetries) {
              retryWithFreshUrl();
            } else if (retryCountRef.current >= maxRetries) {
              // Max retries exceeded, skip
              console.warn('Max retries exceeded. Skipping track.');
              retryCountRef.current = 0;
              retryDelayRef.current = 1000;
              onNext?.();
            }
          })
          .catch((fetchError) => {
            // CORS error or network failure - skip immediately if we've already retried
            if (retryCountRef.current >= maxRetries) {
              console.warn('CORS/network error after max retries. Skipping track immediately.');
              retryCountRef.current = 0;
              retryDelayRef.current = 1000;
              onNext?.();
            } else {
              // Try retry first
              retryWithFreshUrl();
            }
          });
        return;
      }
      
      // For non-Safari browsers, also retry on network errors
      if (!isSafari && error.code === 2 && !hasLoadedRef.current) {
        retryWithFreshUrl();
      }
    } else if (audio && audio.src && !hasLoadedRef.current) {
      // No error code but audio failed to load - likely CORS issue
      // Check if audio is stuck
      setTimeout(() => {
        if (audio.readyState === 0 && !hasLoadedRef.current) {
          console.warn('Audio stuck at readyState 0. Likely CORS issue. Skipping track.');
          retryCountRef.current = 0;
          retryDelayRef.current = 1000;
          onNext?.();
        }
      }, 5000);
    }
  }, [currentBeat, handleSafariError, isSafari, retryWithFreshUrl, onNext]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (urlRetryTimerRef.current) {
        clearTimeout(urlRetryTimerRef.current);
      }
      if (loadTimeoutRef.current) {
        clearTimeout(loadTimeoutRef.current);
      }
    };
  }, []);

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
          onEnded={() => onNext?.()}
          onError={handleErrorWithRecovery}
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
