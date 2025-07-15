import { useState, useEffect, useRef, useCallback } from 'react';
import { useLocalStorageSync } from './useLocalStorageSync';
import { isMobileOrTablet } from '../utils';
import { getSignedUrl, getUserById, audioCacheService } from '../services';
import { useOs } from './useOs';

export const useAudioPlayerState = ({
  currentBeat,
  lyricsModal,
  setLyricsModal,
  markBeatAsCached
}) => {
  // Get browser info
  const { isSafari } = useOs();

  // Refs
  const artistCache = useRef(new Map());
  const waveformRefDesktop = useRef(null);
  const waveformRefFullPage = useRef(null);
  const fullPageOverlayRef = useRef(null);
  const wavesurfer = useRef(null);
  const cacheInProgressRef = useRef(false);
  const originalUrlRef = useRef('');

  // State
  const [artistName, setArtistName] = useState('Unknown Artist');
  const [activeContextMenu, setActiveContextMenu] = useState(false);
  const [contextMenuX, setContextMenuX] = useState(0);
  const [contextMenuY, setContextMenuY] = useState(0);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [currentTimeState, setCurrentTimeState] = useState(0);
  const [isFirstRender, setIsFirstRender] = useState(true);
  const [isReturningFromLyrics, setIsReturningFromLyrics] = useState(false);
  const [audioSrc, setAudioSrc] = useState('');
  const [autoPlay, setAutoPlay] = useState(false);
  const [isLoadingAudio, setIsLoadingAudio] = useState(false);
  const [isCachedAudio, setIsCachedAudio] = useState(false);
  const [waveform, setWaveform] = useState(() => JSON.parse(localStorage.getItem('waveform')) || false);
  const [isFullPage, setIsFullPage] = useState(() => {
    return JSON.parse(localStorage.getItem('isFullPage')) || false;
  });
  const [isFullPageVisible, setIsFullPageVisible] = useState(false);

  // Log Safari detection
  useEffect(() => {
    console.log('useAudioPlayerState - Safari detection:', isSafari);
  }, [isSafari]);

  // Sync local storage
  useLocalStorageSync({ waveform, isFullPage });

  // Get derived state
  const shouldShowFullPagePlayer = isFullPage || isFullPageVisible;
  const shouldShowMobilePlayer = isMobileOrTablet();

  // Get artist name from cache or fetch
  useEffect(() => {
    const fetchArtistName = async () => {
      if (currentBeat?.user_id) {
        // Check cache first
        if (artistCache.current.has(currentBeat.user_id)) {
          setArtistName(artistCache.current.get(currentBeat.user_id));
          return;
        }

        try {
          const user = await getUserById(currentBeat.user_id);
          const username = user?.username || 'Unknown Artist';
          
          // Cache the result
          artistCache.current.set(currentBeat.user_id, username);
          setArtistName(username);
        } catch (error) {
          // Could not fetch artist name. Using fallback.
          setArtistName('Unknown Artist');
        }
      }
    };

    fetchArtistName();
  }, [currentBeat?.user_id]);

  // Handle audio source changes with caching
  useEffect(() => {
    const updateAudioSource = async () => {
      if (currentBeat?.audio && currentBeat?.user_id) {
        // First, clear the current audio source to prevent old audio from playing
        setAudioSrc('');
        setIsLoadingAudio(true);
        setIsCachedAudio(false);
        // Reset cache in progress flag
        cacheInProgressRef.current = false;
        
        try {
          // Get signed URL first - we'll need it for Safari
          const signedUrl = await getSignedUrl(currentBeat.user_id, currentBeat.audio);
          originalUrlRef.current = signedUrl;
          
          // For Safari, we'll always use the signed URL to avoid WebKitBlobResource errors
          if (isSafari) {
            console.log('Safari: Using signed URL directly');
            setAudioSrc(signedUrl);
            setIsCachedAudio(false);
            setAutoPlay(!isFirstRender);
            setIsFirstRender(false);
            
            // Still try to cache in the background for offline use
            audioCacheService.preloadAudio(
              currentBeat.user_id, 
              currentBeat.audio, 
              signedUrl
            ).then(() => {
              // Just mark as cached, but keep using the original URL
              if (markBeatAsCached) {
                markBeatAsCached(currentBeat);
              }
            }).catch((cacheError) => {
              console.error('Safari: Error caching in background:', cacheError);
            });
            
            return;
          }
          
          // For non-Safari browsers, check if audio is already cached
          const cachedAudio = await audioCacheService.getAudio(currentBeat.user_id, currentBeat.audio);
          
          if (cachedAudio) {
            // Use cached audio immediately - no API call needed
            setAudioSrc(cachedAudio);
            setIsCachedAudio(true);
            setAutoPlay(!isFirstRender);
            setIsFirstRender(false);
            
            // Update the cache indicators state
            if (markBeatAsCached) {
              markBeatAsCached(currentBeat);
            }
          } else {
            // Not cached, use signed URL and start caching process
            setAudioSrc(signedUrl);
            setIsCachedAudio(false);
            setAutoPlay(!isFirstRender);
            setIsFirstRender(false);
            
            // Set flag to indicate caching is in progress
            cacheInProgressRef.current = true;
            
            // Try to preload and cache the audio in background (non-blocking)
            audioCacheService.preloadAudio(
              currentBeat.user_id, 
              currentBeat.audio, 
              signedUrl
            ).then((cachedObjectUrl) => {
              // Only update to cached version if we're still on the same beat and caching is in progress
              if (currentBeat?.audio === currentBeat.audio && 
                  currentBeat?.user_id === currentBeat.user_id &&
                  cacheInProgressRef.current) {
                
                // Check if we're already playing
                const audioElement = document.querySelector('audio');
                const isCurrentlyPlaying = audioElement && !audioElement.paused;
                
                if (!isCurrentlyPlaying) {
                  setAudioSrc(cachedObjectUrl);
                  setIsCachedAudio(true);
                }
                
                // Update the cache indicators state regardless
                if (markBeatAsCached) {
                  markBeatAsCached(currentBeat);
                }
              }
            }).catch((cacheError) => {
              // Silently fail caching - we're already using the direct URL
              console.error('Error caching audio:', cacheError);
              cacheInProgressRef.current = false;
            });
          }
          
        } catch (error) {
          // Error loading audio
          console.error('Error loading audio:', error);
          setAudioSrc('');
          setIsCachedAudio(false);
          cacheInProgressRef.current = false;
        } finally {
          setIsLoadingAudio(false);
        }
      } else {
        // Clear audio source if no beat
        setAudioSrc('');
        setIsCachedAudio(false);
        setIsLoadingAudio(false);
        cacheInProgressRef.current = false;
        originalUrlRef.current = '';
      }
    };

    updateAudioSource();
  }, [currentBeat?.audio, currentBeat?.user_id, isFirstRender, markBeatAsCached, isSafari]);

  // Clean up audio resources when component unmounts or beat changes
  useEffect(() => {
    return () => {
      // Cancel any in-progress caching operations
      cacheInProgressRef.current = false;
      originalUrlRef.current = '';
    };
  }, [currentBeat?.id]);

  // Handlers
  const toggleLyricsModal = useCallback(() => {
    setLyricsModal(!lyricsModal);
  }, [lyricsModal, setLyricsModal]);

  const toggleWaveform = useCallback(() => {
    setWaveform(!waveform);
  }, [waveform]);

  const handleEllipsisClick = useCallback((event) => {
    const rect = event.currentTarget.getBoundingClientRect();
    setContextMenuX(rect.left);
    setContextMenuY(rect.bottom);
    setActiveContextMenu(true);
  }, []);

  const handleCloseContextMenu = useCallback(() => {
    setActiveContextMenu(false);
  }, []);

  const handleAudioReady = useCallback(() => {
    // Audio is ready, can perform any setup here
  }, []);

  return {
    // Refs
    waveformRefDesktop,
    waveformRefFullPage,
    fullPageOverlayRef,
    wavesurfer,
    
    // State
    artistName,
    activeContextMenu,
    contextMenuX,
    contextMenuY,
    progress,
    setProgress,
    duration,
    setDuration,
    currentTimeState,
    setCurrentTimeState,
    isReturningFromLyrics,
    setIsReturningFromLyrics,
    audioSrc,
    autoPlay,
    isLoadingAudio,
    isCachedAudio,
    waveform,
    isFullPage,
    setIsFullPage,
    isFullPageVisible,
    setIsFullPageVisible,
    
    // Derived state
    shouldShowFullPagePlayer,
    shouldShowMobilePlayer,
    
    // Handlers
    toggleLyricsModal,
    toggleWaveform,
    handleEllipsisClick,
    handleCloseContextMenu,
    handleAudioReady
  };
}; 