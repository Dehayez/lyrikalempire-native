import React from 'react';
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
  if (!isPlaying || !currentBeat) {
    return null;
  }

  // Only show indicator on OTHER tabs/browsers, not the one currently playing
  if (isCurrentSessionMaster) {
    return null;
  }

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
          <IoHeadsetSharp /> Playing on {masterDisplayName}
        </span>
    </div>
  );
};

export default PlayingIndicator; 