import { useCallback, useEffect } from 'react';
import { useAudioCore } from './useAudioCore';
import { useAudioInteractions } from './useAudioInteractions';

export const useAudioPlayer = ({ 
  currentBeat, 
  setCurrentBeat,
  isPlaying, 
  setIsPlaying,
  onNext, 
  onPrev, 
  shuffle, 
  repeat,
  playlist = []
}) => {
  // Use the specialized hooks
  const audioCore = useAudioCore(currentBeat);
  const audioInteractions = useAudioInteractions({
    onNext,
    onPrev,
    currentBeat,
    shuffle,
    repeat,
    audioCore
  });

  // Set up gapless playback with playlist
  useEffect(() => {
    audioCore.setupGaplessPlayback(playlist);
  }, [playlist, audioCore.setupGaplessPlayback]);

  // Optimized beat management functions for Safari
  const handlePlay = useCallback((beat, play, beats) => {
    if (!beat) {
      setCurrentBeat(null);
      setIsPlaying(false);
      return;
    }

    if (currentBeat?.id === beat.id) {
      // Same beat - just toggle play/pause (immediate)
      setIsPlaying(play);
    } else {
      // Different beat - change track (optimized for Safari)
      // Pause current audio immediately
      if (audioCore.playerRef.current?.audio?.current) {
        audioCore.pause();
      }
      
      // Update beat and play state immediately (no delay)
      setCurrentBeat(beat);
      setIsPlaying(play);
    }
  }, [currentBeat?.id, setCurrentBeat, setIsPlaying, audioCore]);

  // Optimized next track handler
  const handleNext = useCallback((beats) => {
    if (!beats.length) return;
    
    let nextIndex;
    if (shuffle) {
      do {
        nextIndex = Math.floor(Math.random() * beats.length);
      } while (nextIndex === beats.findIndex(b => b.id === currentBeat?.id) && beats.length > 1);
    } else {
      const currentIndex = beats.findIndex(b => b.id === currentBeat?.id);
      nextIndex = (currentIndex + 1) % beats.length;
    }
    
    const nextBeat = beats[nextIndex];
    handlePlay(nextBeat, true, beats);
  }, [shuffle, currentBeat?.id, handlePlay]);

  // Optimized previous track handler
  const handlePrev = useCallback((beats) => {
    if (!beats.length) return;
    
    const currentIndex = beats.findIndex(b => b.id === currentBeat?.id);
    const prevIndex = (currentIndex - 1 + beats.length) % beats.length;
    const prevBeat = beats[prevIndex];
    
    handlePlay(prevBeat, true, beats);
  }, [currentBeat?.id, handlePlay]);

  // Destructure audioInteractions to exclude conflicting setCurrentTime
  const { setCurrentTimeState, ...audioInteractionsWithoutSetCurrentTime } = audioInteractions;
  
  return {
    // Audio core functionality
    ...audioCore,
    
    // User interactions (excluding setCurrentTime to avoid conflict)
    ...audioInteractionsWithoutSetCurrentTime,
    
    // High-level beat management
    handlePlay,
    handleNext,
    handlePrev
  };
}; 