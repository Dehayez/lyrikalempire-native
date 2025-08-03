import { useState, useEffect, useCallback, useRef } from 'react';
import audioBufferService from '../../services/audioBufferService';
import gaplessPlaybackService from '../../services/gaplessPlaybackService';
import offlineAudioService from '../../services/offlineAudioService';

export const useEnhancedAudio = ({
  currentBeat,
  playlist = [],
  onLoadingProgress,
  onError,
  options = {}
}) => {
  const {
    crossfadeDuration = 2,
    preloadCount = 3,
    maxOfflineStorage = 500 * 1024 * 1024, // 500MB
    priorityTracks = [],
    transitionType = 'crossfade'
  } = options;

  // State
  const [isLoading, setIsLoading] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [loadingPhase, setLoadingPhase] = useState(null);
  const [isOfflineAvailable, setIsOfflineAvailable] = useState(false);
  const [bufferHealth, setBufferHealth] = useState(0);

  // Refs
  const currentTrackRef = useRef(null);
  const playlistRef = useRef(playlist);
  const preloadingRef = useRef(false);

  // Initialize services with options
  useEffect(() => {
    gaplessPlaybackService.setCrossfadeDuration(crossfadeDuration);
    gaplessPlaybackService.setTransitionType(transitionType);
    offlineAudioService.maxStorageSize = maxOfflineStorage;
    offlineAudioService.setPriorityTracks(priorityTracks);
  }, [crossfadeDuration, transitionType, maxOfflineStorage, priorityTracks]);

  // Handle loading progress
  const handleProgress = useCallback((phase, progress) => {
    setLoadingPhase(phase);
    setLoadingProgress(progress);
    onLoadingProgress?.(phase, progress);
  }, [onLoadingProgress]);

  // Start preloading next tracks
  const preloadNextTracks = useCallback(async () => {
    if (!currentBeat || preloadingRef.current) return;

    preloadingRef.current = true;
    const currentIndex = playlist.findIndex(track => track.id === currentBeat.id);
    
    if (currentIndex === -1) return;

    const nextTracks = playlist.slice(
      currentIndex + 1,
      currentIndex + 1 + preloadCount
    );

    try {
      await audioBufferService.preloadAudio(nextTracks, {
        maxConcurrent: 2,
        priorityFn: (track, index) => preloadCount - index,
        onTrackProgress: (track, progress) => {
          if (track === nextTracks[0]) {
            setBufferHealth(progress);
          }
        },
        onTrackError: (track, error) => {
          console.error('Error preloading track:', track.title, error);
        }
      });
    } catch (error) {
      console.error('Error in preloadNextTracks:', error);
    } finally {
      preloadingRef.current = false;
    }
  }, [currentBeat, playlist, preloadCount]);

  // Load current track with enhanced features
  const loadTrack = useCallback(async (track) => {
    if (!track) return;

    setIsLoading(true);
    handleProgress('preparing', 0);

    try {
      // Check offline availability
      const isAvailable = await offlineAudioService.isTrackAvailable(track);
      setIsOfflineAvailable(isAvailable);

      // Try to get from cache or offline storage first
      let audioUrl = await offlineAudioService.getTrackUrl(track);
      
      if (!audioUrl) {
        // Start buffering if not cached
        handleProgress('buffering', 0);
        audioUrl = await audioBufferService.startBuffering(track.audioSrc, {
          priority: 1,
          userId: track.userId,
          fileName: track.fileName,
          onProgress: (progress) => handleProgress('buffering', progress),
          onError: (error) => {
            handleProgress('error', 0);
            onError?.(error);
          }
        });
      }

      // Get next track for gapless playback
      const nextTrack = getNextTrack();
      
      // Start playback with gapless transition
      await gaplessPlaybackService.play(audioUrl, nextTrack?.audioSrc);
      
      // Start preloading next tracks
      preloadNextTracks();
      
      handleProgress('ready', 100);
      setIsLoading(false);

    } catch (error) {
      handleProgress('error', 0);
      setIsLoading(false);
      onError?.(error);
    }
  }, [handleProgress, onError, preloadNextTracks]);

  // Get next track based on playlist
  const getNextTrack = useCallback(() => {
    if (!currentBeat || !playlist.length) return null;
    
    const currentIndex = playlist.findIndex(track => track.id === currentBeat.id);
    if (currentIndex === -1 || currentIndex === playlist.length - 1) return null;
    
    return playlist[currentIndex + 1];
  }, [currentBeat, playlist]);

  // Handle offline availability changes
  useEffect(() => {
    const handleOfflineChange = (event) => {
      if (event.detail.event === 'offline') {
        // Update UI for offline mode
        setIsOfflineAvailable(true);
      }
    };

    window.addEventListener('offlineAudio', handleOfflineChange);
    return () => {
      window.removeEventListener('offlineAudio', handleOfflineChange);
    };
  }, []);

  // Update playlist reference
  useEffect(() => {
    playlistRef.current = playlist;
  }, [playlist]);

  // Load track when currentBeat changes
  useEffect(() => {
    if (currentBeat?.id !== currentTrackRef.current?.id) {
      currentTrackRef.current = currentBeat;
      loadTrack(currentBeat);
    }
  }, [currentBeat, loadTrack]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      gaplessPlaybackService.stop();
      audioBufferService.clearAllBuffers();
    };
  }, []);

  return {
    // Loading state
    isLoading,
    loadingProgress,
    loadingPhase,
    
    // Buffer health
    bufferHealth,
    
    // Offline state
    isOfflineAvailable,
    
    // Track control
    loadTrack,
    preloadNextTracks,
    
    // Playback control
    play: gaplessPlaybackService.resume.bind(gaplessPlaybackService),
    pause: gaplessPlaybackService.pause.bind(gaplessPlaybackService),
    stop: gaplessPlaybackService.stop.bind(gaplessPlaybackService),
    
    // Playback state
    playbackState: gaplessPlaybackService.getPlaybackState(),
    
    // Services (for advanced usage)
    services: {
      buffer: audioBufferService,
      gapless: gaplessPlaybackService,
      offline: offlineAudioService
    }
  };
};