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
  const { socket, emitAudioPlay, emitAudioPause, emitAudioSeek, emitBeatChange, emitStateRequest, emitStateResponse } = useWebSocket();
  const isProcessingRemoteEvent = useRef(false);
  const sessionId = useRef(generateSessionId());
  const [masterSession, setMasterSession] = useState(null);

  // Set this session as master when it starts playing
  useEffect(() => {
    if (isPlaying && currentBeat) {
      // Only set as master if no master exists yet
      if (!masterSession) {
        console.log('👑 Setting self as master session (started playing)');
        setMasterSession(sessionId.current);
      }
    }
  }, [isPlaying, currentBeat, masterSession]);

  // Request current state when socket connects
  useEffect(() => {
    if (socket && socket.connected) {
      // Add a small delay to ensure all components are initialized
      const timer = setTimeout(() => {
        console.log('🔄 New tab requesting state from other tabs (initial)');
        emitStateRequest();
        
        // Try again after a longer delay to ensure everything is loaded
        setTimeout(() => {
          console.log('🔄 New tab requesting state from other tabs (retry)');
          emitStateRequest();
        }, 2000);
      }, 500); // 500ms delay
      
      return () => clearTimeout(timer);
    }
  }, [socket, emitStateRequest]);

  // Emit play event to other tabs
  const broadcastPlay = useCallback(() => {
    if (currentBeat && !isProcessingRemoteEvent.current) {
      // Only set this session as master if there isn't already a master
      if (!masterSession) {
        console.log('👑 Setting self as master session (no existing master)');
        setMasterSession(sessionId.current);
      } else {
        console.log('ℹ️ Not changing master session, using existing:', masterSession);
      }
      
      const browserName = getShortBrowserName();
      emitAudioPlay({
        beatId: currentBeat.id,
        timestamp: Date.now(),
        currentTime: audioCore.getCurrentTime(),
        sessionId: masterSession || sessionId.current, // Use existing master if available
        sessionName: browserName
      });
    }
  }, [currentBeat, emitAudioPlay, audioCore, masterSession]);

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
    if (!socket) {
      console.log('⚠️ Socket not available for event listeners');
      return;
    }
    
    console.log('🔄 Setting up socket event listeners', { 
      socketConnected: socket.connected, 
      socketId: socket.id,
      currentBeat: currentBeat?.title || 'none',
      isPlaying
    });

    // Listen for socket connection and request state
    const handleConnect = () => {
      console.log('🔌 Socket connected, requesting state...');
      setTimeout(() => {
        emitStateRequest();
      }, 100);
    };

    const handleRemotePlay = (data) => {
      // Only update master session if we don't have one yet
      if (!masterSession) {
        console.log('👑 Setting master session from remote play event:', data.sessionId);
        setMasterSession(data.sessionId);
      } else {
        console.log('ℹ️ Keeping existing master session:', masterSession);
      }
      
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

    const handleStateRequest = () => {
      console.log('📨 Received state request. Master:', masterSession === sessionId.current, 'Beat:', !!currentBeat, 'Playing:', isPlaying, 'AudioReady:', audioCore.isReady(), 'SessionId:', sessionId.current);
      
      // Debug audio state
      if (currentBeat) {
        console.log('🎵 Current beat details:', { 
          title: currentBeat.title, 
          id: currentBeat.id,
          audioSrc: currentBeat.audio,
          audioPlayerSrc: audioCore.playerRef.current?.audio?.current?.src || 'no src'
        });
      }
      
      // If this tab has current state and is playing, respond with it
      // Don't just rely on masterSession since it might not be set correctly
      if (currentBeat && isPlaying) {
        const browserName = getShortBrowserName();
        const stateData = {
          beatId: currentBeat.id,
          beat: currentBeat,
          isPlaying: isPlaying,
          currentTime: audioCore.getCurrentTime(),
          // Always send the master session ID if we have one, otherwise use our own ID
          sessionId: masterSession || sessionId.current,
          sessionName: browserName,
          timestamp: Date.now()
        };
        console.log('📤 Sending state response:', stateData, 'Using master:', masterSession || sessionId.current);
        emitStateResponse(stateData);
      } else {
        console.log('❌ Not responding to state request - no beat or not playing. Details:', {
          hasBeat: !!currentBeat,
          isPlaying,
          masterSession,
          currentSessionId: sessionId.current
        });
      }
    };

    const handleStateResponse = (data) => {
      console.log('📥 Received state response:', data);
      console.log('Current state - Master:', masterSession, 'Playing:', isPlaying, 'Beat:', currentBeat?.title);
      
      // Only accept state if we don't have a master session yet or if we're not playing
      if (!masterSession || !isPlaying) {
        console.log('✅ Accepting state response and syncing...');
        isProcessingRemoteEvent.current = true;
        
        // Set the master session to the RESPONDING session's ID
        // This ensures the original playing tab remains master
        setMasterSession(data.sessionId);
        console.log('👑 Setting master session to:', data.sessionId, '(original playing tab)');
        
        // Set the current beat if different
        if (!currentBeat || currentBeat.id !== data.beatId) {
          console.log('🎵 Setting new beat:', data.beat.title);
          setCurrentBeat(data.beat);
        }
        
        // Set playing state
        if (data.isPlaying) {
          console.log('▶️ Setting playing state to true');
          setIsPlaying(true);
          
          // Set current time
          if (data.currentTime) {
            console.log('⏰ Setting current time to:', data.currentTime);
            audioCore.setCurrentTime(data.currentTime);
          }
          
          // Try to play audio (may fail due to autoplay restrictions)
          setTimeout(() => {
            if (audioCore.isReady() && audioCore.getReadyState() >= 2) {
              console.log('🔊 Attempting to play audio...');
              audioCore.play().then(() => {
                console.log('✅ Audio playing successfully');
              }).catch((error) => {
                console.log('❌ Autoplay failed (expected):', error.message);
              });
            } else {
              console.log('⚠️ Audio not ready for playback');
            }
            isProcessingRemoteEvent.current = false;
          }, 100);
        } else {
          console.log('⏸️ Setting playing state to false');
          setIsPlaying(false);
          audioCore.pause();
          isProcessingRemoteEvent.current = false;
        }
      } else {
        console.log('❌ Ignoring state response - already have master or playing');
      }
    };

    // Log all event registrations
    console.log('📡 Registering socket event handlers');
    
    socket.on('connect', handleConnect);
    socket.on('audio-play', handleRemotePlay);
    socket.on('audio-pause', handleRemotePause);
    socket.on('audio-seek', handleRemoteSeek);
    socket.on('beat-change', handleRemoteBeatChange);
    
    // Add explicit debug for state request/response events
    socket.on('request-state', (data) => {
      console.log('🔔 request-state event received', data);
      handleStateRequest(data);
    });
    
    socket.on('state-response', (data) => {
      console.log('🔔 state-response event received', data);
      handleStateResponse(data);
    });

    return () => {
      console.log('🧹 Cleaning up socket event handlers');
      socket.off('connect', handleConnect);
      socket.off('audio-play', handleRemotePlay);
      socket.off('audio-pause', handleRemotePause);
      socket.off('audio-seek', handleRemoteSeek);
      socket.off('beat-change', handleRemoteBeatChange);
      socket.off('request-state');
      socket.off('state-response');
    };
  }, [socket, currentBeat, isPlaying, audioCore, setIsPlaying, setCurrentBeat, masterSession, sessionId, emitStateResponse, emitStateRequest]);

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