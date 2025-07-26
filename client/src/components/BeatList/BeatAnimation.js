import React, { useState, useEffect } from 'react';
import { usePlaylist, useBeat } from '../../contexts';
import './BeatAnimation.scss';

const BeatAnimation = ({ beat, currentBeat, isPlaying, index, showPlayButton = true }) => {
  const [delays, setDelays] = useState([0, 0, 0, 0]);
  const [durations, setDurations] = useState([0, 0, 0, 0]);
  const { isSamePlaylist } = usePlaylist();
  const { hoveredBeat } = useBeat();

  useEffect(() => {
    setDelays([Math.random(), Math.random(), Math.random(), Math.random()]);
    setDurations([1 + Math.random(), 1 + Math.random(), 1 + Math.random(), 1 + Math.random()]);
  }, []);

  return (
    currentBeat && currentBeat.id === beat.id && isPlaying && isSamePlaylist ? 
    <div className="animation-container" style={{ animation: `barAnimation ${170 / beat.bpm}s infinite`, opacity: hoveredBeat === beat.id ? 0 : 1 }}>
        <div className="bar" style={{ animationDelay: `-${delays[0]}s`, animationDuration: `${durations[0]}s` }}></div>
        <div className="bar" style={{ animationDelay: `-${delays[1]}s`, animationDuration: `${durations[1]}s` }}></div>
        <div className="bar" style={{ animationDelay: `-${delays[2]}s`, animationDuration: `${durations[2]}s` }}></div>
        <div className="bar" style={{ animationDelay: `-${delays[3]}s`, animationDuration: `${durations[3]}s` }}></div>
      </div> : 
      <div className='beat-row__index-number' style={{ 
        zIndex: 1, 
        minWidth: '30px', 
        color: currentBeat && currentBeat.id === beat.id && isSamePlaylist ? '#FFCC44' : '', 
        opacity: (hoveredBeat === beat.id && showPlayButton) ? 0 : 1 
      }}>{index + 1}</div>
  );
};

export default BeatAnimation;