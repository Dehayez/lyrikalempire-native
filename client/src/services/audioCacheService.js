// Import idb for IndexedDB operations
let idb = null;

// Dynamic import to handle missing package gracefully
const loadIDB = async () => {
  try {
    const idbModule = await import('idb');
    idb = idbModule;
    return true;
  } catch (error) {
    return false;
  }
};

// Detect Safari browser
const isSafari = () => {
  const ua = navigator.userAgent.toLowerCase();
  const isSafariBrowser = ua.indexOf('safari') !== -1 && ua.indexOf('chrome') === -1;
  console.log('Browser detection - User Agent:', ua);
  
  if (isSafariBrowser) {
    console.log('Browser detected as Safari');
  } else {
    console.log('Browser is not Safari');
    if (ua.indexOf('chrome') !== -1) {
      console.log('Browser appears to be Chrome or Chromium-based');
    } else if (ua.indexOf('firefox') !== -1) {
      console.log('Browser appears to be Firefox');
    } else if (ua.indexOf('edge') !== -1) {
      console.log('Browser appears to be Edge');
    }
  }
  
  return isSafariBrowser;
};

// Safari browser detection - call immediately to log results
const isSafariBrowser = isSafari();
console.log('Safari detection result:', isSafariBrowser);

// Force console log to be visible
setTimeout(() => {
  console.log('Delayed Safari detection check:', isSafariBrowser);
}, 1000);

class AudioCacheService {
  constructor() {
    this.db = null;
    this.memoryCache = new Map();
    this.maxMemorySize = 50 * 1024 * 1024; // 50MB memory cache
    this.maxDbSize = 200 * 1024 * 1024; // 200MB IndexedDB cache
    this.currentMemorySize = 0;
    this.dbName = 'LyrikalAudioCache';
    this.version = 1;
    this.storeName = 'audioFiles';
    this.isSafariBrowser = isSafariBrowser;
    console.log('AudioCacheService initialized with isSafari:', this.isSafariBrowser);
    
    // Store original URLs for Safari
    this.originalUrls = new Map();
    
    // Track failed URLs to avoid repeated failures
    this.failedUrls = new Map();
    
    this.init();
  }

  async init() {
    // Try to load the idb package
    const idbLoaded = await loadIDB();
    
    if (!idbLoaded || !idb) {
      return;
    }
    
    try {
      this.db = await idb.openDB(this.dbName, this.version, {
        upgrade(db) {
          if (!db.objectStoreNames.contains('audioFiles')) {
            const store = db.createObjectStore('audioFiles', { keyPath: 'id' });
            store.createIndex('lastAccessed', 'lastAccessed');
            store.createIndex('size', 'size');
          }
        },
      });
    } catch (error) {
      // Silently fail initialization
    }
  }

  // Generate cache key from beat info
  getCacheKey(userId, fileName) {
    return `${userId}_${fileName}`;
  }

  // Get audio from cache (memory first, then IndexedDB)
  async getAudio(userId, fileName) {
    try {
      const cacheKey = this.getCacheKey(userId, fileName);
      
      // For Safari, return the original URL if available
      if (this.isSafariBrowser && this.originalUrls.has(cacheKey)) {
        console.log('Safari: Using original URL from cache for', cacheKey);
        return this.originalUrls.get(cacheKey);
      }
      
      // Check memory cache first
      const memoryEntry = this.memoryCache.get(cacheKey);
      if (memoryEntry) {
        memoryEntry.lastAccessed = Date.now();
        
        // For Safari, don't use blob URLs
        if (this.isSafariBrowser) {
          return null; // Will force using original URL
        }
        
        return memoryEntry.objectUrl;
      }

      // Check IndexedDB
      if (this.db) {
        try {
          const entry = await this.db.get(this.storeName, cacheKey);
          if (entry) {
            // Update last accessed time
            entry.lastAccessed = Date.now();
            await this.db.put(this.storeName, entry);
            
            // For Safari, don't create blob URLs
            if (this.isSafariBrowser) {
              return null; // Will force using original URL
            }
            
            // Create object URL and add to memory cache
            const objectUrl = URL.createObjectURL(entry.blob);
            this.addToMemoryCache(cacheKey, objectUrl, entry.blob.size);
            
            return objectUrl;
          }
        } catch (error) {
          // Silently handle error
        }
      }

      return null;
    } catch (error) {
      return null;
    }
  }

