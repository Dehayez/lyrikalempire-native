import { useEffect, useCallback, useRef } from 'react';
import { syncAllPlayers as syncAllPlayersUtil, getShortBrowserName } from '../../utils';
import { useCrossTabSync } from '../useCrossTabSync';
import { useWebSocket } from '../../contexts';

// Browser detection
const isSafari = () => {
  const ua = navigator.userAgent.toLowerCase();
  return ua.indexOf('safari') !== -1 && ua.indexOf('chrome') === -1;
};

const isMobile = () => /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

const isSafariBrowser = isSafari();

export const useAudioSync = ({
  audioCore,
  audioInteractions,
  setCurrentTimeState,
  setDuration,
  setProgress,
  wavesurfer,
  shouldShowMobilePlayer,
  mobilePlayerRef,
  isMobileOrTablet,
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
}) => {
  const { emitStateRequest: wsEmitStateRequest } = useWebSocket();
  
  // Refs for Safari-specific handling
  const timeUpdateThrottleRef = useRef(false);
  const lastTimeUpdateRef = useRef(0);
  
  // Cross-tab synchronization
  const { 
    broadcastPlay, 
    broadcastPause, 
    broadcastSeek, 
    broadcastBeatChange,
    masterSession,
    currentSessionId,
    isCurrentSessionMaster,
    sessionName
  } = useCrossTabSync({
    currentBeat,
    isPlaying,
    audioCore,
    setIsPlaying,
    setCurrentBeat,
    currentTime: audioCore.getCurrentTime()
  });
  
  // Sync all players with main audio element
  const syncAllPlayers = useCallback((forceUpdate = false) => {
    // For Safari, throttle non-forced updates
    if (isSafariBrowser && !forceUpdate) {
      const now = Date.now();
      if (now - lastTimeUpdateRef.current < 100) {
        return;
      }
      lastTimeUpdateRef.current = now;
    }
    
    syncAllPlayersUtil({
      playerRef: audioCore.playerRef,
      setCurrentTimeState,
      setDuration,
      setProgress,
      wavesurfer,
      shouldShowMobilePlayer,
      mobilePlayerRef,
      isMobileOrTablet,
      desktopPlayerRef,
      shouldShowFullPagePlayer,
      isFullPageVisible,
      fullPageProgressRef,
      forceUpdate,
      currentBeat
    });
  }, [
    audioCore.playerRef,
    setCurrentTimeState,
    setDuration,
    setProgress,
    wavesurfer,
    shouldShowMobilePlayer,
    mobilePlayerRef,
    isMobileOrTablet,
    desktopPlayerRef,
    shouldShowFullPagePlayer,
    isFullPageVisible,
    fullPageProgressRef,
    currentBeat
  ]);

  // Handle seeking from display players
  const handleSeeked = useCallback((e) => {
    const newTime = e.target.currentTime;
    const currentTime = audioCore.getCurrentTime();
    
    if (Math.abs(currentTime - newTime) > 0.1) {
      audioCore.setCurrentTime(newTime);
      syncAllPlayers();
    }
  }, [audioCore, syncAllPlayers]);

  // Handle seeking while dragging
  const handleSeek = useCallback((e) => {
    const newTime = e.target.currentTime;
    audioCore.setCurrentTime(newTime);
    audioInteractions.updateCurrentTime(newTime);
    broadcastSeek(newTime);
    syncAllPlayers();
  }, [audioCore, audioInteractions, syncAllPlayers, broadcastSeek]);

  // Override H5AudioPlayer events to prevent conflicts
  const preventDefaultAudioEvents = {
    onPlay: (e) => {
      e.preventDefault();
      handlePlayPause(true);
    },
    onPause: (e) => {
      e.preventDefault();
      handlePlayPause(false);
    },
    onLoadStart: () => {},
    onCanPlay: () => {},
    onLoadedData: () => {},
    onSeeked: (e) => {
      handleSeeked(e);
    },
    onSeek: (e) => {
      handleSeek(e);
    },
    onTimeUpdate: (e) => {
      // Only update if this is not the main audio player
      if (e.target !== audioCore.playerRef.current?.audio?.current) {
        e.preventDefault();
      }
    },
  };

  // Handle play/pause from UI
  const handlePlayPause = useCallback((play) => {
    // If trying to play and there's no master session, this tab becomes master
    if (play && !masterSession) {
      audioCore.togglePlayPause(play);
      setIsPlaying(play);
      broadcastPlay();
      return;
    }
    
    const isCurrentTabMaster = isCurrentSessionMaster;
    
    if (isCurrentTabMaster) {
      // Only actually play/pause audio in the master tab
      audioCore.togglePlayPause(play);
    } else {
      // For non-master tabs, just update the UI state
      setIsPlaying(play);
    }
    
    // Always broadcast to sync all tabs
    if (play) {
      broadcastPlay();
    } else {
      broadcastPause();
    }
  }, [audioCore, broadcastPlay, broadcastPause, isCurrentSessionMaster, setIsPlaying, masterSession]);

  // Handle when song ends
  const handleEnded = useCallback(() => {
    // Only the master tab should handle the ended event
    if (isCurrentSessionMaster) {
      if (repeat === 'Repeat One') {
        if (audioCore.prepareForNewTrack) {
          audioCore.prepareForNewTrack();
        }
        audioCore.setCurrentTime(0);
        audioCore.play().catch(error => {
          console.warn('Repeat play failed:', error);
        });
      } else {
        if (audioCore.prepareForNewTrack) {
          audioCore.prepareForNewTrack();
        }
        onNext();
      }
    }
  }, [onNext, repeat, audioCore, isCurrentSessionMaster]);

  // Set up main audio player event listeners
  useEffect(() => {
    const mainAudio = audioCore.playerRef.current?.audio.current;
    if (!mainAudio) return;
    
    // Ensure non-master tabs have their audio muted
    if (!isCurrentSessionMaster && mainAudio) {
      mainAudio.muted = true;
    } else if (isCurrentSessionMaster && mainAudio) {
      mainAudio.muted = false;
    }

    const handleTimeUpdate = () => {
      // For Safari, throttle timeupdate events
      if (isSafariBrowser) {
        if (timeUpdateThrottleRef.current) return;
        
        timeUpdateThrottleRef.current = true;
        setTimeout(() => {
          timeUpdateThrottleRef.current = false;
        }, 100);
      }
      
      audioInteractions.updateCurrentTime(audioCore.getCurrentTime());
      syncAllPlayers();
    };

    const handleLoadedMetadata = () => {
      setTimeout(() => syncAllPlayers(true), 100);
    };

    const handleLoadedData = () => {
      syncAllPlayers(true);
      
      // Check if we should start playback
      if (currentBeat?.audio && isPlaying) {
        const currentSrc = mainAudio.src;
        const hasValidSrc = currentSrc && currentSrc !== '';
        
        if (hasValidSrc && audioCore.isPaused() && isCurrentSessionMaster) {
          audioCore.play().catch(error => {
            console.warn('Auto-play failed on loaded data:', error);
          });
        }
      }
    };

    const handleCanPlay = () => {
      syncAllPlayers(true);
      
      // Check if we should start playback
      if (currentBeat?.audio && isPlaying) {
        const currentSrc = mainAudio.src;
        const hasValidSrc = currentSrc && currentSrc !== '';
        
        if (hasValidSrc && audioCore.isPaused() && isCurrentSessionMaster) {
          audioCore.play().catch(error => {
            console.warn('Auto-play failed on can play:', error);
          });
        }
      }
    };

    const handlePlay = () => {
      setIsPlaying(true);
      if ('mediaSession' in navigator) {
        navigator.mediaSession.playbackState = 'playing';
      }
      broadcastPlay();
    };

    const handlePause = () => {
      setIsPlaying(false);
      if ('mediaSession' in navigator) {
        navigator.mediaSession.playbackState = 'paused';
      }
      broadcastPause();
    };

    const handleVolumeChange = () => {
      // Sync volume changes back to interactions
      const newVolume = mainAudio.volume;
      if (Math.abs(newVolume - audioInteractions.volume) > 0.01) {
        audioInteractions.setVolume(newVolume);
      }
    };

    const handleEndedWithRetry = () => {
      setTimeout(() => {
        handleEnded();
      }, 100);
    };

    // Attach event listeners
    const eventListeners = [
      ['timeupdate', handleTimeUpdate],
      ['loadedmetadata', handleLoadedMetadata],
      ['loadeddata', handleLoadedData],
      ['canplay', handleCanPlay],
      ['play', handlePlay],
      ['pause', handlePause],
      ['volumechange', handleVolumeChange],
      ['ended', handleEndedWithRetry]
    ];

    eventListeners.forEach(([event, handler]) => {
      mainAudio.addEventListener(event, handler);
    });

    return () => {
      eventListeners.forEach(([event, handler]) => {
        mainAudio.removeEventListener(event, handler);
      });
    };
  }, [
    audioCore,
    audioInteractions,
    syncAllPlayers,
    currentBeat,
    isPlaying,
    isCurrentSessionMaster,
    broadcastPlay,
    broadcastPause,
    handleEnded,
    setIsPlaying
  ]);

  // Listen for custom Safari interaction events
  useEffect(() => {
    const handleSafariInteraction = (event) => {
      const { type, shouldPlay } = event.detail;
      
      if (type === 'play-pause' && audioCore.prepareForNewTrack) {
        audioCore.prepareForNewTrack();
      }
    };

    document.addEventListener('safari-user-interaction', handleSafariInteraction);
    
    return () => {
      document.removeEventListener('safari-user-interaction', handleSafariInteraction);
    };
  }, [audioCore]);

  // Sync display players when view changes
  useEffect(() => {
    syncAllPlayers(true);
  }, [shouldShowFullPagePlayer, shouldShowMobilePlayer, isFullPageVisible, syncAllPlayers]);

  // Handle visibility change to sync when tab becomes visible
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        syncAllPlayers(true);
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [syncAllPlayers]);

  return {
    syncAllPlayers,
    handleSeeked,
    preventDefaultAudioEvents,
    handlePlayPause,
    masterSession,
    currentSessionId,
    isCurrentSessionMaster,
    sessionName
  };
}; 