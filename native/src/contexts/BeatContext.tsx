import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { getBeats, Beat } from '../services/beatService';
import { useUser } from './UserContext';
import { storage, STORAGE_KEYS } from '../utils/storage';

interface BeatContextType {
  allBeats: Beat[];
  beats: Beat[];
  setBeats: React.Dispatch<React.SetStateAction<Beat[]>>;
  setGlobalBeats: React.Dispatch<React.SetStateAction<Beat[]>>;
  paginatedBeats: Beat[];
  setPaginatedBeats: React.Dispatch<React.SetStateAction<Beat[]>>;
  hoveredBeat: Beat | null;
  setHoveredBeat: React.Dispatch<React.SetStateAction<Beat | null>>;
  setRefreshBeats: React.Dispatch<React.SetStateAction<boolean>>;
  currentBeats: Beat[];
  setCurrentBeats: React.Dispatch<React.SetStateAction<Beat[]>>;
  isLoadingFresh: boolean;
  loadedFromCache: boolean;
}

const BeatContext = createContext<BeatContextType | undefined>(undefined);

export const useBeat = (): BeatContextType => {
  const context = useContext(BeatContext);
  if (context === undefined) {
    throw new Error('useBeat must be used within a BeatProvider');
  }
  return context;
};

const CACHE_DURATION = 1000 * 60 * 60 * 24; // 24 hours

// Utility function to clear beats cache
export const clearBeatsCache = async (userId: string): Promise<void> => {
  const cacheKey = `${STORAGE_KEYS.BEATS_CACHE}_${userId}`;
  const timestampKey = `${STORAGE_KEYS.BEATS_CACHE_TIMESTAMP}_${userId}`;
  await storage.multiRemove([cacheKey, timestampKey]);
};

interface BeatProviderProps {
  children: ReactNode;
}

export const BeatProvider: React.FC<BeatProviderProps> = ({ children }) => {
  const [allBeats, setAllBeats] = useState<Beat[]>([]);
  const [beats, setBeats] = useState<Beat[]>([]);
  const [currentBeats, setCurrentBeats] = useState<Beat[]>([]);
  const [paginatedBeats, setPaginatedBeats] = useState<Beat[]>([]);
  const [hoveredBeat, setHoveredBeat] = useState<Beat | null>(null);
  const [refreshBeats, setRefreshBeats] = useState(false);
  const [isLoadingFresh, setIsLoadingFresh] = useState(false);
  const [loadedFromCache, setLoadedFromCache] = useState(false);
  const { user } = useUser();

  useEffect(() => {
    if (!user.id) {
      return;
    }

    const cacheKey = `${STORAGE_KEYS.BEATS_CACHE}_${user.id}`;
    const timestampKey = `${STORAGE_KEYS.BEATS_CACHE_TIMESTAMP}_${user.id}`;
    let isMounted = true;
    let cachedDataString: string | null = null;

    const loadCachedBeats = async () => {
      try {
        const cachedData = await storage.get(cacheKey);
        const cacheTimestamp = await storage.get(timestampKey);

        if (cachedData && cacheTimestamp) {
          const parsedData: Beat[] = JSON.parse(cachedData);
          cachedDataString = cachedData;

          if (isMounted) {
            setAllBeats(parsedData);
            setBeats(parsedData);
            setLoadedFromCache(true);
          }
        }
      } catch (error) {
        console.error('Failed to load cached beats:', error);
      }
    };

    const fetchBeats = async () => {
      try {
        setIsLoadingFresh(true);
        const data = await getBeats(user.id);

        if (!isMounted) {
          return;
        }

        const freshDataString = JSON.stringify(data);
        const hasChanged = cachedDataString !== freshDataString;

        if (hasChanged || !cachedDataString) {
          setAllBeats(data);
          setBeats(data);
        }

        // Update cache
        try {
          await storage.set(cacheKey, freshDataString);
          await storage.set(timestampKey, Date.now().toString());
        } catch (cacheError) {
          console.error('Failed to cache beats:', cacheError);
        }
      } catch (error) {
        console.error('Failed to fetch beats:', error);
      } finally {
        if (isMounted) {
          setIsLoadingFresh(false);
        }
      }
    };

    // Load cache first, then fetch fresh data
    loadCachedBeats().then(() => {
      fetchBeats();
    });

    return () => {
      isMounted = false;
    };
  }, [refreshBeats, user.id]);

  return (
    <BeatContext.Provider
      value={{
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
        loadedFromCache,
      }}
    >
      {children}
    </BeatContext.Provider>
  );
};
