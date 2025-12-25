import { useState, useEffect, useRef, useCallback } from 'react';
import { useLocalStorageSync } from '../useLocalStorageSync';
import { isMobileOrTablet } from '../../utils';
import { getSignedUrl, getUserById, audioCacheService } from '../../services';
import { useOs } from '../useOs';

// Preloaded URLs cache (shared across hook instances)
const preloadedUrls = new Map();
const PRELOAD_CACHE_MAX_SIZE = 10;

// Preload a beat's signed URL
const preloadBeatUrl = (beat) => {
  if (!beat?.user_id || !beat?.audio) return;
  
  const key = `${beat.user_id}_${beat.audio}`;
  if (preloadedUrls.has(key)) return;
  
  // Enforce cache size limit
  if (preloadedUrls.size >= PRELOAD_CACHE_MAX_SIZE) {
    const firstKey = preloadedUrls.keys().next().value;
    preloadedUrls.delete(firstKey);
  }
  
  // Fetch and cache the signed URL
  getSignedUrl(beat.user_id, beat.audio)
    .then(url => {
      preloadedUrls.set(key, { url, timestamp: Date.now() });
    })
    .catch(() => {});
};

// Get preloaded URL if available and fresh (< 5 minutes old)
const getPreloadedUrl = (userId, fileName) => {
  const key = `${userId}_${fileName}`;
  const cached = preloadedUrls.get(key);
  
  if (cached && Date.now() - cached.timestamp < 5 * 60 * 1000) {
    return cached.url;
  }
  
  preloadedUrls.delete(key);
  return null;
};

