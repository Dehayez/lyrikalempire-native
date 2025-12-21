import API_BASE_URL from '../utils/apiConfig';
import { apiRequest } from '../utils/apiUtils';
import { jwtDecode } from 'jwt-decode';

const API_URL = `${API_BASE_URL}/users`;
let refreshTimeoutId = null;
let tokenValidationIntervalId = null; // Track the validation interval

/**
 * Register a new user
 */
export const register = async (userData) => {
  return await apiRequest('post', '/register', API_URL, userData, null, false);
};

/**
 * Log in a user and setup token refresh
 */
export const login = async (userData) => {
  const response = await apiRequest('post', '/login', API_URL, userData, null, false);
  const { accessToken, refreshToken, email, username, id } = response;
  
  // Store tokens securely
  storeTokens(accessToken, refreshToken);
  setupTokenRefresh(accessToken);
  
  return { accessToken, refreshToken, email, username, id };
};

/**
 * Login with Google OAuth
 */
export const loginWithGoogle = async (tokenId) => {
  const response = await apiRequest('post', '/auth/google', API_URL, { tokenId }, null, false);
  const { accessToken, refreshToken, email, username, id } = response;
  
  // Store tokens securely
  storeTokens(accessToken, refreshToken);
  setupTokenRefresh(accessToken);
  
  return { accessToken, refreshToken, email, username, id };
};

/**
 * Store tokens securely
 */
export const storeTokens = (accessToken, refreshToken) => {
  localStorage.setItem('accessToken', accessToken);
  localStorage.setItem('refreshToken', refreshToken);
};

/**
 * Clear tokens on logout
 */
export const clearTokens = () => {
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
  
  // Clear any existing refresh timers
  if (refreshTimeoutId) {
    clearTimeout(refreshTimeoutId);
    refreshTimeoutId = null;
  }
  
  // Clear the validation interval
  if (tokenValidationIntervalId) {
    clearInterval(tokenValidationIntervalId);
    tokenValidationIntervalId = null;
  }
};

/**
 * Logout the user
 */
export const logout = async () => {
  try {
    // Optionally notify server to invalidate refresh token
    await apiRequest('post', '/logout', API_URL);
  } catch (error) {
    console.error('[ERROR] Logout error:', error);
  } finally {
    clearTokens();
  }
};

/**
 * Get current user details
 */
export const getUserDetails = async () => {
  const response = await apiRequest('get', '/me', API_URL);
  const { email, username, id } = response;
  return { email, username, id };
};

/**
 * Update user details
 */
export const updateUserDetails = async (userData) => {
  return await apiRequest('put', '/me', API_URL, userData);
};

/**
 * Get a user by ID
 */
export const getUserById = async (userId) => {
  return await apiRequest('get', `/${userId}`, API_URL);
};

/**
 * Request password reset
 */
export const requestPasswordReset = async (email) => {
  return await apiRequest('post', '/request-password-reset', API_URL, { email }, null, false);
};

/**
 * Verify confirmation code
 */
export const verifyConfirmationCode = async (email, confirmationCode) => {
  return await apiRequest('post', '/verify-confirmation-code', API_URL, { email, confirmationCode }, null, false);
};

/**
 * Verify reset code
 */
export const verifyResetCode = async (email, resetCode) => {
  return await apiRequest('post', '/verify-reset-code', API_URL, { email, resetCode }, null, false);
};

/**
 * Reset password
 */
export const resetPassword = async (email, resetCode, password) => {
  return await apiRequest('post', '/reset-password', API_URL, { email, resetCode, password }, null, false);
};

/**
 * Verify token
 */
export const verifyToken = async (token) => {
  return await apiRequest('post', '/verify-token', API_URL, { token }, null, false);
};

/**
 * Calculate time until token refresh in milliseconds
 * Refreshes at 75% of token lifetime to prevent edge cases
 */
export const calculateRefreshTime = (token) => {
  try {
    const decodedToken = jwtDecode(token);
    const currentTime = Math.floor(Date.now() / 1000);
    const tokenExpiry = decodedToken.exp;
    const tokenIssuedAt = decodedToken.iat || (currentTime - 60); // Fallback if iat not present
    
    const tokenLifetime = tokenExpiry - tokenIssuedAt;
    const refreshPoint = tokenLifetime * 0.75; // Refresh at 75% of lifetime
    
    const timeUntilRefresh = Math.max(
      (tokenIssuedAt + refreshPoint - currentTime) * 1000, 
      60000 // Minimum 1 minute
    );
    
    return timeUntilRefresh;
  } catch (error) {
    console.error('[ERROR] Token decode error:', error);
    return 60000; // Refresh in 1 minute if we can't decode the token
  }
};

