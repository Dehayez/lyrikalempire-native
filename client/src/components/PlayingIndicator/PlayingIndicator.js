import React, { useEffect } from 'react';
import './PlayingIndicator.scss';
import { IoHeadsetSharp } from "react-icons/io5";
import { getShortBrowserName } from '../../utils';

const PlayingIndicator = ({ 
  masterSession, 
  currentSessionId, 
  isCurrentSessionMaster, 
  isPlaying,
  currentBeat,
  sessionName
}) => {
  // Add debugging to check props
  useEffect(() => {
    console.log('PlayingIndicator props:', { 
      masterSession, 
      currentSessionId, 
      isCurrentSessionMaster, 
      isPlaying: !!isPlaying,
      hasBeat: !!currentBeat,
      sessionName
    });
  }, [masterSession, currentSessionId, isCurrentSessionMaster, isPlaying, currentBeat, sessionName]);

  // Show indicator if we have a current beat, regardless of play state
  if (!currentBeat) {
    return null;
  }

  // Only show indicator on non-master tabs
  if (isCurrentSessionMaster) {
    console.log('🎧 This is the master tab - hiding PlayingIndicator');
    return null;
  }
  
  console.log('🎧 PlayingIndicator visible on non-master tab', { 
    masterSession, 
    currentSessionId, 
    isCurrentSessionMaster 
  });

  const getSessionDisplayName = (sessionId) => {
    if (!sessionId) return 'Unknown Browser';
    // If we have a sessionName from WebSocket, use it
    if (sessionName) {
      return sessionName;
    }

    const browserName = getShortBrowserName();
    return browserName || 'Unknown Browser';
  };

  const masterDisplayName = getSessionDisplayName(masterSession);

  return (
    <div className="playing-indicator">
        <span className="playing-indicator__label">
          <IoHeadsetSharp /> {isPlaying ? 'Playing on' : 'Paused on'} {masterDisplayName}
        </span>
    </div>
  );
};

export default PlayingIndicator; 