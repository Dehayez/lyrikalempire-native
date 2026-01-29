import { jwtDecode } from 'jwt-decode';
import API_BASE_URL from '../utils/apiConfig';
import { apiRequest } from '../utils/apiUtils';
import { storage, STORAGE_KEYS } from '../utils/storage';
import { DeviceEventEmitter } from 'react-native';

const API_URL = `${API_BASE_URL}/users`;

let refreshTimeoutId: ReturnType<typeof setTimeout> | null = null;
let tokenValidationIntervalId: ReturnType<typeof setInterval> | null = null;

interface DecodedToken {
  exp: number;
  iat?: number;
  id: string;
  email: string;
}

interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  email: string;
  username: string;
  id: string;
}

interface UserDetails {
  id: string;
  email: string;
  username: string;
}

// Register a new user
export const register = async (userData: { email: string; password: string; username: string }) => {
  return apiRequest('post', '/register', API_URL, userData, null, false);
};

// Log in a user and setup token refresh
export const login = async (userData: { identifier: string; password: string }): Promise<AuthResponse> => {
  // Send as email field to match backend API
  const response = await apiRequest<AuthResponse>('post', '/login', API_URL, { 
    email: userData.identifier, 
    password: userData.password 
  }, null, false);
  const { accessToken, refreshToken, email, username, id } = response;

  await storeTokens(accessToken, refreshToken);
  setupTokenRefresh(accessToken);

  return { accessToken, refreshToken, email, username, id };
};

// Store tokens securely
export const storeTokens = async (accessToken: string, refreshToken: string): Promise<void> => {
  await Promise.all([
    storage.set(STORAGE_KEYS.ACCESS_TOKEN, accessToken),
    storage.set(STORAGE_KEYS.REFRESH_TOKEN, refreshToken),
  ]);
};

// Clear tokens on logout
export const clearTokens = async (): Promise<void> => {
  await storage.multiRemove([STORAGE_KEYS.ACCESS_TOKEN, STORAGE_KEYS.REFRESH_TOKEN]);

  if (refreshTimeoutId) {
    clearTimeout(refreshTimeoutId);
    refreshTimeoutId = null;
  }

  if (tokenValidationIntervalId) {
    clearInterval(tokenValidationIntervalId);
    tokenValidationIntervalId = null;
  }
};

// Logout the user
export const logout = async (): Promise<void> => {
  // Just clear tokens locally - server doesn't have a logout endpoint
  await clearTokens();
};

// Get current user details
export const getUserDetails = async (): Promise<UserDetails> => {
  const response = await apiRequest<UserDetails>('get', '/me', API_URL);
  const { email, username, id } = response;
  return { email, username, id };
};

// Update user details
export const updateUserDetails = async (userData: Partial<UserDetails>) => {
  return apiRequest('put', '/me', API_URL, userData);
};

// Get a user by ID
export const getUserById = async (userId: string) => {
  return apiRequest('get', `/${userId}`, API_URL);
};

// Request password reset
export const requestPasswordReset = async (email: string) => {
  return apiRequest('post', '/request-password-reset', API_URL, { email }, null, false);
};

// Verify confirmation code
export const verifyConfirmationCode = async (email: string, confirmationCode: string) => {
  return apiRequest('post', '/verify-confirmation-code', API_URL, { email, confirmationCode }, null, false);
};

// Verify reset code
export const verifyResetCode = async (email: string, resetCode: string) => {
  return apiRequest('post', '/verify-reset-code', API_URL, { email, resetCode }, null, false);
};

// Reset password
export const resetPassword = async (email: string, resetCode: string, password: string) => {
  return apiRequest('post', '/reset-password', API_URL, { email, resetCode, password }, null, false);
};

// Verify token
export const verifyToken = async (token: string) => {
  return apiRequest('post', '/verify-token', API_URL, { token }, null, false);
};

// Calculate time until token refresh in milliseconds
export const calculateRefreshTime = (token: string): number => {
  try {
    const decodedToken = jwtDecode<DecodedToken>(token);
    const currentTime = Math.floor(Date.now() / 1000);
    const tokenExpiry = decodedToken.exp;
    const tokenIssuedAt = decodedToken.iat || (currentTime - 60);

    const tokenLifetime = tokenExpiry - tokenIssuedAt;
    const refreshPoint = tokenLifetime * 0.75;

    const timeUntilRefresh = Math.max(
      (tokenIssuedAt + refreshPoint - currentTime) * 1000,
      60000
    );

    return timeUntilRefresh;
  } catch (error) {
    console.error('[ERROR] Token decode error:', error);
    return 60000;
  }
};