/**
 * Refresh access token using refresh token
 */
export const refreshTokenFunction = async (retryCount = 0) => {
  try {
    const refreshToken = localStorage.getItem('refreshToken');
    if (!refreshToken) {
      clearTokens(); // Clean up any lingering data
      return null;
    }

    const response = await apiRequest(
      'post', 
      '/token/refresh-token', 
      API_URL, 
      { token: refreshToken }, 
      null, 
      false
    );
    
    const { accessToken, refreshToken: newRefreshToken } = response;
    
    if (!accessToken || !newRefreshToken) {
      clearTokens();
      return null;
    }
    
    storeTokens(accessToken, newRefreshToken);
    
    return accessToken;
  } catch (error) {
    // Retry up to 2 times before giving up
    if (retryCount < 2) {
      await new Promise(resolve => setTimeout(resolve, (retryCount + 1) * 2000));
      return refreshTokenFunction(retryCount + 1);
    }
    
    // If all retries failed, clear tokens but don't immediately dispatch event
    // Let the calling code decide whether to dispatch the event
    clearTokens();
    return null;
  }
};

/**
 * Sets up the token refresh cycle
 */
export const setupTokenRefresh = (accessToken) => {
  // Clear any existing refresh timer
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
        window.dispatchEvent(new CustomEvent('auth:tokenExpired'));
      }
    } catch (error) {
      // Final fallback - dispatch token expired event
      window.dispatchEvent(new CustomEvent('auth:tokenExpired'));
    }
  }, timeUntilRefresh);
};

/**
 * Initialize token refresh on app startup
 */
export const startTokenRefresh = () => {
  const accessToken = localStorage.getItem('accessToken');
  if (accessToken) {
    try {
      // Verify the token is still decodable
      const decodedToken = jwtDecode(accessToken);
      const currentTime = Math.floor(Date.now() / 1000);
      
      // If token is expired, refresh immediately
      if (decodedToken.exp <= currentTime) {
        refreshTokenFunction().then(newToken => {
          if (newToken) {
            setupTokenRefresh(newToken);
          } else {
            window.dispatchEvent(new CustomEvent('auth:tokenExpired'));
          }
        });
      } else {
        // Otherwise set up the normal refresh cycle
        setupTokenRefresh(accessToken);
      }
    } catch (error) {
      refreshTokenFunction().then(newToken => {
        if (newToken) {
          setupTokenRefresh(newToken);
        } else {
          window.dispatchEvent(new CustomEvent('auth:tokenExpired'));
        }
      });
    }
  }
  
  // Clear any existing validation interval before creating a new one
  if (tokenValidationIntervalId) {
    clearInterval(tokenValidationIntervalId);
    tokenValidationIntervalId = null;
  }
  
  // Set up periodic token validation (every 5 minutes)
  tokenValidationIntervalId = setInterval(() => {
    const currentAccessToken = localStorage.getItem('accessToken');
    if (currentAccessToken) {
      try {
        const decodedToken = jwtDecode(currentAccessToken);
        const currentTime = Math.floor(Date.now() / 1000);
        const timeUntilExpiry = decodedToken.exp - currentTime;
        
        // If token expires in less than 5 minutes and we haven't refreshed recently  
        if (timeUntilExpiry < 300) { // 5 minutes
          refreshTokenFunction().then(newToken => {
            if (newToken) {
              setupTokenRefresh(newToken);
            } else {
              window.dispatchEvent(new CustomEvent('auth:tokenExpired'));
            }
          });
        }
      } catch (error) {
        // Silent error handling for token validation
      }
    }
  }, 300000); // Check every 5 minutes
};

/**
 * Check if user is authenticated
 */
export const isAuthenticated = () => {
  const accessToken = localStorage.getItem('accessToken');
  if (!accessToken) return false;
  
  try {
    const decodedToken = jwtDecode(accessToken);
    return decodedToken.exp > Math.floor(Date.now() / 1000);
  } catch (error) {
    return false;
  }
};

export default {
  register,
  login,
  loginWithGoogle,
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
};