import axios from 'axios';
import API_BASE_URL from '../utils/apiConfig';
import { apiRequest } from '../utils/apiUtils';

const API_URL = `${API_BASE_URL}/beats`;

export interface Beat {
  id: number;
  title: string;
  audio: string;
  bpm: number;
  tierlist: string;
  duration: number;
  created_at: string;
  user_id: string;
  genres?: { id: number; name: string }[];
  moods?: { id: number; name: string }[];
  keywords?: { id: number; name: string }[];
  features?: { id: number; name: string }[];
}

export const getSignedUrl = async (userId: string, fileName: string): Promise<string> => {
  try {
    const response = await axios.get(`${API_URL}/signed-url/${fileName}`, {
      params: { userId }
    });
    return response.data.signedUrl;
  } catch (error) {
    throw new Error('Error fetching signed URL');
  }
};

export const getBeats = async (user_id: string): Promise<Beat[]> => {
  const result = await apiRequest<Beat[]>('get', '', API_URL, null, { user_id });
  return result;
};

export const addBeat = async (beat: Partial<Beat>, audioFile: any, user_id: string) => {
  const formData = new FormData();

  for (const key in beat) {
    const value = (beat as any)[key];
    if (value !== null && key !== 'audio') {
      formData.append(key, value);
    }
  }

  if (audioFile) {
    formData.append('audio', {
      uri: audioFile.uri,
      type: audioFile.type || 'audio/mpeg',
      name: audioFile.name || 'audio.mp3',
    } as any);
  }

  formData.append('user_id', user_id);

  return apiRequest('post', '', API_URL, formData, null, true, {
    'Content-Type': 'multipart/form-data'
  });
};

export const updateBeat = async (beatId: number, beatData: Partial<Beat>) => {
  try {
    const result = await apiRequest('put', `/${beatId}`, API_URL, beatData);
    return result;
  } catch (error) {
    console.error('Beat update API error:', error);
    throw error;
  }
};

export const deleteBeat = async (beatId: number, userId: string) => {
  return await apiRequest('delete', `/${beatId}`, API_URL, null, { userId });
};

export const addAssociationToBeat = async (
  beatId: number,
  associationType: string,
  associationId: number
) => {
  return await apiRequest('post', `/${beatId}/${associationType}/${associationId}`, API_URL);
};

export const removeAssociationFromBeat = async (
  beatId: number,
  associationType: string,
  associationId: number
) => {
  return await apiRequest('delete', `/${beatId}/${associationType}/${associationId}`, API_URL);
};

export const getAssociationsByBeatId = async (beatId: number, associationType: string) => {
  return await apiRequest('get', `/${beatId}/${associationType}`, API_URL);
};

export const removeAllAssociationsFromBeat = async (beatId: number, associationType: string) => {
  return await apiRequest('delete', `/${beatId}/${associationType}`, API_URL);
};

export const getBeatsByAssociation = async (
  associationType: string,
  associationIds: number[],
  allBeats: Beat[] | null,
  user_id: string
): Promise<Beat[]> => {
  const response = await apiRequest<Beat[]>('get', '', API_URL, null, {
    associationType,
    associationIds: associationIds.join(','),
    user_id
  });
  const fetchedBeats = response.reverse();
  return allBeats ? fetchedBeats.filter(beat => allBeats.some(b => b.id === beat.id)) : fetchedBeats;
};

export const replaceAudio = (beatId: number, audioFile: any, userId: string, duration: number) => {
  const formData = new FormData();
  formData.append('audio', {
    uri: audioFile.uri,
    type: audioFile.type || 'audio/mpeg',
    name: audioFile.name || 'audio.mp3',
  } as any);
  formData.append('userId', userId);
  formData.append('duration', duration.toString());

  return apiRequest('put', `/${beatId}/replace-audio`, API_URL, formData, null, true, {
    'Content-Type': 'multipart/form-data'
  });
};

export const addAssociationsToBeat = async (
  beatId: number,
  associationType: string,
  associationId: number
) => {
  try {
    const response = await apiRequest('post', `/${beatId}/${associationType}`, API_URL, {
      association_id: associationId
    });
    return response;
  } catch (error) {
    throw error;
  }
};
