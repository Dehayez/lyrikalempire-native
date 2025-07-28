import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';

import './index.scss';
import App from './App';
import reportWebVitals from './reportWebVitals';

import { PlaylistProvider, BeatProvider, DataProvider, HeaderWidthProvider, UserProvider, WebSocketProvider } from './contexts'; 

// Register service worker for PWA audio support
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then((registration) => {
        // Listen for service worker messages (audio control)
        navigator.serviceWorker.addEventListener('message', (event) => {
          const { type, data, direction } = event.data;
          
          // Handle background audio control messages
          if (type === 'PLAY_FROM_NOTIFICATION') {
            // Trigger play from notification
            document.dispatchEvent(new CustomEvent('audio:play'));
          } else if (type === 'PAUSE_FROM_NOTIFICATION') {
            // Trigger pause from notification
            document.dispatchEvent(new CustomEvent('audio:pause'));
          } else if (type === 'NEXT_FROM_NOTIFICATION') {
            // Trigger next track from notification
            document.dispatchEvent(new CustomEvent('audio:next'));
          } else if (type === 'BACKGROUND_SKIP_TRACK') {
            // Handle background track skip
            document.dispatchEvent(new CustomEvent('audio:skip', { detail: { direction } }));
          }
        });
      })
      .catch((registrationError) => {
        console.log('SW registration failed: ', registrationError);
      });
  });
}

const rootElement = document.getElementById('root');
const root = ReactDOM.createRoot(rootElement);

root.render(
  <React.StrictMode>
    <BrowserRouter>
      <UserProvider>
        <WebSocketProvider>
          <PlaylistProvider> 
            <BeatProvider>
              <DataProvider>
                <HeaderWidthProvider>
                  <DndProvider backend={HTML5Backend}>
                    <App />
                  </DndProvider>
                </HeaderWidthProvider>
              </DataProvider>
            </BeatProvider>
          </PlaylistProvider>
        </WebSocketProvider>
      </UserProvider>
    </BrowserRouter>
  </React.StrictMode>
);

reportWebVitals();