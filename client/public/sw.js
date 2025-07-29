// Service Worker for Lyrikal Empire PWA
// Enhanced for background audio playback support

const CACHE_NAME = 'lyrikal-empire-v1';
const AUDIO_CACHE_NAME = 'lyrikal-empire-audio-v1';

// Cache essential assets
const ESSENTIAL_ASSETS = [
  '/',
  '/static/js/bundle.js',
  '/static/css/main.css',
  '/manifest.json',
  '/android-chrome-192x192.png',
  '/android-chrome-512x512.png'
];

// Install event - cache essential assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(ESSENTIAL_ASSETS))
      .then(() => self.skipWaiting())
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME && cacheName !== AUDIO_CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
  const { request } = event;
  
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
              cache.put(request, fetchResponse.clone());
            }
            return fetchResponse;
          });
        });
      })
    );
    return;
  }
  
  // Handle other requests
  event.respondWith(
    caches.match(request)
      .then(response => {
        if (response) {
          return response;
        }
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