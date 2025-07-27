import React, { createContext, useState, useContext, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { jwtDecode } from 'jwt-decode';
import userService from '../services/userService';
import { isAuthPage } from '../utils/isAuthPage';

const UserContext = createContext();

export const UserProvider = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState({ id: '', email: '', username: '' });
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const checkAuth = async () => {
      setIsLoading(true);
      try {
        // Clean up any legacy single token storage
        const legacyToken = localStorage.getItem('token');
        if (legacyToken) {
          localStorage.removeItem('token');
        }
        
        // Initialize token refresh mechanism on app startup
        userService.startTokenRefresh();
        
        // Use userService method that checks for accessToken
        if (userService.isAuthenticated()) {
          const userDetails = await userService.getUserDetails();
          setUser({ id: userDetails.id, email: userDetails.email, username: userDetails.username });
          setIsAuthenticated(true);
        } else {
          setIsAuthenticated(false);
        }
      } catch (error) {
        console.error('Auth check failed:', error);
        setIsAuthenticated(false);
        // Clear all tokens on auth failure
        userService.clearTokens();
        navigate('/login');
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
    
    // Listen for token expiration events from userService
    const handleTokenExpired = () => {
      // Add a small delay to allow any ongoing token refresh to complete
      setTimeout(() => {
        // Double-check if we still don't have a valid token
        if (!userService.isAuthenticated()) {
          setIsAuthenticated(false);
          setUser({ id: '', email: '', username: '' });
          
          // Only redirect to login if user is on a protected route
          const currentPath = location.pathname;
          const isPublicRoute = isAuthPage(currentPath) || 
                              currentPath === '/profile' || 
                              currentPath === '*' ||
                              currentPath === '/404';
          
          if (!isPublicRoute) {
            navigate('/login');
          }
        }
      }, 2000); // Wait 2 seconds before redirecting
    };
    
    // Handle visibility change to check token when tab becomes active
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // When tab becomes visible, check if we need to refresh token
        const accessToken = localStorage.getItem('accessToken');
        if (accessToken) {
          try {
            const decodedToken = jwtDecode(accessToken);
            const currentTime = Math.floor(Date.now() / 1000);
            const timeUntilExpiry = decodedToken.exp - currentTime;
            
            // If token expires in less than 5 minutes, refresh it
            if (timeUntilExpiry < 300) { // 5 minutes
              userService.refreshTokenFunction().then(newToken => {
                if (newToken) {
                  userService.setupTokenRefresh(newToken);
                }
              });
            }
          } catch (error) {
            console.error('[ERROR] Error checking token on visibility change:', error);
          }
        }
      }
    };
    
    window.addEventListener('auth:tokenExpired', handleTokenExpired);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      window.removeEventListener('auth:tokenExpired', handleTokenExpired);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [navigate]);

  const login = async (identifier, password) => {
    setIsLoading(true);
    try {
      const { accessToken, refreshToken, email, username, id } = await userService.login({ email: identifier, password });
      // userService.login already stores tokens and sets up refresh - no need to store manually
      setUser({ id, email, username });
      setIsAuthenticated(true);
      navigate('/');
    } catch (error) {
      setIsAuthenticated(false);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    setIsLoading(true);
    try {
      await userService.logout(); // This clears tokens and notifies server
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setUser({ id: '', email: '', username: '' });
      setIsAuthenticated(false);
      setIsLoading(false);
      navigate('/login');
    }
  };

  return (
    <UserContext.Provider value={{ isAuthenticated, isLoading, login, logout, user, setUser }}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => useContext(UserContext);