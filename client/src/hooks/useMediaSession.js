import { useEffect, useRef } from 'react';

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
    // Allow disabling Media Session API for debugging Safari mobile issues
    const skipMediaSession = localStorage.getItem('skipMediaSession') === 'true';
    if (skipMediaSession) {
      console.log('🎵 Skipping Media Session setup (disabled via localStorage)');
      return;
    }

    if ('mediaSession' in navigator && currentBeat) {
      console.log('🎵 Setting Media Session metadata:', currentBeat.title);
      // Use artistName from user_id lookup, fallback to currentBeat.artist
      const artist = artistName && artistName !== '\u00A0' ? artistName : (currentBeat.artist || 'Unknown Artist');
      
      // Use artworkUrl (like in audioPlayerUtils) or fallback to placeholder
      const artworkUrl = currentBeat.artworkUrl || currentBeat.artwork || currentBeat.image || 'https://www.lyrikalempire.com/placeholder.png';
      
      const metadata = {
        title: currentBeat.title || 'Unknown Title',
        artist: artist,
        album: currentBeat.album || 'Lyrikal Empire',
        artwork: [
          { src: artworkUrl, sizes: '96x96', type: 'image/png' },
          { src: artworkUrl, sizes: '128x128', type: 'image/png' },
          { src: artworkUrl, sizes: '192x192', type: 'image/png' },
          { src: artworkUrl, sizes: '256x256', type: 'image/png' },
          { src: artworkUrl, sizes: '384x384', type: 'image/png' },
          { src: artworkUrl, sizes: '512x512', type: 'image/png' }
        ]
      };

      try {
        navigator.mediaSession.metadata = new MediaMetadata(metadata);
        console.log('Media metadata updated:', { 
          title: metadata.title, 
          artist: metadata.artist, 
          artwork: artworkUrl,
          source: 'useMediaSession'
        });
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

  // Set up media session handlers
  useEffect(() => {
    // Allow disabling Media Session API for debugging Safari mobile issues
    const skipMediaSession = localStorage.getItem('skipMediaSession') === 'true';
    if (skipMediaSession) {
      console.log('🎵 Skipping Media Session handlers (disabled via localStorage)');
      return;
    }

    if ('mediaSession' in navigator) {
      console.log('🎵 Setting up Media Session action handlers');
      // Set up media session action handlers for playback controls
      navigator.mediaSession.setActionHandler('play', () => handlePlayPause(true));
      navigator.mediaSession.setActionHandler('pause', () => handlePlayPause(false));
      navigator.mediaSession.setActionHandler('previoustrack', handlePrevClick);
      navigator.mediaSession.setActionHandler('nexttrack', onNext);
      
      // Add additional handlers for better control in background/lock screen
      try {
        // Stop handler
        navigator.mediaSession.setActionHandler('stop', () => handlePlayPause(false));
        
        // REMOVE seek handlers to ensure Apple UI shows track controls (previous/next) instead of seek controls
        // This is crucial for PWA apps to show proper track navigation buttons
        navigator.mediaSession.setActionHandler('seekbackward', null);
        navigator.mediaSession.setActionHandler('seekforward', null);
        
        // Seek to position handler (keep this for scrubbing functionality)
        navigator.mediaSession.setActionHandler('seekto', (details) => {
          const audio = document.querySelector('audio[src]') || document.querySelector('audio');
          if (audio && details.seekTime !== undefined && !isNaN(details.seekTime)) {
            audio.currentTime = details.seekTime;
          }
        });

        // Position state for better lock screen integration
        if (navigator.mediaSession.setPositionState) {
          const updatePositionState = () => {
            const audio = document.querySelector('audio[src]') || document.querySelector('audio');
            if (audio && !isNaN(audio.duration) && !isNaN(audio.currentTime)) {
              navigator.mediaSession.setPositionState({
                duration: audio.duration,
                playbackRate: audio.playbackRate,
                position: audio.currentTime
              });
            }
          };

          // Update position state periodically during playback
          const positionInterval = setInterval(() => {
            if (isPlaying) {
              updatePositionState();
            }
          }, 1000);

          // Store interval for cleanup
          return () => {
            clearInterval(positionInterval);
          };
        }
      } catch (error) {
        // Some browsers might not support all handlers - silent fail
      }
    }

    return () => {
      if ('mediaSession' in navigator) {
        // Clean up all handlers on unmount
        navigator.mediaSession.setActionHandler('play', null);
        navigator.mediaSession.setActionHandler('pause', null);
        navigator.mediaSession.setActionHandler('previoustrack', null);
        navigator.mediaSession.setActionHandler('nexttrack', null);
        navigator.mediaSession.setActionHandler('stop', null);
        navigator.mediaSession.setActionHandler('seekto', null);
        // Note: seekbackward and seekforward are already set to null above
      }
    };
  }, [handlePlayPause, handlePrevClick, onNext, isPlaying]);
}; 