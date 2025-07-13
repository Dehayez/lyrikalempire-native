import { useCallback } from 'react';
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
  repeat 
}) => {
  // Use the new specialized hooks
  const audioCore = useAudioCore();
  const audioInteractions = useAudioInteractions({
    onNext,
    onPrev,
    currentBeat,
    shuffle,
    repeat,
    audioCore
  });

  // Simplified beat management functions
  const handlePlay = useCallback((beat, play, beats) => {
    if (!beat) {
      setCurrentBeat(null);
      setIsPlaying(false);
    } else if (currentBeat?.id === beat.id) {
      setIsPlaying(play);
    } else {
      // For new beats, first pause the current audio to prevent overlap
      if (audioCore.playerRef.current?.audio?.current) {
        audioCore.pause();
      }
      setCurrentBeat(beat);
      setTimeout(() => setIsPlaying(true), 0);
    }
  }, [currentBeat?.id, setCurrentBeat, setIsPlaying, audioCore]);

  const handleNext = useCallback((beats) => {
    let nextIndex;
    if (shuffle) {
      do {
        nextIndex = Math.floor(Math.random() * beats.length);
      } while (nextIndex === beats.findIndex(b => b.id === currentBeat.id) && beats.length > 1);
    } else {
      nextIndex = (beats.findIndex(b => b.id === currentBeat.id) + 1) % beats.length;
    }
    handlePlay(beats[nextIndex], true, beats);
  }, [shuffle, currentBeat?.id, handlePlay]);

  const handlePrev = useCallback((beats) => {
    const currentIndex = beats.findIndex(b => b.id === currentBeat.id);
    const prevIndex = (currentIndex - 1 + beats.length) % beats.length;
    handlePlay(beats[prevIndex], true, beats);
  }, [currentBeat?.id, handlePlay]);

  // Destructure audioInteractions to exclude the conflicting setCurrentTime
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