export const useAudioPlayerState = ({
  currentBeat,
  lyricsModal,
  setLyricsModal,
  markBeatAsCached,
  nextBeat // Optional: next beat to preload
}) => {
  const { isSafari } = useOs();

  // Refs
  const artistCache = useRef(new Map());
  const waveformRefDesktop = useRef(null);
  const waveformRefFullPage = useRef(null);
  const waveformRefMobile = useRef(null);
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
  const [duplicateModal, setDuplicateModal] = useState({
    isOpen: false,
    beatTitle: '',
    playlistTitle: '',
    pendingPlaylistId: null
  });

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
        
        // Enforce cache size limit (max 50 artists)
        if (artistCache.current.size >= 50) {
          // Remove oldest entry (first entry in Map)
          const firstKey = artistCache.current.keys().next().value;
          artistCache.current.delete(firstKey);
        }
        
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

  // Fix improperly encoded URLs from server
  const fixUrlEncoding = useCallback((url) => {
    try {
      // Parse the URL
      const urlObj = new URL(url);
      const pathParts = urlObj.pathname.split('/');
      
      // The filename is the last part of the path
      const filename = pathParts[pathParts.length - 1];
      
      // Check if filename contains unencoded special characters
      const needsEncoding = /[,;]/.test(filename);
      
      if (needsEncoding) {
        // IMPORTANT: Only encode the problematic characters, don't re-encode already encoded ones
        // Replace unencoded commas and semicolons without touching already encoded characters
        const fixedFilename = filename
          .replace(/,/g, '%2C')    // Comma → %2C
          .replace(/;/g, '%3B');   // Semicolon → %3B
        
        pathParts[pathParts.length - 1] = fixedFilename;
        urlObj.pathname = pathParts.join('/');
        
        return urlObj.toString();
      }
      
      return url;
    } catch (e) {
      console.error('Error fixing URL encoding:', e);
      return url;
    }
  }, []);

  // Load audio source
  const loadAudio = useCallback(async () => {
    if (!currentBeat) {
      setAudioSrc('');
      return;
    }

    try {
      setIsLoadingAudio(true);
      
      // Show loading animation immediately
      setShowLoadingAnimation(true);
      
      cacheInProgressRef.current = true;

      // Check if audio is cached
      const isCached = await audioCacheService.isAudioCached(
        currentBeat.user_id,
        currentBeat.audio
      );

      setIsCachedAudio(isCached);

      // If we have cached audio, use it immediately
      if (isCached) {
        const cachedAudioUrl = await audioCacheService.getAudio(
          currentBeat.user_id,
          currentBeat.audio
        );
        
        if (cachedAudioUrl) {
          setAudioSrc(cachedAudioUrl);
          setAutoPlay(true);
          setShowLoadingAnimation(false);
          
          // If offline or not Safari, use cached version
          if (isOffline() || !isSafari) {
            return;
          }
        }
      }

      // If not cached or cached version failed, try to get signed URL
      // First check if we have a preloaded URL
      try {
        let rawSignedUrl = getPreloadedUrl(currentBeat.user_id, currentBeat.audio);
        
        // If no preloaded URL, fetch from server
        if (!rawSignedUrl) {
          rawSignedUrl = await getSignedUrl(currentBeat.user_id, currentBeat.audio);
        }
        
        // Fix any URL encoding issues (e.g., unencoded commas)
        const signedUrl = fixUrlEncoding(rawSignedUrl);
        
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
            setShowLoadingAnimation(false);
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
  }, [currentBeat?.id, currentBeat?.user_id, currentBeat?.audio, markBeatAsCached, isSafari, isOffline, fixUrlEncoding]);

  // Refresh audio source URL
  const refreshAudioSrc = useCallback(async (force = false) => {
    if (!currentBeat) return;
    
    const now = Date.now();
    if (!force && now - lastUrlRefreshRef.current < 10000) {
      return;
    }
    
    try {
      setIsLoadingAudio(true);
      
      // Show loading animation immediately
      setShowLoadingAnimation(true);
      
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

  const handleDuplicateConfirm = useCallback(async () => {
    if (duplicateModal.pendingPlaylistId && currentBeat) {
      try {
        const { addBeatsToPlaylist } = await import('../../services/playlistService');
        await addBeatsToPlaylist(duplicateModal.pendingPlaylistId, [currentBeat.id], true);
        
        const { toastService } = await import('../../components/Toaster');
        toastService.addToPlaylist(currentBeat.title, duplicateModal.playlistTitle);
      } catch (error) {
        console.error('Error adding duplicate beat to playlist:', error);
        const { toastService } = await import('../../components/Toaster');
        toastService.warning('Failed to add track to playlist');
      }
    }
    setDuplicateModal({ isOpen: false, beatTitle: '', playlistTitle: '', pendingPlaylistId: null });
  }, [duplicateModal.pendingPlaylistId, duplicateModal.playlistTitle, currentBeat]);

  const handleDuplicateCancel = useCallback(() => {
    setDuplicateModal({ isOpen: false, beatTitle: '', playlistTitle: '', pendingPlaylistId: null });
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

  // Cleanup on unmount to prevent memory leaks
  useEffect(() => {
    return () => {
      // Clear artist cache
      if (artistCache.current) {
        artistCache.current.clear();
      }
      
      // Clear any pending timeouts
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
      }
    };
  }, []);

  // Preload next beat's URL when provided
  useEffect(() => {
    if (nextBeat) {
      preloadBeatUrl(nextBeat);
    }
  }, [nextBeat?.id]);

  // Derived state
  const shouldShowFullPagePlayer = isFullPage; // Render when full page is requested
  const shouldShowMobilePlayer = isMobileOrTablet();

  return {
    // Refs
    waveformRefDesktop,
    waveformRefFullPage,
    waveformRefMobile,
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
    duplicateModal,
    setDuplicateModal,

    // Derived state
    shouldShowFullPagePlayer,
    shouldShowMobilePlayer,

    // Handlers
    toggleLyricsModal,
    toggleWaveform,
    handleEllipsisClick,
    handleCloseContextMenu,
    handleDuplicateConfirm,
    handleDuplicateCancel,
    handleAudioReady,
    refreshAudioSrc,
    
    // Preloading
    preloadBeatUrl
  };
}; 