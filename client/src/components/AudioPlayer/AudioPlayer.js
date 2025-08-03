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
      if (volumeUpdateRef.current) {
        clearTimeout(volumeUpdateRef.current);
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

  // Performance optimization refs
  const progressUpdateRef = useRef(null);
  const volumeUpdateRef = useRef(null);
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

  // Enhanced volume handling with debouncing
  const handleVolumeChangeDebounced = useCallback((newVolume) => {
    // Debounce volume updates
    if (volumeUpdateRef.current) {
      clearTimeout(volumeUpdateRef.current);
    }
    volumeUpdateRef.current = setTimeout(() => {
      audioPlayer.handleVolumeChange?.(newVolume);
    }, 100);
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

    // Attempt recovery
    const recovery = await audioErrorRecovery.handleError(error, currentBeat, {
      isPlaying,
      volume,
      loadingPhase: 'playback'
    });

    if (recovery.success) {
      switch (recovery.strategy) {
        case 'skip':
          onNext?.();
          break;
        case 'retry':
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

    console.error('Audio error with recovery:', error, recovery);
  }, [currentBeat, isPlaying, volume, onNext, audioPlayer]);

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
    refreshAudioSrc
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
    if (!currentBeat || retryCountRef.current >= maxRetries) {
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
  }, [currentBeat, refreshAudioSrc]);

  // Handle adding to playlist
  const handleAddToPlaylist = useCallback((playlistId) => {
    if (currentBeat && playlistId) {
      // Import the addBeatsToPlaylist service
      import('../../services/playlistService').then(({ addBeatsToPlaylist }) => {
        addBeatsToPlaylist(playlistId, [currentBeat.id])
          .then(() => {
            // Show success message
            import('react-toastify').then(({ toast }) => {
              const playlist = playlists.find(p => p.id === playlistId);
              toast.success(`Added "${currentBeat.title}" to "${playlist?.title || 'playlist'}"`);
            });
          })
          .catch((error) => {
            console.error('Error adding beat to playlist:', error);
            import('react-toastify').then(({ toast }) => {
              toast.error('Failed to add track to playlist');
            });
          });
      });
    }
  }, [currentBeat, playlists]);

  // Handle removing from playlist
  const handleRemoveFromPlaylist = useCallback(() => {
    if (currentBeat && playedPlaylistTitle) {
      // Find the playlist by title
      const playlist = playlists.find(p => p.title === playedPlaylistTitle);
      if (playlist) {
        import('../../services/playlistService').then(({ removeBeatFromPlaylist }) => {
          removeBeatFromPlaylist(playlist.id, currentBeat.id)
            .then(() => {
              import('react-toastify').then(({ toast }) => {
                toast.success(`Removed "${currentBeat.title}" from "${playedPlaylistTitle}"`);
              });
            })
            .catch((error) => {
              console.error('Error removing beat from playlist:', error);
              import('react-toastify').then(({ toast }) => {
                toast.error('Failed to remove track from playlist');
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
      import('react-toastify').then(({ toast }) => {
        toast.success(`Added "${currentBeat.title}" to queue`);
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
    console.log('🎉 [AUDIO DEBUG] CanPlay event fired - audio is ready to play:', {
      beatId: currentBeat?.id,
      readyState: e?.target?.readyState,
      networkState: e?.target?.networkState,
      duration: e?.target?.duration,
      currentTime: e?.target?.currentTime,
      buffered: e?.target?.buffered?.length ? Array.from({length: e.target.buffered.length}, (_, i) => ({
        start: e.target.buffered.start(i),
        end: e.target.buffered.end(i)
      })) : []
    });
    
    // Mark as loaded to prevent duplicate play attempts
    hasLoadedRef.current = true;
    
    // Reset retry counters on successful load
    retryCountRef.current = 0;
    retryDelayRef.current = 1000;
    
    // Clear any pending retry timers
    if (urlRetryTimerRef.current) {
      clearTimeout(urlRetryTimerRef.current);
      urlRetryTimerRef.current = null;
    }
    
    // Call the original handler
    handleAudioReady(e);
    
    // For Safari, we need to manually trigger play if autoPlay is true
    if (isSafari && isPlaying && audioCore.isPaused()) {
      console.log('🦁 [AUDIO DEBUG] Safari auto-play triggered after canPlay event');
      // Add a small delay for Safari to properly initialize the audio
      setTimeout(() => {
        audioCore.play().catch(error => {
          console.error('❌ [AUDIO DEBUG] Safari: Error playing audio on canplay event:', error);
        });
      }, 100);
    }
  }, [handleAudioReady, isSafari, isPlaying, audioCore]);

  // Custom error handler with better logging
  const handleError = useCallback((e) => {
    const audio = e.target;
    const error = audio?.error;
    
    console.error('❌ [AUDIO DEBUG] Audio error event fired:', {
      beatId: currentBeat?.id,
      error: error?.message || 'Unknown error',
      code: error?.code,
      src: audio?.src,
      readyState: audio?.readyState,
      networkState: audio?.networkState,
      errorCodeMeaning: {
        1: 'MEDIA_ERR_ABORTED - User aborted',
        2: 'MEDIA_ERR_NETWORK - Network error',
        3: 'MEDIA_ERR_DECODE - Decode error', 
        4: 'MEDIA_ERR_SRC_NOT_SUPPORTED - Source not supported'
      }[error?.code] || 'Unknown error code'
    });
    
    // Skip errors for empty src (during initialization)
    if (!audioSrc || audioSrc === '') {
      console.log('⏭️ [AUDIO DEBUG] Skipping error for empty audio source (initialization)');
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
        readyState: audio.readyState,
        hasLoadedRef: hasLoadedRef.current,
        retryCount: retryCountRef.current
      });
      
      // For network errors or CORS issues in Safari, retry with fresh URL
      if ((error.code === 2 || error.code === 4) && !hasLoadedRef.current) {
        retryWithFreshUrl();
      }
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
      
      // For non-Safari browsers, also retry on network errors
      if (!isSafari && error.code === 2 && !hasLoadedRef.current) {
        retryWithFreshUrl();
      }
      
      // Test if it's a network/CORS issue by trying to fetch the URL directly
      if (error.code === 2 && audio.src) {
        // Testing direct fetch of audio URL
        fetch(audio.src, { method: 'HEAD' })
          .then(response => {
            if (response.status === 404 && !hasLoadedRef.current) {
              // If direct fetch returns 404, definitely retry with fresh URL
              retryWithFreshUrl();
            }
          })
          .catch(fetchError => {
            console.error('Direct fetch failed:', fetchError);
            // If direct fetch fails, try with fresh URL
            if (!hasLoadedRef.current) {
              retryWithFreshUrl();
            }
          });
      }
    }
  }, [audioSrc, currentBeat, handleSafariError, isSafari, retryWithFreshUrl]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (urlRetryTimerRef.current) {
        clearTimeout(urlRetryTimerRef.current);
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
          handleVolumeChange={handleVolumeChangeDebounced}
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

      <FullPageAudioPlayer
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
        handleVolumeChange={handleVolumeChangeDebounced}
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

      {/* Context menu */}
      {activeContextMenu && (
        <ContextMenu
          position={{ top: contextMenuY, left: contextMenuX }}
          beat={currentBeat}
          setActiveContextMenu={handleCloseContextMenu}
          items={contextMenuItems}
        />
      )}
      </>
    </AudioErrorBoundary>
  );
};

export default AudioPlayer;