  // Store audio in cache
  async storeAudio(userId, fileName, audioBlob, originalUrl) {
    const cacheKey = this.getCacheKey(userId, fileName);
    const now = Date.now();
    
    try {
      // Store the original URL for Safari
      if (this.isSafariBrowser && originalUrl) {
        console.log('Safari: Storing original URL for', cacheKey);
        this.originalUrls.set(cacheKey, originalUrl);
        
        // Still store the blob in IndexedDB for potential offline use
      }
      
      // Store in IndexedDB
      if (this.db) {
        const entry = {
          id: cacheKey,
          blob: audioBlob,
          size: audioBlob.size,
          lastAccessed: now,
          created: now
        };
        
        // Check if we need to cleanup space
        await this.ensureDbSpace(audioBlob.size);
        await this.db.put(this.storeName, entry);
      }

      // For Safari, return the original URL instead of creating a blob URL
      if (this.isSafariBrowser) {
        return originalUrl || null;
      }

      // Create object URL and add to memory cache for non-Safari browsers
      const objectUrl = URL.createObjectURL(audioBlob);
      this.addToMemoryCache(cacheKey, objectUrl, audioBlob.size);
      
      return objectUrl;
    } catch (error) {
      throw error;
    }
  }

  // Add to memory cache with size management
  addToMemoryCache(key, objectUrl, size) {
    // Don't use memory cache for Safari
    if (this.isSafariBrowser) {
      return;
    }
    
    // Clean up existing entry if present
    if (this.memoryCache.has(key)) {
      const existing = this.memoryCache.get(key);
      URL.revokeObjectURL(existing.objectUrl);
      this.currentMemorySize -= existing.size;
    }

    // Ensure we have space
    this.ensureMemorySpace(size);

    // Add new entry
    this.memoryCache.set(key, {
      objectUrl,
      size,
      lastAccessed: Date.now()
    });
    this.currentMemorySize += size;
  }

  // Ensure memory cache has space
  ensureMemorySpace(requiredSize) {
    while (this.currentMemorySize + requiredSize > this.maxMemorySize && this.memoryCache.size > 0) {
      // Remove least recently used item
      let oldestKey = null;
      let oldestTime = Date.now();
      
      for (const [key, entry] of this.memoryCache) {
        if (entry.lastAccessed < oldestTime) {
          oldestTime = entry.lastAccessed;
          oldestKey = key;
        }
      }
      
      if (oldestKey) {
        const entry = this.memoryCache.get(oldestKey);
        URL.revokeObjectURL(entry.objectUrl);
        this.currentMemorySize -= entry.size;
        this.memoryCache.delete(oldestKey);
      }
    }
  }

  // Ensure IndexedDB has space
  async ensureDbSpace(requiredSize) {
    if (!this.db) return;

    try {
      const currentSize = await this.getDbSize();
      if (currentSize + requiredSize > this.maxDbSize) {
        // Remove oldest entries until we have space
        const oldEntries = await this.db.getAllFromIndex(this.storeName, 'lastAccessed');
        
        for (const entry of oldEntries) {
          await this.db.delete(this.storeName, entry.id);
          if (await this.getDbSize() + requiredSize <= this.maxDbSize) {
            break;
          }
        }
      }
    } catch (error) {
      // Silently handle error
    }
  }

  // Get current IndexedDB size
  async getDbSize() {
    if (!this.db) return 0;

    try {
      const entries = await this.db.getAll(this.storeName);
      return entries.reduce((total, entry) => total + entry.size, 0);
    } catch (error) {
      return 0;
    }
  }

  // Check if audio is cached
  async isAudioCached(userId, fileName) {
    try {
      const cacheKey = this.getCacheKey(userId, fileName);
      
      // Check original URLs for Safari
      if (this.isSafariBrowser && this.originalUrls.has(cacheKey)) {
        return true;
      }
      
      // Check memory cache
      if (this.memoryCache.has(cacheKey)) {
        return true;
      }

      // Check IndexedDB
      if (this.db) {
        try {
          const entry = await this.db.get(this.storeName, cacheKey);
          return !!entry;
        } catch (error) {
          // Silently handle error
        }
      }

      return false;
    } catch (error) {
      return false;
    }
  }

  // Clear all cached audio
  async clearCache() {
    // Clear memory cache
    for (const [key, entry] of this.memoryCache) {
      URL.revokeObjectURL(entry.objectUrl);
    }
    this.memoryCache.clear();
    this.currentMemorySize = 0;
    
    // Clear original URLs map for Safari
    this.originalUrls.clear();
    
    // Clear failed URLs tracking
    this.failedUrls.clear();

    // Clear IndexedDB
    if (this.db) {
      try {
        await this.db.clear(this.storeName);
      } catch (error) {
        // Silently handle error
      }
    }
  }

