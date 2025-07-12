import API_BASE_URL from '../utils/apiConfig';
import { apiRequest } from '../utils/apiUtils';

const API_URL = `${API_BASE_URL}/genres`;

export const getGenres = async () => {
  return await apiRequest('get', '', API_URL);
};

export const createGenre = async (name) => {
  return await apiRequest('post', '', API_URL, { name });
};

export const updateGenre = async (id, name) => {
  return await apiRequest('put', `/${id}`, API_URL, { name });
};

export const deleteGenre = async (id) => {
  return await apiRequest('delete', `/${id}`, API_URL);
};

// Backwards compatibility alias
export const addGenre = createGenre;