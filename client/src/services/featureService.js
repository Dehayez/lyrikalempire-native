import API_BASE_URL from '../utils/apiConfig';
import { apiRequest } from '../utils/apiUtils';

const API_URL = `${API_BASE_URL}/features`;

export const getFeatures = async () => {
  return await apiRequest('get', '', API_URL);
};

export const createFeature = async (name) => {
  return await apiRequest('post', '', API_URL, { name });
};

export const updateFeature = async (id, name) => {
  return await apiRequest('put', `/${id}`, API_URL, { name });
};

export const deleteFeature = async (id) => {
  return await apiRequest('delete', `/${id}`, API_URL);
};

// Backwards compatibility alias
export const addFeature = createFeature;