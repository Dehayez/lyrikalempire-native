import { slideIn, slideOut } from './';

// Detect Safari browser
const isSafari = () => {
  const ua = navigator.userAgent.toLowerCase();
  return ua.indexOf('safari') !== -1 && ua.indexOf('chrome') === -1;
};

// Safari browser detection
const isSafariBrowser = isSafari();

export const formatTime = (time) => {
  if (isNaN(time)) return '0:00';
  const minutes = Math.floor(time / 60);
  const seconds = Math.floor(time % 60);
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
};

export const toggleFullPagePlayer = ({
  isFullPage,
  setIsFullPage,
  isFullPageVisible,
  setIsFullPageVisible,
  fullPagePlayerRef,
  fullPageOverlayRef,
  lyricsModal,
  isMobileOrTablet,
  isReturningFromLyrics,
  setIsReturningFromLyrics
}) => {
  // Don't allow opening full page player when lyrics modal is open on mobile
  if (isMobileOrTablet && lyricsModal) {
    return;
  }

  if (!isFullPage) {
    setIsFullPage(true);
    setIsReturningFromLyrics(false); // Reset flag when manually opening

    requestAnimationFrame(() => {
      setIsFullPageVisible(true);
      if (fullPagePlayerRef.current) {
        slideIn(fullPagePlayerRef.current);
      }
    });
  } else {
    slideOut(fullPagePlayerRef.current, fullPageOverlayRef.current, () => {
      setIsFullPage(false);
      setIsFullPageVisible(false);
      setIsReturningFromLyrics(false); // Reset flag when closing
    });
  }
};

// Track the last sync time to throttle updates in Safari
let lastSyncTime = 0;
const SAFARI_SYNC_THROTTLE = 100; // ms

// Track global seeking state for mobile touch interactions
let isGlobalSeeking = false;
let seekingTimeout = null;

// Helper to check if any player is currently being seeked
const isAnyPlayerSeeking = () => {
  // Check for our custom seeking class on audio players
  const hasSeekingClass = document.querySelector('.audio-player.seeking, .audio-player--mobile.seeking');
  // Check for react-h5-audio-player's internal dragging state
  const hasRhapDragging = document.querySelector('.rhap_progress-container:active');
  return isGlobalSeeking || hasSeekingClass || hasRhapDragging;
};

// Export functions to control seeking state from outside
export const setSeekingState = (isSeeking) => {
  isGlobalSeeking = isSeeking;
  
  // Clear any existing timeout
  if (seekingTimeout) {
    clearTimeout(seekingTimeout);
    seekingTimeout = null;
  }
  
  // Auto-reset seeking state after a longer delay if not explicitly cleared
  if (isSeeking) {
    seekingTimeout = setTimeout(() => {
      isGlobalSeeking = false;
    }, 1000);
  }
};

export const syncAllPlayers = ({
  playerRef,
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
  forceUpdate = false,
  currentBeat
}) => {
  const mainAudio = playerRef.current?.audio.current;
  if (!mainAudio) return;

  // Check if user is currently seeking - don't update progress bars while dragging
  const isDragging = isAnyPlayerSeeking();
  if (isDragging && !forceUpdate) {
    return;
  }

  // Throttle updates in Safari to prevent maximum update depth exceeded
  const now = Date.now();
  if (isSafariBrowser && !forceUpdate && now - lastSyncTime < SAFARI_SYNC_THROTTLE) {
    return;
  }
  lastSyncTime = now;

  const currentTime = mainAudio.currentTime || 0;
  // Use database duration instead of audio element duration for accuracy
  const duration = currentBeat?.duration || mainAudio.duration || 0;
  
  // Clamp currentTime to prevent progress from exceeding 100%
  const clampedCurrentTime = Math.min(currentTime, duration);
  
  // Update state - use requestAnimationFrame to avoid state update loops in Safari
  requestAnimationFrame(() => {
    setCurrentTimeState(clampedCurrentTime);
    setDuration(duration);
    setProgress(duration ? clampedCurrentTime / duration : 0);
  });

  // Update waveform - only if we have a valid wavesurfer instance and duration
  if (wavesurfer.current && duration && wavesurfer.current.getDuration) {
    try {
      wavesurfer.current.seekTo(clampedCurrentTime / duration);
    } catch (error) {
      // Silently handle waveform errors
    }
  }

  // Force update display players by manipulating their progress bars directly
  const updateProgressBar = (playerRef, playerName) => {
    if (playerRef?.current) {
      const container = playerRef.current.container.current;
      if (!container) return;
      
      // Use requestAnimationFrame for smoother updates
      requestAnimationFrame(() => {
        const progressBar = container.querySelector('.rhap_progress-filled');
        const progressIndicator = container.querySelector('.rhap_progress-indicator');
        const currentTimeEl = container.querySelector('.rhap_current-time');
        const durationEl = container.querySelector('.rhap_total-time');
        
        if (progressBar) {
          const progressPercent = duration ? Math.min((clampedCurrentTime / duration) * 100, 100) : 0;
          progressBar.style.width = `${progressPercent}%`;
          progressBar.style.transition = 'none';
          
          if (progressIndicator) {
            progressIndicator.style.left = `${progressPercent}%`;
            progressIndicator.style.transition = 'none';
          }
        }
        
        if (currentTimeEl) {
          currentTimeEl.textContent = formatTime(clampedCurrentTime);
        }
        
        if (durationEl) {
          durationEl.textContent = formatTime(duration);
        }
      });
    }
  };

  // Update all display players that are currently rendered
  if (shouldShowMobilePlayer && mobilePlayerRef?.current) {
    updateProgressBar(mobilePlayerRef, 'MOBILE');
  }
  if (!isMobileOrTablet && desktopPlayerRef?.current) {
    updateProgressBar(desktopPlayerRef, 'DESKTOP');
  }
  if (shouldShowFullPagePlayer && isFullPageVisible && fullPageProgressRef?.current) {
    updateProgressBar(fullPageProgressRef, 'FULLPAGE');
  }
}; 