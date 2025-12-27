// Service Worker for Lyrikal Empire PWA
// Enhanced for background audio playback support

const CACHE_NAME = 'lyrikal-empire-v2';
const AUDIO_CACHE_NAME = 'lyrikal-empire-audio-v1';
const MAX_AUDIO_CACHE_SIZE = 50; // Maximum number of audio files to cache

// Cache essential assets for instant loading
const ESSENTIAL_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/android-chrome-192x192.png',
  '/android-chrome-512x512.png',
  '/placeholder.png'
];

// Install event - cache essential assets and skip waiting immediately
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(async cache => {
        // Try to add all assets, but ignore any failures (e.g. 404/hashes)
        await Promise.allSettled(
          ESSENTIAL_ASSETS.map(asset => cache.add(asset).catch(() => {}))
        );
      })
      .then(() => self.skipWaiting())
  );
});

// Activate event - clean up old caches and claim clients immediately
self.addEventListener('activate', (event) => {
  event.waitUntil(
    Promise.all([
      // Clean up old caches
      caches.keys().then(cacheNames => {
        return Promise.all(
          cacheNames.map(cacheName => {
            if (cacheName !== CACHE_NAME && cacheName !== AUDIO_CACHE_NAME) {
              return caches.delete(cacheName);
            }
          })
        );
      }),
      // Claim all clients immediately to avoid double-open issue
      self.clients.claim()
    ])
  );
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Bypass service worker for cross-origin audio (e.g., Backblaze signed URLs)
  // and for Range requests to avoid Safari issues with streamed media
  const isAudioPath = url.pathname.includes('/audio/') || url.pathname.endsWith('.mp3') || url.pathname.endsWith('.aac');
  const isCrossOrigin = url.origin !== self.location.origin;
  const hasRangeHeader = request.headers && request.headers.has && request.headers.has('range');

  if ((isAudioPath && isCrossOrigin) || hasRangeHeader) {
    // Let the network handle it directly without caching/proxying
    return; // Do not call respondWith → default browser fetch path
  }

  // Handle navigation requests (important for PWA startup)
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then(response => {
          // Cache the latest HTML
          if (response.ok) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then(cache => {
              cache.put(request, responseClone);
            });
          }
          return response;
        })
        .catch(() => {
          // Fallback to cached index.html for offline support
          return caches.match('/index.html').then(cachedResponse => {
            return cachedResponse || caches.match('/');
          });
        })
    );
    return;
  }
  
  // Handle audio files differently for better streaming
  if (request.url.includes('/audio/') || request.url.includes('.mp3') || request.url.includes('.aac')) {
    event.respondWith(
      caches.open(AUDIO_CACHE_NAME).then(cache => {
        return cache.match(request).then(response => {
          if (response) {
            return response;
          }
          
          return fetch(request).then(fetchResponse => {
            // Cache audio files for offline playback
            // Only cache complete responses; the Cache API rejects partial (206) responses.
            if (fetchResponse.ok && fetchResponse.status === 200) {
              // Limit cache size to prevent memory issues
              limitAudioCacheSize(cache).then(() => {
                cache.put(request, fetchResponse.clone());
              });
            }
            return fetchResponse;
          });
        });
      })
    );
    return;
  }
  
  // Handle other requests (including placeholder.png)
  event.respondWith(
    caches.match(request)
      .then(response => {
        if (response) {
          return response;
        }
        
        // For images (especially placeholder.png), cache aggressively to prevent repeated fetches
        if (request.url.includes('placeholder.png') || 
            request.url.includes('.png') || 
            request.url.includes('.jpg') || 
            request.url.includes('.jpeg') || 
            request.url.includes('.gif') || 
            request.url.includes('.webp')) {
          return fetch(request).then(fetchResponse => {
            if (fetchResponse.ok) {
              const responseClone = fetchResponse.clone();
              caches.open(CACHE_NAME).then(cache => {
                cache.put(request, responseClone);
              });
            }
            return fetchResponse;
          });
        }
        
        // For other requests, use normal fetch
        return fetch(request);
      })
  );
});

// Message handling for audio playback control
self.addEventListener('message', (event) => {
  const { type, data } = event.data;
  
  switch (type) {
    case 'PLAY_AUDIO':
      // Handle background audio play request
      handleBackgroundAudio(data);
      break;
    case 'PAUSE_AUDIO':
      // Handle background audio pause request
      pauseBackgroundAudio();
      break;
    case 'SKIP_TRACK':
      // Handle track skip in background
      skipTrack(data.direction);
      break;
  }
});

// Background sync for offline audio queue
self.addEventListener('sync', (event) => {
  if (event.tag === 'background-audio-sync') {
    event.waitUntil(syncAudioQueue());
  }
});

// Push notifications for audio controls (optional)
self.addEventListener('push', (event) => {
  if (event.data) {
    const data = event.data.json();
    if (data.type === 'audio-control') {
      event.waitUntil(
        self.registration.showNotification(data.title, {
          body: data.body,
          icon: '/android-chrome-192x192.png',
          badge: '/android-chrome-192x192.png',
          actions: [
            { action: 'play', title: 'Play' },
            { action: 'pause', title: 'Pause' },
            { action: 'next', title: 'Next' }
          ],
          tag: 'audio-control',
          renotify: true,
          silent: true
        })
      );
    }
  }
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  if (event.action === 'play') {
    clients.matchAll({ type: 'window' }).then(clients => {
      clients.forEach(client => {
        client.postMessage({ type: 'PLAY_FROM_NOTIFICATION' });
      });
    });
  } else if (event.action === 'pause') {
    clients.matchAll({ type: 'window' }).then(clients => {
      clients.forEach(client => {
        client.postMessage({ type: 'PAUSE_FROM_NOTIFICATION' });
      });
    });
  } else if (event.action === 'next') {
    clients.matchAll({ type: 'window' }).then(clients => {
      clients.forEach(client => {
        client.postMessage({ type: 'NEXT_FROM_NOTIFICATION' });
      });
    });
  } else {
    // Open app
    clients.openWindow('/');
  }
});

// Helper functions

// Limit audio cache size to prevent memory issues
async function limitAudioCacheSize(cache) {
  try {
    const keys = await cache.keys();
    if (keys.length >= MAX_AUDIO_CACHE_SIZE) {
      // Remove oldest entries (first in the list)
      const keysToDelete = keys.slice(0, keys.length - MAX_AUDIO_CACHE_SIZE + 1);
      await Promise.all(keysToDelete.map(key => cache.delete(key)));
    }
  } catch (error) {
    // Silent fail - cache cleanup is not critical
  }
}

async function handleBackgroundAudio(audioData) {
  // Send audio data to all connected clients
  const clients = await self.clients.matchAll({ type: 'window' });
  clients.forEach(client => {
    client.postMessage({
      type: 'BACKGROUND_AUDIO_PLAY',
      data: audioData
    });
  });
}

async function pauseBackgroundAudio() {
  const clients = await self.clients.matchAll({ type: 'window' });
  clients.forEach(client => {
    client.postMessage({ type: 'BACKGROUND_AUDIO_PAUSE' });
  });
}

async function skipTrack(direction) {
  const clients = await self.clients.matchAll({ type: 'window' });
  clients.forEach(client => {
    client.postMessage({
      type: 'BACKGROUND_SKIP_TRACK',
      direction: direction
    });
  });
}

async function syncAudioQueue() {
  // Sync audio queue when back online
  const clients = await self.clients.matchAll({ type: 'window' });
  clients.forEach(client => {
    client.postMessage({ type: 'SYNC_AUDIO_QUEUE' });
  });
} 