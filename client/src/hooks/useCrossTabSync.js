import { useEffect, useCallback, useRef, useState } from 'react';
import { useWebSocket } from '../contexts';
import { getShortBrowserName } from '../utils';

// Generate a unique session ID for this tab
const generateSessionId = () => {
  return `tab_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

export const useCrossTabSync = ({
  currentBeat,
  isPlaying,
  audioCore,
  setIsPlaying,
  setCurrentBeat,
  currentTime
}) => {
  const { socket, emitAudioPlay, emitAudioPause, emitAudioSeek, emitBeatChange } = useWebSocket();
  const isProcessingRemoteEvent = useRef(false);
  const sessionId = useRef(generateSessionId());
  const [masterSession, setMasterSession] = useState(null);

  // Set this session as master when it starts playing
  useEffect(() => {
    if (isPlaying && currentBeat && !masterSession) {
      setMasterSession(sessionId.current);
    }
  }, [isPlaying, currentBeat, masterSession]);

  // Emit play event to other tabs
  const broadcastPlay = useCallback(() => {
    if (currentBeat && !isProcessingRemoteEvent.current) {
      setMasterSession(sessionId.current);
      const browserName = getShortBrowserName();
      emitAudioPlay({
        beatId: currentBeat.id,
        timestamp: Date.now(),
        currentTime: audioCore.getCurrentTime(),
        sessionId: sessionId.current,
        sessionName: browserName
      });
    }
  }, [currentBeat, emitAudioPlay, audioCore]);

  // Emit pause event to other tabs
  const broadcastPause = useCallback(() => {
    if (currentBeat && !isProcessingRemoteEvent.current) {
      const browserName = getShortBrowserName();
      emitAudioPause({
        beatId: currentBeat.id,
        timestamp: Date.now(),
        currentTime: audioCore.getCurrentTime(),
        sessionId: sessionId.current,
        sessionName: browserName
      });
    }
  }, [currentBeat, emitAudioPause, audioCore]);

  // Emit seek event to other tabs
  const broadcastSeek = useCallback((time) => {
    if (currentBeat) {
      emitAudioSeek({
        beatId: currentBeat.id,
        timestamp: Date.now(),
        currentTime: time
      });
    }
  }, [currentBeat, emitAudioSeek]);

  // Emit beat change event to other tabs
  const broadcastBeatChange = useCallback((beat) => {
    emitBeatChange({
      beatId: beat.id,
      timestamp: Date.now(),
      beat: beat
    });
  }, [emitBeatChange]);

  // Listen for events from other tabs
  useEffect(() => {
    if (!socket) return;

    const handleRemotePlay = (data) => {
      // Update master session info
      setMasterSession(data.sessionId);
      
      if (currentBeat && data.beatId === currentBeat.id) {
        isProcessingRemoteEvent.current = true;
        setIsPlaying(true);
        
        // Force audio to play - browsers require user interaction for autoplay
        const startTime = Date.now();
        const tryPlay = () => {
          if (audioCore.isReady() && audioCore.getReadyState() >= 2) {
            audioCore.play().then(() => {
              isProcessingRemoteEvent.current = false;
            }).catch((error) => {
              // If play fails (usually due to lack of user interaction), just update state
              // This allows the UI to show the correct play state even if audio can't play
              isProcessingRemoteEvent.current = false;
            });
          } else if (Date.now() - startTime < 1000) {
            // If audio isn't ready, try again after a short delay (max 1 second)
            setTimeout(tryPlay, 100);
          } else {
            // Give up after 1 second and just clear the flag
            isProcessingRemoteEvent.current = false;
          }
        };
        
        tryPlay();
      }
    };

    const handleRemotePause = (data) => {
      if (currentBeat && data.beatId === currentBeat.id) {
        isProcessingRemoteEvent.current = true;
        setIsPlaying(false);
        audioCore.pause();
        isProcessingRemoteEvent.current = false;
      }
    };

    const handleRemoteSeek = (data) => {
      if (currentBeat && data.beatId === currentBeat.id) {
        isProcessingRemoteEvent.current = true;
        audioCore.setCurrentTime(data.currentTime);
        // Clear the flag after a short delay to avoid interfering with seek events
        setTimeout(() => {
          isProcessingRemoteEvent.current = false;
        }, 100);
      }
    };

    const handleRemoteBeatChange = (data) => {
      // Only update if it's a different beat
      if (!currentBeat || currentBeat.id !== data.beatId) {
        setCurrentBeat(data.beat);
      }
    };

    socket.on('audio-play', handleRemotePlay);
    socket.on('audio-pause', handleRemotePause);
    socket.on('audio-seek', handleRemoteSeek);
    socket.on('beat-change', handleRemoteBeatChange);

    return () => {
      socket.off('audio-play', handleRemotePlay);
      socket.off('audio-pause', handleRemotePause);
      socket.off('audio-seek', handleRemoteSeek);
      socket.off('beat-change', handleRemoteBeatChange);
    };
  }, [socket, currentBeat, isPlaying, audioCore, setIsPlaying, setCurrentBeat]);

  return {
    broadcastPlay,
    broadcastPause,
    broadcastSeek,
    broadcastBeatChange,
    isProcessingRemoteEvent: () => isProcessingRemoteEvent.current,
    masterSession,
    currentSessionId: sessionId.current,
    isCurrentSessionMaster: masterSession === sessionId.current
  };
}; 