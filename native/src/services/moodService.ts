import API_BASE_URL from '../utils/apiConfig';
import { apiRequest } from '../utils/apiUtils';

const API_URL = `${API_BASE_URL}/moods`;

export interface Mood {
  id: number;
  name: string;
}

export const getMoods = async (): Promise<Mood[]> => {
  return apiRequest('get', '', API_URL);
};

export const createMood = async (name: string): Promise<Mood> => {
  return apiRequest('post', '', API_URL, { name });
};

export const updateMood = async (id: number, name: string): Promise<Mood> => {
  return apiRequest('put', `/${id}`, API_URL, { name });
};

export const deleteMood = async (id: number): Promise<void> => {
  return apiRequest('delete', `/${id}`, API_URL);
};
