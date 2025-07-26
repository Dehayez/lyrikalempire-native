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

  // Beat management functions
  const handlePlay = useCallback((beat, play, beats) => {
    if (!beat) {
      setCurrentBeat(null);
      setIsPlaying(false);
    } else if (currentBeat?.id === beat.id) {
      // Same beat - just toggle play/pause
      if (audioCore.prepareForNewTrack) {
        audioCore.prepareForNewTrack();
      }
      setIsPlaying(play);
    } else {
      // Different beat - change track
      if (audioCore.prepareForNewTrack) {
        audioCore.prepareForNewTrack();
      }
      
      // Pause current audio to prevent overlap
      if (audioCore.playerRef.current?.audio?.current) {
        audioCore.pause();
      }
      
      setCurrentBeat(beat);
      setTimeout(() => {
        setIsPlaying(play);
      }, 50);
    }
  }, [currentBeat?.id, setCurrentBeat, setIsPlaying, audioCore]);

  const handleNext = useCallback((beats) => {
    if (audioCore.prepareForNewTrack) {
      audioCore.prepareForNewTrack();
    }
    
    let nextIndex;
    if (shuffle) {
      do {
        nextIndex = Math.floor(Math.random() * beats.length);
      } while (nextIndex === beats.findIndex(b => b.id === currentBeat.id) && beats.length > 1);
    } else {
      nextIndex = (beats.findIndex(b => b.id === currentBeat.id) + 1) % beats.length;
    }
    
    const nextBeat = beats[nextIndex];
    handlePlay(nextBeat, true, beats);
  }, [shuffle, currentBeat?.id, handlePlay, audioCore]);

  const handlePrev = useCallback((beats) => {
    if (audioCore.prepareForNewTrack) {
      audioCore.prepareForNewTrack();
    }
    
    const currentIndex = beats.findIndex(b => b.id === currentBeat.id);
    const prevIndex = (currentIndex - 1 + beats.length) % beats.length;
    const prevBeat = beats[prevIndex];
    
    handlePlay(prevBeat, true, beats);
  }, [currentBeat?.id, handlePlay, audioCore]);

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