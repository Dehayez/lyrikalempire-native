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
  const lastUrlRefreshRef = useRef(0);
  const artistLoadRetryCount = useRef(0);

  // State
  const [artistName, setArtistName] = useState('\u00A0'); // Non-breaking space
  const [activeContextMenu, setActiveContextMenu] = useState(false);
  const [contextMenuX, setContextMenuX] = useState(0);
  const [contextMenuY, setContextMenuY] = useState(0);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [currentTimeState, setCurrentTimeState] = useState(0);
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

  // Sync waveform with localStorage
  useLocalStorageSync({
    waveform,
    isFullPage,
  });

  // Load artist name when current beat changes
  useEffect(() => {
    if (!currentBeat) return;

    const loadArtistName = async () => {
      try {
        // Check cache first
        if (artistCache.current.has(currentBeat.user_id)) {
          setArtistName(artistCache.current.get(currentBeat.user_id));
          return;
        }

        // Fetch artist name
        const user = await getUserById(currentBeat.user_id);
        if (user) {
          // Check for both name and username properties
          const artistName = user.name || user.username || '\u00A0'; 
          setArtistName(artistName);
          artistCache.current.set(currentBeat.user_id, artistName);
          artistLoadRetryCount.current = 0; // Reset retry count on success
        }
      } catch (error) {
        console.error('Error loading artist name:', error);
        setArtistName('\u00A0');
        
        // Retry logic for artist name loading
        if (artistLoadRetryCount.current < 3) {
          artistLoadRetryCount.current += 1;
          console.log(`Retrying artist name load (${artistLoadRetryCount.current}/3)...`);
          setTimeout(loadArtistName, 2000 * artistLoadRetryCount.current); // Exponential backoff
        }
      }
    };

    loadArtistName();
  }, [currentBeat]);

  // Load audio when current beat changes
  useEffect(() => {
    if (!currentBeat) {
      setAudioSrc('');
      return;
    }

    const loadAudio = async () => {
      try {
        setIsLoadingAudio(true);
        cacheInProgressRef.current = true;

        // Check if audio is cached
        const isCached = await audioCacheService.isAudioCached(
          currentBeat.user_id,
          currentBeat.audio
        );

        setIsCachedAudio(isCached);

        // Get signed URL for audio file
        const signedUrl = await getSignedUrl(currentBeat.user_id, currentBeat.audio);
        originalUrlRef.current = signedUrl;

        // For Safari, just use the signed URL directly
        if (isSafari) {
          setAudioSrc(signedUrl);
          
          // Store the URL in the cache for future reference
          audioCacheService.originalUrls.set(
            audioCacheService.getCacheKey(currentBeat.user_id, currentBeat.audio),
            signedUrl
          );
          
          // Update last URL refresh time
          lastUrlRefreshRef.current = Date.now();
        } else {
          // For other browsers, store in cache or retrieve from cache
          const audioUrl = await audioCacheService.preloadAudio(
            currentBeat.user_id,
            currentBeat.audio,
            signedUrl
          );
          
          // Update last URL refresh time
          lastUrlRefreshRef.current = Date.now();
          
          // Set audio source
          setAudioSrc(audioUrl);
        }

        setAutoPlay(true);

        // Mark as cached if it wasn't before
        if (!isCached) {
          markBeatAsCached(currentBeat.id);
        }
      } catch (error) {
        console.error('Error loading audio:', error);
        setAudioSrc('');
      } finally {
        setIsLoadingAudio(false);
        cacheInProgressRef.current = false;
      }
    };

    loadAudio();
  }, [currentBeat?.id, currentBeat?.user_id, currentBeat?.audio, markBeatAsCached, isSafari]); // Only depend on audio-related properties

  // Method to refresh the audio source URL
  const refreshAudioSrc = useCallback(async (force = false) => {
    if (!currentBeat) return;
    
    // Don't refresh too frequently unless forced
    const now = Date.now();
    if (!force && now - lastUrlRefreshRef.current < 10000) {
      return;
    }
    
    try {
      setIsLoadingAudio(true);
      
      // Get a fresh signed URL
      const freshSignedUrl = await getSignedUrl(currentBeat.user_id, currentBeat.audio);
      originalUrlRef.current = freshSignedUrl;
      
      // For Safari, just use the fresh URL directly
      if (isSafari) {
        setAudioSrc(freshSignedUrl);
        
        // Update the URL in the cache for future use
        audioCacheService.originalUrls.set(
          audioCacheService.getCacheKey(currentBeat.user_id, currentBeat.audio),
          freshSignedUrl
        );
      } else {
        // For other browsers, try to cache it
        const audioUrl = await audioCacheService.preloadAudio(
          currentBeat.user_id,
          currentBeat.audio,
          freshSignedUrl
        );
        
        setAudioSrc(audioUrl);
      }
      
      // Update last refresh time
      lastUrlRefreshRef.current = now;
      
    } catch (error) {
      console.error('Error refreshing audio URL:', error);
      // If we can't refresh, just use the original URL directly as fallback
      if (originalUrlRef.current) {
        setAudioSrc(originalUrlRef.current);
      }
    } finally {
      setIsLoadingAudio(false);
    }
  }, [currentBeat, isSafari]);

  // Handle audio ready event
  const handleAudioReady = useCallback((e) => {
    // If we have a cached audio file, mark the beat as cached
    if (currentBeat && !isCachedAudio) {
      markBeatAsCached(currentBeat.id);
      setIsCachedAudio(true);
    }
  }, [currentBeat, isCachedAudio, markBeatAsCached]);

  // Toggle lyrics modal
  const toggleLyricsModal = useCallback(() => {
    setLyricsModal(!lyricsModal);
    if (lyricsModal) {
      // We're closing the lyrics modal
      setIsReturningFromLyrics(true);
      // Reset after a short delay
      setTimeout(() => {
        setIsReturningFromLyrics(false);
      }, 500);
    }
  }, [lyricsModal, setLyricsModal]);

  // Toggle waveform
  const toggleWaveform = useCallback(() => {
    setWaveform(!waveform);
  }, [waveform]);

  // Handle ellipsis click for context menu
  const handleEllipsisClick = useCallback((e) => {
    e.stopPropagation();
    setActiveContextMenu(true);
    setContextMenuX(e.clientX);
    setContextMenuY(e.clientY);
  }, []);

  // Handle close context menu
  const handleCloseContextMenu = useCallback(() => {
    setActiveContextMenu(false);
  }, []);

  // Derived state
  const shouldShowFullPagePlayer = isFullPage && isFullPageVisible;
  const shouldShowMobilePlayer = isMobileOrTablet();

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
    handleAudioReady,
    refreshAudioSrc
  };
}; 