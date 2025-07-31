import { useState, useEffect, useRef, useCallback } from 'react';
import { useLocalStorageSync } from '../useLocalStorageSync';
import { isMobileOrTablet } from '../../utils';
import { getSignedUrl, getUserById, audioCacheService } from '../../services';
import { useOs } from '../useOs';

export const useAudioPlayerState = ({
  currentBeat,
  lyricsModal,
  setLyricsModal,
  markBeatAsCached
}) => {
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
  const loadingTimeoutRef = useRef(null);

  // State
  const [artistName, setArtistName] = useState('\u00A0');
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
  const [showLoadingAnimation, setShowLoadingAnimation] = useState(false);
  const [isCachedAudio, setIsCachedAudio] = useState(false);
  
  const [waveform, setWaveform] = useState(() => 
    JSON.parse(localStorage.getItem('waveform')) || false
  );
  
  const [isFullPage, setIsFullPage] = useState(() => 
    JSON.parse(localStorage.getItem('isFullPage')) || false
  );
  
  const [isFullPageVisible, setIsFullPageVisible] = useState(false);

  // Sync with localStorage
  useLocalStorageSync({ waveform, isFullPage });

  // Load artist name with retry logic
  const loadArtistName = useCallback(async () => {
    if (!currentBeat) return;

    try {
      // Check cache first
      if (artistCache.current.has(currentBeat.user_id)) {
        setArtistName(artistCache.current.get(currentBeat.user_id));
        return;
      }

      const user = await getUserById(currentBeat.user_id);
      if (user) {
        const artistName = user.name || user.username || '\u00A0';
        setArtistName(artistName);
        artistCache.current.set(currentBeat.user_id, artistName);
        artistLoadRetryCount.current = 0;
      }
    } catch (error) {
      console.error('Error loading artist name:', error);
      setArtistName('\u00A0');
      
      // Retry logic
      if (artistLoadRetryCount.current < 3) {
        artistLoadRetryCount.current += 1;
        setTimeout(loadArtistName, 2000 * artistLoadRetryCount.current);
      }
    }
  }, [currentBeat]);

  // Check if we're offline
  const isOffline = useCallback(() => {
    return !navigator.onLine;
  }, []);

  // Load audio source
  const loadAudio = useCallback(async () => {
    if (!currentBeat) {
      setAudioSrc('');
      return;
    }

    try {
      setIsLoadingAudio(true);
      
      // Start delayed loading animation after 500ms
      loadingTimeoutRef.current = setTimeout(() => {
        setShowLoadingAnimation(true);
      }, 500);
      
      cacheInProgressRef.current = true;

      // Check if audio is cached
      const isCached = await audioCacheService.isAudioCached(
        currentBeat.user_id,
        currentBeat.audio
      );

      setIsCachedAudio(isCached);

      // If we have cached audio, try to use it first (especially when offline)
      if (isCached) {
        const cachedAudioUrl = await audioCacheService.getAudio(
          currentBeat.user_id,
          currentBeat.audio
        );
        
        if (cachedAudioUrl) {
          setAudioSrc(cachedAudioUrl);
          setAutoPlay(true);
          
          // If offline, stop here and use cached version
          if (isOffline()) {
            return;
          }
          
          // If online and not Safari, we can still try to refresh the signed URL in background
          // but use cached audio immediately for better UX
          if (!isSafari) {
            return;
          }
        }
      }

      // If not cached or cached version failed, try to get fresh signed URL
      // This will fail gracefully if offline
      try {
        const signedUrl = await getSignedUrl(currentBeat.user_id, currentBeat.audio);
        originalUrlRef.current = signedUrl;

        if (isSafari) {
          // For Safari, use signed URL directly but also store for offline use
          setAudioSrc(signedUrl);
          
          audioCacheService.originalUrls.set(
            audioCacheService.getCacheKey(currentBeat.user_id, currentBeat.audio),
            signedUrl
          );
        } else {
          // For other browsers, use cache system
          const audioUrl = await audioCacheService.preloadAudio(
            currentBeat.user_id,
            currentBeat.audio,
            signedUrl
          );
          
          setAudioSrc(audioUrl);
        }

        lastUrlRefreshRef.current = Date.now();
        setAutoPlay(true);

        // Mark as cached if it wasn't before
        if (!isCached) {
          markBeatAsCached(currentBeat.id);
        }
      } catch (networkError) {
        console.error('Network error loading audio:', networkError);
        
        // If we failed to get signed URL but have cached audio, use it
        if (isCached) {
          const cachedAudioUrl = await audioCacheService.getAudio(
            currentBeat.user_id,
            currentBeat.audio
          );
          
          if (cachedAudioUrl) {
            setAudioSrc(cachedAudioUrl);
            setAutoPlay(true);
            return;
          }
        }
        
        // If no cached version available, propagate the error
        throw networkError;
      }
    } catch (error) {
      console.error('Error loading audio:', error);
      setAudioSrc('');
    } finally {
      setIsLoadingAudio(false);
      setShowLoadingAnimation(false);
      
      // Clear the timeout if it hasn't fired yet
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
        loadingTimeoutRef.current = null;
      }
      
      cacheInProgressRef.current = false;
    }
  }, [currentBeat?.id, currentBeat?.user_id, currentBeat?.audio, markBeatAsCached, isSafari, isOffline]);

  // Refresh audio source URL
  const refreshAudioSrc = useCallback(async (force = false) => {
    if (!currentBeat) return;
    
    const now = Date.now();
    if (!force && now - lastUrlRefreshRef.current < 10000) {
      return;
    }
    
    try {
      setIsLoadingAudio(true);
      
      // Start delayed loading animation after 500ms
      loadingTimeoutRef.current = setTimeout(() => {
        setShowLoadingAnimation(true);
      }, 500);
      
      const freshSignedUrl = await getSignedUrl(currentBeat.user_id, currentBeat.audio);
      originalUrlRef.current = freshSignedUrl;
      
      if (isSafari) {
        setAudioSrc(freshSignedUrl);
        
        audioCacheService.originalUrls.set(
          audioCacheService.getCacheKey(currentBeat.user_id, currentBeat.audio),
          freshSignedUrl
        );
      } else {
        const audioUrl = await audioCacheService.preloadAudio(
          currentBeat.user_id,
          currentBeat.audio,
          freshSignedUrl
        );
        
        setAudioSrc(audioUrl);
      }
      
      lastUrlRefreshRef.current = now;
      
    } catch (error) {
      console.error('Error refreshing audio URL:', error);
      if (originalUrlRef.current) {
        setAudioSrc(originalUrlRef.current);
      }
    } finally {
      setIsLoadingAudio(false);
      setShowLoadingAnimation(false);
      
      // Clear the timeout if it hasn't fired yet
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
        loadingTimeoutRef.current = null;
      }
    }
  }, [currentBeat, isSafari]);

  // Handle audio ready event
  const handleAudioReady = useCallback((e) => {
    if (currentBeat && !isCachedAudio) {
      markBeatAsCached(currentBeat.id);
      setIsCachedAudio(true);
    }
  }, [currentBeat, isCachedAudio, markBeatAsCached]);

  // Modal and UI handlers
  const toggleLyricsModal = useCallback(() => {
    setLyricsModal(!lyricsModal);
    if (lyricsModal) {
      setIsReturningFromLyrics(true);
      setTimeout(() => {
        setIsReturningFromLyrics(false);
      }, 500);
    }
  }, [lyricsModal, setLyricsModal]);

  const toggleWaveform = useCallback(() => {
    setWaveform(!waveform);
  }, [waveform]);

  const handleEllipsisClick = useCallback((e) => {
    e.stopPropagation();
    setActiveContextMenu(true);
    setContextMenuX(e.clientX);
    setContextMenuY(e.clientY);
  }, []);

  const handleCloseContextMenu = useCallback(() => {
    setActiveContextMenu(false);
  }, []);

  // Load artist name when current beat changes
  useEffect(() => {
    loadArtistName();
  }, [loadArtistName]);

  // Load audio when current beat changes
  useEffect(() => {
    loadAudio();
  }, [loadAudio]);

  // Cleanup loading timeout when component unmounts or beat changes
  useEffect(() => {
    return () => {
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
        loadingTimeoutRef.current = null;
      }
    };
  }, [currentBeat?.id]);

  // Derived state
  const shouldShowFullPagePlayer = isFullPage; // Render when full page is requested
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
    showLoadingAnimation,
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