  // Get cache statistics
  async getCacheStats() {
    const memoryStats = {
      size: this.currentMemorySize,
      count: this.memoryCache.size,
      maxSize: this.maxMemorySize
    };

    let dbStats = {
      size: 0,
      count: 0,
      maxSize: this.maxDbSize
    };

    if (this.db) {
      try {
        const entries = await this.db.getAll(this.storeName);
        dbStats.count = entries.length;
        dbStats.size = entries.reduce((total, entry) => total + entry.size, 0);
      } catch (error) {
        // Silently handle error
      }
    }

    return {
      memory: memoryStats,
      indexedDB: dbStats,
      total: {
        size: memoryStats.size + dbStats.size,
        count: memoryStats.count + dbStats.count
      }
    };
  }

  // Clean up expired entries (older than 7 days)
  async cleanupExpiredEntries() {
    if (!this.db) return;

    const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
    
    try {
      const entries = await this.db.getAll(this.storeName);
      const expiredEntries = entries.filter(entry => entry.lastAccessed < sevenDaysAgo);
      
      for (const entry of expiredEntries) {
        await this.db.delete(this.storeName, entry.id);
        
        // Also remove from memory cache if present
        if (this.memoryCache.has(entry.id)) {
          const memoryEntry = this.memoryCache.get(entry.id);
          URL.revokeObjectURL(memoryEntry.objectUrl);
          this.currentMemorySize -= memoryEntry.size;
          this.memoryCache.delete(entry.id);
        }
        
        // Remove from original URLs map for Safari
        if (this.originalUrls.has(entry.id)) {
          this.originalUrls.delete(entry.id);
        }
      }
    } catch (error) {
      // Silently handle error
    }
  }

  // Check if URL has failed recently
  hasUrlFailed(url) {
    if (!url) return false;
    
    // Extract the file path part without the query parameters
    const urlPath = url.split('?')[0];
    
    if (this.failedUrls.has(urlPath)) {
      const failedTime = this.failedUrls.get(urlPath);
      const now = Date.now();
      
      // Consider URLs failed in the last 30 seconds as still failing
      if (now - failedTime < 30000) {
        console.log('URL recently failed, skipping fetch attempt:', urlPath);
        return true;
      }
      
      // Clear old failure after 30 seconds
      this.failedUrls.delete(urlPath);
    }
    
    return false;
  }

  // Mark URL as failed
  markUrlAsFailed(url) {
    if (!url) return;
    
    // Extract the file path part without the query parameters
    const urlPath = url.split('?')[0];
    this.failedUrls.set(urlPath, Date.now());
  }

  // Preload audio for a beat
  async preloadAudio(userId, fileName, signedUrl) {
    try {
      const cacheKey = this.getCacheKey(userId, fileName);
      
      // Check if already cached
      if (await this.isAudioCached(userId, fileName)) {
        return await this.getAudio(userId, fileName) || signedUrl;
      }
      
      // Check if URL has recently failed
      if (this.hasUrlFailed(signedUrl)) {
        console.log('Safari: Using original URL due to recent failure:', cacheKey);
        // Still store the URL for future use
        this.originalUrls.set(cacheKey, signedUrl);
        return signedUrl;
      }

      // For Safari, store the original URL and don't use blob URLs
      if (this.isSafariBrowser) {
        console.log('Safari: Storing original URL for preload:', cacheKey);
        this.originalUrls.set(cacheKey, signedUrl);
        
        // For Safari, we'll just use the original URL and skip caching attempts
        // This avoids the empty blob issues with no-cors mode
        return signedUrl;
      } else {
        // Normal flow for other browsers
        try {
          // Fetch audio blob
          const response = await fetch(signedUrl);
          if (!response.ok) {
            this.markUrlAsFailed(signedUrl);
            throw new Error(`Failed to fetch audio: ${response.status}`);
          }
          
          const audioBlob = await response.blob();
          
          if (audioBlob.size === 0) {
            this.markUrlAsFailed(signedUrl);
            throw new Error('Empty audio blob received');
          }
          
          return await this.storeAudio(userId, fileName, audioBlob, signedUrl);
        } catch (error) {
          console.error('Error in preloadAudio:', error);
          this.markUrlAsFailed(signedUrl);
          return signedUrl; // Fallback to original URL on error
        }
      }
    } catch (error) {
      console.error('Error in preloadAudio:', error);
      this.markUrlAsFailed(signedUrl);
      return signedUrl; // Fallback to original URL on error
    }
  }

  // Cleanup resources
  destroy() {
    // Clean up memory cache
    for (const [key, entry] of this.memoryCache) {
      URL.revokeObjectURL(entry.objectUrl);
    }
    this.memoryCache.clear();
    this.currentMemorySize = 0;
    
    // Clear original URLs map
    this.originalUrls.clear();
    
    // Clear failed URLs tracking
    this.failedUrls.clear();

    // Close database
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }
}

// Create singleton instance
const audioCacheService = new AudioCacheService();

export default audioCacheService; 