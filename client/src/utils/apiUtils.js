import axios from 'axios';
import { getAuthHeaders } from './authUtils';

const handleApiError = (error) => {
  // Log the full error for debugging
  console.error('API Error Details:', {
    message: error.message,
    response: error.response,
    request: error.request ? 'Request exists but no response' : 'No request made',
    config: error.config
  });
  
  if (error.response) {
    const { status, data } = error.response;
    switch (status) {
      case 400:
        throw new Error(data.error || 'Bad Request');
      case 401:
        throw new Error(data.error || 'Unauthorized. Please log in again.');
      case 403:
        throw new Error(data.error || 'Forbidden. You do not have permission to perform this action.');
      case 404:
        throw new Error(data.error || 'Not Found. The requested resource could not be found.');
      case 500:
        throw new Error(data.error || 'Internal Server Error. Please try again later.');
      default:
        throw new Error(data.error || 'An unexpected error occurred. Please try again later.');
    }
  } else if (error.request) {
    throw new Error('No response received from the server. Please check your internet connection and try again.');
  } else {
    throw new Error('An unexpected error occurred. Please try again later.');
  }
};

export const apiRequest = async (method, url = '', baseURL, data = null, params = null, auth = true, headers = {}, onUploadProgress = null) => {
  try {
    const config = {
      method,
      url: `${baseURL}${url}`,
      ...(auth && getAuthHeaders()),
      ...(data && { data }),
      ...(params && { params }),
      headers: {
        ...headers,
        ...(auth && getAuthHeaders().headers),
      },
      ...(onUploadProgress && { onUploadProgress }),
    };
    
    const response = await axios(config);
    
    return response.data;
  } catch (error) {
    handleApiError(error);
  }
};