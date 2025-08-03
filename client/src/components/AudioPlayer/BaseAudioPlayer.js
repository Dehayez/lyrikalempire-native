import React, { useRef, useEffect } from 'react';
import { useGaplessAudio } from '../../hooks/audioPlayer/useGaplessAudio';
import { usePlaylist } from '../../contexts';
import LoadingIndicator from './LoadingIndicator';
import './BaseAudioPlayer.scss';

const BaseAudioPlayer = ({
  currentBeat,
  isPlaying,
  setIsPlaying,
  onNext,
  onPrev,
  children,
  className = '',
  options = {}
}) => {
  // Get playlist context
  const { playlists, playedPlaylistTitle } = usePlaylist();
  const currentPlaylist = playlists.find(p => p.title === playedPlaylistTitle)?.beats || [];

  // Refs for audio elements
  const audioRef = useRef(null);
  const containerRef = useRef(null);

  // Gapless audio features
  const {
    isLoading,
    loadingProgress,
    loadingPhase,
    playbackState,
    play,
    pause,
    stop,
    setVolume,
    handleTimeUpdate
  } = useGaplessAudio({
    currentBeat,
    playlist: currentPlaylist,
    options: {
      crossfadeDuration: 2,
      preloadCount: 3,
      maxOfflineStorage: 500 * 1024 * 1024,
      priorityTracks: currentPlaylist.slice(0, 5), // Prioritize next 5 tracks
      ...options
    },
    onLoadingProgress: (phase, progress) => {
      // You can add custom loading UI updates here
      console.log(`Loading ${phase}: ${progress}%`);
    },
    onError: (error) => {
      console.error('Audio error:', error);
      // You can add custom error handling here
    }
  });

  // Handle play/pause
  const handlePlayPause = async (shouldPlay) => {
    try {
      if (shouldPlay) {
        await play();
      } else {
        pause();
      }
      setIsPlaying(shouldPlay);
    } catch (error) {
      console.error('Error toggling playback:', error);
    }
  };

  // Handle next track
  const handleNext = async () => {
    stop();
    onNext?.();
  };

  // Handle previous track
  const handlePrev = async () => {
    stop();
    onPrev?.();
  };

  // Update volume
  const handleVolumeChange = (newVolume) => {
    setVolume(newVolume);
  };

  // Sync playback state with isPlaying prop
  useEffect(() => {
    if (isPlaying && playbackState !== 'playing') {
      play();
    } else if (!isPlaying && playbackState === 'playing') {
      pause();
    }
  }, [isPlaying, playbackState, play, pause]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      stop();
    };
  }, [stop]);

  return (
    <div ref={containerRef} className={`base-audio-player ${className}`}>
      {isLoading && (
        <LoadingIndicator 
          progress={loadingProgress} 
          phase={loadingPhase} 
        />
      )}
      {children}
    </div>
  );
};

export default React.memo(BaseAudioPlayer);