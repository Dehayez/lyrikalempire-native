import API_BASE_URL from '../utils/apiConfig';
import { apiRequest } from '../utils/apiUtils';

const API_URL = `${API_BASE_URL}/keywords`;

export interface Keyword {
  id: number;
  name: string;
}

export const getKeywords = async (): Promise<Keyword[]> => {
  return apiRequest('get', '', API_URL);
};

export const createKeyword = async (name: string): Promise<Keyword> => {
  return apiRequest('post', '', API_URL, { name });
};

export const updateKeyword = async (id: number, name: string): Promise<Keyword> => {
  return apiRequest('put', `/${id}`, API_URL, { name });
};

export const deleteKeyword = async (id: number): Promise<void> => {
  return apiRequest('delete', `/${id}`, API_URL);
};
