import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { getPlaylists, Playlist } from '../services/playlistService';
import { useUser } from './UserContext';

interface PlaylistContextType {
  playlists: Playlist[];
  setPlaylists: React.Dispatch<React.SetStateAction<Playlist[]>>;
  isLoading: boolean;
  refreshPlaylists: () => void;
}

const PlaylistContext = createContext<PlaylistContextType | undefined>(undefined);

export const usePlaylist = (): PlaylistContextType => {
  const context = useContext(PlaylistContext);
  if (context === undefined) {
    throw new Error('usePlaylist must be used within a PlaylistProvider');
  }
  return context;
};

interface PlaylistProviderProps {
  children: ReactNode;
}

export const PlaylistProvider: React.FC<PlaylistProviderProps> = ({ children }) => {
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const { user } = useUser();

  useEffect(() => {
    if (!user.id) {
      return;
    }

    let isMounted = true;

    const fetchPlaylists = async () => {
      setIsLoading(true);
      try {
        const data = await getPlaylists(user.id);
        if (isMounted) {
          setPlaylists(data);
        }
      } catch (error) {
        console.error('Failed to fetch playlists:', error);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    fetchPlaylists();

    return () => {
      isMounted = false;
    };
  }, [user.id, refreshTrigger]);

  const refreshPlaylists = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  return (
    <PlaylistContext.Provider value={{ playlists, setPlaylists, isLoading, refreshPlaylists }}>
      {children}
    </PlaylistContext.Provider>
  );
};
