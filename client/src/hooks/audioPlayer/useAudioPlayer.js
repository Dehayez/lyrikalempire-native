import { useCallback, useEffect, useRef } from 'react';
import { useAudioCore } from './useAudioCore';
import { useAudioInteractions } from './useAudioInteractions';
import { isSafari } from '../../utils/safariOptimizations';

/**
 * Optimized audio player hook with Safari performance enhancements
 * Maintains compatibility with existing audio sync and interaction hooks
 */
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

  // Refs for ultra-fast access
  const currentBeatRef = useRef(currentBeat);
  const playlistRef = useRef(playlist);
  const isPlayingRef = useRef(isPlaying);

  // Update refs immediately
  useEffect(() => {
    currentBeatRef.current = currentBeat;
    playlistRef.current = playlist;
    isPlayingRef.current = isPlaying;
  }, [currentBeat, playlist, isPlaying]);

  // Set up gapless playback with playlist
  useEffect(() => {
    audioCore.setupGaplessPlayback(playlist);
  }, [playlist, audioCore.setupGaplessPlayback]);

  // Optimized beat management functions for Safari
  const handlePlay = useCallback((beat, play, beats) => {
    console.log('🎵 [PLAYER DEBUG] handlePlay called:', {
      beatId: beat?.id,
      beatTitle: beat?.title,
      play,
      currentBeatId: currentBeatRef.current?.id,
      isSameBeat: currentBeatRef.current?.id === beat?.id
    });
    
    if (!beat) {
      console.log('⚠️ [PLAYER DEBUG] No beat provided, clearing player');
      setCurrentBeat(null);
      setIsPlaying(false);
      return;
    }

    // For Safari, use immediate state updates
    if (isSafari()) {
      console.log('🧮 [PLAYER DEBUG] Safari: Using immediate state updates');
      if (currentBeatRef.current?.id === beat.id) {
        // Same beat - just toggle play/pause (immediate)
        console.log('▶️ [PLAYER DEBUG] Safari: Same beat, toggling play/pause to:', play);
        setIsPlaying(play);
      } else {
        // Different beat - change track (immediate)
        console.log('🔄 [PLAYER DEBUG] Safari: Different beat, changing track');
        setCurrentBeat(beat);
        setIsPlaying(play);
      }
      return;
    }

    // For other browsers, use standard logic
    if (currentBeatRef.current?.id === beat.id) {
      console.log('▶️ [PLAYER DEBUG] Same beat, toggling play/pause to:', play);
      setIsPlaying(play);
    } else {
      console.log('🔄 [PLAYER DEBUG] Different beat, changing track');
      setCurrentBeat(beat);
      setIsPlaying(play);
    }
  }, [setCurrentBeat, setIsPlaying]);

  // Optimized next track handler
  const handleNext = useCallback((beats) => {
    if (!beats.length) {
      console.log('⚠️ [PLAYER DEBUG] handleNext: No beats in playlist');
      return;
    }
    
    let nextIndex;
    if (shuffle) {
      do {
        nextIndex = Math.floor(Math.random() * beats.length);
      } while (nextIndex === beats.findIndex(b => b.id === currentBeatRef.current?.id) && beats.length > 1);
    } else {
      const currentIndex = beats.findIndex(b => b.id === currentBeatRef.current?.id);
      nextIndex = (currentIndex + 1) % beats.length;
    }
    
    const nextBeat = beats[nextIndex];
    console.log('⏭️ [PLAYER DEBUG] handleNext: Moving to next track:', {
      currentIndex: beats.findIndex(b => b.id === currentBeatRef.current?.id),
      nextIndex,
      nextBeatId: nextBeat?.id,
      nextBeatTitle: nextBeat?.title,
      shuffle
    });
    handlePlay(nextBeat, true, beats);
  }, [shuffle, handlePlay]);

  // Optimized previous track handler
  const handlePrev = useCallback((beats) => {
    if (!beats.length) {
      console.log('⚠️ [PLAYER DEBUG] handlePrev: No beats in playlist');
      return;
    }
    
    const currentIndex = beats.findIndex(b => b.id === currentBeatRef.current?.id);
    const prevIndex = (currentIndex - 1 + beats.length) % beats.length;
    const prevBeat = beats[prevIndex];
    
    console.log('⏮️ [PLAYER DEBUG] handlePrev: Moving to previous track:', {
      currentIndex,
      prevIndex,
      prevBeatId: prevBeat?.id,
      prevBeatTitle: prevBeat?.title
    });
    
    handlePlay(prevBeat, true, beats);
  }, [handlePlay]);

  // Destructure audioInteractions to exclude conflicting setCurrentTime
  const { setCurrentTimeState, ...audioInteractionsWithoutSetCurrentTime } = audioInteractions;
  
  return {
    // Audio core functionality (required by other hooks)
    ...audioCore,
    
    // User interactions (excluding setCurrentTime to avoid conflict)
    ...audioInteractionsWithoutSetCurrentTime,
    
    // High-level beat management
    handlePlay,
    handleNext,
    handlePrev,
    
    // Refs for direct access
    currentBeatRef,
    playlistRef,
    isPlayingRef
  };
}; 