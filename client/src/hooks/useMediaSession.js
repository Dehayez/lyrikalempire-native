import { useEffect, useRef } from 'react';

// Helper to get the main audio element
const getAudioElement = () => {
  return document.querySelector('audio[src]') || document.querySelector('audio');
};

export const useMediaSession = ({
  handlePlayPause,
  handlePrevClick,
  onNext,
  currentBeat,
  isPlaying,
  artistName
}) => {
  const wakeLockRef = useRef(null);

  // Set media metadata when currentBeat or artistName changes
  useEffect(() => {
    if ('mediaSession' in navigator && currentBeat) {
      // Use artistName from user_id lookup, fallback to currentBeat.artist
      const artist = artistName && artistName !== '\u00A0' ? artistName : (currentBeat.artist || 'Unknown Artist');
      
      // Use artworkUrl (like in audioPlayerUtils) or fallback to local placeholder
      const artworkUrl = currentBeat.artworkUrl || currentBeat.artwork || currentBeat.image || '/placeholder.png';
      
      const metadata = {
        title: currentBeat.title || 'Unknown Title',
        artist: artist,
        album: currentBeat.album || 'Lyrikal Empire',
        artwork: artworkUrl ? [
          { src: artworkUrl, sizes: '192x192', type: 'image/png' }
        ] : []
      };

      try {
        navigator.mediaSession.metadata = new MediaMetadata(metadata);

      } catch (error) {
        console.error('Failed to set media metadata:', error);
      }
    }
  }, [currentBeat, artistName]);

  // Set playback state when playing status changes
  useEffect(() => {
    if ('mediaSession' in navigator) {
      navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused';
    }
  }, [isPlaying]);

  // Enhanced background playback support for Safari PWA
  useEffect(() => {
    const requestWakeLock = async () => {
      try {
        if ('wakeLock' in navigator && isPlaying) {
          wakeLockRef.current = await navigator.wakeLock.request('screen');
        }
      } catch (err) {
        // Wake lock request failed - this is common and not critical
      }
    };

    const releaseWakeLock = async () => {
      try {
        if (wakeLockRef.current) {
          await wakeLockRef.current.release();
          wakeLockRef.current = null;
        }
      } catch (err) {
        // Wake lock release failed - not critical
      }
    };

    if (isPlaying) {
      requestWakeLock();
    } else {
      releaseWakeLock();
    }

    // Cleanup on unmount
    return () => {
      releaseWakeLock();
    };
  }, [isPlaying]);

  // Set up media session handlers (only once on mount)  
  useEffect(() => {
    if ('mediaSession' in navigator) {
      // Play handler - directly control audio element for iOS reliability
      navigator.mediaSession.setActionHandler('play', () => {
        const audio = getAudioElement();
        if (audio) {
          audio.play().catch(() => {});
        }
        // Always update state
        handlePlayPause(true);
      });
      
      // Pause handler
      navigator.mediaSession.setActionHandler('pause', () => {
        const audio = getAudioElement();
        if (audio) {
          audio.pause();
        }
        handlePlayPause(false);
      });
      
      // Previous track handler
      navigator.mediaSession.setActionHandler('previoustrack', handlePrevClick);
      
      // Next track handler  
      navigator.mediaSession.setActionHandler('nexttrack', onNext);
      
      // Additional handlers
      try {
        navigator.mediaSession.setActionHandler('stop', () => {
          const audio = getAudioElement();
          if (audio) {
            audio.pause();
          }
          handlePlayPause(false);
        });
        
        // Remove seek handlers to show track controls on iOS
        navigator.mediaSession.setActionHandler('seekbackward', null);
        navigator.mediaSession.setActionHandler('seekforward', null);
        
        // Seek to position handler
        navigator.mediaSession.setActionHandler('seekto', (details) => {
          const audio = getAudioElement();
          if (audio && details.seekTime !== undefined && !isNaN(details.seekTime)) {
            audio.currentTime = details.seekTime;
          }
        });

        // Position state for lock screen progress bar
        if (navigator.mediaSession.setPositionState) {
          const updatePositionState = () => {
            const audio = getAudioElement();
            if (audio && !isNaN(audio.duration) && !isNaN(audio.currentTime)) {
              try {
                navigator.mediaSession.setPositionState({
                  duration: audio.duration,
                  playbackRate: audio.playbackRate,
                  position: audio.currentTime
                });
              } catch (e) {
                // Ignore errors
              }
            }
          };

          const positionInterval = setInterval(() => {
            if (isPlaying) {
              updatePositionState();
            }
          }, 1000);

          return () => {
            clearInterval(positionInterval);
          };
        }
      } catch (error) {
        // Silent fail for unsupported handlers
      }
    }

    return () => {
      if ('mediaSession' in navigator) {
        navigator.mediaSession.setActionHandler('play', null);
        navigator.mediaSession.setActionHandler('pause', null);
        navigator.mediaSession.setActionHandler('previoustrack', null);
        navigator.mediaSession.setActionHandler('nexttrack', null);
        navigator.mediaSession.setActionHandler('stop', null);
        navigator.mediaSession.setActionHandler('seekto', null);
      }
    };
  }, [handlePlayPause, handlePrevClick, onNext]);
}; 