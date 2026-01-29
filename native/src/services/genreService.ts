import API_BASE_URL from '../utils/apiConfig';
import { apiRequest } from '../utils/apiUtils';

const API_URL = `${API_BASE_URL}/genres`;

export interface Genre {
  id: number;
  name: string;
}

export const getGenres = async (): Promise<Genre[]> => {
  return apiRequest('get', '', API_URL);
};

export const createGenre = async (name: string): Promise<Genre> => {
  return apiRequest('post', '', API_URL, { name });
};

export const updateGenre = async (id: number, name: string): Promise<Genre> => {
  return apiRequest('put', `/${id}`, API_URL, { name });
};

export const deleteGenre = async (id: number): Promise<void> => {
  return apiRequest('delete', `/${id}`, API_URL);
};
