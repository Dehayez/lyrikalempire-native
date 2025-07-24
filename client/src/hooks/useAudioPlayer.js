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

  // Simplified beat management functions with debug logging
  const handlePlay = useCallback((beat, play, beats) => {
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    const isSafari = /Safari/.test(navigator.userAgent) && !/Chrome/.test(navigator.userAgent);
    
    console.log('🔍 [DEBUG] handlePlay called:', {
      beatTitle: beat?.title,
      play,
      isMobile,
      isSafari,
      isNewBeat: beat?.id !== currentBeat?.id,
      currentBeatTitle: currentBeat?.title
    });
    
    if (!beat) {
      console.log('🔍 [DEBUG] No beat - stopping playback');
      setCurrentBeat(null);
      setIsPlaying(false);
    } else if (currentBeat?.id === beat.id) {
      // Same beat - just toggle play/pause
      console.log('🔍 [DEBUG] Same beat - toggling play/pause');
      if (audioCore.prepareForNewTrack) {
        audioCore.prepareForNewTrack(); // Prepare Safari for user interaction
      }
      setIsPlaying(play);
    } else {
      // Different beat - prepare Safari for new track
      console.log('🔍 [DEBUG] Different beat - changing track:', {
        from: currentBeat?.title,
        to: beat.title,
        requestedPlay: play
      });
      
      if (audioCore.prepareForNewTrack) {
        audioCore.prepareForNewTrack();
      }
      
      // For new beats, first pause the current audio to prevent overlap
      if (audioCore.playerRef.current?.audio?.current) {
        console.log('🔍 [DEBUG] Pausing current audio before track change');
        audioCore.pause();
      }
      
      console.log('🔍 [DEBUG] Setting new current beat and play state');
      setCurrentBeat(beat);
      setTimeout(() => {
        console.log('🔍 [DEBUG] Setting isPlaying to:', play);
        setIsPlaying(play);
      }, 50);
    }
  }, [currentBeat?.id, setCurrentBeat, setIsPlaying, audioCore]);

  const handleNext = useCallback((beats) => {
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    const isSafari = /Safari/.test(navigator.userAgent) && !/Chrome/.test(navigator.userAgent);
    
    console.log('🔍 [DEBUG] handleNext called:', {
      isMobile,
      isSafari,
      currentBeat: currentBeat?.title,
      beatsLength: beats?.length
    });
    
    // Prepare Safari for user-initiated next track
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
    console.log('🔍 [DEBUG] Next track selected:', {
      nextBeat: nextBeat?.title,
      nextIndex,
      shuffle
    });
    
    // Always try to play the next track - basic functionality
    handlePlay(nextBeat, true, beats);
  }, [shuffle, currentBeat?.id, handlePlay, audioCore]);

  const handlePrev = useCallback((beats) => {
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    const isSafari = /Safari/.test(navigator.userAgent) && !/Chrome/.test(navigator.userAgent);
    
    console.log('🔍 [DEBUG] handlePrev called:', {
      isMobile,
      isSafari,
      currentBeat: currentBeat?.title,
      beatsLength: beats?.length
    });
    
    // Prepare Safari for user-initiated previous track
    if (audioCore.prepareForNewTrack) {
      audioCore.prepareForNewTrack();
    }
    
    const currentIndex = beats.findIndex(b => b.id === currentBeat.id);
    const prevIndex = (currentIndex - 1 + beats.length) % beats.length;
    const prevBeat = beats[prevIndex];
    
    console.log('🔍 [DEBUG] Previous track selected:', {
      prevBeat: prevBeat?.title,
      prevIndex,
      currentIndex
    });
    
    // Always try to play the previous track - basic functionality
    handlePlay(prevBeat, true, beats);
  }, [currentBeat?.id, handlePlay, audioCore]);

  // Destructure audioInteractions to exclude the conflicting setCurrentTime
  const { setCurrentTimeState, ...audioInteractionsWithoutSetCurrentTime } = audioInteractions;
  
  return {
    // Audio core functionality - use original functions
    ...audioCore,
    
    // User interactions (excluding setCurrentTime to avoid conflict)
    ...audioInteractionsWithoutSetCurrentTime,
    
    // High-level beat management with debug logging
    handlePlay,
    handleNext,
    handlePrev
  };
};