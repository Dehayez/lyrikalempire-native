import audioCacheService from './audioCacheService';

class AudioBufferService {
  constructor() {
    this.bufferSize = 1024 * 1024; // 1MB chunks
    this.maxBufferCount = 5; // Reduced from 10 to limit memory usage
    this.buffers = new Map(); // Track buffered chunks
    this.activeBuffers = new Set(); // Currently used buffers
    this.preloadQueue = []; // Queue for preloading
    this.networkType = 'unknown'; // Current network type
    this.isBuffering = false; // Buffer state
    
    // Bind event handlers for proper cleanup
    this.boundAdjustBufferSize = this.adjustBufferSize.bind(this);
    this.boundHandleOnline = () => this.handleNetworkChange(true);
    this.boundHandleOffline = () => this.handleNetworkChange(false);
    this.boundHandleUnload = () => this.destroy();
    
    // Initialize network monitoring
    this.initNetworkMonitoring();
    
    // Clean up on page unload
    window.addEventListener('beforeunload', this.boundHandleUnload);
  }

  initNetworkMonitoring() {
    // Monitor network changes
    if ('connection' in navigator) {
      navigator.connection.addEventListener('change', this.boundAdjustBufferSize);
      this.networkType = navigator.connection.effectiveType;
    }

    // Monitor online/offline status
    window.addEventListener('online', this.boundHandleOnline);
    window.addEventListener('offline', this.boundHandleOffline);
  }

  adjustBufferSize() {
    // Adjust buffer size based on network conditions
    switch (this.networkType) {
      case 'slow-2g':
        this.bufferSize = 256 * 1024; // 256KB chunks
        this.maxBufferCount = 5;
        break;
      case '2g':
        this.bufferSize = 512 * 1024; // 512KB chunks
        this.maxBufferCount = 6;
        break;
      case '3g':
        this.bufferSize = 1024 * 1024; // 1MB chunks
        this.maxBufferCount = 8;
        break;
      case '4g':
        this.bufferSize = 2048 * 1024; // 2MB chunks
        this.maxBufferCount = 10;
        break;
      default:
        this.bufferSize = 1024 * 1024; // 1MB default
        this.maxBufferCount = 8;
    }
  }

  async startBuffering(audioSrc, options = {}) {
    if (!audioSrc) {
      console.error('Invalid audio source');
      return;
    }

    // Check if URL is valid
    try {
      new URL(audioSrc);
    } catch (error) {
      console.error('Invalid audio URL:', error);
      return;
    }
    const {
      priority = 1,
      onProgress = () => {},
      onComplete = () => {},
      onError = () => {}
    } = options;

    if (!audioSrc || this.buffers.has(audioSrc)) return;

    try {
      this.isBuffering = true;
      const response = await fetch(audioSrc);
      const reader = response.body.getReader();
      const contentLength = +response.headers.get('Content-Length');
      
      let receivedLength = 0;
      const chunks = [];

      while(true) {
        const {done, value} = await reader.read();
        
        if (done) break;
        
        chunks.push(value);
        receivedLength += value.length;
        
        // Calculate and report progress
        const progress = (receivedLength / contentLength) * 100;
        onProgress(progress);
        
        // Store in chunks if exceeds buffer size
        if (receivedLength >= this.bufferSize) {
          const blob = new Blob(chunks);
          this.buffers.set(audioSrc, blob);
          chunks.length = 0; // Clear chunks array
        }
      }

      // Store final chunk
      if (chunks.length > 0) {
        const blob = new Blob(chunks);
        this.buffers.set(audioSrc, blob);
      }

      // Limit buffer count to prevent memory bloat
      this.limitBufferCount();

      this.isBuffering = false;
      onComplete();

      // Cache the complete audio
      const completeBlob = new Blob([...this.buffers.get(audioSrc)]);
      await audioCacheService.storeAudio(
        options.userId,
        options.fileName,
        completeBlob,
        audioSrc
      );

    } catch (error) {
      this.isBuffering = false;
      onError(error);
    }
  }

  async preloadAudio(tracks, options = {}) {
    const {
      maxConcurrent = 2,
      priorityFn = (track) => 1,
      onTrackProgress = () => {},
      onTrackComplete = () => {},
      onTrackError = () => {}
    } = options;

    // Sort tracks by priority
    const sortedTracks = [...tracks].sort((a, b) => (
      priorityFn(b) - priorityFn(a)
    ));

    // Queue tracks for preloading
    this.preloadQueue = sortedTracks.map(track => ({
      track,
      priority: priorityFn(track),
      status: 'pending'
    }));

    // Start preloading
    const preloadNext = async () => {
      const next = this.preloadQueue.find(item => item.status === 'pending');
      if (!next) return;

      next.status = 'loading';
      const track = next.track;

      try {
        await this.startBuffering(track.audioSrc, {
          priority: next.priority,
          userId: track.userId,
          fileName: track.fileName,
          onProgress: (progress) => onTrackProgress(track, progress),
          onComplete: () => {
            next.status = 'complete';
            onTrackComplete(track);
            preloadNext();
          },
          onError: (error) => {
            next.status = 'error';
            onTrackError(track, error);
            preloadNext();
          }
        });
      } catch (error) {
        next.status = 'error';
        onTrackError(track, error);
        preloadNext();
      }
    };

    // Start initial concurrent preloads
    for (let i = 0; i < maxConcurrent; i++) {
      preloadNext();
    }
  }

  getBufferStatus(audioSrc) {
    if (!this.buffers.has(audioSrc)) return 0;
    return 100; // Fully buffered
  }

  clearBuffer(audioSrc) {
    if (this.buffers.has(audioSrc)) {
      this.buffers.delete(audioSrc);
      this.activeBuffers.delete(audioSrc);
    }
  }

  clearAllBuffers() {
    this.buffers.clear();
    this.activeBuffers.clear();
    this.preloadQueue = [];
  }

  handleNetworkChange(isOnline) {
    if (!isOnline) {
      // When going offline, ensure we have cached versions
      this.preloadQueue.forEach(item => {
        if (item.status === 'pending') {
          audioCacheService.getCachedAudioOfflineFirst(
            item.track.userId,
            item.track.fileName
          );
        }
      });
    } else {
      // When coming back online, retry failed items
      this.preloadQueue.forEach(item => {
        if (item.status === 'error') {
          item.status = 'pending';
        }
      });
    }
  }

  // Limit buffer count to prevent memory bloat
  limitBufferCount() {
    while (this.buffers.size > this.maxBufferCount) {
      // Remove oldest buffer (first entry in Map)
      const firstKey = this.buffers.keys().next().value;
      if (firstKey) {
        this.buffers.delete(firstKey);
        this.activeBuffers.delete(firstKey);
      }
    }
  }

  destroy() {
    this.clearAllBuffers();
    if ('connection' in navigator) {
      navigator.connection.removeEventListener('change', this.boundAdjustBufferSize);
    }
    window.removeEventListener('online', this.boundHandleOnline);
    window.removeEventListener('offline', this.boundHandleOffline);
    window.removeEventListener('beforeunload', this.boundHandleUnload);
  }
}

const audioBufferService = new AudioBufferService();
export { audioBufferService };
export default audioBufferService;