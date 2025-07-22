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

  // Show indicator if we have a current beat, regardless of play state
  if (!currentBeat) {
    return null;
  }

  // Don't show indicator if there's no master session (master tab was closed)
  if (!masterSession) {
    return null;
  }

  // Only show indicator on non-master tabs
  // Make sure we're strictly checking if this tab is the master
  if (isCurrentSessionMaster === true || currentSessionId === masterSession) {
    return null;
  }

  // Use the sessionName passed from the parent component
  // This is the name of the master browser session, not the current browser
  const masterDisplayName = sessionName || 'Other Browser';

  return (
    <div className="playing-indicator">
        <span className="playing-indicator__label">
          <IoHeadsetSharp /> {isPlaying ? 'Playing on' : 'Paused on'} {masterDisplayName}
        </span>
    </div>
  );
};

export default PlayingIndicator; 