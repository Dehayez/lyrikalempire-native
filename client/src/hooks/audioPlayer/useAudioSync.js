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

const isIOS = () => /iPhone|iPad|iPod/i.test(navigator.userAgent);

const isPWA = () => {
  if (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) {
    return true;
  }
  if (window.navigator.standalone === true) {
    return true;
  }
  return false;
};

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
  // WebSocket functionality disabled - use empty function
  const wsEmitStateRequest = () => {};
  
  // Store onNext in a ref to prevent handleEnded from recreating when onNext changes
  const onNextRef = useRef(onNext);
  useEffect(() => {
    onNextRef.current = onNext;
  }, [onNext]);
  
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

  // Track if we're in iOS PWA mode for special handling
  const isIOSPWA = isIOS() && isPWA();
  const isAutoPlayAttemptRef = useRef(false);

  // Handle when song ends
  const handleEnded = useCallback(() => {
    // Immediately reset current time and progress to prevent visual glitches with next song
    audioCore.setCurrentTime(0);
    setCurrentTimeState(0);
    setProgress(0);
    
    // Force sync all players with reset values
    syncAllPlayers(true);
    
    // Only the master tab should handle the ended event
    if (isCurrentSessionMaster) {
      if (repeat === 'Repeat One') {
        if (audioCore.prepareForNewTrack) {
          audioCore.prepareForNewTrack();
        }
        audioCore.setCurrentTime(0);
        
        // On iOS PWA, mark this as an auto-play attempt after track end
        if (isIOSPWA) {
          isAutoPlayAttemptRef.current = true;
        }
        
        audioCore.play({ isAutoPlayAfterEnd: true }).then(result => {
          if (result && !result.success && result.reason === 'autoplay-blocked') {
            // Autoplay was blocked on iOS PWA, reset playing state
            setIsPlaying(false);
          }
          isAutoPlayAttemptRef.current = false;
        }).catch(error => {
          console.warn('Repeat play failed:', error);
          if (isIOSPWA) {
            setIsPlaying(false);
          }
          isAutoPlayAttemptRef.current = false;
        });
      } else {
        if (audioCore.prepareForNewTrack) {
          audioCore.prepareForNewTrack();
        }
        
        // On iOS PWA, mark this as an auto-play attempt
        if (isIOSPWA) {
          isAutoPlayAttemptRef.current = true;
        }
        
        onNextRef.current?.();
      }
    }
  }, [repeat, audioCore, isCurrentSessionMaster, setCurrentTimeState, setProgress, syncAllPlayers, isIOSPWA, setIsPlaying]);

  // Set up main audio player event listeners
  useEffect(() => {
    const mainAudio = audioCore.playerRef.current?.audio.current;
    if (!mainAudio) return;
    
    // Only handle events that correspond to the currently selected beat
    const isEventForCurrentBeat = () => {
      const src = mainAudio?.src || '';
      const beatKey = currentBeat?.audio || '';
      
      // Decode the URL to handle spaces and special characters
      try {
        const decodedSrc = decodeURIComponent(src);
        return !!beatKey && decodedSrc.includes(beatKey);
      } catch (e) {
        // Fallback to original check if decoding fails
        return !!beatKey && src.includes(beatKey);
      }
    };

    // Ensure non-master tabs have their audio muted
    if (!isCurrentSessionMaster && mainAudio) {
      mainAudio.muted = true;
    } else if (isCurrentSessionMaster && mainAudio) {
      mainAudio.muted = false;
    }

    const handleTimeUpdate = () => {
      // Skip updates if user is seeking (dragging progress bar)
      const isUserSeeking = document.querySelector('.audio-player.seeking, .audio-player--mobile.seeking');
      if (isUserSeeking) {
        return;
      }
      
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
      if (!isEventForCurrentBeat()) return;
      // Reset progress when new audio metadata loads to prevent carryover from previous song
      setCurrentTimeState(0);
      setProgress(0);
      audioCore.setCurrentTime(0);
      
      setTimeout(() => syncAllPlayers(true), 100);
    };

    const handleLoadedData = () => {
      if (!isEventForCurrentBeat()) return;
      
      // Ensure progress starts at 0 for new audio data
      if (mainAudio.currentTime > 0) {
        audioCore.setCurrentTime(0);
        setCurrentTimeState(0);
        setProgress(0);
      }
      
      syncAllPlayers(true);
      
      // Check if we should start playback
      if (currentBeat?.audio && isPlaying) {
        const currentSrc = mainAudio.src;
        const hasValidSrc = currentSrc && currentSrc !== '';
        
        if (hasValidSrc && audioCore.isPaused() && isCurrentSessionMaster) {
          // On iOS PWA, if this is an auto-play attempt after track end, handle it specially
          const isAutoPlayAttempt = isIOSPWA && isAutoPlayAttemptRef.current;
          
          audioCore.play({ isAutoPlayAfterEnd: isAutoPlayAttempt }).then(result => {
            if (result && !result.success && result.reason === 'autoplay-blocked') {
              // Autoplay was blocked, reset playing state so UI is correct
              setIsPlaying(false);
            }
            isAutoPlayAttemptRef.current = false;
          }).catch(error => {
            console.warn('Auto-play failed on loaded data:', error);
            if (isIOSPWA && isAutoPlayAttemptRef.current) {
              setIsPlaying(false);
            }
            isAutoPlayAttemptRef.current = false;
          });
        }
      }
    };

    const handleCanPlay = () => {
      if (!isEventForCurrentBeat()) return;
      syncAllPlayers(true);
      
      // Check if we should start playback
      if (currentBeat?.audio && isPlaying) {
        const currentSrc = mainAudio.src;
        const hasValidSrc = currentSrc && currentSrc !== '';
        
        if (hasValidSrc && audioCore.isPaused() && isCurrentSessionMaster) {
          // On iOS PWA, if this is an auto-play attempt after track end, handle it specially
          const isAutoPlayAttempt = isIOSPWA && isAutoPlayAttemptRef.current;
          
          audioCore.play({ isAutoPlayAfterEnd: isAutoPlayAttempt }).then(result => {
            if (result && !result.success && result.reason === 'autoplay-blocked') {
              // Autoplay was blocked, reset playing state so UI is correct
              setIsPlaying(false);
            }
            isAutoPlayAttemptRef.current = false;
          }).catch(error => {
            console.warn('Auto-play failed on can play:', error);
            if (isIOSPWA && isAutoPlayAttemptRef.current) {
              setIsPlaying(false);
            }
            isAutoPlayAttemptRef.current = false;
          });
        }
      }
    };

    const handlePlay = () => {
      if (!isEventForCurrentBeat()) return;
      setIsPlaying(true);
      if ('mediaSession' in navigator) {
        navigator.mediaSession.playbackState = 'playing';
      }
      broadcastPlay();
    };

    const handlePause = () => {
      if (!isEventForCurrentBeat()) return;
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

    const handleEndedImmediate = () => {
      // Call ended handler without delay to reset UI instantly
      handleEnded();
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
      ['ended', handleEndedImmediate]
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
    setIsPlaying,
    isIOSPWA,
    setCurrentTimeState,
    setProgress
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

  // Listen for Safari autoplay blocked events (iOS PWA)
  useEffect(() => {
    const handleAutoplayBlocked = (event) => {
      const { needsUserInteraction, isAutoPlayAfterEnd } = event.detail;
      
      if (needsUserInteraction && isAutoPlayAfterEnd) {
        // Autoplay was blocked after a track ended, reset the playing state
        // This ensures the play button shows correctly and will work on next tap
        setIsPlaying(false);
        isAutoPlayAttemptRef.current = false;
      }
    };

    window.addEventListener('safari-autoplay-blocked', handleAutoplayBlocked);
    
    return () => {
      window.removeEventListener('safari-autoplay-blocked', handleAutoplayBlocked);
    };
  }, [setIsPlaying]);

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