// Refresh access token using refresh token
export const refreshTokenFunction = async (retryCount = 0): Promise<string | null> => {
  try {
    const refreshToken = await storage.get(STORAGE_KEYS.REFRESH_TOKEN);
    if (!refreshToken) {
      await clearTokens();
      return null;
    }

    const response = await apiRequest<{ accessToken: string; refreshToken: string }>(
      'post',
      '/token/refresh-token',
      API_URL,
      { token: refreshToken },
      null,
      false
    );

    const { accessToken, refreshToken: newRefreshToken } = response;

    if (!accessToken || !newRefreshToken) {
      await clearTokens();
      return null;
    }

    await storeTokens(accessToken, newRefreshToken);
    return accessToken;
  } catch (error) {
    if (retryCount < 2) {
      await new Promise(resolve => setTimeout(resolve, (retryCount + 1) * 2000));
      return refreshTokenFunction(retryCount + 1);
    }

    await clearTokens();
    return null;
  }
};

// Sets up the token refresh cycle
export const setupTokenRefresh = (accessToken: string): void => {
  if (refreshTimeoutId) {
    clearTimeout(refreshTimeoutId);
  }

  const timeUntilRefresh = calculateRefreshTime(accessToken);

  refreshTimeoutId = setTimeout(async () => {
    try {
      const newAccessToken = await refreshTokenFunction();
      if (newAccessToken) {
        setupTokenRefresh(newAccessToken);
      } else {
        DeviceEventEmitter.emit('auth:tokenExpired');
      }
    } catch (error) {
      DeviceEventEmitter.emit('auth:tokenExpired');
    }
  }, timeUntilRefresh);
};

// Initialize token refresh on app startup
export const startTokenRefresh = async (): Promise<void> => {
  const accessToken = await storage.get(STORAGE_KEYS.ACCESS_TOKEN);
  if (accessToken) {
    try {
      const decodedToken = jwtDecode<DecodedToken>(accessToken);
      const currentTime = Math.floor(Date.now() / 1000);

      if (decodedToken.exp <= currentTime) {
        const newToken = await refreshTokenFunction();
        if (newToken) {
          setupTokenRefresh(newToken);
        } else {
          DeviceEventEmitter.emit('auth:tokenExpired');
        }
      } else {
        setupTokenRefresh(accessToken);
      }
    } catch (error) {
      const newToken = await refreshTokenFunction();
      if (newToken) {
        setupTokenRefresh(newToken);
      } else {
        DeviceEventEmitter.emit('auth:tokenExpired');
      }
    }
  }

  if (tokenValidationIntervalId) {
    clearInterval(tokenValidationIntervalId);
    tokenValidationIntervalId = null;
  }

  tokenValidationIntervalId = setInterval(async () => {
    const currentAccessToken = await storage.get(STORAGE_KEYS.ACCESS_TOKEN);
    if (currentAccessToken) {
      try {
        const decodedToken = jwtDecode<DecodedToken>(currentAccessToken);
        const currentTime = Math.floor(Date.now() / 1000);
        const timeUntilExpiry = decodedToken.exp - currentTime;

        if (timeUntilExpiry < 300) {
          const newToken = await refreshTokenFunction();
          if (newToken) {
            setupTokenRefresh(newToken);
          } else {
            DeviceEventEmitter.emit('auth:tokenExpired');
          }
        }
      } catch (error) {
        // Silent error handling for token validation
      }
    }
  }, 300000);
};

// Check if user is authenticated
export const isAuthenticated = async (): Promise<boolean> => {
  const accessToken = await storage.get(STORAGE_KEYS.ACCESS_TOKEN);
  if (!accessToken) return false;

  try {
    const decodedToken = jwtDecode<DecodedToken>(accessToken);
    return decodedToken.exp > Math.floor(Date.now() / 1000);
  } catch (error) {
    return false;
  }
};

export default {
  register,
  login,
  logout,
  getUserDetails,
  updateUserDetails,
  getUserById,
  verifyConfirmationCode,
  requestPasswordReset,
  verifyResetCode,
  resetPassword,
  verifyToken,
  refreshToken: refreshTokenFunction,
  refreshTokenFunction,
  startTokenRefresh,
  isAuthenticated,
  setupTokenRefresh,
  storeTokens,
  clearTokens,
};
