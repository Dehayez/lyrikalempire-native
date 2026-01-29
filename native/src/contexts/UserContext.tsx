import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import { DeviceEventEmitter } from 'react-native';
import { jwtDecode } from 'jwt-decode';
import userService from '../services/userService';
import { storage, STORAGE_KEYS } from '../utils/storage';

interface User {
  id: string;
  email: string;
  username: string;
}

interface UserContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: User;
  setUser: React.Dispatch<React.SetStateAction<User>>;
  login: (identifier: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const defaultUser: User = { id: '', email: '', username: '' };

const UserContext = createContext<UserContextType | undefined>(undefined);

interface UserProviderProps {
  children: ReactNode;
}

export const UserProvider: React.FC<UserProviderProps> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<User>(defaultUser);

  useEffect(() => {
    const checkAuth = async () => {
      setIsLoading(true);
      try {
        const accessToken = await storage.get(STORAGE_KEYS.ACCESS_TOKEN);
        const refreshToken = await storage.get(STORAGE_KEYS.REFRESH_TOKEN);
        let isCurrentlyAuthenticated = false;

        if (refreshToken && !accessToken) {
          try {
            const newToken = await userService.refreshTokenFunction();
            if (newToken) {
              isCurrentlyAuthenticated = true;
            }
          } catch (error) {
            isCurrentlyAuthenticated = false;
          }
        } else if (accessToken) {
          try {
            const decodedToken = jwtDecode<{ exp: number }>(accessToken);
            const currentTime = Math.floor(Date.now() / 1000);
            const isExpired = decodedToken.exp <= currentTime;

            if (isExpired) {
              try {
                const newToken = await userService.refreshTokenFunction();
                if (newToken) {
                  isCurrentlyAuthenticated = true;
                }
              } catch (error) {
                isCurrentlyAuthenticated = false;
              }
            } else {
              isCurrentlyAuthenticated = true;
            }
          } catch (error) {
            if (refreshToken) {
              try {
                const newToken = await userService.refreshTokenFunction();
                if (newToken) {
                  isCurrentlyAuthenticated = true;
                }
              } catch (refreshError) {
                isCurrentlyAuthenticated = false;
              }
            } else {
              isCurrentlyAuthenticated = false;
            }
          }
        }

        if (isCurrentlyAuthenticated) {
          await userService.startTokenRefresh();
          const userDetails = await userService.getUserDetails();
          setUser({ id: userDetails.id, email: userDetails.email, username: userDetails.username });
          setIsAuthenticated(true);
        } else {
          setIsAuthenticated(false);
        }
      } catch (error) {
        setIsAuthenticated(false);
        await userService.clearTokens();
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();

    // Listen for token expiration events
    const subscription = DeviceEventEmitter.addListener('auth:tokenExpired', async () => {
      setTimeout(async () => {
        const isAuth = await userService.isAuthenticated();
        if (!isAuth) {
          setIsAuthenticated(false);
          setUser(defaultUser);
        }
      }, 2000);
    });

    return () => {
      subscription.remove();
    };
  }, []);

  const login = async (identifier: string, password: string): Promise<void> => {
    setIsLoading(true);
    try {
      const { email, username, id } = await userService.login({ identifier, password });
      setUser({ id, email, username });
      setIsAuthenticated(true);
    } catch (error) {
      setIsAuthenticated(false);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async (): Promise<void> => {
    setIsLoading(true);
    try {
      await userService.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setUser(defaultUser);
      setIsAuthenticated(false);
      setIsLoading(false);
    }
  };

  return (
    <UserContext.Provider value={{ isAuthenticated, isLoading, login, logout, user, setUser }}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = (): UserContextType => {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
};
