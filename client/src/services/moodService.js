import API_BASE_URL from '../utils/apiConfig';
import { apiRequest } from '../utils/apiUtils';

const API_URL = `${API_BASE_URL}/moods`;

export const getMoods = async () => {
  return await apiRequest('get', '', API_URL, null, null, false);
};

export const createMood = async (name) => {
  return await apiRequest('post', '', API_URL, { name });
};

export const updateMood = async (id, name) => {
  return await apiRequest('put', `/${id}`, API_URL, { name });
};

export const deleteMood = async (id) => {
  return await apiRequest('delete', `/${id}`, API_URL);
};

// Backwards compatibility alias
export const addMood = createMood;