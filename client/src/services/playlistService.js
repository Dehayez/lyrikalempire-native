import API_BASE_URL from '../utils/apiConfig';
import { apiRequest } from '../utils/apiUtils';

const API_URL = `${API_BASE_URL}/playlists`;

const createPlaylist = async (playlistData, user_id) => {
  return apiRequest('post', '', API_URL, { ...playlistData, user_id });
};

const getPlaylists = async (user_id) => {
  return apiRequest('get', '', API_URL, null, { user_id });
};

const updatePlaylist = async (id, playlistData) => {
  return apiRequest('put', `/${id}`, API_URL, playlistData);
};

const deletePlaylist = async (id) => {
  await removeAllBeatsFromPlaylist(id);
  return apiRequest('delete', `/${id}`, API_URL);
};

const addBeatsToPlaylist = async (playlistId, beatIds, allowDuplicates = false) => {
  if (!Array.isArray(beatIds)) {
    beatIds = [beatIds];
  }
  
  // If allowDuplicates is false, check for duplicates first
  if (!allowDuplicates) {
    try {
      // Get existing beats in the playlist
      const existingBeats = await getBeatsByPlaylistId(playlistId);
      const existingBeatIds = existingBeats.map(beat => beat.id);
      const duplicateBeatIds = beatIds.filter(id => existingBeatIds.includes(id));
      
      if (duplicateBeatIds.length > 0) {
        // Return duplicate information instead of adding
        return {
          isDuplicate: true,
          duplicates: duplicateBeatIds,
          newTracks: beatIds.filter(id => !existingBeatIds.includes(id))
        };
      }
    } catch (error) {
      console.error('Error checking for duplicates:', error);
      // Continue with normal flow if duplicate check fails
    }
  }
  
  const result = await apiRequest('post', `/${playlistId}/beats`, API_URL, { beatIds });
  return result;
};

const removeBeatFromPlaylist = async (playlistId, beatId) => {
  return apiRequest('delete', `/${playlistId}/beats/${beatId}`, API_URL);
};

const getBeatsByPlaylistId = async (playlistId) => {
  return apiRequest('get', `/${playlistId}/beats`, API_URL);
};

const removeAllBeatsFromPlaylist = async (playlistId) => {
  return apiRequest('delete', `/${playlistId}/beats`, API_URL);
};

const getPlaylistById = async (id) => {
  return apiRequest('get', `/${id}`, API_URL);
};

const updateBeatOrder = async (playlistId, beatOrders) => {
  return apiRequest('put', `/${playlistId}/beats/order`, API_URL, { beatOrders });
};

export {
  createPlaylist,
  getPlaylists,
  updatePlaylist,
  deletePlaylist,
  addBeatsToPlaylist,
  getBeatsByPlaylistId,
  removeBeatFromPlaylist,
  getPlaylistById,
  removeAllBeatsFromPlaylist,
  updateBeatOrder,
};