import React from 'react';
import { IoPlaySharp, IoPauseSharp } from "react-icons/io5";
import { useBeat } from '../../contexts';
import { IconButton } from '../Buttons';
import './PlayPauseButton.scss';

const PlayPauseButton = ({ beat, handlePlayPause, currentBeat, isPlaying, index }) => {
  const isCurrentBeatPlaying = currentBeat?.id === beat.id && isPlaying;
  const { hoveredBeat } = useBeat();

  return (
    <IconButton
      className="icon-button--play-pause"
      onClick={() => handlePlayPause(beat)}
      style={{ opacity: hoveredBeat === `${beat.id}-${index}` ? 1 : 0 }}
      ariaLabel={isCurrentBeatPlaying ? 'Pause' : 'Play'}
    >
      {isCurrentBeatPlaying ? <IoPauseSharp/> : <IoPlaySharp/>}
    </IconButton>
  );
};

export default PlayPauseButton;