import API_BASE_URL from '../utils/apiConfig';
import { apiRequest } from '../utils/apiUtils';

const API_URL = `${API_BASE_URL}/keywords`;

export const getKeywords = async () => {
  return await apiRequest('get', '', API_URL, null, null, false);
};

export const createKeyword = async (name) => {
  return await apiRequest('post', '', API_URL, { name });
};

export const updateKeyword = async (id, name) => {
  return await apiRequest('put', `/${id}`, API_URL, { name });
};

export const deleteKeyword = async (id) => {
  return await apiRequest('delete', `/${id}`, API_URL);
};

// Backwards compatibility alias
export const addKeyword = createKeyword;