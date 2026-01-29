import { storage, STORAGE_KEYS } from './storage';

export const getAuthHeaders = async (): Promise<{ headers: { Authorization: string } }> => {
  const token = await storage.get(STORAGE_KEYS.ACCESS_TOKEN);
  if (!token) {
    throw new Error('User is not logged in');
  }
  return {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  };
};

export const getAccessToken = async (): Promise<string | null> => {
  return storage.get(STORAGE_KEYS.ACCESS_TOKEN);
};

export const getRefreshToken = async (): Promise<string | null> => {
  return storage.get(STORAGE_KEYS.REFRESH_TOKEN);
};
