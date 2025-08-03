import audioCacheService from './audioCacheService';
import audioBufferService from './audioBufferService';

class OfflineAudioService {
  async isTrackAvailable(track) {
    if (!track) return false;
    return await audioCacheService.isAudioCached(track.user_id, track.audio);
  }

  async getTrackUrl(track) {
    if (!track) return null;
    return await audioCacheService.getAudio(track.user_id, track.audio);
  }
  constructor() {
    this.syncInProgress = false;
    this.lastSyncTime = null;
    this.maxStorageSize = 500 * 1024 * 1024; // 500MB
    this.priorityTracks = new Set();
    this.downloadQueue = [];
    this.syncInterval = 30 * 60 * 1000; // 30 minutes
    this.networkTimeout = 10000; // 10 seconds
    this.retryAttempts = 3;
    this.syncTimer = null;
    
    this.initOfflineSupport();
  }

  async initOfflineSupport() {
    // Register service worker if supported
    if ('serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js');
        console.log('ServiceWorker registered:', registration);
      } catch (error) {
        console.error('ServiceWorker registration failed:', error);
      }
    }

    // Start periodic sync
    this.startPeriodicSync();

    // Listen for online/offline events
    window.addEventListener('online', () => this.handleNetworkChange(true));
    window.addEventListener('offline', () => this.handleNetworkChange(false));

    // Initial sync if online
    if (navigator.onLine) {
      this.sync();
    }
  }

  async sync() {
    if (this.syncInProgress) return;
    
    try {
      this.syncInProgress = true;
      
      // Check storage quota
      const quota = await this.checkStorageQuota();
      if (quota.available < this.maxStorageSize * 0.1) {
        await this.cleanupStorage();
      }
      
      // Process download queue
      await this.processDownloadQueue();
      
      // Update last sync time
      this.lastSyncTime = Date.now();
      
    } catch (error) {
      console.error('Sync failed:', error);
    } finally {
      this.syncInProgress = false;
    }
  }

  async checkStorageQuota() {
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      const estimate = await navigator.storage.estimate();
      return {
        total: estimate.quota,
        used: estimate.usage,
        available: estimate.quota - estimate.usage
      };
    }
    return null;
  }

  async cleanupStorage() {
    const stats = await audioCacheService.getCacheStats();
    
    if (stats.total.size > this.maxStorageSize * 0.9) {
      // Remove non-priority tracks first
      const entries = await audioCacheService.getAllEntries();
      const nonPriorityEntries = entries.filter(entry => 
        !this.priorityTracks.has(entry.id)
      );
      
      // Sort by last accessed time
      nonPriorityEntries.sort((a, b) => a.lastAccessed - b.lastAccessed);
      
      // Remove oldest entries until we're under 80% capacity
      for (const entry of nonPriorityEntries) {
        if (stats.total.size <= this.maxStorageSize * 0.8) break;
        await audioCacheService.removeEntry(entry.id);
        stats.total.size -= entry.size;
      }
    }
  }

  async addToDownloadQueue(tracks, options = {}) {
    const {
      priority = 1,
      force = false,
      onProgress,
      onComplete,
      onError
    } = options;

    // Add tracks to queue with metadata
    const queueItems = tracks.map(track => ({
      track,
      priority,
      force,
      attempts: 0,
      status: 'pending',
      onProgress,
      onComplete,
      onError
    }));

    this.downloadQueue.push(...queueItems);
    
    // Sort queue by priority
    this.downloadQueue.sort((a, b) => b.priority - a.priority);
    
    // Start processing if online
    if (navigator.onLine) {
      this.processDownloadQueue();
    }
  }

  async processDownloadQueue() {
    if (!navigator.onLine) return;

    const maxConcurrent = 3;
    const processing = new Set();

    while (this.downloadQueue.length > 0 && processing.size < maxConcurrent) {
      const item = this.downloadQueue.shift();
      
      if (item.attempts >= this.retryAttempts) {
        item.onError?.(new Error('Max retry attempts reached'));
        continue;
      }

      processing.add(item);

      try {
        // Check if already cached and not forced
        if (!item.force && await audioCacheService.isAudioCached(
          item.track.userId,
          item.track.fileName
        )) {
          item.onComplete?.();
          processing.delete(item);
          continue;
        }

        // Download with timeout
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Download timeout')), this.networkTimeout);
        });

        const downloadPromise = audioBufferService.startBuffering(
          item.track.audioSrc,
          {
            priority: item.priority,
            userId: item.track.userId,
            fileName: item.track.fileName,
            onProgress: item.onProgress,
            onComplete: () => {
              item.onComplete?.();
              processing.delete(item);
            },
            onError: (error) => {
              item.attempts++;
              if (item.attempts < this.retryAttempts) {
                this.downloadQueue.push(item);
              } else {
                item.onError?.(error);
              }
              processing.delete(item);
            }
          }
        );

        await Promise.race([downloadPromise, timeoutPromise]);

      } catch (error) {
        item.attempts++;
        if (item.attempts < this.retryAttempts) {
          this.downloadQueue.push(item);
        } else {
          item.onError?.(error);
        }
        processing.delete(item);
      }
    }
  }

  setPriorityTracks(tracks) {
    this.priorityTracks = new Set(tracks.map(track => 
      audioCacheService.getCacheKey(track.userId, track.fileName)
    ));
  }

  async getOfflineAvailableTracks() {
    const entries = await audioCacheService.getAllEntries();
    return entries.map(entry => ({
      id: entry.id,
      size: entry.size,
      lastAccessed: entry.lastAccessed,
      isPriority: this.priorityTracks.has(entry.id)
    }));
  }

  startPeriodicSync() {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
    }
    
    this.syncTimer = setInterval(() => {
      if (navigator.onLine && !this.syncInProgress) {
        this.sync();
      }
    }, this.syncInterval);
  }

  handleNetworkChange(isOnline) {
    if (isOnline) {
      // Resume downloads
      this.processDownloadQueue();
    } else {
      // Update UI to show offline status
      this.emit('offline');
    }
  }

  emit(event, data) {
    window.dispatchEvent(new CustomEvent('offlineAudio', {
      detail: { event, data }
    }));
  }

  destroy() {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
    }
    
    window.removeEventListener('online', this.handleNetworkChange);
    window.removeEventListener('offline', this.handleNetworkChange);
    
    this.downloadQueue = [];
    this.priorityTracks.clear();
  }
}

const offlineAudioService = new OfflineAudioService();
export default offlineAudioService;