import React, { createContext, useContext, useEffect, useState } from 'react';
import io from 'socket.io-client';

const WebSocketContext = createContext();

export const useWebSocket = () => {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error('useWebSocket must be used within a WebSocketProvider');
  }
  return context;
};

export const WebSocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    // disable websocket
    return;
    // Connect to WebSocket server - use dynamic URL based on current domain
    const wsUrl = process.env.NODE_ENV === 'production' 
      ? window.location.origin  // Use the same origin as the current page
      : 'http://localhost:4000'; // Development WebSocket URL
    
    // Get authentication token from localStorage
    const accessToken = localStorage.getItem('accessToken');
    
    // Only connect if user is authenticated
    if (!accessToken) {
      return;
    }
    
    // Connect with authentication token
    const newSocket = io(wsUrl, {
      auth: {
        token: accessToken
      },
      query: {
        token: accessToken
      }
    });
    
    newSocket.on('connect', () => {
      setIsConnected(true);
    });

    newSocket.on('disconnect', () => {
      setIsConnected(false);
    });
    
    newSocket.on('error', (error) => {
      console.error('WebSocket error:', error);
      setIsConnected(false);
    });

    // Listen for authentication errors
    newSocket.on('connect_error', (error) => {
      if (error.message === 'Authentication token required' || 
          error.message === 'Token expired' || 
          error.message === 'Invalid token') {
        // Try to refresh token and reconnect
        const refreshToken = localStorage.getItem('refreshToken');
        if (refreshToken) {
          // Token refresh would be handled by userService
          // For now, just log the error
          console.warn('WebSocket authentication failed, token may need refresh');
        }
      }
    });

    setSocket(newSocket);

    // Cleanup on unmount
    return () => {
      newSocket.close();
    };
  }, []);

  const emitAudioPlay = (data) => {
    if (socket && isConnected) {
      socket.emit('audio-play', data);
    }
  };

  const emitAudioPause = (data) => {
    if (socket && isConnected) {
      socket.emit('audio-pause', data);
    }
  };

  const emitAudioSeek = (data) => {
    if (socket && isConnected) {
      socket.emit('audio-seek', data);
    }
  };

  const emitBeatChange = (data) => {
    if (socket && isConnected) {
      socket.emit('beat-change', data);
    }
  };

  const emitStateRequest = () => {
    if (socket && isConnected) {
      socket.emit('request-state');
    }
  };

  const emitStateResponse = (data) => {
    if (socket && isConnected) {
      socket.emit('state-response', data);
    }
  };

  const emitMasterClosed = (data) => {
    if (socket && isConnected) {
      socket.emit('master-closed', data);
    }
  };

  const value = {
    socket,
    isConnected,
    emitAudioPlay,
    emitAudioPause,
    emitAudioSeek,
    emitBeatChange,
    emitStateRequest,
    emitStateResponse,
    emitMasterClosed
  };

  return (
    <WebSocketContext.Provider value={value}>
      {children}
    </WebSocketContext.Provider>
  );
}; 