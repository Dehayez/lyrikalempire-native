import { useEffect } from 'react';

export const useMediaSession = ({
  handlePlayPause,
  handlePrevClick,
  onNext
}) => {
  useEffect(() => {
    if ('mediaSession' in navigator) {
      // Set up media session action handlers for playback controls
      navigator.mediaSession.setActionHandler('play', () => handlePlayPause(true));
      navigator.mediaSession.setActionHandler('pause', () => handlePlayPause(false));
      navigator.mediaSession.setActionHandler('previoustrack', handlePrevClick);
      navigator.mediaSession.setActionHandler('nexttrack', onNext);
      
      // Add additional handlers for better control in background/lock screen
      try {
        // Stop handler (optional)
        navigator.mediaSession.setActionHandler('stop', () => handlePlayPause(false));
        
        // Seek handlers (optional)
        navigator.mediaSession.setActionHandler('seekbackward', (details) => {
          const skipTime = details.seekOffset || 10;
          const audio = document.querySelector('audio');
          if (audio) {
            audio.currentTime = Math.max(0, audio.currentTime - skipTime);
          }
        });
        
        navigator.mediaSession.setActionHandler('seekforward', (details) => {
          const skipTime = details.seekOffset || 10;
          const audio = document.querySelector('audio');
          if (audio) {
            audio.currentTime = Math.min(audio.duration, audio.currentTime + skipTime);
          }
        });
        
        // Seek to position handler (optional)
        navigator.mediaSession.setActionHandler('seekto', (details) => {
          const audio = document.querySelector('audio');
          if (audio && details.seekTime !== undefined) {
            audio.currentTime = details.seekTime;
          }
        });
      } catch (error) {
        // Some browsers might not support all handlers
        console.log('MediaSession: Some actions not supported', error);
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
        navigator.mediaSession.setActionHandler('seekbackward', null);
        navigator.mediaSession.setActionHandler('seekforward', null);
        navigator.mediaSession.setActionHandler('seekto', null);
      }
    };
  }, [handlePlayPause, handlePrevClick, onNext]);
}; 