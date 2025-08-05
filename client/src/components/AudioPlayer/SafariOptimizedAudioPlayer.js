import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useAudioState2 } from '../../hooks/audioPlayer/useAudioState2';
import { useAudioPlayer } from '../../hooks/audioPlayer/useAudioPlayer';
import SafariAudioPlayer from './SafariAudioPlayer';
import SafariAudioControls from './AudioControls/SafariAudioControls';
import { isSafari } from '../../utils/safariOptimizations';

/**
 * Ultra-optimized Safari audio player component
 * Combines all optimizations for maximum performance
 */
const SafariOptimizedAudioPlayer = ({
  currentBeat,
  setCurrentBeat,
  isPlaying,
  setIsPlaying,
  onNext,
  onPrev,
  shuffle,
  repeat,
  playlist = [],
  className = ''
}) => {
  const [volume, setVolume] = useState(1);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  
  const audioRef = useRef(null);

  // Ultra-optimized audio state
  const audioState = useAudioState2({
    currentBeat,
    playlist,
    onError: (error) => console.error('Audio error:', error)
  });

  // Ultra-optimized audio player
  const audioPlayer = useAudioPlayer({
    currentBeat,
    setCurrentBeat,
    isPlaying,
    setIsPlaying,
    onNext,
    onPrev,
    shuffle,
    repeat,
    playlist
  });

  // Ultra-fast time update handler
  const handleTimeUpdate = useCallback((time, dur) => {
    setCurrentTime(time);
    setDuration(dur);
  }, []);

  // Ultra-fast volume handler
  const handleVolumeChange = useCallback((newVolume) => {
    setVolume(newVolume);
  }, []);

  // Ultra-fast play handler
  const handlePlay = useCallback(() => {
    setIsPlaying(true);
  }, [setIsPlaying]);

  // Ultra-fast pause handler
  const handlePause = useCallback(() => {
    setIsPlaying(false);
  }, [setIsPlaying]);

  // Ultra-fast next handler
  const handleNext = useCallback(() => {
    if (onNext) {
      onNext(playlist);
    } else {
      audioPlayer.handleNext(playlist);
    }
  }, [onNext, audioPlayer, playlist]);

  // Ultra-fast previous handler
  const handlePrev = useCallback(() => {
    if (onPrev) {
      onPrev(playlist);
    } else {
      audioPlayer.handlePrev(playlist);
    }
  }, [onPrev, audioPlayer, playlist]);

  // Ultra-fast seek handler
  const handleSeek = useCallback((time) => {
    if (audioRef.current) {
      audioRef.current.currentTime = time;
    }
  }, []);

  // Set up keyboard shortcuts for Safari
  useEffect(() => {
    if (!isSafari()) return;

    const handleKeyDown = (e) => {
      // Prevent shortcuts when typing in inputs
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
        return;
      }

      switch (e.code) {
        case 'Space':
          e.preventDefault();
          if (isPlaying) {
            handlePause();
          } else {
            handlePlay();
          }
          break;
        case 'ArrowRight':
          e.preventDefault();
          handleNext();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          handlePrev();
          break;
        case 'ArrowUp':
          e.preventDefault();
          handleVolumeChange(Math.min(1, volume + 0.1));
          break;
        case 'ArrowDown':
          e.preventDefault();
          handleVolumeChange(Math.max(0, volume - 0.1));
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown, { passive: false });
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPlaying, handlePlay, handlePause, handleNext, handlePrev, handleVolumeChange, volume]);

  return (
    <div className={`safari-optimized-audio-player ${className}`}>
      {/* Hidden audio element */}
      <SafariAudioPlayer
        ref={audioRef}
        audioSrc={audioState.audioSrc}
        isPlaying={isPlaying}
        volume={volume}
        onPlay={handlePlay}
        onPause={handlePause}
        onEnded={handleNext}
        onTimeUpdate={handleTimeUpdate}
        onDurationChange={(dur) => setDuration(dur)}
        onError={(error) => console.error('Audio error:', error)}
        onReady={() => console.log('Audio ready')}
      />

      {/* Ultra-optimized controls */}
      <SafariAudioControls
        isPlaying={isPlaying}
        onPlay={handlePlay}
        onPause={handlePause}
        onNext={handleNext}
        onPrev={handlePrev}
        className="safari-audio-controls--main"
        iconSize={28}
      />

      {/* Progress bar */}
      <div className="safari-progress-container">
        <div 
          className="safari-progress-bar"
          onClick={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const clickX = e.clientX - rect.left;
            const percentage = clickX / rect.width;
            const seekTime = percentage * duration;
            handleSeek(seekTime);
          }}
          style={{
            width: '100%',
            height: '4px',
            backgroundColor: '#e0e0e0',
            borderRadius: '2px',
            cursor: 'pointer',
            position: 'relative'
          }}
        >
          <div 
            className="safari-progress-fill"
            style={{
              width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%`,
              height: '100%',
              backgroundColor: '#007AFF',
              borderRadius: '2px',
              transition: 'width 0.1s ease'
            }}
          />
        </div>
        
        {/* Time display */}
        <div className="safari-time-display" style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
          {formatTime(currentTime)} / {formatTime(duration)}
        </div>
      </div>

      {/* Volume control */}
      <div className="safari-volume-container">
        <input
          type="range"
          min="0"
          max="1"
          step="0.01"
          value={volume}
          onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
          style={{
            width: '80px',
            height: '4px',
            borderRadius: '2px',
            outline: 'none',
            cursor: 'pointer'
          }}
        />
      </div>
    </div>
  );
};

// Ultra-fast time formatter
const formatTime = (seconds) => {
  if (!seconds || isNaN(seconds)) return '0:00';
  
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

export default React.memo(SafariOptimizedAudioPlayer); 