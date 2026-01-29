import axios, { AxiosRequestConfig, Method } from 'axios';
import { getAuthHeaders } from './authUtils';

interface ApiError extends Error {
  status?: number;
}

const handleApiError = (error: any): never => {
  if (error.response) {
    const { status, data } = error.response;
    const apiError: ApiError = new Error(data.error || 'An unexpected error occurred');
    apiError.status = status;
    
    switch (status) {
      case 400:
        apiError.message = data.error || 'Bad Request';
        break;
      case 401:
        apiError.message = data.error || 'Unauthorized. Please log in again.';
        break;
      case 403:
        apiError.message = data.error || 'Forbidden. You do not have permission to perform this action.';
        break;
      case 404:
        apiError.message = data.error || 'Not Found. The requested resource could not be found.';
        break;
      case 500:
        apiError.message = data.error || 'Internal Server Error. Please try again later.';
        break;
      default:
        apiError.message = data.error || 'An unexpected error occurred. Please try again later.';
    }
    throw apiError;
  } else if (error.request) {
    throw new Error('No response received from the server. Please check your internet connection and try again.');
  } else {
    throw new Error('An unexpected error occurred. Please try again later.');
  }
};

export const apiRequest = async <T = any>(
  method: Method,
  url: string = '',
  baseURL: string,
  data: any = null,
  params: Record<string, any> | null = null,
  auth: boolean = true,
  headers: Record<string, string> = {},
  onUploadProgress?: (progressEvent: any) => void
): Promise<T> => {
  try {
    const config: AxiosRequestConfig = {
      method,
      url: `${baseURL}${url}`,
      ...(data && { data }),
      ...(params && { params }),
      headers: {
        ...headers,
      },
      ...(onUploadProgress && { onUploadProgress }),
    };

    if (auth) {
      const authHeaders = await getAuthHeaders();
      config.headers = {
        ...config.headers,
        ...authHeaders.headers,
      };
    }

    const response = await axios(config);
    return response.data;
  } catch (error) {
    handleApiError(error);
  }
};
