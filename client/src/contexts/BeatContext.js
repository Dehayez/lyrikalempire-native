import React, { createContext, useContext, useState, useEffect } from 'react';
import { getBeats } from '../services';
import { useUser } from '../contexts';

const BeatContext = createContext();

export const useBeat = () => useContext(BeatContext);

const BEATS_CACHE_KEY = 'cached_beats';
const CACHE_TIMESTAMP_KEY = 'beats_cache_timestamp';
const CACHE_DURATION = 1000 * 60 * 60 * 24; // 24 hours

// Utility function to clear beats cache
export const clearBeatsCache = (userId) => {
  const cacheKey = `${BEATS_CACHE_KEY}_${userId}`;
  const timestampKey = `${CACHE_TIMESTAMP_KEY}_${userId}`;
  localStorage.removeItem(cacheKey);
  localStorage.removeItem(timestampKey);
};

export const BeatProvider = ({ children }) => {
  const [allBeats, setAllBeats] = useState([]);
  const [beats, setBeats] = useState([]);
  const [currentBeats, setCurrentBeats] = useState([]);
  const [paginatedBeats, setPaginatedBeats] = useState([]);
  const [hoveredBeat, setHoveredBeat] = useState(null);
  const [refreshBeats, setRefreshBeats] = useState(false);
  const [isLoadingFresh, setIsLoadingFresh] = useState(false);
  const [hasCachedData, setHasCachedData] = useState(false);
  const [loadedFromCache, setLoadedFromCache] = useState(false);
  const { user } = useUser();

  // Single effect to handle both cache and fresh data
  useEffect(() => {
    if (!user.id) {
      return;
    }

    
    const cacheKey = `${BEATS_CACHE_KEY}_${user.id}`;
    const timestampKey = `${CACHE_TIMESTAMP_KEY}_${user.id}`;
    let isMounted = true;
    let cachedDataString = null;

    // 1. Try to load from cache first (synchronous)
    try {
      const cachedData = localStorage.getItem(cacheKey);
      const cacheTimestamp = localStorage.getItem(timestampKey);
      
      
      if (cachedData && cacheTimestamp) {
        const parsedData = JSON.parse(cachedData);
        cachedDataString = cachedData; // Store for comparison
        
        const timestamp = parseInt(cacheTimestamp, 10);
        const now = Date.now();
        const ageInMinutes = ((now - timestamp) / 1000 / 60).toFixed(2);
        
        // Show cached data immediately
        if (isMounted) {
          setAllBeats(parsedData);
          setBeats(parsedData);
          setHasCachedData(true);
          setLoadedFromCache(true);
        }
      } else {
      }
    } catch (error) {
      console.error('Failed to load cached beats:', error);
    }

    // 2. Fetch fresh data in background
    const fetchBeats = async () => {
      const fetchStartTime = performance.now();
      
      try {
        setIsLoadingFresh(true);
        const data = await getBeats(user.id);
        
        const fetchDuration = (performance.now() - fetchStartTime).toFixed(2);
        
        if (!isMounted) {
          return;
        }

        // Only update if data actually changed (compare stringified versions)
        const freshDataString = JSON.stringify(data);
        const hasChanged = cachedDataString !== freshDataString;
        
        
        if (hasChanged || !cachedDataString) {
          setAllBeats(data);
          setBeats(data);
        } else {
        }
        
        // Always update cache with fresh data
        try {
          const cacheStartTime = performance.now();
          localStorage.setItem(cacheKey, freshDataString);
          localStorage.setItem(timestampKey, Date.now().toString());
          const cacheDuration = (performance.now() - cacheStartTime).toFixed(2);
        } catch (cacheError) {
          console.error('Failed to cache beats:', cacheError);
          if (cacheError.name === 'QuotaExceededError') {
            localStorage.removeItem(cacheKey);
            localStorage.removeItem(timestampKey);
          }
        }
      } catch (error) {
        console.error('Failed to fetch beats:', error);
      } finally {
        if (isMounted) {
          setIsLoadingFresh(false);
        }
      }
    };

    fetchBeats();

    return () => {
      isMounted = false;
    };
  }, [refreshBeats, user.id]);

  return (
    <BeatContext.Provider value={{ 
      allBeats, 
      beats, 
      setBeats, 
      setGlobalBeats: setAllBeats, 
      paginatedBeats, 
      setPaginatedBeats, 
      hoveredBeat, 
      setHoveredBeat, 
      setRefreshBeats, 
      currentBeats, 
      setCurrentBeats,
      isLoadingFresh,
      loadedFromCache
    }}>
      {children}
    </BeatContext.Provider>
  );
};