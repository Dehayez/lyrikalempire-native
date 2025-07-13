import { useEffect, useCallback } from 'react';
import { syncAllPlayers as syncAllPlayersUtil, getShortBrowserName } from '../utils';
import { useCrossTabSync } from './useCrossTabSync';

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
  // Cross-tab synchronization
  const { 
    broadcastPlay, 
    broadcastPause, 
    broadcastSeek, 
    broadcastBeatChange,
    masterSession,
    currentSessionId,
    isCurrentSessionMaster
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
      forceUpdate
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
    fullPageProgressRef
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

  // Handle seeking while dragging (onSeek event)
  const handleSeek = useCallback((e) => {
    const newTime = e.target.currentTime;
    // Immediately update the main audio player
    audioCore.setCurrentTime(newTime);
    // Update the progress state for immediate visual feedback
    audioInteractions.updateCurrentTime(newTime);
    // Broadcast seek to other tabs
    broadcastSeek(newTime);
    // Sync all players
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
    // Allow timeupdate for progress updates but don't let it conflict
    onTimeUpdate: (e) => {
      // Only update if this is not the main audio player
      if (e.target !== audioCore.playerRef.current?.audio?.current) {
        e.preventDefault();
      }
    },
  };

  // Handle play/pause from UI
  const handlePlayPause = useCallback((play) => {
    audioCore.togglePlayPause(play);
    
    // Also broadcast directly since UI-triggered play/pause might not trigger audio events immediately
    if (play) {
      broadcastPlay();
    } else {
      broadcastPause();
    }
  }, [audioCore, broadcastPlay, broadcastPause]);

  // Handle when song ends - trigger next track or repeat
  const handleEnded = useCallback(() => {
    if (repeat === 'Repeat One') {
      audioCore.setCurrentTime(0);
      audioCore.play();
    } else {
      onNext();
    }
  }, [onNext, repeat, audioCore]);

  // Set up main audio player event listeners
  useEffect(() => {
    const mainAudio = audioCore.playerRef.current?.audio.current;
    if (!mainAudio) return;

    const handleTimeUpdate = () => {
      // Update interaction state with current time
      audioInteractions.updateCurrentTime(audioCore.getCurrentTime());
      syncAllPlayers();
    };

    const handleLoadedMetadata = () => {
      // Wait a bit for the audio to be ready, then sync
      setTimeout(() => syncAllPlayers(true), 100);
    };

    const handleLoadedData = () => {
      syncAllPlayers(true);
      
      // Check if we should start playback now that the audio data is loaded
      if (currentBeat?.audio && isPlaying) {
        const currentSrc = mainAudio.src;
        const hasValidSrc = currentSrc && currentSrc !== '';
        
        if (hasValidSrc && audioCore.isPaused()) {
          audioCore.play().catch(error => {
            if (error.name !== 'AbortError') {
              // Audio play failed after data loaded
            }
          });
        }
      }
    };

    const handleCanPlay = () => {
      syncAllPlayers(true);
      
      // Check if we should start playback now that the audio is ready
      if (currentBeat?.audio && isPlaying) {
        const currentSrc = mainAudio.src;
        const hasValidSrc = currentSrc && currentSrc !== '';
        
        if (hasValidSrc && audioCore.isPaused()) {
          audioCore.play().catch(error => {
            if (error.name !== 'AbortError') {
              // Audio play failed after src ready
            }
          });
        }
      }
    };

    const handlePlay = () => {
      setIsPlaying(true);
      if ('mediaSession' in navigator) {
        navigator.mediaSession.playbackState = 'playing';
      }
      // Broadcast to other tabs
      broadcastPlay();
    };

    const handlePause = () => {
      setIsPlaying(false);
      if ('mediaSession' in navigator) {
        navigator.mediaSession.playbackState = 'paused';
      }
      // Broadcast to other tabs
      broadcastPause();
    };

    const handleVolumeChange = () => {
      // Sync volume changes back to interactions
      const newVolume = mainAudio.volume;
      if (Math.abs(newVolume - audioInteractions.volume) > 0.01) {
        audioInteractions.setVolume(newVolume);
      }
    };

    // Add manual seeking detection for progress bars since onSeek might not be supported
    const addProgressClickListeners = () => {
      setTimeout(() => {
        const progressContainers = document.querySelectorAll('.rhap_progress-container');
        
        progressContainers.forEach((container, index) => {
          const clickHandler = (e) => {
            const progress = e.offsetX / container.offsetWidth;
            const duration = audioCore.getDuration();
            const newTime = progress * duration;
            
            audioCore.setCurrentTime(newTime);
            audioInteractions.updateCurrentTime(newTime);
            broadcastSeek(newTime);
            syncAllPlayers(true);
          };
          
          container.addEventListener('click', clickHandler);
        });
      }, 500); // Wait for DOM to be ready
    };

    // Add all event listeners
    mainAudio.addEventListener('timeupdate', handleTimeUpdate);
    mainAudio.addEventListener('loadedmetadata', handleLoadedMetadata);
    mainAudio.addEventListener('loadeddata', handleLoadedData);
    mainAudio.addEventListener('canplay', handleCanPlay);
    mainAudio.addEventListener('play', handlePlay);
    mainAudio.addEventListener('pause', handlePause);
    mainAudio.addEventListener('ended', handleEnded);
    mainAudio.addEventListener('volumechange', handleVolumeChange);
    
    // Add progress bar click listeners
    addProgressClickListeners();
    
    // Initial sync - force update even when paused
    const initialSync = () => {
      if (audioCore.getReadyState() >= 1) {
        syncAllPlayers(true);
      }
    };
    
    initialSync();
    
    // Also try after a short delay in case metadata isn't loaded yet
    const timeoutId = setTimeout(initialSync, 200);

    return () => {
      clearTimeout(timeoutId);
      mainAudio.removeEventListener('timeupdate', handleTimeUpdate);
      mainAudio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      mainAudio.removeEventListener('loadeddata', handleLoadedData);
      mainAudio.removeEventListener('canplay', handleCanPlay);
      mainAudio.removeEventListener('play', handlePlay);
      mainAudio.removeEventListener('pause', handlePause);
      mainAudio.removeEventListener('ended', handleEnded);
      mainAudio.removeEventListener('volumechange', handleVolumeChange);
    };
  }, [audioCore, audioInteractions, setIsPlaying, syncAllPlayers, handleEnded, currentBeat, isPlaying]);

  // Effect to sync display players when they're rendered or view changes
  useEffect(() => {
    // Simple sync when view changes
    syncAllPlayers(true);
  }, [shouldShowFullPagePlayer, shouldShowMobilePlayer, isFullPageVisible, syncAllPlayers]);

  // Apply current beat and playing state to auto-manage audio lifecycle
  useEffect(() => {
    const audio = audioCore.playerRef.current?.audio?.current;
    if (!audio) return;

    // Add a small delay to prevent race conditions during initialization
    const timeoutId = setTimeout(() => {
      if (currentBeat?.audio && isPlaying && audioCore.isReady()) {
        // Check if audio source is available (handles both blob URLs and signed URLs)
        const currentSrc = audio.src;
        const hasValidSrc = currentSrc && currentSrc !== '';
        
        if (hasValidSrc && audioCore.isPaused()) {
          audioCore.play().catch(error => {
            // Ignore AbortError - it's usually from rapid play/pause calls
            if (error.name !== 'AbortError') {
              // Audio play failed
            }
          });
        }
      } else if (!isPlaying && !audioCore.isPaused()) {
        // Always allow pausing regardless of src
        audioCore.pause();
      }
    }, 100); // 100ms delay to let initialization settle

    return () => clearTimeout(timeoutId);
  }, [currentBeat, isPlaying, audioCore]);



  return {
    syncAllPlayers,
    handleSeeked,
    preventDefaultAudioEvents,
    handlePlayPause,
    masterSession,
    currentSessionId,
    isCurrentSessionMaster,
    sessionName: masterSession ? getShortBrowserName() : null
  };
}; 