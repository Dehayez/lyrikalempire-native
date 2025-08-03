import { openDB } from 'idb';

const CACHE_NAME = 'LyrikalAudioCache';
const CACHE_VERSION = 2;
const MAX_CACHE_SIZE = 200 * 1024 * 1024; // 200MB
const CACHE_EXPIRY = 7 * 24 * 60 * 60 * 1000; // 7 days

class AudioCacheService {
  constructor() {
    this.db = null;
    this.initPromise = this.init();
    this.preloadQueue = new Map(); // Track ongoing preloads
    this.urlCache = new Map(); // Memory cache for URLs
    this.stats = {
      size: 0,
      count: 0,
      hits: 0,
      misses: 0
    };
  }

  async init() {
    try {
      this.db = await openDB(CACHE_NAME, CACHE_VERSION, {
        upgrade(db) {
          // Audio files store
          const audioStore = db.createObjectStore('audio', { keyPath: 'id' });
          audioStore.createIndex('timestamp', 'timestamp');
          audioStore.createIndex('size', 'size');

          // Metadata store
          const metaStore = db.createObjectStore('metadata', { keyPath: 'id' });
          metaStore.createIndex('lastAccessed', 'lastAccessed');
        }
      });

      // Initialize cache stats
      await this.updateStats();
      
      // Start periodic cleanup
      this.scheduleCleanup();
      
      return true;
    } catch (error) {
      console.error('Failed to initialize audio cache:', error);
      return false;
    }
  }

  getCacheKey(userId, fileName) {
    return `${userId}:${fileName}`;
  }

  async preloadAudio(userId, fileName, url, onProgress) {
    await this.initPromise;
    const cacheKey = this.getCacheKey(userId, fileName);

    // Check if already preloading
    if (this.preloadQueue.has(cacheKey)) {
      return this.preloadQueue.get(cacheKey);
    }

    // Create preload promise
    const preloadPromise = (async () => {
      try {
        // Check cache first
        const cached = await this.getFromCache(cacheKey);
        if (cached) {
          return cached.url;
        }

        // Fetch with progress
        const response = await fetch(url);
        if (!response.ok) throw new Error('Network response was not ok');

        const reader = response.body.getReader();
        const contentLength = +response.headers.get('Content-Length');
        let receivedLength = 0;
        const chunks = [];

        while(true) {
          const {done, value} = await reader.read();
          
          if (done) break;
          
          chunks.push(value);
          receivedLength += value.length;
          
          if (onProgress) {
            onProgress((receivedLength / contentLength) * 100);
          }
        }

        // Combine chunks
        const blob = new Blob(chunks);
        const blobUrl = URL.createObjectURL(blob);

        // Cache the audio
        await this.addToCache(cacheKey, {
          blob,
          url: blobUrl,
          size: blob.size,
          timestamp: Date.now()
        });

        return blobUrl;
      } catch (error) {
        console.error('Error preloading audio:', error);
        throw error;
      } finally {
        this.preloadQueue.delete(cacheKey);
      }
    })();

    // Add to queue and return
    this.preloadQueue.set(cacheKey, preloadPromise);
    return preloadPromise;
  }

  async getFromCache(cacheKey) {
    await this.initPromise;
    
    // Check memory cache first
    if (this.urlCache.has(cacheKey)) {
      this.stats.hits++;
      return this.urlCache.get(cacheKey);
    }

    try {
      const tx = this.db.transaction(['audio', 'metadata'], 'readwrite');
      const audioStore = tx.objectStore('audio');
      const metaStore = tx.objectStore('metadata');

      // Get audio and update metadata
      const audio = await audioStore.get(cacheKey);
      if (!audio) {
        this.stats.misses++;
        return null;
      }

      // Update last accessed time
      await metaStore.put({
        id: cacheKey,
        lastAccessed: Date.now()
      });

      this.stats.hits++;
      
      // Add to memory cache
      this.urlCache.set(cacheKey, audio);
      
      return audio;
    } catch (error) {
      console.error('Error reading from cache:', error);
      return null;
    }
  }

  async addToCache(cacheKey, data) {
    await this.initPromise;

    try {
      // Check cache size and cleanup if needed
      if (this.stats.size + data.size > MAX_CACHE_SIZE) {
        await this.cleanup();
      }

      const tx = this.db.transaction(['audio', 'metadata'], 'readwrite');
      
      // Store audio
      await tx.objectStore('audio').put({
        id: cacheKey,
        ...data
      });

      // Store metadata
      await tx.objectStore('metadata').put({
        id: cacheKey,
        lastAccessed: Date.now(),
        size: data.size
      });

      await tx.done;

      // Update stats
      this.stats.size += data.size;
      this.stats.count++;

      // Add to memory cache
      this.urlCache.set(cacheKey, data);

    } catch (error) {
      console.error('Error adding to cache:', error);
      throw error;
    }
  }

  async cleanup() {
    await this.initPromise;

    try {
      const tx = this.db.transaction(['audio', 'metadata'], 'readwrite');
      const audioStore = tx.objectStore('audio');
      const metaStore = tx.objectStore('metadata');

      // Get all metadata sorted by last access
      const metadata = await metaStore.index('lastAccessed').getAll();
      metadata.sort((a, b) => a.lastAccessed - b.lastAccessed);

      let freedSpace = 0;
      const targetSize = MAX_CACHE_SIZE * 0.8; // Clear to 80% capacity

      for (const meta of metadata) {
        if (this.stats.size - freedSpace <= targetSize) break;

        // Remove from stores
        await audioStore.delete(meta.id);
        await metaStore.delete(meta.id);
        
        // Update stats
        freedSpace += meta.size;
        this.stats.count--;

        // Remove from memory cache
        this.urlCache.delete(meta.id);

        // Revoke blob URL
        const cached = this.urlCache.get(meta.id);
        if (cached?.url) {
          URL.revokeObjectURL(cached.url);
        }
      }

      this.stats.size -= freedSpace;
      await tx.done;

    } catch (error) {
      console.error('Error during cache cleanup:', error);
    }
  }

  async updateStats() {
    await this.initPromise;

    try {
      const tx = this.db.transaction(['metadata'], 'readonly');
      const metaStore = tx.objectStore('metadata');
      
      const metadata = await metaStore.getAll();
      
      this.stats.size = metadata.reduce((total, meta) => total + meta.size, 0);
      this.stats.count = metadata.length;
      
      await tx.done;
    } catch (error) {
      console.error('Error updating cache stats:', error);
    }
  }

  scheduleCleanup() {
    // Run cleanup every hour
    setInterval(() => {
      this.cleanup();
    }, 60 * 60 * 1000);
  }

  async clearCache() {
    await this.initPromise;

    try {
      // Clear IndexedDB stores
      await this.db.clear('audio');
      await this.db.clear('metadata');

      // Clear memory cache and revoke URLs
      for (const cached of this.urlCache.values()) {
        if (cached?.url) {
          URL.revokeObjectURL(cached.url);
        }
      }
      this.urlCache.clear();

      // Reset stats
      this.stats = {
        size: 0,
        count: 0,
        hits: 0,
        misses: 0
      };

    } catch (error) {
      console.error('Error clearing cache:', error);
      throw error;
    }
  }

  async getCacheStats() {
    await this.updateStats();
    return { ...this.stats };
  }
}

export const audioCacheService = new AudioCacheService();