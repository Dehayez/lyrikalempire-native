import API_BASE_URL from '../utils/apiConfig';
import { apiRequest } from '../utils/apiUtils';
import { Beat } from './beatService';

const API_URL = `${API_BASE_URL}/playlists`;

export interface Playlist {
  id: number;
  title: string;
  description?: string;
  user_id: string;
  created_at: string;
  beat_count?: number;
}

interface DuplicateCheckResult {
  isDuplicate: boolean;
  duplicates: number[];
  newTracks: number[];
}

export const createPlaylist = async (
  playlistData: { title: string; description?: string },
  user_id: string
): Promise<Playlist> => {
  return apiRequest('post', '', API_URL, { ...playlistData, user_id });
};

export const getPlaylists = async (user_id: string): Promise<Playlist[]> => {
  return apiRequest('get', '', API_URL, null, { user_id });
};

export const updatePlaylist = async (
  id: number,
  playlistData: Partial<Playlist>
): Promise<Playlist> => {
  return apiRequest('put', `/${id}`, API_URL, playlistData);
};

export const deletePlaylist = async (id: number): Promise<void> => {
  await removeAllBeatsFromPlaylist(id);
  return apiRequest('delete', `/${id}`, API_URL);
};

export const addBeatsToPlaylist = async (
  playlistId: number,
  beatIds: number | number[],
  allowDuplicates = false
): Promise<any | DuplicateCheckResult> => {
  const beatIdArray = Array.isArray(beatIds) ? beatIds : [beatIds];

  if (!allowDuplicates) {
    try {
      const existingBeats = await getBeatsByPlaylistId(playlistId);
      const existingBeatIds = existingBeats.map(beat => beat.id);
      const duplicateBeatIds = beatIdArray.filter(id => existingBeatIds.includes(id));

      if (duplicateBeatIds.length > 0) {
        return {
          isDuplicate: true,
          duplicates: duplicateBeatIds,
          newTracks: beatIdArray.filter(id => !existingBeatIds.includes(id))
        };
      }
    } catch (error) {
      console.error('Error checking for duplicates:', error);
    }
  }

  const result = await apiRequest('post', `/${playlistId}/beats`, API_URL, { beatIds: beatIdArray });
  return result;
};

export const removeBeatFromPlaylist = async (
  playlistId: number,
  beatId: number
): Promise<void> => {
  return apiRequest('delete', `/${playlistId}/beats/${beatId}`, API_URL);
};

export const getBeatsByPlaylistId = async (playlistId: number): Promise<Beat[]> => {
  return apiRequest('get', `/${playlistId}/beats`, API_URL);
};

export const removeAllBeatsFromPlaylist = async (playlistId: number): Promise<void> => {
  return apiRequest('delete', `/${playlistId}/beats`, API_URL);
};

export const getPlaylistById = async (id: number): Promise<Playlist> => {
  return apiRequest('get', `/${id}`, API_URL);
};

export const updateBeatOrder = async (
  playlistId: number,
  beatOrders: { beat_id: number; beat_order: number }[]
): Promise<void> => {
  return apiRequest('put', `/${playlistId}/beats/order`, API_URL, { beatOrders });
};
